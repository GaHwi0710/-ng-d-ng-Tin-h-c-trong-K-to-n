import { useState, useEffect, useMemo } from "react";
import {
  TrashIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Badge } from "../../components/Badge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function DebtsPage({ title, description }) {
  const [debts, setDebts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    Promise.allSettled([
      listRecords("debts"),
      listRecords("suppliers"),
    ])
      .then(([debtsRes, suppRes]) => {
        if (debtsRes.status === "fulfilled") setDebts(debtsRes.value);
        if (suppRes.status === "fulfilled") setSuppliers(suppRes.value);
        if (debtsRes.status === "rejected") setLoadError("Không tải được danh sách công nợ. Vui lòng thử lại sau.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter supplier debts exclusively (Requirements D1 & E1)
  const supplierDebts = useMemo(() => {
    return debts.filter((d) => !d.MaKH && (!!d.MaNCC || d.type === "suppliers" || !d.type));
  }, [debts]);

  const stats = useMemo(() => {
    const totalAmount = supplierDebts.reduce((sum, d) => sum + (Number(d.SoTien) || 0), 0);
    const totalPaid = supplierDebts.reduce((sum, d) => sum + (Number(d.SoTienDaTra) || 0), 0);
    const totalRemaining = supplierDebts.reduce(
      (sum, d) => sum + (Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0))) || 0),
      0
    );
    const pendingCount = supplierDebts.filter(
      (d) => (d.TrangThai || "") !== "Đã thanh toán" && Number(d.SoTienConLai || 0) > 0
    ).length;
    return { totalAmount, totalPaid, totalRemaining, pendingCount };
  }, [supplierDebts]);

  const visible = useMemo(() => {
    return supplierDebts.filter((d) => {
      if (statusFilter !== "all" && d.TrangThai !== statusFilter) return false;

      const q = query.toLowerCase().trim();
      if (!q) return true;

      const supplier = suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
      const supplierName = supplier?.TenNCC || d.TenNCC || "";
      const debtCode = d.MaCN || d.id || "";
      const receiptCode = d.MaPhieuNhap || d.MaPN || "";

      return (
        supplierName.toLowerCase().includes(q) ||
        debtCode.toLowerCase().includes(q) ||
        receiptCode.toLowerCase().includes(q) ||
        (d.TrangThai || "").toLowerCase().includes(q)
      );
    });
  }, [supplierDebts, statusFilter, query, suppliers]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, query]);

  const pagedDebts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  function openPay(debt) {
    setSelectedDebt(debt);
    const rem = Number(debt.SoTienConLai ?? (debt.SoTien - (debt.SoTienDaTra || 0)));
    setPayAmount(rem);
    setPayModalOpen(true);
  }

  async function handleConfirmPay() {
    if (!selectedDebt) return;
    const payment = Number(payAmount) || 0;
    if (payment <= 0) return toast("Số tiền thanh toán phải lớn hơn 0");

    const totalDebt = Number(selectedDebt.SoTien) || 0;
    const curPaid = Number(selectedDebt.SoTienDaTra) || 0;
    const curRem = Number(selectedDebt.SoTienConLai ?? (totalDebt - curPaid));

    if (payment > curRem) {
      return toast("Số tiền thanh toán không được vượt quá số tiền còn nợ");
    }

    const newPaid = curPaid + payment;
    const newRem = Math.max(0, totalDebt - newPaid);
    const newStatus = newRem === 0 ? "Đã thanh toán" : "Còn nợ";

    try {
      const updated = await saveRecord("debts", {
        ...selectedDebt,
        SoTienDaTra: newPaid,
        SoTienConLai: newRem,
        TrangThai: newStatus,
      });
      setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setPayModalOpen(false);
      toast(`Đã ghi nhận thanh toán ${money.format(payment)} cho nhà cung cấp`);
    } catch (err) {
      toast(err.message || "Lỗi cập nhật công nợ");
    }
  }

  function handleDelete(id) {
    setConfirmDialog({ open: true, id });
  }

  async function executeDelete() {
    const { id } = confirmDialog;
    setConfirmDialog({ open: false, id: null });
    try {
      await deleteRecord("debts", id);
      setDebts((prev) => prev.filter((d) => d.id !== id));
      toast("Đã xóa bản ghi công nợ thành công");
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa");
    }
  }

  return (
    <section aria-labelledby="debts-page-heading" className="module-specialized debt-page">
      <header className="page-header">
        <hgroup>
          <h1 id="debts-page-heading">{title || "Công nợ NCC"}</h1>
          <p>{description || "Theo dõi và quản lý công nợ phát sinh từ các phiếu nhập kho nhà cung cấp."}</p>
        </hgroup>
      </header>

      {/* Guidance alert for automatic debt generation */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "10px 14px",
          background: "var(--surface-sunken, #f8fafc)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          color: "var(--text-soft)",
        }}
      >
        <InformationCircleIcon style={{ width: 20, height: 20, color: "var(--primary)", flexShrink: 0 }} />
        <span>
          <strong>Lưu ý:</strong> Công nợ NCC được hệ thống tự động ghi nhận từ Phiếu nhập kho (
          <em>Phiếu nhập kho → Tổng tiền → Đã thanh toán → Còn nợ</em>). Thanh toán trực tiếp tại đây để tất toán công nợ.
        </span>
      </div>

      {loading && (
        <p style={{ color: "var(--text-faint)", padding: "16px 0" }}>⏳ Đang tải dữ liệu công nợ NCC...</p>
      )}
      {loadError && (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng công nợ phát sinh NCC"
          value={money.format(stats.totalAmount)}
          delta={`${stats.pendingCount} khoản còn dư nợ`}
          icon={CreditCardIcon}
        />
        <StatCard
          label="Đã thanh toán cho NCC"
          value={money.format(stats.totalPaid)}
          delta="Tổng số tiền đã trả"
          valueClass="positive"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Còn phải trả NCC"
          value={money.format(stats.totalRemaining)}
          delta="Dư nợ nhà cung cấp hiện tại"
          valueClass="danger"
          icon={ExclamationCircleIcon}
        />
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar" style={{ marginTop: 12, flexWrap: "wrap", gap: 10 }}>
        <div className="invoice-search" style={{ flex: 1, minWidth: 280, maxWidth: 420 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên NCC, mã công nợ, mã phiếu nhập..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "#fff",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <option value="all">Tất cả tình trạng</option>
            <option value="Còn nợ">Còn nợ</option>
            <option value="Đã thanh toán">Đã thanh toán</option>
          </select>
        </div>
      </div>

      {/* Debt Table */}
      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 45 }}>STT</th>
              <th style={{ width: 110 }}>Mã công nợ</th>
              <th style={{ width: 120 }}>Phiếu nhập kho</th>
              <th>Nhà cung cấp</th>
              <th>Ngày ghi nợ</th>
              <th style={{ textAlign: "right" }}>Tổng tiền hàng</th>
              <th style={{ textAlign: "right" }}>Đã trả</th>
              <th style={{ textAlign: "right" }}>Còn nợ</th>
              <th style={{ width: 140 }}>Tiến độ trả</th>
              <th style={{ width: 110, textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: 130, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pagedDebts.map((d, idx) => {
              const total = Number(d.SoTien) || 0;
              const paid = Number(d.SoTienDaTra) || 0;
              const rem = Number(d.SoTienConLai ?? (total - paid));
              const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
              const isDone = rem <= 0;

              const supplier = suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
              const supplierName = supplier?.TenNCC || d.TenNCC || d.MaNCC || "Nhà cung cấp";

              return (
                <tr key={d.id} className="debt-row">
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                  <td>
                    <span className="prod-code-badge">{d.MaCN || d.id}</span>
                  </td>
                  <td>
                    {d.MaPhieuNhap || d.MaPN ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-dark)" }}>
                        {d.MaPhieuNhap || d.MaPN}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-faint)", fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <div>
                      <strong className="cust-name">{supplierName}</strong>
                      {supplier?.SDT && <small className="cell-note" style={{ display: "block" }}>{supplier.SDT}</small>}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-soft)", fontSize: 13 }}>{d.NgayPhatSinh || "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{money.format(total)}</td>
                  <td style={{ textAlign: "right", color: "var(--success)" }}>{money.format(paid)}</td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: isDone ? "var(--text-soft)" : "var(--danger)" }}>
                      {money.format(rem)}
                    </strong>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="debt-progress-wrap" style={{ flex: 1 }}>
                        <div className="debt-progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 36, color: "var(--text-soft)" }}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Badge variant={isDone ? "green" : "amber"}>
                      {isDone ? "Đã thanh toán" : "Còn nợ"}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="row-actions" style={{ justifyContent: "center" }}>
                      {!isDone && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          title="Ghi nhận trả nợ đợt này"
                          onClick={() => openPay(d)}
                        >
                          <BanknotesIcon className="btn-icon" />
                          Trả nợ
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-sm-btn del"
                        title="Xóa bản ghi"
                        onClick={() => handleDelete(d.id)}
                      >
                        <TrashIcon className="ic" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  ⏳ Đang tải danh sách công nợ...
                </td>
              </tr>
            ) : !visible.length ? (
              <tr>
                <td colSpan={11} style={{ padding: 0 }}>
                  <EmptyState
                    icon={CreditCardIcon}
                    title="Không có khoản công nợ NCC nào"
                    description={`Chưa có công nợ nhà cung cấp nào phù hợp với tìm kiếm.`}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {visible.length > 0 && (
        <Pagination
          currentPage={page}
          totalItems={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Modal Pay */}
      <Modal
        open={payModalOpen}
        title="Ghi nhận trả nợ cho Nhà cung cấp"
        onClose={() => setPayModalOpen(false)}
        onSubmit={handleConfirmPay}
        submitLabel="Xác nhận thanh toán"
      >
        {selectedDebt && (
          <div>
            <p style={{ margin: "0 0 14px", color: "var(--text-soft)", fontSize: 13.5 }}>
              Ghi nhận thanh toán cho khoản nợ <strong>{selectedDebt.MaCN || selectedDebt.id}</strong>
              {selectedDebt.MaPhieuNhap ? ` (Phiếu nhập: ${selectedDebt.MaPhieuNhap})` : ""}.
            </p>
            <div className="field">
              <label htmlFor="pay-amt">
                Số tiền thanh toán lần này (VNĐ) <span className="required-star">*</span>
              </label>
              <input
                id="pay-amt"
                type="number"
                min="1000"
                max={Number(selectedDebt.SoTienConLai ?? selectedDebt.SoTien)}
                step="1000"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "4px 0 0" }}>
              Số dư nợ NCC còn lại sau thanh toán:{" "}
              <strong style={{ color: "var(--primary)" }}>
                {money.format(
                  Math.max(
                    0,
                    Number(selectedDebt.SoTienConLai ?? selectedDebt.SoTien) - Number(payAmount || 0)
                  )
                )}
              </strong>
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận xóa công nợ"
        message="Bạn có chắc chắn muốn xóa bản ghi công nợ này? Hành động này không thể hoàn tác."
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null })}
      />
    </section>
  );
}