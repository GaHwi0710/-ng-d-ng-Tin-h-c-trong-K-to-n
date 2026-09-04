import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { allowRoles } from "../../common/middlewares/role.middleware.js";

const router = Router();
const today = () => new Date().toISOString().slice(0, 10);
const id = (value) => ObjectId.isValid(value) ? new ObjectId(value) : null;
const serialize = (document) => { if (!document) return document; const { _id, ...data } = document; return { id: _id.toString(), ...data }; };
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

async function productsByLines(lines) {
  const products = getDatabase().collection("SanPham");
  const result = [];
  for (const line of lines || []) {
    const productFilter = id(line.productId) || id(line.id) ? { _id: id(line.productId) || id(line.id) } : { MaSP: line.MaSP };
    const product = await products.findOne(productFilter);
    if (!product) throw fail(`Không tìm thấy sản phẩm ${line.productId || line.MaSP}`, 404);
    const quantity = Number(line.quantity || line.SoLuong);
    if (!Number.isInteger(quantity) || quantity <= 0) throw fail("Số lượng phải là số nguyên dương");
    result.push({ product, quantity, price: Number(line.price ?? line.DonGia ?? product.GiaNhap ?? product.GiaBan ?? 0) });
  }
  if (!result.length) throw fail("Chứng từ phải có ít nhất một sản phẩm");
  return result;
}

async function adjustStock(lines, direction, allowShortage = false) {
  const stocks = getDatabase().collection("TonKho");
  const applied = [];
  for (const line of lines) {
    const delta = direction * line.quantity;
    const filter = direction < 0 && !allowShortage ? { MaSP: line.product._id, SoLuongTon: { $gte: line.quantity } } : { MaSP: line.product._id };
    const result = await stocks.updateOne(filter, { $set: { MaSP: line.product._id, updatedAt: new Date(), NgayCapNhat: today() }, $inc: { SoLuongTon: delta } }, { upsert: direction > 0 });
    if (!result.modifiedCount && !(direction > 0 && result.upsertedCount)) {
      for (const previous of applied) await stocks.updateOne({ MaSP: previous.product._id }, { $inc: { SoLuongTon: -previous.delta } });
      const current = await stocks.findOne({ MaSP: line.product._id });
      throw fail(`${line.product.TenSP} vượt tồn kho hiện tại (${current?.SoLuongTon || 0})`, 409);
    }
    await getDatabase().collection("SanPham").updateOne({ _id: line.product._id }, { $inc: { stock: delta } });
    applied.push({ product: line.product, delta });
  }
}

router.post("/goods-receipts", allowRoles("QuanLy", "NhanVienKho", "NhanVienMuaHang"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.details || req.body.items);
    const supplier = await getDatabase().collection("NhaCungCap").findOne({ _id: id(req.body.supplierId || req.body.MaNCC) });
    if (!supplier) throw fail("Nhà cung cấp không hợp lệ", 404);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    await adjustStock(lines, 1);
    const document = {
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
    const result = await getDatabase().collection("PhieuNhap").insertOne(document);
    res.status(201).json({ data: serialize({ _id: result.insertedId, ...document }), message: "Đã nhập kho và cập nhật tồn kho" });
  } catch (error) { next(error); }
});

router.post("/goods-issues", allowRoles("QuanLy", "NhanVienKho"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.details || req.body.items);
    const reason = req.body.reason || req.body.LyDoXuat || "Bán hàng";
    const allowShortage = reason === "Điều chỉnh kiểm kê thiếu";
    if (reason === "Hủy hàng hỏng" && !String(req.body.note || req.body.GhiChu || "").trim()) throw fail("Phải nhập mô tả hàng hỏng");
    await adjustStock(lines, -1, allowShortage);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const document = {
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
    const result = await getDatabase().collection("PhieuXuat").insertOne(document);
    res.status(201).json({ data: serialize({ _id: result.insertedId, ...document }), message: "Đã xuất kho và cập nhật tồn kho" });
  } catch (error) { next(error); }
});

router.post("/sales-orders", allowRoles("QuanLy", "NhanVienBanHang"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.items || req.body.details);
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const order = { MaKH: id(req.body.customerId || req.body.MaKH) || null, MaNV: req.user.id, NgayDat: req.body.NgayDat || today(), TrangThai: "Chờ xuất kho", TongTien: total, details: lines.map((line) => ({ MaSP: line.product._id, SoLuong: line.quantity, DonGia: line.price, GiamGia: 0, ThanhTien: line.quantity * line.price })), createdAt: new Date() };
    const orderResult = await getDatabase().collection("DonHang").insertOne(order);
    const invoice = { MaDH: orderResult.insertedId, MaNV: req.user.id, NgayLap: today(), TongTien: total, TrangThai: "Chưa thanh toán", details: order.details, createdAt: new Date() };
    const invoiceResult = await getDatabase().collection("HoaDon").insertOne(invoice);
    res.status(201).json({ data: { order: serialize({ _id: orderResult.insertedId, ...order }), invoice: serialize({ _id: invoiceResult.insertedId, ...invoice }) }, message: "Đã lập đơn hàng và hóa đơn" });
  } catch (error) { next(error); }
});

router.post("/payments", allowRoles("QuanLy", "KeToan", "NhanVienBanHang"), async (req, res, next) => {
  try {
    const invoiceId = id(req.body.invoiceId || req.body.MaHD);
    const invoice = await getDatabase().collection("HoaDon").findOne({ _id: invoiceId });
    if (!invoice) throw fail("Không tìm thấy hóa đơn", 404);
    const amount = Number(req.body.amount || req.body.SoTien);
    if (!Number.isFinite(amount) || amount <= 0) throw fail("Số tiền thanh toán không hợp lệ");
    const paid = await getDatabase().collection("ThanhToan").aggregate([{ $match: { MaHD: invoiceId } }, { $group: { _id: null, total: { $sum: "$SoTien" } } }]).toArray();
    const totalPaid = Number(paid[0]?.total || 0) + amount;
    const payment = { MaHD: invoiceId, PhuongThuc: req.body.method || req.body.PhuongThuc || "Tiền mặt", SoTien: amount, NgayThanhToan: today(), TrangThai: "Đã ghi nhận", createdAt: new Date() };
    const result = await getDatabase().collection("ThanhToan").insertOne(payment);
    await getDatabase().collection("HoaDon").updateOne({ _id: invoiceId }, { $set: { TrangThai: totalPaid >= Number(invoice.TongTien) ? "Đã thanh toán" : "Thanh toán một phần", updatedAt: new Date() } });
    res.status(201).json({ data: serialize({ _id: result.insertedId, ...payment }), message: "Đã ghi nhận thanh toán" });
  } catch (error) { next(error); }
});

router.post("/stocktakes", allowRoles("QuanLy", "NhanVienKho"), async (req, res, next) => {
  try {
    const items = [];
    for (const line of req.body.items || []) {
      const product = await getDatabase().collection("SanPham").findOne({ _id: id(line.productId || line.MaSP) });
      if (!product) throw fail("Sản phẩm kiểm kê không tồn tại", 404);
      const stock = await getDatabase().collection("TonKho").findOne({ MaSP: product._id });
      const actual = Number(line.actual ?? line.SoLuongThucTe);
      if (!Number.isInteger(actual) || actual < 0) throw fail("Số lượng thực tế không hợp lệ");
      items.push({ MaSP: product._id, SoLuongHeThong: Number(stock?.SoLuongTon || 0), SoLuongThucTe: actual, ChenhLech: actual - Number(stock?.SoLuongTon || 0) });
      await getDatabase().collection("TonKho").updateOne({ MaSP: product._id }, { $set: { SoLuongTon: actual, NgayCapNhat: today(), updatedAt: new Date() } }, { upsert: true });
      await getDatabase().collection("SanPham").updateOne({ _id: product._id }, { $set: { stock: actual } });
    }
    if (!items.length) throw fail("Phiếu kiểm kê phải có sản phẩm");
    const document = { MaNV: req.user.id, NgayKiemKe: today(), GhiChu: req.body.note || "Kiểm kê kho", details: items, createdAt: new Date() };
    const result = await getDatabase().collection("KiemKe").insertOne(document);
    res.status(201).json({ data: serialize({ _id: result.insertedId, ...document }), message: "Đã lưu kiểm kê và điều chỉnh tồn kho" });
  } catch (error) { next(error); }
});

router.post("/returns", allowRoles("QuanLy", "NhanVienBanHang"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.items || [req.body]);
    const orderId = id(req.body.orderId || req.body.MaDH);
    const document = { MaDH: orderId, MaKH: id(req.body.customerId || req.body.MaKH) || null, MaNV: req.user.id, NgayTra: today(), LyDo: req.body.reason || req.body.LyDo, TrangThai: "Đã xử lý", details: lines.map((line) => ({ MaSP: line.product._id, SoLuong: line.quantity, DonGia: line.price, ThanhTien: line.quantity * line.price })), createdAt: new Date() };
    await adjustStock(lines, 1);
    const result = await getDatabase().collection("PhieuTraHang").insertOne(document);
    res.status(201).json({ data: serialize({ _id: result.insertedId, ...document }), message: "Đã ghi nhận trả hàng và cộng lại tồn kho" });
  } catch (error) { next(error); }
});

router.get("/inventory", allowRoles("QuanLy", "NhanVienKho"), async (_req, res, next) => { try { const products = await getDatabase().collection("SanPham").find().sort({ TenSP: 1 }).toArray(); const stocks = await getDatabase().collection("TonKho").find().toArray(); const byProduct = new Map(stocks.map((stock) => [stock.MaSP.toString(), stock.SoLuongTon])); res.json({ data: products.map((product) => ({ ...serialize(product), stock: Number(byProduct.get(product._id.toString()) ?? product.stock ?? 0) })) }); } catch (error) { next(error); } });
router.get("/reports/revenue", async (_req, res, next) => { try { const [paid, orders] = await Promise.all([getDatabase().collection("HoaDon").aggregate([{ $match: { TrangThai: "Đã thanh toán" } }, { $group: { _id: null, total: { $sum: "$TongTien" } } }]).toArray(), getDatabase().collection("DonHang").countDocuments()]); res.json({ report: "revenue", total: paid[0]?.total || 0, orders }); } catch (error) { next(error); } });
router.get("/reports/debts", async (_req, res, next) => { try { const data = await getDatabase().collection("CongNo").find().sort({ SoTienConLai: -1 }).toArray(); res.json({ report: "debts", data: data.map(serialize), total: data.reduce((sum, item) => sum + Number(item.SoTienConLai || 0), 0) }); } catch (error) { next(error); } });
router.get("/reports/inventory", async (_req, res, next) => { try { const data = await getDatabase().collection("TonKho").find().sort({ SoLuongTon: 1 }).toArray(); res.json({ report: "inventory", data: data.map(serialize) }); } catch (error) { next(error); } });

export default router;
