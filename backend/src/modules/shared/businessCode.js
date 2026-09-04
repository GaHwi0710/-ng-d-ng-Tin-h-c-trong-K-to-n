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
  PhieuTraHang: { field: "MaPTH", prefix: "PTH" },
  KhuyenMai: { field: "MaKM", prefix: "KM" },
  CongNo: { field: "MaCN", prefix: "CN" },
  ThanhToan: { field: "MaTT", prefix: "TT" },
  NhanVien: { field: "MaNV", prefix: "NV" },
  VaiTro: { field: "MaVaiTro", prefix: "VT" },
};

export function getCodeDefinition(tableName) {
  return codeDefinitions[tableName];
}

export async function nextBusinessCode(collection, tableName) {
  const definition = getCodeDefinition(tableName);
  if (!definition) return undefined;

  const records = await collection.find(
    { [definition.field]: { $exists: true } },
    { projection: { [definition.field]: 1 } },
  ).toArray();
  const largest = records.reduce((max, record) => {
    const number = Number(String(record[definition.field] || "").replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `${definition.prefix}${String(largest + 1).padStart(3, "0")}`;
}

export async function ensureBusinessCodes(database) {
  for (const [tableName, definition] of Object.entries(codeDefinitions)) {
    const collection = database.collection(tableName);
    const records = await collection.find({ [definition.field]: { $exists: false } }).sort({ createdAt: 1, _id: 1 }).toArray();
    if (!records.length) continue;

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
}