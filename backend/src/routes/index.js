import { Router } from "express";
import { modules } from "../modules/index.js";
import { requireAuth } from "../common/middlewares/auth.middleware.js";
import { allowRoles } from "../common/middlewares/role.middleware.js";

const router = Router();
const permissions = {
  "/customers": ["QuanLy", "NhanVienBanHang"],
  "/suppliers": ["QuanLy", "NhanVienMuaHang"],
  "/products": ["QuanLy", "NhanVienKho"],
  "/product-categories": ["QuanLy", "NhanVienKho"],
  "/purchase-orders": ["QuanLy", "NhanVienMuaHang"],
  "/goods-receipts": ["QuanLy", "NhanVienKho", "NhanVienMuaHang"],
  "/sales-orders": ["QuanLy", "NhanVienBanHang"],
  "/invoices": ["QuanLy", "NhanVienBanHang", "KeToan"],
  "/goods-issues": ["QuanLy", "NhanVienKho"],
  "/inventory": ["QuanLy", "NhanVienKho"],
  "/stocktakes": ["QuanLy", "NhanVienKho"],
  "/returns": ["QuanLy", "NhanVienBanHang"],
  "/promotions": ["QuanLy", "NhanVienBanHang"],
  "/debts": ["QuanLy", "KeToan"],
  "/reports": ["QuanLy", "KeToan"],
  "/payments": ["QuanLy", "KeToan", "NhanVienBanHang"]
};

for (const moduleConfig of modules) {
  if (moduleConfig.path === "/auth") {
    router.use(moduleConfig.path, moduleConfig.router);
  } else if (moduleConfig.path.startsWith("/admin")) {
    router.use(moduleConfig.path, requireAuth, allowRoles("QuanLy"), moduleConfig.router);
  } else if (moduleConfig.path === "/reports") {
    router.use(moduleConfig.path, requireAuth, allowRoles("QuanLy", "KeToan"), moduleConfig.router);
  } else {
    router.use(
      moduleConfig.path,
      requireAuth,
      permissions[moduleConfig.path]
        ? (req, res, next) => {
            // Cho phép tất cả nhân viên đã đăng nhập đọc dữ liệu (GET) để liên kết chéo
            if (req.method === "GET") return next();
            return allowRoles(...permissions[moduleConfig.path])(req, res, next);
          }
        : (_req, _res, next) => next(),
      moduleConfig.router
    );
  }
}

export default router;
