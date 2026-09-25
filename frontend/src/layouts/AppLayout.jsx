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
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  WalletIcon,
  DocumentCurrencyDollarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  CircleStackIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { moduleRoutes } from "../routes/moduleRoutes.js";
import { getUserPermissions, userCanAccessPath } from "../lib/permissions.js";
import { ToastContainer, toast } from "../components/Toast.jsx";
import { NotificationPopover } from "../components/NotificationPopover.jsx";
import { Modal } from "../components/Modal.jsx";
import { CommandPalette } from "../components/CommandPalette.jsx";
import { ShortcutsHelpModal } from "../components/ShortcutsHelpModal.jsx";
import { logout as logoutFromApi, changePassword } from "../lib/api.js";

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
  "/admin/audit-logs": ClipboardDocumentListIcon,
  "/admin/backup": CircleStackIcon,
};

const ROLE_LABELS = {
  QuanTriHeThong: "Quản trị hệ thống",
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "NV Bán hàng",
  ThuKho: "Thủ kho",
  NhanVienKho: "Thủ kho",
  NhanVienMuaHang: "NV Mua hàng",
};

const navGroups = [
  ["Tổng quan", ["/dashboard"]],
  ["Bán hàng", ["/sales-orders", "/invoices", "/customers", "/promotions", "/returns"]],
  ["Nhập hàng", ["/suppliers", "/purchase-orders", "/goods-receipts"]],
  ["Kho hàng", ["/inventory", "/stocktakes", "/goods-issues", "/products", "/products/categories"]],
  ["Kế toán & Quỹ", ["/debts", "/cash-receipts", "/cash-payments"]],
  ["Báo cáo", ["/reports"]],
  ["Quản trị", ["/admin/employees", "/admin/roles", "/admin/accounts", "/admin/audit-logs", "/admin/backup"]],
];

const allRoutes = [
  { path: "/dashboard", title: "Trang chủ" },
  ...moduleRoutes,
];

function getPageTitle(pathname) {
  const route = allRoutes.find((r) => r.path === pathname);
  return route ? route.title : "Trang chủ";
}

function getPasswordStrength(p) {
  if (!p) return { score: 0, label: "Chưa nhập", color: "#CBD5E1" };
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[a-zA-Z]/.test(p) && /\d/.test(p)) s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  if (s <= 1) return { score: 1, label: "Yếu", color: "#EF4444" };
  if (s === 2) return { score: 2, label: "Trung bình", color: "#F59E0B" };
  if (s === 3) return { score: 3, label: "Khá", color: "#3B82F6" };
  return { score: 4, label: "Rất mạnh", color: "#10B981" };
}

export function AppLayout() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
  const user = {
    ...storedUser,
    role: {
      "Quản trị hệ thống": "QuanTriHeThong",
      "Quản lý": "QuanLy",
      "Kế toán": "KeToan",
      "Nhân viên bán hàng": "NhanVienBanHang",
      "Thủ kho": "ThuKho",
      "Nhân viên kho": "ThuKho",
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

  // Change Password Modal state
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwds, setShowPwds] = useState({ current: false, next: false, confirm: false });

  // Command Palette & Keyboard Shortcuts
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts (Ctrl+K for Command Palette, Ctrl+B for Sidebar, ? for Help, F2 for POS, F9 for Reports)
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      const isInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapsed();
      } else if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === "F2" && !isInput) {
        e.preventDefault();
        navigate("/sales-orders");
      } else if (e.key === "F9" && !isInput) {
        e.preventDefault();
        navigate("/reports");
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [navigate]);

  const handleOpenChangePwd = () => {
    setUserMenuOpen(false);
    setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPwdError("");
    setShowPwds({ current: false, next: false, confirm: false });
    setChangePwdOpen(true);
  };

  const handleChangePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setPwdError("");

    if (!pwdForm.currentPassword) {
      setPwdError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (!pwdForm.newPassword) {
      setPwdError("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      setPwdError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }
    if (pwdForm.newPassword === pwdForm.currentPassword) {
      setPwdError("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    try {
      setPwdLoading(true);
      const res = await changePassword(pwdForm.currentPassword, pwdForm.newPassword, pwdForm.confirmPassword);
      toast(res?.message || "Đổi mật khẩu thành công!");
      setChangePwdOpen(false);
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwdError(err.message || "Đổi mật khẩu thất bại. Vui lòng thử lại!");
    } finally {
      setPwdLoading(false);
    }
  };

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
      <header className="brand" title={collapsed ? "Hệ thống Quản lý Mẹ & Bé" : undefined}>
        <div className="brand-logo-badge">
          <img
            src="/logo.png"
            alt="Logo Mẹ & Bé"
            className="brand-logo-img"
          />
        </div>
        {!collapsed && (
          <hgroup>
            <strong>Mẹ &amp; Bé</strong>
            <small>Hệ thống quản lý Cửa hàng Mẹ và Bé</small>
          </hgroup>
        )}
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
            <div
              className="topbar-search-trigger"
              onClick={() => setCmdPaletteOpen(true)}
              role="button"
              tabIndex={0}
              title="Nhấn Ctrl + K để mở tìm kiếm nhanh toàn hệ thống"
            >
              <div className="topbar-search-trigger-content">
                <MagnifyingGlassIcon style={{ width: 15, height: 15, color: "#64748B", flexShrink: 0 }} aria-hidden="true" />
                <span>Tìm kiếm phân hệ, báo cáo...</span>
              </div>
              <kbd className="erp-kbd">Ctrl K</kbd>
            </div>
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

          <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Quick POS action for Sales staff / Admin */}
            {visiblePaths.has("/sales-orders") && (
              <button
                type="button"
                className="topbar-quick-action-btn"
                onClick={() => navigate("/sales-orders")}
                title="Bán hàng nhanh tại quầy"
              >
                <ShoppingCartIcon style={{ width: 16, height: 16 }} />
                <span>Bán hàng</span>
              </button>
            )}

            {/* Keyboard shortcuts help button */}
            <button
              type="button"
              className="topbar-help-btn"
              onClick={() => setShortcutsOpen(true)}
              title="Xem bảng phím tắt hệ thống (?)"
              aria-label="Xem bảng phím tắt hệ thống"
            >
              <QuestionMarkCircleIcon style={{ width: 18, height: 18 }} />
            </button>

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
                  {(user.role === "QuanLy" || user.role === "QuanTriHeThong") && (
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
                  )}
                  <button
                    type="button"
                    className="topbar-dropdown-item"
                    onClick={handleOpenChangePwd}
                  >
                    <LockClosedIcon style={{ width: 16, height: 16 }} />
                    Đổi mật khẩu
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

      {/* Modal Đổi mật khẩu cá nhân */}
      <Modal
        open={changePwdOpen}
        title="Đổi mật khẩu cá nhân"
        subtitle="Quản lý an toàn và bảo mật tài khoản người dùng"
        onClose={() => !pwdLoading && setChangePwdOpen(false)}
        onSubmit={handleChangePasswordSubmit}
        submitLabel={pwdLoading ? "Đang xử lý..." : "Lưu mật khẩu mới"}
        cancelLabel="Hủy bỏ"
        loading={pwdLoading}
      >
        {(() => {
          const strength = getPasswordStrength(pwdForm.newPassword);
          const isMinLength = pwdForm.newPassword.length >= 6;
          const hasLetterAndNumber = /[a-zA-Z]/.test(pwdForm.newPassword) && /\d/.test(pwdForm.newPassword);
          const hasConfirm = Boolean(pwdForm.confirmPassword);
          const isMatch = hasConfirm && pwdForm.newPassword === pwdForm.confirmPassword;

          return (
            <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 4 }}>
              {/* Account Security Header Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: "linear-gradient(135deg, #E6F4F1 0%, #D8ECE8 100%)",
                  border: "1px solid #B8D5D0",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "#3D7068",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(61, 112, 104, 0.25)",
                  }}
                >
                  <ShieldCheckIcon style={{ width: 22, height: 22 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1D3834" }}>
                      Tài khoản:
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        color: "#2A4F49",
                        padding: "2px 8px",
                        borderRadius: 5,
                        border: "1px solid #B8D5D0",
                      }}
                    >
                      @{user.username || "user"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                    {user.fullName || "Người dùng"} · {user.role || "Nhân viên"}
                  </div>
                </div>
              </div>

              {pwdError && (
                <div
                  style={{
                    padding: "11px 14px",
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    borderRadius: 8,
                    color: "#991B1B",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>⚠</span>
                  <span style={{ flex: 1 }}>{pwdError}</span>
                </div>
              )}

              {/* Field 1: Mật khẩu hiện tại */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#1E293B", marginBottom: 6 }}>
                  Mật khẩu hiện tại <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <KeyIcon
                    style={{
                      position: "absolute",
                      left: 12,
                      width: 17,
                      height: 17,
                      color: "#94A3B8",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type={showPwds.current ? "text" : "password"}
                    className="form-input"
                    style={{ width: "100%", paddingLeft: 38, paddingRight: 40, height: 40, borderRadius: 8 }}
                    value={pwdForm.currentPassword}
                    placeholder="Nhập mật khẩu hiện tại"
                    onChange={(e) => setPwdForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    autoFocus
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 8,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748B",
                      padding: 6,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 4,
                    }}
                    onClick={() => setShowPwds((s) => ({ ...s, current: !s.current }))}
                    tabIndex={-1}
                    title={showPwds.current ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPwds.current ? <EyeSlashIcon style={{ width: 17, height: 17 }} /> : <EyeIcon style={{ width: 17, height: 17 }} />}
                  </button>
                </div>
              </div>

              {/* Field 2: Mật khẩu mới */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "#1E293B" }}>
                    Mật khẩu mới <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  {pwdForm.newPassword && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: strength.color }}>
                      Độ mạnh: {strength.label}
                    </span>
                  )}
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <LockClosedIcon
                    style={{
                      position: "absolute",
                      left: 12,
                      width: 17,
                      height: 17,
                      color: "#94A3B8",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type={showPwds.next ? "text" : "password"}
                    className="form-input"
                    style={{ width: "100%", paddingLeft: 38, paddingRight: 40, height: 40, borderRadius: 8 }}
                    value={pwdForm.newPassword}
                    placeholder="Tối thiểu 6 ký tự (nên gồm cả chữ và số)"
                    onChange={(e) => setPwdForm((f) => ({ ...f, newPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 8,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748B",
                      padding: 6,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 4,
                    }}
                    onClick={() => setShowPwds((s) => ({ ...s, next: !s.next }))}
                    tabIndex={-1}
                    title={showPwds.next ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPwds.next ? <EyeSlashIcon style={{ width: 17, height: 17 }} /> : <EyeIcon style={{ width: 17, height: 17 }} />}
                  </button>
                </div>

                {/* Password Strength Indicator Bars */}
                {pwdForm.newPassword && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginTop: 6 }}>
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: strength.score >= level ? strength.color : "#E2E8F0",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Requirements Checklist */}
                <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: isMinLength ? "#16A34A" : "#64748B" }}>
                    <CheckCircleIcon style={{ width: 13, height: 13, color: isMinLength ? "#16A34A" : "#CBD5E1" }} />
                    Tối thiểu 6 ký tự
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: hasLetterAndNumber ? "#16A34A" : "#64748B" }}>
                    <CheckCircleIcon style={{ width: 13, height: 13, color: hasLetterAndNumber ? "#16A34A" : "#CBD5E1" }} />
                    Gồm chữ và số
                  </span>
                </div>
              </div>

              {/* Field 3: Xác nhận mật khẩu mới */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: "#1E293B" }}>
                    Xác nhận mật khẩu mới <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  {hasConfirm && (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: isMatch ? "#16A34A" : "#EF4444" }}>
                      {isMatch ? "✓ Mật khẩu khớp" : "✕ Chưa khớp"}
                    </span>
                  )}
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <ShieldCheckIcon
                    style={{
                      position: "absolute",
                      left: 12,
                      width: 17,
                      height: 17,
                      color: "#94A3B8",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type={showPwds.confirm ? "text" : "password"}
                    className="form-input"
                    style={{
                      width: "100%",
                      paddingLeft: 38,
                      paddingRight: 40,
                      height: 40,
                      borderRadius: 8,
                      borderColor: hasConfirm ? (isMatch ? "#86EFAC" : "#FCA5A5") : undefined,
                    }}
                    value={pwdForm.confirmPassword}
                    placeholder="Nhập lại chính xác mật khẩu mới"
                    onChange={(e) => setPwdForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    style={{
                      position: "absolute",
                      right: 8,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748B",
                      padding: 6,
                      display: "flex",
                      alignItems: "center",
                      borderRadius: 4,
                    }}
                    onClick={() => setShowPwds((s) => ({ ...s, confirm: !s.confirm }))}
                    tabIndex={-1}
                    title={showPwds.confirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPwds.confirm ? <EyeSlashIcon style={{ width: 17, height: 17 }} /> : <EyeIcon style={{ width: 17, height: 17 }} />}
                  </button>
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
      />

      {/* Keyboard Shortcuts Help Modal (?) */}
      <ShortcutsHelpModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}
