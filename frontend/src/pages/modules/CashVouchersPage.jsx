import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  WalletIcon,
  DocumentCurrencyDollarIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { amountToWords } from "../../lib/amountToWords.js";
import { buildCashVoucherModel, printCashVoucher } from "../../lib/cashVoucher.js";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

const monthOf = (value) => String(value || "").slice(0, 7);

/**
 * Trang Thu chi — Phiếu thu (mẫu 01-TT) / Phiếu chi (mẫu 02-TT).
 * type: "thu" | "chi"
 */
export function CashVouchersPage({ title, description, type = "thu" }) {
  const isThu = type === "thu";
  const resource = isThu ? "cash-receipts" : "cash-payments";
  const personLabel = isThu ? "người nộp tiền" : "người nhận tiền";
  const personField = isThu ? "NguoiNopTien" : "NguoiNhanTien";

  const [records, setRecords] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, code: "" });
  const [formData, setFormData] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function emptyForm() {
    return {
      NgayLap: today(),
      [personField]: "",
      DiaChi: "",
      LyDo: "",
      SoTien: "",
      KemTheo: "",
      ChungTuGoc: "",
    };
  }

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    // Fetch cả hai loại để tính số dư tổng; hiển thị lỗi thay vì nuốt silently
    Promise.allSettled([
      listRecords("cash-receipts"),
      listRecords("cash-payments"),
    ]).then(([thu, chi]) => {
      const thuData = thu.status === "fulfilled" ? thu.value : [];
      const chiData = chi.status === "fulfilled" ? chi.value : [];
      if (thu.status === "rejected" && chi.status === "rejected") {
        setLoadError("Không tải được dữ liệu phiếu thu chi. Vui lòng thử lại.");
      }
      setReceipts(thuData);
      setPayments(chiData);
      setRecords(isThu ? thuData : chiData);
    }).finally(() => setLoading(false));
  }, [isThu]);


  const stats = useMemo(() => {
    const sumOf = (list) => list.reduce((sum, item) => sum + (Number(item.SoTien) || 0), 0);
    const totalThu = sumOf(receipts);
    const totalChi = sumOf(payments);
    const month = today().slice(0, 7);
    const monthCount = records.filter((item) => monthOf(item.NgayLap) === month).length;
    return {
      totalThu,
      totalChi,
      balance: totalThu - totalChi,
      count: records.length,
      monthCount,
    };
  }, [receipts, payments, records]);

  const months = useMemo(() => {
    const set = new Set(records.map((item) => monthOf(item.NgayLap)).filter(Boolean));
    return ["all", ...[...set].sort().reverse()];
  }, [records]);

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return records
      .filter((item) => (monthFilter === "all" ? true : monthOf(item.NgayLap) === monthFilter))
      .filter((item) => {
        if (!q) return true;
        return [item.MaPT, item.MaPC, item.NguoiNopTien, item.NguoiNhanTien, item.LyDo, item.DiaChi, item.SoTien]
          .some((field) => String(field || "").toLowerCase().includes(q));
      })
      .sort((a, b) => String(b.NgayLap || "").localeCompare(String(a.NgayLap || "")) || String(b.id).localeCompare(String(a.id)));
  }, [records, query, monthFilter]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query, monthFilter]);

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  function openCreate() {
    setEditing(null);
    setFormData(emptyForm());
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    setFormData({
      id: record.id,
      MaPT: record.MaPT,
      MaPC: record.MaPC,
      NgayLap: String(record.NgayLap || today()).slice(0, 10),
      [personField]: (isThu ? record.NguoiNopTien : record.NguoiNhanTien) || "",
      DiaChi: record.DiaChi || "",
      LyDo: record.LyDo || "",
      SoTien: Number(record.SoTien) || "",
      KemTheo: record.KemTheo || "",
      ChungTuGoc: record.ChungTuGoc || "",
    });
    setModalOpen(true);
  }

  function validate() {
    if (!String(formData[personField] || "").trim()) return toast(`Vui lòng nhập họ tên ${personLabel}`);
    if (!String(formData.LyDo || "").trim()) return toast(`Vui lòng nhập lý do ${isThu ? "nộp" : "chi"} tiền`);
    const amount = Number(formData.SoTien);
    if (!Number.isFinite(amount) || amount <= 0) return toast("Số tiền phải là số lớn hơn 0");
    if (amount > 1e13) return toast("Số tiền quá lớn, vui lòng kiểm tra lại");
    if (!formData.NgayLap || Number.isNaN(Date.parse(formData.NgayLap))) return toast("Ngày lập phiếu không hợp lệ");
    return null;
  }

  async function handleSave() {
    if (validate()) return;
    const payload = {
      ...formData,
      SoTien: Number(formData.SoTien),
      [personField]: String(formData[personField]).trim(),
    };
    try {
      const saved = await saveRecord(resource, payload);
      setRecords((prev) => (editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]));
      if (isThu) setReceipts((prev) => (editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]));
      else setPayments((prev) => (editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]));
      setModalOpen(false);
      toast(editing ? `Đã cập nhật ${isThu ? "phiếu thu" : "phiếu chi"} ${saved.MaPT || saved.MaPC || ""}` : `Đã lập ${isThu ? "phiếu thu" : "phiếu chi"} ${saved.MaPT || saved.MaPC || ""}`);
    } catch (err) {
      toast(err.message || "Lỗi khi lưu phiếu");
    }
  }

  async function executeDelete() {
    const { id, code } = confirmDialog;
    setConfirmDialog({ open: false, id: null, code: "" });
    try {
      await deleteRecord(resource, id);
      setRecords((prev) => prev.filter((item) => item.id !== id));
      if (isThu) setReceipts((prev) => prev.filter((item) => item.id !== id));
      else setPayments((prev) => prev.filter((item) => item.id !== id));
      toast(`Đã xóa ${isThu ? "phiếu thu" : "phiếu chi"} ${code}`);
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa phiếu");
    }
  }

  function handlePrint(record) {
    try {
      printCashVoucher(buildCashVoucherModel({ kind: type, record }));
    } catch (err) {
      toast("Không mở được cửa sổ in. Kiểm tra pop-up blocker.");
    }
  }

  const codeOf = (record) => record.MaPT || record.MaPC || record.id;
  const personOf = (record) => (isThu ? record.NguoiNopTien : record.NguoiNhanTien) || "—";

  return (
    <section aria-labelledby="cash-voucher-heading" className="module-specialized">
      <header className="page-header">
        <hgroup>
          <h1 id="cash-voucher-heading">{title}</h1>
          <p>{description || `Ghi nhận ${isThu ? "các khoản thu" : "các khoản chi"} tiền mặt theo mẫu số ${isThu ? "01-TT" : "02-TT"}.`}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Lập {isThu ? "phiếu thu" : "phiếu chi"}
        </button>
      </header>

      {loading && (
        <p style={{ color: "var(--text-faint)", padding: "16px 0" }}>⏳ Đang tải dữ liệu...</p>
      )}
      {loadError && (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          label="Tổng thu tiền quỹ"
          value={money.format(stats.totalThu) + " ₫"}
          delta="Từ phiếu thu"
          icon={WalletIcon}
          valueClass="accent"
        />
        <StatCard
          label="Tổng chi tiền quỹ"
          value={money.format(stats.totalChi) + " ₫"}
          delta="Từ phiếu chi"
          icon={DocumentCurrencyDollarIcon}
        />
        <StatCard
          label="Số dư quỹ tiền mặt"
          value={money.format(stats.balance) + " ₫"}
          delta={stats.balance >= 0 ? "Thu lớn hơn chi" : "Chi vượt thu"}
          deltaDown={stats.balance < 0}
          valueClass={stats.balance < 0 ? "danger" : ""}
          icon={ScaleIcon}
        />
        <StatCard
          label={`Số ${isThu ? "phiếu thu" : "phiếu chi"}`}
          value={String(stats.count)}
          delta={`${stats.monthCount} phiếu trong tháng này`}
        />
      </div>

      <div className="cust-toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="invoice-search" style={{ flex: 1, minWidth: 260, maxWidth: 440 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder={`Tìm theo mã phiếu, ${personLabel}, lý do...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          {months.map((month) => (
            <button
              key={month}
              type="button"
              className={`filter-chip ${monthFilter === month ? "active" : ""}`}
              onClick={() => setMonthFilter(month)}
            >
              {month === "all" ? "Tất cả các tháng" : `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`}
            </button>
          ))}
        </div>
      </div>

      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 45 }}>STT</th>
              <th style={{ width: 100 }}>Số phiếu</th>
              <th style={{ width: 105 }}>Ngày lập</th>
              <th>{isThu ? "Người nộp tiền" : "Người nhận tiền"}</th>
              <th>Lý do {isThu ? "nộp" : "chi"}</th>
              <th style={{ textAlign: "right", width: 140 }}>Số tiền</th>
              <th style={{ width: 130, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.map((record, idx) => (
              <tr key={record.id}>
                <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                <td><span className="po-product-code" style={{ color: "var(--primary)" }}>{codeOf(record)}</span></td>
                <td>{String(record.NgayLap || "").slice(0, 10)}</td>
                <td>
                  <div>
                    <strong className="cust-name">{personOf(record)}</strong>
                    {record.DiaChi && <small style={{ display: "block", color: "var(--text-soft)" }}>{record.DiaChi}</small>}
                  </div>
                </td>
                <td>
                  <div>
                    <span>{record.LyDo || "—"}</span>
                    {(record.KemTheo || record.ChungTuGoc) && (
                      <small style={{ display: "block", color: "var(--text-faint)" }}>
                        {record.KemTheo ? `Kèm theo: ${record.KemTheo}` : ""}{record.ChungTuGoc ? ` · Ct gốc: ${record.ChungTuGoc}` : ""}
                      </small>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <strong style={{ color: isThu ? "var(--success, #15803d)" : "var(--danger, #b91c1c)" }}>
                    {money.format(Number(record.SoTien) || 0)} ₫
                  </strong>
                  <small style={{ display: "block", color: "var(--text-faint)", fontStyle: "italic" }}>{amountToWords(Number(record.SoTien) || 0)}</small>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div className="row-actions" style={{ justifyContent: "center" }}>
                    <button type="button" className="icon-sm-btn" title="In phiếu" onClick={() => handlePrint(record)}>
                      <PrinterIcon className="ic" />
                    </button>
                    <button type="button" className="icon-sm-btn" title="Chỉnh sửa" onClick={() => openEdit(record)}>
                      <PencilSquareIcon className="ic" />
                    </button>
                    <button
                      type="button"
                      className="icon-sm-btn del"
                      title="Xóa phiếu"
                      onClick={() => setConfirmDialog({ open: true, id: record.id, code: codeOf(record) })}
                    >
                      <TrashIcon className="ic" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <EmptyState
                    icon={isThu ? WalletIcon : DocumentCurrencyDollarIcon}
                    title={isThu ? "Chưa có phiếu thu phù hợp" : "Chưa có phiếu chi phù hợp"}
                    description={records.length ? "Không tìm thấy phiếu nào khớp với điều kiện lọc." : `Bấm "Lập ${isThu ? "phiếu thu" : "phiếu chi"}" để bắt đầu ghi nhận giao dịch.`}
                    actionText={`Lập ${isThu ? "phiếu thu" : "phiếu chi"} (0${isThu ? "1" : "2"}-TT)`}
                    onAction={openCreate}
                  />
                </td>
              </tr>
            )}
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

      <Modal
        open={modalOpen}
        title={editing ? `Sửa ${isThu ? "phiếu thu" : "phiếu chi"} ${editing.MaPT || editing.MaPC || ""}` : `Lập ${isThu ? "phiếu thu" : "phiếu chi"} (mẫu số ${isThu ? "01-TT" : "02-TT"})`}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        submitLabel={editing ? "Cập nhật phiếu" : "Lập phiếu"}
        wide
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="cv-code">Số phiếu</label>
            <input id="cv-code" type="text" value={editing ? (editing.MaPT || editing.MaPC || "") : "Tự sinh khi lưu"} disabled />
          </div>
          <div className="field">
            <label htmlFor="cv-date">Ngày lập phiếu <span className="required-star">*</span></label>
            <input
              id="cv-date"
              type="date"
              required
              value={formData.NgayLap}
              onChange={(e) => setFormData({ ...formData, NgayLap: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="cv-person">Họ, tên {personLabel} <span className="required-star">*</span></label>
          <input
            id="cv-person"
            type="text"
            required
            placeholder={isThu ? "Ví dụ: Nguyễn Văn A (khách hàng trả tiền)" : "Ví dụ: Công ty TNHH Pigeon Việt Nam"}
            value={formData[personField]}
            onChange={(e) => setFormData({ ...formData, [personField]: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="cv-address">Địa chỉ</label>
          <input
            id="cv-address"
            type="text"
            placeholder="Địa chỉ của người nộp/nhận tiền"
            value={formData.DiaChi}
            onChange={(e) => setFormData({ ...formData, DiaChi: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="cv-reason">Lý do {isThu ? "nộp" : "chi"} <span className="required-star">*</span></label>
          <input
            id="cv-reason"
            type="text"
            required
            placeholder={isThu ? "Ví dụ: Thu tiền bán hàng hóa đơn HD012" : "Ví dụ: Chi tiền trả nhà cung cấp, chi phí vận chuyển..."}
            value={formData.LyDo}
            onChange={(e) => setFormData({ ...formData, LyDo: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="cv-amount">Số tiền (VNĐ) <span className="required-star">*</span></label>
          <input
            id="cv-amount"
            type="number"
            required
            min="1"
            step="1000"
            placeholder="Ví dụ: 1500000"
            value={formData.SoTien}
            onChange={(e) => setFormData({ ...formData, SoTien: e.target.value })}
          />
          <small style={{ fontStyle: "italic", color: "var(--text-soft)" }}>
            Viết bằng chữ: {Number(formData.SoTien) > 0 ? amountToWords(Number(formData.SoTien)) : "—"}
          </small>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="cv-attach">Kèm theo</label>
            <input
              id="cv-attach"
              type="text"
              placeholder="Ví dụ: 02 hóa đơn, 01 biên lai..."
              value={formData.KemTheo}
              onChange={(e) => setFormData({ ...formData, KemTheo: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="cv-source">Chứng từ gốc</label>
            <input
              id="cv-source"
              type="text"
              placeholder="Ví dụ: HD012, PN003..."
              value={formData.ChungTuGoc}
              onChange={(e) => setFormData({ ...formData, ChungTuGoc: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        title={`Xóa ${isThu ? "phiếu thu" : "phiếu chi"}`}
        itemName={confirmDialog.code}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null, code: "" })}
      />
    </section>
  );
}
