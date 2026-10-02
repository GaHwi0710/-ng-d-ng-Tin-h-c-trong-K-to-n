import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  XMarkIcon,
  EnvelopeIcon,
  QrCodeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, postRequest } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatusBadge, Badge } from "../../components/Badge.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { amountToWords } from "../../lib/amountToWords.js";
import { getStoreConfig, getVietQrUrl, getBrandLogoUrl } from "../../lib/storeConfig.js";
import { DocumentPrintPreviewModal } from "../../components/DocumentPrintPreviewModal.jsx";
import {
  renderHoaDonBanLeK80Html,
  renderHoaDonBanLeA4Html,
  renderPhieuThuM01TTHtml,
} from "../../lib/accountingDocsPrint.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function InvoicePage({ title }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("invoices"); // "invoices" | "payments"
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payModal, setPayModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState("Tiền mặt");
  const [payAmount, setPayAmount] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [payFilterMethod, setPayFilterMethod] = useState("all");
  const [payFilterType, setPayFilterType] = useState("all"); // "all" | "thu" | "chi"

  // Multi-criteria filters
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Bonus 8: Email Invoice modal
  const [emailModalInvoice, setEmailModalInvoice] = useState(null);
  const [customerEmailInput, setCustomerEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Xem trước & In chứng từ (K80, A4, Phiếu thu Mẫu 01-TT)
  const [previewInvoice, setPreviewInvoice] = useState(null);

  const loadData = () => {
    listRecords("invoices").then(setInvoices).catch(() => []);
    listRecords("customers").then(setCustomers).catch(() => []);
    listRecords("payments").then(setPayments).catch(() => []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleInvoices = invoices.filter((invoice) => {
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || JSON.stringify(invoice).toLowerCase().includes(search);
    if (!matchesQuery) return false;
    if (statusFilter !== "Tất cả" && invoice.TrangThai !== statusFilter) return false;
    if (
      filterCustomer !== "all" &&
      String(invoice.MaKH) !== String(filterCustomer) &&
      String(invoice.MaKHCode) !== String(filterCustomer)
    ) {
      return false;
    }
    const d = String(invoice.NgayLap || invoice.createdAt || "");
    if (fromDate && d && d.slice(0, 10) < fromDate) return false;
    if (toDate && d && d.slice(0, 10) > toDate) return false;
    return true;
  });

  const visiblePayments = useMemo(() => {
    return payments.filter((p) => {
      const isChi =
        p.LoaiThanhToan?.includes("Chi") ||
        p.DoiTuong === "Nhà cung cấp" ||
        Boolean(p.MaPNCode) ||
        Boolean(p.TenNCC);

      if (payFilterType === "thu" && isChi) return false;
      if (payFilterType === "chi" && !isChi) return false;

      const q = query.trim().toLowerCase();
      const code = String(p.MaTT || p.id || "").toLowerCase();
      const invCode = String(p.MaHDCode || p.MaHD || "").toLowerCase();
      const receiptCode = String(p.MaPNCode || p.MaPN || "").toLowerCase();
      const debtCode = String(p.MaCNCode || "").toLowerCase();
      const custName = String(p.TenKH || "").toLowerCase();
      const nccName = String(p.TenNCC || "").toLowerCase();
      const partyName = String(p.TenDoiTuong || "").toLowerCase();
      const typeName = String(p.LoaiThanhToan || "").toLowerCase();
      const method = String(p.PhuongThuc || "").toLowerCase();

      const matchesQuery =
        !q ||
        code.includes(q) ||
        invCode.includes(q) ||
        receiptCode.includes(q) ||
        debtCode.includes(q) ||
        custName.includes(q) ||
        nccName.includes(q) ||
        partyName.includes(q) ||
        typeName.includes(q) ||
        method.includes(q);

      if (!matchesQuery) return false;

      if (payFilterMethod !== "all" && p.PhuongThuc !== payFilterMethod) return false;

      const d = String(p.NgayThanhToan || p.createdAt || "");
      if (fromDate && d && d.slice(0, 10) < fromDate) return false;
      if (toDate && d && d.slice(0, 10) > toDate) return false;
      return true;
    });
  }, [payments, query, payFilterType, payFilterMethod, fromDate, toDate]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, filterCustomer, fromDate, toDate, activeTab, payFilterMethod, payFilterType]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleInvoices.slice(start, start + pageSize);
  }, [visibleInvoices, page, pageSize]);

  const pagedPayments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visiblePayments.slice(start, start + pageSize);
  }, [visiblePayments, page, pageSize]);

  const invoicePayments = useMemo(() => {
    if (!selectedInvoice) return [];
    return payments.filter(
      (p) =>
        String(p.MaHD) === String(selectedInvoice.id) ||
        String(p.MaHD) === String(selectedInvoice._id) ||
        String(p.MaHDCode) === String(selectedInvoice.MaHD)
    );
  }, [payments, selectedInvoice]);

  const paymentStats = useMemo(() => {
    let totalCount = 0;
    let totalThu = 0;
    let totalChi = 0;
    let cashTotal = 0;
    let bankTotal = 0;

    for (const p of payments) {
      const isChi =
        p.LoaiThanhToan?.includes("Chi") ||
        p.DoiTuong === "Nhà cung cấp" ||
        Boolean(p.MaPNCode) ||
        Boolean(p.TenNCC);
      const amount = Number(p.SoTien) || 0;
      totalCount++;
      if (isChi) {
        totalChi += amount;
      } else {
        totalThu += amount;
      }
      if (p.PhuongThuc === "Tiền mặt") cashTotal += amount;
      if (p.PhuongThuc === "Chuyển khoản") bankTotal += amount;
    }
    const netBalance = totalThu - totalChi;
    return { totalCount, totalThu, totalChi, netBalance, cashTotal, bankTotal };
  }, [payments]);

  const totalValue = invoices.reduce((sum, invoice) => sum + Number(invoice.TongTien || 0), 0);
  const collectedValue = invoices.reduce((sum, invoice) => sum + Number(invoice.SoTienDaTra || 0), 0);
  const outstandingValue = invoices.reduce((sum, invoice) => sum + Number(invoice.SoTienConLai ?? invoice.TongTien ?? 0), 0);

  function customerFor(invoice) {
    return customers.find((customer) => customer.id === String(invoice.MaKH) || customer.MaKH === invoice.MaKH);
  }

  function printInvoice(invoice) {
    if (!invoice) return;
    setPreviewInvoice(invoice);
  }

  async function pay() {
    if (!payModal) return;
    const remaining = Math.max(0, Number(payModal.SoTienConLai ?? payModal.TongTien));
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast(`Số tiền phải lớn hơn 0 và không vượt ${money.format(remaining)}`);
      return;
    }
    try {
      await saveRecord("payments", {
        invoiceId: payModal.id,
        amount,
        method: payMethod,
        NgayThanhToan: new Date().toISOString().slice(0, 10),
      });
      setInvoices((current) =>
        current.map((inv) =>
          inv.id === payModal.id
            ? { ...inv, SoTienDaTra: Number(inv.SoTienDaTra || 0) + amount, SoTienConLai: remaining - amount, TrangThai: amount >= remaining ? "Đã thanh toán" : "Thanh toán một phần" }
            : inv
        )
      );
      listRecords("invoices").then(setInvoices).catch(() => {});
      setPayModal(null);
      toast("Đã ghi nhận thanh toán thành công");
    } catch (error) {
      toast(error.message || "Lỗi khi ghi nhận thanh toán");
    }
  }

  async function handleSendEmail(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!emailModalInvoice) return;
    const email = (customerEmailInput || "").trim();
    if (!email || !email.includes("@")) {
      toast("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }
    setSendingEmail(true);
    try {
      const invoiceId = emailModalInvoice.id || emailModalInvoice._id || emailModalInvoice.MaHD;
      const data = await postRequest("email/invoice", {
        invoiceId,
        email,
      });
      toast(data?.message || `Đã gửi hóa đơn điện tử đến ${email}`);
      setEmailModalInvoice(null);
    } catch (error) {
      toast(error.message || "Lỗi khi gửi email hóa đơn");
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <section aria-labelledby="invoice-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="invoice-heading">{title}</h1>
          <p>Theo dõi chứng từ bán hàng, số đã thu và phần còn phải thu.</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={() => navigate("/sales-orders")}>
          <PlusIcon className="btn-icon" aria-hidden="true" /> Lập hóa đơn mới
        </button>
      </header>

      {/* Tab Switcher: Hóa đơn vs Lịch sử thanh toán */}
      <div style={{ display: "flex", gap: 10, margin: "14px 0 16px", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 8,
            border: activeTab === "invoices" ? "2px solid var(--primary, #3d7068)" : "1px solid var(--border, #cbd5e1)",
            background: activeTab === "invoices" ? "var(--primary-light, #e6f4f1)" : "#fff",
            color: activeTab === "invoices" ? "var(--primary-dark, #1f433e)" : "var(--text, #334155)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "all .15s ease",
          }}
        >
          <CreditCardIcon style={{ width: 18, height: 18 }} />
          <span>Danh sách Hóa đơn bán hàng</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 11.5,
              background: activeTab === "invoices" ? "var(--primary, #3d7068)" : "#e2e8f0",
              color: activeTab === "invoices" ? "#fff" : "#475569",
            }}
          >
            {invoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 8,
            border: activeTab === "payments" ? "2px solid var(--primary, #3d7068)" : "1px solid var(--border, #cbd5e1)",
            background: activeTab === "payments" ? "var(--primary-light, #e6f4f1)" : "#fff",
            color: activeTab === "payments" ? "var(--primary-dark, #1f433e)" : "var(--text, #334155)",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            transition: "all .15s ease",
          }}
        >
          <BanknotesIcon style={{ width: 18, height: 18 }} />
          <span>Lịch sử thanh toán</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: 11.5,
              background: activeTab === "payments" ? "var(--primary, #3d7068)" : "#e2e8f0",
              color: activeTab === "payments" ? "#fff" : "#475569",
            }}
          >
            {payments.length}
          </span>
        </button>
      </div>

      {activeTab === "invoices" && (
        <>
          <div className="invoice-stats">
            <article><span>Tổng hóa đơn</span><strong>{invoices.length}</strong><small>Chứng từ đã phát sinh</small></article>
            <article><span>Giá trị bán ra</span><strong>{money.format(totalValue)}</strong><small>Tổng giá trị hóa đơn</small></article>
            <article><span>Đã thu</span><strong className="positive">{money.format(collectedValue)}</strong><small>Thanh toán đã ghi nhận</small></article>
            <article><span>Còn phải thu</span><strong className="warning">{money.format(outstandingValue)}</strong><small>Cần theo dõi công nợ</small></article>
          </div>

          <div className="invoice-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
            <label className="invoice-search" style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input type="search" placeholder="Tìm mã hóa đơn, đơn hàng, khách hàng..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="filter-select"
                aria-label="Lọc theo khách hàng"
              >
                <option value="all">Tất cả khách hàng</option>
                {customers.map((c) => (
                  <option value={c.id} key={c.id}>{c.HoTen}</option>
                ))}
              </select>

              <div className="erp-date-range">
                <CalendarDaysIcon aria-hidden="true" />
                <span className="date-label">Từ:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  title="Từ ngày"
                />
                <span className="date-sep">–</span>
                <span className="date-label">Đến:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  title="Đến ngày"
                />
              </div>

              {(filterCustomer !== "all" || fromDate || toDate) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setFilterCustomer("all"); setFromDate(""); setToDate(""); }}
                  style={{ height: 38, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Xóa bộ lọc"
                >
                  <XMarkIcon style={{ width: 16, height: 16 }} />
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="filter-chips" aria-label="Lọc trạng thái hóa đơn">
              {["Tất cả", "Chưa thanh toán", "Thanh toán một phần", "Đã thanh toán"].map((status) => (
                <button key={status} type="button" className={`filter-chip ${statusFilter === status ? "active" : ""}`} onClick={() => setStatusFilter(status)}>{status}</button>
              ))}
            </div>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th scope="col">Mã hóa đơn</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Ngày lập</th>
                  <th scope="col">Người lập phiếu</th>
                  <th scope="col" style={{ textAlign: "right" }} className="right">Giá trị</th>
                  <th scope="col" style={{ textAlign: "right" }} className="right">Còn phải thu</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {pagedInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><button className="invoice-code" type="button" onClick={() => setSelectedInvoice(invoice)}>{invoice.MaHD || invoice.id}</button><small>{invoice.MaDHCode || invoice.MaDH || "Không có đơn hàng"}</small></td>
                    <td>{customerFor(invoice)?.HoTen || invoice.MaKHCode || "Khách lẻ"}</td>
                    <td>{invoice.NgayLap}</td>
                    <td><span style={{ fontWeight: 500, color: "var(--text-soft)" }}>{invoice.NguoiLap || invoice.MaNVCode || "Quản trị viên"}</span></td>
                    <td className="right tabular-nums" style={{ textAlign: "right", fontWeight: 600 }}>{money.format(invoice.TongTien || 0)}</td>
                    <td className="right tabular-nums" style={{ textAlign: "right" }}><strong>{money.format(invoice.SoTienConLai ?? invoice.TongTien ?? 0)}</strong></td>
                    <td><StatusBadge status={invoice.TrangThai} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" type="button" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => setSelectedInvoice(invoice)}><EyeIcon className="ic" aria-hidden="true" /></button>
                        <button className="icon-btn" type="button" title="In hóa đơn / Phiếu thu" aria-label="In hóa đơn / Phiếu thu" onClick={() => printInvoice(invoice)}><PrinterIcon className="ic" aria-hidden="true" /></button>
                        <button
                          className="icon-btn"
                          type="button"
                          title="Gửi hóa đơn qua Email"
                          aria-label="Gửi hóa đơn qua Email"
                          onClick={() => {
                            const cust = customerFor(invoice);
                            setEmailModalInvoice(invoice);
                            setCustomerEmailInput(cust?.Email || "");
                          }}
                        >
                          <EnvelopeIcon className="ic" aria-hidden="true" />
                        </button>
                        {invoice.TrangThai !== "Đã thanh toán" && <button className="btn btn-accent btn-sm" type="button" onClick={() => { setPayModal(invoice); setPayAmount(Number(invoice.SoTienConLai ?? invoice.TongTien)); }}>Thu tiền</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!visibleInvoices.length && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <EmptyState
                        icon={CreditCardIcon}
                        title="Không tìm thấy hóa đơn"
                        description={invoices.length ? "Không có hóa đơn nào khớp với bộ lọc tìm kiếm." : "Chưa có hóa đơn bán hàng nào phát sinh."}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visibleInvoices.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={visibleInvoices.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}

      {activeTab === "payments" && (
        <>
          <div className="invoice-stats">
            <article>
              <span>Tổng giao dịch</span>
              <strong>{paymentStats.totalCount}</strong>
              <small>Lượt phát sinh ghi nhận</small>
            </article>
            <article>
              <span>Tổng thu (Khách hàng)</span>
              <strong className="positive">+{money.format(paymentStats.totalThu)}</strong>
              <small>Thu bán hàng &amp; thu nợ KH</small>
            </article>
            <article>
              <span>Tổng chi (Nhà cung cấp)</span>
              <strong style={{ color: "#d97706" }}>-{money.format(paymentStats.totalChi)}</strong>
              <small>Chi trả tiền hàng &amp; nợ NCC</small>
            </article>
            <article>
              <span>Dòng tiền ròng</span>
              <strong style={{ color: paymentStats.netBalance >= 0 ? "var(--success)" : "#ef4444" }}>
                {paymentStats.netBalance >= 0 ? "+" : ""}{money.format(paymentStats.netBalance)}
              </strong>
              <small>Chênh lệch Thu - Chi</small>
            </article>
          </div>

          <div className="invoice-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
            <label className="invoice-search" style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                placeholder="Tìm mã TT, hóa đơn, phiếu nhập, đối tượng..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={payFilterType}
                onChange={(e) => setPayFilterType(e.target.value)}
                className="filter-select"
                aria-label="Lọc theo loại giao dịch"
              >
                <option value="all">Tất cả giao dịch (Thu &amp; Chi)</option>
                <option value="thu">Thu từ khách hàng (+)</option>
                <option value="chi">Chi trả nhà cung cấp (-)</option>
              </select>

              <select
                value={payFilterMethod}
                onChange={(e) => setPayFilterMethod(e.target.value)}
                className="filter-select"
                aria-label="Lọc theo phương thức"
              >
                <option value="all">Tất cả phương thức</option>
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
              </select>

              <div className="erp-date-range">
                <CalendarDaysIcon aria-hidden="true" />
                <span className="date-label">Từ:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  title="Từ ngày"
                />
                <span className="date-sep">–</span>
                <span className="date-label">Đến:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  title="Đến ngày"
                />
              </div>

              {(payFilterType !== "all" || payFilterMethod !== "all" || fromDate || toDate) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => { setPayFilterType("all"); setPayFilterMethod("all"); setFromDate(""); setToDate(""); }}
                  style={{ height: 38, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Xóa bộ lọc"
                >
                  <XMarkIcon style={{ width: 16, height: 16 }} />
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 45 }}>STT</th>
                  <th scope="col">Mã thanh toán</th>
                  <th scope="col">Phân loại</th>
                  <th scope="col">Chứng từ liên quan</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col" style={{ textAlign: "right" }} className="right">Số tiền</th>
                  <th scope="col">Phương thức</th>
                  <th scope="col">Ngày thanh toán</th>
                  <th scope="col" style={{ textAlign: "center" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {pagedPayments.map((p, idx) => {
                  const isChi =
                    p.LoaiThanhToan?.includes("Chi") ||
                    p.DoiTuong === "Nhà cung cấp" ||
                    Boolean(p.MaPNCode) ||
                    Boolean(p.TenNCC);
                  const docCode = p.MaHDCode || p.MaPNCode || p.MaCNCode || p.MaHD || p.MaPN || "—";
                  const partyName = p.TenDoiTuong || p.TenNCC || p.TenKH || (isChi ? "Nhà cung cấp" : "Khách lẻ");

                  return (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                      <td><span className="prod-code-badge">{p.MaTT || p.id}</span></td>
                      <td>
                        {isChi ? (
                          <Badge variant="warning">{p.LoaiThanhToan || "Chi trả NCC"}</Badge>
                        ) : (
                          <Badge variant="green">{p.LoaiThanhToan || "Thu tiền KH"}</Badge>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: isChi ? "#b45309" : "var(--primary-dark)" }}>
                          {docCode}
                        </strong>
                        {p.MaCNCode && docCode !== p.MaCNCode && (
                          <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Công nợ: {p.MaCNCode}</div>
                        )}
                      </td>
                      <td><strong>{partyName}</strong></td>
                      <td className="right tabular-nums" style={{ textAlign: "right", fontWeight: 700, color: isChi ? "#d97706" : "var(--success)" }}>
                        {isChi ? "-" : "+"}{money.format(p.SoTien || 0)}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {p.PhuongThuc === "Tiền mặt" ? "💵" : "💳"} {p.PhuongThuc || "Tiền mặt"}
                        </span>
                      </td>
                      <td>{p.NgayThanhToan || (p.createdAt ? String(p.createdAt).slice(0, 10) : "—")}</td>
                      <td style={{ textAlign: "center" }}>
                        <Badge variant="green">{p.TrangThai || "Thành công"}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {!visiblePayments.length && (
                  <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <EmptyState
                        icon={BanknotesIcon}
                        title="Không có giao dịch thanh toán nào"
                        description={payments.length ? "Không có giao dịch nào khớp với bộ lọc tìm kiếm." : "Chưa có giao dịch thanh toán nào phát sinh."}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visiblePayments.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={visiblePayments.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}

      <Modal
        open={selectedInvoice !== null}
        title={`Chi tiết hóa đơn · ${selectedInvoice?.MaHD || selectedInvoice?.id || ""}`}
        onClose={() => setSelectedInvoice(null)}
        onSubmit={() => printInvoice(selectedInvoice)}
        submitLabel="In hóa đơn"
        wide
      >
        {selectedInvoice && (
          <div className="invoice-detail">
            <div className="invoice-detail-head">
              <div><span className="eyebrow">Mẹ &amp; Bé · Hóa đơn bán hàng</span><h2>{selectedInvoice.MaHD || selectedInvoice.id}</h2><p>{selectedInvoice.NgayLap} · Đơn hàng {selectedInvoice.MaDHCode || selectedInvoice.MaDH || "—"}</p></div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const cust = customerFor(selectedInvoice);
                    setEmailModalInvoice(selectedInvoice);
                    setCustomerEmailInput(cust?.Email || "");
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <EnvelopeIcon style={{ width: 16, height: 16 }} />
                  Gửi Email
                </button>
                <StatusBadge status={selectedInvoice.TrangThai} />
              </div>
            </div>
            <div className="invoice-parties">
              <div>
                <span>Khách hàng</span>
                <strong>{customerFor(selectedInvoice)?.HoTen || selectedInvoice.MaKHCode || "Khách lẻ"}</strong>
                <small>{customerFor(selectedInvoice)?.SDT || "Chưa có số điện thoại"}</small>
              </div>
              <div>
                <span>Thanh toán</span>
                <strong>{money.format(selectedInvoice.SoTienDaTra || 0)}</strong>
                <small>Còn lại {money.format(selectedInvoice.SoTienConLai ?? selectedInvoice.TongTien ?? 0)}</small>
              </div>
            </div>
            <div className="table-shell invoice-lines">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.details || []).map((line, index) => (
                    <tr key={`${line.MaSP || line.productId}-${index}`}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ProductImage src={line.HinhAnh} alt={line.TenSP || line.MaSPCode} category={line.LoaiHang} size={34} />
                          <strong>{line.TenSP || line.MaSPCode || line.MaSP || line.productId}</strong>
                        </div>
                      </td>
                      <td>{line.SoLuong || line.quantity}</td>
                      <td>{money.format(line.DonGia || line.price || 0)}</td>
                      <td><strong>{money.format(line.ThanhTien || (line.SoLuong || line.quantity) * (line.DonGia || line.price || 0))}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="invoice-total"><span>Tổng cộng</span><strong>{money.format(selectedInvoice.TongTien || 0)}</strong></div>

            {/* Lịch sử thanh toán của hóa đơn này */}
            <div style={{ marginTop: 18, borderTop: "1px dashed var(--border)", paddingTop: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-dark)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
                💳 Lịch sử thanh toán của hóa đơn:
                <span style={{ fontSize: 11, background: "var(--primary-light)", padding: "1px 6px", borderRadius: 10 }}>
                  {invoicePayments.length} giao dịch
                </span>
              </h4>
              {invoicePayments.length > 0 ? (
                <div className="table-shell" style={{ margin: 0 }}>
                  <table style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Mã TT</th>
                        <th>Ngày thanh toán</th>
                        <th>Phương thức</th>
                        <th style={{ textAlign: "right" }}>Số tiền</th>
                        <th style={{ textAlign: "center" }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePayments.map((p) => (
                        <tr key={p.id}>
                          <td><span className="prod-code-badge">{p.MaTT || p.id}</span></td>
                          <td>{p.NgayThanhToan || (p.createdAt ? String(p.createdAt).slice(0, 10) : "—")}</td>
                          <td>{p.PhuongThuc || "Tiền mặt"}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                            {money.format(p.SoTien || 0)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <Badge variant="green">{p.TrangThai || "Đã thanh toán"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", margin: "4px 0" }}>
                  Chưa có giao dịch thanh toán nào được ghi nhận cho hóa đơn này.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={payModal !== null}
        title={`Ghi nhận thanh toán — ${payModal?.MaHD || payModal?.id || ""}`}
        onClose={() => setPayModal(null)}
        onSubmit={pay}
        submitLabel="Xác nhận thanh toán"
      >
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label htmlFor="pay-amount" style={{ margin: 0, fontWeight: 600 }}>Số tiền thanh toán</label>
            {payModal && (
              <button
                type="button"
                className="btn btn-sm"
                style={{ fontSize: 11, padding: "2px 8px" }}
                onClick={() => setPayAmount(Math.max(0, Number(payModal.SoTienConLai ?? payModal.TongTien)))}
              >
                Thanh toán toàn bộ
              </button>
            )}
          </div>
          <input
            id="pay-amount"
            type="number"
            min="1"
            max={payModal ? Number(payModal.SoTienConLai ?? payModal.TongTien) : undefined}
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value)}
            required
            style={{ fontSize: 15, fontWeight: 600 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 12 }}>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>
              {money.format(Number(payAmount) || 0)}
            </span>
            <small style={{ color: "var(--text-soft)" }}>
              Còn nợ: <strong>{money.format(payModal ? Number(payModal.SoTienConLai ?? payModal.TongTien) : 0)}</strong>
            </small>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pay-method" style={{ fontWeight: 600 }}>Phương thức thanh toán</label>
          <select
            id="pay-method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
          >
            <option>Tiền mặt</option>
            <option>Chuyển khoản</option>
            <option>Ví điện tử</option>
          </select>
        </div>

        {payMethod === "Chuyển khoản" && payModal && (
          <div style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-alt, #f8fafc)",
            textAlign: "center"
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--primary-dark)", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <QrCodeIcon style={{ width: 18, height: 18, color: "var(--primary)" }} />
              Quét mã VietQR chuyển khoản nhanh
            </div>
            <img
              src={getVietQrUrl({
                amount: Number(payAmount) || 0,
                content: `TT ${payModal.MaHD || payModal.id}`,
              })}
              alt="VietQR Thanh toán"
              style={{
                width: 170,
                height: 170,
                objectFit: "contain",
                margin: "0 auto",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                padding: 6,
                display: "block",
              }}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-soft)", marginTop: 6 }}>
              Số tiền: <strong style={{ color: "var(--primary-dark)" }}>{money.format(Number(payAmount) || 0)}</strong> · Nội dung: <strong>TT {payModal.MaHD || payModal.id}</strong>
            </div>
          </div>
        )}
      </Modal>

      {/* Bonus 8: Modal Gửi Hóa đơn qua Email */}
      <Modal
        open={emailModalInvoice !== null}
        title={`Gửi hóa đơn điện tử qua Email · ${emailModalInvoice?.MaHD || emailModalInvoice?.id || ""}`}
        onClose={() => setEmailModalInvoice(null)}
        onSubmit={handleSendEmail}
        submitLabel={sendingEmail ? "Đang gửi..." : "Gửi Email ngay"}
        loading={sendingEmail}
      >
        <div className="field">
          <label htmlFor="customer-email" style={{ fontWeight: 600 }}>
            Địa chỉ Email người nhận <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            id="customer-email"
            type="email"
            placeholder="khachhang@example.com"
            value={customerEmailInput}
            onChange={(e) => setCustomerEmailInput(e.target.value)}
            required
            autoFocus
          />
          <p style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>
            Hệ thống sẽ gửi hóa đơn điện tử chi tiết bao gồm bảng sản phẩm, số tiền và thông tin cửa hàng đến email khách hàng.
          </p>
        </div>
        {emailModalInvoice && (
          <div style={{
            padding: 12,
            background: "var(--surface-alt, #f8fafc)",
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: 12.5,
            marginTop: 10
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text-soft)" }}>Mã hóa đơn:</span>
              <strong>{emailModalInvoice.MaHD || emailModalInvoice.id}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text-soft)" }}>Khách hàng:</span>
              <strong>{customerFor(emailModalInvoice)?.HoTen || emailModalInvoice.MaKHCode || "Khách lẻ"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-soft)" }}>Tổng thanh toán:</span>
              <strong style={{ color: "var(--primary-dark)" }}>{money.format(emailModalInvoice.TongTien || 0)}</strong>
            </div>
          </div>
        )}
      </Modal>
      {/* Modal Xem trước & In chứng từ: K80 (POS), A4 (Chi tiết), Phiếu thu Mẫu 01-TT */}
      <DocumentPrintPreviewModal
        open={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        title={`Xem trước chứng từ bán hàng (${previewInvoice?.MaHD || previewInvoice?.id || ""})`}
        subtitle="Hóa đơn bán lẻ K80 nhiệt POS, Hóa đơn A4 chi tiết và Phiếu thu Mẫu 01-TT (TT 200/2014/TT-BTC)"
        alternativeTemplates={
          previewInvoice
            ? [
                {
                  label: "Hóa đơn K80 (POS)",
                  icon: <PrinterIcon style={{ width: 14, height: 14 }} />,
                  isK80: true,
                  getHtml: () =>
                    renderHoaDonBanLeK80Html(previewInvoice, {
                      customer: customerFor(previewInvoice),
                    }),
                },
                {
                  label: "Hóa đơn A4 (Chi tiết)",
                  icon: <DocumentTextIcon style={{ width: 14, height: 14 }} />,
                  isK80: false,
                  getHtml: () =>
                    renderHoaDonBanLeA4Html(previewInvoice, {
                      customer: customerFor(previewInvoice),
                    }),
                },
                {
                  label: "Phiếu thu (Mẫu 01-TT)",
                  icon: <BanknotesIcon style={{ width: 14, height: 14 }} />,
                  isK80: false,
                  getHtml: () => {
                    const isDebt =
                      previewInvoice.HinhThucThanhToan === "Ghi nợ" ||
                      previewInvoice.TrangThai === "Chưa thanh toán";
                    const paidAmount = Number(
                      previewInvoice.SoTienDaTra ??
                        (previewInvoice.TrangThai === "Đã thanh toán"
                          ? previewInvoice.TongTien
                          : 0)
                    );
                    const amount = paidAmount > 0 ? paidAmount : Number(previewInvoice.TongTien || 0);
                    return renderPhieuThuM01TTHtml({
                      MaPT: `PT-${previewInvoice.MaHD || previewInvoice.id}`,
                      NgayThu: previewInvoice.NgayLap || new Date().toISOString(),
                      TenKH: customerFor(previewInvoice)?.HoTen || previewInvoice.MaKHCode || "Khách mua hàng",
                      DiaChi: customerFor(previewInvoice)?.DiaChi || "Tại quầy",
                      SoTien: amount,
                      TkNo: "1111",
                      TkCo: isDebt ? "131" : "5111",
                      LyDo: isDebt
                        ? `Thu hồi công nợ theo hóa đơn ${previewInvoice.MaHD || previewInvoice.id}`
                        : `Thu tiền bán hàng lẻ theo hóa đơn ${previewInvoice.MaHD || previewInvoice.id}`,
                      ChungTuGoc: `Hóa đơn bán lẻ ${previewInvoice.MaHD || previewInvoice.id}`,
                      NguoiLap: previewInvoice.NguoiLap || "Thu ngân",
                    });
                  },
                },
              ]
            : []
        }
      />
    </section>
  );
}

/* ================================================================
   STOCKTAKE & RETURN PAGES ARE IMPORTED FROM ./modules/
   ================================================================ */
