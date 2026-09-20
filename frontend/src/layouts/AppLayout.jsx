import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  TagIcon,
  ShoppingCartIcon,
  ArchiveBoxArrowDownIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon,
  ArrowUturnLeftIcon,
  ChartBarIcon,
  CreditCardIcon,
  GiftIcon,
  UsersIcon,
  ShieldCheckIcon,
  KeyIcon,
  WalletIcon,
  DocumentCurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { moduleRoutes } from "../routes/moduleRoutes.js";
import { getUserPermissions, userCanAccessPath } from "../lib/permissions.js";
import { ToastContainer } from "../components/Toast.jsx";
import { NotificationPopover } from "../components/NotificationPopover.jsx";
import { logout as logoutFromApi } from "../lib/api.js";

const routeIcons = {
  "/dashboard": HomeIcon,
  "/customers": UserGroupIcon,
  "/suppliers": BuildingStorefrontIcon,
  "/products": CubeIcon,
  "/products/categories": TagIcon,
  "/purchase-orders": ShoppingCartIcon,
  "/goods-receipts": ArchiveBoxArrowDownIcon,
  "/sales-orders": BanknotesIcon,
  "/invoices": DocumentTextIcon,
  "/goods-issues": ArchiveBoxIcon,
  "/inventory": CubeIcon,
  "/stocktakes": ClipboardDocumentCheckIcon,
  "/returns": ArrowUturnLeftIcon,
  "/cash-receipts": WalletIcon,
  "/cash-payments": DocumentCurrencyDollarIcon,
  "/debts": CreditCardIcon,
  "/promotions": GiftIcon,
  "/reports": ChartBarIcon,
  "/admin/employees": UsersIcon,
  "/admin/roles": ShieldCheckIcon,
  "/admin/accounts": KeyIcon,
};

const ROLE_LABELS = {
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "NV Bán hàng",
  NhanVienKho: "NV Kho",
  NhanVienMuaHang: "NV Mua hàng",
};

const navGroups = [
  ["Tổng quan", ["/dashboard"]],
  ["Danh mục", ["/customers", "/suppliers", "/products", "/products/categories"]],
  ["Mua hàng", ["/purchase-orders", "/goods-receipts"]],
  ["Bán hàng", ["/sales-orders", "/invoices"]],
  ["Kho", ["/goods-issues", "/inventory", "/stocktakes", "/returns"]],
  ["Thu chi", ["/cash-receipts", "/cash-payments"]],
  ["Báo cáo", ["/debts", "/promotions", "/reports"]],
  ["Quản trị", ["/admin/employees", "/admin/roles", "/admin/accounts"]],
];

const allRoutes = [
  { path: "/dashboard", title: "Trang chủ" },
  ...moduleRoutes,
];

function getPageTitle(pathname) {
  const route = allRoutes.find((r) => r.path === pathname);
  return route ? route.title : "Trang chủ";
}

export function AppLayout() {
  const storedUser = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
  const user = {
    ...storedUser,
    role: {
      "Quản lý": "QuanLy",
      "Kế toán": "KeToan",
      "Nhân viên bán hàng": "NhanVienBanHang",
      "Nhân viên kho": "NhanVienKho",
      "Nhân viên mua hàng": "NhanVienMuaHang",
    }[storedUser.role] || storedUser.role,
  };
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visiblePaths = new Set([
    "/dashboard",
    // Ưu tiên ma trận quyền chi tiết của vai trò; fallback về allowedRoles nếu chưa re-login
    ...moduleRoutes.filter((route) =>
      getUserPermissions()
        ? userCanAccessPath(route.path)
        : !route.allowedRoles || route.allowedRoles.includes(user.role)
    ).map((route) => route.path),
  ]);

  async function logout() {
    try {
      await logoutFromApi();
    } finally {
      window.location.href = "/login";
    }
  }

  const pageTitle = getPageTitle(location.pathname);

  const sidebarContent = (
    <>
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">MB</span>
        <hgroup>
          <strong>Mẹ &amp; Bé</strong>
          <small>Hệ thống quản lý</small>
        </hgroup>
      </header>

      <nav className="main-nav" aria-label="Điều hướng chính">
        {navGroups.map(([group, paths]) => {
          const items = paths
            .filter((p) => visiblePaths.has(p))
            .map((p) => {
              const route = allRoutes.find((r) => r.path === p);
              const Icon = routeIcons[p] || DocumentTextIcon;
              return { path: p, title: route?.title || p, Icon };
            });
          if (!items.length) return null;
          return (
            <section key={group}>
              <h3 className="nav-group-label">{group}</h3>
              {items.map(({ path, title, Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end
                  className="nav-item"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="nav-icon" aria-hidden="true" />
                  <span>{title}</span>
                </NavLink>
              ))}
            </section>
          );
        })}
      </nav>

      <footer className="sidebar-foot">
        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {(user.username || "?").slice(0, 2).toUpperCase()}
          </span>
          <hgroup>
            <strong>{user.fullName || user.username || "admin"}</strong>
            <small>{user.roleName || ROLE_LABELS[user.role] || user.role || "Thành viên"}</small>
          </hgroup>
        </div>
        <button className="logout-button" type="button" onClick={logout}>
          <ArrowRightStartOnRectangleIcon className="nav-icon" aria-hidden="true" />
          Đăng xuất
        </button>
      </footer>
    </>
  );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`} aria-label="Thanh điều hướng">
        {mobileOpen && (
          <button
            className="close-x"
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
            style={{ position: "absolute", top: 12, right: 12 }}
          >
            <XMarkIcon className="ic" style={{ color: "#fff" }} aria-hidden="true" />
          </button>
        )}
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 49 }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Bars3Icon style={{ width: 18, height: 18 }} aria-hidden="true" />
            </button>
            <nav aria-label="Breadcrumb">
              <ol className="topbar-breadcrumb">
                <li>
                  <NavLink to="/dashboard" className="breadcrumb-link">
                    <HomeIcon className="breadcrumb-icon" aria-hidden="true" />
                    <span>Trang chủ</span>
                  </NavLink>
                </li>
                {location.pathname !== "/dashboard" && (
                  <li className="breadcrumb-current">{pageTitle}</li>
                )}
              </ol>
            </nav>
          </div>
          <div className="topbar-right">
            <NotificationPopover />
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}
