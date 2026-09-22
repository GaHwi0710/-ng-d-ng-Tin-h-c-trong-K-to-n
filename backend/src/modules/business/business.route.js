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
      const poItemMap = new Map();
      const poRawItems = purchaseOrder.items || [];
      // Đọc CT_DonDatHang nếu items không lưu inline
      let poItems = poRawItems;
      if (!poItems.length) {
        poItems = await getDatabase().collection("CT_DonDatHang").find({ MaDDH: purchaseOrderId }).toArray();
      }
      for (const poItem of poItems) {
        const pid = String(poItem.productId || poItem.MaSP || "");
        const ordered = Number(poItem.quantity || poItem.SoLuong || 0);
        const received = Number(poItem.quantityReceived || 0);
        poItemMap.set(pid, { ordered, received, remaining: ordered - received });
      }

      for (const line of lines) {
        const pid = String(line.product._id);
        const info = poItemMap.get(pid);
        if (!info) throw fail(`Sản phẩm "${line.product.TenSP}" không có trong đơn đặt hàng`, 400);
        if (line.quantity > info.remaining) {
          throw fail(
            `Sản phẩm "${line.product.TenSP}": số lượng nhập (${line.quantity}) vượt số còn thiếu (${info.remaining}) trong đơn đặt hàng`,
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

    const created = await withTransaction(async (session) => {
      await adjustStock(lines, 1, false, session);
      const document = {
        MaPN: await nextBusinessCode(getDatabase().collection("PhieuNhap"), "PhieuNhap"),
        MaDDH: purchaseOrderId || null,
        MaNCC: supplier._id,
        MaNV: req.user.id,
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
        SoChungTuGoc: req.body.SoChungTuGoc || "",
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
        NgayPhatSinh: document.NgayNhap,
        SoTien: total,
        SoTienDaTra: paidAmount,
        SoTienConLai: remaining,
        TrangThai: debtStatus,
        createdAt: new Date(),
      }, { session });

      // Cập nhật số lượng đã nhận trên từng item của PO + tính lại trạng thái PO
      if (purchaseOrderId) {
        // Lấy lại PO items để cập nhật quantityReceived
        const poDoc = await getDatabase().collection("DonDatHang").findOne({ _id: purchaseOrderId }, { session });
        let poItems = poDoc?.items || [];
        if (!poItems.length) {
          poItems = await getDatabase().collection("CT_DonDatHang").find({ MaDDH: purchaseOrderId }, { session }).toArray();
        }

        // Tạo map: productId → số lượng vừa nhập trong phiếu này
        const receivedNowMap = new Map(lines.map((l) => [String(l.product._id), l.quantity]));

        // Cập nhật quantityReceived trên từng item
        const updatedItems = poItems.map((item) => {
          const pid = String(item.productId || item.MaSP || "");
          const justReceived = receivedNowMap.get(pid) || 0;
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

        // Lưu items đã cập nhật và trạng thái mới
        await getDatabase().collection("DonDatHang").updateOne(
          { _id: purchaseOrderId },
          { $set: { items: updatedItems, TrangThai: newPoStatus, updatedAt: new Date() } },
          { session }
        );
        // Đồng bộ CT_DonDatHang
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
    const isFullPaid = total === 0;

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
        TrangThai: "Chờ xuất kho",
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

      const invoice = {
        MaHD: await nextBusinessCode(getDatabase().collection("HoaDon"), "HoaDon"),
        MaDH: orderResult.insertedId,
        MaKH: customerId || null,
        MaKHCode: customer?.MaKH || null,
        TenKH: customer?.HoTen || "Khách vãng lai",
        MaNV: req.user.id,
        NguoiLap: nguoiLap,
        NgayLap: today(),
        TienHang: subtotal,
        GiamGia: discount,
        MaKM: promoCode || null,
        TongTien: total,
        SoTienDaTra: isFullPaid ? total : 0,
        SoTienConLai: isFullPaid ? 0 : total,
        TrangThai: isFullPaid ? "Đã thanh toán" : "Chưa thanh toán",
        details: order.details,
        createdAt: new Date()
      };
      const invoiceResult = await getDatabase().collection("HoaDon").insertOne(invoice, { session });
      await replaceDetails(getDatabase(), "CT_HoaDon", invoiceResult.insertedId, invoice.details, session);

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

    // Validate từng dòng nhập so với PO remaining
    const poItemMap = new Map();
    for (const item of poItems) {
      const pid = String(item.productId || item.MaSP || "");
      poItemMap.set(pid, {
        ordered: Number(item.quantity || item.SoLuong || 0),
        received: Number(item.quantityReceived || 0),
        price: Number(item.price || item.DonGia || 0),
      });
    }

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
      const pid = String(product._id);
      const info = poItemMap.get(pid);
      if (!info) throw fail(`Sản phẩm "${product.TenSP}" không có trong đơn đặt hàng`, 400);
      const remaining = info.ordered - info.received;
      const qty = Number(rl.quantity || rl.SoLuong || 0);
      if (!Number.isInteger(qty) || qty <= 0) throw fail(`Số lượng nhận của "${product.TenSP}" phải là số nguyên dương`, 400);
      if (qty > remaining) {
        throw fail(`"${product.TenSP}": số lượng nhận (${qty}) vượt số còn thiếu (${remaining})`, 400);
      }
      const linePrice = Number(rl.price || rl.DonGia || info.price || product.GiaNhap || 0);
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
        SoChungTuGoc: "",
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
        NgayPhatSinh: ngayNhap,
        SoTien: total,
        SoTienDaTra: paidAmount,
        SoTienConLai: remaining,
        TrangThai: debtStatus,
        createdAt: new Date(),
      }, { session });

      // Cập nhật quantityReceived trên PO items
      const receivedNowMap = new Map(lines.map((l) => [String(l.product._id), l.quantity]));
      const updatedItems = poItems.map((item) => {
        const pid = String(item.productId || item.MaSP || "");
        const justReceived = receivedNowMap.get(pid) || 0;
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
      const document = { MaKK: await nextBusinessCode(getDatabase().collection("KiemKe"), "KiemKe"), MaNV: req.user.id, NguoiLap: req.user?.fullName || req.user?.username || "Nhân viên", NgayKiemKe: req.body.NgayKiemKe || today(), GhiChu: req.body.note || "Kiểm kê kho", details: items, createdAt: new Date(), updatedAt: new Date() };
      const result = await getDatabase().collection("KiemKe").insertOne(document, { session });
      await replaceDetails(getDatabase(), "CT_KiemKe", result.insertedId, document.details, session);
      return serialize({ _id: result.insertedId, ...document });
    });
    res.status(201).json({ data: created, message: "Đã lưu kiểm kê và điều chỉnh tồn kho" });
  } catch (error) { next(error); }
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
    const byProduct = new Map(stocks.map((stock) => [stock.MaSP.toString(), stock]));
    res.json({
      data: products.map((product) => {
        const catName = product.LoaiHang || (product.MaLoai ? catMap.get(product.MaLoai.toString()) : "") || "";
        return {
          ...serialize(product),
          LoaiHang: catName,
          stock: Number(byProduct.get(product._id.toString())?.SoLuongTon ?? product.stock ?? 0),
          stockUpdatedAt: byProduct.get(product._id.toString())?.updatedAt || byProduct.get(product._id.toString())?.NgayCapNhat || null,
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

