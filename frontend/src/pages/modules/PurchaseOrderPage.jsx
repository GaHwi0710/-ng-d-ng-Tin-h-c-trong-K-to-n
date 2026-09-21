<<<<<<< HEAD
import { useState, useEffect, useMemo, useRef } from "react";
=======
import { useState, useEffect, useMemo } from "react";
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  ShoppingCartIcon,
<<<<<<< HEAD
  ArrowDownTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord, postRequest, getRequest } from "../../lib/api.js";
=======
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatusBadge } from "../../components/Badge.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { currentUserInfo } from "../../lib/permissions.js";
<<<<<<< HEAD
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

<<<<<<< HEAD
// Trạng thái PO và màu tương ứng
const PO_STATUSES = [
  "Đang chờ nhập",
  "Đang chờ",
  "Đã đặt",
  "Đã xác nhận",
  "Nhập một phần",
  "Hoàn thành",
  "Đã hủy",
];

function PoProgressBar({ ordered, received }) {
  const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
  const color = pct >= 100 ? "#059669" : pct > 0 ? "#d97706" : "#94a3b8";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 38, textAlign: "right" }}>
        {received}/{ordered}
      </span>
    </div>
  );
}

=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
export function PurchaseOrderPage({ title }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
<<<<<<< HEAD
  const [status, setStatus] = useState("Đang chờ nhập");
  const [selected, setSelected] = useState([]);
  const [poDetailModal, setPoDetailModal] = useState(null);

  // Modal Tạo phiếu nhập từ PO
  const [receiveModal, setReceiveModal] = useState(null); // { po, items[] }
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivePaid, setReceivePaid] = useState(0);
  const [receiveNote, setReceiveNote] = useState("");
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

=======
  const [status, setStatus] = useState("Đang chờ");
  const [selected, setSelected] = useState([]);
  const [poDetailModal, setPoDetailModal] = useState(null);

>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  // Filter state for saved orders
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Combobox state
  const [cbQuery, setCbQuery] = useState("");
  const [cbOpen, setCbOpen] = useState(false);
  const [cbHighlight, setCbHighlight] = useState(0);
<<<<<<< HEAD
  const comboboxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setCbOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de

  useEffect(() => {
    listRecords("suppliers").then(setSuppliers);
    listRecords("products").then(setProducts);
    listRecords("purchase-orders").then(setOrders);
  }, []);

  const total = selected.reduce((sum, line) => sum + line.quantity * line.price, 0);

  // Combobox filtered list
<<<<<<< HEAD
  const cbFiltered = useMemo(() => {
    const q = (cbQuery || "").trim().toLowerCase();
    return products.filter((p) => {
      // Discontinued products cannot be ordered
      if (p.TrangThai === "Ngừng bán" || p.status === "inactive") return false;
      const pId = p.id || p._id;
      const isAlreadyAdded = selected.some((s) => (s.id || s._id) === pId);
      if (isAlreadyAdded) return false;
      if (!q) return true;
      const maSP = String(p.MaSP || "").toLowerCase();
      const tenSP = String(p.TenSP || "").toLowerCase();
      const loaiHang = String(p.LoaiHang || "").toLowerCase();
      return maSP.includes(q) || tenSP.includes(q) || loaiHang.includes(q);
    });
  }, [products, selected, cbQuery]);
=======
  const cbFiltered = products.filter(
    (p) =>
      p.TrangThai !== "Ngừng bán" &&
      !selected.some((s) => s.id === p.id) &&
      (cbQuery === "" ||
        p.MaSP?.toLowerCase().includes(cbQuery.toLowerCase()) ||
        p.TenSP?.toLowerCase().includes(cbQuery.toLowerCase()))
  );
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (
        filterSupplier !== "all" &&
        String(order.MaNCC) !== String(filterSupplier) &&
        String(order.MaNCCCode) !== String(filterSupplier)
      ) {
        return false;
      }
      if (filterStatus !== "all" && order.TrangThai !== filterStatus) return false;
      if (fromDate && order.NgayDat && order.NgayDat < fromDate) return false;
      if (toDate && order.NgayDat && order.NgayDat > toDate) return false;
      return true;
    });
  }, [orders, filterSupplier, filterStatus, fromDate, toDate]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [filterSupplier, filterStatus, fromDate, toDate]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  function addProductById(product) {
<<<<<<< HEAD
    if (!product) return;
    if (product.TrangThai === "Ngừng bán" || product.status === "inactive") {
      toast(`Sản phẩm "${product.TenSP}" đã ngừng kinh doanh, không thể đặt hàng`);
      return;
    }
    const prodId = product.id || product._id;
    if (selected.some((item) => (item.id || item._id) === prodId)) {
      toast("Sản phẩm này đã có trong danh sách chi tiết");
      return;
    }
    const initialPrice = Number(product.GiaNhap ?? product.GiaBan ?? 0);
    setSelected((current) => [
      ...current,
      { ...product, id: prodId, _id: prodId, quantity: 1, price: initialPrice },
    ]);
=======
    if (!product || selected.some((item) => item.id === product.id)) return;
    const initialPrice = Number(product.GiaNhap ?? product.GiaBan ?? 0);
    setSelected((current) => [...current, { ...product, quantity: 1, price: initialPrice }]);
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    setCbQuery("");
    setCbOpen(false);
    setCbHighlight(0);
  }

  async function submit(event) {
    event.preventDefault();
    if (!supplierId) return toast("Vui lòng chọn nhà cung cấp trước khi lưu đơn");
<<<<<<< HEAD
    const supp = suppliers.find((s) => String(s.id) === String(supplierId) || s.MaNCC === supplierId);
    if (supp && (supp.TrangThai === "Ngưng hoạt động" || supp.status === "inactive")) {
      return toast("Nhà cung cấp đã ngưng hoạt động, không thể tạo đơn đặt hàng mới");
    }
    if (!selected.length) return toast("Vui lòng chọn ít nhất một sản phẩm vào đơn đặt hàng");
    if (selected.some((p) => p.TrangThai === "Ngừng bán" || p.status === "inactive")) {
      return toast("Đơn đặt hàng không được chứa sản phẩm đã ngừng kinh doanh");
    }
=======
    if (!selected.length) return toast("Vui lòng chọn ít nhất một sản phẩm vào đơn đặt hàng");
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    if (
      selected.some(
        (line) =>
          !Number.isInteger(line.quantity) ||
          line.quantity <= 0 ||
          !Number.isFinite(line.price) ||
          line.price < 0
      )
    ) {
      return toast("Số lượng phải là số nguyên dương và đơn giá không được âm");
    }
    try {
      const saved = await saveRecord("purchase-orders", {
        MaNCC: supplierId,
        NgayDat: orderDate,
<<<<<<< HEAD
        TrangThai: "Đang chờ nhập",
=======
        TrangThai: status,
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
        TongTien: total,
        NguoiLap: currentUserInfo().name,
        items: selected.map((line) => ({
          productId: line.id,
          quantity: line.quantity,
          price: line.price,
<<<<<<< HEAD
          quantityReceived: 0,
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
        })),
      });
      setOrders((current) => [saved, ...current]);
      setSelected([]);
<<<<<<< HEAD
      setSupplierId("");
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      toast("Đã lưu đơn đặt hàng NCC thành công");
    } catch (error) {
      toast(error.message || "Không lưu được đơn đặt hàng");
    }
  }

<<<<<<< HEAD
  // Mở modal detail + load receipts summary
  async function openDetailModal(order) {
    try {
      let loadedDetails = order.items || order.details || [];
      let receiptsSummary = null;
      try {
        const detailRes = await listRecords(`purchase-orders/${order.id || order._id}`);
        if (detailRes && !Array.isArray(detailRes)) {
          loadedDetails = detailRes.items || detailRes.details || loadedDetails;
        } else if (Array.isArray(detailRes)) {
          loadedDetails = detailRes;
        }
      } catch { /* ignore */ }
      try {
        receiptsSummary = await getRequest(`purchase-orders/${order.id || order._id}/receipts`);
      } catch { /* ignore */ }
      setPoDetailModal({ ...order, loadedDetails, receiptsSummary });
    } catch {
      setPoDetailModal({ ...order, loadedDetails: order.items || order.details || [] });
    }
  }

  // Mở modal nhận hàng từ PO
  function openReceiveModal(order, details) {
    // Tính remaining từ receiptsSummary nếu có
    const summary = order.receiptsSummary?.summaryItems || [];
    const summaryMap = new Map(summary.map((s) => [s.productId, s]));

    const receiveItems = (details || []).map((item) => {
      const pid = String(item.productId || item.MaSP || item.id || "");
      const sum = summaryMap.get(pid);
      const ordered = sum?.quantityOrdered ?? Number(item.quantity || item.SoLuong || 0);
      const received = sum?.quantityReceived ?? Number(item.quantityReceived || 0);
      const remaining = Math.max(0, ordered - received);
      const prod = products.find((p) => String(p.id) === pid || String(p._id) === pid);
      return {
        productId: pid,
        TenSP: item.TenSP || prod?.TenSP || "Sản phẩm",
        MaSP: item.MaSP || prod?.MaSP || "",
        DonViTinh: item.DonViTinh || prod?.DonViTinh || "Cái",
        LoaiHang: item.LoaiHang || prod?.LoaiHang || "",
        HinhAnh: item.HinhAnh || prod?.HinhAnh || "",
        price: Number(item.price || item.DonGia || prod?.GiaNhap || 0),
        quantityOrdered: ordered,
        quantityReceived: received,
        remaining,
        receiveQty: remaining, // mặc định nhập đủ số còn thiếu
      };
    }).filter((item) => item.remaining > 0); // chỉ hiện dòng còn thiếu

    if (!receiveItems.length) {
      toast("Đơn đặt hàng đã nhập đủ hàng, không còn sản phẩm nào cần nhập");
      return;
    }

    const supp = suppliers.find((s) => String(s.id) === String(order.MaNCC));
    setReceiveModal({ po: order, items: receiveItems, supplierName: supp?.TenNCC || "" });
    setReceiveDate(new Date().toISOString().slice(0, 10));
    setReceivePaid(0);
    setReceiveNote("");
  }

  async function submitReceive() {
    if (!receiveModal) return;
    const linesToSend = receiveModal.items.filter((item) => item.receiveQty > 0);
    if (!linesToSend.length) return toast("Vui lòng nhập số lượng nhận cho ít nhất một sản phẩm");
    if (linesToSend.some((item) => !Number.isInteger(item.receiveQty) || item.receiveQty <= 0)) {
      return toast("Số lượng nhận phải là số nguyên dương");
    }
    if (linesToSend.some((item) => item.receiveQty > item.remaining)) {
      return toast("Số lượng nhận không được vượt số lượng còn thiếu");
    }
    setReceiveSubmitting(true);
    try {
      const poId = receiveModal.po.id || receiveModal.po._id;
      const receiveTotal = linesToSend.reduce((s, item) => s + item.receiveQty * item.price, 0);
      const paid = Math.min(Number(receivePaid) || 0, receiveTotal);
      await postRequest(`purchase-orders/${poId}/receive`, {
        items: linesToSend.map((item) => ({
          productId: item.productId,
          quantity: item.receiveQty,
          price: item.price,
        })),
        SoTienDaTra: paid,
        NgayNhap: receiveDate,
        GhiChu: receiveNote,
      });
      // Reload PO list
      const refreshed = await listRecords("purchase-orders");
      setOrders(refreshed);
      setReceiveModal(null);
      setPoDetailModal(null);
      toast("Đã tạo phiếu nhập và cập nhật tồn kho thành công!");
    } catch (err) {
      toast(err.message || "Lỗi khi tạo phiếu nhập");
    } finally {
      setReceiveSubmitting(false);
    }
  }

=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  return (
    <section aria-labelledby="purchase-order-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="purchase-order-heading">{title}</h1>
<<<<<<< HEAD
          <p>Lập đơn đặt hàng NCC → Nhận hàng từng phần → Tự động cập nhật tồn kho và công nợ.</p>
=======
          <p>Lập đơn đặt hàng có sản phẩm, số lượng và liên kết trực tiếp với phiếu nhập.</p>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
        </hgroup>
      </header>
      <form onSubmit={submit} className="document-grid">
        <div className="stack">
          <section className="panel">
            <h2>THÔNG TIN ĐƠN ĐẶT HÀNG</h2>
            <div className="form-grid">
              <label className="field">
                <span>Nhà cung cấp <span className="required-star">*</span></span>
                <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
                  <option value="">Chọn nhà cung cấp</option>
<<<<<<< HEAD
                  {suppliers.map((supplier) => {
                    const isInactive = supplier.TrangThai === "Ngưng hoạt động" || supplier.status === "inactive";
                    return (
                      <option value={supplier.id} key={supplier.id} disabled={isInactive}>
                        {supplier.MaNCC} · {supplier.TenNCC} {isInactive ? "(Đã ngưng hoạt động)" : ""}
                      </option>
                    );
                  })}
=======
                  {suppliers.map((supplier) => (
                    <option value={supplier.id} key={supplier.id}>
                      {supplier.MaNCC} · {supplier.TenNCC}
                    </option>
                  ))}
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                </select>
              </label>
              <label className="field">
                <span>Ngày đặt <span className="required-star">*</span></span>
                <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required />
              </label>
              <label className="field">
                <span>Trạng thái</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
<<<<<<< HEAD
                  <option>Đang chờ nhập</option>
                  <option>Đã đặt</option>
                  <option>Đã xác nhận</option>
=======
                  <option>Đang chờ</option>
                  <option>Đã xác nhận</option>
                  <option>Đã nhập kho</option>
                  <option>Đã hủy</option>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                </select>
              </label>
              <label className="field">
                <span>Người lập phiếu</span>
                <input
                  type="text"
                  readOnly
                  value={currentUserInfo().display}
                  style={{
                    background: "var(--surface-sunken, #f1f5f9)",
                    color: "var(--text-soft)",
                    fontWeight: 600,
                    cursor: "not-allowed",
                  }}
                />
              </label>
            </div>
          </section>
<<<<<<< HEAD
          <section className="panel po-product-panel" style={{ overflow: "visible" }}>
=======
          <section className="panel po-product-panel">
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
            <div className="po-panel-head">
              <h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                CHI TIẾT SẢN PHẨM
                {selected.length > 0 && <span className="po-item-count">{selected.length} mặt hàng</span>}
              </h2>
<<<<<<< HEAD

              {/* Custom searchable combobox */}
              <div className="po-combobox" ref={comboboxRef} style={{ position: "relative", width: "100%" }}>
=======
              {/* Custom searchable combobox */}
              <div className="po-combobox" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setCbOpen(false); setCbHighlight(0); } }}>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                <div className={`po-cb-input-wrap ${cbOpen ? "po-cb-open" : ""}`}>
                  <svg className="po-cb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    className="po-cb-input"
                    type="text"
                    autoComplete="off"
<<<<<<< HEAD
                    placeholder="Tìm theo tên, mã sản phẩm hoặc danh mục…"
                    value={cbQuery}
                    onFocus={() => { setCbOpen(true); setCbHighlight(0); }}
                    onClick={() => { setCbOpen(true); }}
                    onChange={(e) => { setCbQuery(e.target.value); setCbOpen(true); setCbHighlight(0); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        if (cbFiltered[cbHighlight]) {
                          addProductById(cbFiltered[cbHighlight]);
                        }
                        return;
                      }
                      if (!cbOpen) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setCbOpen(true);
                        }
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setCbHighlight((h) => Math.min(h + 1, cbFiltered.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setCbHighlight((h) => Math.max(h - 1, 0));
                      } else if (e.key === "Escape") {
                        setCbOpen(false);
                        setCbQuery("");
                      }
=======
                    placeholder="Tìm và thêm sản phẩm…"
                    value={cbQuery}
                    onFocus={() => { setCbOpen(true); setCbHighlight(0); }}
                    onChange={(e) => { setCbQuery(e.target.value); setCbOpen(true); setCbHighlight(0); }}
                    onKeyDown={(e) => {
                      if (!cbOpen) return;
                      if (e.key === "ArrowDown") { e.preventDefault(); setCbHighlight((h) => Math.min(h + 1, cbFiltered.length - 1)); }
                      else if (e.key === "ArrowUp") { e.preventDefault(); setCbHighlight((h) => Math.max(h - 1, 0)); }
                      else if (e.key === "Enter") { e.preventDefault(); if (cbFiltered[cbHighlight]) addProductById(cbFiltered[cbHighlight]); }
                      else if (e.key === "Escape") { setCbOpen(false); setCbQuery(""); }
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    }}
                  />
                  {cbQuery ? (
                    <button type="button" className="po-cb-clear" onClick={() => { setCbQuery(""); setCbOpen(false); }} tabIndex={-1} title="Xóa">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  ) : (
<<<<<<< HEAD
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setCbOpen((prev) => !prev)}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <svg className="po-cb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  )}
                </div>
                {cbOpen && (
                  <div
                    className="po-cb-dropdown"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                      background: "#fff",
                      border: "1.5px solid var(--primary)",
                      borderRadius: 10,
                      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
                      maxHeight: 280,
                      overflowY: "auto",
                      padding: 6,
                    }}
                  >
=======
                    <svg className="po-cb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  )}
                </div>
                {cbOpen && (
                  <div className="po-cb-dropdown">
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    {cbFiltered.length === 0 ? (
                      <div className="po-cb-empty">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        {cbQuery ? `Không tìm thấy "${cbQuery}"` : "Không còn sản phẩm để thêm"}
                      </div>
                    ) : cbFiltered.map((product, idx) => (
                      <button
<<<<<<< HEAD
                        key={product.id || product._id || idx}
                        type="button"
                        className={`po-cb-option ${idx === cbHighlight ? "po-cb-option-active" : ""}`}
                        onMouseEnter={() => setCbHighlight(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addProductById(product);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          addProductById(product);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          padding: "8px 10px",
                          border: 0,
                          borderRadius: 6,
                          background: idx === cbHighlight ? "var(--primary-light)" : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <ProductImage src={product.HinhAnh} alt={product.TenSP} category={product.LoaiHang} size={30} borderRadius={6} />
                        <span className="po-cb-code" style={{ minWidth: 70, fontWeight: 700, color: "var(--primary-dark)" }}>{product.MaSP}</span>
                        <span className="po-cb-name" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.TenSP}</span>
                        <span style={{ fontSize: 11, color: "var(--text-faint)", marginRight: 6 }}>
                          {product.LoaiHang || ""}
                        </span>
=======
                        key={product.id}
                        type="button"
                        className={`po-cb-option ${idx === cbHighlight ? "po-cb-option-active" : ""}`}
                        onMouseEnter={() => setCbHighlight(idx)}
                        onMouseDown={(e) => { e.preventDefault(); addProductById(product); }}
                        tabIndex={-1}
                      >
                        <ProductImage src={product.HinhAnh} alt={product.TenSP} category={product.LoaiHang} size={26} borderRadius={6} />
                        <span className="po-cb-code">{product.MaSP}</span>
                        <span className="po-cb-name">{product.TenSP}</span>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                        {Number(product.stock || 0) <= 0 ? (
                          <span className="stock-status-out" style={{ fontSize: 10, padding: "1px 6px", whiteSpace: "nowrap" }}>Hết hàng</span>
                        ) : Number(product.stock || 0) <= LOW_STOCK_THRESHOLD ? (
                          <span className="stock-status-low" style={{ fontSize: 10, padding: "1px 6px", whiteSpace: "nowrap" }}>Tồn {product.stock}</span>
                        ) : (
                          <span className="stock-status-ok" style={{ fontSize: 10, padding: "1px 6px", whiteSpace: "nowrap" }}>Tồn {product.stock}</span>
                        )}
                        <svg className="po-cb-plus" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
<<<<<<< HEAD
=======

>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
            </div>

            {selected.length === 0 ? (
              <div className="po-empty-state">
                <div className="po-empty-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <p className="po-empty-title">Chưa có sản phẩm nào</p>
                <p className="po-empty-sub">Chọn sản phẩm từ danh sách phía trên để thêm vào đơn đặt hàng</p>
              </div>
            ) : (
              <div className="table-shell po-table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Mã hàng / Tên hàng</th>
                      <th style={{ width: 120 }}>Số lượng</th>
                      <th style={{ width: 150 }}>Đơn giá nhập</th>
                      <th style={{ width: 140 }}>Thành tiền</th>
                      <th style={{ width: 48 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((line, idx) => (
                      <tr key={line.id} className="po-product-row">
                        <td>
                          <div className="po-product-cell">
                            <span className="po-product-index">{idx + 1}</span>
                            <ProductImage src={line.HinhAnh} alt={line.TenSP} category={line.LoaiHang} size={36} />
                            <div>
                              <strong className="po-product-code">{line.MaSP}</strong>
                              <small className="po-product-name">{line.TenSP}</small>
<<<<<<< HEAD
                              {Number(line.stock || 0) <= 0 && (
                                <small style={{ color: "var(--danger)", display: "block", fontSize: 10 }}>Hết hàng — đặt để bổ sung kho</small>
                              )}
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            className="po-num-input"
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(event) => {
                              const qtyVal = Math.max(1, parseInt(event.target.value, 10) || 1);
                              setSelected((current) => current.map((item) => item.id === line.id ? { ...item, quantity: qtyVal } : item));
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="po-num-input po-price-input"
                            type="number"
                            min="0"
                            value={line.price}
                            onChange={(event) => {
                              const prcVal = Math.max(0, Number(event.target.value) || 0);
                              setSelected((current) => current.map((item) => item.id === line.id ? { ...item, price: prcVal } : item));
                            }}
                          />
                        </td>
                        <td>
                          <span className="po-line-total">{money.format((line.quantity || 0) * (line.price || 0))}</span>
                        </td>
                        <td>
                          <button
                            className="po-remove-btn"
                            type="button"
                            title="Xóa sản phẩm"
                            onClick={() => setSelected((current) => current.filter((item) => item.id !== line.id))}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <aside className="summary-card">
          <h2>TỔNG ĐƠN ĐẶT HÀNG</h2>
          <dl>
            <div><dt>Số mặt hàng</dt><dd>{selected.length}</dd></div>
            <div><dt>Tổng số lượng</dt><dd>{selected.reduce((sum, line) => sum + line.quantity, 0)}</dd></div>
          </dl>
          <div className="summary-total"><span>Tổng tiền</span><strong>{money.format(total)}</strong></div>
<<<<<<< HEAD
          <div style={{ marginTop: 8, padding: "8px 10px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 12, color: "#166534" }}>
            💡 Tạo đơn sẽ <strong>không tăng tồn kho</strong>. Tồn kho chỉ tăng khi bấm <strong>"Tạo phiếu nhập"</strong> sau khi NCC giao hàng.
          </div>
          <button className="btn btn-primary btn-block" type="submit" style={{ marginTop: 10 }}>Lưu đơn đặt hàng</button>
=======
          <button className="btn btn-primary btn-block" type="submit">Lưu đơn đặt hàng</button>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
        </aside>
      </form>

      <section className="panel" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>ĐƠN ĐẶT HÀNG ĐÃ LƯU ({filteredOrders.length})</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
            >
              <option value="all">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option value={s.id} key={s.id}>{s.TenNCC}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
            >
              <option value="all">Tất cả trạng thái</option>
<<<<<<< HEAD
              <option value="Đang chờ nhập">Đang chờ nhập</option>
              <option value="Đang chờ">Đang chờ</option>
              <option value="Đã đặt">Đã đặt</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
              <option value="Nhập một phần">Nhập một phần</option>
              <option value="Hoàn thành">Hoàn thành</option>
=======
              <option value="Đang chờ">Đang chờ</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
              <option value="Đã nhập kho">Đã nhập kho</option>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
              <option value="Đã hủy">Đã hủy</option>
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
            {(filterSupplier !== "all" || filterStatus !== "all" || fromDate || toDate) && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => { setFilterSupplier("all"); setFilterStatus("all"); setFromDate(""); setToDate(""); }}
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Nhà cung cấp</th>
                <th>Ngày đặt</th>
                <th>Người lập phiếu</th>
                <th>Tổng tiền</th>
<<<<<<< HEAD
                <th>Tiến độ nhập</th>
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrders.map((order) => {
                const s = suppliers.find(
                  (sup) =>
                    String(sup.id) === String(order.MaNCC) ||
                    sup.MaNCC === order.MaNCC ||
                    String(sup.MaNCC) === String(order.MaNCCCode)
                );
<<<<<<< HEAD
                // Tính tiến độ từ items
                const items = order.items || order.details || [];
                const totalOrdered = items.reduce((sum, i) => sum + Number(i.quantity || i.SoLuong || 0), 0);
                const totalReceived = items.reduce((sum, i) => sum + Number(i.quantityReceived || 0), 0);
                const canReceive = order.TrangThai !== "Hoàn thành" && order.TrangThai !== "Đã hủy";
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                return (
                  <tr key={order.id}>
                    <td><strong>{order.MaDDH || order.id}</strong></td>
                    <td>{s?.TenNCC || order.MaNCCCode || order.MaNCC}</td>
                    <td>{order.NgayDat}</td>
                    <td><span style={{ fontWeight: 500, color: "var(--text-soft)" }}>{order.NguoiLap || order.MaNVCode || "Quản trị viên"}</span></td>
                    <td>{money.format(order.TongTien || 0)}</td>
<<<<<<< HEAD
                    <td style={{ minWidth: 120 }}>
                      {totalOrdered > 0 ? (
                        <PoProgressBar ordered={totalOrdered} received={totalReceived} />
                      ) : (
                        <span style={{ color: "var(--text-faint)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td><StatusBadge status={order.TrangThai} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" className="icon-sm-btn" title="Xem chi tiết" onClick={() => openDetailModal(order)}>
                          <EyeIcon className="ic" />
                        </button>
                        {canReceive && (
                          <button
                            type="button"
                            className="icon-sm-btn"
                            title="Tạo phiếu nhập từ đơn này"
                            style={{ color: "var(--success, #059669)" }}
                            onClick={() => openReceiveModal(order, order.items || order.details || [])}
                          >
                            <ArrowDownTrayIcon className="ic" />
                          </button>
                        )}
                      </div>
=======
                    <td><StatusBadge status={order.TrangThai} /></td>
                    <td>
                      <button type="button" className="icon-sm-btn" title="Xem chi tiết" onClick={async () => {
                        try {
                          const details = await listRecords(`purchase-orders/${order.id || order._id}`);
                          const loaded = (details && !Array.isArray(details) ? (details.items || details.details) : Array.isArray(details) ? details : null) || order.items || order.details || [];
                          setPoDetailModal({ ...order, loadedDetails: loaded });
                        } catch {
                          setPoDetailModal({ ...order, loadedDetails: order.items || order.details || [] });
                        }
                      }}>
                        <EyeIcon className="ic" />
                      </button>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    </td>
                  </tr>
                );
              })}
              {!filteredOrders.length && (
                <tr>
<<<<<<< HEAD
                  <td colSpan={8} style={{ padding: 0 }}>
=======
                  <td colSpan={7} style={{ padding: 0 }}>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    <EmptyState
                      icon={ShoppingCartIcon}
                      title="Không tìm thấy đơn đặt hàng"
                      description="Không có đơn đặt hàng nào phù hợp với bộ lọc."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>

<<<<<<< HEAD
      {/* ── Modal Chi tiết PO ── */}
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      <Modal
        open={!!poDetailModal}
        title={`Chi tiết đơn đặt hàng ${poDetailModal?.MaDDH || poDetailModal?.id || ""}`}
        onClose={() => setPoDetailModal(null)}
        wide
      >
        {poDetailModal && (
          <div>
            <div className="po-detail-header">
              <div className="po-detail-field">
                <span className="po-detail-label">Mã đơn</span>
                <span className="po-detail-value">{poDetailModal.MaDDH || poDetailModal.id}</span>
              </div>
              <div className="po-detail-field">
                <span className="po-detail-label">Nhà cung cấp</span>
                <span className="po-detail-value">{suppliers.find(s => String(s.id) === String(poDetailModal.MaNCC))?.TenNCC || poDetailModal.MaNCCCode || ""}</span>
              </div>
              <div className="po-detail-field">
                <span className="po-detail-label">Ngày đặt</span>
                <span className="po-detail-value">{poDetailModal.NgayDat}</span>
              </div>
              <div className="po-detail-field">
                <span className="po-detail-label">Người lập</span>
                <span className="po-detail-value">{poDetailModal.NguoiLap || poDetailModal.MaNVCode || "Quản trị viên"}</span>
              </div>
              <div className="po-detail-field">
                <span className="po-detail-label">Trạng thái</span>
                <span className="po-detail-value"><StatusBadge status={poDetailModal.TrangThai} /></span>
              </div>
            </div>
<<<<<<< HEAD

            {/* Tiến độ nhập theo từng sản phẩm */}
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã SP</th>
                    <th>Tên sản phẩm</th>
                    <th>ĐVT</th>
<<<<<<< HEAD
                    <th style={{ textAlign: "right" }}>Đặt</th>
                    <th style={{ textAlign: "right" }}>Đã nhập</th>
                    <th style={{ textAlign: "right" }}>Còn thiếu</th>
=======
                    <th style={{ textAlign: "right" }}>Số lượng</th>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    <th style={{ textAlign: "right" }}>Đơn giá</th>
                    <th style={{ textAlign: "right" }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(poDetailModal.loadedDetails || []).map((item, idx) => {
                    const prod = products.find((p) =>
                      String(p.id) === String(item.productId || item.MaSP || item._id) ||
                      String(p.MaSP) === String(item.MaSPCode || item.MaSP)
                    );
<<<<<<< HEAD
                    // Lấy thông tin từ receiptsSummary nếu có (chính xác hơn)
                    const pid = String(item.productId || item.MaSP || item.id || "");
                    const summaryItem = poDetailModal.receiptsSummary?.summaryItems?.find(s => s.productId === pid);
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    const spCode = prod?.MaSP || item.MaSPCode || (!/^[0-9a-fA-F]{24}$/.test(item.MaSP) ? item.MaSP : "") || "—";
                    const spName = prod?.TenSP || item.TenSP || item.name || "—";
                    const spUnit = prod?.DonViTinh || item.DonViTinh || "—";
                    const spPrice = Number(item.DonGia ?? item.price ?? prod?.GiaNhap ?? 0);
<<<<<<< HEAD
                    const spQty = summaryItem?.quantityOrdered ?? Number(item.SoLuong ?? item.quantity ?? 0);
                    const spReceived = summaryItem?.quantityReceived ?? Number(item.quantityReceived ?? 0);
                    const spRemaining = Math.max(0, spQty - spReceived);
                    const spTotal = spQty * spPrice;
=======
                    const spQty = Number(item.SoLuong ?? item.quantity ?? 0);
                    const spTotal = Number(item.ThanhTien || spQty * spPrice);
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td><code style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{spCode}</code></td>
                        <td>{spName}</td>
                        <td>{spUnit}</td>
<<<<<<< HEAD
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{spQty}</td>
                        <td style={{ textAlign: "right", color: spReceived > 0 ? "#059669" : "var(--text-faint)", fontWeight: spReceived > 0 ? 700 : 400 }}>{spReceived}</td>
                        <td style={{ textAlign: "right", color: spRemaining > 0 ? "#d97706" : "#059669", fontWeight: 700 }}>{spRemaining}</td>
=======
                        <td style={{ textAlign: "right" }}>{spQty}</td>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                        <td style={{ textAlign: "right" }}>{money.format(spPrice)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{money.format(spTotal)}</td>
                      </tr>
                    );
                  })}
                  {!(poDetailModal.loadedDetails || []).length && (
<<<<<<< HEAD
                    <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>Chưa có dữ liệu chi tiết sản phẩm</td></tr>
=======
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>Chưa có dữ liệu chi tiết sản phẩm</td></tr>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
                  )}
                </tbody>
              </table>
            </div>
<<<<<<< HEAD

            {/* Tổng kết */}
            {poDetailModal.receiptsSummary && (
              <div style={{ display: "flex", gap: 16, marginTop: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid var(--border)", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>
                  📦 Tổng đặt: <strong>{poDetailModal.receiptsSummary.totalOrdered} sp</strong>
                </div>
                <div style={{ fontSize: 12.5, color: "#059669" }}>
                  ✅ Đã nhập: <strong>{poDetailModal.receiptsSummary.totalReceived} sp</strong>
                </div>
                <div style={{ fontSize: 12.5, color: "#d97706" }}>
                  ⏳ Còn thiếu: <strong>{poDetailModal.receiptsSummary.totalRemaining} sp</strong>
                </div>
                {(poDetailModal.receiptsSummary.receipts || []).length > 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--text-soft)" }}>
                    📄 Số phiếu nhập đã tạo: <strong>{poDetailModal.receiptsSummary.receipts.length}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="po-detail-total">
              <span>Tổng tiền đơn đặt hàng:</span>
              <span>{money.format(poDetailModal.TongTien || 0)}</span>
            </div>

            {/* Nút tạo phiếu nhập */}
            {poDetailModal.TrangThai !== "Hoàn thành" && poDetailModal.TrangThai !== "Đã hủy" && (
              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    openReceiveModal(poDetailModal, poDetailModal.loadedDetails || []);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                  Tạo phiếu nhập từ đơn này
                </button>
              </div>
            )}
            {poDetailModal.TrangThai === "Hoàn thành" && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 13, color: "#166534", fontWeight: 600 }}>
                ✅ Đơn đặt hàng đã được nhập đủ hàng. Không thể tạo thêm phiếu nhập.
              </div>
            )}
            {poDetailModal.TrangThai === "Đã hủy" && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                ❌ Đơn đặt hàng đã bị hủy.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal Tạo phiếu nhập từ PO ── */}
      <Modal
        open={!!receiveModal}
        title={`Tạo phiếu nhập — ${receiveModal?.po?.MaDDH || receiveModal?.po?.id || ""}`}
        onClose={() => setReceiveModal(null)}
        onSubmit={submitReceive}
        submitLabel={receiveSubmitting ? "Đang xử lý..." : "Xác nhận nhập hàng"}
        wide
      >
        {receiveModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Thông tin NCC và đơn */}
            <div style={{ padding: "10px 14px", background: "#f0fdfa", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}>
              <div>Nhà cung cấp: <strong>{receiveModal.supplierName}</strong></div>
              <div style={{ marginTop: 4, color: "var(--text-soft)" }}>
                Đơn đặt hàng: <strong>{receiveModal.po.MaDDH || receiveModal.po.id}</strong> · Ngày đặt: {receiveModal.po.NgayDat}
              </div>
            </div>

            {/* Bảng nhập số lượng thực nhận */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--text)" }}>
                Sản phẩm còn cần nhập (chỉ hiện những sản phẩm chưa nhập đủ):
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th style={{ textAlign: "right" }}>Đặt</th>
                      <th style={{ textAlign: "right" }}>Đã nhập</th>
                      <th style={{ textAlign: "right", color: "#d97706" }}>Còn thiếu</th>
                      <th style={{ textAlign: "right", minWidth: 110 }}>Số lượng nhận <span className="required-star">*</span></th>
                      <th style={{ textAlign: "right" }}>Đơn giá</th>
                      <th style={{ textAlign: "right" }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiveModal.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ProductImage src={item.HinhAnh} alt={item.TenSP} category={item.LoaiHang} size={28} borderRadius={4} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 12 }}>{item.MaSP}</div>
                              <div style={{ fontSize: 12, color: "var(--text-soft)" }}>{item.TenSP}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>{item.quantityOrdered}</td>
                        <td style={{ textAlign: "right", color: item.quantityReceived > 0 ? "#059669" : "var(--text-faint)" }}>{item.quantityReceived}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#d97706" }}>{item.remaining}</td>
                        <td style={{ textAlign: "right" }}>
                          <input
                            type="number"
                            min={0}
                            max={item.remaining}
                            value={item.receiveQty}
                            className="po-num-input"
                            style={{ width: 90, textAlign: "right" }}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(item.remaining, parseInt(e.target.value, 10) || 0));
                              setReceiveModal((prev) => ({
                                ...prev,
                                items: prev.items.map((it, i) => i === idx ? { ...it, receiveQty: val } : it),
                              }));
                            }}
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>{money.format(item.price)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{money.format(item.receiveQty * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ textAlign: "right", fontWeight: 700, padding: "8px 4px" }}>Tổng tiền phiếu nhập:</td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: "var(--primary-dark)" }}>
                        {money.format(receiveModal.items.reduce((s, it) => s + it.receiveQty * it.price, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Thông tin thanh toán */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>Ngày nhập hàng</span>
                <input
                  type="date"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  style={{ padding: "7px 10px", fontSize: 13 }}
                />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                  Đã thanh toán NCC (đ)
                  <small style={{ color: "var(--text-faint)", fontWeight: 400 }}> — phần còn lại → công nợ</small>
                </span>
                <input
                  type="number"
                  min={0}
                  value={receivePaid}
                  onChange={(e) => setReceivePaid(Math.max(0, Number(e.target.value) || 0))}
                  style={{ padding: "7px 10px", fontSize: 13 }}
                  placeholder="0 = ghi nợ toàn bộ"
                />
              </label>
            </div>
            <label className="field" style={{ margin: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Ghi chú</span>
              <input
                type="text"
                value={receiveNote}
                onChange={(e) => setReceiveNote(e.target.value)}
                placeholder="Ghi chú phiếu nhập (tùy chọn)"
                style={{ padding: "7px 10px", fontSize: 13 }}
              />
            </label>

            <div style={{ padding: "8px 12px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8, fontSize: 12, color: "#854d0e" }}>
              💡 Sau khi xác nhận: Tồn kho sẽ tăng theo số lượng thực nhận. Công nợ NCC phát sinh từ số tiền chưa thanh toán. Trạng thái đơn đặt hàng sẽ được cập nhật tự động.
            </div>
=======
            <div className="po-detail-total">
              <span>Tổng tiền:</span>
              <span>{money.format(poDetailModal.TongTien || 0)}</span>
            </div>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
          </div>
        )}
      </Modal>
    </section>
  );
}

/* ================================================================
   STOCK DOCUMENT (Goods Receipts / Goods Issues)
   ================================================================ */
function currentUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    return user.fullName || user.username || "";
  } catch {
    return "";
  }
}

