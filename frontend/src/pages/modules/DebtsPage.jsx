import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Badge } from "../../components/Badge.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function DebtsPage({ title, description }) {
  const [debts, setDebts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState("suppliers"); // "suppliers" | "customers"
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [payAmount, setPayAmount] = useState(0);

  const [formData, setFormData] = useState({
    type: "suppliers",
    partnerId: "",
    NgayPhatSinh: new Date().toISOString().slice(0, 10),
    SoTien: 0,
    SoTienDaTra: 0,
    SoTienConLai: 0,
    TrangThai: "Còn nợ",
  });

  useEffect(() => {
    listRecords("debts").then(setDebts);
    listRecords("suppliers").then(setSuppliers);
    listRecords("customers").then(setCustomers);
  }, []);

  const stats = useMemo(() => {
    const totalAmount = debts.reduce((sum, d) => sum + (Number(d.SoTien) || 0), 0);
    const totalPaid = debts.reduce((sum, d) => sum + (Number(d.SoTienDaTra) || 0), 0);
    const totalRemaining = debts.reduce((sum, d) => sum + (Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0))) || 0), 0);
    const pendingCount = debts.filter((d) => (d.TrangThai || "") !== "Đã thanh toán" && Number(d.SoTienConLai || 0) > 0).length;
    return { totalAmount, totalPaid, totalRemaining, pendingCount };
  }, [debts]);

  const visible = useMemo(() => {
    return debts.filter((d) => {
      const isSupp = !!d.MaNCC || d.type === "suppliers";
      const matchTab = activeTab === "suppliers" ? isSupp : !isSupp;
      if (!matchTab) return false;

      const q = query.toLowerCase();
      if (!q) return true;

      const partner = isSupp
        ? suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC)?.TenNCC || ""
        : customers.find((c) => c.id === d.MaKH || c.MaKH === d.MaKH)?.HoTen || "";

      return (
        partner.toLowerCase().includes(q) ||
        (d.MaCN || d.id || "").toLowerCase().includes(q) ||
        (d.TrangThai || "").toLowerCase().includes(q)
      );
    });
  }, [debts, activeTab, query, suppliers, customers]);

  function openCreate() {
    setFormData({
      type: activeTab,
      partnerId: activeTab === "suppliers" ? suppliers[0]?.id || "" : customers[0]?.id || "",
      NgayPhatSinh: new Date().toISOString().slice(0, 10),
      SoTien: 0,
      SoTienDaTra: 0,
      SoTienConLai: 0,
      TrangThai: "Còn nợ",
    });
    setModalOpen(true);
  }

  function openPay(debt) {
    setSelectedDebt(debt);
    const rem = Number(debt.SoTienConLai ?? (debt.SoTien - (debt.SoTienDaTra || 0)));
    setPayAmount(rem);
    setPayModalOpen(true);
  }

  async function handleSaveDebt() {
    if (!formData.partnerId) return toast("Vui lòng chọn đối tác công nợ");
    if (Number(formData.SoTien) <= 0) return toast("Số tiền công nợ phải lớn hơn 0");

    const soTien = Number(formData.SoTien);
    const daTra = Number(formData.SoTienDaTra) || 0;
    const conLai = Math.max(0, soTien - daTra);
    const trangThai = conLai === 0 ? "Đã thanh toán" : "Còn nợ";

    const payload = {
      type: formData.type,
      MaNCC: formData.type === "suppliers" ? formData.partnerId : null,
      MaKH: formData.type === "customers" ? formData.partnerId : null,
      NgayPhatSinh: formData.NgayPhatSinh,
      SoTien: soTien,
      SoTienDaTra: daTra,
      SoTienConLai: conLai,
      TrangThai: trangThai,
    };

    try {
      const saved = await saveRecord("debts", payload);
      setDebts((prev) => [...prev, saved]);
      setModalOpen(false);
      toast("Đã thêm hồ sơ công nợ");
    } catch (err) {
      toast(err.message || "Lỗi khi lưu");
    }
  }

  async function handleConfirmPay() {
    if (!selectedDebt) return;
    const payment = Number(payAmount) || 0;
    if (payment <= 0) return toast("Số tiền thanh toán phải lớn hơn 0");

    const curPaid = Number(selectedDebt.SoTienDaTra) || 0;
    const newPaid = curPaid + payment;
    const newRem = Math.max(0, Number(selectedDebt.SoTien) - newPaid);
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
      toast(`Đã ghi nhận thanh toán ${money.format(payment)}`);
    } catch (err) {
      toast(err.message || "Lỗi cập nhật");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi công nợ này?")) return;
    try {
      await deleteRecord("debts", id);
      setDebts((prev) => prev.filter((d) => d.id !== id));
      toast("Đã xóa công nợ");
    } catch (err) {
      toast(err.message || "Không thể xóa");
    }
  }

  return (
    <section aria-labelledby="debts-page-heading" className="module-specialized debt-page">
      <header className="page-header">
        <hgroup>
          <h1 id="debts-page-heading">{title}</h1>
          <p>{description || "Theo dõi công nợ phải thu từ khách hàng và công nợ phải trả cho nhà cung cấp."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Ghi nhận công nợ mới
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng công nợ phát sinh"
          value={money.format(stats.totalAmount)}
          delta={`${stats.pendingCount} khoản đang theo dõi`}
          icon={CreditCardIcon}
        />
        <StatCard
          label="Đã thanh toán"
          value={money.format(stats.totalPaid)}
          delta="Tổng số tiền đã tất toán"
          valueClass="positive"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Số dư còn phải thu / trả"
          value={money.format(stats.totalRemaining)}
          delta="Dư nợ hiện thời"
          valueClass="danger"
          icon={ExclamationCircleIcon}
        />
      </div>

      {/* Tabs & Search */}
      <div className="cust-toolbar" style={{ marginTop: 8 }}>
        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${activeTab === "suppliers" ? "active" : ""}`}
            onClick={() => setActiveTab("suppliers")}
          >
            🏭 Phải trả Nhà cung cấp ({debts.filter((d) => !!d.MaNCC || d.type === "suppliers").length})
          </button>
          <button
            type="button"
            className={`filter-chip ${activeTab === "customers" ? "active" : ""}`}
            onClick={() => setActiveTab("customers")}
          >
            👥 Phải thu Khách hàng ({debts.filter((d) => !d.MaNCC && d.type !== "suppliers").length})
          </button>
        </div>

        <div className="invoice-search" style={{ flex: 1, maxWidth: 360 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên đối tác, mã công nợ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Debt Table */}
      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 45 }}>STT</th>
              <th style={{ width: 110 }}>Mã ghi nợ</th>
              <th>Đối tác giao dịch</th>
              <th>Ngày ghi nợ</th>
              <th style={{ textAlign: "right" }}>Tổng nợ</th>
              <th style={{ textAlign: "right" }}>Đã trả</th>
              <th style={{ textAlign: "right" }}>Còn lại</th>
              <th style={{ width: 150 }}>Tiến độ trả</th>
              <th style={{ width: 110, textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: 140, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((d, idx) => {
              const total = Number(d.SoTien) || 0;
              const paid = Number(d.SoTienDaTra) || 0;
              const rem = Number(d.SoTienConLai ?? (total - paid));
              const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
              const isDone = rem <= 0;

              const isSupp = !!d.MaNCC || d.type === "suppliers";
              const partner = isSupp
                ? suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC)?.TenNCC || d.MaNCC || "NCC"
                : customers.find((c) => c.id === d.MaKH || c.MaKH === d.MaKH)?.HoTen || d.MaKH || "Khách lẻ";

              return (
                <tr key={d.id} className="debt-row">
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                  <td><span className="prod-code-badge">{d.MaCN || d.id}</span></td>
                  <td>
                    <div>
                      <strong className="cust-name">{partner}</strong>
                      <small className="cell-note">{isSupp ? "Nhà cung cấp" : "Khách hàng"}</small>
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
                      <div className="debt-progress-wrap">
                        <div className="debt-progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 36, color: "var(--text-soft)" }}>
                        {pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <Badge variant={isDone ? "green" : "amber"}>
                      {isDone ? "Đã xong" : "Còn nợ"}
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
                        title="Xóa"
                        onClick={() => handleDelete(d.id)}
                      >
                        <TrashIcon className="ic" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  Không có khoản công nợ nào trong danh mục này
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add Debt */}
      <Modal
        open={modalOpen}
        title="Ghi nhận công nợ mới"
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveDebt}
      >
        <div className="field">
          <label>Phân loại công nợ</label>
          <div className="filter-chips">
            <button
              type="button"
              className={`filter-chip ${formData.type === "suppliers" ? "active" : ""}`}
              onClick={() => setFormData({ ...formData, type: "suppliers", partnerId: suppliers[0]?.id || "" })}
            >
              Phải trả Nhà cung cấp
            </button>
            <button
              type="button"
              className={`filter-chip ${formData.type === "customers" ? "active" : ""}`}
              onClick={() => setFormData({ ...formData, type: "customers", partnerId: customers[0]?.id || "" })}
            >
              Phải thu Khách hàng
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="debt-partner">
            {formData.type === "suppliers" ? "Nhà cung cấp *" : "Khách hàng *"}
          </label>
          <select
            id="debt-partner"
            value={formData.partnerId}
            onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
            required
          >
            {formData.type === "suppliers"
              ? suppliers.map((s) => <option key={s.id} value={s.id}>{s.MaNCC} · {s.TenNCC}</option>)
              : customers.map((c) => <option key={c.id} value={c.id}>{c.MaKH} · {c.HoTen} ({c.SDT})</option>)}
          </select>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="debt-total">Số tiền công nợ (VNĐ) *</label>
            <input
              id="debt-total"
              type="number"
              min="1000"
              step="1000"
              required
              value={formData.SoTien}
              onChange={(e) => setFormData({ ...formData, SoTien: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="debt-paid">Đã thanh toán trước</label>
            <input
              id="debt-paid"
              type="number"
              min="0"
              step="1000"
              value={formData.SoTienDaTra}
              onChange={(e) => setFormData({ ...formData, SoTienDaTra: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="debt-date">Ngày phát sinh nợ</label>
          <input
            id="debt-date"
            type="date"
            value={formData.NgayPhatSinh}
            onChange={(e) => setFormData({ ...formData, NgayPhatSinh: e.target.value })}
          />
        </div>
      </Modal>

      {/* Modal Pay */}
      <Modal
        open={payModalOpen}
        title="Ghi nhận trả nợ đợt này"
        onClose={() => setPayModalOpen(false)}
        onSubmit={handleConfirmPay}
        submitLabel="Xác nhận thanh toán"
      >
        {selectedDebt && (
          <div>
            <p style={{ margin: "0 0 14px", color: "var(--text-soft)", fontSize: 13.5 }}>
              Ghi nhận thanh toán cho khoản nợ <strong>{selectedDebt.MaCN || selectedDebt.id}</strong>.
            </p>
            <div className="field">
              <label htmlFor="pay-amt">Số tiền thanh toán lần này (VNĐ) *</label>
              <input
                id="pay-amt"
                type="number"
                min="1000"
                step="1000"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-faint)", margin: "4px 0 0" }}>
              Số dư nợ còn lại sau thanh toán:{" "}
              <strong style={{ color: "var(--primary)" }}>
                {money.format(Math.max(0, Number(selectedDebt.SoTienConLai || selectedDebt.SoTien) - Number(payAmount || 0)))}
              </strong>
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}