import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { getCodeDefinition, nextBusinessCode } from "./businessCode.js";
import { replaceDetails } from "./detailCollections.js";

function parseId(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
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
    SanPham: ["MaSP", "TenSP", "MaLoai", "DonViTinh", "GiaNhap", "GiaBan", "TrangThai"],
    LoaiHang: ["TenLoai"],
  }[tableName] || [];
  if (required.some((field) => !String(body[field] || "").trim())) return "Vui lòng nhập đủ các trường bắt buộc";
  if (body.Email && !/^\S+@\S+\.\S+$/.test(body.Email)) return "Email không hợp lệ";
  if (body.SDT && !/^0\d{9,10}$/.test(String(body.SDT).trim())) return "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng 0";
  if (tableName === "SanPham" && !["Đang bán", "Ngừng bán"].includes(body.TrangThai)) return "Trạng thái sản phẩm không hợp lệ";
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
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
      const data = await getDatabase().collection(tableName).findOne({ _id: id });
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
        body.MaNV = body.MaNV || req.user.id;
      }
      const validation = validateRecord(tableName, body);
      if (validation) return res.status(400).json({ message: validation });
      const definition = getCodeDefinition(tableName);
      const code = definition && !body[definition.field]
        ? await nextBusinessCode(collection, tableName)
        : undefined;
      const document = {
        ...body,
        ...(code ? { [definition.field]: code } : {}),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (definition && await collection.findOne({ [definition.field]: document[definition.field] })) {
        return res.status(409).json({ message: `${document[definition.field]} đã tồn tại` });
      }
      const result = await collection.insertOne(document);
      if (tableName === "DonDatHang") await replaceDetails(getDatabase(), "CT_DonDatHang", result.insertedId, document.items || document.details);
      if (tableName === "KhuyenMai") await replaceDetails(getDatabase(), "CT_KhuyenMai", result.insertedId, document.details || document.items);
      res.status(201).json({ table: tableName, data: await serializeRecord(tableName, { _id: result.insertedId, ...document }), message: `Tao moi ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      if (tableName === "CongNo") {
        // Cho phép cập nhật công nợ thủ công (tính lại SoTienConLai và TrangThai)
        const id = parseId(req.params.id);
        if (!id) return res.status(400).json({ message: "ID khong hop le" });
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
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
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
      if (tableName === "DonDatHang") await replaceDetails(getDatabase(), "CT_DonDatHang", id, (update.items || update.details || []).map((line) => ({
        MaSP: line.MaSP || line.productId || line.id,
        SoLuong: Number(line.SoLuong || line.quantity),
        DonGia: Number(line.DonGia ?? line.price),
        ThanhTien: Number(line.ThanhTien ?? (Number(line.SoLuong || line.quantity) * Number(line.DonGia ?? line.price))),
      })));
      if (tableName === "KhuyenMai") await replaceDetails(getDatabase(), "CT_KhuyenMai", id, update.details || update.items);
      res.json({ table: tableName, data: await serializeRecord(tableName, result), message: `Cap nhat ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      if (tableName === "SanPham") return res.status(409).json({ message: "Không được xóa sản phẩm vì sản phẩm đã liên kết với chứng từ. Hãy chuyển trạng thái sang Ngừng bán" });
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
      const result = await getDatabase().collection(tableName).deleteOne({ _id: id });
      if (!result.deletedCount) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      res.json({ table: tableName, id: req.params.id, message: `Xoa ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  return {
    path: `/${routeName}`,
    router
  };
}
