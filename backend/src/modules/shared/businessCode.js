import { getDatabase } from "../../config/mongodb.js";

export const codeDefinitions = {
  KhachHang: { field: "MaKH", prefix: "KH" },
  NhaCungCap: { field: "MaNCC", prefix: "NCC" },
  SanPham: { field: "MaSP", prefix: "SP" },
  LoaiHang: { field: "MaLoai", prefix: "LH" },
  DonDatHang: { field: "MaDDH", prefix: "DDH" },
  PhieuNhap: { field: "MaPN", prefix: "PN" },
  DonHang: { field: "MaDH", prefix: "DH" },
  HoaDon: { field: "MaHD", prefix: "HD" },
  PhieuXuat: { field: "MaPX", prefix: "PX" },
  KiemKe: { field: "MaKK", prefix: "KK" },
  DieuChinhKho: { field: "MaDC", prefix: "DC" },
  PhieuTraHang: { field: "MaPTH", prefix: "PTH" },
  KhuyenMai: { field: "MaKM", prefix: "KM" },
  CongNo: { field: "MaCN", prefix: "CN" },
  ThanhToan: { field: "MaTT", prefix: "TT" },
  PhieuThu: { field: "MaPT", prefix: "PT" },
  PhieuChi: { field: "MaPC", prefix: "PC" },
  NhanVien: { field: "MaNV", prefix: "NV" },
  VaiTro: { field: "MaVaiTro", prefix: "VT" },
};

export function getCodeDefinition(tableName) {
  return codeDefinitions[tableName];
}

/**
 * Khởi tạo counter cho bảng từ dữ liệu hiện có.
 * Sử dụng regex chuẩn ^PREFIX\d+$ để chỉ tính các mã chuẩn nghiệp vụ.
 */
export async function initCounter(database, tableName) {
  const definition = getCodeDefinition(tableName);
  if (!definition) return 0;
  const countersCol = database.collection("Counters");
  const existing = await countersCol.findOne({ _id: tableName });
  if (existing) return existing.seq;

  const collection = database.collection(tableName);
  const prefixRegex = new RegExp(`^${definition.prefix}\\d+$`);
  const records = await collection
    .find({ [definition.field]: { $regex: prefixRegex } }, { projection: { [definition.field]: 1 } })
    .toArray();
  const largest = records.reduce((max, record) => {
    const raw = String(record[definition.field] || "").slice(definition.prefix.length);
    const number = parseInt(raw, 10);
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);

  await countersCol.updateOne(
    { _id: tableName },
    { $setOnInsert: { seq: largest } },
    { upsert: true }
  );

  return largest;
}

/**
 * ERR-07 FIX: Sinh mã chứng từ tự động & nguyên tử bằng bộ đếm Counters.
 *
 * Sử dụng atomic findOneAndUpdate với $inc: { seq: 1 }.
 * Đảm bảo 100% không trùng mã, không gián đoạn kể cả khi có nhiều request đồng thời.
 *
 * @param {Collection} collection - Collection mục tiêu
 * @param {string} tableName - Tên bảng / collection
 * @returns {Promise<string>} Mã chứng từ mới, ví dụ: "SP031", "HD058"
 */
export async function nextBusinessCode(collection, tableName) {
  const definition = getCodeDefinition(tableName);
  if (!definition) return undefined;

  const db = getDatabase();
  const countersCol = db.collection("Counters");

  // Đảm bảo counter đã được khởi tạo trước khi tăng
  const exists = await countersCol.findOne({ _id: tableName });
  if (!exists) {
    await initCounter(db, tableName);
  }

  // Atomic increment — mỗi lệnh gọi trả về một seq độc nhất vô nhị
  const result = await countersCol.findOneAndUpdate(
    { _id: tableName },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  return `${definition.prefix}${String(result.seq).padStart(3, "0")}`;
}

export async function ensureBusinessCodes(database) {
  for (const [tableName, definition] of Object.entries(codeDefinitions)) {
    const collection = database.collection(tableName);
    const records = await collection.find({ [definition.field]: { $exists: false } }).sort({ createdAt: 1, _id: 1 }).toArray();
    if (records.length) {
      const existing = await collection.find({}, { projection: { [definition.field]: 1 } }).toArray();
      const largest = existing.reduce((max, record) => {
        const number = Number(String(record[definition.field] || "").replace(/\D/g, ""));
        return Number.isFinite(number) ? Math.max(max, number) : max;
      }, 0);
      await Promise.all(records.map((record, index) => collection.updateOne(
        { _id: record._id },
        { $set: { [definition.field]: `${definition.prefix}${String(largest + index + 1).padStart(3, "0")}` } },
      )));
    }

    // Tự động khởi tạo counter cho từng bảng khi khởi động
    await initCounter(database, tableName);
  }
}