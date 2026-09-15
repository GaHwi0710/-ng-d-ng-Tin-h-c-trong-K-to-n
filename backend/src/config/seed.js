import { ObjectId } from "mongodb";
import { syncEmployee } from "../modules/auth/accountEmployee.js";
import { hashPassword } from "../modules/auth/password.js";
import { ensureBusinessCodes } from "../modules/shared/businessCode.js";
import { backfillDetailCollections, ensureDetailCollections } from "../modules/shared/detailCollections.js";

export async function seedDatabase(database) {
  const now = new Date();
  await ensureDetailCollections(database);
  await ensureBusinessCodes(database);

  // Đảm bảo mọi sản phẩm đều có tồn kho trong TonKho (không ghi đè nếu đã có)
  const existingProds = await database.collection("SanPham").find({}).toArray();
  for (const p of existingProds) {
    await database.collection("TonKho").updateOne(
      { MaSP: p._id },
      {
        $setOnInsert: {
          MaSP: p._id,
          SoLuongTon: Number(p.stock || 0),
          NgayCapNhat: now.toISOString().slice(0, 10),
          updatedAt: now,
        },
      },
      { upsert: true }
    );
  }

  // Nếu cơ sở dữ liệu đã được khởi tạo ban đầu, TUYỆT ĐỐI KHÔNG RESET hay ghi đè bất kỳ dữ liệu người dùng nào!
  if (await database.collection("_metadata").findOne({ key: "initial-seed-v1" })) {
    await database.collection("VaiTro").updateOne(
      { MaVaiTro: 5 },
      { $setOnInsert: { MaVaiTro: 5, TenVaiTro: "Nhân viên mua hàng" } },
      { upsert: true }
    );
    return;
  }

  for (const [roleCode, roleName] of [[1, "Quản lý"], [2, "Nhân viên bán hàng"], [3, "Nhân viên kho"], [4, "Kế toán"], [5, "Nhân viên mua hàng"]]) {
    await database.collection("NhanVien").updateMany({ VaiTro: roleName }, { $set: { MaVaiTro: roleCode } });
  }
  await backfillDetailCollections(database);
  const defaultAccounts = [
    {
      username: process.env.ADMIN_USERNAME || "admin",
      fullName: process.env.ADMIN_FULL_NAME || "Quản trị viên",
      role: "QuanLy",
      status: "active",
      password: process.env.ADMIN_PASSWORD || "admin123",
      CCCD: "001095012345",
      DiaChi: "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội",
      SDT: "0981234567",
    },
    {
      username: "maianh",
      fullName: "Nguyễn Mai Anh",
      role: "NhanVienBanHang",
      status: "active",
      password: "maianh123",
      CCCD: "001198023456",
      DiaChi: "15 Chùa Bộc, Đống Đa, Hà Nội",
      SDT: "0972345678",
    },
    {
      username: "vanhung",
      fullName: "Trần Văn Hùng",
      role: "NhanVienKho",
      status: "active",
      password: "vanhung123",
      CCCD: "001093034567",
      DiaChi: "88 Cầu Giấy, Cầu Giấy, Hà Nội",
      SDT: "0963456789",
    },
    {
      username: "ketoan",
      fullName: "Lê Thị Kế Toán",
      role: "KeToan",
      status: "active",
      password: "ketoan123",
      CCCD: "001194045678",
      DiaChi: "26 Nguyễn Chí Thanh, Ba Đình, Hà Nội",
      SDT: "0914567890",
    },
    {
      username: "muahang",
      fullName: "Phạm Văn Mua Hàng",
      role: "NhanVienMuaHang",
      status: "active",
      password: "muahang123",
      CCCD: "001096056789",
      DiaChi: "54 Giải Phóng, Hoàng Mai, Hà Nội",
      SDT: "0905678901",
    },
  ];

  for (const acc of defaultAccounts) {
    const passwordHash = hashPassword(acc.password);
    await database.collection("Users").updateOne(
      { username: acc.username },
      {
        $set: {
          fullName: acc.fullName,
          role: acc.role,
          status: acc.status,
          passwordHash,
          CCCD: acc.CCCD,
          DiaChi: acc.DiaChi,
          SDT: acc.SDT,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    await syncEmployee(database, { ...acc, passwordHash, createdAt: now });
  }

  // Update CCCD and DiaChi for any existing employees without them
  await database.collection("NhanVien").updateMany(
    { $or: [{ CCCD: { $exists: false } }, { CCCD: "" }] },
    { $set: { CCCD: "001095012345", DiaChi: "Hà Nội" } }
  );

  // Ensure all customers and suppliers have TrangThai
  await database.collection("KhachHang").updateMany(
    { TrangThai: { $exists: false } },
    { $set: { TrangThai: "Đang hoạt động" } }
  );
  await database.collection("NhaCungCap").updateMany(
    { TrangThai: { $exists: false } },
    { $set: { TrangThai: "Đang hoạt động" } }
  );

  // Seed sample images for products if missing
  const sampleImages = {
    SP001: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    SP002: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=300&auto=format&fit=crop&q=80",
    SP003: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80",
    SP004: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300&auto=format&fit=crop&q=80",
    SP005: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&auto=format&fit=crop&q=80",
    SP006: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    SP007: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&auto=format&fit=crop&q=80",
    SP008: "https://images.unsplash.com/photo-1608248597359-00109968a356?w=300&auto=format&fit=crop&q=80",
    SP009: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80",
    SP010: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    SP011: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
  };
  for (const [maSP, img] of Object.entries(sampleImages)) {
    await database.collection("SanPham").updateOne(
      { MaSP: maSP, $or: [{ HinhAnh: { $exists: false } }, { HinhAnh: "" }, { HinhAnh: null }] },
      { $set: { HinhAnh: img } }
    );
  }

  // Seed default promotions and voucher tiers (upsert by MaKM)
  const defaultPromos = [
    {
      MaKM: "KMALL10",
      TenKM: "Ưu đãi chào hè toàn diện (Giảm 10%)",
      LoaiKM: "Phần trăm",
      PhanTramGiam: 10,
      GiaTriGiam: 0,
      PhamVi: "Toàn bộ",
      DoiTuong: "Tất cả",
      NgayBatDau: "2026-01-01",
      NgayKetThuc: "2026-12-31",
      DieuKienApDung: "Áp dụng giảm 10% cho mọi khách hàng",
      TrangThai: "Đang áp dụng",
      createdAt: now,
      updatedAt: now,
    },
    {
      MaKM: "BAC50K",
      TenKM: "Voucher tri ân Hạng Bạc 50.000đ",
      LoaiKM: "Số tiền",
      PhanTramGiam: 0,
      GiaTriGiam: 50000,
      PhamVi: "Theo đối tượng",
      DoiTuong: "Hạng Bạc",
      NgayBatDau: "2026-01-01",
      NgayKetThuc: "2026-12-31",
      DieuKienApDung: "Áp dụng cho khách hàng đạt Hạng Bạc (từ 100 điểm)",
      TrangThai: "Đang áp dụng",
      createdAt: now,
      updatedAt: now,
    },
    {
      MaKM: "VANG100K",
      TenKM: "Voucher tri ân Hạng Vàng 100.000đ",
      LoaiKM: "Số tiền",
      PhanTramGiam: 0,
      GiaTriGiam: 100000,
      PhamVi: "Theo đối tượng",
      DoiTuong: "Hạng Vàng",
      NgayBatDau: "2026-01-01",
      NgayKetThuc: "2026-12-31",
      DieuKienApDung: "Áp dụng cho khách hàng đạt Hạng Vàng (từ 500 điểm)",
      TrangThai: "Đang áp dụng",
      createdAt: now,
      updatedAt: now,
    },
    {
      MaKM: "KC200K",
      TenKM: "Voucher VIP Hạng Kim Cương 200.000đ",
      LoaiKM: "Số tiền",
      PhanTramGiam: 0,
      GiaTriGiam: 200000,
      PhamVi: "Theo đối tượng",
      DoiTuong: "Kim Cương",
      NgayBatDau: "2026-01-01",
      NgayKetThuc: "2026-12-31",
      DieuKienApDung: "Áp dụng cho khách hàng đạt Hạng Kim Cương (từ 1000 điểm)",
      TrangThai: "Đang áp dụng",
      createdAt: now,
      updatedAt: now,
    },
  ];
  for (const promo of defaultPromos) {
    await database.collection("KhuyenMai").updateOne(
      { MaKM: promo.MaKM },
      { $setOnInsert: promo },
      { upsert: true }
    );
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
  await ensureBusinessCodes(database);
  console.log(`Seeded ${products.length} products, ${customers.length} customers and ${suppliers.length} suppliers`);
}
