import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { getCodeDefinition, nextBusinessCode } from "./businessCode.js";
import { replaceDetails } from "./detailCollections.js";
import { isLockedStatus, roleCodes } from "../auth/accountEmployee.js";


function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

async function findDocument(collection, tableName, idParam) {
  const parsed = parseId(idParam);
  if (parsed) {
    const doc = await collection.findOne({ _id: parsed });
    if (doc) return doc;
  }
  const codeDef = getCodeDefinition(tableName);
  if (codeDef?.field) {
    const doc = await collection.findOne({ [codeDef.field]: idParam });
    if (doc) return doc;
  }
  return await collection.findOne({
    $or: [
      { MaSP: idParam },
      { MaKH: idParam },
      { MaNCC: idParam },
      { MaDDH: idParam },
      { MaDH: idParam },
      { MaHD: idParam },
      { MaPN: idParam },
      { MaPX: idParam },
      { MaKK: idParam },
      { MaPTH: idParam },
      { MaCN: idParam },
      { MaKM: idParam },
      { MaNV: idParam },
      { username: idParam },
    ],
  });
}

function serialize(document) {
  if (!document) return document;
  const { _id, ...data } = document;
  return { id: _id.toString(), ...data };
}

function validateRecord(tableName, body) {
  const required = {
    KhachHang: ["HoTen"],
    NhaCungCap: ["TenNCC"],
    SanPham: ["MaSP", "TenSP", "MaLoai", "DonViTinh", "GiaNhap", "GiaBan", "TrangThai", "HanSuDung"],
    LoaiHang: ["TenLoai"],
  }[tableName] || [];
  if (required.some((field) => !String(body[field] || "").trim())) return "Vui lòng nhập đủ các trường bắt buộc";
  if (body.Email && !/^\S+@\S+\.\S+$/.test(body.Email)) return "Email không hợp lệ";
  if (body.SDT && !/^0\d{9,10}$/.test(String(body.SDT).trim())) return "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng 0";
  if (tableName === "SanPham" && !["Đang bán", "Ngừng bán"].includes(body.TrangThai)) return "Trạng thái sản phẩm không hợp lệ";
  if (tableName === "SanPham" && (!body.HanSuDung || isNaN(Date.parse(body.HanSuDung)))) return "Hạn sử dụng không hợp lệ hoặc chưa nhập";
  if (tableName === "KhuyenMai" && Number(body.PhanTramGiam) > 100) return "Phần trăm giảm không được vượt quá 100";
  if (body.NgayBatDau && body.NgayKetThuc && String(body.NgayBatDau) > String(body.NgayKetThuc)) return "Ngày bắt đầu không được sau ngày kết thúc";
  for (const field of ["GiaNhap", "GiaBan", "DiemTichLuy", "PhanTramGiam", "SoTien", "SoTienDaTra", "SoTienConLai"]) {
    if (body[field] !== undefined && (!Number.isFinite(Number(body[field])) || Number(body[field]) < 0)) return `${field} phải là số không âm`;
  }
  return null;
}

async function serializeRecord(tableName, document) {
  const record = serialize(document);
  if (!record) return record;

  if (tableName === "SanPham") {
    const stockDoc = await getDatabase().collection("TonKho").findOne({ MaSP: new ObjectId(record.id) });
    if (stockDoc && stockDoc.SoLuongTon !== undefined) {
      record.stock = stockDoc.SoLuongTon;
    }
  } else if (tableName === "TonKho") {
    if (record.MaSP) {
      const sp = await getDatabase().collection("SanPham").findOne(
        ObjectId.isValid(record.MaSP) ? { _id: new ObjectId(record.MaSP) } : { MaSP: String(record.MaSP) }
      );
      if (sp) {
        record.TenSP = sp.TenSP;
        record.MaSP = sp.MaSP;
        record.DonViTinh = sp.DonViTinh;
        record.LoaiHang = sp.LoaiHang;
        record.GiaBan = sp.GiaBan;
        record.TrangThai = sp.TrangThai;
        record.stock = record.SoLuongTon;
      }
    }
  }
  const references = {
    HoaDon: [{ field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" }],
    PhieuXuat: [{ field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" }],
    PhieuNhap: [{ field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode" }],
    DonDatHang: [{ field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode" }],
    CongNo: [
      { field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode" },
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode" },
      { field: "MaHD", table: "HoaDon", code: "MaHD", output: "MaHDCode" },
    ],
    PhieuTraHang: [
      { field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" },
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode" },
      { field: "MaHD", table: "HoaDon", code: "MaHD", output: "MaHDCode" },
    ],
    SanPham: [{ field: "MaLoai", table: "LoaiHang", code: "MaLoai", output: "MaLoaiCode", name: "TenLoai", nameOutput: "LoaiHang" }],
  }[tableName] || [];
  for (const reference of references) {
    if (!ObjectId.isValid(record[reference.field])) continue;
    const projection = { [reference.code]: 1 };
    if (reference.name) projection[reference.name] = 1;
    const linked = await getDatabase().collection(reference.table).findOne(
      { _id: new ObjectId(record[reference.field]) },
      { projection },
    );
    if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
    if (linked?.[reference.name]) record[reference.nameOutput] = linked[reference.name];
  }
  if (Array.isArray(record.details)) {
    record.details = await Promise.all(record.details.map(async (line) => {
      if (!ObjectId.isValid(line.MaSP)) return line;
      const product = await getDatabase().collection("SanPham").findOne(
        { _id: new ObjectId(line.MaSP) },
        { projection: { MaSP: 1 } },
      );
      return product?.MaSP ? { ...line, MaSPCode: product.MaSP } : line;
    }));
  }
  return record;
}

export function createCrudModule(routeName, tableName) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const data = await getDatabase().collection(tableName).find().sort({ createdAt: -1 }).toArray();
      res.json({ table: tableName, data: await Promise.all(data.map((item) => serializeRecord(tableName, item))), message: `Danh sach ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const data = await findDocument(getDatabase().collection(tableName), tableName, req.params.id);
      if (!data) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      res.json({ table: tableName, data: await serializeRecord(tableName, data), message: `Chi tiet ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      if (tableName === "CongNo") {
        // Cho phép tạo công nợ thủ công (ngoài hóa đơn/phiếu nhập)
        const body = { ...req.body };
        const rawNCC = body.MaNCC || (body.type === "suppliers" ? body.partnerId : null);
        const rawKH = body.MaKH || (body.type === "customers" ? body.partnerId : null);
        const hasMaNCC = rawNCC && ObjectId.isValid(rawNCC);
        const hasMaKH = rawKH && ObjectId.isValid(rawKH);
        if (!hasMaNCC && !hasMaKH) {
          return res.status(400).json({ message: "Phải chọn Nhà cung cấp hoặc Khách hàng cho khoản công nợ" });
        }
        body.MaNCC = hasMaNCC ? rawNCC : null;
        body.MaKH = hasMaKH ? rawKH : null;

        const soTien = Number(body.SoTien);
        if (!Number.isFinite(soTien) || soTien <= 0) {
          return res.status(400).json({ message: "Số tiền công nợ phải lớn hơn 0" });
        }
        const soTienDaTra = Math.max(0, Number(body.SoTienDaTra) || 0);
        const soTienConLai = Math.max(0, soTien - soTienDaTra);
        const trangThai = soTienConLai === 0 ? "Đã thanh toán" : "Còn nợ";
        const debtCollection = getDatabase().collection("CongNo");
        const maCN = await nextBusinessCode(debtCollection, "CongNo");
        const document = {
          MaCN: maCN,
          MaNCC: hasMaNCC ? new ObjectId(body.MaNCC) : null,
          MaKH: hasMaKH ? new ObjectId(body.MaKH) : null,
          LoaiCongNo: hasMaNCC ? "Nhà cung cấp" : "Khách hàng",
          type: hasMaNCC ? "suppliers" : "customers",
          NgayPhatSinh: body.NgayPhatSinh || new Date().toISOString().slice(0, 10),
          SoTien: soTien,
          SoTienDaTra: soTienDaTra,
          SoTienConLai: soTienConLai,
          TrangThai: trangThai,
          GhiChu: body.GhiChu || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await debtCollection.insertOne(document);
        return res.status(201).json({
          table: "CongNo",
          data: await serializeRecord("CongNo", { _id: result.insertedId, ...document }),
          message: "Tao moi cong no",
        });
      }
      const collection = getDatabase().collection(tableName);
      const body = { ...req.body };
      if (tableName === "SanPham") {
        if (!body.HanSuDung || !String(body.HanSuDung).trim() || isNaN(Date.parse(body.HanSuDung))) {
          return res.status(400).json({ message: "Vui lòng chọn hạn sử dụng hợp lệ cho sản phẩm trước khi lưu" });
        }
        let catDoc = null;
        if (ObjectId.isValid(body.MaLoai)) {
          catDoc = await getDatabase().collection("LoaiHang").findOne({ _id: new ObjectId(body.MaLoai) });
        }
        if (!catDoc && body.LoaiHang) {
          catDoc = await getDatabase().collection("LoaiHang").findOne({
            TenLoai: { $regex: new RegExp(`^${String(body.LoaiHang).trim()}$`, "i") }
          });
        }
        if (!catDoc && body.MaLoai) {
          catDoc = await getDatabase().collection("LoaiHang").findOne({
            TenLoai: { $regex: new RegExp(`^${String(body.MaLoai).trim()}$`, "i") }
          });
        }
        if (catDoc) {
          body.MaLoai = catDoc._id;
          body.LoaiHang = catDoc.TenLoai;
        } else {
          return res.status(400).json({ message: "Loại hàng không hợp lệ" });
        }
      } else if (tableName === "DonDatHang") {
        if (!ObjectId.isValid(body.MaNCC)) return res.status(400).json({ message: "Nhà cung cấp không hợp lệ" });
        body.MaNCC = new ObjectId(body.MaNCC);
      }
      if (tableName === "DonDatHang") {
        const lines = body.items || body.details;
        if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ message: "Đơn đặt hàng phải có ít nhất một sản phẩm" });
        const products = getDatabase().collection("SanPham");
        let total = 0;
        for (const line of lines) {
          const productId = parseId(line.productId || line.id || line.MaSP);
          const quantity = Number(line.quantity || line.SoLuong);
          const price = Number(line.price ?? line.DonGia);
          if (!productId || !await products.findOne({ _id: productId })) return res.status(400).json({ message: "Sản phẩm trong đơn đặt hàng không hợp lệ" });
          if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) return res.status(400).json({ message: "Số lượng và đơn giá đặt hàng không hợp lệ" });
          total += quantity * price;
        }
        body.items = lines;
        body.TongTien = total;
      }
      if (req.user && tableName !== "NhanVien") {
        body.MaNV = req.user.id;
        body.NguoiLap = req.user.fullName || req.user.username || body.NguoiLap;
      }
      if (tableName === "NhanVien") {
        if (body.VaiTro) body.MaVaiTro = roleCodes[body.VaiTro] || body.MaVaiTro || 2;
        if (!body.TrangThai) body.TrangThai = "Đang làm việc";
      }
      if (["KhachHang", "NhaCungCap"].includes(tableName) && !body.TrangThai) {
        body.TrangThai = "Đang hoạt động";
      }
      const definition = getCodeDefinition(tableName);
      if (definition && !body[definition.field]) {
        body[definition.field] = await nextBusinessCode(collection, tableName);
      } else if (definition && body[definition.field]) {
        const existing = await collection.findOne({ [definition.field]: body[definition.field] });
        if (existing) {
          return res.status(409).json({ message: `${body[definition.field]} đã tồn tại` });
        }
      }
      const validation = validateRecord(tableName, body);
      if (validation) return res.status(400).json({ message: validation });
      const document = {
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await collection.insertOne(document);
      if (tableName === "SanPham") {
        await getDatabase().collection("TonKho").updateOne(
          { MaSP: result.insertedId },
          {
            $set: {
              MaSP: result.insertedId,
              SoLuongTon: Number(document.stock || 0),
              NgayCapNhat: new Date().toISOString().slice(0, 10),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
      if (tableName === "DonDatHang") await replaceDetails(getDatabase(), "CT_DonDatHang", result.insertedId, document.items || document.details);
      if (tableName === "KhuyenMai") await replaceDetails(getDatabase(), "CT_KhuyenMai", result.insertedId, document.details || document.items);
      res.status(201).json({ table: tableName, data: await serializeRecord(tableName, { _id: result.insertedId, ...document }), message: `Tao moi ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const existingDoc = await findDocument(getDatabase().collection(tableName), tableName, req.params.id);
      if (!existingDoc) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      const id = existingDoc._id;

      if (tableName === "CongNo") {
        // Cho phép cập nhật công nợ thủ công (tính lại SoTienConLai và TrangThai)
        const body = { ...req.body };
        const soTien = Number(body.SoTien);
        if (!Number.isFinite(soTien) || soTien <= 0) {
          return res.status(400).json({ message: "Số tiền công nợ phải lớn hơn 0" });
        }
        const soTienDaTra = Math.max(0, Number(body.SoTienDaTra) || 0);
        const soTienConLai = Math.max(0, soTien - soTienDaTra);
        const trangThai = soTienConLai === 0 ? "Đã thanh toán" : "Còn nợ";
        delete body.id;
        delete body._id;
        const update = {
          ...body,
          SoTien: soTien,
          SoTienDaTra: soTienDaTra,
          SoTienConLai: soTienConLai,
          TrangThai: trangThai,
          updatedAt: new Date(),
        };
        const result = await getDatabase().collection("CongNo").findOneAndUpdate(
          { _id: id },
          { $set: update },
          { returnDocument: "after" }
        );
        if (!result) return res.status(404).json({ message: "Khong tim thay cong no" });
        return res.json({
          table: "CongNo",
          data: await serializeRecord("CongNo", result),
          message: "Cap nhat cong no",
        });
      }
      const update = { ...req.body, updatedAt: new Date() };
      if (tableName === "SanPham") {
        let catDoc = null;
        if (ObjectId.isValid(update.MaLoai)) {
          catDoc = await getDatabase().collection("LoaiHang").findOne({ _id: new ObjectId(update.MaLoai) });
        }
        if (!catDoc && update.LoaiHang) {
          catDoc = await getDatabase().collection("LoaiHang").findOne({
            TenLoai: { $regex: new RegExp(`^${String(update.LoaiHang).trim()}$`, "i") }
          });
        }
        if (!catDoc && update.MaLoai) {
          catDoc = await getDatabase().collection("LoaiHang").findOne({
            TenLoai: { $regex: new RegExp(`^${String(update.MaLoai).trim()}$`, "i") }
          });
        }
        if (catDoc) {
          update.MaLoai = catDoc._id;
          update.LoaiHang = catDoc.TenLoai;
        } else {
          return res.status(400).json({ message: "Loại hàng không hợp lệ" });
        }
      } else if (tableName === "DonDatHang") {
        if (!ObjectId.isValid(update.MaNCC)) return res.status(400).json({ message: "Nhà cung cấp không hợp lệ" });
        update.MaNCC = new ObjectId(update.MaNCC);
      }
      if (tableName === "DonDatHang") {
        const lines = update.items || update.details;
        if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ message: "Đơn đặt hàng phải có ít nhất một sản phẩm" });
        update.TongTien = lines.reduce((sum, line) => sum + Number(line.quantity || line.SoLuong) * Number(line.price ?? line.DonGia), 0);
      }
      const validation = validateRecord(tableName, update);
      if (validation) return res.status(400).json({ message: validation });
      const definition = getCodeDefinition(tableName);
      if (definition && update[definition.field]) {
        const duplicate = await getDatabase().collection(tableName).findOne({ [definition.field]: update[definition.field], _id: { $ne: id } });
        if (duplicate) return res.status(409).json({ message: `${update[definition.field]} đã tồn tại` });
      }
      delete update.id;
      delete update._id;
      const result = await getDatabase().collection(tableName).findOneAndUpdate(
        { _id: id },
        { $set: update },
        { returnDocument: "after" }
      );
      if (!result) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      if (tableName === "SanPham" && update.stock !== undefined) {
        await getDatabase().collection("TonKho").updateOne(
          { MaSP: id },
          {
            $set: {
              SoLuongTon: Number(update.stock),
              NgayCapNhat: new Date().toISOString().slice(0, 10),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
      if (tableName === "DonDatHang") await replaceDetails(getDatabase(), "CT_DonDatHang", id, (update.items || update.details || []).map((line) => ({
        MaSP: line.MaSP || line.productId || line.id,
        SoLuong: Number(line.SoLuong || line.quantity),
        DonGia: Number(line.DonGia ?? line.price),
        ThanhTien: Number(line.ThanhTien ?? (Number(line.SoLuong || line.quantity) * Number(line.DonGia ?? line.price))),
      })));
      if (tableName === "KhuyenMai") await replaceDetails(getDatabase(), "CT_KhuyenMai", id, update.details || update.items);
      if (tableName === "NhanVien" && (existingDoc.username || update.username)) {
        const uName = existingDoc.username || update.username;
        const isLocked = isLockedStatus(update.TrangThai);
        await getDatabase().collection("Users").updateOne(
          { username: uName },
          { $set: { status: isLocked ? "Đã khóa" : "Hoạt động", updatedAt: new Date() } }
        );
      }
      res.json({ table: tableName, data: await serializeRecord(tableName, result), message: `Cap nhat ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  // Delete handler with smart soft-delete
  router.delete("/:id", async (req, res, next) => {
    try {
      const db = getDatabase();
      const existingDoc = await findDocument(db.collection(tableName), tableName, req.params.id);
      if (!existingDoc) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
      const id = existingDoc._id;

      // Soft-delete for KhachHang
      if (tableName === "KhachHang") {
        const idMatches = [id, String(id)];
        if (existingDoc.MaKH) idMatches.push(existingDoc.MaKH);

        const hasOrders = await db.collection("DonHang").findOne({
          $or: [{ MaKH: { $in: idMatches } }, { customerId: { $in: idMatches } }]
        });
        const hasInvoices = await db.collection("HoaDon").findOne({ MaKH: { $in: idMatches } });
        const hasReturns = await db.collection("PhieuTraHang").findOne({ MaKH: { $in: idMatches } });
        const hasDebts = await db.collection("CongNo").findOne({ MaKH: { $in: idMatches } });

        if (hasOrders || hasInvoices || hasReturns || hasDebts) {
          await db.collection("KhachHang").updateOne(
            { _id: id },
            { $set: { TrangThai: "Ngưng hoạt động", status: "inactive", updatedAt: new Date() } }
          );
          return res.json({
            table: tableName,
            id: req.params.id,
            softDeleted: true,
            status: "Ngưng hoạt động",
            message: "Khách hàng đã phát sinh trong chứng từ nên đã được chuyển sang trạng thái 'Ngưng hoạt động'.",
          });
        }
      }

      // Soft-delete for NhaCungCap
      if (tableName === "NhaCungCap") {
        const idMatches = [id, String(id)];
        if (existingDoc.MaNCC) idMatches.push(existingDoc.MaNCC);

        const hasPurchaseOrders = await db.collection("DonDatHang").findOne({ MaNCC: { $in: idMatches } });
        const hasReceipts = await db.collection("PhieuNhap").findOne({
          $or: [{ MaNCC: { $in: idMatches } }, { supplierId: { $in: idMatches } }]
        });
        const hasDebts = await db.collection("CongNo").findOne({ MaNCC: { $in: idMatches } });

        if (hasPurchaseOrders || hasReceipts || hasDebts) {
          await db.collection("NhaCungCap").updateOne(
            { _id: id },
            { $set: { TrangThai: "Ngưng hoạt động", status: "inactive", updatedAt: new Date() } }
          );
          return res.json({
            table: tableName,
            id: req.params.id,
            softDeleted: true,
            status: "Ngưng hoạt động",
            message: "Nhà cung cấp đã phát sinh trong chứng từ nên đã được chuyển sang trạng thái 'Ngưng hoạt động'.",
          });
        }
      }

      // Soft-delete for SanPham
      if (tableName === "SanPham") {
        const spMatches = [id, String(id)];
        if (existingDoc.MaSP) spMatches.push(existingDoc.MaSP);

        const hasOrderDetails = await db.collection("DonHang").findOne({ "details.MaSP": { $in: spMatches } });
        const hasInvoiceDetails = await db.collection("HoaDon").findOne({ "details.MaSP": { $in: spMatches } });
        const hasPoDetails = await db.collection("DonDatHang").findOne({
          $or: [{ "items.productId": { $in: spMatches } }, { "details.MaSP": { $in: spMatches } }]
        });
        const hasReceiptDetails = await db.collection("PhieuNhap").findOne({
          $or: [{ "details.MaSP": { $in: spMatches } }, { "details.id": { $in: spMatches } }]
        });
        const hasIssueDetails = await db.collection("PhieuXuat").findOne({
          $or: [{ "details.MaSP": { $in: spMatches } }, { "details.id": { $in: spMatches } }]
        });
        const hasReturnDetails = await db.collection("PhieuTraHang").findOne({
          $or: [{ "details.MaSP": { $in: spMatches } }, { MaSP: { $in: spMatches } }]
        });

        if (hasOrderDetails || hasInvoiceDetails || hasPoDetails || hasReceiptDetails || hasIssueDetails || hasReturnDetails) {
          await db.collection("SanPham").updateOne(
            { _id: id },
            { $set: { TrangThai: "Ngừng bán", updatedAt: new Date() } }
          );
          return res.json({
            table: tableName,
            id: req.params.id,
            softDeleted: true,
            status: "Ngừng bán",
            message: "Sản phẩm đã phát sinh trong chứng từ nên đã được chuyển sang trạng thái 'Ngừng bán'.",
          });
        }
        // If not in documents, delete TonKho as well
        await db.collection("TonKho").deleteOne({ MaSP: id });
      }

      const result = await db.collection(tableName).deleteOne({ _id: id });
      if (!result.deletedCount) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
      res.json({ table: tableName, id: req.params.id, softDeleted: false, message: `Đã xóa ${routeName} thành công.` });
    } catch (error) {
      next(error);
    }
  });

  return {
    path: `/${routeName}`,
    router
  };
}
