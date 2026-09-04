const API_URL = import.meta.env.VITE_API_URL || "/api";
const USE_LOCAL_FALLBACK = import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === "true";

// Tăng version → tự động xóa localStorage cũ để seed lại với ngày động
const SEED_VERSION = "v3";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const seedData = {
  customers: [
    { id: "KH001", HoTen: "Nguyễn Thị Hồng", SDT: "0901234567", Email: "hong.nt@gmail.com", DiaChi: "12 Láng Hạ, Ba Đình, Hà Nội", DiemTichLuy: 3420 },
    { id: "KH002", HoTen: "Trần Minh Anh", SDT: "0912345678", Email: "anh.tm@gmail.com", DiaChi: "45 Cầu Giấy, Hà Nội", DiemTichLuy: 1850 },
    { id: "KH003", HoTen: "Lê Thu Trang", SDT: "0987654321", Email: "trang.le@gmail.com", DiaChi: "8 Kim Mã, Ba Đình, Hà Nội", DiemTichLuy: 920 },
    { id: "KH004", HoTen: "Phạm Bảo Ngọc", SDT: "0977111222", Email: "ngoc.pb@gmail.com", DiaChi: "20 Xã Đàn, Đống Đa, Hà Nội", DiemTichLuy: 560 },
    { id: "KH005", HoTen: "Đỗ Hương Giang", SDT: "0968234567", Email: "giang.dh@gmail.com", DiaChi: "67 Trần Duy Hưng, Cầu Giấy, Hà Nội", DiemTichLuy: 4100 },
    { id: "KH006", HoTen: "Vũ Thanh Hà", SDT: "0935678901", Email: "ha.vt@gmail.com", DiaChi: "152 Nguyễn Văn Cừ, Long Biên, Hà Nội", DiemTichLuy: 2780 },
  ],
  suppliers: [
    { id: "NCC001", TenNCC: "Công ty TNHH Pigeon Việt Nam", SDT: "0281234567", DiaChi: "KCN Amata, Biên Hòa, Đồng Nai", Email: "contact@pigeon.vn" },
    { id: "NCC002", TenNCC: "Công ty CP Mamamy", SDT: "0246677889", DiaChi: "Q. Hoàng Mai, Hà Nội", Email: "hello@mamamy.vn" },
    { id: "NCC003", TenNCC: "Công ty TNHH Sữa Việt", SDT: "0243812345", DiaChi: "KCN Yên Phong, Bắc Ninh", Email: "sale@suaviet.vn" },
    { id: "NCC004", TenNCC: "Xưởng may Bé Xinh", SDT: "0243998877", DiaChi: "Q. Hà Đông, Hà Nội", Email: "order@bexinh.vn" },
    { id: "NCC005", TenNCC: "Nhà phân phối Bobby VN", SDT: "0283456789", DiaChi: "KCN Tân Bình, TP.HCM", Email: "sales@bobby.vn" },
  ],
  products: [
    { id: "SP001", MaSP: "SP001", TenSP: "Bỉm Pampers size M (44 miếng)", LoaiHang: "Bỉm/tã", DonViTinh: "Gói", GiaNhap: 210000, GiaBan: 255000, HanSuDung: "2027-12-31", TrangThai: "Đang bán", stock: 142 },
    { id: "SP002", MaSP: "SP002", TenSP: "Bình sữa Pigeon cổ rộng 240ml", LoaiHang: "Đồ dùng cho bé", DonViTinh: "Cái", GiaNhap: 140000, GiaBan: 185000, HanSuDung: "", TrangThai: "Đang bán", stock: 86 },
    { id: "SP003", MaSP: "SP003", TenSP: "Sữa Aptamil số 2 900g", LoaiHang: "Sữa", DonViTinh: "Hộp", GiaNhap: 420000, GiaBan: 520000, HanSuDung: "2027-05-01", TrangThai: "Đang bán", stock: 58 },
    { id: "SP004", MaSP: "SP004", TenSP: "Khăn ướt Mamamy 3 gói", LoaiHang: "Chăm sóc mẹ và bé", DonViTinh: "Bịch", GiaNhap: 65000, GiaBan: 89000, HanSuDung: "2028-06-30", TrangThai: "Đang bán", stock: 234 },
    { id: "SP005", MaSP: "SP005", TenSP: "Sữa Meiji nội địa 800g", LoaiHang: "Sữa", DonViTinh: "Hộp", GiaNhap: 380000, GiaBan: 470000, HanSuDung: "2027-03-15", TrangThai: "Đang bán", stock: 8 },
    { id: "SP006", MaSP: "SP006", TenSP: "Bỉm Bobby size M 66 miếng", LoaiHang: "Bỉm/tã", DonViTinh: "Gói", GiaNhap: 180000, GiaBan: 229000, HanSuDung: "2028-01-01", TrangThai: "Đang bán", stock: 175 },
    { id: "SP007", MaSP: "SP007", TenSP: "Bộ quần áo cotton 0-3M", LoaiHang: "Quần áo trẻ em", DonViTinh: "Bộ", GiaNhap: 65000, GiaBan: 99000, HanSuDung: "", TrangThai: "Đang bán", stock: 120 },
    { id: "SP008", MaSP: "SP008", TenSP: "Xúc xắc gỗ an toàn", LoaiHang: "Đồ chơi", DonViTinh: "Cái", GiaNhap: 35000, GiaBan: 59000, HanSuDung: "", TrangThai: "Đang bán", stock: 210 },
    { id: "SP009", MaSP: "SP009", TenSP: "Dầu massage bụng bầu 100ml", LoaiHang: "Chăm sóc mẹ và bé", DonViTinh: "Chai", GiaNhap: 95000, GiaBan: 139000, HanSuDung: "2027-08-01", TrangThai: "Đang bán", stock: 45 },
    { id: "SP010", MaSP: "SP010", TenSP: "Sữa NAN Optipro 4 800g", LoaiHang: "Sữa", DonViTinh: "Hộp", GiaNhap: 350000, GiaBan: 425000, HanSuDung: "2027-09-15", TrangThai: "Đang bán", stock: 5 },
    { id: "SP011", MaSP: "SP011", TenSP: "Bỉm Merries size S 82 miếng", LoaiHang: "Bỉm/tã", DonViTinh: "Gói", GiaNhap: 210000, GiaBan: 265000, HanSuDung: "2028-02-01", TrangThai: "Đang bán", stock: 7 },
    { id: "SP012", MaSP: "SP012", TenSP: "Đồ chơi xếp hình gỗ 50 chi tiết", LoaiHang: "Đồ chơi", DonViTinh: "Bộ", GiaNhap: 85000, GiaBan: 129000, HanSuDung: "", TrangThai: "Đang bán", stock: 67 },
  ],
  "product-categories": [
    { id: "LH001", TenLoai: "Sữa", MoTa: "Sữa bột, sữa nước cho bé từ 0-6 tuổi" },
    { id: "LH002", TenLoai: "Bỉm/tã", MoTa: "Bỉm dán, bỉm quần các size" },
    { id: "LH003", TenLoai: "Quần áo trẻ em", MoTa: "Quần áo, phụ kiện thời trang cho bé" },
    { id: "LH004", TenLoai: "Đồ dùng cho bé", MoTa: "Bình sữa, núm ti, chén bát, ghế ăn" },
    { id: "LH005", TenLoai: "Đồ chơi", MoTa: "Đồ chơi giáo dục, vận động, sáng tạo" },
    { id: "LH006", TenLoai: "Chăm sóc mẹ và bé", MoTa: "Khăn ướt, sữa tắm, dầu gội, kem chống hăm" },
  ],
  "purchase-orders": [
    { id: "DDH001", MaNCC: "NCC001", NgayDat: "2026-08-05", TrangThai: "Đã xác nhận", TongTien: 16000000, items: [{ MaSP: "SP001", SoLuong: 20, DonGia: 210000 }, { MaSP: "SP002", SoLuong: 20, DonGia: 140000 }] },
    { id: "DDH002", MaNCC: "NCC005", NgayDat: "2026-08-10", TrangThai: "Đang chờ", TongTien: 6300000, items: [{ MaSP: "SP006", SoLuong: 30, DonGia: 180000 }, { MaSP: "SP011", SoLuong: 3, DonGia: 210000 }] },
    { id: "DDH003", MaNCC: "NCC003", NgayDat: "2026-08-18", TrangThai: "Đã xác nhận", TongTien: 12600000, items: [{ MaSP: "SP003", SoLuong: 30, DonGia: 420000 }] },
  ],
  "goods-receipts": [
    { id: "PN001", MaDDH: "DDH001", MaNCC: "NCC001", NgayNhap: "2026-08-06", TrangThai: "Đã lưu", TongTien: 16000000, SoLuong: 40, details: [{ MaSP: "SP001", SoLuong: 20, DonGia: 210000 }, { MaSP: "SP002", SoLuong: 20, DonGia: 140000 }] },
  ],
  "sales-orders": [
    { id: "DH001", customerId: "KH001", NgayDat: daysAgo(6), TrangThai: "Hoàn tất", TongTien: 520000, items: [{ productId: "SP003", quantity: 1, price: 520000 }] },
    { id: "DH002", customerId: "KH002", NgayDat: daysAgo(5), TrangThai: "Hoàn tất", TongTien: 458000, items: [{ productId: "SP006", quantity: 2, price: 229000 }] },
    { id: "DH003", customerId: null, NgayDat: daysAgo(3), TrangThai: "Chờ xuất kho", TongTien: 185000, items: [{ productId: "SP002", quantity: 1, price: 185000 }] },
    { id: "DH004", customerId: "KH005", NgayDat: daysAgo(1), TrangThai: "Hoàn tất", TongTien: 1295000, items: [{ productId: "SP003", quantity: 2, price: 520000 }, { productId: "SP004", quantity: 1, price: 89000 }, { productId: "SP008", quantity: 1, price: 59000 }, { productId: "SP009", quantity: 1, price: 139000 }] },
  ],
  invoices: [
    { id: "HD001", MaDH: "DH001", NgayLap: daysAgo(6), TongTien: 520000, TrangThai: "Đã thanh toán" },
    { id: "HD002", MaDH: "DH002", NgayLap: daysAgo(5), TongTien: 458000, TrangThai: "Đã thanh toán" },
    { id: "HD003", MaDH: "DH003", NgayLap: daysAgo(3), TongTien: 185000, TrangThai: "Chưa thanh toán" },
    { id: "HD004", MaDH: "DH004", NgayLap: daysAgo(1), TongTien: 1295000, TrangThai: "Đã thanh toán" },
  ],
  "goods-issues": [
    { id: "PX001", MaDH: "DH001", NgayXuat: "2026-08-14", LyDoXuat: "Bán hàng", TrangThai: "Đã lưu", SoLuong: 1, TongTien: 520000, details: [{ MaSP: "SP003", SoLuong: 1, DonGia: 420000 }] },
    { id: "PX002", MaDH: "DH002", NgayXuat: "2026-08-15", LyDoXuat: "Bán hàng", TrangThai: "Đã lưu", SoLuong: 2, TongTien: 360000, details: [{ MaSP: "SP006", SoLuong: 2, DonGia: 180000 }] },
  ],
  inventory: [],
  stocktakes: [
    { id: "KK001", note: "Kiểm kê định kỳ tháng 8/2026", NgayKiemKe: "2026-08-01", items: [{ productId: "SP006", sys: 177, actual: 175 }, { productId: "SP008", sys: 210, actual: 210 }, { productId: "SP009", sys: 47, actual: 45 }] },
  ],
  returns: [
    { id: "PTH001", MaDH: "DH002", productId: "SP006", quantity: 1, price: 180000, reason: "Sản phẩm bị lỗi bao bì", NgayTra: "2026-08-17", TrangThai: "Đã xử lý" },
  ],
  debts: [
    { id: "CN001", MaNCC: "NCC003", NgayPhatSinh: "2026-08-18", SoTien: 12600000, SoTienDaTra: 8000000, SoTienConLai: 4600000, TrangThai: "Còn nợ" },
  ],
  promotions: [
    { id: "KM001", TenKM: "Ưu đãi Mùa tựu trường 2026", PhanTramGiam: 15, NgayBatDau: "2026-08-25", NgayKetThuc: "2026-09-10", DieuKienApDung: "Đơn hàng từ 500.000đ", TrangThai: "Đang áp dụng" },
    { id: "KM002", TenKM: "Flash Sale cuối tuần", PhanTramGiam: 20, NgayBatDau: "2026-08-29", NgayKetThuc: "2026-08-31", DieuKienApDung: "Áp dụng cho Bỉm/tã", TrangThai: "Sắp diễn ra" },
  ],
  "admin/employees": [
    { id: "NV001", HoTen: "Đinh Tiến Đạt", SDT: "0911222333", VaiTro: "Quản lý", TrangThai: "Đang làm việc" },
    { id: "NV002", HoTen: "Nguyễn Mai Anh", SDT: "0922333444", VaiTro: "Nhân viên bán hàng", TrangThai: "Đang làm việc" },
    { id: "NV003", HoTen: "Trần Văn Hùng", SDT: "0933444555", VaiTro: "Nhân viên kho", TrangThai: "Đang làm việc" },
  ],
  "admin/roles": [
    { id: "VT001", TenVaiTro: "Quản lý", MoTa: "Toàn quyền quản lý hệ thống" },
    { id: "VT002", TenVaiTro: "Nhân viên bán hàng", MoTa: "Bán hàng, khách hàng, hóa đơn" },
    { id: "VT003", TenVaiTro: "Nhân viên kho", MoTa: "Nhập xuất kho, kiểm kê" },
    { id: "VT004", TenVaiTro: "Kế toán", MoTa: "Hóa đơn, công nợ, báo cáo" },
    { id: "VT005", TenVaiTro: "Nhân viên mua hàng", MoTa: "Đặt hàng nhà cung cấp" },
  ],
  "admin/accounts": [
    { id: "TK001", username: "admin",    password: "admin123",   fullName: "Đinh Tiến Đạt",    role: "QuanLy",           status: "Hoạt động" },
    { id: "TK002", username: "maianh",   password: "maianh123",  fullName: "Nguyễn Mai Anh",   role: "NhanVienBanHang",  status: "Hoạt động" },
    { id: "TK003", username: "vanhung",  password: "vanhung123", fullName: "Trần Văn Hùng",    role: "NhanVienKho",      status: "Hoạt động" },
    { id: "TK004", username: "ketoan",   password: "ketoan123",  fullName: "Lê Thị Kế Toán",   role: "KeToan",           status: "Hoạt động" },
    { id: "TK005", username: "muahang",  password: "muahang123", fullName: "Phạm Văn Mua Hàng", role: "NhanVienMuaHang", status: "Hoạt động" },
  ],
};

function storageKey(resource) { return `baby-shop:${resource}`; }

// Xóa dữ liệu localStorage cũ khi seed version thay đổi
if (typeof localStorage !== "undefined" && localStorage.getItem("baby-shop:seed-version") !== SEED_VERSION) {
  Object.keys(seedData).forEach((k) => localStorage.removeItem(storageKey(k)));
  localStorage.setItem("baby-shop:seed-version", SEED_VERSION);
}

function readLocal(resource) {
  const saved = localStorage.getItem(storageKey(resource));
  if (saved) return JSON.parse(saved);
  const initial = seedData[resource] || [];
  localStorage.setItem(storageKey(resource), JSON.stringify(initial));
  return initial;
}
function writeLocal(resource, data) { localStorage.setItem(storageKey(resource), JSON.stringify(data)); return data; }

async function request(resource, options = {}) {
  const token = localStorage.getItem("baby-shop-token");
  let response;
  try {
    response = await fetch(`${API_URL}/${resource}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    error.isNetworkError = true;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    const error = new Error(payload?.message || `Máy chủ trả về lỗi ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload || {};
}

export async function listRecords(resource) {
  try {
    return (await request(resource)).data || [];
  } catch (error) {
    if (USE_LOCAL_FALLBACK && error.isNetworkError) return readLocal(resource);
    throw error;
  }
}
export async function saveRecord(resource, record) {
  try {
    const result = record.id && record.id.length === 24 ? await request(`${resource}/${record.id}`, { method: "PUT", body: JSON.stringify(record) }) : await request(resource, { method: "POST", body: JSON.stringify(record) });
    return result.data;
  } catch (error) {
    if (!USE_LOCAL_FALLBACK || !error.isNetworkError) throw error;
    const data = readLocal(resource);
    const next = record.id ? data.map((item) => item.id === record.id ? record : item) : [...data, { ...record, id: `${resource}-${Date.now()}` }];
    writeLocal(resource, next);
    return next.find((item) => item.id === (record.id || next.at(-1).id));
  }
}
export async function deleteRecord(resource, id) {
  try {
    await request(`${resource}/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!USE_LOCAL_FALLBACK || !error.isNetworkError) throw error;
    writeLocal(resource, readLocal(resource).filter((item) => item.id !== id));
  }
}
export async function login(username, password) {
  try {
    const result = await request("auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    localStorage.setItem("baby-shop-token", result.token);
    localStorage.setItem("baby-shop-user", JSON.stringify(result.user));
    return result.user;
  } catch (error) {
    if (!USE_LOCAL_FALLBACK || !error.isNetworkError) throw error;
    // Tra cứu tài khoản và vai trò từ local seed data
    const accounts = readLocal("admin/accounts");
    const account = accounts.find((a) => a.username === username && (a.password === password || !a.password));
    if (!account || account.status === "disabled") {
      throw new Error("Tên đăng nhập hoặc mật khẩu không đúng.");
    }
    const user = { id: account.id, username: account.username, fullName: account.fullName, role: account.role };
    localStorage.setItem("baby-shop-token", "local-" + Date.now());
    localStorage.setItem("baby-shop-user", JSON.stringify(user));
    return user;
  }
}

export async function logout() {
  try {
    await request("auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("baby-shop-token");
    localStorage.removeItem("baby-shop-user");
  }
}

function computeWeeklyRevenue() {
  const invoices = readLocal("invoices");
  const today = new Date();
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const date = d.toISOString().slice(0, 10);
    const total = invoices
      .filter((inv) => inv.TrangThai === "Đã thanh toán" && inv.NgayLap?.slice(0, 10) === date)
      .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
    return { date, total };
  });
  const totalRevenue = invoices
    .filter((inv) => inv.TrangThai === "Đã thanh toán")
    .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
  return { total: totalRevenue, orders: invoices.length, weekly };
}

export async function getReport(name) {
  try {
    const result = await request(`reports/${name}`);
    // Backend stub trả về data rỗng → tính từ localStorage
    if (name === "revenue" && (!result.weekly || result.weekly.length === 0)) {
      return computeWeeklyRevenue();
    }
    return result;
  } catch (error) {
    if (name === "revenue") return computeWeeklyRevenue();
    if (name === "debts") return { total: 4600000 };
    if (name === "inventory") return { data: readLocal("products") };
    return {};
  }
}
