import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "../../components/Badge.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { SkeletonRow } from "../../components/SkeletonLoader.jsx";
import { exportToExcel, exportToCsv } from "../../lib/exportUtils.js";
import { toast } from "../../components/Toast.jsx";

const ACTION_MAP = {
  LOGIN: { label: "Đăng nhập", variant: "emerald" },
  LOGOUT: { label: "Đăng xuất", variant: "gray" },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", variant: "indigo" },
  CREATE_INVOICE: { label: "Lập hóa đơn", variant: "blue" },
  CREATE_PURCHASE: { label: "Nhập hàng", variant: "purple" },
  STOCK_ADJUSTMENT: { label: "Điều chỉnh kho", variant: "amber" },
  PAYMENT: { label: "Thanh toán", variant: "teal" },
  BACKUP: { label: "Sao lưu", variant: "primary" },
  CREATE: { label: "Thêm mới", variant: "green" },
  UPDATE: { label: "Cập nhật", variant: "blue" },
  DELETE: { label: "Xóa dữ liệu", variant: "red" },
};

export function AuditLogPage({ title = "Nhật ký kiểm toán" }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("baby-shop-token");
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", pageSize);
      if (search.trim()) params.set("search", search.trim());
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Không thể tải nhật ký");
      }

      const json = await res.json();
      setLogs(json.data || []);
      setTotalItems(json.total || 0);
    } catch (err) {
      toast("Lỗi tải nhật ký kiểm toán: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, actionFilter, roleFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 on filter changes
  function handleSearchChange(e) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleActionChange(e) {
    setActionFilter(e.target.value);
    setPage(1);
  }

  function handleRoleChange(e) {
    setRoleFilter(e.target.value);
    setPage(1);
  }

  function handleExportExcel() {
    if (!logs.length) {
      toast("Không có dữ liệu để xuất");
      return;
    }
    const headers = ["Thời gian", "Tài khoản", "Vai trò", "Hành động", "Mô-đun", "Mô tả", "IP"];
    const rows = logs.map((l) => [
      new Date(l.timestamp).toLocaleString("vi-VN"),
      l.username || "—",
      l.role || "—",
      ACTION_MAP[l.action]?.label || l.action || "—",
      l.module || "—",
      l.description || "—",
      l.ip || "—",
    ]);
    exportToExcel(`NhatKyKiemToan_${new Date().toISOString().slice(0, 10)}`, "NHẬT KÝ KIỂM TOÁN HỆ THỐNG", headers, rows);
    toast("Đã xuất file Excel nhật ký thành công");
  }

  return (
    <div className="module-page-container">
      <header className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheckIcon style={{ width: 28, height: 28, color: "var(--primary)" }} />
            {title}
          </h1>
          <p className="page-description">
            Theo dõi, giám sát và lưu vết tất cả các thao tác nghiệp vụ, bảo mật trong hệ thống
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchLogs}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <ArrowPathIcon className={`btn-icon ${loading ? "spinning" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportExcel}
            title="Xuất file Excel"
          >
            <ArrowDownTrayIcon className="btn-icon" />
            Xuất Excel
          </button>
        </div>
      </header>

      {/* Toolbar bộ lọc */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div className="invoice-search" style={{ flex: "1 1 260px", maxWidth: 360 }}>
            <MagnifyingGlassIcon aria-hidden="true" />
            <input
              type="search"
              placeholder="Tìm người dùng, hành động, mô tả..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>

          <select
            value={actionFilter}
            onChange={handleActionChange}
            className="filter-select"
            style={{ minWidth: 165 }}
            aria-label="Lọc theo hành động"
          >
            <option value="all">Tất cả hành động</option>
            <option value="LOGIN">Đăng nhập</option>
            <option value="LOGOUT">Đăng xuất</option>
            <option value="CHANGE_PASSWORD">Đổi mật khẩu</option>
            <option value="CREATE_INVOICE">Lập hóa đơn bán lẻ</option>
            <option value="CREATE_PURCHASE">Lập phiếu nhập hàng</option>
            <option value="STOCK_ADJUSTMENT">Điều chỉnh tồn kho</option>
            <option value="PAYMENT">Thanh toán công nợ</option>
            <option value="BACKUP">Sao lưu hệ thống</option>
          </select>

          <select
            value={roleFilter}
            onChange={handleRoleChange}
            className="filter-select"
            style={{ minWidth: 155 }}
            aria-label="Lọc theo vai trò"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="QuanLy">Quản lý</option>
            <option value="QuanTriHeThong">Quản trị hệ thống</option>
            <option value="KeToan">Kế toán</option>
            <option value="NhanVienBanHang">Nhân viên bán hàng</option>
            <option value="NhanVienKho">Thủ kho / Kho</option>
            <option value="NhanVienMuaHang">Nhân viên mua hàng</option>
          </select>

          <div className="erp-date-range">
            <CalendarDaysIcon aria-hidden="true" />
            <span className="date-label">Từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              title="Từ ngày"
            />
            <span className="date-sep">–</span>
            <span className="date-label">Đến:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              title="Đến ngày"
            />
          </div>

          {(search || actionFilter !== "all" || roleFilter !== "all" || dateFrom || dateTo) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearch("");
                setActionFilter("all");
                setRoleFilter("all");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
              style={{ height: 38, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
              title="Xóa tất cả bộ lọc"
            >
              <XMarkIcon style={{ width: 16, height: 16 }} />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Bảng nhật ký */}
      <div className="table-shell card">
        <table className="data-table" style={{ width: "100%", textAlign: "left" }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Thời gian</th>
              <th style={{ width: 140 }}>Người dùng</th>
              <th style={{ width: 160 }}>Vai trò</th>
              <th style={{ width: 140 }}>Hành động</th>
              <th style={{ width: 110 }}>Mô-đun</th>
              <th>Mô tả chi tiết</th>
              <th style={{ width: 120 }}>Địa chỉ IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={7} />)
            ) : logs.length > 0 ? (
              logs.map((log) => {
                const actionMeta = ACTION_MAP[log.action] || { label: log.action, variant: "gray" };
                return (
                  <tr key={log._id || log.id}>
                    <td style={{ color: "var(--text-soft)", fontSize: 13 }}>
                      {new Date(log.timestamp).toLocaleString("vi-VN")}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                        <UserCircleIcon style={{ width: 18, height: 18, color: "var(--text-faint)" }} />
                        {log.username}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
                        {log.role || "—"}
                      </span>
                    </td>
                    <td>
                      <Badge variant={actionMeta.variant}>{actionMeta.label}</Badge>
                    </td>
                    <td>
                      <span className="badge badge-light" style={{ textTransform: "uppercase", fontSize: 11 }}>
                        {log.module}
                      </span>
                    </td>
                    <td style={{ color: "var(--text)" }}>
                      {log.description || "—"}
                    </td>
                    <td style={{ color: "var(--text-faint)", fontSize: 12 }}>
                      {log.ip || "127.0.0.1"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <EmptyState
                    title="Chưa có dữ liệu nhật ký"
                    description="Không tìm thấy nhật ký kiểm toán phù hợp với các tiêu chí tìm kiếm hoặc lọc hiện tại."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Phân trang */}
        <Pagination
          currentPage={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>
    </div>
  );
}
