import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { getCodeDefinition, nextBusinessCode } from "./businessCode.js";

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
    SanPham: ["TenSP"],
    LoaiHang: ["TenLoai"],
  }[tableName] || [];
  if (required.some((field) => !String(body[field] || "").trim())) return "Vui lòng nhập đủ các trường bắt buộc";
  if (body.Email && !/^\S+@\S+\.\S+$/.test(body.Email)) return "Email không hợp lệ";
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
    PhieuTraHang: [{ field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" }],
    SanPham: [{ field: "MaLoai", table: "LoaiHang", code: "MaLoai", output: "MaLoaiCode", name: "TenLoai", nameOutput: "LoaiHang" }],
  }[tableName] || [];
  for (const reference of references) {
    if (!ObjectId.isValid(record[reference.field])) continue;
    const linked = await getDatabase().collection(reference.table).findOne(
      { _id: new ObjectId(record[reference.field]) },
      { projection: { [reference.code]: 1 } },
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
      const collection = getDatabase().collection(tableName);
      const body = { ...req.body };
      if (tableName === "DonDatHang" || tableName === "SanPham") {
        const field = tableName === "DonDatHang" ? "MaNCC" : "MaLoai";
        if (!ObjectId.isValid(body[field])) return res.status(400).json({ message: tableName === "DonDatHang" ? "Nhà cung cấp không hợp lệ" : "Loại hàng không hợp lệ" });
        body[field] = new ObjectId(body[field]);
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
      res.status(201).json({ table: tableName, data: await serializeRecord(tableName, { _id: result.insertedId, ...document }), message: `Tao moi ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const validation = validateRecord(tableName, req.body);
      if (validation) return res.status(400).json({ message: validation });
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: "ID khong hop le" });
      const update = { ...req.body, updatedAt: new Date() };
      if (tableName === "DonDatHang" || tableName === "SanPham") {
        const field = tableName === "DonDatHang" ? "MaNCC" : "MaLoai";
        if (!ObjectId.isValid(update[field])) return res.status(400).json({ message: tableName === "DonDatHang" ? "Nhà cung cấp không hợp lệ" : "Loại hàng không hợp lệ" });
        update[field] = new ObjectId(update[field]);
      }
      const result = await getDatabase().collection(tableName).findOneAndUpdate(
        { _id: id },
        { $set: update },
        { returnDocument: "after" }
      );
      if (!result) return res.status(404).json({ message: `Khong tim thay ${routeName}` });
      res.json({ table: tableName, data: await serializeRecord(tableName, result), message: `Cap nhat ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
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
