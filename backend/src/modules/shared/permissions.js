// Bộ định nghĩa phân quyền chi tiết của hệ thống.
// Mỗi vai trò lưu ma trận QuyenHan: { <moduleKey>: ["xem","tao","sua","xoa"] }
// trong collection "VaiTro". Quản lý luôn có toàn quyền (bypass).
import { getDatabase } from "../../config/mongodb.js";

export const ACTIONS = ["xem", "tao", "sua", "xoa"];

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Trang chủ", group: "Tổng quan", path: "/dashboard" },
  { key: "customers", label: "Khách hàng", group: "Danh mục", path: "/customers" },
  { key: "suppliers", label: "Nhà cung cấp", group: "Danh mục", path: "/suppliers" },
  { key: "products", label: "Sản phẩm", group: "Danh mục", path: "/products" },
  { key: "product-categories", label: "Loại hàng", group: "Danh mục", path: "/products/categories" },
  { key: "purchase-orders", label: "Đặt hàng NCC", group: "Mua hàng", path: "/purchase-orders" },
  { key: "goods-receipts", label: "Nhập kho", group: "Mua hàng", path: "/goods-receipts" },
  { key: "sales-orders", label: "Bán hàng", group: "Bán hàng", path: "/sales-orders" },
  { key: "invoices", label: "Hóa đơn", group: "Bán hàng", path: "/invoices" },
  { key: "payments", label: "Ghi nhận thanh toán", group: "Bán hàng", path: "/invoices" },
  { key: "goods-issues", label: "Xuất kho", group: "Kho", path: "/goods-issues" },
  { key: "inventory", label: "Tồn kho", group: "Kho", path: "/inventory" },
  { key: "stocktakes", label: "Kiểm kê kho", group: "Kho", path: "/stocktakes" },
  { key: "returns", label: "Trả hàng", group: "Kho", path: "/returns" },
  { key: "cash-receipts", label: "Phiếu thu", group: "Thu chi", path: "/cash-receipts" },
  { key: "cash-payments", label: "Phiếu chi", group: "Thu chi", path: "/cash-payments" },
  { key: "promotions", label: "Khuyến mãi", group: "Báo cáo & KM", path: "/promotions" },
  { key: "debts", label: "Công nợ", group: "Báo cáo & KM", path: "/debts" },
  { key: "reports", label: "Báo cáo thống kê", group: "Báo cáo & KM", path: "/reports" },
  { key: "admin-employees", label: "Nhân viên", group: "Quản trị", path: "/admin/employees" },
  { key: "admin-roles", label: "Phân quyền", group: "Quản trị", path: "/admin/roles" },
  { key: "admin-accounts", label: "QL người dùng", group: "Quản trị", path: "/admin/accounts" },
];

const FULL = [...ACTIONS];
const READ = ["xem"];

// Nguyên tắc đồng bộ dữ liệu: MỌI vai trò đều XEM được toàn bộ dữ liệu nghiệp vụ
// (cùng 1 database, số liệu như nhau ở mọi tài khoản — doanh thu, hóa đơn, tồn kho...).
// Riêng các thao tác GHI (tạo/sửa/xóa) bị siết chặt theo đúng nghiệp vụ từng vai trò.
const STAFF_WRITE = {
  NhanVienBanHang: ["customers", "sales-orders", "invoices", "payments", "returns", "promotions", "cash-receipts"],
  ThuKho: ["products", "product-categories", "goods-receipts", "goods-issues", "inventory", "stocktakes"],
  NhanVienKho: ["products", "product-categories", "goods-receipts", "goods-issues", "inventory", "stocktakes"],
  KeToan: ["invoices", "payments", "debts", "reports", "cash-receipts", "cash-payments"],
  NhanVienMuaHang: ["suppliers", "purchase-orders", "goods-receipts"],
};

export const DEFAULT_ROLE_PERMISSIONS = {
  // Quản trị hệ thống: Toàn quyền quản trị tài khoản, phân quyền, người dùng và hệ thống
  QuanTriHeThong: Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, FULL])),
  // Quản lý: Toàn quyền mọi chức năng, giám sát và xem báo cáo
  QuanLy: Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, FULL])),
  admin: Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, FULL])),
  manager: Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, FULL])),
};

for (const [roleKey, writeModules] of Object.entries(STAFF_WRITE)) {
  DEFAULT_ROLE_PERMISSIONS[roleKey] = Object.fromEntries(
    PERMISSION_MODULES.map((m) => [
      m.key,
      // Quản trị hệ thống: nhân viên thường không có
      m.group === "Quản trị" ? [] : writeModules.includes(m.key) ? FULL : READ,
    ])
  );
}

export const ROLE_DESCRIPTIONS = {
  QuanTriHeThong: "Quản trị hệ thống: Quản lý tài khoản, phân quyền, nhân sự và cấu hình hệ thống.",
  QuanLy: "Quản lý chung: Xem báo cáo doanh thu, tồn kho, công nợ và giám sát hoạt động kinh doanh.",
  KeToan: "Kế toán: Quản lý hóa đơn, thanh toán, công nợ, thu tiền, chi tiền và báo cáo thống kê.",
  NhanVienBanHang: "Nhân viên bán hàng: Bán hàng tại quầy, lập hóa đơn, thu tiền và khuyến mãi.",
  ThuKho: "Thủ kho: Quản lý sản phẩm, nhập kho, xuất kho, tồn kho và kiểm kê.",
  NhanVienKho: "Thủ kho: Quản lý sản phẩm, nhập kho, xuất kho, tồn kho và kiểm kê.",
  NhanVienMuaHang: "Nhân viên mua hàng: Quản lý nhà cung cấp, đặt hàng NCC và phiếu nhập.",
};

// ---- Bộ nhớ đệm quyền theo vai trò (tránh truy vấn DB mỗi request) ----
const permCache = new Map();
const CACHE_TTL = 15000;

export function invalidateRoleCache(roleKey) {
  if (roleKey) permCache.delete(roleKey);
  else permCache.clear();
}

export async function getRolePermissions(db, roleKey) {
  if (!roleKey) return null;
  const hit = permCache.get(roleKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.perms;
  let perms = null;
  try {
    const role = await db.collection("VaiTro").findOne({ MaKey: roleKey });
    if (role?.QuyenHan && Object.keys(role.QuyenHan).length) perms = role.QuyenHan;
  } catch {
    // DB lỗi tạm thời: dùng mặc định bên dưới
  }
  if (!perms) perms = DEFAULT_ROLE_PERMISSIONS[roleKey] || null;
  permCache.set(roleKey, { perms, at: Date.now() });
  return perms;
}

// Middleware kiểm tra 1 quyền cụ thể. Quản lý luôn được qua.
export function requirePermission(moduleKey, action) {
  return async (req, res, next) => {
    try {
      const roleKey = req.user?.role;
      if (!roleKey) return res.status(401).json({ message: "Chưa xác thực" });
      if (
        roleKey === "QuanLy" ||
        roleKey === "QuanTriHeThong" ||
        roleKey === "admin" ||
        roleKey === "manager"
      ) return next();
      const perms = await getRolePermissions(getDatabase(), roleKey);
      if (!perms?.[moduleKey]?.includes(action)) {
        return res.status(403).json({ message: "Permission denied" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
