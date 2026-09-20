import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatusBadge } from "../../components/Badge.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { currentUserInfo } from "../../lib/permissions.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function PurchaseOrderPage({ title }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState("Đang chờ");
  const [selected, setSelected] = useState([]);
  const [poDetailModal, setPoDetailModal] = useState(null);

  // Filter state for saved orders
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Combobox state
  const [cbQuery, setCbQuery] = useState("");
  const [cbOpen, setCbOpen] = useState(false);
  const [cbHighlight, setCbHighlight] = useState(0);

  useEffect(() => {
    listRecords("suppliers").then(setSuppliers);
    listRecords("products").then(setProducts);
    listRecords("purchase-orders").then(setOrders);
  }, []);

  const total = selected.reduce((sum, line) => sum + line.quantity * line.price, 0);

  // Combobox filtered list
  const cbFiltered = products.filter(
    (p) =>
      p.TrangThai !== "Ngừng bán" &&
      !selected.some((s) => s.id === p.id) &&
      (cbQuery === "" ||
        p.MaSP?.toLowerCase().includes(cbQuery.toLowerCase()) ||
        p.TenSP?.toLowerCase().includes(cbQuery.toLowerCase()))
  );

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
    if (!product || selected.some((item) => item.id === product.id)) return;
    const initialPrice = Number(product.GiaNhap ?? product.GiaBan ?? 0);
    setSelected((current) => [...current, { ...product, quantity: 1, price: initialPrice }]);
    setCbQuery("");
    setCbOpen(false);
    setCbHighlight(0);
  }

  async function submit(event) {
    event.preventDefault();
    if (!supplierId) return toast("Vui lòng chọn nhà cung cấp trước khi lưu đơn");
    if (!selected.length) return toast("Vui lòng chọn ít nhất một sản phẩm vào đơn đặt hàng");
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
        TrangThai: status,
        TongTien: total,
        NguoiLap: currentUserInfo().name,
        items: selected.map((line) => ({
          productId: line.id,
          quantity: line.quantity,
          price: line.price,
        })),
      });
      setOrders((current) => [saved, ...current]);
      setSelected([]);
      toast("Đã lưu đơn đặt hàng NCC thành công");
    } catch (error) {
      toast(error.message || "Không lưu được đơn đặt hàng");
    }
  }

  return (
    <section aria-labelledby="purchase-order-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="purchase-order-heading">{title}</h1>
          <p>Lập đơn đặt hàng có sản phẩm, số lượng và liên kết trực tiếp với phiếu nhập.</p>
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
                  {suppliers.map((supplier) => (
                    <option value={supplier.id} key={supplier.id}>
                      {supplier.MaNCC} · {supplier.TenNCC}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Ngày đặt <span className="required-star">*</span></span>
                <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required />
              </label>
              <label className="field">
                <span>Trạng thái</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>Đang chờ</option>
                  <option>Đã xác nhận</option>
                  <option>Đã nhập kho</option>
                  <option>Đã hủy</option>
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
          <section className="panel po-product-panel">
            <div className="po-panel-head">
              <h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                CHI TIẾT SẢN PHẨM
                {selected.length > 0 && <span className="po-item-count">{selected.length} mặt hàng</span>}
              </h2>
              {/* Custom searchable combobox */}
              <div className="po-combobox" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) { setCbOpen(false); setCbHighlight(0); } }}>
                <div className={`po-cb-input-wrap ${cbOpen ? "po-cb-open" : ""}`}>
                  <svg className="po-cb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    className="po-cb-input"
                    type="text"
                    autoComplete="off"
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
                    }}
                  />
                  {cbQuery ? (
                    <button type="button" className="po-cb-clear" onClick={() => { setCbQuery(""); setCbOpen(false); }} tabIndex={-1} title="Xóa">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  ) : (
                    <svg className="po-cb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  )}
                </div>
                {cbOpen && (
                  <div className="po-cb-dropdown">
                    {cbFiltered.length === 0 ? (
                      <div className="po-cb-empty">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        {cbQuery ? `Không tìm thấy "${cbQuery}"` : "Không còn sản phẩm để thêm"}
                      </div>
                    ) : cbFiltered.map((product, idx) => (
                      <button
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
          <button className="btn btn-primary btn-block" type="submit">Lưu đơn đặt hàng</button>
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
              <option value="Đang chờ">Đang chờ</option>
              <option value="Đã xác nhận">Đã xác nhận</option>
              <option value="Đã nhập kho">Đã nhập kho</option>
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
                return (
                  <tr key={order.id}>
                    <td><strong>{order.MaDDH || order.id}</strong></td>
                    <td>{s?.TenNCC || order.MaNCCCode || order.MaNCC}</td>
                    <td>{order.NgayDat}</td>
                    <td><span style={{ fontWeight: 500, color: "var(--text-soft)" }}>{order.NguoiLap || order.MaNVCode || "Quản trị viên"}</span></td>
                    <td>{money.format(order.TongTien || 0)}</td>
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
                    </td>
                  </tr>
                );
              })}
              {!filteredOrders.length && (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
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
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Mã SP</th>
                    <th>Tên sản phẩm</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: "right" }}>Số lượng</th>
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
                    const spCode = prod?.MaSP || item.MaSPCode || (!/^[0-9a-fA-F]{24}$/.test(item.MaSP) ? item.MaSP : "") || "—";
                    const spName = prod?.TenSP || item.TenSP || item.name || "—";
                    const spUnit = prod?.DonViTinh || item.DonViTinh || "—";
                    const spPrice = Number(item.DonGia ?? item.price ?? prod?.GiaNhap ?? 0);
                    const spQty = Number(item.SoLuong ?? item.quantity ?? 0);
                    const spTotal = Number(item.ThanhTien || spQty * spPrice);
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td><code style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{spCode}</code></td>
                        <td>{spName}</td>
                        <td>{spUnit}</td>
                        <td style={{ textAlign: "right" }}>{spQty}</td>
                        <td style={{ textAlign: "right" }}>{money.format(spPrice)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{money.format(spTotal)}</td>
                      </tr>
                    );
                  })}
                  {!(poDetailModal.loadedDetails || []).length && (
                    <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>Chưa có dữ liệu chi tiết sản phẩm</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="po-detail-total">
              <span>Tổng tiền:</span>
              <span>{money.format(poDetailModal.TongTien || 0)}</span>
            </div>
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

