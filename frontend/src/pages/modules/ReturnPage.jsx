import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  CubeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { StatusBadge } from "../../components/Badge.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function ReturnPage({ title }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [orderId, setOrderId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Lỗi bao bì/hỏng");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    listRecords("products").then(setProducts);
    listRecords("sales-orders").then(setOrders);
    listRecords("customers").then(setCustomers);
    listRecords("returns").then(setReturns);
  }, []);

  const selectedOrder = orders.find((order) => order.id === orderId);
  // Nếu có đơn → lọc sản phẩm theo đơn; không có đơn → tất cả sản phẩm đang bán
  const orderProductIds = new Set(
    (selectedOrder?.details || selectedOrder?.items || []).map((line) =>
      String(line.MaSP || line.productId)
    )
  );
  const availableProducts = orderId
    ? products.filter(
        (p) => orderProductIds.has(String(p.id)) || orderProductIds.has(String(p.MaSP))
      )
    : products.filter((p) => p.TrangThai !== "Ngừng bán");
  const selectedProduct = products.find((p) => p.id === productId);

  // Khi đổi đơn hàng → tự điền khách hàng và reset sản phẩm
  function handleOrderChange(newOrderId) {
    setOrderId(newOrderId);
    setProductId("");
    if (newOrderId) {
      const ord = orders.find((o) => o.id === newOrderId);
      const khId = ord?.MaKH || ord?.customerId || "";
      setCustomerId(String(khId));
    } else {
      setCustomerId("");
    }
  }

  const stats = useMemo(() => {
    const total = returns.length;
    const totalUnits = returns.reduce(
      (sum, r) =>
        sum +
        (Number(r.SoLuong) ||
          r.details?.reduce((s, d) => s + Number(d.SoLuong || 0), 0) ||
          0),
      0
    );
    return { total, totalUnits };
  }, [returns]);

  const visibleReturns = useMemo(() => {
    const q = query.toLowerCase();
    return returns.filter((r) => {
      if (!q) return true;
      return (
        (r.MaPTH || r.id || "").toLowerCase().includes(q) ||
        (r.LyDo || r.reason || "").toLowerCase().includes(q) ||
        (r.MaDH || "").toLowerCase().includes(q)
      );
    });
  }, [returns, query]);

  function resetForm() {
    setOrderId("");
    setCustomerId("");
    setProductId("");
    setQuantity(1);
    setReason("Lỗi bao bì/hỏng");
    setReturnDate(new Date().toISOString().slice(0, 10));
  }

  async function submit() {
    if (!productId || !reason.trim()) {
      toast("Vui lòng chọn sản phẩm và nhập lý do");
      return;
    }
    try {
      const product = products.find(
        (p) => String(p.id) === String(productId) || String(p.MaSP) === String(productId)
      );
      const payload = {
        items: [
          {
            productId: product?.id || productId,
            MaSP: product?.MaSP || productId,
            id: product?.id || productId,
            quantity: Number(quantity),
            SoLuong: Number(quantity),
            price: Number(product?.GiaBan || product?.GiaNhap || 0),
            DonGia: Number(product?.GiaBan || product?.GiaNhap || 0),
          },
        ],
        // Đơn hàng tuỳ chọn
        ...(orderId
          ? { orderId: selectedOrder?.id || orderId, MaDH: selectedOrder?.MaDH || orderId }
          : {}),
        // Khách hàng tuỳ chọn
        ...(customerId ? { customerId, MaKH: customerId } : {}),
        reason,
        LyDo: reason,
        NgayTra: returnDate,
        TrangThai: "Đã xử lý",
      };
      const record = await saveRecord("returns", payload);
      setReturns((current) => [...current, record]);
      setModalOpen(false);
      resetForm();
      toast("Đã ghi nhận trả hàng và cập nhật cộng lại tồn kho");
    } catch (error) {
      toast(error.message);
    }
  }

  return (
    <section aria-labelledby="return-heading" className="module-specialized return-page">
      <header className="page-header">
        <hgroup>
          <h1 id="return-heading">{title}</h1>
          <p>Ghi nhận hàng đổi trả từ khách hàng, xử lý lý do và tự động hoàn trả số lượng vào kho.</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={() => setModalOpen(true)}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Tạo phiếu trả hàng
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng phiếu trả hàng"
          value={String(stats.total)}
          delta="Đã hoàn tất xử lý"
          icon={CubeIcon}
        />
        <StatCard
          label="Số lượng sản phẩm trả"
          value={String(stats.totalUnits)}
          delta="Đã nhập lại kho"
          valueClass="warning"
        />
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar" style={{ marginTop: 14 }}>
        <div className="invoice-search" style={{ flex: 1, maxWidth: 440 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo mã phiếu trả, mã đơn hoặc lý do..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>STT</th>
              <th style={{ width: 110 }}>Mã PTH</th>
              <th>Đơn hàng &amp; Khách hàng</th>
              <th>Sản phẩm hoàn trả</th>
              <th style={{ width: 100, textAlign: "center" }}>Số lượng</th>
              <th>Lý do đổi trả</th>
              <th style={{ width: 110 }}>Ngày trả</th>
              <th style={{ width: 120, textAlign: "center" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {visibleReturns.map((r, idx) => {
              const custName =
                r.MaKHCode ||
                customers.find((c) => String(c.id) === String(r.MaKH))?.HoTen ||
                "Khách lẻ";
              const prodName =
                r.details
                  ?.map(
                    (line) =>
                      line.TenSP ||
                      products.find((p) => String(p.id) === String(line.MaSP))?.TenSP ||
                      line.MaSPCode
                  )
                  .join(", ") ||
                products.find((p) => String(p.id) === String(r.productId))?.TenSP ||
                "Sản phẩm";
              const qty =
                r.SoLuong ||
                r.quantity ||
                r.details?.reduce((sum, line) => sum + Number(line.SoLuong || line.quantity || 0), 0) ||
                1;

              return (
                <tr key={r.id}>
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <span className="prod-code-badge">{r.MaPTH || r.id}</span>
                  </td>
                  <td>
                    <div>
                      <strong className="cust-name">
                        {r.MaDHCode || r.MaDH || "Trả hàng trực tiếp"}
                      </strong>
                      <small className="cell-note">{custName}</small>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: "var(--primary-dark)" }}>{prodName}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="badge badge-amber" style={{ fontWeight: 700 }}>
                      {qty} cái
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--danger)", fontSize: 13 }}>
                      {r.LyDo || r.reason || "—"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-soft)", fontSize: 13 }}>{r.NgayTra}</td>
                  <td style={{ textAlign: "center" }}>
                    <StatusBadge status={r.TrangThai} />
                  </td>
                </tr>
              );
            })}
            {!visibleReturns.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  Chưa có phiếu trả hàng nào phù hợp
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        title="Tạo phiếu trả hàng"
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        onSubmit={submit}
      >
        {/* Đơn hàng gốc — tuỳ chọn */}
        <div className="field">
          <label htmlFor="rt-order">
            Đơn hàng gốc{" "}
            <small style={{ color: "var(--text-faint)" }}>(tuỳ chọn)</small>
          </label>
          <select id="rt-order" value={orderId} onChange={(e) => handleOrderChange(e.target.value)}>
            <option value="">-- Không liên kết đơn (trả trực tiếp) --</option>
            {orders.map((order) => (
              <option value={order.id} key={order.id}>
                {order.MaDH || order.id} · {order.NgayDat} ·{" "}
                {customers.find(
                  (c) => String(c.id) === String(order.MaKH || order.customerId)
                )?.HoTen || "Khách lẻ"}
              </option>
            ))}
          </select>
        </div>

        {/* Khách hàng — tuỳ chọn, tự điền nếu có đơn */}
        <div className="field">
          <label htmlFor="rt-cust">
            Khách hàng{" "}
            <small style={{ color: "var(--text-faint)" }}>(tuỳ chọn)</small>
          </label>
          <select
            id="rt-cust"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            disabled={!!orderId}
          >
            <option value="">-- Khách lẻ / không xác định --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.MaKH} · {c.HoTen} ({c.SDT})
              </option>
            ))}
          </select>
        </div>

        {/* Sản phẩm */}
        <div className="field">
          <label htmlFor="rt-prod">Sản phẩm khách trả *</label>
          <select
            id="rt-prod"
            value={productId}
            required
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">-- Chọn sản phẩm --</option>
            {availableProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.MaSP} · {p.TenSP} ({money.format(p.GiaBan || 0)})
              </option>
            ))}
          </select>
          {!orderId && (
            <small style={{ color: "var(--text-faint)", marginTop: 4, display: "block" }}>
              Hiển thị tất cả sản phẩm đang bán. Chọn đơn hàng để lọc theo đơn.
            </small>
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="rt-qty">Số lượng trả</label>
            <input
              id="rt-qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="rt-reason">Lý do hoàn trả</label>
            <select
              id="rt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Lỗi bao bì/hỏng">Lỗi bao bì / bể vỡ</option>
              <option value="Hết hạn sử dụng">Hạn sử dụng cận</option>
              <option value="Khách đổi ý/sai size">Khách đổi ý / nhầm size</option>
              <option value="Sản phẩm lỗi kỹ thuật">Lỗi kỹ thuật nhà sản xuất</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="rt-date">Ngày trả hàng</label>
          <input
            id="rt-date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>

        {selectedProduct && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--text-soft)" }}>
            Giá trị hoàn trả dự kiến:{" "}
            <strong style={{ color: "var(--danger)" }}>
              {money.format((selectedProduct.GiaBan || selectedProduct.GiaNhap || 0) * quantity)}
            </strong>
          </p>
        )}
      </Modal>
    </section>
  );
}