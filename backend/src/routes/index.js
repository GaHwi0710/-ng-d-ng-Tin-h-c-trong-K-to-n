import { Router } from "express";
import { modules } from "../modules/index.js";
import { requireAuth } from "../common/middlewares/auth.middleware.js";
import { allowRoles } from "../common/middlewares/role.middleware.js";
import { requirePermission } from "../modules/shared/permissions.js";

const router = Router();

// Ánh xạ đường dẫn module -> khóa phân quyền (định nghĩa trong shared/permissions.js)
const permissionByPath = {
  "/customers": "customers",
  "/suppliers": "suppliers",
  "/products": "products",
  "/product-categories": "product-categories",
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
  "/payments": "payments",
};

// HTTP method -> hành động cần kiểm tra quyền (kể cả XEM)
const methodAction = { GET: "xem", POST: "tao", PUT: "sua", PATCH: "sua", DELETE: "xoa" };

for (const moduleConfig of modules) {
  if (moduleConfig.path === "/auth") {
    router.use(moduleConfig.path, moduleConfig.router);
  } else if (moduleConfig.path.startsWith("/admin")) {
    router.use(moduleConfig.path, requireAuth, allowRoles("QuanLy"), moduleConfig.router);
  } else if (moduleConfig.path === "/reports") {
    // Báo cáo: cần quyền Xem báo cáo
    router.use(moduleConfig.path, requireAuth, requirePermission("reports", "xem"), moduleConfig.router);
  } else {
    const moduleKey = permissionByPath[moduleConfig.path];
    router.use(
      moduleConfig.path,
      requireAuth,
      moduleKey
        ? (req, res, next) => {
            // Mọi thao tác (kể cả Xem) đều kiểm tra theo ma trận quyền của vai trò
            const action = methodAction[req.method];
            if (!action) return next();
            return requirePermission(moduleKey, action)(req, res, next);
          }
        : (_req, _res, next) => next(),
      moduleConfig.router
    );
  }
}

export default router;
