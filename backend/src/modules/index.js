import { createCrudModule } from "./shared/createCrudModule.js";
import authRouter from "./auth/auth.route.js";
import reportsRouter from "./reports/reports.route.js";
import businessRouter from "./business/business.route.js";
import accountsRouter from "./accounts/accounts.route.js";

export const modules = [
  { path: "/auth", router: authRouter },
  { path: "", router: businessRouter },
  { path: "/admin/accounts", router: accountsRouter },
  createCrudModule("customers", "KhachHang"),
  createCrudModule("suppliers", "NhaCungCap"),
  createCrudModule("products", "SanPham"),
  createCrudModule("product-categories", "LoaiHang"),
  createCrudModule("purchase-orders", "DonDatHang"),
  createCrudModule("goods-receipts", "PhieuNhap"),
  createCrudModule("sales-orders", "DonHang"),
  createCrudModule("invoices", "HoaDon"),
  createCrudModule("goods-issues", "PhieuXuat"),
  createCrudModule("inventory", "TonKho"),
  createCrudModule("stocktakes", "KiemKe"),
  createCrudModule("returns", "PhieuTraHang"),
  createCrudModule("promotions", "KhuyenMai"),
  createCrudModule("debts", "CongNo"),
  createCrudModule("payments", "ThanhToan"),
  createCrudModule("admin/employees", "NhanVien"),
  createCrudModule("admin/roles", "VaiTro"),
  { path: "/reports", router: reportsRouter }
];
