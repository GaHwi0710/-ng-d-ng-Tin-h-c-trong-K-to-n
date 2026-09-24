import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase, withTransaction } from "../../config/mongodb.js";
import { requirePermission } from "../shared/permissions.js";
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
    const rawProductId = line.productId ?? line.id ?? line.MaSP ?? line.productCode ?? line.MaSPCode;
    if (!rawProductId) throw fail("Sản phẩm không hợp lệ");
    const query = [];
    const normalizedId = id(rawProductId);
    if (normalizedId) query.push({ _id: normalizedId });
    query.push({ MaSP: String(rawProductId) }, { _id: String(rawProductId) });
    const product = await products.findOne({ $or: query });
    if (!product) throw fail(`Không tìm thấy sản phẩm ${rawProductId}`, 404);
    const quantity = Number(line.quantity ?? line.SoLuong ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) throw fail("Số lượng phải là số nguyên dương");
    const price = Number(line.price ?? line.DonGia ?? line.GiaBan ?? product.GiaBan ?? 0);
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
    const filter = direction < 0 && !allowShortage
      ? { MaSP: line.product._id, $or: [{ SoLuongTon: { $gte: line.quantity } }, { SoLuong: { $gte: line.quantity } }] }
      : { MaSP: line.product._id };
    const result = await stocks.updateOne(
      filter,
      {
        $set: { MaSP: line.product._id, updatedAt: new Date(), NgayCapNhat: today() },
        $inc: { SoLuongTon: delta, SoLuong: delta }
      },
      { upsert: direction > 0, session }
    );
    if (!result.modifiedCount && !(direction > 0 && result.upsertedCount)) {
      for (const previous of applied) {
        await stocks.updateOne(
          { MaSP: previous.product._id },
          { $inc: { SoLuongTon: -previous.delta, SoLuong: -previous.delta } },
          { session }
        );
      }
      const current = await stocks.findOne({ MaSP: line.product._id }, { session });
      throw fail(`${line.product.TenSP} vượt tồn kho hiện tại (${current?.SoLuongTon ?? current?.SoLuong ?? 0})`, 409);
    }
    await getDatabase().collection("SanPham").updateOne({ _id: line.product._id }, { $inc: { stock: delta } }, { session });
    applied.push({ product: line.product, delta });
  }
}

router.post("/goods-receipts", requirePermission("goods-receipts", "tao"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.details || req.body.items);
    const supplier = await getDatabase().collection("NhaCungCap").findOne({
      $or: [
        { _id: id(req.body.supplierId || req.body.MaNCC) },
        { MaNCC: String(req.body.supplierId || req.body.MaNCC) }
      ]
    });
    if (!supplier) throw fail("Nhà cung cấp không hợp lệ", 404);
    if (supplier.TrangThai === "Ngưng hoạt động" || supplier.status === "inactive") {
      throw fail("Nhà cung cấp đã ngưng hoạt động, không thể tạo phiếu nhập kho", 400);
    }

    for (const line of lines) {
      if (line.product.TrangThai === "Ngừng bán" || line.product.status === "inactive" || line.product.status === "discontinued") {
        throw fail(`Sản phẩm "${line.product.TenSP}" đã ngừng bán, không thể tạo phiếu nhập kho`, 400);
      }
    }

    const rawPO = req.body.purchaseOrderId || req.body.MaDDH;
    let purchaseOrder = null;
    let purchaseOrderId = null;
    if (rawPO) {
      const pId = id(rawPO);
      purchaseOrder = await getDatabase().collection("DonDatHang").findOne(
        pId ? { _id: pId } : { MaDDH: String(rawPO) }
      );
      if (!purchaseOrder) throw fail("Đơn đặt hàng không tồn tại", 404);
      if (purchaseOrder.TrangThai === "Đã hủy") {
        throw fail("Đơn đặt hàng đã bị hủy, không thể tạo phiếu nhập", 400);
      }
      if (purchaseOrder.TrangThai === "Hoàn thành") {
        throw fail("Đơn đặt hàng đã nhập đủ hàng (Hoàn thành), không thể nhập thêm", 400);
      }
      purchaseOrderId = purchaseOrder._id;
      const matchesSupplier =
        String(purchaseOrder.MaNCC) === String(supplier._id) ||
        String(purchaseOrder.MaNCC) === String(supplier.MaNCC) ||
        String(purchaseOrder.MaNCCCode) === String(supplier.MaNCC);
      if (!matchesSupplier) throw fail("Đơn đặt hàng không khớp với nhà cung cấp đã chọn", 400);

      // Kiểm tra số lượng còn thiếu trên từng sản phẩm
      const poRawItems = purchaseOrder.items || [];
      let poItems = poRawItems;
      if (!poItems.length) {
        poItems = await getDatabase().collection("CT_DonDatHang").find({ MaDDH: purchaseOrderId }).toArray();
      }

      const matchPoItem = (product) => {
        const pidStr = String(product._id);
        const codeStr = String(product.MaSP || "");
        return poItems.find((item) => {
          const itemPid = String(item.productId || item.MaSP || item.id || "");
          const itemCode = String(item.MaSPCode || item.MaSP || "");
          return itemPid === pidStr || itemPid === codeStr || itemCode === codeStr || itemCode === pidStr;
        });
      };

      for (const line of lines) {
        const poItem = matchPoItem(line.product);
        if (!poItem) throw fail(`Sản phẩm "${line.product.TenSP}" không có trong đơn đặt hàng`, 400);
        const ordered = Number(poItem.quantity || poItem.SoLuong || 0);
        const received = Number(poItem.quantityReceived || 0);
        const remaining = Math.max(0, ordered - received);
        if (line.quantity > remaining) {
          throw fail(
            `Sản phẩm "${line.product.TenSP}": số lượng nhập (${line.quantity}) vượt số còn thiếu (${remaining}) trong đơn đặt hàng`,
            400
          );
        }
      }
    }

    if (req.body.NgayNhap && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.NgayNhap)) throw fail("Ngày nhập không hợp lệ");
    const total = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const paidAmount = Math.max(0, Number(req.body.SoTienDaTra || req.body.paidAmount || 0));
    if (paidAmount > total) throw fail("Số tiền đã thanh toán không được vượt quá tổng tiền phiếu nhập", 400);
    const remaining = Math.max(0, total - paidAmount);
    const debtStatus = remaining === 0 ? "Đã thanh toán" : "Còn nợ";
    const nguoiLap = req.user?.fullName || req.user?.username || "Thủ kho";

    const created = await withTransaction(async (session) => {
      await adjustStock(lines, 1, false, session);
      const document = {
        MaPN: await nextBusinessCode(getDatabase().collection("PhieuNhap"), "PhieuNhap"),
        MaDDH: purchaseOrderId || null,
        MaNCC: supplier._id,
        MaNV: req.user.id,
        NguoiLap: nguoiLap,
        NgayNhap: req.body.NgayNhap || today(),
        TrangThai: "Đã lưu",
        TongTien: total,
        SoTienDaTra: paidAmount,
        SoTienConLai: remaining,
        SoLuong: lines.reduce((sum, line) => sum + line.quantity, 0),
        LyDoNhap: req.body.LyDoNhap || `Nhập hàng từ ${supplier.TenNCC}`,
        NguoiLienQuan: req.body.NguoiLienQuan || supplier.TenNCC || "",
        DiaChi: req.body.DiaChi || supplier.DiaChi || "",
        Kho: req.body.Kho || "Kho chính",
        DiaDiem: req.body.DiaDiem || "",
        TkNo: req.body.TkNo || "156",
        TkCo: req.body.TkCo || "331",
        SoChungTuGoc: purchaseOrder ? (purchaseOrder.MaDDH || String(purchaseOrderId)) : (req.body.SoChungTuGoc || ""),
        GhiChu: req.body.GhiChu || req.body.note || "",
        details: lines.map((line) => ({
          MaSP: line.product._id,
          MaSPCode: line.product.MaSP,
          TenSP: line.product.TenSP,
          HinhAnh: line.product.HinhAnh || "",
          LoaiHang: line.product.LoaiHang || "",
          DonViTinh: line.product.DonViTinh || "Cái",
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
        type: "suppliers",
        partnerName: supplier.TenNCC,
        TenNCC: supplier.TenNCC,
        NgayPhatSinh: document.NgayNhap,
        SoTien: total,
        SoTienDaTra: paidAmount,
        SoTienConLai: remaining,
        TrangThai: debtStatus,
        createdAt: new Date(),
      }, { session });

      // UC19 & UC18: Ghi nhận thanh toán và phiếu chi nếu có trả trước ngay khi nhận
      if (paidAmount > 0) {
        const phuongThuc = req.body.paymentMethod || req.body.PhuongThuc || "Tiền mặt";
        const paymentDoc = {
          MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"),
          MaPN: result.insertedId,
          MaPNCode: document.MaPN,
          MaDDH: purchaseOrderId,
          MaNCC: supplier._id,
          TenDoiTuong: supplier.TenNCC,
          TenKH: supplier.TenNCC,
          LoaiThanhToan: "Chi trả NCC",
          PhuongThuc: phuongThuc,
          SoTien: paidAmount,
          NgayThanhToan: document.NgayNhap,
          TrangThai: "Đã thanh toán",
          createdAt: new Date(),
        };
        await getDatabase().collection("ThanhToan").insertOne(paymentDoc, { session });

        if (phuongThuc === "Tiền mặt") {
          const cashVoucherDoc = {
            MaPC: await nextBusinessCode(getDatabase().collection("PhieuChi"), "PhieuChi"),
            NgayLap: document.NgayNhap,
            NgayChi: document.NgayNhap,
            NguoiNhanTien: supplier.TenNCC,
            NguoiNhan: supplier.TenNCC,
            DiaChi: supplier.DiaChi || "",
            LyDo: `Thanh toán tiền hàng phiếu nhập ${document.MaPN}`,
            SoTien: paidAmount,
            PhuongThuc: "Tiền mặt",
            MaPN: result.insertedId,
            MaNCC: supplier._id,
            TrangThai: "Đã chi",
            NguoiLap: nguoiLap,
            MaNV: req.user.id,
            createdAt: new Date(),
          };
          await getDatabase().collection("PhieuChi").insertOne(cashVoucherDoc, { session });
        }
      }

      // Cập nhật số lượng đã nhận trên từng item của PO + tính lại trạng thái PO
      if (purchaseOrderId) {
        const poDoc = await getDatabase().collection("DonDatHang").findOne({ _id: purchaseOrderId }, { session });
        let poItems = poDoc?.items || [];
        if (!poItems.length) {
          poItems = await getDatabase().collection("CT_DonDatHang").find({ MaDDH: purchaseOrderId }, { session }).toArray();
        }

        const updatedItems = poItems.map((item) => {
          const matchedLine = lines.find((l) => {
            const pidStr = String(l.product._id);
            const codeStr = String(l.product.MaSP || "");
            const itemPid = String(item.productId || item.MaSP || item.id || "");
            const itemCode = String(item.MaSPCode || item.MaSP || "");
            return itemPid === pidStr || itemPid === codeStr || itemCode === codeStr || itemCode === pidStr;
          });
          const justReceived = matchedLine ? matchedLine.quantity : 0;
          return {
            ...item,
            quantityReceived: Number(item.quantityReceived || 0) + justReceived,
          };
        });

        // Tính trạng thái PO mới
        const totalOrdered = updatedItems.reduce((s, i) => s + Number(i.quantity || i.SoLuong || 0), 0);
        const totalReceived = updatedItems.reduce((s, i) => s + Number(i.quantityReceived || 0), 0);
        let newPoStatus;
        if (totalReceived >= totalOrdered) {
          newPoStatus = "Hoàn thành";
        } else if (totalReceived > 0) {
          newPoStatus = "Nhập một phần";
        } else {
          newPoStatus = "Đang chờ nhập";
        }

        await getDatabase().collection("DonDatHang").updateOne(
          { _id: purchaseOrderId },
          { $set: { items: updatedItems, TrangThai: newPoStatus, updatedAt: new Date() } },
          { session }
        );
        if (updatedItems.length) {
          await getDatabase().collection("CT_DonDatHang").deleteMany({ MaDDH: purchaseOrderId }, { session });
          await getDatabase().collection("CT_DonDatHang").insertMany(
            updatedItems.map((item) => ({ ...item, MaDDH: purchaseOrderId })),
            { session }
          );
        }
      }
      return serialize({ _id: result.insertedId, ...document });
    });
    res.status(201).json({ data: created, message: "Đã nhập kho và cập nhật tồn kho" });
  } catch (error) { next(error); }
});


router.post("/goods-issues", requirePermission("goods-issues", "tao"), async (req, res, next) => {
  try {
    const orderId = id(req.body.orderId || req.body.MaDH);
    if (orderId) {
      const existingIssue = await getDatabase().collection("PhieuXuat").findOne({ MaDH: orderId });
      if (existingIssue) {
        throw fail(`Đơn hàng này đã được tự động lập phiếu xuất kho (${existingIssue.MaPX || "Đã xuất kho"}). Không được xuất kho trùng lặp.`, 400);
      }
    }
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

router.post("/sales-orders", requirePermission("sales-orders", "tao"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.items || req.body.details);
    if (req.body.NgayDat && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.NgayDat)) throw fail("Ngày bán không hợp lệ");
    let customer = null;
    const customerId = id(req.body.customerId || req.body.MaKH);
    if (customerId) {
      customer = await getDatabase().collection("KhachHang").findOne({ _id: customerId });
      if (!customer) throw fail("Khách hàng không tồn tại", 404);
      if (customer.TrangThai === "Ngưng hoạt động" || customer.status === "inactive") {
        throw fail("Không thể lập hóa đơn cho khách hàng đã ngưng hoạt động", 400);
      }
    }

    for (const line of lines) {
      if (line.product.TrangThai === "Ngừng bán" || line.product.status === "inactive" || line.product.status === "discontinued") {
        throw fail(`Sản phẩm "${line.product.TenSP}" đã ngừng bán, không thể lập hóa đơn bán hàng`, 400);
      }
      const stockDoc = await getDatabase().collection("TonKho").findOne({ MaSP: line.product._id });
      const currentStock = Number(stockDoc?.SoLuongTon ?? line.product.stock ?? 0);
      if (line.quantity > currentStock) {
        throw fail(`Số lượng bán của "${line.product.TenSP}" (${line.quantity}) vượt tồn kho hiện tại (${currentStock})`, 400);
      }
    }

    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);

    // Calculate voucher / discount securely on server
    let discount = 0;
    let promo = null;
    let promoCode = String(req.body.promoCode || req.body.MaKM || req.body.voucherCode || "").trim();

    if (promoCode) {
      promo = await getDatabase().collection("KhuyenMai").findOne({
        MaKM: { $regex: new RegExp(`^${promoCode}$`, "i") },
        TrangThai: { $ne: "Đã kết thúc" }
      });
      if (promo) {
        const pts = Number(customer?.DiemTichLuy || 0);
        const tier = pts >= 1000 ? "Kim Cương" : pts >= 500 ? "Hạng Vàng" : pts >= 100 ? "Hạng Bạc" : "Hạng Đồng";
        if (promo.PhamVi === "Theo đối tượng" && promo.DoiTuong && promo.DoiTuong !== "Tất cả") {
          if (!customer) {
            throw fail(`Mã ưu đãi "${promoCode}" chỉ dành cho khách hàng ${promo.DoiTuong}`);
          }
          const dtLower = promo.DoiTuong.toLowerCase();
          const tierLower = tier.toLowerCase();
          if (!dtLower.includes(tierLower) && !tierLower.includes(dtLower)) {
            throw fail(`Mã ưu đãi "${promoCode}" áp dụng cho ${promo.DoiTuong}. Khách hàng hiện tại đang là ${tier}.`);
          }
        }
        if (promo.GiaTriGiam && Number(promo.GiaTriGiam) > 0) {
          discount = Math.min(subtotal, Number(promo.GiaTriGiam));
        } else if (promo.PhanTramGiam && Number(promo.PhanTramGiam) > 0) {
          discount = Math.min(subtotal, Math.round((subtotal * Number(promo.PhanTramGiam)) / 100));
        }
      }
    }

    const usedVoucherId = req.body.usedVoucherId;
    if (usedVoucherId && customer) {
      const v = (customer.VouchersDaDoi || []).find((x) => x.id === usedVoucherId && (x.status === "Chưa sử dụng" || !x.status));
      if (v) {
        discount = Math.min(subtotal, Number(v.discountAmount || (v.code === "BAC50K" ? 50000 : v.code === "VANG100K" ? 100000 : 200000)));
        promoCode = v.code;
      }
    }

    discount = Math.max(0, Math.min(subtotal, discount));
    const total = Math.max(0, subtotal - discount);
    const paymentMethod = req.body.paymentMethod || req.body.PhuongThuc || "Tiền mặt";
    const isCredit = paymentMethod === "Ghi nợ";
    if (isCredit && !customerId) {
      throw fail("Khách hàng mua ghi nợ bắt buộc phải chọn thông tin khách hàng cụ thể", 400);
    }
    const isFullPaid = !isCredit;

    const created = await withTransaction(async (session) => {
      await adjustStock(lines, -1, false, session);
      const nguoiLap = req.user?.fullName || req.user?.username || "Nhân viên";
      const order = {
        MaDH: await nextBusinessCode(getDatabase().collection("DonHang"), "DonHang"),
        MaKH: customerId || null,
        MaKHCode: customer?.MaKH || null,
        TenKH: customer?.HoTen || "Khách vãng lai",
        MaNV: req.user.id,
        NguoiLap: nguoiLap,
        NgayDat: req.body.NgayDat || today(),
        TrangThai: "Hoàn thành",
        TienHang: subtotal,
        GiamGia: discount,
        MaKM: promoCode || null,
        TongTien: total,
        details: lines.map((line) => ({
          MaSP: line.product._id,
          TenSP: line.product.TenSP,
          MaSPCode: line.product.MaSP,
          HinhAnh: line.product.HinhAnh || "",
          LoaiHang: line.product.LoaiHang || "",
          DonViTinh: line.product.DonViTinh || "Cái",
          SoLuong: line.quantity,
          DonGia: line.price,
          GiamGia: 0,
          ThanhTien: line.quantity * line.price
        })),
        createdAt: new Date()
      };
      const orderResult = await getDatabase().collection("DonHang").insertOne(order, { session });
      await replaceDetails(getDatabase(), "CT_DonHang", orderResult.insertedId, order.details, session);

      // UC14: Tự động lập Phiếu xuất kho
      const issueDoc = {
        MaPX: await nextBusinessCode(getDatabase().collection("PhieuXuat"), "PhieuXuat"),
        MaDH: orderResult.insertedId,
        MaDHCode: order.MaDH,
        MaNV: req.user.id,
        NgayXuat: req.body.NgayDat || today(),
        LyDoXuat: `Xuất kho bán hàng theo đơn ${order.MaDH}`,
        GhiChu: `Tự động xuất kho theo đơn bán hàng ${order.MaDH}`,
        NguoiLienQuan: customer?.HoTen || "Khách mua lẻ",
        DiaChi: customer?.DiaChi || "",
        Kho: "Kho chính",
        TrangThai: "Đã xuất kho",
        TongTien: lines.reduce((sum, line) => sum + line.quantity * (Number(line.product.GiaNhap) || line.price), 0),
        SoLuong: lines.reduce((sum, line) => sum + line.quantity, 0),
        details: lines.map((line) => ({
          MaSP: line.product._id,
          TenSP: line.product.TenSP,
          DonViTinh: line.product.DonViTinh || "Cái",
          SoLuong: line.quantity,
          DonGia: Number(line.product.GiaNhap) || line.price,
          ThanhTien: line.quantity * (Number(line.product.GiaNhap) || line.price),
        })),
        createdAt: new Date(),
      };
      const issueResult = await getDatabase().collection("PhieuXuat").insertOne(issueDoc, { session });
      await replaceDetails(getDatabase(), "CT_PhieuXuat", issueResult.insertedId, issueDoc.details, session);

      const invoice = {
        MaHD: await nextBusinessCode(getDatabase().collection("HoaDon"), "HoaDon"),
        MaDH: orderResult.insertedId,
        MaDHCode: order.MaDH,
        MaKH: customerId || null,
        MaKHCode: customer?.MaKH || null,
        TenKH: customer?.HoTen || "Khách vãng lai",
        MaNV: req.user.id,
        NguoiLap: nguoiLap,
        NgayLap: req.body.NgayDat || today(),
        TienHang: subtotal,
        GiamGia: discount,
        MaKM: promoCode || null,
        TongTien: total,
        SoTienDaTra: isFullPaid ? total : 0,
        SoTienConLai: isFullPaid ? 0 : total,
        TrangThai: isFullPaid ? "Đã thanh toán" : "Chưa thanh toán",
        HinhThucThanhToan: paymentMethod,
        details: order.details,
        createdAt: new Date()
      };
      const invoiceResult = await getDatabase().collection("HoaDon").insertOne(invoice, { session });
      await replaceDetails(getDatabase(), "CT_HoaDon", invoiceResult.insertedId, invoice.details, session);

      if (isCredit) {
        // UC15: Ghi nhận công nợ khách hàng khi bán chịu
        await getDatabase().collection("CongNo").insertOne({
          MaCN: await nextBusinessCode(getDatabase().collection("CongNo"), "CongNo"),
          MaKH: customerId,
          MaKHCode: customer?.MaKH || null,
          TenKH: customer?.HoTen || "Khách hàng",
          MaDH: orderResult.insertedId,
          MaHD: invoiceResult.insertedId,
          MaNV: req.user.id,
          LoaiCongNo: "Khách hàng",
          SoTien: total,
          SoTienDaTra: 0,
          SoTienConLai: total,
          TrangThai: "Còn nợ",
          NgayPhatSinh: req.body.NgayDat || today(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { session });
      } else if (isFullPaid) {
        // UC19: Ghi nhận lịch sử thanh toán
        const paymentDoc = {
          MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"),
          MaHD: invoiceResult.insertedId,
          MaHDCode: invoice.MaHD,
          TenKH: customer?.HoTen || "Khách vãng lai",
          PhuongThuc: paymentMethod,
          SoTien: total,
          NgayThanhToan: req.body.NgayDat || today(),
          TrangThai: "Đã thanh toán",
          createdAt: new Date(),
        };
        await getDatabase().collection("ThanhToan").insertOne(paymentDoc, { session });

        // UC17: Nếu thu tiền mặt, tự động lập Phiếu thu
        if (paymentMethod === "Tiền mặt" && total > 0) {
          const receiptDoc = {
            MaPT: await nextBusinessCode(getDatabase().collection("PhieuThu"), "PhieuThu"),
            MaHD: invoiceResult.insertedId,
            MaHDCode: invoice.MaHD,
            MaKH: customerId || null,
            TenKH: customer?.HoTen || "Khách vãng lai",
            NguoiNop: customer?.HoTen || "Khách mua lẻ",
            LyDo: `Thu tiền bán hàng hóa đơn ${invoice.MaHD}`,
            SoTien: total,
            PhuongThuc: "Tiền mặt",
            NgayThu: req.body.NgayDat || today(),
            NguoiLap: nguoiLap,
            MaNV: req.user.id,
            TrangThai: "Đã thu",
            createdAt: new Date(),
          };
          await getDatabase().collection("PhieuThu").insertOne(receiptDoc, { session });
        }
      }

      if (customerId) {
        if (usedVoucherId) {
          await getDatabase().collection("KhachHang").updateOne(
            { _id: customerId, "VouchersDaDoi.id": usedVoucherId },
            {
              $set: {
                "VouchersDaDoi.$.status": "Đã sử dụng",
                "VouchersDaDoi.$.usedAt": today(),
                "VouchersDaDoi.$.orderCode": order.MaDH,
              }
            },
            { session }
          );
        } else {
          let redeemPoints = Number(req.body.redeemPoints || 0);
          if (!redeemPoints && promo) {
            redeemPoints = Number(promo.DiemYeuCau || 0);
            if (!redeemPoints) {
              const pCode = String(promoCode || "").toUpperCase();
              if (pCode === "BAC50K") redeemPoints = 100;
              else if (pCode === "VANG100K") redeemPoints = 500;
              else if (pCode === "KC200K") redeemPoints = 1000;
            }
          }
          if (redeemPoints > 0) {
            const custDoc = await getDatabase().collection("KhachHang").findOne({ _id: customerId }, { session });
            const currentPoints = Number(custDoc?.DiemTichLuy || 0);
            if (currentPoints < redeemPoints) {
              throw fail(`Khách hàng không đủ điểm tích lũy để đổi voucher (cần ${redeemPoints} điểm, hiện có ${currentPoints} điểm)`, 400);
            }
            await getDatabase().collection("KhachHang").updateOne(
              { _id: customerId },
              { $inc: { DiemTichLuy: -redeemPoints } },
              { session }
            );
          }
        }

        // Award points: 1 point per 10,000 VND
        const earnedPoints = Math.floor(total / 10000);
        if (earnedPoints > 0) {
          await getDatabase().collection("KhachHang").updateOne(
            { _id: customerId },
            { $inc: { DiemTichLuy: earnedPoints } },
            { session }
          );
        }
      }
      return { order: serialize({ _id: orderResult.insertedId, ...order }), invoice: serialize({ _id: invoiceResult.insertedId, ...invoice }) };
    });
    res.status(201).json({ data: created, message: "Đã lập đơn hàng và hóa đơn" });
  } catch (error) { next(error); }
});

router.post("/payments", requirePermission("payments", "tao"), async (req, res, next) => {
  try {
    const rawInv = req.body.invoiceId || req.body.MaHD;
    const invId = id(rawInv);
    const amount = Number(req.body.amount || req.body.SoTien);
    if (!Number.isFinite(amount) || amount <= 0) throw fail("Số tiền thanh toán không hợp lệ");
    const payment = await withTransaction(async (session) => {
      const invoice = await getDatabase().collection("HoaDon").findOne(
        invId ? { _id: invId } : { MaHD: String(rawInv) },
        { session }
      );
      if (!invoice) throw fail("Không tìm thấy hóa đơn", 404);
      const invoiceId = invoice._id;
      const currentPaid = Number(invoice.SoTienDaTra || 0);
      const remaining = Math.max(0, Number(invoice.TongTien || 0) - currentPaid);
      if (amount > remaining) throw fail(`Số tiền thanh toán vượt số còn nợ (${remaining})`, 409);
      const totalPaid = currentPaid + amount;
      const phuongThuc = req.body.method || req.body.PhuongThuc || "Tiền mặt";
      const paymentDocument = {
        MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"),
        MaHD: invoiceId,
        MaHDCode: invoice.MaHD,
        TenKH: invoice.TenKH || "Khách hàng",
        PhuongThuc: phuongThuc,
        SoTien: amount,
        NgayThanhToan: today(),
        TrangThai: "Đã thanh toán",
        createdAt: new Date()
      };
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

      // UC17: Nếu thanh toán tiền mặt, tự động lập Phiếu thu
      if (phuongThuc === "Tiền mặt" && amount > 0) {
        const receiptDoc = {
          MaPT: await nextBusinessCode(getDatabase().collection("PhieuThu"), "PhieuThu"),
          MaHD: invoiceId,
          MaHDCode: invoice.MaHD,
          MaKH: invoice.MaKH || null,
          TenKH: invoice.TenKH || "Khách hàng",
          NguoiNop: invoice.TenKH || "Khách hàng",
          LyDo: `Thu tiền thanh toán hóa đơn ${invoice.MaHD}`,
          SoTien: amount,
          PhuongThuc: "Tiền mặt",
          NgayThu: today(),
          NguoiLap: req.user?.fullName || req.user?.username || "Kế toán",
          MaNV: req.user.id,
          TrangThai: "Đã thu",
          createdAt: new Date(),
        };
        await getDatabase().collection("PhieuThu").insertOne(receiptDoc, { session });
      }

      return serialize({ _id: result.insertedId, ...paymentDocument });
    });
    res.status(201).json({ data: payment, message: "Đã ghi nhận thanh toán" });
  } catch (error) { next(error); }
});

// ── Thanh toán công nợ (UC18 / UC15) ─────────────────────────────────────────
router.post("/debts/:id/pay", requirePermission("debts", "sua"), async (req, res, next) => {
  try {
    const debtId = id(req.params.id);
    const amount = Number(req.body.amount || req.body.SoTien || req.body.payment);
    if (!Number.isFinite(amount) || amount <= 0) throw fail("Số tiền thanh toán phải lớn hơn 0", 400);

    const phuongThuc = req.body.method || req.body.PhuongThuc || "Tiền mặt";
    const paymentDate = req.body.date || req.body.NgayThanhToan || today();

    const result = await withTransaction(async (session) => {
      const debtCol = getDatabase().collection("CongNo");
      const debt = await debtCol.findOne(
        debtId ? { _id: debtId } : { $or: [{ MaCN: String(req.params.id) }, { id: String(req.params.id) }] },
        { session }
      );
      if (!debt) throw fail("Không tìm thấy bản ghi công nợ", 404);

      const totalDebt = Number(debt.SoTien || 0);
      const currentPaid = Number(debt.SoTienDaTra || 0);
      const currentRemaining = Math.max(0, Number(debt.SoTienConLai ?? (totalDebt - currentPaid)));

      if (amount > currentRemaining) {
        throw fail(`Số tiền thanh toán (${amount.toLocaleString("vi-VN")} ₫) vượt số còn nợ (${currentRemaining.toLocaleString("vi-VN")} ₫)`, 400);
      }

      const newPaid = currentPaid + amount;
      const newRemaining = Math.max(0, totalDebt - newPaid);
      const newStatus = newRemaining === 0 ? "Đã thanh toán" : "Còn nợ";

      // 1. Cập nhật CongNo
      await debtCol.updateOne(
        { _id: debt._id },
        {
          $set: {
            SoTienDaTra: newPaid,
            SoTienConLai: newRemaining,
            TrangThai: newStatus,
            updatedAt: new Date(),
          },
        },
        { session }
      );

      const isSupplier = debt.LoaiCongNo === "Nhà cung cấp" || (!debt.MaKH && (!!debt.MaNCC || debt.type === "suppliers"));
      let partyName = "";
      let supplierDoc = null;
      let customerDoc = null;

      if (isSupplier) {
        supplierDoc = await getDatabase().collection("NhaCungCap").findOne(
          { $or: [{ _id: id(debt.MaNCC) }, { MaNCC: String(debt.MaNCC) }] },
          { session }
        );
        partyName = supplierDoc?.TenNCC || debt.partnerName || debt.TenNCC || "Nhà cung cấp";

        // Cập nhật PhieuNhap nếu có
        if (debt.MaPN) {
          const pnStatus = newRemaining === 0 ? "Đã thanh toán" : "Thanh toán một phần";
          await getDatabase().collection("PhieuNhap").updateOne(
            { $or: [{ _id: id(debt.MaPN) }, { MaPN: String(debt.MaPN) }] },
            {
              $inc: { SoTienDaTra: amount },
              $set: {
                SoTienConLai: newRemaining,
                TrangThai: pnStatus,
                updatedAt: new Date(),
              },
            },
            { session }
          );
        }

        // Tạo bản ghi ThanhToan (UC19)
        const paymentDoc = {
          MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"),
          MaCN: debt._id,
          MaCNCode: debt.MaCN,
          MaPN: debt.MaPN || null,
          MaNCC: debt.MaNCC || null,
          TenDoiTuong: partyName,
          TenKH: partyName,
          TenNCC: partyName,
          LoaiThanhToan: "Chi trả NCC",
          PhuongThuc: phuongThuc,
          SoTien: amount,
          NgayThanhToan: paymentDate,
          TrangThai: "Đã thanh toán",
          createdAt: new Date(),
        };
        await getDatabase().collection("ThanhToan").insertOne(paymentDoc, { session });

        // Tạo PhieuChi tiền mặt (UC18)
        if (phuongThuc === "Tiền mặt") {
          const cashPaymentDoc = {
            MaPC: await nextBusinessCode(getDatabase().collection("PhieuChi"), "PhieuChi"),
            NgayLap: paymentDate,
            NgayChi: paymentDate,
            NguoiNhanTien: partyName,
            NguoiNhan: partyName,
            DiaChi: supplierDoc?.DiaChi || debt.DiaChi || "",
            LyDo: req.body.note || req.body.LyDo || `Thanh toán công nợ NCC theo chứng từ ${debt.MaPN || debt.MaCN}`,
            SoTien: amount,
            PhuongThuc: "Tiền mặt",
            MaCN: debt._id,
            MaNCC: debt.MaNCC || null,
            TrangThai: "Đã chi",
            NguoiLap: req.user?.fullName || req.user?.username || "Kế toán",
            MaNV: req.user.id,
            createdAt: new Date(),
          };
          await getDatabase().collection("PhieuChi").insertOne(cashPaymentDoc, { session });
        }
      } else {
        // Khách hàng
        customerDoc = await getDatabase().collection("KhachHang").findOne(
          { $or: [{ _id: id(debt.MaKH) }, { MaKH: String(debt.MaKH) }] },
          { session }
        );
        partyName = customerDoc?.HoTen || debt.partnerName || debt.TenKH || "Khách hàng";

        // Cập nhật HoaDon nếu có
        if (debt.MaHD) {
          const invoiceStatus = newRemaining === 0 ? "Đã thanh toán" : "Thanh toán một phần";
          await getDatabase().collection("HoaDon").updateOne(
            { $or: [{ _id: id(debt.MaHD) }, { MaHD: String(debt.MaHD) }] },
            {
              $set: {
                SoTienDaTra: newPaid,
                SoTienConLai: newRemaining,
                TrangThai: invoiceStatus,
                updatedAt: new Date(),
              },
            },
            { session }
          );
        }

        // Tạo bản ghi ThanhToan (UC19)
        const paymentDoc = {
          MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"),
          MaCN: debt._id,
          MaCNCode: debt.MaCN,
          MaHD: debt.MaHD || null,
          MaKH: debt.MaKH || null,
          TenDoiTuong: partyName,
          TenKH: partyName,
          LoaiThanhToan: "Thu nợ KH",
          PhuongThuc: phuongThuc,
          SoTien: amount,
          NgayThanhToan: paymentDate,
          TrangThai: "Đã thanh toán",
          createdAt: new Date(),
        };
        await getDatabase().collection("ThanhToan").insertOne(paymentDoc, { session });

        // Tạo PhieuThu tiền mặt (UC17)
        if (phuongThuc === "Tiền mặt") {
          const cashReceiptDoc = {
            MaPT: await nextBusinessCode(getDatabase().collection("PhieuThu"), "PhieuThu"),
            NgayLap: paymentDate,
            NgayThu: paymentDate,
            NguoiNopTien: partyName,
            NguoiNop: partyName,
            DiaChi: customerDoc?.DiaChi || debt.DiaChi || "",
            LyDo: req.body.note || req.body.LyDo || `Thu nợ khách hàng theo chứng từ ${debt.MaHD || debt.MaCN}`,
            SoTien: amount,
            PhuongThuc: "Tiền mặt",
            MaCN: debt._id,
            MaHD: debt.MaHD || null,
            TrangThai: "Đã thu",
            NguoiLap: req.user?.fullName || req.user?.username || "Kế toán",
            MaNV: req.user.id,
            createdAt: new Date(),
          };
          await getDatabase().collection("PhieuThu").insertOne(cashReceiptDoc, { session });
        }
      }

      const updatedDebt = await debtCol.findOne({ _id: debt._id }, { session });
      return serialize(updatedDebt);
    });

    res.json({
      data: result,
      message: `Đã ghi nhận thanh toán ${amount.toLocaleString("vi-VN")} ₫ thành công`,
    });
  } catch (error) {
    next(error);
  }
});

// ── Lấy danh sách phiếu nhập đã liên kết với đơn đặt hàng NCC ──────────────
router.get("/purchase-orders/:id/receipts", requirePermission("goods-receipts", "xem"), async (req, res, next) => {
  try {
    const poId = id(req.params.id);
    if (!poId) return res.status(400).json({ message: "ID đơn đặt hàng không hợp lệ" });
    const po = await getDatabase().collection("DonDatHang").findOne({ _id: poId });
    if (!po) return res.status(404).json({ message: "Không tìm thấy đơn đặt hàng" });

    const receipts = await getDatabase().collection("PhieuNhap")
      .find({ MaDDH: poId })
      .sort({ createdAt: -1 })
      .toArray();

    // Lấy tổng đã nhập từng sản phẩm
    let poItems = po.items || [];
    if (!poItems.length) {
      poItems = await getDatabase().collection("CT_DonDatHang").find({ MaDDH: poId }).toArray();
    }
    const summaryItems = poItems.map((item) => ({
      productId: String(item.productId || item.MaSP || ""),
      quantityOrdered: Number(item.quantity || item.SoLuong || 0),
      quantityReceived: Number(item.quantityReceived || 0),
      remaining: Number(item.quantity || item.SoLuong || 0) - Number(item.quantityReceived || 0),
      price: Number(item.price || item.DonGia || 0),
    }));

    res.json({
      data: {
        purchaseOrder: serialize(po),
        receipts: receipts.map(serialize),
        summaryItems,
        totalOrdered: summaryItems.reduce((s, i) => s + i.quantityOrdered, 0),
        totalReceived: summaryItems.reduce((s, i) => s + i.quantityReceived, 0),
        totalRemaining: summaryItems.reduce((s, i) => s + i.remaining, 0),
      },
      message: "Danh sách phiếu nhập liên kết",
    });
  } catch (error) { next(error); }
});

// ── Nhận hàng từ đơn đặt hàng NCC (tạo phiếu nhập liên kết) ────────────────
router.post("/purchase-orders/:id/receive", requirePermission("goods-receipts", "tao"), async (req, res, next) => {
  try {
    const poId = id(req.params.id);
    if (!poId) return res.status(400).json({ message: "ID đơn đặt hàng không hợp lệ" });

    const po = await getDatabase().collection("DonDatHang").findOne({ _id: poId });
    if (!po) return res.status(404).json({ message: "Không tìm thấy đơn đặt hàng" });
    if (po.TrangThai === "Đã hủy") throw fail("Đơn đặt hàng đã bị hủy, không thể nhập hàng", 400);
    if (po.TrangThai === "Hoàn thành") throw fail("Đơn đặt hàng đã nhập đủ hàng (Hoàn thành), không thể nhập thêm", 400);

    const supplier = await getDatabase().collection("NhaCungCap").findOne({ _id: po.MaNCC });
    if (!supplier) throw fail("Nhà cung cấp của đơn đặt hàng không tồn tại", 404);
    if (supplier.TrangThai === "Ngưng hoạt động" || supplier.status === "inactive") {
      throw fail("Nhà cung cấp đã ngưng hoạt động", 400);
    }

    // Lấy items từ PO
    let poItems = po.items || [];
    if (!poItems.length) {
      poItems = await getDatabase().collection("CT_DonDatHang").find({ MaDDH: poId }).toArray();
    }
    if (!poItems.length) throw fail("Đơn đặt hàng không có sản phẩm", 400);

    // Build danh sách sản phẩm sẽ nhập từ request body
    const receiveLines = req.body.items || [];
    if (!Array.isArray(receiveLines) || !receiveLines.length) {
      throw fail("Vui lòng nhập số lượng thực nhận cho ít nhất một sản phẩm", 400);
    }

    const paidAmount = Math.max(0, Number(req.body.SoTienDaTra || req.body.paidAmount || 0));
    const ngayNhap = req.body.NgayNhap || today();
    const nguoiLap = req.user?.fullName || req.user?.username || "Thủ kho";

    const matchPoItem = (product) => {
      const pidStr = String(product._id);
      const codeStr = String(product.MaSP || "");
      return poItems.find((item) => {
        const itemPid = String(item.productId || item.MaSP || item.id || "");
        const itemCode = String(item.MaSPCode || item.MaSP || "");
        return itemPid === pidStr || itemPid === codeStr || itemCode === codeStr || itemCode === pidStr;
      });
    };

    const lines = [];
    for (const rl of receiveLines) {
      const rawPid = rl.productId || rl.MaSP;
      const product = await getDatabase().collection("SanPham").findOne(
        id(rawPid) ? { _id: id(rawPid) } : { MaSP: String(rawPid) }
      );
      if (!product) throw fail(`Sản phẩm ${rawPid} không tồn tại`, 404);
      if (product.TrangThai === "Ngừng bán" || product.status === "inactive") {
        throw fail(`Sản phẩm "${product.TenSP}" đã ngừng bán`, 400);
      }
      const poItem = matchPoItem(product);
      if (!poItem) throw fail(`Sản phẩm "${product.TenSP}" không có trong đơn đặt hàng`, 400);
      const ordered = Number(poItem.quantity || poItem.SoLuong || 0);
      const received = Number(poItem.quantityReceived || 0);
      const remaining = Math.max(0, ordered - received);
      const qty = Number(rl.quantity || rl.SoLuong || 0);
      if (!Number.isInteger(qty) || qty <= 0) throw fail(`Số lượng nhận của "${product.TenSP}" phải là số nguyên dương`, 400);
      if (qty > remaining) {
        throw fail(`"${product.TenSP}": số lượng nhận (${qty}) vượt số còn thiếu (${remaining})`, 400);
      }
      const linePrice = Number(rl.price || rl.DonGia || poItem.price || poItem.DonGia || product.GiaNhap || 0);
      lines.push({ product, quantity: qty, price: linePrice });
    }

    const total = lines.reduce((s, l) => s + l.quantity * l.price, 0);
    if (paidAmount > total) throw fail("Số tiền đã trả không được vượt tổng tiền phiếu nhập", 400);
    const remaining = Math.max(0, total - paidAmount);

    const created = await withTransaction(async (session) => {
      await adjustStock(lines, 1, false, session);

      const document = {
        MaPN: await nextBusinessCode(getDatabase().collection("PhieuNhap"), "PhieuNhap"),
        MaDDH: poId,
        MaNCC: supplier._id,
        MaNV: req.user.id,
        NguoiLap: nguoiLap,
        NgayNhap: ngayNhap,
        TrangThai: "Đã lưu",
        TongTien: total,
        SoTienDaTra: paidAmount,
        SoTienConLai: remaining,
        SoLuong: lines.reduce((s, l) => s + l.quantity, 0),
        LyDoNhap: req.body.LyDoNhap || `Nhập hàng theo đơn ${po.MaDDH || String(poId)}`,
        NguoiLienQuan: supplier.TenNCC || "",
        DiaChi: supplier.DiaChi || "",
        Kho: req.body.Kho || "Kho chính",
        GhiChu: req.body.GhiChu || req.body.note || "",
        TkNo: "156",
        TkCo: "331",
        SoChungTuGoc: po.MaDDH || String(poId),
        details: lines.map((l) => ({
          MaSP: l.product._id,
          MaSPCode: l.product.MaSP,
          TenSP: l.product.TenSP,
          HinhAnh: l.product.HinhAnh || "",
          LoaiHang: l.product.LoaiHang || "",
          DonViTinh: l.product.DonViTinh || "Cái",
          SoLuong: l.quantity,
          DonGia: l.price,
          ThanhTien: l.quantity * l.price,
        })),
        createdAt: new Date(),
      };

      const result = await getDatabase().collection("PhieuNhap").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_PhieuNhap", result.insertedId, document.details, session);

      // Tạo công nợ NCC
      const debtStatus = remaining === 0 ? "Đã thanh toán" : "Còn nợ";
      await getDatabase().collection("CongNo").insertOne({
        MaCN: await nextBusinessCode(getDatabase().collection("CongNo"), "CongNo"),
        MaNCC: supplier._id,
        MaDDH: poId,
        MaPN: result.insertedId,
        MaNV: req.user.id,
        LoaiCongNo: "Nhà cung cấp",
        type: "suppliers",
        partnerName: supplier.TenNCC,
        TenNCC: supplier.TenNCC,
        NgayPhatSinh: ngayNhap,
        SoTien: total,
        SoTienDaTra: paidAmount,
        SoTienConLai: remaining,
        TrangThai: debtStatus,
        createdAt: new Date(),
      }, { session });

      // UC19 & UC18: Ghi nhận thanh toán và phiếu chi nếu có trả trước
      if (paidAmount > 0) {
        const phuongThuc = req.body.paymentMethod || req.body.PhuongThuc || "Tiền mặt";
        const paymentDoc = {
          MaTT: await nextBusinessCode(getDatabase().collection("ThanhToan"), "ThanhToan"),
          MaPN: result.insertedId,
          MaPNCode: document.MaPN,
          MaDDH: poId,
          MaNCC: supplier._id,
          TenDoiTuong: supplier.TenNCC,
          TenKH: supplier.TenNCC,
          LoaiThanhToan: "Chi trả NCC",
          PhuongThuc: phuongThuc,
          SoTien: paidAmount,
          NgayThanhToan: ngayNhap,
          TrangThai: "Đã thanh toán",
          createdAt: new Date(),
        };
        await getDatabase().collection("ThanhToan").insertOne(paymentDoc, { session });

        if (phuongThuc === "Tiền mặt") {
          const cashVoucherDoc = {
            MaPC: await nextBusinessCode(getDatabase().collection("PhieuChi"), "PhieuChi"),
            NgayLap: ngayNhap,
            NgayChi: ngayNhap,
            NguoiNhanTien: supplier.TenNCC,
            NguoiNhan: supplier.TenNCC,
            DiaChi: supplier.DiaChi || "",
            LyDo: `Thanh toán tiền hàng phiếu nhập ${document.MaPN}`,
            SoTien: paidAmount,
            PhuongThuc: "Tiền mặt",
            MaPN: result.insertedId,
            MaNCC: supplier._id,
            TrangThai: "Đã chi",
            NguoiLap: nguoiLap,
            MaNV: req.user.id,
            createdAt: new Date(),
          };
          await getDatabase().collection("PhieuChi").insertOne(cashVoucherDoc, { session });
        }
      }

      // Cập nhật quantityReceived trên PO items
      const updatedItems = poItems.map((item) => {
        const matchedLine = lines.find((l) => {
          const pidStr = String(l.product._id);
          const codeStr = String(l.product.MaSP || "");
          const itemPid = String(item.productId || item.MaSP || item.id || "");
          const itemCode = String(item.MaSPCode || item.MaSP || "");
          return itemPid === pidStr || itemPid === codeStr || itemCode === codeStr || itemCode === pidStr;
        });
        const justReceived = matchedLine ? matchedLine.quantity : 0;
        return { ...item, quantityReceived: Number(item.quantityReceived || 0) + justReceived };
      });
      const totalOrdered = updatedItems.reduce((s, i) => s + Number(i.quantity || i.SoLuong || 0), 0);
      const totalReceived = updatedItems.reduce((s, i) => s + Number(i.quantityReceived || 0), 0);
      const newPoStatus = totalReceived >= totalOrdered ? "Hoàn thành" : totalReceived > 0 ? "Nhập một phần" : "Đang chờ nhập";

      await getDatabase().collection("DonDatHang").updateOne(
        { _id: poId },
        { $set: { items: updatedItems, TrangThai: newPoStatus, updatedAt: new Date() } },
        { session }
      );
      if (updatedItems.length) {
        await getDatabase().collection("CT_DonDatHang").deleteMany({ MaDDH: poId }, { session });
        await getDatabase().collection("CT_DonDatHang").insertMany(
          updatedItems.map((item) => ({ ...item, MaDDH: poId })),
          { session }
        );
      }

      return serialize({ _id: result.insertedId, ...document });
    });

    res.status(201).json({ data: created, message: "Đã nhận hàng và cập nhật đơn đặt hàng" });
  } catch (error) { next(error); }
});

router.post("/stocktakes", requirePermission("stocktakes", "tao"), async (req, res, next) => {
  try {
    const rawItems = req.body.items || req.body.details || [];
    if (!Array.isArray(rawItems) || !rawItems.length) {
      throw fail("Phiếu kiểm kê phải có ít nhất một sản phẩm", 400);
    }

    const items = [];
    for (const line of rawItems) {
      const rawProductId = line.productId || line.MaSP || line.id || line._id;
      if (!rawProductId) throw fail("Sản phẩm kiểm kê không hợp lệ", 400);
      const product = await getDatabase().collection("SanPham").findOne({
        $or: [
          ...(id(rawProductId) ? [{ _id: id(rawProductId) }] : []),
          { MaSP: String(rawProductId) },
          { _id: String(rawProductId) },
        ],
      });
      if (!product) throw fail(`Sản phẩm kiểm kê không tồn tại: ${rawProductId}`, 404);

      const stockDoc = await getDatabase().collection("TonKho").findOne({
        $or: [{ MaSP: product._id }, { MaSP: String(product.MaSP) }],
      });
      const sysStock = Number(stockDoc?.SoLuongTon ?? stockDoc?.SoLuong ?? product.stock ?? 0);
      const actualInput = line.actual ?? line.SoLuongThucTe;
      if (actualInput === undefined || actualInput === null || actualInput === "") {
        throw fail(`Vui lòng nhập số lượng thực tế cho sản phẩm "${product.TenSP}"`, 400);
      }
      const actual = Number(actualInput);
      if (!Number.isInteger(actual) || actual < 0) {
        throw fail(`Số lượng thực tế của "${product.TenSP}" phải là số nguyên không âm (≥ 0)`, 400);
      }
      const diff = actual - sysStock;
      items.push({
        MaSP: product._id,
        MaSPCode: product.MaSP,
        TenSP: product.TenSP,
        DonViTinh: product.DonViTinh || "Cái",
        LoaiHang: product.LoaiHang || "",
        GiaNhap: Number(product.GiaNhap || 0),
        GiaBan: Number(product.GiaBan || 0),
        SoLuongHeThong: sysStock,
        SoLuongThucTe: actual,
        ChenhLech: diff,
        LyDo: line.LyDo || line.reason || (diff === 0 ? "Khớp tồn kho" : diff < 0 ? "Hao hụt / thất thoát" : "Thừa kiểm kê"),
      });
    }

    const hasDiscrepancy = items.some((it) => it.ChenhLech !== 0);
    const initialStatus = hasDiscrepancy ? "Chờ điều chỉnh" : "Khớp hoàn toàn";

    const created = await withTransaction(async (session) => {
      const document = {
        MaKK: await nextBusinessCode(getDatabase().collection("KiemKe"), "KiemKe"),
        MaNV: req.user.id,
        NguoiLap: req.user?.fullName || req.user?.username || "Thủ kho",
        NgayKiemKe: req.body.NgayKiemKe || today(),
        GhiChu: req.body.note || req.body.GhiChu || "Kiểm kê kho định kỳ",
        TrangThai: initialStatus,
        TongMatHang: items.length,
        SoMucLech: items.filter((it) => it.ChenhLech !== 0).length,
        TongChenhLech: items.reduce((sum, it) => sum + it.ChenhLech, 0),
        details: items,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await getDatabase().collection("KiemKe").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_KiemKe", result.insertedId, document.details, session);
      return { ...serialize({ _id: result.insertedId, ...document }), _id: result.insertedId.toString() };
    });

    res.status(201).json({
      data: created,
      message: hasDiscrepancy
        ? `Đã lưu phiếu kiểm kê (${created.MaKK}). Có ${created.SoMucLech} mặt hàng bị chênh lệch cần xác nhận điều chỉnh.`
        : `Đã lưu phiếu kiểm kê (${created.MaKK}). Toàn bộ số lượng khớp hoàn toàn với hệ thống.`,
    });
  } catch (error) {
    next(error);
  }
});

// UC22: Xác nhận điều chỉnh tồn kho theo phiếu kiểm kê
router.post("/stocktakes/:id/adjust", requirePermission("stocktakes", "sua"), async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const stocktake = await getDatabase().collection("KiemKe").findOne({
      $or: [
        ...(id(rawId) ? [{ _id: id(rawId) }] : []),
        { MaKK: String(rawId) },
        { id: String(rawId) },
      ],
    });
    if (!stocktake) throw fail("Không tìm thấy phiếu kiểm kê", 404);

    if (stocktake.TrangThai === "Đã điều chỉnh") {
      throw fail("Phiếu kiểm kê này đã được xác nhận điều chỉnh tồn kho trước đó", 400);
    }

    let items = stocktake.details || [];
    if (!items.length) {
      items = await getDatabase().collection("CT_KiemKe").find({ MaKK: stocktake._id }).toArray();
    }
    if (!items.length) {
      throw fail("Phiếu kiểm kê không có chi tiết sản phẩm để điều chỉnh", 400);
    }

    const reason = req.body.reason || req.body.LyDo || `Điều chỉnh tồn kho theo phiếu kiểm kê ${stocktake.MaKK}`;
    const nguoiThucHien = req.user?.fullName || req.user?.username || "Thủ kho";

    const adjustedDoc = await withTransaction(async (session) => {
      const adjustmentLines = [];

      for (const item of items) {
        const prodId = item.MaSP;
        const actual = Number(item.SoLuongThucTe);
        if (!Number.isInteger(actual) || actual < 0) {
          throw fail(`Số lượng thực tế của sản phẩm không hợp lệ: ${actual}`, 400);
        }

        // Lấy tồn trước khi điều chỉnh
        const currentStockDoc = await getDatabase().collection("TonKho").findOne({ MaSP: prodId }, { session });
        const beforeStock = Number(currentStockDoc?.SoLuongTon ?? currentStockDoc?.SoLuong ?? 0);
        const diff = actual - beforeStock;

        // Cập nhật TonKho (đồng bộ cả SoLuongTon và SoLuong)
        await getDatabase().collection("TonKho").updateOne(
          { MaSP: prodId },
          {
            $set: {
              SoLuongTon: actual,
              SoLuong: actual,
              NgayCapNhat: today(),
              updatedAt: new Date(),
            },
          },
          { upsert: true, session }
        );

        // Cập nhật SanPham.stock
        await getDatabase().collection("SanPham").updateOne(
          { _id: prodId },
          { $set: { stock: actual, updatedAt: new Date() } },
          { session }
        );

        adjustmentLines.push({
          MaSP: prodId,
          MaSPCode: item.MaSPCode || "",
          TenSP: item.TenSP || "",
          DonViTinh: item.DonViTinh || "Cái",
          TonTruoc: beforeStock,
          TonSau: actual,
          ChenhLech: diff,
          LyDo: item.LyDo || reason,
        });
      }

      // Cập nhật trạng thái phiếu kiểm kê
      await getDatabase().collection("KiemKe").updateOne(
        { _id: stocktake._id },
        {
          $set: {
            TrangThai: "Đã điều chỉnh",
            NgayDieuChinh: today(),
            NguoiDieuChinh: nguoiThucHien,
            LyDoDieuChinh: reason,
            updatedAt: new Date(),
          },
        },
        { session }
      );

      // Lưu nhật ký lịch sử điều chỉnh tồn kho vào collection DieuChinhKho
      const historyDoc = {
        MaDC: await nextBusinessCode(getDatabase().collection("DieuChinhKho"), "DieuChinhKho"),
        MaKK: stocktake.MaKK,
        stocktakeId: stocktake._id,
        NgayDieuChinh: today(),
        NguoiThucHien: nguoiThucHien,
        MaNV: req.user.id,
        LyDo: reason,
        SoMatHangDieuChinh: adjustmentLines.length,
        SoMucChenhLech: adjustmentLines.filter((l) => l.ChenhLech !== 0).length,
        details: adjustmentLines,
        createdAt: new Date(),
      };
      await getDatabase().collection("DieuChinhKho").insertOne(historyDoc, { session });

      return historyDoc;
    });

    res.json({
      data: adjustedDoc,
      message: `Đã xác nhận điều chỉnh tồn kho thành công theo phiếu kiểm kê ${stocktake.MaKK}`,
    });
  } catch (error) {
    next(error);
  }
});

// UC22: Điều chỉnh tồn kho trực tiếp theo danh sách mặt hàng
router.post("/inventory/adjust", requirePermission("inventory", "sua"), async (req, res, next) => {
  try {
    const rawItems = req.body.items || [];
    if (!Array.isArray(rawItems) || !rawItems.length) {
      throw fail("Danh sách sản phẩm điều chỉnh không được để trống", 400);
    }

    const reason = req.body.reason || req.body.LyDo || "Điều chỉnh tồn kho";
    const nguoiThucHien = req.user?.fullName || req.user?.username || "Thủ kho";

    const result = await withTransaction(async (session) => {
      const adjustmentLines = [];
      for (const line of rawItems) {
        const rawProductId = line.productId || line.MaSP || line.id || line._id;
        if (!rawProductId) throw fail("Sản phẩm không hợp lệ", 400);
        const product = await getDatabase().collection("SanPham").findOne({
          $or: [
            ...(id(rawProductId) ? [{ _id: id(rawProductId) }] : []),
            { MaSP: String(rawProductId) },
            { _id: String(rawProductId) },
          ],
        }, { session });
        if (!product) throw fail(`Không tìm thấy sản phẩm ${rawProductId}`, 404);

        const currentStockDoc = await getDatabase().collection("TonKho").findOne({ MaSP: product._id }, { session });
        const beforeStock = Number(currentStockDoc?.SoLuongTon ?? currentStockDoc?.SoLuong ?? product.stock ?? 0);

        const targetQty = Number(line.newStock ?? line.SoLuongThucTe ?? line.actual);
        if (!Number.isInteger(targetQty) || targetQty < 0) {
          throw fail(`Số lượng tồn mới của "${product.TenSP}" phải là số nguyên không âm (≥ 0)`, 400);
        }
        const diff = targetQty - beforeStock;

        await getDatabase().collection("TonKho").updateOne(
          { MaSP: product._id },
          {
            $set: {
              SoLuongTon: targetQty,
              SoLuong: targetQty,
              NgayCapNhat: today(),
              updatedAt: new Date(),
            },
          },
          { upsert: true, session }
        );

        await getDatabase().collection("SanPham").updateOne(
          { _id: product._id },
          { $set: { stock: targetQty, updatedAt: new Date() } },
          { session }
        );

        adjustmentLines.push({
          MaSP: product._id,
          MaSPCode: product.MaSP,
          TenSP: product.TenSP,
          DonViTinh: product.DonViTinh || "Cái",
          TonTruoc: beforeStock,
          TonSau: targetQty,
          ChenhLech: diff,
          LyDo: line.reason || line.LyDo || reason,
        });
      }

      const historyDoc = {
        MaDC: await nextBusinessCode(getDatabase().collection("DieuChinhKho"), "DieuChinhKho"),
        MaKK: req.body.MaKK || null,
        stocktakeId: req.body.stocktakeId ? id(req.body.stocktakeId) : null,
        NgayDieuChinh: today(),
        NguoiThucHien: nguoiThucHien,
        MaNV: req.user.id,
        LyDo: reason,
        SoMatHangDieuChinh: adjustmentLines.length,
        SoMucChenhLech: adjustmentLines.filter((l) => l.ChenhLech !== 0).length,
        details: adjustmentLines,
        createdAt: new Date(),
      };
      await getDatabase().collection("DieuChinhKho").insertOne(historyDoc, { session });
      return historyDoc;
    });

    res.status(200).json({
      data: result,
      message: `Đã cập nhật tồn kho thành công cho ${result.details.length} sản phẩm`,
    });
  } catch (error) {
    next(error);
  }
});

// Lịch sử điều chỉnh tồn kho
router.get("/inventory/adjustments", requirePermission("inventory", "xem"), async (_req, res, next) => {
  try {
    const list = await getDatabase()
      .collection("DieuChinhKho")
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    res.json({
      data: list.map((item) => ({
        id: String(item._id),
        ...item,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stocktakes/adjustments", requirePermission("stocktakes", "xem"), async (_req, res, next) => {
  try {
    const list = await getDatabase()
      .collection("DieuChinhKho")
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    res.json({
      data: list.map((item) => ({
        id: String(item._id),
        ...item,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/returns", requirePermission("returns", "tao"), async (req, res, next) => {
  try {
    const lines = await productsByLines(req.body.items || [req.body]);
    const orderInput = req.body.orderId || req.body.MaDH || req.body.order?.id || req.body.order?.MaDH;

    let order = null;
    let orderId = null;
    let invoice = null;

    if (orderInput) {
      // Có liên kết đơn hàng → validate sản phẩm thuộc đơn
      order = await getDatabase().collection("DonHang").findOne({
        $or: [
          ...(id(orderInput) ? [{ _id: id(orderInput) }] : []),
          { MaDH: orderInput },
          { id: orderInput },
        ],
      });
      if (!order) throw fail("Đơn hàng liên kết không tồn tại", 404);
      orderId = order._id;
      invoice = await getDatabase().collection("HoaDon").findOne({
        $or: [
          { MaDH: order.MaDH || String(order._id) },
          { MaDH: orderInput },
          { _id: orderId },
        ],
      });
      const orderLines = new Map((order.details || []).map((line) => [String(line.MaSP || line.productId || line.id), Number(line.SoLuong || line.quantity || 0)]));
      for (const line of lines) {
        const productKey = String(line.product._id || line.product.MaSP || line.product.id || "");
        if (!orderLines.has(productKey) || line.quantity > orderLines.get(productKey)) {
          throw fail(`${line.product.TenSP} không thuộc đơn hàng hoặc vượt số lượng đã bán`);
        }
      }
    }
    // Không có đơn hàng → trả hàng tự do (nhập trực tiếp)

    const customerInput = req.body.customerId || req.body.MaKH || order?.MaKH || null;
    const customerId = customerInput ? (id(customerInput) || customerInput) : null;
    if (customerInput) {
      const customer = await getDatabase().collection("KhachHang").findOne({
        $or: [
          ...(id(customerInput) ? [{ _id: id(customerInput) }] : []),
          { MaKH: customerInput },
          { id: customerInput },
        ],
      });
      if (!customer) throw fail("Khách hàng không tồn tại", 404);
    }

    const document = {
      MaPTH: await nextBusinessCode(getDatabase().collection("PhieuTraHang"), "PhieuTraHang"),
      MaDH: orderId || null,
      MaHD: invoice?._id || null,
      MaKH: customerId || null,
      MaNV: req.user.id,
      NguoiLap: req.user?.fullName || req.user?.username || "Nhân viên",
      NgayTra: req.body.NgayTra || today(),
      LyDo: req.body.reason || req.body.LyDo || "",
      TrangThai: "Đã xử lý",
      SoLuong: lines.reduce((sum, line) => sum + line.quantity, 0),
      details: lines.map((line) => ({
        MaSP: line.product._id,
        TenSP: line.product.TenSP,
        SoLuong: line.quantity,
        DonGia: line.price,
        ThanhTien: line.quantity * line.price,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await withTransaction(async (session) => {
      await adjustStock(lines, 1, false, session);
      const result = await getDatabase().collection("PhieuTraHang").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_PhieuTraHang", result.insertedId, document.details, session);
      return serializeReturn({ _id: result.insertedId, ...document, details: document.details.map((line) => ({ ...line, productCode: line.MaSP })) });
    });
    res.status(201).json({ data: created, message: "Đã ghi nhận trả hàng và cộng lại tồn kho" });
  } catch (error) { next(error); }
});

router.get("/inventory", requirePermission("inventory", "xem"), async (_req, res, next) => {
  try {
    const products = await getDatabase().collection("SanPham").find().sort({ TenSP: 1 }).toArray();
    const stocks = await getDatabase().collection("TonKho").find().toArray();
    const categories = await getDatabase().collection("LoaiHang").find().toArray();
    const catMap = new Map(categories.map((c) => [c._id.toString(), c.TenLoai]));
    const byProduct = new Map();
    for (const stock of stocks) {
      if (stock.MaSP) {
        byProduct.set(stock.MaSP.toString(), stock);
        byProduct.set(String(stock.MaSP), stock);
      }
    }

    res.json({
      data: products.map((product) => {
        const catName = product.LoaiHang || (product.MaLoai ? catMap.get(product.MaLoai.toString()) : "") || "";
        const stockDoc = byProduct.get(product._id.toString()) || byProduct.get(String(product.MaSP));
        const currentStock = Number(stockDoc?.SoLuongTon ?? stockDoc?.SoLuong ?? product.stock ?? 0);
        return {
          ...serialize(product),
          _id: product._id.toString(),
          LoaiHang: catName,
          stock: currentStock,
          SoLuongTon: currentStock,
          GiaNhap: Number(product.GiaNhap || 0),
          GiaBan: Number(product.GiaBan || 0),
          SoLuongToiThieu: Number(product.SoLuongToiThieu || 10),
          stockUpdatedAt: stockDoc?.updatedAt || stockDoc?.NgayCapNhat || null,
        };
      }),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/customers/:id/redeem-voucher", requirePermission("customers", "sua"), async (req, res, next) => {
  try {
    const custId = id(req.params.id);
    if (!custId) throw fail("ID khách hàng không hợp lệ", 400);
    const voucherCode = String(req.body.voucherCode || req.body.code || "").trim().toUpperCase();
    let points = Number(req.body.points || 0);
    if (!points) {
      if (voucherCode === "BAC50K") points = 100;
      else if (voucherCode === "VANG100K") points = 500;
      else if (voucherCode === "KC200K") points = 1000;
      else {
        const promo = await getDatabase().collection("KhuyenMai").findOne({ MaKM: voucherCode });
        points = Number(promo?.DiemYeuCau || 0);
      }
    }
    if (points <= 0) throw fail("Số điểm cần đổi không hợp lệ", 400);

    const cust = await getDatabase().collection("KhachHang").findOne({ _id: custId });
    if (!cust) throw fail("Không tìm thấy khách hàng", 404);
    if (Number(cust.DiemTichLuy || 0) < points) {
      throw fail(`Khách hàng không đủ điểm tích lũy (cần ${points} điểm, hiện có ${cust.DiemTichLuy || 0} điểm)`, 400);
    }

    const discountAmount = voucherCode === "BAC50K" ? 50000 : voucherCode === "VANG100K" ? 100000 : voucherCode === "KC200K" ? 200000 : 50000;
    const newVoucher = {
      id: "VCH-" + Date.now().toString(36).toUpperCase(),
      code: voucherCode,
      name: voucherCode === "BAC50K" ? "Voucher giảm 50.000đ" : voucherCode === "VANG100K" ? "Voucher giảm 100.000đ" : "Voucher VIP giảm 200.000đ",
      discountAmount,
      points,
      redeemedAt: today(),
      status: "Chưa sử dụng",
    };

    await getDatabase().collection("KhachHang").updateOne(
      { _id: custId },
      {
        $inc: { DiemTichLuy: -points },
        $push: { VouchersDaDoi: newVoucher },
        $set: { updatedAt: new Date() },
      }
    );
    const updated = await getDatabase().collection("KhachHang").findOne({ _id: custId });
    res.json({
      data: serialize(updated),
      message: `Đã đổi thành công voucher ${voucherCode}! Đã trừ ${points} điểm tích lũy.`,
      voucher: newVoucher,
      voucherCode,
      pointsDeducted: points,
      remainingPoints: updated.DiemTichLuy
    });
  } catch (error) { next(error); }
});

export default router;

