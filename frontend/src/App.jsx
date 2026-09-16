import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ModulePage } from "./pages/ModulePage.jsx";
import { moduleRoutes } from "./routes/moduleRoutes.js";
import { getUserPermissions, userCanAccessPath } from "./lib/permissions.js";

function getUserRole() {
  const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
  return {
    ...user,
    role: {
      "Quản lý": "QuanLy",
      "Kế toán": "KeToan",
      "Nhân viên bán hàng": "NhanVienBanHang",
      "Nhân viên kho": "NhanVienKho",
      "Nhân viên mua hàng": "NhanVienMuaHang",
    }[user.role] || user.role,
  };
}

function RequireAuth({ children }) {
  return localStorage.getItem("baby-shop-token") ? children : <Navigate to="/login" replace />;
}

// Chặn truy cập trang theo ma trận quyền chi tiết của vai trò.
// Nếu tài khoản đăng nhập trước khi có ma trận quyền (chưa re-login), fallback về allowedRoles tĩnh.
function RequireRole({ path, roles, children }) {
  const user = getUserRole();
  const allowed = getUserPermissions()
    ? userCanAccessPath(path)
    : !roles || roles.includes(user.role);
  return allowed ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        {moduleRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<RequireRole path={route.path} roles={route.allowedRoles}><ModulePage title={route.title} description={route.description} /></RequireRole>}
          />
        ))}
      </Route>
    </Routes>
  );
}
