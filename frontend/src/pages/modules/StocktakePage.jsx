import { useState, useEffect, useMemo } from "react";
import {
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord } from "../../lib/api.js";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";

function currentUserInfo() {
  try {
    const raw = localStorage.getItem("token");
    if (!raw) return { name: "Quản trị viên", role: "admin", display: "Quản trị viên (Admin)" };
    const parts = raw.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      const roleMap = { admin: "Admin", accountant: "Kế toán", sales: "Thu ngân / Bán hàng", warehouse: "Thủ kho" };
      return {
        name: payload.HoTen || payload.Username || "Người dùng",
        role: payload.Role || "user",
        display: `${payload.HoTen || payload.Username || "Người dùng"} (${roleMap[payload.Role] || payload.Role || "Nhân viên"})`,
      };
    }
  } catch {}
  return { name: "Quản trị viên", role: "admin", display: "Quản trị viên (Admin)" };
}

export function StocktakePage({ title }) {
  const [products, setProducts] = useState([]);
  const [stocktakes, setStocktakes] = useState([]);
  const [actual, setActual] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    Promise.allSettled([
      listRecords("products"),
      listRecords("stocktakes"),
    ]).then(([prodRes, stRes]) => {
      if (prodRes.status === "fulfilled") setProducts(prodRes.value);
      if (stRes.status === "fulfilled") setStocktakes(stRes.value);
      if (prodRes.status === "rejected") setLoadError("Không thể tải danh sách sản phẩm để kiểm kê.");
    }).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    let match = 0;
    let deficit = 0;
    let surplus = 0;
    products.forEach((p) => {
      const sys = Number(p.stock || 0);
      const real = Number(actual[p.id] ?? sys);
      const diff = real - sys;
      if (diff === 0) match++;
      else if (diff < 0) deficit++;
      else surplus++;
    });
    return { total: products.length, match, deficit, surplus };
  }, [products, actual]);

  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => !q || p.TenSP.toLowerCase().includes(q) || (p.MaSP || "").toLowerCase().includes(q));
  }, [products, query]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  async function submit() {
    try {
      const user = currentUserInfo();
      const saved = await saveRecord("stocktakes", {
        note: "Kiểm kê định kỳ",
        NgayKiemKe: new Date().toISOString().slice(0, 10),
        NguoiLap: user.name,
        items: products.map((product) => ({
          productId: product.id,
          sys: Number(product.stock || 0),
          actual: Number(actual[product.id] ?? product.stock ?? 0),
        })),
      });
      setStocktakes((current) => [saved, ...current]);
      toast("Đã lưu kiểm kê và điều chỉnh lại tồn kho");
    } catch (error) {
      toast(error.message);
    }
  }

  function printStocktake(record) {
<<<<<<< HEAD
    const printWindow = window.open("", "_blank", "width=880,height=920");
    if (!printWindow) return;
    const escapeHtml = (val) => String(val ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
    const code = record.MaKK || record.id;
    const dateStr = record.NgayKiemKe || new Date(record.createdAt || Date.now()).toLocaleDateString("vi-VN");

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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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
      margin-bottom: 20px;
    }
    .brand-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .brand-logo-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #F5F3FF;
      color: #7C3AED;
      border: 1px solid #DDD6FE;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .brand-info h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 2px;
    }
    .brand-info .slogan {
      font-size: 12px;
      color: #64748B;
      margin-bottom: 6px;
    }
    .brand-meta {
      font-size: 11.5px;
      color: #64748B;
      line-height: 1.6;
    }
    .meta-right {
      text-align: right;
      font-size: 12px;
      color: #334155;
      line-height: 1.6;
    }
    .doc-title-row {
      text-align: center;
      margin: 18px 0 20px;
    }
    .doc-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #2A4F49;
    }
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    table.doc-table th {
      background: #EEF2FF;
      color: #312E81;
      font-weight: 600;
      padding: 9px 10px;
      border: 1px solid #C7D2FE;
      text-align: left;
    }
    table.doc-table td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
      color: #1E293B;
    }
    table.doc-table th.center, table.doc-table td.center { text-align: center; }
    table.doc-table th.right, table.doc-table td.right { text-align: right; }
    
    .note-box {
      font-size: 12px;
      color: #475569;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .signatures-row {
      display: flex;
      justify-content: space-around;
      text-align: center;
      margin-top: 24px;
    }
    .sig-title {
      font-weight: 700;
      color: #0F172A;
      font-size: 13px;
    }
    .sig-sub {
      font-size: 11px;
      font-style: italic;
      color: #64748B;
      margin-top: 2px;
    }
    .sig-space {
      height: 60px;
    }
    @media print {
      body { padding: 0; }
      .doc-container { width: 100%; max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <header class="doc-header">
      <div class="brand-left">
        <div class="brand-logo-circle">📋</div>
        <div class="brand-info">
          <h2>Cửa hàng Mẹ &amp; Bé</h2>
          <div class="slogan">Đồng hành cùng bé yêu</div>
          <div class="brand-meta">
            <div>📍 Địa chỉ: 123 Nguyễn Văn Cừ, Long Biên, Hà Nội</div>
            <div>☎ Điện thoại: 0987 654 321 | ✉ Email: mebe@cuahang.vn</div>
          </div>
        </div>
      </div>
      <div class="meta-right">
        <div>Mã phiếu: <strong>${escapeHtml(code)}</strong></div>
        <div>Ngày lập: <strong>${escapeHtml(dateStr)}</strong></div>
        <div>Người kiểm: <strong>${escapeHtml(record.NguoiLap || "Thủ kho")}</strong></div>
      </div>
    </header>

    <div class="doc-title-row">
      <h1 class="doc-title">PHIẾU KIỂM KÊ TỒN KHO</h1>
    </div>

    <table class="doc-table">
      <thead>
        <tr>
          <th class="center" style="width: 40px">STT</th>
          <th>Tên sản phẩm</th>
          <th class="center" style="width: 60px">ĐVT</th>
          <th class="center" style="width: 90px">Tồn thực tế</th>
          <th class="center" style="width: 90px">Tồn hệ thống</th>
          <th class="center" style="width: 80px">Chênh lệch</th>
        </tr>
      </thead>
      <tbody>
        ${lines}
      </tbody>
    </table>

    <div class="note-box">
      <strong>Ghi chú:</strong><br/>
      • Những mặt hàng có chênh lệch âm cần kiểm tra lại số liệu xuất nhập và kiểm đếm lại.<br/>
      • Vui lòng đối chiếu với thực tế kho hàng trước khi chốt số liệu điều chỉnh.
    </div>

    <div class="signatures-row">
      <div>
        <div class="sig-title">Người kiểm kê</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
        <small style="color:#64748B">${escapeHtml(record.NguoiLap || "")}</small>
      </div>
      <div>
        <div class="sig-title">Thủ kho</div>
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
=======
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) return;
    const lines = (record.details || []).map((line, index) => `<tr><td>${index + 1}</td><td>${line.MaSPCode || line.MaSP || ""}</td><td>${line.TenSP || ""}</td><td>${line.SoLuongHeThong || 0}</td><td>${line.SoLuongThucTe || 0}</td><td>${line.ChenhLech > 0 ? "+" : ""}${line.ChenhLech || 0}</td></tr>`).join("");
    printWindow.document.write(`<html><head><title>${record.MaKK || record.id}</title><style>body{font-family:Arial;margin:36px;color:#1f2a37}h1{text-align:center}p{text-align:center;color:#6b7680}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #999;padding:8px}th{background:#e7f0ee}td:first-child{text-align:center}</style></head><body><h1>PHIẾU KIỂM KÊ KHO</h1><p>${record.MaKK || record.id} · ${record.NgayKiemKe || ""} · ${new Date(record.createdAt || Date.now()).toLocaleString("vi-VN")}</p><table><thead><tr><th>STT</th><th>Mã hàng</th><th>Sản phẩm</th><th>Tồn hệ thống</th><th>Thực tế</th><th>Chênh lệch</th></tr></thead><tbody>${lines}</tbody></table><p style="margin-top:42px">Người lập phiếu: <strong>${record.NguoiLap || "Quản trị viên"}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Người kiểm kê: ____________________</p></body></html>`);
    printWindow.document.close();
    printWindow.print();
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  }

  return (
    <section aria-labelledby="stocktake-heading" className="module-specialized stocktake-page">
      <header className="page-header">
        <hgroup>
          <h1 id="stocktake-heading">{title}</h1>
          <p>Đối chiếu tồn kho trên hệ thống với số lượng thực tế tại quầy và kho chứa.</p>
        </hgroup>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, background: "#f1f5f9", padding: "6px 12px", borderRadius: 6, color: "#475569", fontWeight: 500 }}>
            👤 Người kiểm: <strong>{currentUserInfo().display}</strong>
          </span>
          <button
            className="btn btn-primary"
            type="button"
            onClick={submit}
          >
            <CheckCircleIcon className="btn-icon" aria-hidden="true" />
            Lưu &amp; Cập nhật tồn kho
          </button>
        </div>
      </header>

      {loading && (
        <p style={{ color: "var(--text-faint)", padding: "16px 0" }}>⏳ Đang tải dữ liệu kiểm kê...</p>
      )}
      {loadError && (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          ⚠️ {loadError}
        </div>
      )}

      {/* Discrepancy stats */}
      <div className="stats-grid">
        <StatCard
          label="Mặt hàng cần kiểm"
          value={String(stats.total)}
          delta={`${stats.match} khớp hoàn toàn`}
          icon={CubeIcon}
        />
        <StatCard
          label="Lệch âm (Thất thoát)"
          value={String(stats.deficit)}
          delta="Cần xác minh nguyên nhân"
          valueClass="danger"
          icon={ExclamationTriangleIcon}
        />
        <StatCard
          label="Lệch dương (Thừa hàng)"
          value={String(stats.surplus)}
          delta="Thừa so với hệ thống"
          valueClass="positive"
        />
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar" style={{ marginTop: 14 }}>
        <div className="invoice-search" style={{ flex: 1, maxWidth: 440 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên sản phẩm, mã SKU..."
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
              <th>Mã &amp; Tên sản phẩm</th>
              <th style={{ width: 80 }}>ĐVT</th>
              <th style={{ width: 130, textAlign: "right" }}>Tồn hệ thống</th>
              <th style={{ width: 170, textAlign: "center" }}>Số lượng thực tế</th>
              <th style={{ width: 130, textAlign: "center" }}>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((product, idx) => {
              const sys = Number(product.stock || 0);
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
                        <span className="prod-code-badge" style={{ marginTop: 2, display: "inline-block" }}>{product.MaSP}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-soft)" }}>{product.DonViTinh}</td>
                  <td style={{ textAlign: "right" }}>
                    {sys <= 0 ? (
                      <span className="stock-status-out">⛔ 0 {product.DonViTinh}</span>
                    ) : sys <= LOW_STOCK_THRESHOLD ? (
                      <span className="stock-status-low">⚠️ {sys} {product.DonViTinh}</span>
                    ) : (
                      <span className="stock-status-ok">✅ {sys} {product.DonViTinh}</span>
                    )}
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
                        style={{ width: 80, textAlign: "center", fontWeight: 700 }}
                        type="number"
                        min="0"
                        value={actual[product.id] ?? sys}
                        onChange={(e) =>
                          setActual((current) => ({
                            ...current,
                            [product.id]: Number(e.target.value),
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
                </tr>
              );
            })}
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  ⏳ Đang tải danh sách sản phẩm...
                </td>
              </tr>
            ) : !filteredProducts.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState
                    icon={CubeIcon}
                    title="Không tìm thấy sản phẩm"
                    description={`Không có mặt hàng nào khớp với tìm kiếm "${query}".`}
                  />
                </td>
              </tr>
            ) : null}
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

      <section className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-soft)", margin: "0 0 14px" }}>
          LỊCH SỬ PHIẾU KIỂM KÊ ĐÃ LƯU
        </h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Thời điểm kiểm kê</th>
                <th>Người lập</th>
                <th>Số mặt hàng</th>
                <th>Số mục lệch</th>
                <th style={{ width: 130, textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.MaKK || record.id}</strong></td>
                  <td>{record.createdAt ? new Date(record.createdAt).toLocaleString("vi-VN") : record.NgayKiemKe}</td>
                  <td><span style={{ fontWeight: 600, color: "var(--text-soft)" }}>{record.NguoiLap || "Quản trị viên"}</span></td>
                  <td>{record.details?.length || record.items?.length || 0} mặt hàng</td>
                  <td>
                    <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                      {record.details?.filter((line) => Number(line.ChenhLech) !== 0).length || 0} mặt hàng
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => printStocktake(record)}>
                      <PrinterIcon className="btn-icon" aria-hidden="true" /> In phiếu
                    </button>
                  </td>
                </tr>
              ))}
              {!stocktakes.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                    Chưa có phiếu kiểm kê nào được lưu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}