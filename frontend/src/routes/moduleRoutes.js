const manager = ["QuanLy"];
const sales = ["QuanLy", "NhanVienBanHang"];
const warehouse = ["QuanLy", "NhanVienKho"];
const accounting = ["QuanLy", "KeToan"];
const purchasing = ["QuanLy", "NhanVienMuaHang"];

export const moduleRoutes = [
  { path: "/customers", title: "Khách hàng", description: "Quản lý thông tin, điểm tích lũy và lịch sử mua hàng của khách.", allowedRoles: sales },
  { path: "/suppliers", title: "Nhà cung cấp", description: "Quản lý danh sách đối tác cung cấp hàng hóa.", allowedRoles: purchasing },
  { path: "/products", title: "Sản phẩm", description: "Quản lý danh mục sản phẩm, giá bán và tồn kho.", allowedRoles: warehouse },
  { path: "/products/categories", title: "Loại hàng", description: "Phân nhóm sản phẩm theo danh mục.", allowedRoles: warehouse },
  { path: "/purchase-orders", title: "Đặt hàng NCC", description: "Lập và theo dõi đơn đặt hàng từ nhà cung cấp.", allowedRoles: purchasing },
  { path: "/goods-receipts", title: "Nhập kho", description: "Nhập hàng theo đơn đặt và cập nhật tồn kho.", allowedRoles: ["QuanLy", "NhanVienKho", "NhanVienMuaHang"] },
  { path: "/sales-orders", title: "Bán hàng", description: "Lập đơn hàng tại quầy và xử lý thanh toán.", allowedRoles: sales },
  { path: "/invoices", title: "Hóa đơn & Thanh toán", description: "Quản lý hóa đơn và ghi nhận thanh toán.", allowedRoles: ["QuanLy", "NhanVienBanHang", "KeToan"] },
  { path: "/goods-issues", title: "Xuất kho", description: "Xuất hàng giao cho khách theo đơn hàng.", allowedRoles: warehouse },
  { path: "/inventory", title: "Tồn kho", description: "Theo dõi số lượng tồn kho từng sản phẩm.", allowedRoles: warehouse },
  { path: "/stocktakes", title: "Kiểm kê kho", description: "Đối chiếu tồn kho hệ thống với thực tế.", allowedRoles: warehouse },
  { path: "/returns", title: "Trả hàng", description: "Ghi nhận và xử lý hàng trả lại từ khách.", allowedRoles: sales },
  { path: "/debts", title: "Công nợ", description: "Theo dõi và quản lý công nợ nhà cung cấp.", allowedRoles: accounting },
  { path: "/promotions", title: "Khuyến mãi", description: "Tạo và quản lý chương trình khuyến mãi.", allowedRoles: ["QuanLy", "NhanVienBanHang"] },
  { path: "/reports", title: "Báo cáo", description: "Thống kê doanh thu, nhập xuất kho và công nợ.", allowedRoles: accounting },
  { path: "/admin/employees", title: "Nhân viên", description: "Quản lý thông tin nhân viên cửa hàng.", allowedRoles: manager },
  { path: "/admin/roles", title: "Phân quyền", description: "Quản lý vai trò và quyền hạn truy cập.", allowedRoles: manager },
  { path: "/admin/accounts", title: "Tài khoản", description: "Quản lý tài khoản đăng nhập hệ thống.", allowedRoles: manager },
];
