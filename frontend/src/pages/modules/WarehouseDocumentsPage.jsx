import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  PrinterIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  ArchiveBoxArrowDownIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord } from "../../lib/api.js";
import {
  buildWarehouseVoucherHtml,
  buildWarehouseVoucherModel,
  printWarehouseVoucher,
} from "../../lib/warehouseVoucher.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatusBadge } from "../../components/Badge.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";
import { currentUserInfo } from "../../lib/permissions.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function currentUserName() {
  try {
    const user = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    return user.fullName || user.username || "Nhân viên";
  } catch {
    return "Nhân viên";
  }
}

export function WarehouseDocumentsPage({ type, title }) {
  const isReceipt = type === "receipt";
  const resource = isReceipt ? "goods-receipts" : "goods-issues";

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [reason, setReason] = useState("Bán hàng");
  const [note, setNote] = useState("");
  const [personName, setPersonName] = useState("");
  const [address, setAddress] = useState("");
  const [warehouse, setWarehouse] = useState("Kho chính");
  const [location, setLocation] = useState("Hà Nội");
  const [debit, setDebit] = useState(isReceipt ? "156" : "632");
  const [credit, setCredit] = useState(isReceipt ? "331" : "156");
  const [attachedDocs, setAttachedDocs] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("Tiền mặt");

  // Filters for saved documents
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterReason, setFilterReason] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    listRecords("products").then(setProducts).catch(() => setProducts([]));
    listRecords("suppliers").then(setSuppliers).catch(() => setSuppliers([]));
    if (isReceipt) listRecords("purchase-orders").then(setPurchaseOrders).catch(() => setPurchaseOrders([]));
    listRecords(resource)
      .then(setVouchers)
      .catch(() => setVouchers([]));
  }, [resource]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (
        isReceipt &&
        filterSupplier !== "all" &&
        String(v.MaNCC) !== String(filterSupplier) &&
        String(v.supplierId) !== String(filterSupplier)
      ) {
        return false;
      }
      if (!isReceipt && filterReason !== "all" && v.LyDoXuat !== filterReason) {
        return false;
      }
      const d = v.NgayNhap || v.NgayXuat;
      if (fromDate && d && d < fromDate) return false;
      if (toDate && d && d > toDate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = String(v.MaPN || v.MaPX || v.id || "").toLowerCase();
        const party = String(v.NguoiLienQuan || v.TenNCC || "").toLowerCase();
        const matchProduct = (v.details || []).some((item) =>
          String(item.TenSP || item.MaSPCode || item.MaSP || "").toLowerCase().includes(q)
        );
        if (!code.includes(q) && !party.includes(q) && !matchProduct) return false;
      }

      return true;
    });
  }, [vouchers, isReceipt, filterSupplier, filterReason, fromDate, toDate, searchQuery]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [filterSupplier, filterReason, fromDate, toDate, searchQuery]);

  const pagedVouchers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, page, pageSize]);

  const total = selected.reduce(
    (sum, item) => sum + item.quantity * Number(item.price),
    0
  );
  const quantity = selected.reduce((sum, item) => sum + item.quantity, 0);
  const invalid =
    !isReceipt &&
    reason !== "Điều chỉnh kiểm kê thiếu" &&
    selected.some((item) => item.quantity > Number(item.stock));

  function addProduct(event) {
    const id = event.target.value;
    if (!id) return;
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (product.TrangThai === "Ngừng bán" || product.status === "inactive") {
      toast(`Sản phẩm "${product.TenSP}" đã ngừng kinh doanh, không thể lập phiếu kho`);
      event.target.value = "";
      return;
    }
    if (!isReceipt && reason !== "Điều chỉnh kiểm kê thiếu" && Number(product.stock || 0) <= 0) {
      toast(`Sản phẩm "${product.TenSP}" đã hết hàng trong kho! Không thể xuất kho.`);
      event.target.value = "";
      return;
    }
    setSelected((current) => [
      ...current,
      { ...product, quantity: 1, price: Number(product.GiaNhap ?? product.GiaBan ?? 0) },
    ]);
    event.target.value = "";
  }

  function updateQuantity(id, value) {
    setSelected((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Number(value) || 1) }
          : item
      )
    );
  }

  async function handleSelectPurchaseOrder(poId) {
    setPurchaseOrderId(poId);
    if (!poId) return;

    let po = purchaseOrders.find(
      (order) => String(order.id) === String(poId) || String(order._id) === String(poId) || order.MaDDH === poId
    );
    if (!po) return;

    // Nếu đơn chưa có items/details đầy đủ, tải chi tiết từ máy chủ
    if (!po.items?.length && !po.details?.length) {
      try {
        const detailDoc = await listRecords(`purchase-orders/${po.id || po._id}`);
        if (detailDoc && (detailDoc.items?.length || detailDoc.details?.length)) {
          po = { ...po, items: detailDoc.items || detailDoc.details };
        }
      } catch {
        // Tiếp tục với dữ liệu sẵn có
      }
    }

    // 1. Tự động đồng bộ Nhà cung cấp tương ứng với Đơn đặt hàng
    const matchedSupplier = suppliers.find(
      (s) => String(s.id) === String(po.MaNCC) || s.MaNCC === po.MaNCC || String(s.MaNCC) === String(po.MaNCCCode)
    );
    if (matchedSupplier) {
      setSupplierId(matchedSupplier.id);
      setPersonName(matchedSupplier.TenNCC);
      setAddress(matchedSupplier.DiaChi || "");
    }

    // 2. Gắn Số chứng từ gốc là mã Đơn đặt hàng
    if (po.MaDDH) {
      setAttachedDocs(po.MaDDH);
      setNote(`Nhập kho theo đơn đặt hàng ${po.MaDDH}`);
    }

    // 3. Tự động nạp danh sách sản phẩm từ Đơn đặt hàng vào bảng Chi tiết hàng nhập (chỉ nạp lượng còn thiếu)
    const rawItems = po.items || po.details || [];
    if (rawItems.length > 0) {
      const importedLines = rawItems.map((item) => {
        const p = products.find(
          (prod) => String(prod.id) === String(item.productId || item.MaSP || item._id) ||
                    String(prod.MaSP) === String(item.MaSPCode || item.MaSP)
        ) || {};
        const ordered = Number(item.quantity ?? item.SoLuong ?? 1);
        const received = Number(item.quantityReceived ?? 0);
        const remaining = Math.max(0, ordered - received);
        const prc = Number(item.price ?? item.DonGia ?? p.GiaNhap ?? 0);
        return {
          ...p,
          id: p.id || item.productId || item.MaSP,
          MaSP: item.MaSPCode || item.MaSP || p.MaSP,
          TenSP: item.TenSP || p.TenSP,
          DonViTinh: item.DonViTinh || p.DonViTinh || "Cái",
          HinhAnh: item.HinhAnh || p.HinhAnh || "",
          quantity: remaining,
          remaining: remaining,
          quantityOrdered: ordered,
          quantityReceived: received,
          price: prc,
          stock: p.stock ?? 0,
        };
      }).filter((item) => item.quantity > 0);
      setSelected(importedLines);
      if (importedLines.length > 0) {
        toast(`Đã tự động nạp ${importedLines.length} mặt hàng còn thiếu từ đơn đặt hàng ${po.MaDDH || ""}`);
      } else {
        toast("Đơn đặt hàng này đã nhập đủ hàng, không còn sản phẩm nào cần nhập");
      }
    }
  }

  function draftRecord(savedId) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    return {
      id: savedId,
      MaNCC: supplierId,
      supplierId: supplierId,
      purchaseOrderId: purchaseOrderId || undefined,
      LyDoXuat: reason,
      LyDoNhap: supplier ? `Nhập hàng từ ${supplier.TenNCC}` : "Nhập kho",
      GhiChu: note,
      NgayNhap: new Date().toISOString().slice(0, 10),
      NgayXuat: new Date().toISOString().slice(0, 10),
      TongTien: total,
      SoTienDaTra: isReceipt ? Math.min(Number(paidAmount) || 0, total) : 0,
      paymentMethod: isReceipt ? payMethod : undefined,
      SoLuong: quantity,
      details: selected,
      NguoiLienQuan: personName || supplier?.TenNCC || "",
      DiaChi: address || supplier?.DiaChi || "",
      Kho: warehouse,
      DiaDiem: location,
      TkNo: debit,
      TkCo: credit,
      SoChungTuGoc: attachedDocs,
      NguoiLap: currentUserName(),
      TrangThai: "Đã lưu",
    };
  }

  function voucherModel(record) {
    return buildWarehouseVoucherModel({
      isReceipt,
      record,
      products,
      suppliers,
      userName: currentUserName(),
    });
  }

  function openPreview(record) {
    if (!(record.details || []).length) {
      toast("Thêm sản phẩm trước khi xem hoặc in phiếu");
      return;
    }
    setPreview(voucherModel(record));
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;

    if (!selected.length) {
      const msg = isReceipt
        ? "Vui lòng chọn ít nhất một sản phẩm cần nhập kho."
        : "Vui lòng chọn ít nhất một sản phẩm cần xuất kho.";
      setMessage(msg);
      toast(msg);
      return;
    }
    if (isReceipt && !supplierId) {
      const msg = "Vui lòng chọn nhà cung cấp trước khi lưu phiếu nhập kho.";
      setMessage(msg);
      toast(msg);
      return;
    }
    if (isReceipt) {
      const supp = suppliers.find((s) => String(s.id) === String(supplierId));
      if (supp && (supp.TrangThai === "Ngưng hoạt động" || supp.status === "inactive")) {
        const msg = "Nhà cung cấp đã ngưng hoạt động, không thể tạo phiếu nhập kho mới.";
        setMessage(msg);
        toast(msg);
        return;
      }
    }
    if (!isReceipt && invalid) {
      const msg = "Số lượng xuất không được vượt quá tồn kho hiện tại (trừ trường hợp Điều chỉnh kiểm kê thiếu).";
      setMessage(msg);
      toast(msg);
      return;
    }
    if (!isReceipt && reason === "Hủy hàng hỏng" && !note.trim()) {
      const msg = "Vui lòng nhập mô tả tình trạng hàng hỏng vào ô Ghi chú.";
      setMessage(msg);
      toast(msg);
      return;
    }

    setSubmitting(true);
    try {
      const record = draftRecord();
      const saved = await saveRecord(resource, record);
      const next = { ...record, ...(saved || {}), id: saved?.id || record.id };

      // Đồng bộ lại danh sách sản phẩm từ MongoDB sau khi nhập/xuất kho
      listRecords("products").then(setProducts).catch(() => {});
      setMessage(
        `Đã lưu ${isReceipt ? "phiếu nhập" : "phiếu xuất"} và cập nhật tồn kho.`
      );
      setVouchers((current) => [next, ...current.filter((item) => item.id !== next.id)]);
      setSelected([]);
      setPaidAmount(0);
      setPurchaseOrderId("");
      toast(`Đã lưu ${isReceipt ? "phiếu nhập kho" : "phiếu xuất kho"}`);
      setPreview(voucherModel(next));
    } catch (error) {
      toast(error.message || "Không lưu được phiếu");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="module-detail" aria-labelledby="doc-heading">
      <header className="document-header">
        <hgroup>
          <h1 id="doc-heading">
            <span className="brand-mark" aria-hidden="true" style={{ display: "inline-grid", width: 28, height: 28, fontSize: 10, borderRadius: 7, verticalAlign: "middle", marginRight: 8 }}>MB</span>
            {title} — Mẹ &amp; Bé
          </h1>
          <p>Lập chứng từ và cập nhật tồn kho theo nghiệp vụ.</p>
        </hgroup>
        <mark className={`status-pill ${invalid ? "danger" : ""}`}>
          {invalid ? "Phiếu chưa hợp lệ" : message ? "Đã lưu phiếu" : "Phiếu chưa lưu"}
        </mark>
      </header>

      {message && (
        <p className={`alert ${invalid ? "danger" : "success"}`} role="alert">
          {message}
        </p>
      )}

      <form onSubmit={submit} className="document-grid">
        <div className="stack">
          {/* Supplier / Reason section */}
          <section className="panel">
            <h2>{isReceipt ? "NHÀ CUNG CẤP" : "LÝ DO XUẤT KHO"}</h2>
            {isReceipt ? (
              <>
              <div className="field">
                <label htmlFor="supp-select" style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                  Nhà cung cấp <span className="required-star">*</span>
                </label>
                <select
                  id="supp-select"
                  value={supplierId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSupplierId(id);
                    const supplier = suppliers.find((item) => item.id === id);
                    if (supplier) {
                      setPersonName((current) => current || supplier.TenNCC);
                      setAddress((current) => current || supplier.DiaChi || "");
                    }
                    // Nếu PO đã chọn không thuộc nhà cung cấp mới, reset PO
                    if (purchaseOrderId) {
                      const currentPo = purchaseOrders.find((po) => po.id === purchaseOrderId || po._id === purchaseOrderId);
                      if (currentPo && String(currentPo.MaNCC) !== String(id)) {
                        setPurchaseOrderId("");
                      }
                    }
                  }}
                  required
                  aria-label="Chọn nhà cung cấp"
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((item) => {
                    const isInactive = item.TrangThai === "Ngưng hoạt động" || item.status === "inactive";
                    return (
                      <option value={item.id} key={item.id} disabled={isInactive}>
                        {item.TenNCC} · {item.SDT} {isInactive ? "(Đã ngưng hoạt động)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="field">
                <label htmlFor="purchase-order-select">
                  Đơn đặt hàng NCC <small style={{ fontWeight: 400, color: "var(--text-faint)" }}>(tự động nạp NCC &amp; mặt hàng)</small>
                </label>
                <select
                  id="purchase-order-select"
                  value={purchaseOrderId}
                  onChange={(event) => handleSelectPurchaseOrder(event.target.value)}
                >
                  <option value="">-- Không liên kết đơn đặt hàng --</option>
                  {purchaseOrders.map((order) => {
                    const orderSupplier = suppliers.find((s) => String(s.id) === String(order.MaNCC) || s.MaNCC === order.MaNCC);
                    return (
                      <option value={order.id} key={order.id}>
                        {order.MaDDH || order.id} · {order.NgayDat || "Chưa có ngày"} · {money.format(order.TongTien || 0)} {orderSupplier ? `(${orderSupplier.TenNCC})` : order.MaNCCCode ? `(${order.MaNCCCode})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              </>
            ) : (
              <>
                <div className="segmented-list" role="radiogroup" aria-label="Lý do xuất kho">
                  {[
                    { label: "Bán hàng", icon: "🛍️" },
                    { label: "Chuyển kho nội bộ", icon: "🔄" },
                    { label: "Hủy hàng hỏng", icon: "🗑️" },
                    { label: "Điều chỉnh kiểm kê thiếu", icon: "📋" },
                  ].map(({ label, icon }) => (
                    <button
                      className={reason === label ? "selected" : ""}
                      type="button"
                      onClick={() => setReason(label)}
                      key={label}
                      role="radio"
                      aria-checked={reason === label}
                    >
                      <span className="seg-icon">{icon}</span>
                      <span className="seg-label">{label}</span>
                    </button>
                  ))}
                </div>
                <label className="full-label">
                  Mô tả tình trạng / ghi chú
                  {reason === "Hủy hàng hỏng" && (
                    <span className="required-hint">* Bắt buộc khi hủy hàng</span>
                  )}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    required={reason === "Hủy hàng hỏng"}
                    placeholder="Ví dụ: sữa bị nháp hộp, hết hạn sử dụng, bao bì rách..."
                    rows={3}
                  />
                </label>
              </>
            )}
            <div className="form-grid" style={{ marginTop: 12 }}>
              <label className="field">
                <span>{isReceipt ? "Người giao hàng" : "Người nhận hàng"}</span>
                <input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder={isReceipt ? "Tên người giao" : "Tên người nhận"}
                />
              </label>
              <label className="field">
                <span>Địa chỉ (bộ phận)</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Địa chỉ hoặc bộ phận"
                />
              </label>
              <label className="field">
                <span>{isReceipt ? "Nhập tại kho" : "Xuất tại kho"}</span>
                <input
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Địa điểm</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
              <label className="field">
                <span>TK Nợ</span>
                <input value={debit} onChange={(e) => setDebit(e.target.value)} />
              </label>
              <label className="field">
                <span>TK Có</span>
                <input value={credit} onChange={(e) => setCredit(e.target.value)} />
              </label>
              <label className="field full">
                <span>Số chứng từ gốc kèm theo</span>
                <input
                  value={attachedDocs}
                  onChange={(e) => setAttachedDocs(e.target.value)}
                  placeholder="Hóa đơn, biên bản giao nhận..."
                />
              </label>
              <label className="field full">
                <span>Người lập phiếu (tự động theo tài khoản đăng nhập)</span>
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

          {/* Product details */}
          <section className="panel">
            <h2>CHI TIẾT HÀNG {isReceipt ? "NHẬP" : "XUẤT"}</h2>
            <div className="field">
              <select onChange={addProduct} defaultValue="" aria-label="Thêm sản phẩm">
                <option value="">+ Thêm sản phẩm</option>
                {products.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.MaSP} · {item.TenSP} · {Number(item.stock || 0) <= 0 ? "⛔ Hết hàng" : Number(item.stock || 0) <= LOW_STOCK_THRESHOLD ? `⚠️ Tồn ${item.stock}` : `✅ Tồn ${item.stock}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Mã hàng / Tên hàng</th>
                    <th scope="col">ĐVT</th>
                    <th scope="col">Tồn hiện tại</th>
                    <th scope="col">SL {isReceipt ? "nhập" : "xuất"}</th>
                    <th scope="col">{isReceipt ? "Đơn giá nhập" : "Đơn giá vốn"}</th>
                    <th scope="col">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((item) => (
                    <tr
                      className={
                        !isReceipt &&
                        item.quantity > item.stock &&
                        reason !== "Điều chỉnh kiểm kê thiếu"
                          ? "invalid-row"
                          : ""
                      }
                      key={item.id}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ProductImage src={item.HinhAnh} alt={item.TenSP} category={item.LoaiHang} size={36} />
                          <div>
                            <strong>{item.TenSP}</strong>
                            <span className="cell-note">{item.MaSP}</span>
                          </div>
                        </div>
                      </td>
                      <td>{item.DonViTinh}</td>
                      <td>
                        {Number(item.stock || 0) <= 0 ? (
                          <span className="stock-status-out">⛔ 0</span>
                        ) : Number(item.stock || 0) <= LOW_STOCK_THRESHOLD ? (
                          <span className="stock-status-low">⚠️ {item.stock}</span>
                        ) : (
                          <span className="stock-status-ok">✅ {item.stock}</span>
                        )}
                      </td>
                      <td>
                        <input
                          className="quantity-input"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, e.target.value)
                          }
                          aria-label={`Số lượng ${item.TenSP}`}
                        />
                      </td>
                      <td>{money.format(item.price || 0)}</td>
                      <td>
                        <strong>{money.format((item.quantity || 0) * (item.price || 0))}</strong>
                        <button
                          type="button"
                          className="remove-line"
                          onClick={() =>
                            setSelected((current) =>
                              current.filter((line) => line.id !== item.id)
                            )
                          }
                          aria-label={`Xóa ${item.TenSP}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!selected.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                        Thêm sản phẩm từ danh sách phía trên
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Summary sidebar */}
        <div className="stack">
          <aside className="summary-card">
            <h2>TỔNG KẾT PHIẾU {isReceipt ? "NHẬP" : "XUẤT"}</h2>
            <dl>
              <div>
                <dt>Số mặt hàng</dt>
                <dd>{selected.length}</dd>
              </div>
              <div>
                <dt>Tổng số lượng {isReceipt ? "nhập" : "xuất"}</dt>
                <dd>{quantity}</dd>
              </div>
            </dl>
            <div className="summary-total">
              <span>{isReceipt ? "Tổng tiền nhập" : "Tổng giá trị (giá vốn)"}</span>
              <strong className={invalid ? "text-danger" : ""}>
                {money.format(total)}
              </strong>
            </div>

            {isReceipt && total > 0 && (
              <div style={{ marginTop: 10, padding: "10px", background: "#f8fafc", borderRadius: 8, border: "1px solid var(--border)" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Thanh toán ngay cho NCC:
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    value={paidAmount || ""}
                    onChange={(e) => setPaidAmount(Math.min(total, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="0 ₫"
                    style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
                  />
                  {paidAmount > 0 && (
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12 }}
                    >
                      <option value="Tiền mặt">Tiền mặt</option>
                      <option value="Chuyển khoản">Chuyển khoản</option>
                    </select>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6, color: "var(--text-soft)" }}>
                  <span>Còn nợ NCC:</span>
                  <strong style={{ color: total - paidAmount > 0 ? "#dc2626" : "#16a34a" }}>
                    {money.format(Math.max(0, total - (Number(paidAmount) || 0)))}
                  </strong>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                className={`btn ${isReceipt ? "btn-primary" : "btn-accent"} btn-block`}
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Đang lưu..." : `Lưu phiếu ${isReceipt ? "nhập" : "xuất"}`}
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-label="Xem và in phiếu"
                onClick={() => openPreview(draftRecord("......"))}
              >
                <PrinterIcon className="ic" aria-hidden="true" />
              </button>
            </div>
          </aside>

          {/* Business notes */}
          <aside className="panel">
            <h2>GHI CHÚ NGHIỆP VỤ</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "12.5px", color: "var(--text-soft)" }}>
              {isReceipt ? (
                <>
                  <li>Sau khi lưu, hệ thống tự động cộng số lượng vào tồn kho.</li>
                  <li>Đơn giá nhập dùng để tính giá vốn, có thể khác giá bán.</li>
                  <li>Phiếu chỉ xác nhận khi đã chọn nhà cung cấp hợp lệ.</li>
                </>
              ) : (
                <>
                  <li><strong>Xuất quá số lượng:</strong> Phần lừa, lô đồ đông vượt tồn.</li>
                  <li><strong>Hàng hỏng:</strong> Bắt buộc mô tả tình trạng trước khi lưu.</li>
                  <li><strong>Kiểm kê thiếu:</strong> Ghi nhận chênh lệch không kiểm tra tồn.</li>
                </>
              )}
            </ul>
          </aside>
        </div>
      </form>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>PHIẾU ĐÃ LƯU — IN MẪU 0{isReceipt ? "1" : "2"}-VT ({filteredVouchers.length})</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 220, maxWidth: 320 }}>
              <label className="invoice-search" style={{ width: "100%", margin: 0 }}>
                <MagnifyingGlassIcon aria-hidden="true" />
                <input
                  type="search"
                  placeholder={isReceipt ? "Tìm mã PN, NCC, sản phẩm..." : "Tìm mã PX, sản phẩm..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>
            {isReceipt ? (
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
            ) : (
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
              >
                <option value="all">Tất cả lý do xuất</option>
                <option value="Bán hàng">Bán hàng</option>
                <option value="Chuyển kho nội bộ">Chuyển kho nội bộ</option>
                <option value="Hủy hàng hỏng">Hủy hàng hỏng</option>
                <option value="Điều chỉnh kiểm kê thiếu">Điều chỉnh kiểm kê thiếu</option>
              </select>
            )}
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
            {(filterSupplier !== "all" || filterReason !== "all" || fromDate || toDate || searchQuery) && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => { setFilterSupplier("all"); setFilterReason("all"); setFromDate(""); setToDate(""); setSearchQuery(""); }}
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
                <th scope="col">Số phiếu</th>
                <th scope="col">Ngày</th>
                <th scope="col">{isReceipt ? "Nhà cung cấp / người giao" : "Lý do xuất"}</th>
                <th scope="col" style={{ textAlign: "right" }}>Tổng SL</th>
                <th scope="col" style={{ textAlign: "right" }}>Tổng tiền</th>
                <th scope="col" style={{ textAlign: "center" }}>Trạng thái</th>
                <th scope="col" style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedVouchers.map((voucher) => {
                const supplier = suppliers.find(
                  (item) => item.id === voucher.MaNCC || item.id === voucher.supplierId
                );
                return (
                  <tr key={voucher.id}>
                    <td><span className="prod-code-badge">{voucher.MaPN || voucher.MaPX || voucher.id}</span></td>
                    <td>{voucher.NgayNhap || voucher.NgayXuat}</td>
                    <td>
                      {isReceipt
                        ? voucher.NguoiLienQuan || supplier?.TenNCC || "—"
                        : voucher.LyDoXuat || "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{voucher.SoLuong ?? (voucher.details || []).reduce((s, i) => s + (Number(i.SoLuong || i.quantity) || 0), 0)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money.format(voucher.TongTien || 0)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className="status-pill success">{voucher.TrangThai || "Đã lưu"}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="table-action"
                        type="button"
                        onClick={() => openPreview(voucher)}
                      >
                        Xem / In
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredVouchers.length && (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <EmptyState
                      icon={isReceipt ? ArchiveBoxArrowDownIcon : ArchiveBoxIcon}
                      title={`Không tìm thấy phiếu ${isReceipt ? "nhập" : "xuất"} kho`}
                      description={`Không có phiếu ${isReceipt ? "nhập" : "xuất"} kho nào phù hợp với bộ lọc tìm kiếm.`}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredVouchers.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={filteredVouchers.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </section>

      <Modal
        open={preview !== null}
        wide
        title={isReceipt ? "Phiếu nhập kho — Mẫu số 01-VT" : "Phiếu xuất kho — Mẫu số 02-VT"}
        onClose={() => setPreview(null)}
        onSubmit={() => {
          const frame = document.querySelector(".vt-preview-frame");
          if (frame?.contentWindow) {
            frame.contentWindow.focus();
            frame.contentWindow.print();
            return;
          }
          printWarehouseVoucher(preview);
        }}
        submitLabel="In phiếu"
      >
        {preview && (
          <iframe
            className="vt-preview-frame"
            title="Xem trước phiếu kho"
            srcDoc={buildWarehouseVoucherHtml(preview)}
          />
        )}
      </Modal>
    </section>
  );
}

/* ================================================================
   SALES PAGE (POS)
   ================================================================ */
const CATEGORY_ICONS = {
  "Sữa": "🍼",
  "Bỉm/tã": "👶",
  "Quần áo": "👕",
  "Đồ dùng": "🥣",
  "Đồ chơi": "🧸",
  "Chăm sóc": "🧴",
};

function getCategoryIcon(catName) {
  if (!catName) return "📦";
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (catName.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return "📦";
}

