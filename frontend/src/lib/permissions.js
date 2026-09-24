// Bộ định nghĩa phân quyền chi tiết phía frontend (đồng bộ với backend/src/modules/shared/permissions.js)

export const ACTIONS = [
  { key: "xem", label: "Xem", short: "X" },
  { key: "tao", label: "Tạo mới", short: "T" },
  { key: "sua", label: "Sửa", short: "S" },
  { key: "xoa", label: "Xóa", short: "D" },
];

export const PERMISSION_GROUPS = [
  {
    group: "Tổng quan",
    modules: [{ key: "dashboard", label: "Trang chủ" }],
  },
  {
    group: "Danh mục",
    modules: [
      { key: "customers", label: "Khách hàng" },
      { key: "suppliers", label: "Nhà cung cấp" },
      { key: "products", label: "Sản phẩm" },
      { key: "product-categories", label: "Loại hàng" },
    ],
  },
  {
    group: "Mua hàng",
    modules: [
      { key: "purchase-orders", label: "Đặt hàng NCC" },
      { key: "goods-receipts", label: "Nhập kho" },
    ],
  },
  {
    group: "Bán hàng",
    modules: [
      { key: "sales-orders", label: "Bán hàng" },
      { key: "invoices", label: "Hóa đơn" },
      { key: "payments", label: "Ghi nhận thanh toán" },
    ],
  },
  {
    group: "Kho",
    modules: [
      { key: "goods-issues", label: "Xuất kho" },
      { key: "inventory", label: "Tồn kho" },
      { key: "stocktakes", label: "Kiểm kê kho" },
      { key: "returns", label: "Trả hàng" },
    ],
  },
  {
    group: "Thu chi",
    modules: [
      { key: "cash-receipts", label: "Phiếu thu" },
      { key: "cash-payments", label: "Phiếu chi" },
    ],
  },
  {
    group: "Báo cáo & Khuyến mãi",
    modules: [
      { key: "promotions", label: "Khuyến mãi" },
      { key: "debts", label: "Công nợ" },
      { key: "reports", label: "Báo cáo thống kê" },
    ],
  },
  {
    group: "Quản trị",
    modules: [
      { key: "admin-employees", label: "Nhân viên" },
      { key: "admin-roles", label: "Phân quyền" },
      { key: "admin-accounts", label: "QL người dùng" },
    ],
  },
];

// Đường dẫn menu -> khóa phân quyền
export const PATH_PERMISSION_KEY = {
  "/dashboard": "dashboard",
  "/customers": "customers",
  "/suppliers": "suppliers",
  "/products": "products",
  "/products/categories": "product-categories",
  "/purchase-orders": "purchase-orders",
  "/goods-receipts": "goods-receipts",
  "/sales-orders": "sales-orders",
  "/invoices": "invoices",
  "/goods-issues": "goods-issues",
  "/inventory": "inventory",
  "/stocktakes": "stocktakes",
  "/returns": "returns",
  "/cash-receipts": "cash-receipts",
  "/cash-payments": "cash-payments",
  "/promotions": "promotions",
  "/debts": "debts",
  "/reports": "reports",
  "/admin/employees": "admin-employees",
  "/admin/roles": "admin-roles",
  "/admin/accounts": "admin-accounts",
};

export function getUserPermissions() {
  try {
    const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    return user?.permissions || null;
  } catch {
    return null;
  }
}

// Vai trò có được thực hiện `action` trên module hay không
export function userCan(moduleKey, action = "xem") {
  const perms = getUserPermissions();
  if (!perms) return true; // chưa có dữ liệu quyền -> không chặn (fallback an toàn)
  return (perms[moduleKey] || []).includes(action);
}

// Vai trò có bất kỳ quyền nào trên module (để hiện/ẩn mục menu)
export function userCanAccessPath(path) {
  const moduleKey = PATH_PERMISSION_KEY[path];
  if (!moduleKey || moduleKey === "dashboard") return true;
  const perms = getUserPermissions();
  if (!perms) return true;
  return (perms[moduleKey] || []).length > 0;
}

export const ROLE_LABELS = {
  QuanTriHeThong: "Quản trị hệ thống",
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "Nhân viên bán hàng",
  ThuKho: "Thủ kho",
  NhanVienKho: "Thủ kho",
  NhanVienMuaHang: "Nhân viên mua hàng",
};

export function currentUserInfo() {
  try {
    const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    const roleName = ROLE_LABELS[user.role] || user.role || "Nhân viên";
    return {
      name: user.fullName || user.username || "Nhân viên",
      role: user.role || "",
      roleName,
      username: user.username || "",
      display: `${user.fullName || user.username || "Nhân viên"} · ${roleName}`,
    };
  } catch {
    return { name: "Nhân viên", roleName: "Nhân viên", display: "Nhân viên" };
  }
}

