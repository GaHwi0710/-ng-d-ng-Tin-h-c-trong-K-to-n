import { useState, useEffect, useMemo } from "react";
import {
  AdjustmentsVerticalIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PrinterIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { listRecords, postRequest, getRequest } from "../../lib/api.js";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import { StatusBadge } from "../../components/Badge.jsx";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { Modal } from "../../components/Modal.jsx";
import { currentUserInfo } from "../../lib/permissions.js";
import { getStoreConfig, getBrandLogoUrl } from "../../lib/storeConfig.js";

export function StocktakePage({ title }) {
  const [activeTab, setActiveTab] = useState("new"); // "new" | "list" | "adjustments"
  const [products, setProducts] = useState([]);
  const [stocktakes, setStocktakes] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [actual, setActual] = useState({});
  const [lineReasons, setLineReasons] = useState({});
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("Kiểm kê kho định kỳ");
  const [filterDiff, setFilterDiff] = useState("all"); // "all" | "diff" | "match"
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Modals
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [viewAdjustment, setViewAdjustment] = useState(null);

  const loadData = () => {
    setLoading(true);
    setLoadError("");
    Promise.allSettled([
      listRecords("inventory"),
      listRecords("stocktakes"),
      getRequest("inventory/adjustments"),
    ])
      .then(([prodRes, stRes, adjRes]) => {
        if (prodRes.status === "fulfilled") setProducts(prodRes.value);
        if (stRes.status === "fulfilled") setStocktakes(stRes.value);
        if (adjRes.status === "fulfilled") setAdjustments(adjRes.value);
        if (prodRes.status === "rejected") setLoadError("Không thể tải danh sách sản phẩm để kiểm kê.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    let match = 0;
    let deficit = 0;
    let surplus = 0;
    products.forEach((p) => {
      const sys = Number(p.stock ?? p.SoLuongTon ?? 0);
      const real = Number(actual[p.id] ?? sys);
      const diff = real - sys;
      if (diff === 0) match++;
      else if (diff < 0) deficit++;
      else surplus++;
    });
    return { total: products.length, match, deficit, surplus };
  }, [products, actual]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesText =
        !q ||
        (p.TenSP || "").toLowerCase().includes(q) ||
        (p.MaSP || p.id || "").toLowerCase().includes(q) ||
        (p.LoaiHang || "").toLowerCase().includes(q);
      if (!matchesText) return false;

      const sys = Number(p.stock ?? p.SoLuongTon ?? 0);
      const real = Number(actual[p.id] ?? sys);
      const diff = real - sys;

      if (filterDiff === "diff" && diff === 0) return false;
      if (filterDiff === "match" && diff !== 0) return false;

      return true;
    });
  }, [products, query, actual, filterDiff]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query, filterDiff, activeTab]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  // Lưu phiếu kiểm kê (KHÔNG tự động cập nhật tồn kho)
  async function submitStocktake() {
    try {
      if (!products || !products.length) {
        toast("Danh sách sản phẩm trống hoặc chưa tải xong. Vui lòng thử lại!");
        return;
      }
      const items = products.map((product) => {
        const prodId = product.id || product._id || product.MaSP;
        const sys = Number(product.stock ?? product.SoLuongTon ?? 0);
        const userVal = actual[product.id] ?? actual[product._id] ?? actual[prodId];
        const act = userVal !== undefined && userVal !== "" ? Number(userVal) : sys;
        return {
          productId: prodId,
          actual: Math.max(0, Math.round(Number.isNaN(act) ? sys : act)),
          reason: lineReasons[product.id] || lineReasons[product._id] || lineReasons[prodId] || "",
        };
      });

      const res = await postRequest("stocktakes", {
        note: note || "Kiểm kê định kỳ",
        NgayKiemKe: new Date().toISOString().slice(0, 10),
        items,
      });

      toast(
        res.message ||
          "Đã lưu kết quả kiểm kê. Tồn kho chưa bị thay đổi cho đến khi bạn xác nhận điều chỉnh."
      );
      loadData();
      setActiveTab("list");
    } catch (error) {
      console.error("Stocktake error:", error);
      toast(error.message || "Lỗi khi lưu phiếu kiểm kê");
    }
  }

  // Mở modal xác nhận điều chỉnh tồn kho cho 1 phiếu kiểm kê
  function openAdjustModal(record) {
    setAdjustModal(record);
    setAdjustReason(`Điều chỉnh tồn kho theo phiếu kiểm kê ${record.MaKK || record.id}`);
  }

  // Xác nhận cập nhật tồn kho
  async function handleConfirmAdjust() {
    if (!adjustModal) return;
    setAdjusting(true);
    try {
      const res = await postRequest(`stocktakes/${adjustModal.id || adjustModal._id}/adjust`, {
        reason: adjustReason || `Điều chỉnh tồn kho theo phiếu kiểm kê ${adjustModal.MaKK}`,
      });
      toast(res.message || "Đã xác nhận điều chỉnh tồn kho thành công!");
      setAdjustModal(null);
      loadData();
      setActiveTab("adjustments");
    } catch (error) {
      toast(error.message || "Lỗi khi điều chỉnh tồn kho");
    } finally {
      setAdjusting(false);
    }
  }

  function printStocktake(record) {
    const printWindow = window.open("", "_blank", "width=880,height=920");
    if (!printWindow) return;
    const escapeHtml = (val) =>
      String(val ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
    const code = record.MaKK || record.id;
    const dateStr = record.NgayKiemKe || new Date(record.createdAt || Date.now()).toLocaleDateString("vi-VN");
    const store = getStoreConfig();

    const lines = (record.details || []).map((line, index) => {
      const diff = Number(line.ChenhLech || 0);
      const diffColor = diff < 0 ? "#DC2626" : diff > 0 ? "#059669" : "#64748B";
      const diffText = diff > 0 ? `+${diff}` : String(diff);
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td><strong>${escapeHtml(line.TenSP || "Sản phẩm")}</strong>${line.MaSPCode || line.MaSP ? ` <span style="color:#64748b">(${escapeHtml(line.MaSPCode || line.MaSP)})</span>` : ""}</td>
          <td class="center">${escapeHtml(line.DonViTinh || "Cái")}</td>
          <td class="center"><strong>${Number(line.SoLuongThucTe || 0)}</strong></td>
          <td class="center">${Number(line.SoLuongHeThong || 0)}</td>
          <td class="center" style="font-weight:700;color:${diffColor}">${diffText}</td>
          <td>${escapeHtml(line.LyDo || "—")}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Phiếu kiểm kê tồn kho - ${escapeHtml(code)}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #fff;
      font-size: 13px;
      line-height: 1.4;
    }
    .doc-container {
      max-width: 195mm;
      margin: 0 auto;
      padding: 6mm 4mm;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .brand-left h2 { font-size: 17px; font-weight: 700; color: #0F172A; }
    .brand-meta { font-size: 11.5px; color: #64748B; margin-top: 4px; }
    .meta-right { text-align: right; font-size: 12px; color: #334155; }
    .doc-title-row { text-align: center; margin: 16px 0 18px; }
    .doc-title { font-size: 19px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-subtitle { font-size: 12px; color: #64748B; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #E2E8F0; padding: 7px 9px; vertical-align: middle; }
    th { background: #F8FAFC; font-weight: 700; color: #334155; }
    .center { text-align: center; }
    .right { text-align: right; }
    .signatures-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 28px;
      text-align: center;
    }
    .sig-title { font-weight: 700; font-size: 12.5px; color: #0F172A; }
    .sig-sub { font-size: 11px; color: #64748B; font-style: italic; }
    .sig-space { height: 50px; }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="doc-header">
      <div class="brand-left">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${getBrandLogoUrl()}" alt="Logo Mẹ & Bé" style="width:38px;height:38px;object-fit:contain;" onerror="this.style.display='none'" />
          <div>
            <h2 style="margin:0;font-size:16px;">${escapeHtml(store.brandName || store.name || "CỬA HÀNG MẸ & BÉ")}</h2>
            <div class="brand-meta" style="margin-top:2px;font-size:11px;line-height:1.4;">
              <div>📍 <strong>Địa chỉ:</strong> ${escapeHtml(store.address)}</div>
              <div>☎ <strong>Hotline:</strong> ${escapeHtml(store.hotline || store.phone)} | ✉ <strong>Email:</strong> ${escapeHtml(store.email)} | 🌐 <strong>Website:</strong> ${escapeHtml(store.website || "www.cuahangmebe.vn")}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="meta-right">
        <div><strong>Mã phiếu:</strong> ${escapeHtml(code)}</div>
        <div><strong>Ngày kiểm:</strong> ${escapeHtml(dateStr)}</div>
        <div><strong>Trạng thái:</strong> ${escapeHtml(record.TrangThai || "Chờ xử lý")}</div>
      </div>
    </div>

    <div class="doc-title-row">
      <div class="doc-title">BIÊN BẢN KIỂM KÊ TỒN KHO</div>
      <div class="doc-subtitle">(Đối chiếu số lượng tồn hệ thống với số lượng thực tế kiểm kê tại kho)</div>
    </div>

    <div style="font-size: 12px; margin-bottom: 8px;">
      <strong>Người kiểm kê:</strong> ${escapeHtml(record.NguoiLap || "Thủ kho")} &nbsp;&nbsp;|&nbsp;&nbsp;
      <strong>Ghi chú đợt kiểm:</strong> ${escapeHtml(record.GhiChu || "Kiểm kê định kỳ")}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px" class="center">STT</th>
          <th>Tên sản phẩm</th>
          <th style="width: 60px" class="center">ĐVT</th>
          <th style="width: 75px" class="center">Tồn thực tế</th>
          <th style="width: 75px" class="center">Tồn hệ thống</th>
          <th style="width: 75px" class="center">Chênh lệch</th>
          <th>Ghi chú lý do</th>
        </tr>
      </thead>
      <tbody>
        ${lines}
      </tbody>
    </table>

    <div class="signatures-row">
      <div>
        <div class="sig-title">Người kiểm kê</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
        <small>${escapeHtml(record.NguoiLap || "Thủ kho")}</small>
      </div>
      <div>
        <div class="sig-title">Thủ kho</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
      <div>
        <div class="sig-title">Kế toán kho / Quản lý</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
    </div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  }

  return (
    <section aria-labelledby="stocktake-heading" className="module-specialized stocktake-page">
      <header className="page-header">
        <hgroup>
          <h1 id="stocktake-heading">{title}</h1>
          <p>Đối chiếu tồn kho hệ thống với thực tế và xác nhận điều chỉnh tồn kho.</p>
        </hgroup>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 13,
              color: "#475569",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#E2E8F0",
                color: "#334155",
              }}
            >
              <UserIcon style={{ width: 13, height: 13 }} />
            </span>
            <span>Người kiểm:</span>
            <strong style={{ color: "#0F172A", fontWeight: 600 }}>{currentUserInfo().display}</strong>
          </div>
          {activeTab === "new" && (
            <button className="btn btn-primary" type="button" onClick={submitStocktake}>
              <CheckCircleIcon className="btn-icon" aria-hidden="true" />
              Lưu kết quả kiểm kê
            </button>
          )}
        </div>
      </header>

      {/* Tab Switcher: Kiểm kê mới vs Phiếu đã lưu vs Nhật ký điều chỉnh */}
      <div style={{ display: "flex", gap: 10, margin: "14px 0 16px", borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            border: activeTab === "new" ? "2px solid var(--primary, #3d7068)" : "1px solid var(--border, #cbd5e1)",
            background: activeTab === "new" ? "var(--primary-light, #e6f4f1)" : "#fff",
            color: activeTab === "new" ? "var(--primary-dark, #1f433e)" : "var(--text, #334155)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          <ClipboardDocumentCheckIcon style={{ width: 17, height: 17 }} />
          <span>Kiểm kê kho mới</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("list")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            border: activeTab === "list" ? "2px solid var(--primary, #3d7068)" : "1px solid var(--border, #cbd5e1)",
            background: activeTab === "list" ? "var(--primary-light, #e6f4f1)" : "#fff",
            color: activeTab === "list" ? "var(--primary-dark, #1f433e)" : "var(--text, #334155)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          <ArchiveBoxIcon style={{ width: 17, height: 17 }} />
          <span>Danh sách phiếu kiểm kê ({stocktakes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("adjustments")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 8,
            border: activeTab === "adjustments" ? "2px solid var(--primary, #3d7068)" : "1px solid var(--border, #cbd5e1)",
            background: activeTab === "adjustments" ? "var(--primary-light, #e6f4f1)" : "#fff",
            color: activeTab === "adjustments" ? "var(--primary-dark, #1f433e)" : "var(--text, #334155)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          <AdjustmentsVerticalIcon style={{ width: 17, height: 17 }} />
          <span>Lịch sử điều chỉnh tồn kho</span>
          <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: 11, background: activeTab === "adjustments" ? "var(--primary)" : "#e2e8f0", color: activeTab === "adjustments" ? "#fff" : "#475569" }}>
            {adjustments.length}
          </span>
        </button>
      </div>

      {loading && <p style={{ color: "var(--text-faint)", padding: "16px 0" }}>⏳ Đang tải dữ liệu kiểm kê...</p>}
      {loadError && <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>⚠️ {loadError}</div>}

      {/* ============================================================== */}
      {/* TAB 1: KIỂM KÊ KHO MỚI                                         */}
      {/* ============================================================== */}
      {activeTab === "new" && (
        <>
          {/* Discrepancy stats */}
          <div className="stats-grid">
            <StatCard
              label="Mặt hàng cần kiểm"
              value={String(stats.total)}
              delta={`${stats.match} khớp tồn hoàn toàn`}
              icon={CubeIcon}
            />
            <StatCard
              label="Lệch âm (Hao hụt / Thiếu)"
              value={String(stats.deficit)}
              delta="Thực tế ít hơn hệ thống"
              valueClass="danger"
              icon={ExclamationTriangleIcon}
            />
            <StatCard
              label="Lệch dương (Thừa hàng)"
              value={String(stats.surplus)}
              delta="Thực tế nhiều hơn hệ thống"
              valueClass="positive"
            />
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", margin: "14px 0" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              Ghi chú đợt kiểm kê:
              <input
                type="text"
                style={{ marginLeft: 10, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", width: "60%", fontSize: 13 }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Kiểm kê định kỳ tháng 9, kiểm kho sữa..."
              />
            </label>
          </div>

          {/* Toolbar */}
          <div className="inventory-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
            <div className="invoice-search" style={{ flex: 1, minWidth: 260, maxWidth: 440 }}>
              <MagnifyingGlassIcon aria-hidden="true" />
              <input
                type="search"
                placeholder="Tìm theo tên sản phẩm, mã SKU..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${filterDiff === "all" ? "active" : ""}`}
                onClick={() => setFilterDiff("all")}
              >
                Tất cả ({products.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${filterDiff === "diff" ? "active" : ""}`}
                onClick={() => setFilterDiff("diff")}
              >
                Có chênh lệch ({stats.deficit + stats.surplus})
              </button>
              <button
                type="button"
                className={`filter-chip ${filterDiff === "match" ? "active" : ""}`}
                onClick={() => setFilterDiff("match")}
              >
                Khớp tồn ({stats.match})
              </button>
            </div>
          </div>

          <div className="table-shell" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45 }}>STT</th>
                  <th>Mã &amp; Tên sản phẩm</th>
                  <th style={{ width: 80, textAlign: "center" }}>ĐVT</th>
                  <th style={{ width: 120, textAlign: "right" }}>Tồn hệ thống</th>
                  <th style={{ width: 160, textAlign: "center" }}>Số lượng thực tế</th>
                  <th style={{ width: 120, textAlign: "center" }}>Chênh lệch</th>
                  <th>Ghi chú lý do lệch</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((product, idx) => {
                  const sys = Number(product.stock ?? product.SoLuongTon ?? 0);
                  const real = Number(actual[product.id] ?? sys);
                  const diff = real - sys;
                  return (
                    <tr key={product.id} className="stocktake-row">
                      <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ProductImage src={product.HinhAnh} alt={product.TenSP} category={product.LoaiHang} size={36} />
                          <div>
                            <strong className="cust-name">{product.TenSP}</strong>
                            <span className="prod-code-badge" style={{ marginTop: 2, display: "inline-block" }}>{product.MaSP || product.id}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", color: "var(--text-soft)" }}>{product.DonViTinh}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {sys.toLocaleString("vi-VN")} {product.DonViTinh}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => setActual((curr) => ({ ...curr, [product.id]: Math.max(0, real - 1) }))}
                          >
                            −
                          </button>
                          <input
                            className="po-num-input"
                            style={{ width: 75, textAlign: "center", fontWeight: 700 }}
                            type="number"
                            min="0"
                            value={actual[product.id] ?? sys}
                            onChange={(e) =>
                              setActual((current) => ({
                                ...current,
                                [product.id]: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            aria-label={`Số lượng thực tế ${product.TenSP}`}
                          />
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => setActual((curr) => ({ ...curr, [product.id]: real + 1 }))}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`diff-pill ${
                            diff < 0
                              ? "diff-neg"
                              : diff > 0
                              ? "diff-pos"
                              : "diff-zero"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td>
                        {diff !== 0 && (
                          <input
                            type="text"
                            placeholder="Lý do lệch (VD: Rách bao bì, đếm nhầm...)"
                            value={lineReasons[product.id] || ""}
                            onChange={(e) => setLineReasons((curr) => ({ ...curr, [product.id]: e.target.value }))}
                            style={{ width: "100%", padding: "4px 8px", fontSize: 12, borderRadius: 4, border: "1px solid var(--border)" }}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!filteredProducts.length && !loading && (
                  <tr>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <EmptyState
                        icon={CubeIcon}
                        title="Không tìm thấy sản phẩm"
                        description={`Không có mặt hàng nào khớp với tìm kiếm.`}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredProducts.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={filteredProducts.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}

          <div style={{ marginTop: 20, textAlign: "right" }}>
            <button className="btn btn-primary btn-lg" type="button" onClick={submitStocktake}>
              <CheckCircleIcon className="btn-icon" aria-hidden="true" />
              Lưu kết quả kiểm kê
            </button>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DANH SÁCH PHIẾU KIỂM KÊ                                 */}
      {/* ============================================================== */}
      {activeTab === "list" && (
        <section className="panel" style={{ marginTop: 8 }}>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45 }}>STT</th>
                  <th>Mã phiếu</th>
                  <th>Ngày kiểm kê</th>
                  <th>Người lập</th>
                  <th>Số mặt hàng</th>
                  <th>Số mục lệch</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 220, textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {stocktakes.map((record, idx) => {
                  const details = record.details || record.items || [];
                  const diffCount = details.filter((l) => Number(l.ChenhLech) !== 0).length;
                  const isAdjusted = record.TrangThai === "Đã điều chỉnh";
                  const canAdjust = !isAdjusted && diffCount > 0;

                  return (
                    <tr key={record.id}>
                      <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                      <td><strong>{record.MaKK || record.id}</strong></td>
                      <td>{record.NgayKiemKe || (record.createdAt ? String(record.createdAt).slice(0, 10) : "—")}</td>
                      <td><span style={{ fontWeight: 600, color: "var(--text-soft)" }}>{record.NguoiLap || "Thủ kho"}</span></td>
                      <td>{details.length} mặt hàng</td>
                      <td>
                        <span style={{ color: diffCount > 0 ? "var(--warn)" : "var(--success)", fontWeight: 600 }}>
                          {diffCount > 0 ? `⚠️ ${diffCount} mục lệch` : "✅ Khớp hoàn toàn"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={record.TrangThai || (diffCount > 0 ? "Chờ điều chỉnh" : "Khớp hoàn toàn")} />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button className="btn btn-outline btn-sm" type="button" onClick={() => printStocktake(record)}>
                            <PrinterIcon className="btn-icon" aria-hidden="true" /> In phiếu
                          </button>
                          {canAdjust && (
                            <button
                              className="btn btn-primary btn-sm"
                              type="button"
                              onClick={() => openAdjustModal(record)}
                              title="Xác nhận cập nhật tồn kho theo phiếu này"
                            >
                              <AdjustmentsVerticalIcon className="btn-icon" aria-hidden="true" /> Điều chỉnh kho
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!stocktakes.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--text-faint)", padding: 28 }}>
                      Chưa có phiếu kiểm kê nào được lưu trong hệ thống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LỊCH SỬ ĐIỀU CHỈNH TỒN KHO                              */}
      {/* ============================================================== */}
      {activeTab === "adjustments" && (
        <section className="panel" style={{ marginTop: 8 }}>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45 }}>STT</th>
                  <th>Mã điều chỉnh</th>
                  <th>Phiếu kiểm kê liên quan</th>
                  <th>Ngày điều chỉnh</th>
                  <th>Người thực hiện</th>
                  <th>Lý do điều chỉnh</th>
                  <th>Số mặt hàng lệch</th>
                  <th style={{ width: 110, textAlign: "center" }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj, idx) => {
                  const details = adj.details || [];
                  const diffCount = details.filter((l) => Number(l.ChenhLech) !== 0).length;
                  return (
                    <tr key={adj.id || adj._id}>
                      <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                      <td><span className="prod-code-badge">{adj.MaDC || adj.id}</span></td>
                      <td><strong>{adj.MaKK || "Trực tiếp"}</strong></td>
                      <td>{adj.NgayDieuChinh || (adj.createdAt ? String(adj.createdAt).slice(0, 10) : "—")}</td>
                      <td><strong>{adj.NguoiThucHien || "Thủ kho"}</strong></td>
                      <td>{adj.LyDo || "Điều chỉnh tồn kho"}</td>
                      <td>
                        <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                          {diffCount} mặt hàng
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          type="button"
                          onClick={() => setViewAdjustment(adj)}
                        >
                          <EyeIcon className="btn-icon" aria-hidden="true" /> Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!adjustments.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--text-faint)", padding: 28 }}>
                      Chưa có đợt điều chỉnh tồn kho nào được xác nhận.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* MODAL: XÁC NHẬN ĐIỀU CHỈNH TỒN KHO                             */}
      {/* ============================================================== */}
      <Modal
        open={adjustModal !== null}
        title={`Xác nhận điều chỉnh tồn kho · ${adjustModal?.MaKK || adjustModal?.id || ""}`}
        subtitle="Hệ thống sẽ cập nhật lại số lượng tồn kho theo số lượng thực tế đã kiểm kê"
        onClose={() => setAdjustModal(null)}
        onSubmit={handleConfirmAdjust}
        submitLabel={adjusting ? "Đang cập nhật..." : "Xác nhận cập nhật tồn kho"}
        submitDisabled={adjusting}
        wide
      >
        {adjustModal && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="alert warning" style={{ margin: 0 }}>
              ⚠️ Bạn đang chuẩn bị cập nhật tồn kho theo phiếu kiểm kê <strong>{adjustModal.MaKK}</strong>.
              Tồn kho của các mặt hàng sau sẽ được ghi đè bằng số lượng thực tế. Thao tác này sẽ được ghi vào nhật ký kiểm toán.
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 600 }}>
              Lý do điều chỉnh tồn kho:
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
                placeholder="Nhập lý do điều chỉnh..."
              />
            </label>

            <div className="table-shell" style={{ maxHeight: 260, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th style={{ width: 60, textAlign: "center" }}>ĐVT</th>
                    <th style={{ width: 100, textAlign: "right" }}>Tồn trước</th>
                    <th style={{ width: 100, textAlign: "center" }}>Tồn sau (Thực tế)</th>
                    <th style={{ width: 100, textAlign: "center" }}>Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {(adjustModal.details || adjustModal.items || [])
                    .filter((line) => Number(line.ChenhLech) !== 0)
                    .map((line, i) => {
                      const diff = Number(line.ChenhLech || 0);
                      return (
                        <tr key={i}>
                          <td><strong>{line.TenSP || line.MaSPCode || line.MaSP}</strong></td>
                          <td style={{ textAlign: "center" }}>{line.DonViTinh || "Cái"}</td>
                          <td style={{ textAlign: "right" }}>{line.SoLuongHeThong}</td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{line.SoLuongThucTe}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`diff-pill ${diff < 0 ? "diff-neg" : "diff-pos"}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================== */}
      {/* MODAL: XEM CHI TIẾT ĐỢT ĐIỀU CHỈNH TỒN KHO                     */}
      {/* ============================================================== */}
      <Modal
        open={viewAdjustment !== null}
        title={`Chi tiết đợt điều chỉnh · ${viewAdjustment?.MaDC || viewAdjustment?.id || ""}`}
        subtitle={`Theo phiếu kiểm kê: ${viewAdjustment?.MaKK || "—"} · Người thực hiện: ${viewAdjustment?.NguoiThucHien || "Thủ kho"}`}
        onClose={() => setViewAdjustment(null)}
        onSubmit={() => setViewAdjustment(null)}
        submitLabel="Đóng"
        cancelLabel=""
        wide
      >
        {viewAdjustment && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
              <strong>Lý do:</strong> {viewAdjustment.LyDo || "Điều chỉnh tồn kho"} · <strong>Ngày:</strong> {viewAdjustment.NgayDieuChinh}
            </div>

            <div className="table-shell" style={{ maxHeight: 320, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>STT</th>
                    <th>Tên sản phẩm</th>
                    <th style={{ width: 60, textAlign: "center" }}>ĐVT</th>
                    <th style={{ width: 100, textAlign: "right" }}>Tồn trước</th>
                    <th style={{ width: 100, textAlign: "center" }}>Tồn sau</th>
                    <th style={{ width: 100, textAlign: "center" }}>Chênh lệch</th>
                    <th>Lý do mục lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewAdjustment.details || []).map((line, i) => {
                    const diff = Number(line.ChenhLech || 0);
                    return (
                      <tr key={i}>
                        <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{i + 1}</td>
                        <td><strong>{line.TenSP || line.MaSPCode || line.MaSP}</strong></td>
                        <td style={{ textAlign: "center" }}>{line.DonViTinh || "Cái"}</td>
                        <td style={{ textAlign: "right" }}>{line.TonTruoc}</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{line.TonSau}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`diff-pill ${diff < 0 ? "diff-neg" : diff > 0 ? "diff-pos" : "diff-zero"}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td>{line.LyDo || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}