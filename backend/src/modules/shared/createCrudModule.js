import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { getCodeDefinition, nextBusinessCode } from "./businessCode.js";
import { replaceDetails } from "./detailCollections.js";
import { isLockedStatus, roleCodes } from "../auth/accountEmployee.js";
import { recordAudit } from "../audit/audit.service.js";


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
  if (tableName === "PhieuThu") {
    body.NguoiNopTien = body.NguoiNopTien || body.NguoiNop || body.TenKH || "";
    body.NguoiNop = body.NguoiNop || body.NguoiNopTien;
  }
  if (tableName === "PhieuChi") {
    body.NguoiNhanTien = body.NguoiNhanTien || body.NguoiNhan || body.TenNCC || "";
    body.NguoiNhan = body.NguoiNhan || body.NguoiNhanTien;
  }

  const required = {
    KhachHang: ["HoTen"],
    NhaCungCap: ["TenNCC"],
    SanPham: ["MaSP", "TenSP", "MaLoai", "DonViTinh", "GiaNhap", "GiaBan", "TrangThai", "HanSuDung"],
    LoaiHang: ["TenLoai"],
    PhieuThu: ["NguoiNopTien", "LyDo", "SoTien"],
    PhieuChi: ["NguoiNhanTien", "LyDo", "SoTien"],
  }[tableName] || [];
  if (required.some((field) => !String(body[field] ?? "").toString().trim())) return "Vui lòng nhập đủ các trường bắt buộc";

  if (tableName === "SanPham") {
    if (body.GiaNhap === undefined || body.GiaNhap === null || String(body.GiaNhap).trim() === "") {
      return "Giá nhập là bắt buộc và không được để trống";
    }
    const giaNhap = Number(body.GiaNhap);
    if (!Number.isFinite(giaNhap) || giaNhap <= 0) {
      return "Giá nhập phải là số hợp lệ và lớn hơn 0";
    }

    if (body.GiaBan === undefined || body.GiaBan === null || String(body.GiaBan).trim() === "") {
      return "Giá bán là bắt buộc và không được để trống";
    }
    const giaBan = Number(body.GiaBan);
    if (!Number.isFinite(giaBan) || giaBan <= 0) {
      return "Giá bán phải là số hợp lệ và lớn hơn 0";
    }

    if (!["Đang bán", "Ngừng bán"].includes(body.TrangThai)) return "Trạng thái sản phẩm không hợp lệ";
    if (!body.HanSuDung || isNaN(Date.parse(body.HanSuDung))) return "Hạn sử dụng không hợp lệ hoặc chưa nhập";
  }

  if ((tableName === "PhieuThu" || tableName === "PhieuChi") && (!Number.isFinite(Number(body.SoTien)) || Number(body.SoTien) <= 0)) {
    return "Số tiền thu/chi phải là số lớn hơn 0";
  }
  if ((tableName === "PhieuThu" || tableName === "PhieuChi") && body.NgayLap && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.NgayLap).slice(0, 10))) {
    return "Ngày lập phiếu không hợp lệ";
  }
  if (body.Email && !/^\S+@\S+\.\S+$/.test(body.Email)) return "Email không hợp lệ";
  if (body.SDT && !/^0\d{9,10}$/.test(String(body.SDT).trim())) return "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng 0";
  if (tableName === "KhuyenMai" && Number(body.PhanTramGiam) > 100) return "Phần trăm giảm không được vượt quá 100";
  if (body.NgayBatDau && body.NgayKetThuc && String(body.NgayBatDau) > String(body.NgayKetThuc)) return "Ngày bắt đầu không được sau ngày kết thúc";
  for (const field of ["DiemTichLuy", "PhanTramGiam", "SoTien", "SoTienDaTra", "SoTienConLai"]) {
    if (body[field] !== undefined && (!Number.isFinite(Number(body[field])) || Number(body[field]) < 0)) return `${field} phải là số không âm`;
  }
  return null;
}

async function serializeRecord(tableName, document, cache = {}) {
  const record = serialize(document);
  if (!record) return record;

  if (tableName === "SanPham") {
    if (cache.stockMap && cache.stockMap.has(String(record.id))) {
      record.stock = cache.stockMap.get(String(record.id));
    } else {
      const stockDoc = await getDatabase().collection("TonKho").findOne({ MaSP: new ObjectId(record.id) });
      if (stockDoc && stockDoc.SoLuongTon !== undefined) {
        record.stock = stockDoc.SoLuongTon;
      }
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
        record.HinhAnh = sp.HinhAnh || "";
        record.GiaBan = sp.GiaBan;
        record.TrangThai = sp.TrangThai;
        record.stock = record.SoLuongTon;
      }
    }
  }
  const references = {
    HoaDon: [
      { field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" },
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode", name: "HoTen", nameOutput: "TenKH" },
    ],
    DonHang: [
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode", name: "HoTen", nameOutput: "TenKH" },
    ],
    PhieuXuat: [{ field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" }],
    PhieuNhap: [{ field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode", name: "TenNCC", nameOutput: "TenNCC" }],
    PhieuThu: [{ field: "MaHD", table: "HoaDon", code: "MaHD", output: "MaHDCode" }],
    PhieuChi: [{ field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode", name: "TenNCC", nameOutput: "TenNCC" }],
    DonDatHang: [{ field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode", name: "TenNCC", nameOutput: "TenNCC" }],
    CongNo: [
      { field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode", name: "TenNCC", nameOutput: "TenNCC" },
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode", name: "HoTen", nameOutput: "TenKH" },
      { field: "MaHD", table: "HoaDon", code: "MaHD", output: "MaHDCode" },
      { field: "MaPN", table: "PhieuNhap", code: "MaPN", output: "MaPNCode" },
    ],
    PhieuTraHang: [
      { field: "MaDH", table: "DonHang", code: "MaDH", output: "MaDHCode" },
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode", name: "HoTen", nameOutput: "TenKH" },
      { field: "MaHD", table: "HoaDon", code: "MaHD", output: "MaHDCode" },
    ],
    ThanhToan: [
      { field: "MaHD", table: "HoaDon", code: "MaHD", output: "MaHDCode" },
      { field: "MaPN", table: "PhieuNhap", code: "MaPN", output: "MaPNCode" },
      { field: "MaCN", table: "CongNo", code: "MaCN", output: "MaCNCode" },
      { field: "MaNCC", table: "NhaCungCap", code: "MaNCC", output: "MaNCCCode", name: "TenNCC", nameOutput: "TenNCC" },
      { field: "MaKH", table: "KhachHang", code: "MaKH", output: "MaKHCode", name: "HoTen", nameOutput: "TenKH" },
    ],
    SanPham: [{ field: "MaLoai", table: "LoaiHang", code: "MaLoai", output: "MaLoaiCode", name: "TenLoai", nameOutput: "LoaiHang" }],
  }[tableName] || [];
  for (const reference of references) {
    if (!record[reference.field]) continue;
    const refVal = record[reference.field];
    if (tableName === "SanPham" && reference.table === "LoaiHang" && cache.catMap) {
      const linked = cache.catMap.get(String(refVal));
      if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
      if (linked?.[reference.name]) record[reference.nameOutput] = linked[reference.name];
      continue;
    }
    if (tableName === "CongNo") {
      if (reference.table === "PhieuNhap" && cache.pnMap) {
        const linked = cache.pnMap.get(String(refVal));
        if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
        continue;
      }
      if (reference.table === "NhaCungCap" && cache.nccMap) {
        const linked = cache.nccMap.get(String(refVal));
        if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
        if (linked?.[reference.name]) record[reference.nameOutput] = linked[reference.name];
        continue;
      }
      if (reference.table === "KhachHang" && cache.khMap) {
        const linked = cache.khMap.get(String(refVal));
        if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
        if (linked?.[reference.name]) record[reference.nameOutput] = linked[reference.name];
        continue;
      }
      if (reference.table === "HoaDon" && cache.hdMap) {
        const linked = cache.hdMap.get(String(refVal));
        if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
        continue;
      }
    }
    const projection = { [reference.code]: 1 };
    if (reference.name) projection[reference.name] = 1;
    const orClauses = [];
    if (ObjectId.isValid(refVal)) {
      orClauses.push({ _id: new ObjectId(refVal) });
    }
    orClauses.push({ _id: String(refVal) });
    orClauses.push({ [reference.code]: String(refVal) });

    const linked = await getDatabase().collection(reference.table).findOne(
      { $or: orClauses },
      { projection },
    );
    if (linked?.[reference.code]) record[reference.output] = linked[reference.code];
    if (linked?.[reference.name]) record[reference.nameOutput] = linked[reference.name];
  }
  if (tableName === "HoaDon" || tableName === "DonHang") {
    if (!record.TenKH) {
      record.TenKH = record.MaKH ? "Khách hàng" : "Khách vãng lai";
    }
  }
  if (tableName === "CongNo") {
    if (!record.partnerName) {
      record.partnerName = record.TenKH || record.TenNCC || (record.LoaiCongNo === "Nhà cung cấp" ? "Nhà cung cấp" : "Khách hàng");
    }
    if (record.MaPN) {
      if (record.MaPNCode && !/^[0-9a-fA-F]{24}$/.test(String(record.MaPNCode).trim())) {
        record.MaPhieuNhap = record.MaPNCode;
      } else {
        record.MaPNCode = "Không xác định";
        record.MaPhieuNhap = "Không xác định";
      }
    } else {
      record.MaPNCode = "";
      record.MaPhieuNhap = "";
    }
  }
  if (tableName === "ThanhToan") {
    if (!record.TenDoiTuong) {
      record.TenDoiTuong = record.TenKH || record.TenNCC || "Khách hàng";
    }
  }
  let detailProp = Array.isArray(record.details) && record.details.length ? "details" : Array.isArray(record.items) && record.items.length ? "items" : null;
  if (!detailProp && ["DonDatHang", "DonHang", "HoaDon", "PhieuNhap", "PhieuXuat", "KiemKe"].includes(tableName)) {
    const detailMap = {
      DonDatHang: { col: "CT_DonDatHang", fk: "MaDDH" },
      DonHang: { col: "CT_DonHang", fk: "MaDH" },
      HoaDon: { col: "CT_HoaDon", fk: "MaHD" },
      PhieuNhap: { col: "CT_PhieuNhap", fk: "MaPN" },
      PhieuXuat: { col: "CT_PhieuXuat", fk: "MaPX" },
      KiemKe: { col: "CT_KiemKe", fk: "MaKK" },
    };
    const def = detailMap[tableName];
    if (def) {
      const objId = record._id || (ObjectId.isValid(record.id) ? new ObjectId(record.id) : null);
      const queries = [];
      if (objId) queries.push({ [def.fk]: objId });
      if (record.id) queries.push({ [def.fk]: record.id });
      if (record[def.fk]) queries.push({ [def.fk]: record[def.fk] });
      const ctDocs = queries.length ? await getDatabase().collection(def.col).find({ $or: queries }).toArray() : [];
      if (ctDocs.length) {
        const propName = tableName === "DonDatHang" ? "items" : "details";
        record[propName] = ctDocs;
        detailProp = propName;
      }
    }
  }
  if (detailProp) {
    record[detailProp] = await Promise.all(record[detailProp].map(async (line) => {
      const rawId = line.productId || line.MaSP || line.id;
      let query = null;
      if (ObjectId.isValid(rawId)) query = { _id: new ObjectId(rawId) };
      else if (rawId) query = { MaSP: String(rawId) };
      if (!query) return line;

      const product = await getDatabase().collection("SanPham").findOne(
        query,
        { projection: { MaSP: 1, TenSP: 1, HinhAnh: 1, DonViTinh: 1, GiaBan: 1, GiaNhap: 1, LoaiHang: 1 } },
      );
      if (!product) return line;
      return {
        ...line,
        MaSPCode: product.MaSP,
        MaSP: product.MaSP,
        TenSP: line.TenSP || product.TenSP,
        HinhAnh: line.HinhAnh ?? product.HinhAnh ?? "",
        DonViTinh: line.DonViTinh || product.DonViTinh,
        LoaiHang: line.LoaiHang || product.LoaiHang,
      };
    }));
  }
  return record;
}

async function serializeRecords(tableName, documents) {
  if (!documents || !documents.length) return [];
  const cache = {};
  if (tableName === "SanPham") {
    const db = getDatabase();
    const ids = documents.map((d) => d._id).filter(Boolean);
    const idStrings = ids.map((id) => String(id));
    const [stocks, categories] = await Promise.all([
      db
        .collection("TonKho")
        .find({
          $or: [{ MaSP: { $in: ids } }, { MaSP: { $in: idStrings } }],
        })
        .toArray()
        .catch(() => []),
      db.collection("LoaiHang").find({}).toArray().catch(() => []),
    ]);

    const stockMap = new Map();
    stocks.forEach((s) => {
      if (s.MaSP) stockMap.set(String(s.MaSP), s.SoLuongTon);
    });
    cache.stockMap = stockMap;

    const catMap = new Map();
    categories.forEach((c) => {
      catMap.set(String(c._id), c);
      if (c.MaLoai) catMap.set(String(c.MaLoai), c);
    });
    cache.catMap = catMap;
  } else if (tableName === "CongNo") {
    const db = getDatabase();
    const pnIds = documents.map((d) => d.MaPN).filter(Boolean);
    const nccIds = documents.map((d) => d.MaNCC).filter(Boolean);
    const khIds = documents.map((d) => d.MaKH).filter(Boolean);
    const hdIds = documents.map((d) => d.MaHD).filter(Boolean);

    const [pnDocs, nccDocs, khDocs, hdDocs] = await Promise.all([
      pnIds.length
        ? db.collection("PhieuNhap").find({
            $or: [
              { _id: { $in: pnIds.map(parseId).filter(Boolean) } },
              { _id: { $in: pnIds.map(String) } },
              { MaPN: { $in: pnIds.map(String) } },
            ],
          }, { projection: { MaPN: 1, TongTien: 1, NgayNhap: 1 } }).toArray().catch(() => [])
        : [],
      nccIds.length
        ? db.collection("NhaCungCap").find({
            $or: [
              { _id: { $in: nccIds.map(parseId).filter(Boolean) } },
              { _id: { $in: nccIds.map(String) } },
              { MaNCC: { $in: nccIds.map(String) } },
            ],
          }, { projection: { MaNCC: 1, TenNCC: 1, SDT: 1, DiaChi: 1 } }).toArray().catch(() => [])
        : [],
      khIds.length
        ? db.collection("KhachHang").find({
            $or: [
              { _id: { $in: khIds.map(parseId).filter(Boolean) } },
              { _id: { $in: khIds.map(String) } },
              { MaKH: { $in: khIds.map(String) } },
            ],
          }, { projection: { MaKH: 1, HoTen: 1, SDT: 1, DiaChi: 1 } }).toArray().catch(() => [])
        : [],
      hdIds.length
        ? db.collection("HoaDon").find({
            $or: [
              { _id: { $in: hdIds.map(parseId).filter(Boolean) } },
              { _id: { $in: hdIds.map(String) } },
              { MaHD: { $in: hdIds.map(String) } },
            ],
          }, { projection: { MaHD: 1, TongTien: 1, NgayLap: 1 } }).toArray().catch(() => [])
        : [],
    ]);

    const pnMap = new Map();
    pnDocs.forEach((p) => {
      pnMap.set(String(p._id), p);
      if (p.MaPN) pnMap.set(String(p.MaPN), p);
    });
    cache.pnMap = pnMap;

    const nccMap = new Map();
    nccDocs.forEach((n) => {
      nccMap.set(String(n._id), n);
      if (n.MaNCC) nccMap.set(String(n.MaNCC), n);
    });
    cache.nccMap = nccMap;

    const khMap = new Map();
    khDocs.forEach((k) => {
      khMap.set(String(k._id), k);
      if (k.MaKH) khMap.set(String(k.MaKH), k);
    });
    cache.khMap = khMap;

    const hdMap = new Map();
    hdDocs.forEach((h) => {
      hdMap.set(String(h._id), h);
      if (h.MaHD) hdMap.set(String(h.MaHD), h);
    });
    cache.hdMap = hdMap;
  }
  return Promise.all(documents.map((item) => serializeRecord(tableName, item, cache)));
}

export function createCrudModule(routeName, tableName) {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const collection = getDatabase().collection(tableName);
      const hasPaging = req.query.page !== undefined || req.query.limit !== undefined;
      const total = await collection.countDocuments();

      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const skip = (page - 1) * limit;

      let cursor = collection.find().sort({ createdAt: -1 });
      if (hasPaging) {
        cursor = cursor.skip(skip).limit(limit);
      }
      const data = await cursor.toArray();
      const totalPages = Math.ceil(total / limit) || 1;

      const serializedData = await serializeRecords(tableName, data);
      res.json({
        table: tableName,
        data: serializedData,
        pagination: {
          page: hasPaging ? page : 1,
          limit: hasPaging ? limit : total,
          total,
          totalPages: hasPaging ? totalPages : 1,
        },
        message: `Danh sách ${routeName}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const data = await findDocument(getDatabase().collection(tableName), tableName, req.params.id);
      if (!data) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
      res.json({ table: tableName, data: await serializeRecord(tableName, data), message: `Chi tiết ${routeName}` });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      if (tableName === "CongNo") {
        return res.status(400).json({
          message: "Không thể tạo công nợ thủ công. Công nợ nhà cung cấp phải phát sinh tự động từ phiếu nhập kho.",
        });
      }
      const collection = getDatabase().collection(tableName);
      const body = { ...req.body };
      if (tableName === "SanPham") {
        if (!body.HanSuDung || !String(body.HanSuDung).trim() || isNaN(Date.parse(body.HanSuDung))) {
          return res.status(400).json({ message: "Vui lòng chọn hạn sử dụng hợp lệ cho sản phẩm trước khi lưu" });
        }
        if (body.GiaNhap === undefined || body.GiaNhap === null || String(body.GiaNhap).trim() === "") {
          return res.status(400).json({ message: "Giá nhập là bắt buộc và không được để trống" });
        }
        const gn = Number(body.GiaNhap);
        if (!Number.isFinite(gn) || gn <= 0) {
          return res.status(400).json({ message: "Giá nhập phải là số hợp lệ và lớn hơn 0" });
        }
        if (body.GiaBan === undefined || body.GiaBan === null || String(body.GiaBan).trim() === "") {
          return res.status(400).json({ message: "Giá bán là bắt buộc và không được để trống" });
        }
        const gb = Number(body.GiaBan);
        if (!Number.isFinite(gb) || gb <= 0) {
          return res.status(400).json({ message: "Giá bán phải là số hợp lệ và lớn hơn 0" });
        }
        body.GiaNhap = gn;
        body.GiaBan = gb;

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
      } else if (tableName === "LoaiHang") {
        if (!body.TenLoai || !String(body.TenLoai).trim()) {
          return res.status(400).json({ message: "Tên loại hàng không được để trống" });
        }
        const duplicateCat = await collection.findOne({
          TenLoai: { $regex: new RegExp(`^${String(body.TenLoai).trim()}$`, "i") }
        });
        if (duplicateCat) {
          return res.status(409).json({ message: `Loại hàng "${body.TenLoai}" đã tồn tại` });
        }
      } else if (tableName === "DonDatHang") {
        if (!body.MaNCC && body.supplierId) body.MaNCC = body.supplierId;
        if (!ObjectId.isValid(body.MaNCC)) return res.status(400).json({ message: "Nhà cung cấp không hợp lệ" });
        body.MaNCC = new ObjectId(body.MaNCC);
        const suppDoc = await getDatabase().collection("NhaCungCap").findOne({ _id: body.MaNCC });
        if (!suppDoc) return res.status(400).json({ message: "Nhà cung cấp không tồn tại" });
        if (suppDoc.TrangThai === "Ngưng hoạt động" || suppDoc.status === "inactive") {
          return res.status(400).json({ message: "Nhà cung cấp đã ngưng hoạt động, không thể tạo đơn đặt hàng" });
        }
      }
      if (tableName === "DonDatHang") {
        const lines = body.items || body.details;
        if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ message: "Đơn đặt hàng phải có ít nhất một sản phẩm" });
        const products = getDatabase().collection("SanPham");
        let total = 0;
        for (const line of lines) {
          const productId = parseId(line.productId || line.id || line.MaSP);
          if (!productId) return res.status(400).json({ message: "Sản phẩm trong đơn đặt hàng không hợp lệ" });
          const productDoc = await products.findOne({ _id: productId });
          if (!productDoc) return res.status(400).json({ message: "Sản phẩm trong đơn đặt hàng không hợp lệ" });
          if (productDoc.TrangThai === "Ngừng bán" || productDoc.status === "inactive" || productDoc.status === "discontinued") {
            return res.status(400).json({ message: `Sản phẩm "${productDoc.TenSP}" đã ngừng bán, không thể đặt hàng` });
          }
          const quantity = Number(line.quantity || line.SoLuong);
          const price = Number(line.price ?? line.DonGia);
          if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) return res.status(400).json({ message: "Số lượng và đơn giá đặt hàng không hợp lệ" });
          total += quantity * price;
        }
        // Chuẩn hóa items: đảm bảo mỗi dòng có quantityReceived = 0 khi khởi tạo
        body.items = lines.map((line) => ({
          ...line,
          productId: parseId(line.productId || line.id || line.MaSP) || line.productId,
          quantity: Number(line.quantity || line.SoLuong),
          price: Number(line.price ?? line.DonGia ?? 0),
          quantityReceived: Number(line.quantityReceived ?? 0), // 0 khi tạo mới
        }));
        body.TongTien = total;
        // Trạng thái mặc định khi tạo PO mới
        const allowedStatuses = ["Nháp", "Đã đặt", "Đang chờ nhập", "Nhập một phần", "Hoàn thành", "Đã hủy", "Đang chờ", "Đã xác nhận"];
        if (!body.TrangThai || !allowedStatuses.includes(body.TrangThai)) {
          body.TrangThai = "Đang chờ nhập";
        }
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
      if (["PhieuThu", "PhieuChi"].includes(tableName)) {
        if (!body.NgayLap) body.NgayLap = new Date().toISOString().slice(0, 10);
        if (!body.TrangThai) body.TrangThai = "Đã lập";
        const soTien = Number(body.SoTien);
        body.SoTien = Number.isFinite(soTien) ? soTien : 0;
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
      recordAudit({
        userId: req.user?.id,
        username: req.user?.username || "system",
        role: req.user?.role || "System",
        action: "CREATE",
        module: routeName,
        entity: tableName,
        entityId: String(result.insertedId),
        description: `Thêm mới ${routeName}: ${document.TenSP || document.HoTen || document.TenNCC || document.TenLoai || document.MaDH || document.MaHD || result.insertedId}`,
        metadata: { id: result.insertedId },
        ip: req.ip,
      });
      res.status(201).json({ table: tableName, data: await serializeRecord(tableName, { _id: result.insertedId, ...document }), message: `Đã tạo ${routeName} thành công` });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const existingDoc = await findDocument(getDatabase().collection(tableName), tableName, req.params.id);
      if (!existingDoc) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
      const id = existingDoc._id;

      // YC4: Chặn sửa đổi PhieuThu/PhieuChi đã xác nhận
      if ((tableName === "PhieuThu" || tableName === "PhieuChi") && existingDoc.TrangThai === "CONFIRMED") {
        return res.status(400).json({
          message: `${tableName === "PhieuThu" ? "Phiếu thu" : "Phiếu chi"} đã xác nhận, không thể chỉnh sửa hoặc xóa.`,
        });
      }

      if (tableName === "CongNo") {

        const body = { ...req.body };
        const soTien = Number(body.SoTien ?? existingDoc.SoTien);
        if (!Number.isFinite(soTien) || soTien <= 0) {
          return res.status(400).json({ message: "Số tiền công nợ phải lớn hơn 0" });
        }
        const soTienDaTra = Math.max(0, Number(body.SoTienDaTra ?? existingDoc.SoTienDaTra) || 0);
        if (soTienDaTra > soTien) {
          return res.status(400).json({ message: `Số tiền đã thanh toán (${soTienDaTra}) không được vượt quá tổng nợ (${soTien})` });
        }
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
        recordAudit({
          userId: req.user?.id,
          username: req.user?.username || "system",
          role: req.user?.role || "System",
          action: "UPDATE",
          module: "debts",
          entity: "CongNo",
          entityId: String(id),
          description: `Cập nhật công nợ (${id})`,
          metadata: { id: String(id), soTienConLai, trangThai },
          ip: req.ip,
        });
        return res.json({
          table: "CongNo",
          data: await serializeRecord("CongNo", result),
          message: "Cập nhật công nợ thành công",
        });
      }
      const update = { ...req.body, updatedAt: new Date() };
      if (tableName === "SanPham") {
        if (update.GiaNhap !== undefined) {
          if (update.GiaNhap === null || String(update.GiaNhap).trim() === "") {
            return res.status(400).json({ message: "Giá nhập là bắt buộc và không được để trống" });
          }
          const gn = Number(update.GiaNhap);
          if (!Number.isFinite(gn) || gn <= 0) {
            return res.status(400).json({ message: "Giá nhập phải là số hợp lệ và lớn hơn 0" });
          }
          update.GiaNhap = gn;
        }
        if (update.GiaBan !== undefined) {
          if (update.GiaBan === null || String(update.GiaBan).trim() === "") {
            return res.status(400).json({ message: "Giá bán là bắt buộc và không được để trống" });
          }
          const gb = Number(update.GiaBan);
          if (!Number.isFinite(gb) || gb <= 0) {
            return res.status(400).json({ message: "Giá bán phải là số hợp lệ và lớn hơn 0" });
          }
          update.GiaBan = gb;
        }
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
      } else if (tableName === "LoaiHang") {
        if (update.TenLoai !== undefined) {
          if (!update.TenLoai || !String(update.TenLoai).trim()) {
            return res.status(400).json({ message: "Tên loại hàng không được để trống" });
          }
          const duplicateCat = await getDatabase().collection("LoaiHang").findOne({
            TenLoai: { $regex: new RegExp(`^${String(update.TenLoai).trim()}$`, "i") },
            _id: { $ne: id }
          });
          if (duplicateCat) {
            return res.status(409).json({ message: `Loại hàng "${update.TenLoai}" đã tồn tại` });
          }
        }
      } else if (tableName === "DonDatHang") {
        if (!update.MaNCC && update.supplierId) update.MaNCC = update.supplierId;
        if (update.MaNCC) {
          if (!ObjectId.isValid(update.MaNCC)) return res.status(400).json({ message: "Nhà cung cấp không hợp lệ" });
          update.MaNCC = new ObjectId(update.MaNCC);
          const suppDoc = await getDatabase().collection("NhaCungCap").findOne({ _id: update.MaNCC });
          if (!suppDoc) return res.status(400).json({ message: "Nhà cung cấp không tồn tại" });
          if (suppDoc.TrangThai === "Ngưng hoạt động" || suppDoc.status === "inactive") {
            return res.status(400).json({ message: "Nhà cung cấp đã ngưng hoạt động, không thể cập nhật đơn đặt hàng" });
          }
        }
      }
      if (tableName === "DonDatHang") {
        const lines = update.items || update.details;
        if (lines) {
          if (!Array.isArray(lines) || !lines.length) return res.status(400).json({ message: "Đơn đặt hàng phải có ít nhất một sản phẩm" });
          const products = getDatabase().collection("SanPham");
          for (const line of lines) {
            const productId = parseId(line.productId || line.id || line.MaSP);
            if (!productId) return res.status(400).json({ message: "Sản phẩm trong đơn đặt hàng không hợp lệ" });
            const productDoc = await products.findOne({ _id: productId });
            if (!productDoc) return res.status(400).json({ message: "Sản phẩm trong đơn đặt hàng không hợp lệ" });
            if (productDoc.TrangThai === "Ngừng bán" || productDoc.status === "inactive" || productDoc.status === "discontinued") {
              return res.status(400).json({ message: `Sản phẩm "${productDoc.TenSP}" đã ngừng bán, không thể đặt hàng` });
            }
          }
          update.TongTien = lines.reduce((sum, line) => sum + Number(line.quantity || line.SoLuong) * Number(line.price ?? line.DonGia), 0);
        }
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
      if (!result) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
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
        if (isLocked && (req.user?.username === uName || req.user?.id === String(existingDoc.userId || existingDoc._id))) {
          return res.status(400).json({ message: "Không thể tự khóa tài khoản của chính mình" });
        }
        await getDatabase().collection("Users").updateOne(
          { username: uName },
          { $set: { status: isLocked ? "Đã khóa" : "Hoạt động", updatedAt: new Date() } }
        );
      }

      recordAudit({
        userId: req.user?.id,
        username: req.user?.username || "system",
        role: req.user?.role || "System",
        action: "UPDATE",
        module: routeName,
        entity: tableName,
        entityId: String(id),
        description: `Cập nhật ${routeName} (${id})`,
        metadata: { id: String(id) },
        ip: req.ip,
      });
      res.json({ table: tableName, data: await serializeRecord(tableName, result), message: `Đã cập nhật ${routeName} thành công` });
    } catch (error) {
      next(error);
    }
  });

  // Delete handler with smart soft-delete
  router.delete("/:id", async (req, res, next) => {
    try {
      const db = getDatabase();

      // YC3: Công nợ không được phép xóa trực tiếp - phải xử lý qua phiếu thanh toán/điều chỉnh nghiệp vụ
      if (tableName === "CongNo") {
        return res.status(403).json({
          message: "Không được phép xóa công nợ. Công nợ phải được xử lý thông qua phiếu thanh toán hoặc điều chỉnh chứng từ nguồn.",
        });
      }

      const existingDoc = await findDocument(db.collection(tableName), tableName, req.params.id);
      if (!existingDoc) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
      const id = existingDoc._id;

      // YC4: Chặn xóa PhieuThu/PhieuChi đã xác nhận
      if ((tableName === "PhieuThu" || tableName === "PhieuChi") && existingDoc.TrangThai === "CONFIRMED") {
        return res.status(400).json({
          message: `${tableName === "PhieuThu" ? "Phiếu thu" : "Phiếu chi"} đã xác nhận, không thể chỉnh sửa hoặc xóa.`,
        });
      }

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

      // Check for LoaiHang: cannot delete if products are linked
      if (tableName === "LoaiHang") {
        const catMatches = [id, String(id)];
        if (existingDoc.MaLoai) catMatches.push(existingDoc.MaLoai);
        const hasProducts = await db.collection("SanPham").findOne({
          $or: [
            { MaLoai: { $in: catMatches } },
            { LoaiHang: existingDoc.TenLoai },
          ],
        });
        if (hasProducts) {
          return res.status(400).json({
            message: `Không thể xóa loại hàng "${existingDoc.TenLoai}" vì đang có sản phẩm thuộc danh mục này.`,
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
        const hasPayments = await db.collection("PhieuChi").findOne({ MaNCC: { $in: idMatches } });

        if (hasPurchaseOrders || hasReceipts || hasDebts || hasPayments) {
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

      // ERR-03 & ERR-04: Chặn xóa vật lý chứng từ kế toán — phải hủy qua trạng thái
      const PROTECTED_VOUCHERS = ["PhieuNhap", "HoaDon", "DonHang", "PhieuXuat", "DonDatHang"];
      if (PROTECTED_VOUCHERS.includes(tableName)) {
        const voucherNames = {
          PhieuNhap: "Phiếu nhập kho",
          HoaDon: "Hóa đơn bán hàng",
          DonHang: "Đơn hàng",
          PhieuXuat: "Phiếu xuất kho",
          DonDatHang: "Đơn đặt hàng",
        };
        return res.status(403).json({
          message: `Không được phép xóa ${voucherNames[tableName] || tableName}. Chứng từ kế toán chỉ có thể hủy bỏ thông qua chức năng cập nhật trạng thái, không được xóa vật lý.`,
        });
      }

      const result = await db.collection(tableName).deleteOne({ _id: id });
      if (!result.deletedCount) return res.status(404).json({ message: `Không tìm thấy ${routeName}` });
      recordAudit({
        userId: req.user?.id,
        username: req.user?.username || "system",
        role: req.user?.role || "System",
        action: "DELETE",
        module: routeName,
        entity: tableName,
        entityId: String(id),
        description: `Xóa ${routeName} (${id})`,
        metadata: { id: String(id) },
        ip: req.ip,
      });
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
