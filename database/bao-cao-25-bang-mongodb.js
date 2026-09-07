// Bao cao doi chieu 25 bang logic cua he thong MongoDB.
// Chay trong mongosh:
// mongosh "mongodb://127.0.0.1:27017/baby_shop_management" database/bao-cao-25-bang-mongodb.js

const reportDb = db.getSiblingDB("baby_shop_management");

const baseCollections = [
  "VaiTro", "NhanVien", "KhachHang", "NhaCungCap", "LoaiHang", "SanPham",
  "DonDatHang", "DonHang", "HoaDon", "ThanhToan", "PhieuNhap", "PhieuXuat",
  "TonKho", "KiemKe", "PhieuTraHang", "KhuyenMai", "CongNo",
];
const detailCollections = [
  "CT_DonDatHang", "CT_DonHang", "CT_HoaDon", "CT_PhieuNhap",
  "CT_PhieuXuat", "CT_PhieuTraHang", "CT_KiemKe", "CT_KhuyenMai",
];
const systemCollections = ["Users", "_metadata"];
const allCollections = [...baseCollections, ...detailCollections];
const primaryKeys = {
  VaiTro: ["MaVaiTro"], NhanVien: ["MaNV"], KhachHang: ["MaKH"], NhaCungCap: ["MaNCC"],
  LoaiHang: ["MaLoai"], SanPham: ["MaSP"], DonDatHang: ["MaDDH"], CT_DonDatHang: ["MaDDH", "MaSP"],
  PhieuNhap: ["MaPN"], CT_PhieuNhap: ["MaPN", "MaSP"], DonHang: ["MaDH"], CT_DonHang: ["MaDH", "MaSP"],
  HoaDon: ["MaHD"], CT_HoaDon: ["MaHD", "MaSP"], ThanhToan: ["MaTT"], PhieuXuat: ["MaPX"],
  CT_PhieuXuat: ["MaPX", "MaSP"], TonKho: ["MaSP"], KiemKe: ["MaKK"], CT_KiemKe: ["MaKK", "MaSP"],
  PhieuTraHang: ["MaPTH"], CT_PhieuTraHang: ["MaPTH", "MaSP"], KhuyenMai: ["MaKM"],
  CT_KhuyenMai: ["MaKM", "MaSP"], CongNo: ["MaCN"],
};
const foreignKeys = [
  ["NhanVien", "MaVaiTro", "VaiTro", "MaVaiTro"],
  ["SanPham", "MaLoai", "LoaiHang"],
  ["DonDatHang", "MaNCC", "NhaCungCap"],
  ["DonDatHang", "MaNV", "NhanVien"],
  ["CT_DonDatHang", "MaDDH", "DonDatHang"],
  ["CT_DonDatHang", "MaSP", "SanPham"],
  ["PhieuNhap", "MaDDH", "DonDatHang"],
  ["PhieuNhap", "MaNV", "NhanVien"],
  ["CT_PhieuNhap", "MaPN", "PhieuNhap"],
  ["CT_PhieuNhap", "MaSP", "SanPham"],
  ["DonHang", "MaKH", "KhachHang"],
  ["DonHang", "MaNV", "NhanVien"],
  ["CT_DonHang", "MaDH", "DonHang"],
  ["CT_DonHang", "MaSP", "SanPham"],
  ["HoaDon", "MaDH", "DonHang"],
  ["HoaDon", "MaNV", "NhanVien"],
  ["CT_HoaDon", "MaHD", "HoaDon"],
  ["CT_HoaDon", "MaSP", "SanPham"],
  ["ThanhToan", "MaHD", "HoaDon"],
  ["PhieuXuat", "MaDH", "DonHang"],
  ["PhieuXuat", "MaNV", "NhanVien"],
  ["CT_PhieuXuat", "MaPX", "PhieuXuat"],
  ["CT_PhieuXuat", "MaSP", "SanPham"],
  ["TonKho", "MaSP", "SanPham"],
  ["KiemKe", "MaNV", "NhanVien"],
  ["CT_KiemKe", "MaKK", "KiemKe"],
  ["CT_KiemKe", "MaSP", "SanPham"],
  ["PhieuTraHang", "MaDH", "DonHang"],
  ["PhieuTraHang", "MaKH", "KhachHang"],
  ["PhieuTraHang", "MaNV", "NhanVien"],
  ["CT_PhieuTraHang", "MaPTH", "PhieuTraHang"],
  ["CT_PhieuTraHang", "MaSP", "SanPham"],
  ["CT_KhuyenMai", "MaKM", "KhuyenMai"],
  ["CT_KhuyenMai", "MaSP", "SanPham"],
  ["CongNo", "MaNCC", "NhaCungCap"],
  ["CongNo", "MaNV", "NhanVien"],
];

function count(name) {
  return reportDb.getCollection(name).countDocuments();
}

print("\n========== DOI CHIEU 25 BANG LOGIC ==========");
printjson({
  soBangLogic: allCollections.length,
  bangCoDu: allCollections.filter((name) => reportDb.getCollectionNames().includes(name)).length,
  bangThieu: allCollections.filter((name) => !reportDb.getCollectionNames().includes(name)),
  collectionHeThong: systemCollections.filter((name) => reportDb.getCollectionNames().includes(name)),
});

print("\n========== SO LUONG DOCUMENT THEO BANG ==========");
printjson(allCollections.map((name) => ({
  collection: name,
  soDocument: count(name),
  loai: detailCollections.includes(name) ? "chi tiet" : "nghiep vu",
  primaryKey: primaryKeys[name],
})));

print("\n========== KIEM TRA KHOA CHINH BI THIEU ==========");
for (const name of allCollections) {
  const missing = reportDb.getCollection(name).countDocuments({ $or: primaryKeys[name].map((field) => ({ [field]: { $exists: false } })) });
  if (missing) printjson({ collection: name, soDongThieuPK: missing });
}

print("\n========== KIEM TRA KHOA NGOAI MOI ==========");
for (const [child, field, parent, parentField = "_id"] of foreignKeys) {
  const missing = reportDb.getCollection(child).aggregate([
    { $match: { [field]: { $exists: true, $ne: null } } },
    { $lookup: { from: parent, localField: field, foreignField: parentField, as: "parent" } },
    { $match: { parent: { $size: 0 } } },
    { $count: "count" },
  ]).toArray();
  const result = missing[0]?.count || 0;
  if (result) printjson({ bangCon: child, truongFK: field, bangCha: parent, soDongMoCo: result });
}

print("\n========== DOI CHIEU CHUNG TU VA CHI TIET ==========");
for (const [parent, detail] of [
  ["DonDatHang", "CT_DonDatHang"],
  ["DonHang", "CT_DonHang"],
  ["HoaDon", "CT_HoaDon"],
  ["PhieuNhap", "CT_PhieuNhap"],
  ["PhieuXuat", "CT_PhieuXuat"],
  ["KiemKe", "CT_KiemKe"],
  ["PhieuTraHang", "CT_PhieuTraHang"],
  ["KhuyenMai", "CT_KhuyenMai"],
]) {
  printjson({
    bangCha: parent,
    soBangCha: count(parent),
    bangChiTiet: detail,
    soDongChiTiet: count(detail),
  });
}

print("\n========== CAC TRUONG MO RONG SO VOI SQL ==========");
printjson({
  HoaDon: ["SoTienDaTra", "SoTienConLai", "MaKH", "details"],
  CongNo: ["LoaiCongNo", "MaKH", "MaHD", "MaDH"],
  ChungTu: ["createdAt", "updatedAt", "details/items"],
  HeThong: systemCollections,
});

print("\nDa chay xong bao cao 25 bang logic MongoDB.\n");
