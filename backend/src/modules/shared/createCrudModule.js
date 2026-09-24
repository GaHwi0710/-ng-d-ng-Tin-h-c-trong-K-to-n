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
      return "Giá nhập là bắt buộc";
    }
    const giaNhap = Number(body.GiaNhap);
    if (!Number.isFinite(giaNhap) || giaNhap < 0) {
      return "Giá nhập phải là số hợp lệ và lớn hơn hoặc bằng 0";
    }

    if (body.GiaBan === undefined || body.GiaBan === null || String(body.GiaBan).trim() === "") {
      return "Giá bán là bắt buộc";
    }
    const giaBan = Number(body.GiaBan);
    if (!Number.isFinite(giaBan) || giaBan < 0) {
      return "Giá bán phải là số hợp lệ và lớn hơn hoặc bằng 0";
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

export function createCrudModule(routeName, tableName) {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const data = await getDatabase().collection(tableName).find().sort({ createdAt: -1 }).toArray();
      res.json({ table: tableName, data: await Promise.all(data.map((item) => serializeRecord(tableName, item))), message: `Danh sách ${routeName}` });
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
          return res.status(400).json({ message: "Giá nhập là bắt buộc" });
        }
        const gn = Number(body.GiaNhap);
        if (!Number.isFinite(gn) || gn < 0) {
          return res.status(400).json({ message: "Giá nhập phải là số hợp lệ và lớn hơn hoặc bằng 0" });
        }
        if (body.GiaBan === undefined || body.GiaBan === null || String(body.GiaBan).trim() === "") {
          return res.status(400).json({ message: "Giá bán là bắt buộc" });
        }
        const gb = Number(body.GiaBan);
        if (!Number.isFinite(gb) || gb < 0) {
          return res.status(400).json({ message: "Giá bán phải là số hợp lệ và lớn hơn hoặc bằng 0" });
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
      if (tableName === "KhuyenMai") await replaceDetails(getDatabase(), "CT_KhuyenMai", result.insertedId, document.details || document.items);
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
        if (!result) return res.status(404).json({ message: "Không tìm thấy công nợ" });
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
            return res.status(400).json({ message: "Giá nhập là bắt buộc" });
          }
          const gn = Number(update.GiaNhap);
          if (!Number.isFinite(gn) || gn < 0) {
            return res.status(400).json({ message: "Giá nhập phải là số hợp lệ và lớn hơn hoặc bằng 0" });
          }
          update.GiaNhap = gn;
        }
        if (update.GiaBan !== undefined) {
          if (update.GiaBan === null || String(update.GiaBan).trim() === "") {
            return res.status(400).json({ message: "Giá bán là bắt buộc" });
          }
          const gb = Number(update.GiaBan);
          if (!Number.isFinite(gb) || gb < 0) {
            return res.status(400).json({ message: "Giá bán phải là số hợp lệ và lớn hơn hoặc bằng 0" });
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
      res.json({ table: tableName, data: await serializeRecord(tableName, result), message: `Đã cập nhật ${routeName} thành công` });
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

      if (tableName === "PhieuNhap") {
        await db.collection("CongNo").deleteMany({
          $or: [
            { MaPN: id },
            { MaPN: String(id) },
            ...(existingDoc.MaPN ? [{ MaPN: existingDoc.MaPN }] : []),
          ]
        });
        await db.collection("CT_PhieuNhap").deleteMany({
          $or: [
            { MaPN: id },
            { MaPN: String(id) },
            ...(existingDoc.MaPN ? [{ MaPN: existingDoc.MaPN }] : []),
          ]
        });
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
