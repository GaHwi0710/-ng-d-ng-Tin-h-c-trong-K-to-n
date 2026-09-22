import { ObjectId } from "mongodb";
import { syncEmployee } from "../modules/auth/accountEmployee.js";
import { hashPassword } from "../modules/auth/password.js";
import { ensureBusinessCodes } from "../modules/shared/businessCode.js";
import { backfillDetailCollections, ensureDetailCollections } from "../modules/shared/detailCollections.js";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from "../modules/shared/permissions.js";
import { ensureIndexes } from "./ensure-indexes.js";

// Đảm bảo 5 vai trò hệ thống luôn tồn tại kèm ma trận quyền mặc định
// ($setOnInsert nên không ghi đè quyền đã được quản lý chỉnh sửa)
async function upsertBuiltinRoles(database) {
  const builtins = [
    ["QuanLy", 1, "Quản lý"],
    ["NhanVienBanHang", 2, "Nhân viên bán hàng"],
    ["NhanVienKho", 3, "Nhân viên kho"],
    ["KeToan", 4, "Kế toán"],
    ["NhanVienMuaHang", 5, "Nhân viên mua hàng"],
  ];
  for (const [maKey, maVaiTro, tenVaiTro] of builtins) {
    // Gộp vào bản ghi vai trò đã có (theo MaVaiTro) để không sinh bản trùng
    await database.collection("VaiTro").updateOne(
      { MaVaiTro: maVaiTro },
      {
        $set: { TenVaiTro: tenVaiTro, MaVaiTro: maVaiTro, MaKey: maKey, LaVaiTroHeThong: true },
        $setOnInsert: {
          MoTa: ROLE_DESCRIPTIONS[maKey] || "",
          QuyenHan: DEFAULT_ROLE_PERMISSIONS[maKey] || {},
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    const kept = await database.collection("VaiTro").findOne({ MaVaiTro: maVaiTro });
    // Chỉ giữ lại đúng 1 bản ghi cho mỗi vai trò hệ thống
    await database.collection("VaiTro").deleteMany({ MaVaiTro: maVaiTro, _id: { $ne: kept._id } });
    // Nếu bản giữ lại chưa có ma trận quyền (bản cũ), bổ sung mặc định
    await database.collection("VaiTro").updateOne(
      { _id: kept._id, $or: [{ QuyenHan: { $exists: false } }, { QuyenHan: {} }] },
      { $set: { QuyenHan: DEFAULT_ROLE_PERMISSIONS[maKey] || {} } }
    );
  }
}

async function backfillCustomerNamesOnDocuments(database) {
  const custs = await database.collection("KhachHang").find({}).toArray();
  const custMap = new Map();
  for (const c of custs) {
    custMap.set(c._id.toString(), c);
    if (c.MaKH) custMap.set(c.MaKH, c);
  }

  // Backfill HoaDon
  const invoices = await database.collection("HoaDon").find({}).toArray();
  for (const inv of invoices) {
    let tenKH = inv.TenKH;
    let maKHCode = inv.MaKHCode;
    if (inv.MaKH) {
      const rawCId = inv.MaKH.toString();
      const cust = custMap.get(rawCId) || (inv.MaKHCode ? custMap.get(inv.MaKHCode) : null);
      if (cust) {
        tenKH = cust.HoTen;
        maKHCode = cust.MaKH;
      } else if (!tenKH) {
        tenKH = "Khách hàng";
      }
    } else {
      tenKH = "Khách vãng lai";
    }
    await database.collection("HoaDon").updateOne(
      { _id: inv._id },
      { $set: { TenKH: tenKH, MaKHCode: maKHCode || null } }
    );
  }

  // Backfill DonHang
  const orders = await database.collection("DonHang").find({}).toArray();
  for (const ord of orders) {
    let tenKH = ord.TenKH;
    let maKHCode = ord.MaKHCode;
    if (ord.MaKH) {
      const rawCId = ord.MaKH.toString();
      const cust = custMap.get(rawCId) || (ord.MaKHCode ? custMap.get(ord.MaKHCode) : null);
      if (cust) {
        tenKH = cust.HoTen;
        maKHCode = cust.MaKH;
      } else if (!tenKH) {
        tenKH = "Khách hàng";
      }
    } else {
      tenKH = "Khách vãng lai";
    }
    await database.collection("DonHang").updateOne(
      { _id: ord._id },
      { $set: { TenKH: tenKH, MaKHCode: maKHCode || null } }
    );
  }

  // Backfill CongNo
  const debts = await database.collection("CongNo").find({}).toArray();
  const supps = await database.collection("NhaCungCap").find({}).toArray();
  const suppMap = new Map(supps.map((s) => [s._id.toString(), s]));
  for (const s of supps) {
    if (s.MaNCC) suppMap.set(s.MaNCC, s);
  }

  for (const d of debts) {
    const update = {};
    if (d.MaKH) {
      const c = custMap.get(d.MaKH.toString()) || custMap.get(d.MaKHCode);
      if (c) {
        update.TenKH = c.HoTen;
        update.partnerName = c.HoTen;
        update.MaKHCode = c.MaKH;
      }
    } else if (d.MaNCC) {
      const s = suppMap.get(d.MaNCC.toString()) || suppMap.get(d.MaNCCCode);
      if (s) {
        update.TenNCC = s.TenNCC;
        update.partnerName = s.TenNCC;
        update.MaNCCCode = s.MaNCC;
      }
    }
    if (Object.keys(update).length > 0) {
      await database.collection("CongNo").updateOne({ _id: d._id }, { $set: update });
    }
  }
}

async function seedExtraSampleProducts(database) {
  const now = new Date();
  const categories = await database.collection("LoaiHang").find({}).toArray();
  const catMap = new Map(categories.map((c) => [c.TenLoai?.toLowerCase(), c]));

  const sampleProducts = [
    {
      MaSP: "SP012",
      TenSP: "Sữa NAN Optipro số 1 800g (0-6 tháng)",
      categoryName: "Sữa",
      DonViTinh: "Hộp",
      GiaNhap: 380000,
      GiaBan: 460000,
      HanSuDung: "2027-09-01",
      stock: 25,
      HinhAnh: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP013",
      TenSP: "Sữa Frisolac Gold số 3 850g (1-2 tuổi)",
      categoryName: "Sữa",
      DonViTinh: "Hộp",
      GiaNhap: 390000,
      GiaBan: 485000,
      HanSuDung: "2027-11-15",
      stock: 18,
      HinhAnh: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP014",
      TenSP: "Sữa bột Similac Eye-Q số 2 900g",
      categoryName: "Sữa",
      DonViTinh: "Hộp",
      GiaNhap: 410000,
      GiaBan: 510000,
      HanSuDung: "2027-10-30",
      stock: 14,
      HinhAnh: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP015",
      TenSP: "Bỉm Moony Natural size L (44 miếng)",
      categoryName: "Bỉm/tã",
      DonViTinh: "Gói",
      GiaNhap: 285000,
      GiaBan: 355000,
      HanSuDung: "2028-03-01",
      stock: 32,
      HinhAnh: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP016",
      TenSP: "Bỉm Huggies Skin Perfect size XL (60 miếng)",
      categoryName: "Bỉm/tã",
      DonViTinh: "Gói",
      GiaNhap: 230000,
      GiaBan: 289000,
      HanSuDung: "2028-05-15",
      stock: 26,
      HinhAnh: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP017",
      TenSP: "Bỉm Goon Friend size M (54 miếng)",
      categoryName: "Bỉm/tã",
      DonViTinh: "Gói",
      GiaNhap: 155000,
      GiaBan: 195000,
      HanSuDung: "2028-02-28",
      stock: 35,
      HinhAnh: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP018",
      TenSP: "Bộ body chip cộc tay sơ sinh cotton organic",
      categoryName: "Quần áo trẻ em",
      DonViTinh: "Bộ",
      GiaNhap: 75000,
      GiaBan: 119000,
      HanSuDung: "2029-12-31",
      stock: 45,
      HinhAnh: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP019",
      TenSP: "Bộ đồ ngủ dài tay thu đông cho bé 1-3 tuổi",
      categoryName: "Quần áo trẻ em",
      DonViTinh: "Bộ",
      GiaNhap: 95000,
      GiaBan: 149000,
      HanSuDung: "2029-12-31",
      stock: 30,
      HinhAnh: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP020",
      TenSP: "Mũ len tai thỏ giữ ấm mùa đông cho bé",
      categoryName: "Quần áo trẻ em",
      DonViTinh: "Cái",
      GiaNhap: 35000,
      GiaBan: 59000,
      HanSuDung: "2029-12-31",
      stock: 40,
      HinhAnh: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP021",
      TenSP: "Máy tiệt trùng và sấy khô bình sữa Fatzbaby",
      categoryName: "Đồ dùng cho bé",
      DonViTinh: "Cái",
      GiaNhap: 650000,
      GiaBan: 850000,
      HanSuDung: "2030-01-01",
      stock: 8,
      HinhAnh: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP022",
      TenSP: "Nhiệt kế hồng ngoại đo trán Microlife FR1MF1",
      categoryName: "Đồ dùng cho bé",
      DonViTinh: "Cái",
      GiaNhap: 520000,
      GiaBan: 690000,
      HanSuDung: "2030-01-01",
      stock: 12,
      HinhAnh: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP023",
      TenSP: "Ti giả chỉnh nha Philips Avent Ultra Air 0-6M",
      categoryName: "Đồ dùng cho bé",
      DonViTinh: "Cái",
      GiaNhap: 85000,
      GiaBan: 125000,
      HanSuDung: "2028-12-31",
      stock: 24,
      HinhAnh: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP024",
      TenSP: "Ghế ăn dặm nâng hạ chiều cao Mastela 1013",
      categoryName: "Đồ dùng cho bé",
      DonViTinh: "Cái",
      GiaNhap: 480000,
      GiaBan: 650000,
      HanSuDung: "2030-01-01",
      stock: 9,
      HinhAnh: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP025",
      TenSP: "Bộ xếp hình khối gỗ Montessori 50 chi tiết",
      categoryName: "Đồ chơi",
      DonViTinh: "Bộ",
      GiaNhap: 120000,
      GiaBan: 185000,
      HanSuDung: "2030-01-01",
      stock: 22,
      HinhAnh: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP026",
      TenSP: "Thảm nằm chơi vận động phát nhạc cho bé",
      categoryName: "Đồ chơi",
      DonViTinh: "Bộ",
      GiaNhap: 220000,
      GiaBan: 320000,
      HanSuDung: "2030-01-01",
      stock: 15,
      HinhAnh: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP027",
      TenSP: "Xe chòi chân hình thú có đèn nhạc",
      categoryName: "Đồ chơi",
      DonViTinh: "Chiếc",
      GiaNhap: 250000,
      GiaBan: 360000,
      HanSuDung: "2030-01-01",
      stock: 11,
      HinhAnh: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP028",
      TenSP: "Kem chống hăm Sudocrem 60g Anh Quốc",
      categoryName: "Chăm sóc mẹ và bé",
      DonViTinh: "Hộp",
      GiaNhap: 75000,
      GiaBan: 110000,
      HanSuDung: "2028-06-30",
      stock: 35,
      HinhAnh: "https://images.unsplash.com/photo-1607582278043-57198ac8da43?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP029",
      TenSP: "Nước giặt xả cho bé D-nee organic 3000ml",
      categoryName: "Chăm sóc mẹ và bé",
      DonViTinh: "Can",
      GiaNhap: 145000,
      GiaBan: 199000,
      HanSuDung: "2028-08-31",
      stock: 28,
      HinhAnh: "https://images.unsplash.com/photo-1607582278043-57198ac8da43?w=300&auto=format&fit=crop&q=80",
    },
    {
      MaSP: "SP030",
      TenSP: "Sữa tắm gội thảo dược trẻ em Elemis 200ml",
      categoryName: "Chăm sóc mẹ và bé",
      DonViTinh: "Chai",
      GiaNhap: 95000,
      GiaBan: 135000,
      HanSuDung: "2028-04-30",
      stock: 20,
      HinhAnh: "https://images.unsplash.com/photo-1607582278043-57198ac8da43?w=300&auto=format&fit=crop&q=80",
    },
  ];

  for (const item of sampleProducts) {
    const cat = catMap.get(item.categoryName.toLowerCase());
    const existing = await database.collection("SanPham").findOne({ MaSP: item.MaSP });
    if (!existing) {
      const prodDoc = {
        _id: new ObjectId(),
        MaSP: item.MaSP,
        TenSP: item.TenSP,
        MaLoai: cat ? cat._id : null,
        LoaiHang: cat ? cat.TenLoai : item.categoryName,
        DonViTinh: item.DonViTinh,
        GiaNhap: item.GiaNhap,
        GiaBan: item.GiaBan,
        HanSuDung: item.HanSuDung,
        stock: item.stock,
        HinhAnh: item.HinhAnh,
        TrangThai: "Đang bán",
        createdAt: now,
        updatedAt: now,
      };
      await database.collection("SanPham").insertOne(prodDoc);
      await database.collection("TonKho").updateOne(
        { MaSP: prodDoc._id },
        {
          $set: {
            MaSP: prodDoc._id,
            SoLuongTon: item.stock,
            NgayCapNhat: now.toISOString().slice(0, 10),
            updatedAt: now,
          },
        },
        { upsert: true }
      );
    }
  }
}

export async function seedDatabase(database) {
  const now = new Date();
  await ensureDetailCollections(database);
  await ensureBusinessCodes(database);
  // Đảm bảo chỉ mục MongoDB cho hiệu năng truy vấn khi dữ liệu lớn
  await ensureIndexes(database);

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

  // Gắn ảnh mẫu cho sản phẩm nếu chưa có (dùng cho cả CSDL mới và CSDL đã khởi tạo)
  const sampleImages = {
    SP001: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    SP002: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=300&auto=format&fit=crop&q=80",
    SP003: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=300&auto=format&fit=crop&q=80",
    SP004: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300&auto=format&fit=crop&q=80",
    SP005: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&auto=format&fit=crop&q=80",
    SP006: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80",
    SP007: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&auto=format&fit=crop&q=80",
    SP008: "https://images.unsplash.com/photo-1607582278043-57198ac8da43?w=300&auto=format&fit=crop&q=80",
    SP009: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80",
    SP010: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=300&auto=format&fit=crop&q=80",
    SP011: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
  };

  // Ảnh theo danh mục: điền cho BẤT KỲ sản phẩm nào còn thiếu ảnh (kể cả sản phẩm tự tạo)
  const categoryImagePool = [
    { match: /sữa/i, url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80" },
    { match: /bỉm|tã/i, url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80" },
    { match: /quần áo|quần|áo/i, url: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=300&auto=format&fit=crop&q=80" },
    { match: /đồ dùng/i, url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80" },
    { match: /đồ chơi/i, url: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&auto=format&fit=crop&q=80" },
    { match: /chăm sóc/i, url: "https://images.unsplash.com/photo-1607582278043-57198ac8da43?w=300&auto=format&fit=crop&q=80" },
  ];
  const defaultImage = "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=300&auto=format&fit=crop&q=80";
  const productsMissingImage = await database.collection("SanPham").find({ $or: [{ HinhAnh: { $exists: false } }, { HinhAnh: "" }, { HinhAnh: null }] }).toArray();
  for (const product of productsMissingImage) {
    let categoryName = "";
    if (product.MaLoai && ObjectId.isValid(product.MaLoai)) {
      const category = await database.collection("LoaiHang").findOne({ _id: product.MaLoai });
      categoryName = category?.TenLoai || "";
    }
    const matched = categoryImagePool.find((entry) => entry.match.test(categoryName));
    await database.collection("SanPham").updateOne(
      { _id: product._id },
      { $set: { HinhAnh: matched?.url || defaultImage } }
    );
  }
  const applySampleImages = () =>
    Promise.all(Object.entries(sampleImages).map(([maSP, img]) =>
      database.collection("SanPham").updateOne(
        { MaSP: maSP, $or: [{ HinhAnh: { $exists: false } }, { HinhAnh: "" }, { HinhAnh: null }] },
        { $set: { HinhAnh: img } }
      )
    ));
  await applySampleImages();

  // Điền "Quản trị viên" cho các chứng từ còn thiếu người lập (không ghi đè tên đã có)
  // và chuẩn hóa bản ghi ghi bằng username "admin" thành "Quản trị viên"
  const voucherCollections = ["DonDatHang", "PhieuNhap", "DonHang", "HoaDon", "PhieuXuat", "KiemKe", "PhieuTraHang", "CongNo"];
  for (const collectionName of voucherCollections) {
    await database.collection(collectionName).updateMany(
      { $or: [{ NguoiLap: { $exists: false } }, { NguoiLap: null }, { NguoiLap: "" }, { NguoiLap: "admin" }, { NguoiLap: "Admin" }] },
      { $set: { NguoiLap: "Quản trị viên" } }
    );
  }

  await upsertBuiltinRoles(database);

  // Một lần duy nhất: siết ma trận quyền của 5 vai trò hệ thống theo bộ mặc định chặt.
  // Sau lần chạy này, các chỉnh sửa quyền của quản trị viên sẽ được giữ nguyên.
  // v4: bổ sung nhóm "Thu chi" (Phiếu thu / Phiếu chi) vào ma trận quyền.
  if (!(await database.collection("_metadata").findOne({ key: "strict-permissions-v4" }))) {
    for (const [maKey, quyenHan] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await database.collection("VaiTro").updateOne({ MaKey: maKey }, { $set: { QuyenHan: quyenHan } });
    }
    await database.collection("_metadata").insertOne({ key: "strict-permissions-v4", createdAt: new Date() });
    console.log("Đã áp dụng ma trận quyền chi tiết cho 5 vai trò hệ thống (v4 - có Thu chi)");
  }

  // Dữ liệu mẫu Phiếu thu / Phiếu chi (chỉ chèn khi cả 2 collection trống để luôn có dữ liệu demo)
  if (
    (await database.collection("PhieuThu").countDocuments()) === 0 &&
    (await database.collection("PhieuChi").countDocuments()) === 0
  ) {
    const now2 = new Date();
    const ngay = now2.toISOString().slice(0, 10);
    await database.collection("PhieuThu").insertMany([
      { MaPT: "PT001", NgayLap: ngay, NguoiNopTien: "Nguyễn Thị Lan", DiaChi: "25 Nguyễn Trãi, Thanh Xuân, Hà Nội", LyDo: "Thu tiền bán hàng theo hóa đơn HD001", SoTien: 1500000, ChungTuGoc: "HD001", KemTheo: "01 hóa đơn", TrangThai: "Đã lập", NguoiLap: "Quản trị viên", createdAt: now2, updatedAt: now2 },
      { MaPT: "PT002", NgayLap: ngay, NguoiNopTien: "Trần Minh Quân", DiaChi: "8 Phố Huế, Hai Bà Trưng, Hà Nội", LyDo: "Khách hàng trả nợ công nợ CN002", SoTien: 800000, ChungTuGoc: "CN002", KemTheo: "01 bản sao kê", TrangThai: "Đã lập", NguoiLap: "Quản trị viên", createdAt: now2, updatedAt: now2 },
      { MaPT: "PT003", NgayLap: ngay, NguoiNopTien: "Nguyễn Văn Hoà", DiaChi: "40 Xuân Thủy, Cầu Giấy, Hà Nội", LyDo: "Thu tiền đặt cọc đơn hàng DH005", SoTien: 500000, ChungTuGoc: "DH005", KemTheo: "", TrangThai: "Đã lập", NguoiLap: "Quản trị viên", createdAt: now2, updatedAt: now2 },
    ]);
    await database.collection("PhieuChi").insertMany([
      { MaPC: "PC001", NgayLap: ngay, NguoiNhanTien: "Công ty TNHH Pigeon Việt Nam", DiaChi: "KCN Việt Nam – Singapore, Bình Dương", LyDo: "Chi tiền trả nhà cung cấp theo phiếu nhập PN001", SoTien: 3200000, ChungTuGoc: "PN001", KemTheo: "01 phiếu nhập", TrangThai: "Đã lập", NguoiLap: "Quản trị viên", createdAt: now2, updatedAt: now2 },
      { MaPC: "PC002", NgayLap: ngay, NguoiNhanTien: "Xe tải Ngọc Hùng", DiaChi: "Bắc Từ Liêm, Hà Nội", LyDo: "Chi phí vận chuyển hàng nhập kho tháng 9", SoTien: 450000, ChungTuGoc: "", KemTheo: "01 biên lai", TrangThai: "Đã lập", NguoiLap: "Quản trị viên", createdAt: now2, updatedAt: now2 },
    ]);
    console.log("Đã seed dữ liệu mẫu Phiếu thu / Phiếu chi");
  }

  // 1. Backfill TenKH và MaKHCode cho HoaDon, DonHang và CongNo từ KhachHang
  await backfillCustomerNamesOnDocuments(database);

  // 2. Bổ sung nhiều sản phẩm mẫu đa dạng vào SanPham và TonKho
  await seedExtraSampleProducts(database);

  // Nếu cơ sở dữ liệu đã được khởi tạo ban đầu, TUYỆT ĐỐI KHÔNG RESET hay ghi đè bất kỳ dữ liệu người dùng nào!
  if (await database.collection("_metadata").findOne({ key: "initial-seed-v1" })) {
    await upsertBuiltinRoles(database);
    return;
  }

  await upsertBuiltinRoles(database);

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
      DiemYeuCau: 100,
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
      DiemYeuCau: 500,
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
      DiemYeuCau: 1000,
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
  await upsertBuiltinRoles(database);
  await applySampleImages();
  await database.collection("_metadata").insertOne({ key: "initial-seed-v1", createdAt: now, source: "Nhom1_baiktraso1 (1).docx + schema.sql" });
  await ensureBusinessCodes(database);
  console.log(`Seeded ${products.length} products, ${customers.length} customers and ${suppliers.length} suppliers`);
}
