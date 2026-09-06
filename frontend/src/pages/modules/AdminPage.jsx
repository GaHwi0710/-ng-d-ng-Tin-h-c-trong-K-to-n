import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Badge } from "../../components/Badge.jsx";

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

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form states
  const [empForm, setEmpForm] = useState({ HoTen: "", SDT: "", VaiTro: "Nhân viên bán hàng", TrangThai: "Đang làm việc" });
  const [accForm, setAccForm] = useState({ username: "", fullName: "", password: "", role: "NhanVienBanHang", status: "Hoạt động" });
  const [roleForm, setRoleForm] = useState({ TenVaiTro: "", MoTa: "" });

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
      setEmpForm({ HoTen: "", SDT: "", VaiTro: "Nhân viên bán hàng", TrangThai: "Đang làm việc" });
    } else if (currentTab === "accounts") {
      setAccForm({ username: "", fullName: "", password: "password123", role: "NhanVienBanHang", status: "Hoạt động" });
    } else {
      setRoleForm({ TenVaiTro: "", MoTa: "" });
    }
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    if (currentTab === "employees") {
      setEmpForm({ id: item.id, HoTen: item.HoTen || "", SDT: item.SDT || "", VaiTro: item.VaiTro || "", TrangThai: item.TrangThai || "Đang làm việc" });
    } else if (currentTab === "accounts") {
      setAccForm({ id: item.id, username: item.username || "", fullName: item.fullName || "", password: "", role: item.role || "NhanVienBanHang", status: item.status || "Hoạt động" });
    } else {
      setRoleForm({ id: item.id, TenVaiTro: item.TenVaiTro || "", MoTa: item.MoTa || "" });
    }
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      if (currentTab === "employees") {
        if (!empForm.HoTen.trim()) return toast("Họ và tên là bắt buộc");
        const saved = await saveRecord("admin/employees", empForm);
        setEmployees((prev) => (editing ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved]));
      } else if (currentTab === "accounts") {
        if (!accForm.username.trim() || !accForm.fullName.trim()) return toast("Tên đăng nhập và họ tên là bắt buộc");
        const saved = await saveRecord("admin/accounts", accForm);
        setAccounts((prev) => (editing ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved]));
      } else {
        if (!roleForm.TenVaiTro.trim()) return toast("Tên vai trò là bắt buộc");
        const saved = await saveRecord("admin/roles", roleForm);
        setRoles((prev) => (editing ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]));
      }
      setModalOpen(false);
      toast(editing ? "Đã cập nhật dữ liệu" : "Đã thêm mới thành công");
    } catch (err) {
      toast(err.message || "Lỗi lưu dữ liệu");
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Bạn có chắc muốn xóa "${name}"?`)) return;
    try {
      const resource = currentTab === "employees" ? "admin/employees" : currentTab === "accounts" ? "admin/accounts" : "admin/roles";
      await deleteRecord(resource, id);
      if (currentTab === "employees") setEmployees((prev) => prev.filter((e) => e.id !== id));
      else if (currentTab === "accounts") setAccounts((prev) => prev.filter((a) => a.id !== id));
      else setRoles((prev) => prev.filter((r) => r.id !== id));
      toast("Đã xóa thành công");
    } catch (err) {
      toast(err.message || "Không thể xóa");
    }
  }

  // Filtered visible items
  const filteredEmployees = employees.filter((e) => !query || (e.HoTen || "").toLowerCase().includes(query.toLowerCase()) || (e.SDT || "").includes(query));
  const filteredAccounts = accounts.filter((a) => !query || (a.username || "").toLowerCase().includes(query.toLowerCase()) || (a.fullName || "").toLowerCase().includes(query.toLowerCase()));
  const filteredRoles = roles.filter((r) => !query || (r.TenVaiTro || "").toLowerCase().includes(query.toLowerCase()) || (r.MoTa || "").toLowerCase().includes(query.toLowerCase()));

  return (
    <section aria-labelledby="admin-heading" className="module-specialized admin-page">
      <header className="page-header">
        <hgroup>
          <h1 id="admin-heading">{title}</h1>
          <p>{description || "Quản trị hệ thống: Nhân sự, tài khoản phân quyền và bảo mật cửa hàng."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          {currentTab === "employees" ? "Thêm nhân viên" : currentTab === "accounts" ? "Thêm tài khoản" : "Thêm vai trò"}
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
            🔑 Tài khoản đăng nhập ({accounts.length})
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
        <div className="table-shell" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>STT</th>
                <th>Nhân viên</th>
                <th>Mã NV</th>
                <th>Số điện thoại</th>
                <th>Vị trí công việc</th>
                <th style={{ width: 130, textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp, idx) => (
                <tr key={emp.id} className="admin-row">
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
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
                    {emp.SDT ? (
                      <span className="cust-contact-item">
                        <PhoneIcon className="cust-mini-ic" />
                        <a href={`tel:${emp.SDT}`}>{emp.SDT}</a>
                      </span>
                    ) : (
                      <span className="cell-note">—</span>
                    )}
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
              {!filteredEmployees.length && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>Không tìm thấy nhân viên nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ACCOUNTS */}
      {currentTab === "accounts" && (
        <div className="table-shell" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>STT</th>
                <th>Tên đăng nhập</th>
                <th>Chủ tài khoản</th>
                <th>Vai trò phân quyền</th>
                <th style={{ width: 130, textAlign: "center" }}>Trạng thái</th>
                <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc, idx) => {
                const roleName = roleLabels[acc.role] || acc.role;
                return (
                  <tr key={acc.id} className="admin-row">
                    <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="admin-acc-badge">@{acc.username}</span>
                      </div>
                    </td>
                    <td><strong className="cust-name">{acc.fullName}</strong></td>
                    <td>
                      <span className="admin-role-badge" style={{ background: "var(--primary-light)", color: "var(--primary-dark)" }}>
                        {roleName}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Badge variant={acc.status === "Hoạt động" ? "green" : "red"}>
                        {acc.status || "Hoạt động"}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className="row-actions" style={{ justifyContent: "center" }}>
                        <button type="button" className="icon-sm-btn" title="Chỉnh sửa" onClick={() => openEdit(acc)}>
                          <PencilSquareIcon className="ic" />
                        </button>
                        <button type="button" className="icon-sm-btn del" title="Xóa" onClick={() => handleDelete(acc.id, acc.username)}>
                          <TrashIcon className="ic" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredAccounts.length && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>Không tìm thấy tài khoản nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ROLES */}
      {currentTab === "roles" && (
        <div className="admin-roles-grid" style={{ marginTop: 18 }}>
          {filteredRoles.map((role) => (
            <article key={role.id} className="cat-card">
              <div className="cat-card-header">
                <div className="cat-card-icon">🛡️</div>
                <div className="cat-card-info">
                  <h3 className="cat-card-title">{role.TenVaiTro}</h3>
                  <span className="cat-card-badge">Cấp quyền hệ thống</span>
                </div>
                <div className="row-actions">
                  <button type="button" className="icon-sm-btn" title="Chỉnh sửa" onClick={() => openEdit(role)}>
                    <PencilSquareIcon className="ic" />
                  </button>
                  <button type="button" className="icon-sm-btn del" title="Xóa" onClick={() => handleDelete(role.id, role.TenVaiTro)}>
                    <TrashIcon className="ic" />
                  </button>
                </div>
              </div>
              <p className="cat-card-desc">{role.MoTa || "Toàn quyền truy cập và thao tác dữ liệu được cấu hình."}</p>
            </article>
          ))}
          {!filteredRoles.length && (
            <div className="cat-empty-wrap" style={{ gridColumn: "1 / -1" }}>
              <p>Không có vai trò nào phù hợp</p>
            </div>
          )}
        </div>
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
      >
        {currentTab === "employees" && (
          <div>
            <div className="field">
              <label htmlFor="emp-name">Họ và tên nhân viên *</label>
              <input
                id="emp-name"
                type="text"
                required
                value={empForm.HoTen}
                onChange={(e) => setEmpForm({ ...empForm, HoTen: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="emp-phone">Số điện thoại</label>
              <input
                id="emp-phone"
                type="tel"
                value={empForm.SDT}
                onChange={(e) => setEmpForm({ ...empForm, SDT: e.target.value })}
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
                  <option value="Đang làm việc">Đang làm việc</option>
                  <option value="Nghỉ việc">Nghỉ việc</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentTab === "accounts" && (
          <div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="acc-user">Tên đăng nhập *</label>
                <input
                  id="acc-user"
                  type="text"
                  required
                  disabled={!!editing}
                  value={accForm.username}
                  onChange={(e) => setAccForm({ ...accForm, username: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="acc-name">Họ tên người dùng *</label>
                <input
                  id="acc-name"
                  type="text"
                  required
                  value={accForm.fullName}
                  onChange={(e) => setAccForm({ ...accForm, fullName: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="acc-pw">
                {editing ? "Mật khẩu mới (bỏ trống nếu không đổi)" : "Mật khẩu khởi tạo *"}
              </label>
              <input
                id="acc-pw"
                type="password"
                placeholder="******"
                value={accForm.password}
                onChange={(e) => setAccForm({ ...accForm, password: e.target.value })}
              />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="acc-role">Vai trò</label>
                <select
                  id="acc-role"
                  value={accForm.role}
                  onChange={(e) => setAccForm({ ...accForm, role: e.target.value })}
                >
                  {Object.entries(roleLabels).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="acc-status">Trạng thái</label>
                <select
                  id="acc-status"
                  value={accForm.status}
                  onChange={(e) => setAccForm({ ...accForm, status: e.target.value })}
                >
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Đã khóa">Đã khóa</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentTab === "roles" && (
          <div>
            <div className="field">
              <label htmlFor="role-name">Tên vai trò *</label>
              <input
                id="role-name"
                type="text"
                required
                value={roleForm.TenVaiTro}
                onChange={(e) => setRoleForm({ ...roleForm, TenVaiTro: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="role-desc">Mô tả quyền hạn</label>
              <textarea
                id="role-desc"
                rows={3}
                value={roleForm.MoTa}
                onChange={(e) => setRoleForm({ ...roleForm, MoTa: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}