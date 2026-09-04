import { ObjectId } from "mongodb";
import { syncEmployee } from "../modules/auth/accountEmployee.js";
import { hashPassword } from "../modules/auth/password.js";

export async function seedDatabase(database) {
  const now = new Date();
  const adminAccount = {
    username: process.env.ADMIN_USERNAME || "admin",
    fullName: process.env.ADMIN_FULL_NAME || "Quản trị viên",
    role: "QuanLy",
    status: "active",
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || "admin123"),
    createdAt: now,
  };
  await database.collection("Users").updateOne(
    { username: adminAccount.username },
    {
      $set: {
        fullName: adminAccount.fullName,
        role: "QuanLy",
        status: "active",
      },
      $setOnInsert: adminAccount,
    },
    { upsert: true },
  );
  await syncEmployee(database, adminAccount);

  if (await database.collection("_metadata").findOne({ key: "initial-seed-v1" })) {
    await database.collection("VaiTro").updateOne({ MaVaiTro: 5 }, { $set: { MaVaiTro: 5, TenVaiTro: "Nhân viên mua hàng" } }, { upsert: true });
    return;
  }
  const categories = ["Sữa", "Bỉm/tã", "Quần áo trẻ em", "Đồ dùng cho bé", "Đồ chơi", "Chăm sóc mẹ và bé"].map((TenLoai, index) => ({ _id: new ObjectId(), MaLoai: index + 1, TenLoai, MoTa: "Danh mục sản phẩm mẹ và bé" }));
  const suppliers = [
    { _id: new ObjectId(), MaNCC: "NCC001", TenNCC: "Công ty TNHH Pigeon Việt Nam", SDT: "0281234567", DiaChi: "KCN Amata, Biên Hòa, Đồng Nai", Email: "contact@pigeon.vn" },
    { _id: new ObjectId(), MaNCC: "NCC002", TenNCC: "Công ty CP Mamamy", SDT: "0246677889", DiaChi: "Hoàng Mai, Hà Nội", Email: "hello@mamamy.vn" },
    { _id: new ObjectId(), MaNCC: "NCC003", TenNCC: "Nhà phân phối Bỉm Sạch", SDT: "0243876543", DiaChi: "Long Biên, Hà Nội", Email: "contact@bimsach.vn" }
  ];
  const customers = [
    { _id: new ObjectId(), MaKH: "KH001", HoTen: "Nguyễn Thị Hồng", SDT: "0901234567", Email: "hong.nt@gmail.com", DiaChi: "12 Láng Hạ, Hà Nội", DiemTichLuy: 320 },
    { _id: new ObjectId(), MaKH: "KH002", HoTen: "Trần Minh Anh", SDT: "0912345678", Email: "anh.tm@gmail.com", DiaChi: "45 Cầu Giấy, Hà Nội", DiemTichLuy: 150 },
    { _id: new ObjectId(), MaKH: "KH003", HoTen: "Lê Thu Trang", SDT: "0987654321", Email: "trang.le@gmail.com", DiaChi: "8 Kim Mã, Hà Nội", DiemTichLuy: 80 }
  ];
  const products = [
    ["SP001", "Sữa Aptamil số 2 900g", "Hộp", 420000, 520000, "2027-05-01", 24, 0],
    ["SP002", "Sữa Meiji nội địa 800g", "Hộp", 380000, 470000, "2027-03-15", 6, 0],
    ["SP003", "Bỉm Bobby size M 66", "Gói", 180000, 229000, "2028-01-01", 40, 1],
    ["SP004", "Bỉm Merries size S 82", "Gói", 210000, 265000, "2028-02-01", 5, 1],
    ["SP005", "Bộ quần áo cotton 0-3M", "Bộ", 65000, 99000, "", 30, 2],
    ["SP006", "Bình sữa Philips Avent 260ml", "Cái", 120000, 159000, "", 18, 3],
    ["SP007", "Xúc xắc gỗ an toàn", "Cái", 35000, 59000, "", 50, 4],
    ["SP008", "Dầu massage bụng bầu 100ml", "Chai", 95000, 139000, "2027-08-01", 12, 5],
    ["SP009", "Bỉm Pampers size M (44 miếng)", "Gói", 210000, 255000, "2027-12-31", 22, 1],
    ["SP010", "Bình sữa Pigeon cổ rộng 240ml", "Cái", 140000, 185000, "", 16, 3],
    ["SP011", "Khăn ướt Mamamy 3 gói", "Bịch", 65000, 89000, "2028-06-30", 60, 5]
  ].map(([MaSP, TenSP, DonViTinh, GiaNhap, GiaBan, HanSuDung, stock, categoryIndex]) => ({ _id: new ObjectId(), MaSP, TenSP, MaLoai: categories[categoryIndex]._id, DonViTinh, GiaNhap, GiaBan, HanSuDung, TrangThai: "Đang bán", stock, createdAt: now }));
  await database.collection("LoaiHang").insertMany(categories);
  await database.collection("NhaCungCap").insertMany(suppliers);
  await database.collection("KhachHang").insertMany(customers);
  await database.collection("SanPham").insertMany(products);
  await database.collection("TonKho").insertMany(products.map((product) => ({ MaSP: product._id, SoLuongTon: product.stock, NgayCapNhat: now.toISOString().slice(0, 10), updatedAt: now })));
  await database.collection("VaiTro").insertMany([{ MaVaiTro: 1, TenVaiTro: "Quản lý" }, { MaVaiTro: 2, TenVaiTro: "Nhân viên bán hàng" }, { MaVaiTro: 3, TenVaiTro: "Nhân viên kho" }, { MaVaiTro: 4, TenVaiTro: "Kế toán" }, { MaVaiTro: 5, TenVaiTro: "Nhân viên mua hàng" }]);
  await database.collection("_metadata").insertOne({ key: "initial-seed-v1", createdAt: now, source: "Nhom1_baiktraso1 (1).docx + schema.sql" });
  console.log(`Seeded ${products.length} products, ${customers.length} customers and ${suppliers.length} suppliers`);
}
