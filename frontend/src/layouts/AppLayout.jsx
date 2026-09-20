import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
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
  const navigate = useNavigate();
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("erp_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("erp_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
  const currentGroup = navGroups.find(([_, paths]) => paths.includes(location.pathname))?.[0];

  const sidebarContent = (
    <>
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">MB</span>
        <hgroup>
          <strong>Mẹ &amp; Bé</strong>
          <small>Hệ thống ERP</small>
        </hgroup>
      </header>

      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={toggleCollapsed}
        title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
      >
        {collapsed ? (
          <ChevronRightIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
        ) : (
          <>
            <ChevronLeftIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
            <span>Thu gọn menu</span>
          </>
        )}
      </button>

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
                  title={collapsed ? title : undefined}
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
        <button
          className="logout-button"
          type="button"
          onClick={logout}
          title={collapsed ? "Đăng xuất" : undefined}
        >
          <ArrowRightStartOnRectangleIcon className="nav-icon" aria-hidden="true" />
          <span>Đăng xuất</span>
        </button>
      </footer>
    </>
  );

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
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
                {currentGroup && currentGroup !== "Tổng quan" && (
                  <li style={{ color: "var(--text-faint)" }}>{currentGroup}</li>
                )}
                {location.pathname !== "/dashboard" && (
                  <li className="breadcrumb-current">{pageTitle}</li>
                )}
              </ol>
            </nav>
          </div>

          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="system-status-pill" title="Hệ thống cơ sở dữ liệu và API hoạt động bình thường">
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Sẵn sàng
            </span>

            <NotificationPopover />

            {/* User Profile Popover */}
            <div style={{ position: "relative" }} ref={userMenuRef}>
              <div
                className="topbar-user-badge"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                role="button"
                tabIndex={0}
                aria-expanded={userMenuOpen}
              >
                <div className="topbar-user-avatar">
                  {(user.fullName || user.username || "A").slice(0, 1).toUpperCase()}
                </div>
                <span className="topbar-user-name">{user.fullName || user.username || "Admin"}</span>
                <span className="topbar-user-role-badge">
                  {ROLE_LABELS[user.role] || user.role || "Nhân viên"}
                </span>
                <ChevronDownIcon style={{ width: 13, height: 13, color: "var(--text-faint)" }} />
              </div>

              {userMenuOpen && (
                <div className="topbar-user-dropdown" role="menu">
                  <div className="topbar-user-dropdown-header">
                    <strong>{user.fullName || user.username || "Quản trị viên"}</strong>
                    <small>@{user.username} · {ROLE_LABELS[user.role] || user.role || "Nhân viên"}</small>
                  </div>
                  <button
                    type="button"
                    className="topbar-dropdown-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/admin/accounts");
                    }}
                  >
                    <KeyIcon style={{ width: 16, height: 16 }} />
                    Quản lý tài khoản
                  </button>
                  <button
                    type="button"
                    className="topbar-dropdown-item danger"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                  >
                    <ArrowRightStartOnRectangleIcon style={{ width: 16, height: 16 }} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
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
