import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase, withTransaction } from "../../config/mongodb.js";
import { allowRoles } from "../../common/middlewares/role.middleware.js";
import { nextBusinessCode } from "../shared/businessCode.js";
import { replaceDetails } from "../shared/detailCollections.js";

const router = Router();
const today = () => new Date().toISOString().slice(0, 10);
const id = (value) => ObjectId.isValid(value) ? new ObjectId(value) : null;
const serialize = (document) => { if (!document) return document; const { _id, ...data } = document; return { id: _id.toString(), ...data }; };
const serializeReturn = (document) => ({
  ...serialize(document),
  details: document.details.map((line) => ({ ...line, MaSPCode: line.productCode })),
});
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

async function productsByLines(lines) {
  const products = getDatabase().collection("SanPham");
  const result = [];
  if (!Array.isArray(lines)) throw fail("Danh sách sản phẩm không hợp lệ");
  for (const line of lines || []) {
    const productFilter = id(line.productId) || id(line.id) ? { _id: id(line.productId) || id(line.id) } : { MaSP: line.MaSP };
    const product = await products.findOne(productFilter);
    if (!product) throw fail(`Không tìm thấy sản phẩm ${line.productId || line.MaSP}`, 404);
    const quantity = Number(line.quantity || line.SoLuong);
    if (!Number.isInteger(quantity) || quantity <= 0) throw fail("Số lượng phải là số nguyên dương");
    const price = Number(line.price ?? line.DonGia ?? product.GiaBan);
    if (!Number.isFinite(price) || price < 0) throw fail(`Đơn giá của ${product.TenSP} không hợp lệ`);
    result.push({ product, quantity, price });
  }
  if (!result.length) throw fail("Chứng từ phải có ít nhất một sản phẩm");
  return result;
}

async function adjustStock(lines, direction, allowShortage = false, session) {
  const stocks = getDatabase().collection("TonKho");
  const applied = [];
  for (const line of lines) {
    const delta = direction * line.quantity;
    const filter = direction < 0 && !allowShortage ? { MaSP: line.product._id, SoLuongTon: { $gte: line.quantity } } : { MaSP: line.product._id };
    const result = await stocks.updateOne(filter, { $set: { MaSP: line.product._id, updatedAt: new Date(), NgayCapNhat: today() }, $inc: { SoLuongTon: delta } }, { upsert: direction > 0, session });
    if (!result.modifiedCount && !(direction > 0 && result.upsertedCount)) {
      for (const previous of applied) await stocks.updateOne({ MaSP: previous.product._id }, { $inc: { SoLuongTon: -previous.delta } }, { session });
      const current = await stocks.findOne({ MaSP: line.product._id }, { session });
      throw fail(`${line.product.TenSP} vượt tồn kho hiện tại (${current?.SoLuongTon || 0})`, 409);
    }
    await getDatabase().collection("SanPham").updateOne({ _id: line.product._id }, { $inc: { stock: delta } }, { session });
    applied.push({ product: line.product, delta });
  }
}

router.post("/goods-receipts", allowRoles("QuanLy", "NhanVienKho", "NhanVienMuaHang"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.details || req.body.items);
    const supplier = await getDatabase().collection("NhaCungCap").findOne({ _id: id(req.body.supplierId || req.body.MaNCC) });
    if (!supplier) throw fail("Nhà cung cấp không hợp lệ", 404);
    const purchaseOrderId = id(req.body.purchaseOrderId || req.body.MaDDH);
    if (!purchaseOrderId) throw fail("Phiếu nhập phải liên kết với đơn đặt hàng NCC");
    const purchaseOrder = await getDatabase().collection("DonDatHang").findOne({ _id: purchaseOrderId });
    if (!purchaseOrder || String(purchaseOrder.MaNCC) !== String(supplier._id)) throw fail("Đơn đặt hàng NCC không hợp lệ", 404);
    if (req.body.NgayNhap && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.NgayNhap)) throw fail("Ngày nhập không hợp lệ");
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const created = await withTransaction(async (session) => {
      await adjustStock(lines, 1, false, session);
      const document = {
      MaPN: await nextBusinessCode(getDatabase().collection("PhieuNhap"), "PhieuNhap"),
      MaDDH: purchaseOrderId,
      MaNCC: supplier._id,
      MaNV: req.user.id,
      NgayNhap: req.body.NgayNhap || today(),
      TrangThai: "Đã lưu",
      TongTien: total,
      SoLuong: lines.reduce((sum, line) => sum + line.quantity, 0),
      LyDoNhap: req.body.LyDoNhap || `Nhập hàng từ ${supplier.TenNCC}`,
      NguoiLienQuan: req.body.NguoiLienQuan || supplier.TenNCC || "",
      DiaChi: req.body.DiaChi || supplier.DiaChi || "",
      Kho: req.body.Kho || "Kho chính",
      DiaDiem: req.body.DiaDiem || "",
      TkNo: req.body.TkNo || "156",
      TkCo: req.body.TkCo || "331",
      SoChungTuGoc: req.body.SoChungTuGoc || "",
      GhiChu: req.body.GhiChu || req.body.note || "",
      details: lines.map((line) => ({
        MaSP: line.product._id,
        TenSP: line.product.TenSP,
        DonViTinh: line.product.DonViTinh,
        SoLuong: line.quantity,
        DonGia: line.price,
        ThanhTien: line.quantity * line.price,
      })),
      createdAt: new Date(),
      };
      const result = await getDatabase().collection("PhieuNhap").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_PhieuNhap", result.insertedId, document.details, session);
      const debtCollection = getDatabase().collection("CongNo");
      await debtCollection.insertOne({
        MaCN: await nextBusinessCode(debtCollection, "CongNo"),
        MaNCC: supplier._id,
        MaDDH: purchaseOrderId,
        MaPN: result.insertedId,
          MaNV: req.user.id,
        LoaiCongNo: "Nhà cung cấp",
        NgayPhatSinh: document.NgayNhap,
        SoTien: total,
        SoTienDaTra: 0,
        SoTienConLai: total,
        TrangThai: "Còn nợ",
        createdAt: new Date(),
      }, { session });
      await getDatabase().collection("DonDatHang").updateOne({ _id: purchaseOrderId }, { $set: { TrangThai: "Đã nhập kho", updatedAt: new Date() } }, { session });
      return serialize({ _id: result.insertedId, ...document });
    });
    res.status(201).json({ data: created, message: "Đã nhập kho và cập nhật tồn kho" });
  } catch (error) { next(error); }
});

router.post("/goods-issues", allowRoles("QuanLy", "NhanVienKho"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.details || req.body.items);
    const reason = req.body.reason || req.body.LyDoXuat || "Bán hàng";
    const allowShortage = reason === "Điều chỉnh kiểm kê thiếu";
    if (reason === "Hủy hàng hỏng" && !String(req.body.note || req.body.GhiChu || "").trim()) throw fail("Phải nhập mô tả hàng hỏng");
    const created = await withTransaction(async (session) => {
      await adjustStock(lines, -1, allowShortage, session);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const document = {
      MaPX: await nextBusinessCode(getDatabase().collection("PhieuXuat"), "PhieuXuat"),
      MaDH: id(req.body.orderId || req.body.MaDH) || null,
      MaNV: req.user.id,
      NgayXuat: req.body.NgayXuat || today(),
      LyDoXuat: reason,
      GhiChu: req.body.note || req.body.GhiChu || "",
      NguoiLienQuan: req.body.NguoiLienQuan || "",
      DiaChi: req.body.DiaChi || "",
      Kho: req.body.Kho || "Kho chính",
      DiaDiem: req.body.DiaDiem || "",
      TkNo: req.body.TkNo || "632",
      TkCo: req.body.TkCo || "156",
      SoChungTuGoc: req.body.SoChungTuGoc || "",
      TrangThai: "Đã lưu",
      TongTien: total,
      SoLuong: lines.reduce((sum, line) => sum + line.quantity, 0),
      details: lines.map((line) => ({
        MaSP: line.product._id,
        TenSP: line.product.TenSP,
        DonViTinh: line.product.DonViTinh,
        SoLuong: line.quantity,
        DonGia: line.price,
        ThanhTien: line.quantity * line.price,
      })),
      createdAt: new Date(),
    };
      const result = await getDatabase().collection("PhieuXuat").insertOne(document, { session });
    await replaceDetails(getDatabase(), "CT_PhieuXuat", result.insertedId, document.details, session);
      return serialize({ _id: result.insertedId, ...document });
    });
    res.status(201).json({ data: created, message: "Đã xuất kho và cập nhật tồn kho" });
  } catch (error) { next(error); }
});

router.post("/sales-orders", allowRoles("QuanLy", "NhanVienBanHang"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.items || req.body.details);
    if (req.body.NgayDat && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.NgayDat)) throw fail("Ngày bán không hợp lệ");
    const customerId = id(req.body.customerId || req.body.MaKH);
    if (req.body.customerId || req.body.MaKH) {
      const customer = await getDatabase().collection("KhachHang").findOne({ _id: customerId });
      if (!customer) throw fail("Khách hàng không tồn tại", 404);
    }
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const created = await withTransaction(async (session) => {
      await adjustStock(lines, -1, false, session);
      const order = { MaDH: await nextBusinessCode(getDatabase().collection("DonHang"), "DonHang"), MaKH: customerId || null, MaNV: req.user.id, NgayDat: req.body.NgayDat || today(), TrangThai: "Chờ xuất kho", TongTien: total, details: lines.map((line) => ({ MaSP: line.product._id, SoLuong: line.quantity, DonGia: line.price, GiamGia: 0, ThanhTien: line.quantity * line.price })), createdAt: new Date() };
      const orderResult = await getDatabase().collection("DonHang").insertOne(order, { session });
      await replaceDetails(getDatabase(), "CT_DonHang", orderResult.insertedId, order.details, session);
      const invoice = { MaHD: await nextBusinessCode(getDatabase().collection("HoaDon"), "HoaDon"), MaDH: orderResult.insertedId, MaKH: customerId || null, MaNV: req.user.id, NgayLap: today(), TongTien: total, SoTienDaTra: 0, SoTienConLai: total, TrangThai: "Chưa thanh toán", details: order.details, createdAt: new Date() };
      const invoiceResult = await getDatabase().collection("HoaDon").insertOne(invoice, { session });
      await replaceDetails(getDatabase(), "CT_HoaDon", invoiceResult.insertedId, invoice.details, session);
      if (customerId) {
        const debtCollection = getDatabase().collection("CongNo");
        await debtCollection.insertOne({
          MaCN: await nextBusinessCode(debtCollection, "CongNo"),
          MaKH: customerId,
          MaDH: orderResult.insertedId,
          MaHD: invoiceResult.insertedId,
          MaNV: req.user.id,
          LoaiCongNo: "Khách hàng",
          NgayPhatSinh: today(),
          SoTien: total,
          SoTienDaTra: 0,
          SoTienConLai: total,
          TrangThai: "Còn nợ",
          createdAt: new Date(),
        }, { session });
      }
      return { order: serialize({ _id: orderResult.insertedId, ...order }), invoice: serialize({ _id: invoiceResult.insertedId, ...invoice }) };
    });
    res.status(201).json({ data: created, message: "Đã lập đơn hàng và hóa đơn" });
  } catch (error) { next(error); }
});

router.post("/payments", allowRoles("QuanLy", "KeToan", "NhanVienBanHang"), async (req, res, next) => {
  try {
    const invoiceId = id(req.body.invoiceId || req.body.MaHD);
    const amount = Number(req.body.amount || req.body.SoTien);
    if (!Number.isFinite(amount) || amount <= 0) throw fail("Số tiền thanh toán không hợp lệ");
    const payment = await withTransaction(async (session) => {
      const invoice = await getDatabase().collection("HoaDon").findOne({ _id: invoiceId }, { session });
      if (!invoice) throw fail("Không tìm thấy hóa đơn", 404);
      const currentPaid = Number(invoice.SoTienDaTra || 0);
      const remaining = Math.max(0, Number(invoice.TongTien || 0) - currentPaid);
      if (amount > remaining) throw fail(`Số tiền thanh toán vượt số còn nợ (${remaining})`, 409);
      const totalPaid = currentPaid + amount;
      const paymentDocument = { MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"), MaHD: invoiceId, PhuongThuc: req.body.method || req.body.PhuongThuc || "Tiền mặt", SoTien: amount, NgayThanhToan: today(), TrangThai: "Đã ghi nhận", createdAt: new Date() };
      const result = await getDatabase().collection("ThanhToan").insertOne(paymentDocument, { session });
      const remainingAfterPayment = Math.max(0, Number(invoice.TongTien) - totalPaid);
      const status = totalPaid >= Number(invoice.TongTien) ? "Đã thanh toán" : "Thanh toán một phần";
      await getDatabase().collection("HoaDon").updateOne({ _id: invoiceId }, { $set: { SoTienDaTra: totalPaid, SoTienConLai: remainingAfterPayment, TrangThai: status, updatedAt: new Date() } }, { session });
      if (invoice.MaKH) {
        await getDatabase().collection("CongNo").updateOne(
          { MaHD: invoiceId },
          { $set: { MaKH: invoice.MaKH, MaDH: invoice.MaDH, MaHD: invoiceId, MaNV: invoice.MaNV, LoaiCongNo: "Khách hàng", SoTien: invoice.TongTien, SoTienDaTra: totalPaid, SoTienConLai: remainingAfterPayment, TrangThai: status === "Đã thanh toán" ? "Đã thanh toán" : "Còn nợ", updatedAt: new Date() }, $setOnInsert: { MaCN: await nextBusinessCode(getDatabase().collection("CongNo"), "CongNo"), NgayPhatSinh: invoice.NgayLap, createdAt: new Date() } },
          { session, upsert: true },
        );
      }
      return serialize({ _id: result.insertedId, ...paymentDocument });
    });
    res.status(201).json({ data: payment, message: "Đã ghi nhận thanh toán" });
  } catch (error) { next(error); }
});

router.post("/stocktakes", allowRoles("QuanLy", "NhanVienKho"), async (req, res, next) => {
  try {
    const created = await withTransaction(async (session) => {
      const items = [];
    for (const line of req.body.items || []) {
      const product = await getDatabase().collection("SanPham").findOne({ _id: id(line.productId || line.MaSP) }, { session });
      if (!product) throw fail("Sản phẩm kiểm kê không tồn tại", 404);
      const stock = await getDatabase().collection("TonKho").findOne({ MaSP: product._id }, { session });
      const actual = Number(line.actual ?? line.SoLuongThucTe);
      if (!Number.isInteger(actual) || actual < 0) throw fail("Số lượng thực tế không hợp lệ");
      items.push({ MaSP: product._id, SoLuongHeThong: Number(stock?.SoLuongTon || 0), SoLuongThucTe: actual, ChenhLech: actual - Number(stock?.SoLuongTon || 0) });
      await getDatabase().collection("TonKho").updateOne({ MaSP: product._id }, { $set: { SoLuongTon: actual, NgayCapNhat: today(), updatedAt: new Date() } }, { upsert: true, session });
      await getDatabase().collection("SanPham").updateOne({ _id: product._id }, { $set: { stock: actual } }, { session });
    }
    if (!items.length) throw fail("Phiếu kiểm kê phải có sản phẩm");
      const document = { MaKK: await nextBusinessCode(getDatabase().collection("KiemKe"), "KiemKe"), MaNV: req.user.id, NgayKiemKe: req.body.NgayKiemKe || today(), GhiChu: req.body.note || "Kiểm kê kho", details: items, createdAt: new Date(), updatedAt: new Date() };
      const result = await getDatabase().collection("KiemKe").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_KiemKe", result.insertedId, document.details, session);
      return serialize({ _id: result.insertedId, ...document });
    });
    res.status(201).json({ data: created, message: "Đã lưu kiểm kê và điều chỉnh tồn kho" });
  } catch (error) { next(error); }
});

router.post("/returns", allowRoles("QuanLy", "NhanVienBanHang"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.items || [req.body]);
    const orderId = id(req.body.orderId || req.body.MaDH);
    if (!orderId) throw fail("Phiếu trả hàng phải liên kết với đơn hàng");
    const order = await getDatabase().collection("DonHang").findOne({ _id: orderId });
    if (!order) throw fail("Đơn hàng liên kết không tồn tại", 404);
    const customerId = id(req.body.customerId || req.body.MaKH) || order.MaKH || null;
    if (req.body.customerId || req.body.MaKH) {
      const customer = await getDatabase().collection("KhachHang").findOne({ _id: customerId });
      if (!customer) throw fail("Khách hàng không tồn tại", 404);
    }
    const invoice = await getDatabase().collection("HoaDon").findOne({ MaDH: orderId });
    const orderLines = new Map((order.details || []).map((line) => [String(line.MaSP), Number(line.SoLuong || 0)]));
    for (const line of lines) {
      if (!orderLines.has(String(line.product._id)) || line.quantity > orderLines.get(String(line.product._id))) throw fail(`${line.product.TenSP} không thuộc đơn hàng hoặc vượt số lượng đã bán`);
    }
    const document = { MaPTH: await nextBusinessCode(getDatabase().collection("PhieuTraHang"), "PhieuTraHang"), MaDH: orderId, MaHD: invoice?._id || null, MaKH: customerId, MaNV: req.user.id, NgayTra: today(), LyDo: req.body.reason || req.body.LyDo, TrangThai: "Đã xử lý", SoLuong: lines.reduce((sum, line) => sum + line.quantity, 0), details: lines.map((line) => ({ MaSP: line.product._id, TenSP: line.product.TenSP, SoLuong: line.quantity, DonGia: line.price, ThanhTien: line.quantity * line.price })), createdAt: new Date(), updatedAt: new Date() };
    const created = await withTransaction(async (session) => {
      await adjustStock(lines, 1, false, session);
      const result = await getDatabase().collection("PhieuTraHang").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_PhieuTraHang", result.insertedId, document.details, session);
      return serializeReturn({ _id: result.insertedId, ...document, details: document.details.map((line) => ({ ...line, productCode: line.product.MaSP })) });
    });
    res.status(201).json({ data: created, message: "Đã ghi nhận trả hàng và cộng lại tồn kho" });
  } catch (error) { next(error); }
});

router.get("/inventory", allowRoles("QuanLy", "NhanVienKho"), async (_req, res, next) => { try { const products = await getDatabase().collection("SanPham").find().sort({ TenSP: 1 }).toArray(); const stocks = await getDatabase().collection("TonKho").find().toArray(); const byProduct = new Map(stocks.map((stock) => [stock.MaSP.toString(), stock])); res.json({ data: products.map((product) => ({ ...serialize(product), stock: Number(byProduct.get(product._id.toString())?.SoLuongTon ?? product.stock ?? 0), stockUpdatedAt: byProduct.get(product._id.toString())?.updatedAt || byProduct.get(product._id.toString())?.NgayCapNhat || null })) }); } catch (error) { next(error); } });
router.get("/reports/revenue", allowRoles("QuanLy", "KeToan"), async (_req, res, next) => {
  try {
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const [invoices, orders] = await Promise.all([
      getDatabase().collection("HoaDon").find({ TrangThai: "Đã thanh toán" }).toArray(),
      getDatabase().collection("DonHang").countDocuments(),
    ]);
    const makeDates = (lastDate) => Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${lastDate}T00:00:00`);
      date.setDate(date.getDate() - (6 - index));
      return formatDate(date);
    });
    const today = formatDate(new Date());
    let dates = makeDates(today);
    const revenueFor = (date) => invoices
      .filter((invoice) => String(invoice.NgayLap).slice(0, 10) === date)
      .reduce((sum, invoice) => sum + Number(invoice.TongTien || 0), 0);
    let weekly = dates.map((date) => ({ date, total: revenueFor(date) }));
    if (!weekly.some((item) => item.total > 0) && invoices.length) {
      const latestPaidDate = invoices
        .map((invoice) => String(invoice.NgayLap).slice(0, 10))
        .sort()
        .at(-1);
      dates = makeDates(latestPaidDate);
      weekly = dates.map((date) => ({ date, total: revenueFor(date) }));
    }
    res.json({
      report: "revenue",
      total: invoices.reduce((sum, invoice) => sum + Number(invoice.TongTien || 0), 0),
      orders,
      weekly,
    });
  } catch (error) { next(error); }
});
router.get("/reports/debts", allowRoles("QuanLy", "KeToan"), async (_req, res, next) => { try { const data = await getDatabase().collection("CongNo").find().sort({ SoTienConLai: -1 }).toArray(); res.json({ report: "debts", data: data.map(serialize), total: data.reduce((sum, item) => sum + Number(item.SoTienConLai || 0), 0) }); } catch (error) { next(error); } });
router.get("/reports/inventory", allowRoles("QuanLy", "KeToan"), async (_req, res, next) => { try { const data = await getDatabase().collection("TonKho").find().sort({ SoLuongTon: 1 }).toArray(); res.json({ report: "inventory", data: data.map(serialize) }); } catch (error) { next(error); } });

export default router;
