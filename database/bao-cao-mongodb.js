// Bao cao MongoDB cho he thong quan ly Me & Be
// Chay trong mongosh hoac MongoDB Compass Shell.
// Vi du: mongosh "mongodb://127.0.0.1:27017/baby_shop_management" database/bao-cao-mongodb.js

const reportDb = db.getSiblingDB("baby_shop_management");

function section(title) {
  print(`\n========== ${title} ==========`);
}

// 1. Tong quan he thong
section("TONG QUAN");
printjson({
  sanPham: reportDb.SanPham.countDocuments(),
  khachHang: reportDb.KhachHang.countDocuments(),
  donHang: reportDb.DonHang.countDocuments(),
  hoaDon: reportDb.HoaDon.countDocuments(),
  nhaCungCap: reportDb.NhaCungCap.countDocuments(),
});

// 2. Tong doanh thu, da thu va con phai thu theo trang thai hoa don
section("TONG HOP HOA DON");
printjson(reportDb.HoaDon.aggregate([
  {
    $group: {
      _id: "$TrangThai",
      soHoaDon: { $sum: 1 },
      tongGiaTri: { $sum: { $toDouble: { $ifNull: ["$TongTien", 0] } } },
      daThu: { $sum: { $toDouble: { $ifNull: ["$SoTienDaTra", 0] } } },
      conPhaiThu: { $sum: { $toDouble: { $ifNull: ["$SoTienConLai", "$TongTien"] } } },
    },
  },
  { $sort: { tongGiaTri: -1 } },
]).toArray());

// 3. Doanh thu theo ngay lap hoa don
section("DOANH THU THEO NGAY");
printjson(reportDb.HoaDon.aggregate([
  {
    $group: {
      _id: "$NgayLap",
      soHoaDon: { $sum: 1 },
      doanhThu: { $sum: { $toDouble: { $ifNull: ["$TongTien", 0] } } },
      daThu: { $sum: { $toDouble: { $ifNull: ["$SoTienDaTra", 0] } } },
    },
  },
  { $sort: { _id: 1 } },
]).toArray());

// 4. Doanh thu theo thang
section("DOANH THU THEO THANG");
printjson(reportDb.HoaDon.aggregate([
  {
    $project: {
      thang: { $substr: [{ $toString: "$NgayLap" }, 0, 7] },
      TongTien: { $toDouble: { $ifNull: ["$TongTien", 0] } },
      SoTienDaTra: { $toDouble: { $ifNull: ["$SoTienDaTra", 0] } },
    },
  },
  {
    $group: {
      _id: "$thang",
      soHoaDon: { $sum: 1 },
      doanhThu: { $sum: "$TongTien" },
      daThu: { $sum: "$SoTienDaTra" },
    },
  },
  { $sort: { _id: 1 } },
]).toArray());

// 5. Doanh thu theo danh muc san pham
section("DOANH THU THEO DANH MUC");
printjson(reportDb.HoaDon.aggregate([
  { $unwind: "$details" },
  {
    $lookup: {
      from: "SanPham",
      localField: "details.MaSP",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "LoaiHang",
      localField: "product.MaLoai",
      foreignField: "_id",
      as: "category",
    },
  },
  { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
  {
    $group: {
      _id: { $ifNull: ["$category.TenLoai", "Chua phan loai"] },
      soLuongBan: { $sum: { $toInt: { $ifNull: ["$details.SoLuong", "$details.quantity"] } } },
      doanhThu: {
        $sum: {
          $toDouble: {
            $ifNull: [
              "$details.ThanhTien",
              { $multiply: [
                { $toDouble: { $ifNull: ["$details.SoLuong", "$details.quantity"] } },
                { $toDouble: { $ifNull: ["$details.DonGia", "$details.price"] } },
              ] },
            ],
          },
        },
      },
    },
  },
  { $sort: { doanhThu: -1 } },
]).toArray());

// 6. Top san pham ban chay
section("TOP SAN PHAM BAN CHAY");
printjson(reportDb.HoaDon.aggregate([
  { $unwind: "$details" },
  {
    $group: {
      _id: "$details.MaSP",
      soLuongBan: { $sum: { $toInt: { $ifNull: ["$details.SoLuong", "$details.quantity"] } } },
      doanhThu: {
        $sum: {
          $toDouble: {
            $ifNull: [
              "$details.ThanhTien",
              { $multiply: [
                { $toDouble: { $ifNull: ["$details.SoLuong", "$details.quantity"] } },
                { $toDouble: { $ifNull: ["$details.DonGia", "$details.price"] } },
              ] },
            ],
          },
        },
      },
    },
  },
  {
    $lookup: {
      from: "SanPham",
      localField: "_id",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      maSanPham: { $ifNull: ["$product.MaSP", "$_id"] },
      tenSanPham: { $ifNull: ["$product.TenSP", "Khong xac dinh"] },
      soLuongBan: 1,
      doanhThu: 1,
    },
  },
  { $sort: { soLuongBan: -1, doanhThu: -1 } },
  { $limit: 10 },
]).toArray());

// 7. Ton kho va canh bao san pham sap het
section("TON KHO VA CANH BAO");
printjson(reportDb.SanPham.aggregate([
  {
    $lookup: {
      from: "TonKho",
      localField: "_id",
      foreignField: "MaSP",
      as: "stockRecord",
    },
  },
  { $unwind: { path: "$stockRecord", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      maSanPham: "$MaSP",
      tenSanPham: "$TenSP",
      donViTinh: "$DonViTinh",
      giaBan: "$GiaBan",
      tonKho: { $toInt: { $ifNull: ["$stockRecord.SoLuongTon", "$stock"] } },
      trangThai: "$TrangThai",
    },
  },
  { $sort: { tonKho: 1, tenSanPham: 1 } },
]).toArray());

// 8. Doanh thu theo khach hang
section("DOANH THU THEO KHACH HANG");
printjson(reportDb.HoaDon.aggregate([
  {
    $group: {
      _id: "$MaKH",
      soHoaDon: { $sum: 1 },
      tongMua: { $sum: { $toDouble: { $ifNull: ["$TongTien", 0] } } },
      daThanhToan: { $sum: { $toDouble: { $ifNull: ["$SoTienDaTra", 0] } } },
      conNo: { $sum: { $toDouble: { $ifNull: ["$SoTienConLai", "$TongTien"] } } },
    },
  },
  {
    $lookup: {
      from: "KhachHang",
      localField: "_id",
      foreignField: "_id",
      as: "customer",
    },
  },
  { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      maKhachHang: { $ifNull: ["$customer.MaKH", "Khach le"] },
      tenKhachHang: { $ifNull: ["$customer.HoTen", "Khach le"] },
      soHoaDon: 1,
      tongMua: 1,
      daThanhToan: 1,
      conNo: 1,
    },
  },
  { $sort: { tongMua: -1 } },
]).toArray());

// 9. Cong no khach hang va nha cung cap
section("CONG NO");
printjson(reportDb.CongNo.aggregate([
  {
    $lookup: {
      from: "KhachHang",
      localField: "MaKH",
      foreignField: "_id",
      as: "customer",
    },
  },
  {
    $lookup: {
      from: "NhaCungCap",
      localField: "MaNCC",
      foreignField: "_id",
      as: "supplier",
    },
  },
  { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      maCongNo: "$MaCN",
      doiTuong: { $ifNull: ["$customer.HoTen", "$supplier.TenNCC"] },
      loaiCongNo: 1,
      ngayPhatSinh: 1,
      soTien: { $toDouble: { $ifNull: ["$SoTien", 0] } },
      daTra: { $toDouble: { $ifNull: ["$SoTienDaTra", 0] } },
      conLai: { $toDouble: { $ifNull: ["$SoTienConLai", 0] } },
      trangThai: 1,
    },
  },
  { $sort: { conLai: -1 } },
]).toArray());

// 10. Phuong thuc thanh toan
section("PHUONG THUC THANH TOAN");
printjson(reportDb.ThanhToan.aggregate([
  {
    $group: {
      _id: "$PhuongThuc",
      soGiaoDich: { $sum: 1 },
      tongTien: { $sum: { $toDouble: { $ifNull: ["$SoTien", 0] } } },
    },
  },
  { $sort: { tongTien: -1 } },
]).toArray());

print("\nDa chay xong cac bao cao MongoDB.\n");
