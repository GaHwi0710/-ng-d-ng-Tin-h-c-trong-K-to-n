import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  KeyIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  PhoneIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
<<<<<<< HEAD
import { PERMISSION_GROUPS, ACTIONS, currentUserInfo } from "../../lib/permissions.js";
=======
import { PERMISSION_GROUPS, ACTIONS } from "../../lib/permissions.js";
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Badge } from "../../components/Badge.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";

const roleLabels = {
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "Nhân viên bán hàng",
  NhanVienKho: "Nhân viên kho",
  NhanVienMuaHang: "Nhân viên mua hàng",
};

const roleColors = {
  QuanLy: "purple",
  KeToan: "green",
  NhanVienBanHang: "amber",
  NhanVienKho: "blue",
  NhanVienMuaHang: "teal",
};

const ROLE_ICON_BY_KEY = {
  QuanLy: "👑",
  KeToan: "🧮",
  NhanVienBanHang: "🛒",
  NhanVienKho: "📦",
  NhanVienMuaHang: "🚚",
};

const ACTION_STYLE = {
  xem: { background: "#e0f2fe", color: "#0369a1" },
  tao: { background: "#dcfce7", color: "#15803d" },
  sua: { background: "#fef3c7", color: "#b45309" },
  xoa: { background: "#fee2e2", color: "#b91c1c" },
};

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (!parts.length || !parts[0]) return "NV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminPage({ title, description, path }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current sub-tab from path or fallback
  const currentTab = location.pathname.includes("roles")
    ? "roles"
    : location.pathname.includes("accounts")
    ? "accounts"
    : "employees";

  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [query, setQuery] = useState("");

<<<<<<< HEAD
  const currentAdmin = currentUserInfo();
  const myUsername = currentAdmin.username || "";
  const activeAdminCount = useMemo(() => {
    return accounts.filter((a) => (a.role === "QuanLy" || a.VaiTro === "QuanLy") && a.status !== "Đã khóa").length;
  }, [accounts]);

=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: "", resource: "" });

  // Form states
  const [empForm, setEmpForm] = useState({ HoTen: "", SDT: "", CCCD: "", DiaChi: "", VaiTro: "Nhân viên bán hàng", TrangThai: "Đang làm việc" });
  const [accForm, setAccForm] = useState({ username: "", fullName: "", password: "", role: "NhanVienBanHang", status: "Hoạt động", CCCD: "", SDT: "", DiaChi: "" });
  const [roleForm, setRoleForm] = useState({ id: null, TenVaiTro: "", MoTa: "", QuyenHan: {}, copyFrom: "" });

  // ---- Helpers ma trận quyền ----
  function permActions(quyenHan, moduleKey) {
    return quyenHan?.[moduleKey] || [];
  }

  function togglePerm(moduleKey, action) {
    setRoleForm((prev) => {
      const current = prev.QuyenHan?.[moduleKey] || [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      const quyenHan = { ...(prev.QuyenHan || {}), [moduleKey]: next };
      if (!next.length) delete quyenHan[moduleKey];
      return { ...prev, QuyenHan: quyenHan };
    });
  }

  function toggleModuleAll(moduleKey) {
    setRoleForm((prev) => {
      const quyenHan = { ...(prev.QuyenHan || {}) };
      const allOn = ACTIONS.every((a) => quyenHan[moduleKey]?.includes(a.key));
      if (allOn) delete quyenHan[moduleKey];
      else quyenHan[moduleKey] = ACTIONS.map((a) => a.key);
      return { ...prev, QuyenHan: quyenHan };
    });
  }

  function toggleGroupAll(groupModules) {
    setRoleForm((prev) => {
      const quyenHan = { ...(prev.QuyenHan || {}) };
      const allOn = groupModules.every((m) =>
        ACTIONS.every((a) => quyenHan[m.key]?.includes(a.key))
      );
      for (const m of groupModules) {
        if (allOn) delete quyenHan[m.key];
        else quyenHan[m.key] = ACTIONS.map((a) => a.key);
      }
      return { ...prev, QuyenHan: quyenHan };
    });
  }

  function toggleAllGroups(enableAll) {
    setRoleForm((prev) => {
      const quyenHan = {};
      if (enableAll) {
        for (const g of PERMISSION_GROUPS) {
          for (const m of g.modules) {
            quyenHan[m.key] = ACTIONS.map((a) => a.key);
          }
        }
      }
      return { ...prev, QuyenHan: quyenHan };
    });
  }

  function countGranted(quyenHan) {
    return Object.values(quyenHan || {}).filter((acts) => acts?.length).length;
  }

  function countActions(quyenHan) {
    return Object.values(quyenHan || {}).reduce((sum, acts) => sum + (acts?.length || 0), 0);
  }

  // Bản quyền nguồn để "sao chép quyền từ" khi tạo vai trò mới
  function basePermissions(copyFromKey) {
    if (!copyFromKey) return {};
    const source = roles.find((r) => r.MaKey === copyFromKey);
    return JSON.parse(JSON.stringify(source?.QuyenHan || {}));
  }

  useEffect(() => {
    listRecords("admin/employees").then(setEmployees);
    listRecords("admin/accounts").then(setAccounts);
    listRecords("admin/roles").then(setRoles);
  }, []);

  const stats = useMemo(() => {
    const totalEmp = employees.length;
    const activeAcc = accounts.filter((a) => a.status === "Hoạt động").length;
    const totalRoles = roles.length;
    return { totalEmp, activeAcc, totalRoles };
  }, [employees, accounts, roles]);

  function switchTab(tabKey) {
    if (tabKey === "employees") navigate("/admin/employees");
    else if (tabKey === "accounts") navigate("/admin/accounts");
    else if (tabKey === "roles") navigate("/admin/roles");
  }

  function openCreate() {
    setEditing(null);
    if (currentTab === "employees") {
      setEmpForm({ HoTen: "", SDT: "", CCCD: "", DiaChi: "", VaiTro: "Nhân viên bán hàng", TrangThai: "Đang làm việc" });
    } else if (currentTab === "accounts") {
      setAccForm({ username: "", fullName: "", password: "password123", role: "NhanVienBanHang", status: "Hoạt động", CCCD: "", SDT: "", DiaChi: "" });
    } else {
      setRoleForm({ id: null, TenVaiTro: "", MoTa: "", QuyenHan: {}, copyFrom: "" });
    }
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    if (currentTab === "employees") {
      setEmpForm({
        id: item.id,
        HoTen: item.HoTen || "",
        SDT: item.SDT || "",
        CCCD: item.CCCD || "",
        DiaChi: item.DiaChi || "",
        VaiTro: item.VaiTro || "Nhân viên bán hàng",
        TrangThai: item.TrangThai || "Đang làm việc",
      });
    } else if (currentTab === "accounts") {
      setAccForm({
        id: item.id,
        username: item.username || "",
        fullName: item.fullName || "",
        password: "",
        role: item.role || "NhanVienBanHang",
        status: item.status || "Hoạt động",
        CCCD: item.CCCD || "",
        SDT: item.SDT || "",
        DiaChi: item.DiaChi || "",
      });
    } else {
      setRoleForm({
        id: item.id,
        TenVaiTro: item.TenVaiTro || "",
        MoTa: item.MoTa || "",
        QuyenHan: JSON.parse(JSON.stringify(item.QuyenHan || {})),
        copyFrom: "",
      });
    }
    setModalOpen(true);
  }

  async function handleToggleLock(acc) {
<<<<<<< HEAD
    const isSelf = Boolean(myUsername && acc.username && acc.username.toLowerCase() === myUsername.toLowerCase());
    if (isSelf) return toast("Bạn không thể tự khóa tài khoản của chính mình");
    const isOnlyAdmin = (acc.role === "QuanLy" || acc.VaiTro === "QuanLy") && activeAdminCount <= 1 && acc.status !== "Đã khóa";
    if (isOnlyAdmin) return toast("Không thể khóa Quản trị viên duy nhất còn lại của hệ thống");

=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    try {
      const isLocked = acc.status === "Đã khóa";
      const newStatus = isLocked ? "Hoạt động" : "Đã khóa";
      await saveRecord("admin/accounts", {
        ...acc,
        status: newStatus,
      });
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, status: newStatus } : a)));
      setEmployees((prev) => prev.map((e) => (e.username === acc.username ? { ...e, TrangThai: isLocked ? "Đang làm việc" : "Đã khóa" } : e)));
      toast(isLocked ? `Đã mở khóa tài khoản @${acc.username}` : `Đã khóa tài khoản @${acc.username} (Chặn đăng nhập)`);
    } catch (err) {
      toast(err.message || "Lỗi cập nhật trạng thái");
    }
  }

  async function handleSave() {
    try {
      if (currentTab === "employees") {
        if (!empForm.HoTen.trim()) return toast("Họ và tên là bắt buộc");
        if (!empForm.SDT?.trim()) return toast("Số điện thoại là bắt buộc");
        if (empForm.CCCD && !/^[0-9]{12}$/.test(empForm.CCCD.trim())) {
          return toast("Số CCCD phải gồm đúng 12 chữ số hợp lệ");
        }
        await saveRecord("admin/employees", empForm);
        const [upEmps, upAccs] = await Promise.all([listRecords("admin/employees"), listRecords("admin/accounts")]);
        setEmployees(upEmps);
        setAccounts(upAccs);
      } else if (currentTab === "accounts") {
        if (!accForm.username.trim() || !accForm.fullName.trim()) return toast("Tên đăng nhập và họ tên là bắt buộc");
        if (!accForm.SDT?.trim()) return toast("Số điện thoại là bắt buộc");
        if (accForm.CCCD && !/^[0-9]{12}$/.test(accForm.CCCD.trim())) {
          return toast("Số CCCD phải gồm đúng 12 chữ số hợp lệ");
        }
<<<<<<< HEAD
        if (editing && myUsername && editing.username?.toLowerCase() === myUsername.toLowerCase()) {
          if (accForm.status === "Đã khóa") {
            return toast("Bạn không thể tự khóa tài khoản của chính mình");
          }
          if (editing.role === "QuanLy" && accForm.role !== "QuanLy" && activeAdminCount <= 1) {
            return toast("Không thể hạ quyền Quản trị viên duy nhất của hệ thống");
          }
        }
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
        await saveRecord("admin/accounts", accForm);
        const [upAccs, upEmps] = await Promise.all([listRecords("admin/accounts"), listRecords("admin/employees")]);
        setAccounts(upAccs);
        setEmployees(upEmps);
      } else {
        if (!roleForm.TenVaiTro.trim()) return toast("Tên vai trò là bắt buộc");
        if (editing && editing.MaKey === "QuanLy") return toast("Vai trò Quản lý luôn có toàn quyền, không thể chỉnh sửa");
        const quyenHan = editing
          ? roleForm.QuyenHan
          : { ...basePermissions(roleForm.copyFrom), ...roleForm.QuyenHan };
        const payload = { TenVaiTro: roleForm.TenVaiTro, MoTa: roleForm.MoTa, QuyenHan: quyenHan };
        if (editing) payload.id = editing.id;
        const saved = await saveRecord("admin/roles", payload);
        const refreshed = await listRecords("admin/roles");
        setRoles(refreshed);
      }
      setModalOpen(false);
      toast(editing ? "Đã cập nhật dữ liệu" : "Đã thêm mới thành công");
    } catch (err) {
      toast(err.message || "Lỗi lưu dữ liệu");
    }
  }

  async function handleDelete(id, name) {
<<<<<<< HEAD
    if (currentTab === "accounts") {
      const target = accounts.find((a) => a.id === id || a.username === name);
      if (target && myUsername && target.username?.toLowerCase() === myUsername.toLowerCase()) {
        return toast("Bạn không thể tự xóa tài khoản của chính mình");
      }
      if (target && (target.role === "QuanLy" || target.VaiTro === "QuanLy") && activeAdminCount <= 1) {
        return toast("Không thể xóa Quản trị viên duy nhất của hệ thống");
      }
    }
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    const resource = currentTab === "employees" ? "admin/employees" : currentTab === "accounts" ? "admin/accounts" : "admin/roles";
    setConfirmDialog({ open: true, id, name, resource });
  }

  async function executeDelete() {
    const { id, resource } = confirmDialog;
    try {
      await deleteRecord(resource, id);
      if (currentTab === "employees") setEmployees(prev => prev.filter(e => e.id !== id));
      else if (currentTab === "accounts") setAccounts(prev => prev.filter(a => a.id !== id));
      else setRoles(prev => prev.filter(r => r.id !== id));
      toast("Đã xóa thành công");
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa");
    }
    setConfirmDialog({ open: false, id: null, name: "", resource: "" });
  }

  // Filtered visible items
  const filteredEmployees = employees.filter(
    (e) =>
      !query ||
      (e.HoTen || "").toLowerCase().includes(query.toLowerCase()) ||
      (e.SDT || "").includes(query) ||
      (e.CCCD || "").includes(query) ||
      (e.DiaChi || "").toLowerCase().includes(query.toLowerCase())
  );
  const filteredAccounts = accounts.filter((a) => !query || (a.username || "").toLowerCase().includes(query.toLowerCase()) || (a.fullName || "").toLowerCase().includes(query.toLowerCase()));
  const filteredRoles = roles.filter((r) => !query || (r.TenVaiTro || "").toLowerCase().includes(query.toLowerCase()) || (r.MoTa || "").toLowerCase().includes(query.toLowerCase()));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [currentTab, query]);

  const pagedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const pagedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);

  return (
    <section aria-labelledby="admin-heading" className="module-specialized admin-page">
      <header className="page-header">
        <hgroup>
          <h1 id="admin-heading">{title}</h1>
          <p>{description || "Quản trị hệ thống: Nhân sự, tài khoản phân quyền và bảo mật cửa hàng."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          {currentTab === "roles" ? "Thêm vai trò mới" : "Thêm nhân viên / người dùng"}
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng nhân viên"
          value={String(stats.totalEmp)}
          delta="Nhân sự hiện hữu"
          icon={UsersIcon}
        />
        <StatCard
          label="Tài khoản hoạt động"
          value={String(stats.activeAcc)}
          delta="Đang có quyền truy cập"
          valueClass="positive"
          icon={KeyIcon}
        />
        <StatCard
          label="Vai trò phân quyền"
          value={String(stats.totalRoles)}
          delta="Cấp độ phân quyền"
          icon={ShieldCheckIcon}
        />
      </div>

      {/* Sub navigation tabs */}
      <div className="admin-tabs-nav" style={{ marginTop: 14 }}>
        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${currentTab === "employees" ? "active" : ""}`}
            onClick={() => switchTab("employees")}
          >
            👥 Danh sách Nhân viên ({employees.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${currentTab === "accounts" ? "active" : ""}`}
            onClick={() => switchTab("accounts")}
          >
            🔑 QL Người dùng ({accounts.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${currentTab === "roles" ? "active" : ""}`}
            onClick={() => switchTab("roles")}
          >
            🛡️ Vai trò &amp; Quyền hạn ({roles.length})
          </button>
        </div>

        <div className="invoice-search" style={{ flex: 1, maxWidth: 360 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm kiếm trong danh mục..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TAB 1: EMPLOYEES */}
      {currentTab === "employees" && (
        filteredEmployees.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Không tìm thấy nhân viên"
            description="Không có nhân sự nào phù hợp với bộ lọc tìm kiếm hiện tại."
            actionLabel="Thêm nhân viên mới"
            onAction={openCreate}
          />
        ) : (
          <>
            <div className="table-shell" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Nhân viên</th>
                    <th>Mã NV</th>
                    <th>Số CCCD</th>
                    <th>Số điện thoại</th>
                    <th>Địa chỉ</th>
                    <th>Vị trí công việc</th>
                    <th style={{ width: 130, textAlign: "center" }}>Trạng thái</th>
                    <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEmployees.map((emp, idx) => (
                    <tr key={emp.id} className="admin-row">
                      <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                      <td>
                        <div className="cust-profile-cell">
                          <div className="cust-avatar" style={{ background: "linear-gradient(135deg, #3D7068 0%, #2A4F49 100%)", color: "#fff" }}>
                            {getInitials(emp.HoTen)}
                          </div>
                          <div>
                            <strong className="cust-name">{emp.HoTen}</strong>
                            <small className="cell-note">{emp.VaiTro || "Nhân sự"}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="prod-code-badge">{emp.MaNV || emp.id}</span></td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "var(--text-dark, #1e293b)" }}>
                          {emp.CCCD || "—"}
                        </span>
                      </td>
                      <td>
                        {emp.SDT ? (
                          <span className="cust-contact-item">
                            <PhoneIcon className="cust-mini-ic" />
                            <a href={`tel:${emp.SDT}`}>{emp.SDT}</a>
                          </span>
                        ) : (
                          <span className="cell-note">—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 12.5, color: "var(--text-soft)", maxWidth: 180, display: "inline-block" }}>
                          {emp.DiaChi || "—"}
                        </span>
                      </td>
                      <td><span className="admin-role-badge">{emp.VaiTro || "Nhân viên"}</span></td>
                      <td style={{ textAlign: "center" }}>
                        <Badge variant={emp.TrangThai === "Đang làm việc" ? "green" : "gray"}>
                          {emp.TrangThai || "Đang làm việc"}
                        </Badge>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="row-actions" style={{ justifyContent: "center" }}>
                          <button type="button" className="icon-sm-btn" title="Chỉnh sửa" onClick={() => openEdit(emp)}>
                            <PencilSquareIcon className="ic" />
                          </button>
                          <button type="button" className="icon-sm-btn del" title="Xóa" onClick={() => handleDelete(emp.id, emp.HoTen)}>
                            <TrashIcon className="ic" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalItems={filteredEmployees.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )
      )}

      {/* TAB 2: ACCOUNTS */}
      {currentTab === "accounts" && (
        filteredAccounts.length === 0 ? (
          <EmptyState
            icon={KeyIcon}
            title="Không tìm thấy tài khoản"
            description="Không có tài khoản người dùng nào khớp với từ khóa tìm kiếm."
            actionLabel="Cấp tài khoản mới"
            onAction={openCreate}
          />
        ) : (
          <>
            <div className="table-shell" style={{ marginTop: 14 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>STT</th>
                    <th>Người dùng / Nhân sự</th>
                    <th>Mã NV</th>
                    <th>Số CCCD</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò phân quyền</th>
                    <th style={{ width: 130, textAlign: "center" }}>Trạng thái</th>
                    <th style={{ width: 130, textAlign: "center" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAccounts.map((acc, idx) => {
                    const roleName = roleLabels[acc.role] || roles.find((r) => r.MaKey === acc.role)?.TenVaiTro || acc.role;
                    const isLocked = acc.status === "Đã khóa";
<<<<<<< HEAD
                    const isSelf = Boolean(myUsername && acc.username && acc.username.toLowerCase() === myUsername.toLowerCase());
                    const isOnlyAdmin = (acc.role === "QuanLy" || acc.VaiTro === "QuanLy") && activeAdminCount <= 1 && !isLocked;
                    const cannotLock = isSelf || isOnlyAdmin;
                    const cannotDelete = isSelf || isOnlyAdmin;

=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    return (
                      <tr key={acc.id} className="admin-row">
                        <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                        <td>
                          <div className="cust-profile-cell">
                            <div
                              className="cust-avatar"
                              style={{
                                background: isLocked
                                  ? "#ef4444"
                                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                color: "#fff",
                              }}
                            >
                              {getInitials(acc.fullName || acc.username)}
                            </div>
                            <div>
<<<<<<< HEAD
                              <strong className="cust-name">
                                {acc.fullName} {isSelf && <small style={{ color: "var(--primary-dark)", fontWeight: 700 }}>(Bạn)</small>}
                              </strong>
=======
                              <strong className="cust-name">{acc.fullName}</strong>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                              <small className="cell-note">
                                <span className="admin-acc-badge">@{acc.username}</span>
                              </small>
                            </div>
                          </div>
                        </td>
                        <td><span className="prod-code-badge">{acc.MaNV || "—"}</span></td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: "var(--text-dark, #1e293b)" }}>
                            {acc.CCCD || "—"}
                          </span>
                        </td>
                        <td>
                          {acc.SDT ? (
                            <span className="cust-contact-item">
                              <PhoneIcon className="cust-mini-ic" />
                              <a href={`tel:${acc.SDT}`}>{acc.SDT}</a>
                            </span>
                          ) : (
                            <span className="cell-note">—</span>
                          )}
                        </td>
                        <td>
                          <span className="admin-role-badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
                            {roleName}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <Badge variant={isLocked ? "red" : "green"}>
                            {isLocked ? "Đã khóa" : "Hoạt động"}
                          </Badge>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="row-actions" style={{ justifyContent: "center", gap: 6 }}>
                            <button
                              type="button"
                              className={`icon-sm-btn ${isLocked ? "positive" : "del"}`}
<<<<<<< HEAD
                              title={
                                isSelf
                                  ? "Bạn không thể tự khóa tài khoản của chính mình"
                                  : isOnlyAdmin
                                  ? "Không thể khóa Quản trị viên duy nhất của hệ thống"
                                  : isLocked
                                  ? "Mở khóa tài khoản (Cho phép đăng nhập)"
                                  : "Khóa tài khoản (Chặn đăng nhập ngay)"
                              }
                              disabled={cannotLock}
                              style={cannotLock ? { opacity: 0.35, cursor: "not-allowed" } : {}}
=======
                              title={isLocked ? "Mở khóa tài khoản (Cho phép đăng nhập)" : "Khóa tài khoản (Chặn đăng nhập ngay)"}
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                              onClick={() => handleToggleLock(acc)}
                            >
                              <LockClosedIcon className="ic" />
                            </button>
                            <button type="button" className="icon-sm-btn" title="Chỉnh sửa thông tin" onClick={() => openEdit(acc)}>
                              <PencilSquareIcon className="ic" />
                            </button>
<<<<<<< HEAD
                            <button
                              type="button"
                              className="icon-sm-btn del"
                              title={
                                isSelf
                                  ? "Bạn không thể tự xóa tài khoản của chính mình"
                                  : isOnlyAdmin
                                  ? "Không thể xóa Quản trị viên duy nhất của hệ thống"
                                  : "Xóa tài khoản"
                              }
                              disabled={cannotDelete}
                              style={cannotDelete ? { opacity: 0.35, cursor: "not-allowed" } : {}}
                              onClick={() => handleDelete(acc.id, acc.username)}
                            >
=======
                            <button type="button" className="icon-sm-btn del" title="Xóa tài khoản" onClick={() => handleDelete(acc.id, acc.username)}>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                              <TrashIcon className="ic" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalItems={filteredAccounts.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )
      )}

      {/* TAB 3: ROLES */}
      {currentTab === "roles" && (
        filteredRoles.length === 0 ? (
          <EmptyState
            icon={ShieldCheckIcon}
            title="Không tìm thấy vai trò"
            description="Không có vai trò nào khớp với từ khóa tìm kiếm."
            actionLabel="Thêm vai trò mới"
            onAction={openCreate}
          />
        ) : (
          <div className="admin-roles-grid" style={{ marginTop: 18 }}>
            {filteredRoles.map((role) => {
              const isManager = role.MaKey === "QuanLy";
              const isSystem = role.LaVaiTroHeThong;
              const granted = isManager ? PERMISSION_GROUPS.reduce((s, g) => s + g.modules.length, 0) : countGranted(role.QuyenHan);
              const totalModules = PERMISSION_GROUPS.reduce((s, g) => s + g.modules.length, 0);
              return (
                <article key={role.id} className="cat-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="cat-card-header">
                    <div className="cat-card-icon">{ROLE_ICON_BY_KEY[role.MaKey] || "🛡️"}</div>
                    <div className="cat-card-info">
                      <h3 className="cat-card-title">{role.TenVaiTro}</h3>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span
                          className="cat-card-badge"
                          style={
                            isSystem
                              ? { background: "#ede9fe", color: "#6d28d9" }
                              : { background: "#e0f2fe", color: "#0369a1" }
                          }
                        >
                          {isSystem ? "⚙ Vai trò hệ thống" : "✎ Vai trò tùy chỉnh"}
                        </span>
                        <span className="cat-card-badge" style={{ background: "var(--surface-sunken, #f1f5f9)", color: "var(--text-soft)" }}>
                          👤 {role.SoNguoiDung || 0} tài khoản
                        </span>
                      </div>
                    </div>
                    <div className="row-actions">
                      {!isManager && (
                        <button type="button" className="icon-sm-btn" title="Chỉnh sửa vai trò & quyền hạn" onClick={() => openEdit(role)}>
                          <PencilSquareIcon className="ic" />
                        </button>
                      )}
                      {!isSystem && (
                        <button type="button" className="icon-sm-btn del" title="Xóa vai trò" onClick={() => handleDelete(role.id, role.TenVaiTro)}>
                          <TrashIcon className="ic" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="cat-card-desc">{role.MoTa || "Chưa có mô tả quyền hạn."}</p>
                  {isManager ? (
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "8px 12px" }}>
                      👑 Toàn quyền hệ thống — mọi chức năng, mọi thao tác
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {PERMISSION_GROUPS.map(({ group, modules }) => {
                          const grantedInGroup = modules.filter((m) => (role.QuyenHan?.[m.key] || []).length > 0).length;
                          if (!grantedInGroup) return null;
                          return (
                            <span key={group} style={{ fontSize: 11.5, fontWeight: 600, background: "var(--surface-sunken, #f1f5f9)", color: "var(--text-soft)", padding: "3px 8px", borderRadius: 6 }}>
                              {group}: {grantedInGroup}/{modules.length}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface-sunken, #e2e8f0)", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.round((countActions(role.QuyenHan) / (totalModules * 4)) * 100)}%`,
                              height: "100%",
                              borderRadius: 3,
                              background: "linear-gradient(90deg, #3d7068, #10b981)",
                              transition: "width .3s",
                            }}
                          />
                        </div>
                        <small style={{ fontSize: 11.5, color: "var(--text-soft)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {granted}/{totalModules} chức năng
                        </small>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )
      )}

      {/* Modal dynamic based on tab */}
      <Modal
        open={modalOpen}
        title={
          currentTab === "employees"
            ? (editing ? "Cập nhật nhân viên" : "Thêm nhân viên mới")
            : currentTab === "accounts"
            ? (editing ? "Cập nhật tài khoản" : "Cấp tài khoản mới")
            : (editing ? "Cập nhật vai trò" : "Thêm vai trò mới")
        }
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        wide={currentTab === "roles"}
      >
        {currentTab === "employees" && (
          <div>
            <div className="field">
              <label htmlFor="emp-name">Họ và tên nhân viên <span className="required-star">*</span></label>
              <input
                id="emp-name"
                type="text"
                required
                value={empForm.HoTen}
                onChange={(e) => setEmpForm({ ...empForm, HoTen: e.target.value })}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="emp-cccd">Số CCCD (12 chữ số) <span className="required-star">*</span></label>
                <input
                  id="emp-cccd"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Ví dụ: 079198000123"
                  value={empForm.CCCD || ""}
                  onChange={(e) => setEmpForm({ ...empForm, CCCD: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <div className="field">
                <label htmlFor="emp-phone">Số điện thoại <span className="required-star">*</span></label>
                <input
                  id="emp-phone"
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912345678"
                  value={empForm.SDT}
                  onChange={(e) => setEmpForm({ ...empForm, SDT: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="emp-address">Địa chỉ thường trú / liên hệ</label>
              <input
                id="emp-address"
                type="text"
                placeholder="Ví dụ: 123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM"
                value={empForm.DiaChi || ""}
                onChange={(e) => setEmpForm({ ...empForm, DiaChi: e.target.value })}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="emp-role">Vị trí đảm nhiệm</label>
                <select
                  id="emp-role"
                  value={empForm.VaiTro}
                  onChange={(e) => setEmpForm({ ...empForm, VaiTro: e.target.value })}
                >
                  <option value="Quản lý">Quản lý</option>
                  <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
                  <option value="Nhân viên kho">Nhân viên kho</option>
                  <option value="Kế toán">Kế toán</option>
                  <option value="Nhân viên mua hàng">Nhân viên mua hàng</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="emp-status">Trạng thái</label>
                <select
                  id="emp-status"
                  value={empForm.TrangThai}
                  onChange={(e) => setEmpForm({ ...empForm, TrangThai: e.target.value })}
                >
                  <option value="Đang làm việc">🟢 Đang làm việc</option>
                  <option value="Đã khóa">🔴 Đã khóa (Chặn đăng nhập)</option>
                  <option value="Nghỉ việc">⚪ Nghỉ việc</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentTab === "accounts" && (
          <div>
            <div style={{ padding: "8px 12px", background: "var(--bg-muted, #f1f5f9)", borderRadius: 6, marginBottom: 14, fontSize: 13, color: "var(--text-soft)" }}>
              💡 <strong>Đồng bộ nhân sự &amp; tài khoản</strong>: Khi thêm mới, hệ thống tự động sinh <strong>Mã NV</strong> và đồng bộ cả hồ sơ nhân sự (CCCD, SĐT, Địa chỉ) lẫn tài khoản đăng nhập vào CSDL.
            </div>

<<<<<<< HEAD
            <h4 style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-dark, #2A4F49)", marginBottom: 10 }}>
=======
            <h4 style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-dark, #1e3a8a)", marginBottom: 10 }}>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
              1. Thông tin nhân sự
            </h4>
            <div className="field">
              <label htmlFor="acc-name">Họ và tên nhân viên <span className="required-star">*</span></label>
              <input
                id="acc-name"
                type="text"
                required
                placeholder="Ví dụ: Nguyễn Văn An"
                value={accForm.fullName}
                onChange={(e) => setAccForm({ ...accForm, fullName: e.target.value })}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="acc-cccd">Số CCCD (12 chữ số) <span className="required-star">*</span></label>
                <input
                  id="acc-cccd"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Ví dụ: 001095012345"
                  value={accForm.CCCD || ""}
                  onChange={(e) => setAccForm({ ...accForm, CCCD: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <div className="field">
                <label htmlFor="acc-phone">Số điện thoại <span className="required-star">*</span></label>
                <input
                  id="acc-phone"
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912345678"
                  value={accForm.SDT || ""}
                  onChange={(e) => setAccForm({ ...accForm, SDT: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="acc-address">Địa chỉ thường trú</label>
              <input
                id="acc-address"
                type="text"
                placeholder="Ví dụ: Số 123 Cầu Giấy, Hà Nội"
                value={accForm.DiaChi || ""}
                onChange={(e) => setAccForm({ ...accForm, DiaChi: e.target.value })}
              />
            </div>

<<<<<<< HEAD
            <h4 style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-dark, #2A4F49)", marginTop: 16, marginBottom: 10 }}>
=======
            <h4 style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-dark, #1e3a8a)", marginTop: 16, marginBottom: 10 }}>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
              2. Tài khoản &amp; Phân quyền đăng nhập
            </h4>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="acc-user">Tên đăng nhập <span className="required-star">*</span></label>
                <input
                  id="acc-user"
                  type="text"
                  required
                  disabled={!!editing}
                  placeholder="Ví dụ: vanan"
                  value={accForm.username}
                  onChange={(e) => setAccForm({ ...accForm, username: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="acc-pw">
                  {editing ? "Mật khẩu mới (bỏ trống nếu giữ nguyên)" : <>Mật khẩu khởi tạo <span className="required-star">*</span></>}
                </label>
                <input
                  id="acc-pw"
                  type="password"
                  placeholder={editing ? "****** (để trống nếu không đổi)" : "Tối thiểu 6 ký tự"}
                  value={accForm.password}
                  onChange={(e) => setAccForm({ ...accForm, password: e.target.value })}
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="acc-role">Vai trò phân quyền</label>
                <select
                  id="acc-role"
                  value={accForm.role}
                  onChange={(e) => setAccForm({ ...accForm, role: e.target.value })}
                >
                  {Object.entries(roleLabels).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                  {roles
                    .filter((r) => r.MaKey && !roleLabels[r.MaKey])
                    .map((r) => (
                      <option key={r.id} value={r.MaKey}>★ {r.TenVaiTro} (tùy chỉnh)</option>
                    ))}
                </select>
              </div>
              <div className="field">
<<<<<<< HEAD
                <label htmlFor="acc-status">
                  Trạng thái hoạt động
                  {editing && myUsername && editing.username?.toLowerCase() === myUsername.toLowerCase() && (
                    <small style={{ color: "var(--primary-dark)", marginLeft: 6 }}>(Không thể tự khóa chính mình)</small>
                  )}
                </label>
                <select
                  id="acc-status"
                  value={accForm.status}
                  disabled={Boolean(editing && myUsername && editing.username?.toLowerCase() === myUsername.toLowerCase())}
=======
                <label htmlFor="acc-status">Trạng thái hoạt động</label>
                <select
                  id="acc-status"
                  value={accForm.status}
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                  onChange={(e) => setAccForm({ ...accForm, status: e.target.value })}
                >
                  <option value="Hoạt động">🟢 Hoạt động (Cho phép đăng nhập)</option>
                  <option value="Đã khóa">🔴 Đã khóa (Chặn đăng nhập ngay)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentTab === "roles" && (
          <div>
            <div className="field">
              <label htmlFor="role-name">Tên vai trò <span className="required-star">*</span></label>
              <input
                id="role-name"
                type="text"
                required
                placeholder="Ví dụ: Thủ quỹ, Thủ kho phụ..."
                value={roleForm.TenVaiTro}
                onChange={(e) => setRoleForm({ ...roleForm, TenVaiTro: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="role-desc">Mô tả vai trò</label>
              <textarea
                id="role-desc"
                rows={2}
                placeholder="Mô tả ngắn nhiệm vụ của vai trò này"
                value={roleForm.MoTa}
                onChange={(e) => setRoleForm({ ...roleForm, MoTa: e.target.value })}
              />
            </div>

            {!editing && (
              <div className="field">
                <label htmlFor="role-copy">Sao chép quyền từ vai trò có sẵn</label>
                <select
                  id="role-copy"
                  value={roleForm.copyFrom}
                  onChange={(e) => {
                    const copyKey = e.target.value;
                    const newPerms = copyKey ? basePermissions(copyKey) : {};
                    setRoleForm({ ...roleForm, copyFrom: copyKey, QuyenHan: newPerms });
                  }}
                >
                  <option value="">— Bắt đầu từ quyền trống —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.MaKey}>
                      {r.TenVaiTro}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(() => {
              const allGlobalOn = PERMISSION_GROUPS.every((g) =>
                g.modules.every((m) => ACTIONS.every((a) => (roleForm.QuyenHan?.[m.key] || []).includes(a.key)))
              );
              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "14px 0 8px",
                    paddingTop: 12,
                    borderTop: "1px solid var(--border, #e2e8f0)",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
<<<<<<< HEAD
                    <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-dark, #2A4F49)" }}>
=======
                    <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-dark, #1e3a8a)" }}>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                      Ma trận quyền hạn chi tiết
                    </h4>
                    <button
                      type="button"
                      onClick={() => toggleAllGroups(!allGlobalOn)}
                      style={{
                        background: allGlobalOn ? "#fee2e2" : "#f0fdf4",
                        color: allGlobalOn ? "#b91c1c" : "#15803d",
                        border: `1px solid ${allGlobalOn ? "#fecaca" : "#bbf7d0"}`,
                        borderRadius: 6,
                        padding: "3px 10px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {allGlobalOn ? "✕ Bỏ chọn tất cả các nhóm" : "✓ Chọn tất cả các nhóm"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {ACTIONS.map((a) => (
                      <span key={a.key} style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, ...ACTION_STYLE[a.key] }}>
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border, #e2e8f0)", borderRadius: 10 }}>
                {PERMISSION_GROUPS.map(({ group, modules }) => {
                  const allOn = modules.every((m) => ACTIONS.every((a) => (roleForm.QuyenHan?.[m.key] || []).includes(a.key)));
                  return (
                    <div key={group} style={{ borderBottom: "1px solid var(--border, #e2e8f0)" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--surface-sunken, #f8fafc)",
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                        }}
                      >
                        <strong style={{ fontSize: 12.5, color: "var(--text-dark, #0f172a)" }}>{group}</strong>
                        <button
                          type="button"
                          onClick={() => toggleGroupAll(modules)}
                          style={{ background: "none", border: "none", color: "var(--primary-dark, #0f766e)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                        >
                          {allOn ? "Bỏ chọn nhóm" : "Chọn tất cả nhóm"}
                        </button>
                      </div>
                      {modules.map((m) => {
                        const acts = permActions(roleForm.QuyenHan, m.key);
                        const allModuleOn = ACTIONS.every((a) => acts.includes(a.key));
                        return (
                          <div
                            key={m.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              padding: "7px 12px 7px 16px",
                              borderTop: "1px dashed var(--border, #eef2f7)",
                            }}
                          >
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                cursor: "pointer",
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={allModuleOn}
                                onChange={() => toggleModuleAll(m.key)}
                                style={{ accentColor: "#3d7068", width: 15, height: 15 }}
                              />
                              <span style={{ fontWeight: 500, color: "var(--text-dark, #1e293b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {m.label}
                              </span>
                            </label>
                            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                              {ACTIONS.map((a) => {
                                const on = acts.includes(a.key);
                                return (
                                  <button
                                    key={a.key}
                                    type="button"
                                    title={`${a.label} — ${m.label}`}
                                    onClick={() => togglePerm(m.key, a.key)}
                                    style={{
                                      minWidth: 34,
                                      padding: "3px 8px",
                                      borderRadius: 6,
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      border: on ? "1px solid transparent" : "1px solid var(--border, #cbd5e1)",
                                      background: on ? ACTION_STYLE[a.key].background : "#fff",
                                      color: on ? ACTION_STYLE[a.key].color : "#94a3b8",
                                      transition: "all .15s",
                                    }}
                                  >
                                    {a.short}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
            </div>
            <small style={{ display: "block", marginTop: 6, fontSize: 12, color: "var(--text-faint)" }}>
              💡 X = Xem · T = Tạo mới · S = Sửa · D = Xóa. Bấm nút để bật/tắt từng thao tác; tích ô đầu dòng để bật/tắt cả chức năng. Quyền có hiệu lực ngay sau khi lưu.
            </small>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận xóa"
        itemName={confirmDialog.name}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null, name: "", resource: "" })}
      />
    </section>
  );
}