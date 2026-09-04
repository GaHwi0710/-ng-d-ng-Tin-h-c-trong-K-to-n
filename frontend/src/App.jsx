import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { ModulePage } from "./pages/ModulePage.jsx";
import { moduleRoutes } from "./routes/moduleRoutes.js";

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

function RequireRole({ roles, children }) {
  const user = getUserRole();
  return !roles || roles.includes(user.role) ? children : <Navigate to="/dashboard" replace />;
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
            element={<RequireRole roles={route.allowedRoles}><ModulePage title={route.title} description={route.description} /></RequireRole>}
          />
        ))}
      </Route>
    </Routes>
  );
}
