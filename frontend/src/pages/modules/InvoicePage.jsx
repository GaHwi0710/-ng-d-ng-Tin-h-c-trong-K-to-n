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
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatusBadge } from "../../components/Badge.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function InvoicePage({ title }) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payModal, setPayModal] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState("Tiền mặt");
  const [payAmount, setPayAmount] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // Multi-criteria filters
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    listRecords("invoices").then(setInvoices);
    listRecords("customers").then(setCustomers).catch(() => {});
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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, filterCustomer, fromDate, toDate]);

  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleInvoices.slice(start, start + pageSize);
  }, [visibleInvoices, page, pageSize]);

  const totalValue = invoices.reduce((sum, invoice) => sum + Number(invoice.TongTien || 0), 0);
  const collectedValue = invoices.reduce((sum, invoice) => sum + Number(invoice.SoTienDaTra || 0), 0);
  const outstandingValue = invoices.reduce((sum, invoice) => sum + Number(invoice.SoTienConLai ?? invoice.TongTien ?? 0), 0);

  function customerFor(invoice) {
    return customers.find((customer) => customer.id === String(invoice.MaKH) || customer.MaKH === invoice.MaKH);
  }

  function printInvoice(invoice) {
    const customer = customerFor(invoice);
    const lines = invoice.details || [];
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(invoice.MaHD || invoice.id)}</title><style>body{font-family:Arial,sans-serif;color:#1f2a37;margin:40px auto;max-width:780px}header{display:flex;justify-content:space-between;border-bottom:2px solid #3d7068;padding-bottom:18px}h1{font-size:24px;margin:0 0 6px}h2{font-size:16px;text-transform:uppercase;letter-spacing:1px;color:#3d7068;margin:0}p{margin:5px 0;color:#6b7680}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:11px 8px;border-bottom:1px solid #e3e6e5;text-align:left}th:last-child,td:last-child{text-align:right}.summary{margin:24px 0 0 auto;width:300px}.summary div{display:flex;justify-content:space-between;padding:6px 0}.grand{border-top:2px solid #3d7068;margin-top:7px;padding-top:12px!important;font-size:18px;font-weight:bold;color:#2a4f49}.foot{margin-top:42px;text-align:center;font-size:12px;color:#9aa3ab}@media print{body{margin:20px}}</style></head><body><header><div><h2>Mẹ &amp; Bé</h2><p>Hệ thống bán lẻ mẹ và bé</p></div><div style="text-align:right"><h1>HÓA ĐƠN BÁN HÀNG</h1><p>${escapeHtml(invoice.MaHD || invoice.id)} · ${escapeHtml(invoice.NgayLap)}</p><p style="font-size:13px;color:#555">Người lập: <strong>${escapeHtml(invoice.NguoiLap || "Quản trị viên")}</strong></p></div></header><section style="margin-top:22px"><strong>Khách hàng:</strong> ${escapeHtml(customer?.HoTen || invoice.MaKHCode || "Khách lẻ")}<br><span style="color:#6b7680">${escapeHtml(customer?.SDT || "")} ${customer?.DiaChi ? ` · ${escapeHtml(customer.DiaChi)}` : ""}</span></section><table><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${lines.map((line) => `<tr><td><div style="display:flex;align-items:center;gap:8px">${line.HinhAnh ? `<img src="${line.HinhAnh}" alt="" onerror="this.style.display='none'" style="width:28px;height:28px;object-fit:cover;border-radius:4px;border:1px solid #e3e6e5"/>` : ""}<span>${escapeHtml(line.TenSP || line.MaSPCode || line.MaSP)}</span></div></td><td>${Number(line.SoLuong || line.quantity || 0)}</td><td>${money.format(Number(line.DonGia || line.price || 0))}</td><td>${money.format(Number(line.ThanhTien || (line.SoLuong || line.quantity || 0) * (line.DonGia || line.price || 0)))}</td></tr>`).join("")}</tbody></table><div class="summary"><div><span>Tổng tiền</span><strong>${money.format(invoice.TongTien || 0)}</strong></div><div><span>Đã thanh toán</span><strong>${money.format(invoice.SoTienDaTra || 0)}</strong></div><div class="grand"><span>Còn phải thu</span><strong>${money.format(invoice.SoTienConLai ?? invoice.TongTien ?? 0)}</strong></div></div><p class="foot">Cảm ơn quý khách đã mua hàng tại Mẹ &amp; Bé.</p></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
          >
            <option value="all">Tất cả khách hàng</option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>{c.HoTen}</option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12.5 }}>
            <span style={{ color: "var(--text-soft)" }}>Từ:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
            />
            <span style={{ color: "var(--text-soft)" }}>Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
            />
          </div>

          {(filterCustomer !== "all" || fromDate || toDate) && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { setFilterCustomer("all"); setFromDate(""); setToDate(""); }}
            >
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
              <th scope="col">Giá trị</th>
              <th scope="col">Còn phải thu</th>
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
                <td>{money.format(invoice.TongTien || 0)}</td>
                <td><strong>{money.format(invoice.SoTienConLai ?? invoice.TongTien ?? 0)}</strong></td>
                <td><StatusBadge status={invoice.TrangThai} /></td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" type="button" title="Xem chi tiết" aria-label="Xem chi tiết" onClick={() => setSelectedInvoice(invoice)}><EyeIcon className="ic" aria-hidden="true" /></button>
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
              <StatusBadge status={selectedInvoice.TrangThai} />
            </div>
            <div className="invoice-parties"><div><span>Khách hàng</span><strong>{customerFor(selectedInvoice)?.HoTen || selectedInvoice.MaKHCode || "Khách lẻ"}</strong><small>{customerFor(selectedInvoice)?.SDT || "Chưa có số điện thoại"}</small></div><div><span>Thanh toán</span><strong>{money.format(selectedInvoice.SoTienDaTra || 0)}</strong><small>Còn lại {money.format(selectedInvoice.SoTienConLai ?? selectedInvoice.TongTien ?? 0)}</small></div></div>
            <div className="table-shell invoice-lines"><table><thead><tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{(selectedInvoice.details || []).map((line, index) => <tr key={`${line.MaSP || line.productId}-${index}`}><td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><ProductImage src={line.HinhAnh} alt={line.TenSP || line.MaSPCode} category={line.LoaiHang} size={34} /><strong>{line.TenSP || line.MaSPCode || line.MaSP || line.productId}</strong></div></td><td>{line.SoLuong || line.quantity}</td><td>{money.format(line.DonGia || line.price || 0)}</td><td><strong>{money.format(line.ThanhTien || (line.SoLuong || line.quantity) * (line.DonGia || line.price || 0))}</strong></td></tr>)}</tbody></table></div>
            <div className="invoice-total"><span>Tổng cộng</span><strong>{money.format(selectedInvoice.TongTien || 0)}</strong></div>
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
      </Modal>
    </section>
  );
}

/* ================================================================
   STOCKTAKE & RETURN PAGES ARE IMPORTED FROM ./modules/
   ================================================================ */
