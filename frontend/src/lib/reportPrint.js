/**
 * reportPrint.js — Thiết kế mẫu in báo cáo chuẩn Kế toán A4 cho Cửa hàng Mẹ & Bé
 * 
 * Tuân thủ quy chuẩn kế toán Việt Nam (Thông tư 99/2025/TT-BTC, Thông tư 133/2016/TT-BTC, Thông tư 200/2014/TT-BTC):
 * 1. Báo cáo Doanh thu (A4 Portrait)
 * 2. Báo cáo Thu tiền mặt độc lập (A4 Portrait, 8 cột, Số dư đầu kỳ, Số dư cuối kỳ, 4 chữ ký)
 * 3. Báo cáo Chi tiền mặt độc lập (A4 Portrait, 8 cột, Số dư đầu kỳ, Số dư cuối kỳ, 4 chữ ký)
 * 4. Báo cáo Thu tiền chuyển khoản (A4 Portrait)
 * 5. Báo cáo Chi tiền chuyển khoản (A4 Portrait)
 * 6. Báo cáo Nhập kho độc lập (A4 Landscape, 11 cột, 4 chữ ký)
 * 7. Báo cáo Xuất kho độc lập (A4 Landscape, 11 cột giá vốn, 4 chữ ký)
 * 8. Báo cáo Tổng hợp Nhập - Xuất - Tồn (A4 Landscape, Mẫu S11/S12-DN, 10 nhóm cột kế toán)
 * 9. Báo cáo Kết quả Hoạt động Kinh doanh (A4 Portrait, Mẫu số B 02 - DN, 20 chỉ tiêu chuẩn TT 99/2025/TT-BTC)
 * 10. Sổ chi tiết Vật liệu, Dụng cụ, Sản phẩm, Hàng hóa (A4 Landscape, Mẫu số S10-DN theo TT 99/2025/TT-BTC)
 * 11. Sổ Nhật ký chung (A4 Portrait, Mẫu số S03a-DNN theo TT 133/2016/TT-BTC)
 * 12. Sổ Tài sản cố định (A4 Landscape, Mẫu số S21-DN theo TT 200/2014/TT-BTC)
 * 13. Báo cáo Công nợ phải thu & phải trả (A4 Landscape)
 * 14. Báo cáo Thu - Chi tổng hợp (A4 Landscape)
 * 15. Báo cáo Bán hàng theo nhân viên (A4 Portrait)
 * 16. Báo cáo Kiểm kê & Điều chỉnh kho (A4 Landscape)
 */

import { amountToWords } from "./amountToWords.js";
import { getStoreConfig, DEFAULT_STORE_CONFIG as STORE_CONFIG, getBrandLogoUrl } from "./storeConfig.js";

export { STORE_CONFIG, getStoreConfig };

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(v) {
  const num = Math.round(Number(v) || 0);
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(num);
}

function fmtNumber(v) {
  const num = Math.round(Number(v) || 0);
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(num);
}

function formatDate(dateVal) {
  if (!dateVal) return "";
  try {
    const s = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
      return s.slice(0, 10);
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
}

function formatDateParts(val) {
  const d = val ? new Date(val) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return {
      d: String(now.getDate()).padStart(2, "0"),
      m: String(now.getMonth() + 1).padStart(2, "0"),
      y: String(now.getFullYear()),
    };
  }
  return {
    d: String(d.getDate()).padStart(2, "0"),
    m: String(d.getMonth() + 1).padStart(2, "0"),
    y: String(d.getFullYear()),
  };
}

function formatDateTime(d = new Date()) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function getPeriodString(dateFrom, dateTo) {
  const f = formatDate(dateFrom);
  const t = formatDate(dateTo);
  if (f && t) return `Từ ngày ${f} đến ngày ${t}`;
  if (f) return `Từ ngày ${f}`;
  if (t) return `Đến ngày ${t}`;
  const now = new Date();
  const firstDay = `01/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const today = formatDate(now);
  return `Từ ngày ${firstDay} đến ngày ${today}`;
}

function getCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
    return u.fullName || u.username || "Kế toán viên";
  } catch {
    return "Kế toán viên";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS STYLESHEET (CHUẨN KẾ TOÁN TRUYỀN THỐNG VIỆT NAM - NỀN TRẮNG CHỮ ĐEN)
// ─────────────────────────────────────────────────────────────────────────────

const baseStyle = `
  @page {
    margin: 12mm 14mm 12mm 14mm;
  }

  @page portrait-page {
    size: A4 portrait;
    margin: 12mm 14mm 12mm 14mm;
  }

  @page landscape-page {
    size: A4 landscape;
    margin: 10mm 12mm 10mm 12mm;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.35;
    color: #000000;
    background: #f1f5f9;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .mono {
    font-family: "Times New Roman", Times, serif;
    font-variant-numeric: tabular-nums;
  }

  /* STICKY TOOLBAR (HIDDEN WHEN PRINTED) */
  .print-toolbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #0f172a;
    color: #ffffff;
    padding: 8px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
  }
  .print-toolbar-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .print-btn {
    border: none;
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .print-btn-primary { background: #2563eb; color: #fff; }
  .print-btn-primary:hover { background: #1d4ed8; }
  .print-btn-success { background: #059669; color: #fff; }
  .print-btn-success:hover { background: #047857; }
  .print-btn-close { background: #475569; color: #fff; }
  .print-btn-close:hover { background: #334155; }

  /* PAGE HOLDERS */
  .page-portrait {
    width: 210mm;
    min-height: 297mm;
    margin: 14px auto;
    padding: 12mm 14mm;
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .page-landscape {
    width: 297mm;
    min-height: 210mm;
    margin: 14px auto;
    padding: 10mm 14mm;
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .content-body {
    flex: 1 0 auto;
  }

  /* STORE HEADER */
  .shop-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 6px;
    border-bottom: 1px solid #000;
    margin-bottom: 12px;
  }

  .shop-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .shop-logo-img {
    width: 44px;
    height: 44px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .shop-brand-name {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #000;
    line-height: 1.2;
  }

  .shop-brand-desc {
    font-size: 10pt;
    color: #333;
    font-style: italic;
    margin-top: 1px;
  }

  .shop-info {
    text-align: right;
    font-size: 9.5pt;
    color: #000;
    line-height: 1.35;
  }

  /* REPORT TITLE */
  .rpt-title {
    text-align: center;
    font-size: 15pt;
    font-weight: bold;
    color: #000000;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 8px 0 3px;
  }

  .rpt-subtitle {
    text-align: center;
    font-size: 10.5pt;
    color: #222222;
    font-style: italic;
    margin-bottom: 12px;
  }

  .sec-title {
    font-size: 11pt;
    font-weight: bold;
    color: #000000;
    text-transform: uppercase;
    margin-bottom: 5px;
    letter-spacing: 0.2px;
  }

  /* TABLE (STRICT ACCOUNTING STYLE: THIN BORDER, CENTER HEADERS, RIGHT AMOUNTS) */
  table.rpt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin-bottom: 4px;
    background: #ffffff;
  }

  table.rpt-table thead th {
    background: #f3f4f6;
    color: #000000;
    font-weight: bold;
    text-align: center;
    border: 1px solid #000000;
    padding: 6px 4px;
    font-size: 9.5pt;
    line-height: 1.3;
  }

  table.rpt-table tbody td {
    border: 1px solid #000000;
    padding: 4.5px 5px;
    vertical-align: middle;
    background: #ffffff;
    color: #000000;
  }

  table.rpt-table tfoot td,
  tr.rpt-total-row td {
    background: #f9fafb;
    color: #000000;
    font-weight: bold;
    border: 1px solid #000000;
    padding: 5.5px 5px;
  }

  td.center, th.center { text-align: center; }
  td.right, th.right { text-align: right; }
  td.left, th.left { text-align: left; }

  .words-footnote {
    font-size: 10pt;
    font-style: italic;
    color: #111111;
    margin-top: 6px;
    margin-bottom: 10px;
  }

  /* SIGNATURE BLOCKS */
  .sig-block {
    display: grid;
    margin-top: 10px;
    page-break-inside: avoid;
    break-inside: avoid;
    text-align: center;
  }
  .sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .sig-role {
    font-weight: bold;
    font-size: 10.5pt;
    color: #000;
  }
  .sig-note {
    font-style: italic;
    font-size: 9.5pt;
    color: #444;
    margin-top: 1px;
  }
  .sig-space {
    height: 48px;
  }
  .sig-line {
    border-bottom: 1px dotted #888;
    width: 120px;
    margin-bottom: 4px;
  }
  .sig-name {
    font-size: 10.5pt;
    font-weight: bold;
    color: #000;
  }

  /* FOOTER */
  .rpt-footer-bar {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    color: #555;
    margin-top: 12px;
    border-top: 1px solid #999;
    padding-top: 5px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* TWO COLUMNS */
  .flex-2col {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .col-half {
    flex: 1;
    min-width: 0;
  }

  /* PRINT MEDIA QUERIES (NO SIDEBARS, TOOLBARS, WEB UI) */
  @media print {
    body {
      background: #ffffff !important;
      font-size: 10.5pt;
      color: #000000 !important;
    }
    .print-toolbar, .no-print {
      display: none !important;
    }
    .page-portrait {
      box-shadow: none !important;
      margin: 0 !important;
      width: 100% !important;
      min-height: auto !important;
      padding: 0 !important;
      page: portrait-page;
    }
    .page-landscape {
      box-shadow: none !important;
      margin: 0 !important;
      width: 100% !important;
      min-height: auto !important;
      padding: 0 !important;
      page: landscape-page;
    }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { page-break-inside: avoid !important; break-inside: avoid !important; }
    .sig-block { page-break-inside: avoid !important; break-inside: avoid !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// HEADER & SIGNATURE TEMPLATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function shopHeader() {
  const store = getStoreConfig();
  return `
    <header class="shop-header">
      <div class="shop-brand">
        <img src="${getBrandLogoUrl()}" class="shop-logo-img" alt="Logo Mẹ & Bé" />
        <div>
          <div class="shop-brand-name">${esc(store.name || store.brandName || "Cửa hàng Mẹ & Bé")}</div>
          <div class="shop-brand-desc">${esc(store.desc || store.subtitle || "Hệ thống quản lý Cửa hàng Mẹ và Bé")}</div>
        </div>
      </div>
      <div class="shop-info">
        <div><strong>Địa chỉ:</strong> ${esc(store.address)}</div>
        <div><strong>Hotline:</strong> ${esc(store.hotline || store.phone)}${store.taxCode ? ` | <strong>MST:</strong> ${esc(store.taxCode)}` : ""}</div>
        <div><strong>Email:</strong> ${esc(store.email)} | <strong>Website:</strong> ${esc(store.website || "www.cuahangmebe.vn")}</div>
      </div>
    </header>
  `;
}

function accountingHeader({ title, formNo = "", subTitle = "", standardText = "", extraRight = "" }) {
  const store = getStoreConfig();
  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; font-size: 10.5pt;">
      <div style="line-height: 1.35;">
        <div style="font-weight: bold; text-transform: uppercase;">${esc(store.name || "CỬA HÀNG MẸ & BÉ")}</div>
        <div>Địa chỉ: ${esc(store.address || "123 Nguyễn Trãi, Thanh Xuân, Hà Nội")}</div>
        ${store.hotline ? `<div>Điện thoại: ${esc(store.hotline)}</div>` : ""}
      </div>
      <div style="text-align: right; line-height: 1.35; font-size: 9.5pt;">
        ${formNo ? `<div style="font-weight: bold;">${esc(formNo)}</div>` : ""}
        ${standardText ? `<div style="font-style: italic; font-size: 9pt; max-width: 320px;">(${esc(standardText)})</div>` : ""}
        ${extraRight || ""}
      </div>
    </div>
    <div style="text-align: center; margin: 10px 0 8px;">
      <h1 class="rpt-title">${esc(title)}</h1>
      ${subTitle ? `<div class="rpt-subtitle">${esc(subTitle)}</div>` : ""}
    </div>
  `;
}

// 4 Signatures for Cash Receipts / Payments (Người lập, Thủ quỹ, Kế toán trưởng, Giám đốc / Người duyệt)
function sigRow4Cash({ user, date = new Date() }) {
  const d = formatDateParts(date);
  return `
    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Hà Nội, ngày ${d.d} tháng ${d.m} năm ${d.y}
    </div>
    <div class="sig-block" style="grid-template-columns: repeat(4, 1fr);">
      <div class="sig-col">
        <div class="sig-role">Người lập biểu</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${esc(user || getCurrentUser())}</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Thủ quỹ</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Kế toán trưởng</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Giám đốc</div>
        <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
    </div>
  `;
}

// 4 Signatures for Warehouse (Người lập biểu, Người giao/nhận hàng, Kế toán trưởng, Giám đốc)
function sigRow4Warehouse({ user, role = "Người giao hàng", date = new Date() }) {
  const d = formatDateParts(date);
  return `
    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Hà Nội, ngày ${d.d} tháng ${d.m} năm ${d.y}
    </div>
    <div class="sig-block" style="grid-template-columns: repeat(4, 1fr);">
      <div class="sig-col">
        <div class="sig-role">Người lập biểu</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${esc(user || getCurrentUser())}</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">${esc(role)}</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Kế toán trưởng</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Giám đốc</div>
        <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
    </div>
  `;
}

// 3 Signatures standard for ledgers & financial statements
function sigRow3Legal({ user, firstRole = "Người lập biểu", thirdRole = "Người đại diện theo pháp luật", date = new Date() }) {
  const d = formatDateParts(date);
  return `
    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Hà Nội, ngày ${d.d} tháng ${d.m} năm ${d.y}
    </div>
    <div class="sig-block" style="grid-template-columns: repeat(3, 1fr);">
      <div class="sig-col">
        <div class="sig-role">${esc(firstRole)}</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${esc(user || getCurrentUser())}</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Kế toán trưởng</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">${esc(thirdRole)}</div>
        <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
    </div>
  `;
}

function sigRow3() {
  const user = getCurrentUser();
  return `
    <div class="sig-block" style="grid-template-columns: repeat(3, 1fr);">
      <div class="sig-col">
        <div class="sig-role">Người lập biểu</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${esc(user)}</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Kế toán trưởng</div>
        <div class="sig-note">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-role">Giám đốc</div>
        <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
    </div>
  `;
}

function rptFooter(pageText = "Trang 1/1") {
  return `
    <footer class="rpt-footer-bar">
      <span>Hệ thống ERP Cửa hàng Mẹ & Bé · Ngày in: ${formatDateTime()}</span>
      <span>${pageText}</span>
    </footer>
  `;
}

function wrapPage(bodyHtml, isLandscape = false, pageTitle = "Báo cáo kế toán - Cửa hàng Mẹ & Bé") {
  const pageClass = isLandscape ? "page-landscape" : "page-portrait";
  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const hasCustomSig = bodyHtml.includes("sig-block");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${origin ? `<base href="${origin}/">` : ""}
  <title>${esc(pageTitle)}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <!-- Print Toolbar (Ẩn hoàn toàn khi in bằng CSS no-print) -->
  <div class="print-toolbar no-print">
    <div style="font-weight: 600;">${esc(pageTitle)}</div>
    <div class="print-toolbar-actions">
      <button type="button" class="print-btn print-btn-primary" onclick="window.print()">🖨️ In trang này (Ctrl+P)</button>
      <button type="button" class="print-btn print-btn-success" onclick="window.print()">💾 Xuất / Lưu PDF</button>
      <button type="button" class="print-btn print-btn-close" onclick="window.close()">✕ Đóng</button>
    </div>
  </div>

  <div class="${pageClass}">
    <div class="content-body">
      ${bodyHtml}
    </div>
    ${!hasCustomSig ? sigRow3() : ""}
    ${rptFooter()}
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BÁO CÁO DOANH THU (A4 PORTRAIT)
// ─────────────────────────────────────────────────────────────────────────────

export function buildRevenueHtml({ breakdown = [], summary = {}, dateFrom, dateTo, storeConfig }) {
  const periodText = getPeriodString(dateFrom, dateTo);
  const totalRev = Number(summary.totalRevenue || breakdown.reduce((s, b) => s + (b.revenue || 0), 0));
  const totalPaid = Number(summary.totalPaid !== undefined ? summary.totalPaid : breakdown.reduce((s, b) => s + (b.paid || 0), 0));
  const totalUnpaid = Number(summary.totalUnpaid !== undefined ? summary.totalUnpaid : breakdown.reduce((s, b) => s + (b.unpaid || 0), 0));
  const totalOrders = Number(summary.totalOrders || breakdown.reduce((s, b) => s + (b.ordersCount || 0), 0));

  const rows = breakdown.map((item, idx) => {
    const rev = Number(item.revenue || 0);
    const pct = totalRev > 0 ? ((rev / totalRev) * 100).toFixed(1) + "%" : "0%";
    return `
      <tr>
        <td class="center mono">${idx + 1}</td>
        <td class="center">${esc(item.label || item.period)}</td>
        <td class="right mono">${fmtNumber(item.ordersCount || 0)}</td>
        <td class="right mono"><strong>${fmtMoney(rev)}</strong></td>
        <td class="right mono">${fmtMoney(item.paid || 0)}</td>
        <td class="right mono">${fmtMoney(item.unpaid || 0)}</td>
        <td class="right mono">${pct}</td>
      </tr>
    `;
  }).join("");

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO DOANH THU BÁN HÀNG",
      subTitle: periodText,
      formNo: "BIỂU MẪU QUẢN TRỊ DOANH THU",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10.5pt;">
      <div><strong>Tổng số hóa đơn:</strong> <span class="mono">${fmtNumber(totalOrders)}</span> đơn</div>
      <div><strong>Tổng doanh thu:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalRev)} đ</span></div>
      <div><strong>Đã thu tiền:</strong> <span class="mono">${fmtMoney(totalPaid)} đ</span></div>
      <div><strong>Còn phải thu:</strong> <span class="mono">${fmtMoney(totalUnpaid)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 25%">Kỳ phát sinh</th>
          <th style="width: 12%">Số HĐ</th>
          <th style="width: 18%">Doanh thu (đ)</th>
          <th style="width: 15%">Đã thanh toán</th>
          <th style="width: 15%">Còn nợ (đ)</th>
          <th style="width: 10%">Tỷ trọng</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="7" class="center" style="padding:20px; font-style:italic">Không có dữ liệu doanh thu trong kỳ</td></tr>`}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="2" class="center" style="font-weight: bold; text-transform: uppercase;">Tổng cộng:</td>
          <td class="right mono">${fmtNumber(totalOrders)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalRev)}</td>
          <td class="right mono">${fmtMoney(totalPaid)}</td>
          <td class="right mono">${fmtMoney(totalUnpaid)}</td>
          <td class="right mono">100%</td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalRev)}
    </div>

    ${sigRow3Legal({ user: getCurrentUser(), firstRole: "Người lập biểu", thirdRole: "Giám đốc" })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Doanh thu - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BÁO CÁO THU TIỀN MẶT ĐỘC LẬP (A4 PORTRAIT)
// ─────────────────────────────────────────────────────────────────────────────

export function buildCashReceiptsHtml({ receipts = [], dateFrom, dateTo, openingBalance = 0, closingBalance: passedClosing, totalAmount: passedTotal, storeConfig }) {
  const totalAmount = passedTotal !== undefined ? Number(passedTotal) : receipts.reduce((s, r) => s + Number(r.SoTien || r.amount || 0), 0);
  const closingBalance = passedClosing !== undefined ? Number(passedClosing) : (Number(openingBalance || 0) + totalAmount);
  const user = getCurrentUser();

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO THU TIỀN MẶT",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ QUỸ TIỀN MẶT - THU",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <!-- KHỐI SỐ DƯ ĐẦU KỲ - TỔNG THU - SỐ DƯ CUỐI KỲ -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; background: #fff; font-size: 10.5pt;">
      <div><strong>Số dư đầu kỳ quỹ tiền mặt:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(openingBalance)} đ</span></div>
      <div><strong>Tổng thu tiền mặt trong kỳ:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalAmount)} đ</span></div>
      <div><strong>Số dư cuối kỳ quỹ tiền mặt:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(closingBalance)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 12%">Ngày thu</th>
          <th style="width: 13%">Số phiếu thu</th>
          <th style="width: 20%">Người nộp tiền</th>
          <th style="width: 24%">Nội dung thu</th>
          <th style="width: 11%">Chứng từ gốc</th>
          <th style="width: 15%">Số tiền thu (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${receipts.map((r, idx) => `
          <tr>
            <td class="center mono">${r.stt || (idx + 1)}</td>
            <td class="center">${formatDate(r.NgayThu || r.date)}</td>
            <td class="center"><strong>${esc(r.SoPhieuThu || r.code || r.number)}</strong></td>
            <td class="left">${esc(r.DoiTuongNop || r.person || "—")}</td>
            <td class="left">${esc(r.NoiDung || r.reason || "—")}</td>
            <td class="center">${esc(r.ChungTuGoc || "—")}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(r.SoTien || r.amount || 0)}</td>
          </tr>
        `).join("")}
        ${receipts.length === 0 ? `
          <tr>
            <td colspan="7" class="center" style="padding: 24px; font-style: italic;">
              Không có phát sinh thu tiền mặt trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="6" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng phát sinh thu trong kỳ:</td>
          <td class="right mono" style="font-weight: bold; font-size: 11pt;">${fmtMoney(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalAmount)}
    </div>

    ${sigRow4Cash({ user })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Thu Tiền Mặt - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. BÁO CÁO CHI TIỀN MẶT ĐỘC LẬP (A4 PORTRAIT)
// ─────────────────────────────────────────────────────────────────────────────

export function buildCashPaymentsHtml({ payments = [], dateFrom, dateTo, openingBalance = 0, closingBalance: passedClosing, totalAmount: passedTotal, storeConfig }) {
  const totalAmount = passedTotal !== undefined ? Number(passedTotal) : payments.reduce((s, p) => s + Number(p.SoTien || p.amount || 0), 0);
  const closingBalance = passedClosing !== undefined ? Number(passedClosing) : Math.max(0, Number(openingBalance || 0) - totalAmount);
  const user = getCurrentUser();

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO CHI TIỀN MẶT",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ QUỸ TIỀN MẶT - CHI",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <!-- KHỐI SỐ DƯ ĐẦU KỲ - TỔNG CHI - SỐ DƯ CUỐI KỲ -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; background: #fff; font-size: 10.5pt;">
      <div><strong>Số dư đầu kỳ quỹ tiền mặt:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(openingBalance)} đ</span></div>
      <div><strong>Tổng chi tiền mặt trong kỳ:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalAmount)} đ</span></div>
      <div><strong>Số dư cuối kỳ quỹ tiền mặt:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(closingBalance)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 12%">Ngày chi</th>
          <th style="width: 13%">Số phiếu chi</th>
          <th style="width: 20%">Người nhận tiền</th>
          <th style="width: 24%">Nội dung chi</th>
          <th style="width: 11%">Chứng từ gốc</th>
          <th style="width: 15%">Số tiền chi (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map((p, idx) => `
          <tr>
            <td class="center mono">${p.stt || (idx + 1)}</td>
            <td class="center">${formatDate(p.NgayChi || p.date)}</td>
            <td class="center"><strong>${esc(p.SoPhieuChi || p.code || p.number)}</strong></td>
            <td class="left">${esc(p.DoiTuongNhan || p.person || "—")}</td>
            <td class="left">${esc(p.NoiDung || p.reason || "—")}</td>
            <td class="center">${esc(p.ChungTuGoc || "—")}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(p.SoTien || p.amount || 0)}</td>
          </tr>
        `).join("")}
        ${payments.length === 0 ? `
          <tr>
            <td colspan="7" class="center" style="padding: 24px; font-style: italic;">
              Không có phát sinh chi tiền mặt trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="6" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng phát sinh chi trong kỳ:</td>
          <td class="right mono" style="font-weight: bold; font-size: 11pt;">${fmtMoney(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalAmount)}
    </div>

    ${sigRow4Cash({ user })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Chi Tiền Mặt - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BÁO CÁO THU TIỀN CHUYỂN KHOẢN (NGÂN HÀNG)
// ─────────────────────────────────────────────────────────────────────────────

export function buildBankReceiptsHtml({ data = [], dateFrom, dateTo, totalAmount: passedTotal, storeConfig }) {
  const totalAmount = passedTotal !== undefined ? Number(passedTotal) : data.reduce((s, r) => s + Number(r.SoTien || 0), 0);
  const user = getCurrentUser();

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO THU TIỀN CHUYỂN KHOẢN",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ TIỀN GỬI NGÂN HÀNG - THU",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10.5pt;">
      <div><strong>Tổng số giao dịch chuyển khoản:</strong> <span class="mono">${data.length}</span> giao dịch</div>
      <div><strong>Tổng tiền thu chuyển khoản:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalAmount)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 12%">Ngày GD</th>
          <th style="width: 14%">Mã giao dịch</th>
          <th style="width: 22%">Người nộp / Khách hàng</th>
          <th style="width: 23%">Nội dung chuyển khoản</th>
          <th style="width: 10%">Hóa đơn</th>
          <th style="width: 14%">Số tiền (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((r, idx) => `
          <tr>
            <td class="center mono">${r.stt || (idx + 1)}</td>
            <td class="center">${formatDate(r.NgayThu)}</td>
            <td class="center mono"><strong>${esc(r.SoGiaoDich)}</strong></td>
            <td class="left">${esc(r.DoiTuongNop)}</td>
            <td class="left">${esc(r.NoiDung)}</td>
            <td class="center">${esc(r.ChungTuGoc)}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(r.SoTien)}</td>
          </tr>
        `).join("")}
        ${data.length === 0 ? `
          <tr>
            <td colspan="7" class="center" style="padding: 24px; font-style: italic;">
              Không có giao dịch thu chuyển khoản trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="6" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng thu chuyển khoản:</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalAmount)}
    </div>

    ${sigRow3Legal({ user, firstRole: "Người lập biểu", thirdRole: "Kế toán trưởng / Giám đốc" })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Thu Chuyển Khoản - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BÁO CÁO CHI TIỀN CHUYỂN KHOẢN (ỦY NHIỆM CHI)
// ─────────────────────────────────────────────────────────────────────────────

export function buildBankPaymentsHtml({ data = [], dateFrom, dateTo, totalAmount: passedTotal, storeConfig }) {
  const totalAmount = passedTotal !== undefined ? Number(passedTotal) : data.reduce((s, r) => s + Number(r.SoTien || 0), 0);
  const user = getCurrentUser();

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO CHI TIỀN CHUYỂN KHOẢN",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ TIỀN GỬI NGÂN HÀNG - CHI",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10.5pt;">
      <div><strong>Tổng số ủy nhiệm chi / GD chuyển tiền:</strong> <span class="mono">${data.length}</span> giao dịch</div>
      <div><strong>Tổng tiền chi chuyển khoản:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalAmount)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 12%">Ngày GD</th>
          <th style="width: 14%">Số UNC / Mã GD</th>
          <th style="width: 22%">Người nhận / Đơn vị thụ hưởng</th>
          <th style="width: 23%">Nội dung thanh toán</th>
          <th style="width: 10%">Chứng từ gốc</th>
          <th style="width: 14%">Số tiền (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((r, idx) => `
          <tr>
            <td class="center mono">${r.stt || (idx + 1)}</td>
            <td class="center">${formatDate(r.NgayChi)}</td>
            <td class="center mono"><strong>${esc(r.SoGiaoDich)}</strong></td>
            <td class="left">${esc(r.DoiTuongNhan)}</td>
            <td class="left">${esc(r.NoiDung)}</td>
            <td class="center">${esc(r.ChungTuGoc)}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(r.SoTien)}</td>
          </tr>
        `).join("")}
        ${data.length === 0 ? `
          <tr>
            <td colspan="7" class="center" style="padding: 24px; font-style: italic;">
              Không có giao dịch chi chuyển khoản trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="6" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng chi chuyển khoản:</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalAmount)}
    </div>

    ${sigRow3Legal({ user, firstRole: "Người lập biểu", thirdRole: "Kế toán trưởng / Giám đốc" })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Chi Chuyển Khoản - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. BÁO CÁO NHẬP KHO ĐỘC LẬP (A4 LANDSCAPE - 11 CỘT CHUẨN KẾ TOÁN)
// ─────────────────────────────────────────────────────────────────────────────

export function buildWarehouseReceiptsHtml({ receipts = [], dateFrom, dateTo, totalQuantity: passedQty, totalAmount: passedTotal, storeConfig }) {
  const totalQuantity = passedQty !== undefined ? Number(passedQty) : receipts.reduce((s, r) => s + Number(r.SoLuong || r.quantity || 0), 0);
  const totalAmount = passedTotal !== undefined ? Number(passedTotal) : receipts.reduce((s, r) => s + Number(r.ThanhTien || r.amount || 0), 0);
  const user = getCurrentUser();

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO NHẬP KHO",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ CHI TIẾT NHẬP KHO HÀNG HÓA",
      standardText: "Kèm theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10pt;">
      <div><strong>Tổng số dòng hàng nhập:</strong> <span class="mono">${receipts.length}</span> dòng</div>
      <div><strong>Tổng số lượng nhập:</strong> <span class="mono" style="font-weight: bold;">${fmtNumber(totalQuantity)}</span> sản phẩm</div>
      <div><strong>Tổng giá trị nhập kho:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalAmount)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 4%">STT</th>
          <th style="width: 8%">Ngày nhập</th>
          <th style="width: 9%">Số phiếu nhập</th>
          <th style="width: 16%">Nhà cung cấp</th>
          <th style="width: 8%">Mã hàng</th>
          <th style="width: 20%">Tên hàng hóa</th>
          <th style="width: 5%">ĐVT</th>
          <th style="width: 7%">Số lượng</th>
          <th style="width: 9%">Đơn giá (đ)</th>
          <th style="width: 11%">Thành tiền (đ)</th>
          <th style="width: 13%">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${receipts.map((r, idx) => `
          <tr>
            <td class="center mono">${r.stt || (idx + 1)}</td>
            <td class="center">${formatDate(r.NgayNhap || r.date)}</td>
            <td class="center"><strong>${esc(r.SoPhieuNhap || r.code || r.voucherId)}</strong></td>
            <td class="left">${esc(r.NhaCungCap || r.supplier || "—")}</td>
            <td class="center mono">${esc(r.MaSP || r.itemCode || "—")}</td>
            <td class="left">${esc(r.TenSP || r.itemName || "—")}</td>
            <td class="center">${esc(r.DonViTinh || r.unit || "Cái")}</td>
            <td class="right mono">${fmtNumber(r.SoLuong || r.quantity || 0)}</td>
            <td class="right mono">${fmtMoney(r.DonGia || r.price || 0)}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(r.ThanhTien || r.amount || 0)}</td>
            <td class="left" style="font-size: 8.5pt;">${esc(r.GhiChu || r.note || "—")}</td>
          </tr>
        `).join("")}
        ${receipts.length === 0 ? `
          <tr>
            <td colspan="11" class="center" style="padding: 24px; font-style: italic;">
              Không có phát sinh nhập kho trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="7" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng:</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(totalQuantity)}</td>
          <td></td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalAmount)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalAmount)}
    </div>

    ${sigRow4Warehouse({ user, role: "Người giao hàng" })}
  `;

  return wrapPage(bodyHtml, true, "Báo cáo Nhập Kho - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. BÁO CÁO XUẤT KHO ĐỘC LẬP (A4 LANDSCAPE - 11 CỘT CHUẨN KẾ TOÁN)
// ─────────────────────────────────────────────────────────────────────────────

export function buildWarehouseIssuesHtml({ issues = [], dateFrom, dateTo, totalQuantity: passedQty, totalAmount: passedTotal, storeConfig }) {
  const totalQuantity = passedQty !== undefined ? Number(passedQty) : issues.reduce((s, i) => s + Number(i.SoLuong || i.quantity || 0), 0);
  const totalAmount = passedTotal !== undefined ? Number(passedTotal) : issues.reduce((s, i) => s + Number(i.ThanhTien || i.amount || 0), 0);
  const user = getCurrentUser();

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO XUẤT KHO",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ CHI TIẾT XUẤT KHO HÀNG HÓA",
      standardText: "Kèm theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10pt;">
      <div><strong>Tổng số dòng hàng xuất:</strong> <span class="mono">${issues.length}</span> dòng</div>
      <div><strong>Tổng số lượng xuất:</strong> <span class="mono" style="font-weight: bold;">${fmtNumber(totalQuantity)}</span> sản phẩm</div>
      <div><strong>Tổng giá trị xuất kho (giá vốn):</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalAmount)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 4%">STT</th>
          <th style="width: 8%">Ngày xuất</th>
          <th style="width: 9%">Số phiếu xuất</th>
          <th style="width: 16%">Đối tượng nhận hàng</th>
          <th style="width: 8%">Mã hàng</th>
          <th style="width: 20%">Tên hàng hóa</th>
          <th style="width: 5%">ĐVT</th>
          <th style="width: 7%">Số lượng</th>
          <th style="width: 9%">Đơn giá vốn (đ)</th>
          <th style="width: 11%">Thành tiền (đ)</th>
          <th style="width: 13%">Lý do xuất</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map((i, idx) => `
          <tr>
            <td class="center mono">${i.stt || (idx + 1)}</td>
            <td class="center">${formatDate(i.NgayXuat || i.date)}</td>
            <td class="center"><strong>${esc(i.SoPhieuXuat || i.code || i.voucherId)}</strong></td>
            <td class="left">${esc(i.DoiTuongNhan || i.receiver || "—")}</td>
            <td class="center mono">${esc(i.MaSP || i.itemCode || "—")}</td>
            <td class="left">${esc(i.TenSP || i.itemName || "—")}</td>
            <td class="center">${esc(i.DonViTinh || i.unit || "Cái")}</td>
            <td class="right mono">${fmtNumber(i.SoLuong || i.quantity || 0)}</td>
            <td class="right mono">${fmtMoney(i.DonGia || i.price || 0)}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(i.ThanhTien || i.amount || 0)}</td>
            <td class="left" style="font-size: 8.5pt;">${esc(i.LyDoXuat || i.reason || "—")}</td>
          </tr>
        `).join("")}
        ${issues.length === 0 ? `
          <tr>
            <td colspan="11" class="center" style="padding: 24px; font-style: italic;">
              Không có phát sinh xuất kho trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="7" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng:</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(totalQuantity)}</td>
          <td></td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalAmount)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalAmount)}
    </div>

    ${sigRow4Warehouse({ user, role: "Người nhận hàng" })}
  `;

  return wrapPage(bodyHtml, true, "Báo cáo Xuất Kho - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7.1. BÁO CÁO TỔNG HỢP NHẬP – XUẤT KHO (A4 LANDSCAPE - CHUẨN KẾ TOÁN VAS)
// ─────────────────────────────────────────────────────────────────────────────

export function buildWarehouseHtml({
  receipts = [],
  issues = [],
  transactions = [],
  totalImportUnits: passedImportUnits,
  totalExportUnits: passedExportUnits,
  totalImportValue: passedImportVal,
  totalExportValue: passedExportVal,
  dateFrom,
  dateTo,
  storeConfig,
}) {
  const user = getCurrentUser();

  let list = Array.isArray(transactions) && transactions.length > 0 ? [...transactions] : [];
  if (list.length === 0) {
    const rList = receipts.map((r) => {
      const qty = Number(r.TongSoLuong || (r.details || []).reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0) || 0);
      const val = Number(r.TongTien || (r.details || []).reduce((s, l) => s + Number(l.ThanhTien || (Number(l.SoLuong || 0) * Number(l.DonGia || 0))), 0) || 0);
      return {
        id: r.id || r.MaPN,
        type: "import",
        typeLabel: "Nhập kho",
        code: r.MaPN || r.SoPhieuNhap || r.id,
        date: r.NgayNhap || r.date || r.createdAt,
        partner: r.TenNCC || r.NhaCungCap || r.NguoiGiao || r.NguoiLienQuan || "Nhà cung cấp",
        detailsCount: (r.details || []).length || 1,
        importQty: qty,
        exportQty: 0,
        importAmount: val,
        exportAmount: 0,
        note: r.GhiChu || r.note || "",
      };
    });
    const iList = issues.map((i) => {
      const qty = Number(i.TongSoLuong || (i.details || []).reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0) || 0);
      const val = Number(i.TongTien || (i.details || []).reduce((s, l) => s + Number(l.ThanhTien || (Number(l.SoLuong || 0) * Number(l.DonGia || 0))), 0) || 0);
      return {
        id: i.id || i.MaPX,
        type: "export",
        typeLabel: "Xuất kho",
        code: i.MaPX || i.SoPhieuXuat || i.id,
        date: i.NgayXuat || i.date || i.createdAt,
        partner: i.LyDoXuat || i.DoiTuongNhan || i.NguoiNhan || "Khách hàng / Bán lẻ",
        detailsCount: (i.details || []).length || 1,
        importQty: 0,
        exportQty: qty,
        importAmount: 0,
        exportAmount: val,
        note: i.LyDoXuat || i.GhiChu || i.note || "",
      };
    });
    list = [...rList, ...iList].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  } else {
    list = list.map((t) => {
      const isImp = t.type === "import" || t.typeLabel?.includes("Nhập");
      const qty = Number(t.totalQuantity || t.quantity || t.SoLuong || 0);
      const amt = Number(t.total || t.amount || t.TongTien || 0);
      return {
        id: t.id || t.code,
        type: isImp ? "import" : "export",
        typeLabel: isImp ? "Nhập kho" : "Xuất kho",
        code: t.code || t.id,
        date: t.date || t.createdAt,
        partner: t.person || t.partner || "—",
        detailsCount: t.detailsCount || 1,
        importQty: isImp ? (t.importQty || qty) : 0,
        exportQty: !isImp ? (t.exportQty || qty) : 0,
        importAmount: isImp ? (t.importAmount || amt) : 0,
        exportAmount: !isImp ? (t.exportAmount || amt) : 0,
        note: t.note || t.reason || "",
      };
    }).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  }

  const totalImportQuantity = passedImportUnits !== undefined ? Number(passedImportUnits) : list.reduce((s, row) => s + Number(row.importQty || 0), 0);
  const totalExportQuantity = passedExportUnits !== undefined ? Number(passedExportUnits) : list.reduce((s, row) => s + Number(row.exportQty || 0), 0);
  const totalImportVal = passedImportVal !== undefined ? Number(passedImportVal) : list.reduce((s, row) => s + Number(row.importAmount || 0), 0);
  const totalExportVal = passedExportVal !== undefined ? Number(passedExportVal) : list.reduce((s, row) => s + Number(row.exportAmount || 0), 0);

  const importCount = list.filter((r) => r.type === "import").length;
  const exportCount = list.filter((r) => r.type === "export").length;

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO TỔNG HỢP NHẬP – XUẤT KHO",
      subTitle: getPeriodString(dateFrom, dateTo),
      formNo: "SỔ THEO DÕI BIẾN ĐỘNG KHO HÀNG",
      standardText: "Kèm theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 9.5pt;">
      <div><strong>Phát sinh Nhập:</strong> <span class="mono">${importCount}</span> phiếu | <strong>SL Nhập:</strong> <span class="mono" style="font-weight: bold;">${fmtNumber(totalImportQuantity)}</span> | <strong>Giá trị Nhập:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalImportVal)} đ</span></div>
      <div><strong>Phát sinh Xuất:</strong> <span class="mono">${exportCount}</span> phiếu | <strong>SL Xuất:</strong> <span class="mono" style="font-weight: bold;">${fmtNumber(totalExportQuantity)}</span> | <strong>Giá trị Xuất:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalExportVal)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 4%">STT</th>
          <th style="width: 8%">Ngày</th>
          <th style="width: 8%">Nghiệp vụ</th>
          <th style="width: 9%">Số chứng từ</th>
          <th style="width: 21%">Đối tác / Diễn giải</th>
          <th style="width: 6%">Số mặt hàng</th>
          <th style="width: 7%">SL Nhập</th>
          <th style="width: 7%">SL Xuất</th>
          <th style="width: 11%">Giá trị Nhập (đ)</th>
          <th style="width: 11%">Giá trị Xuất (đ)</th>
          <th style="width: 8%">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((r, idx) => `
          <tr>
            <td class="center mono">${idx + 1}</td>
            <td class="center">${formatDate(r.date)}</td>
            <td class="center">
              <span style="font-weight: 600; color: ${r.type === "import" ? "#047857" : "#b45309"};">
                ${esc(r.typeLabel)}
              </span>
            </td>
            <td class="center"><strong>${esc(r.code)}</strong></td>
            <td class="left">${esc(r.partner)}</td>
            <td class="center mono">${r.detailsCount}</td>
            <td class="right mono">${r.importQty > 0 ? fmtNumber(r.importQty) : "—"}</td>
            <td class="right mono">${r.exportQty > 0 ? fmtNumber(r.exportQty) : "—"}</td>
            <td class="right mono" style="font-weight: ${r.importAmount > 0 ? "bold" : "normal"};">${r.importAmount > 0 ? fmtMoney(r.importAmount) : "—"}</td>
            <td class="right mono" style="font-weight: ${r.exportAmount > 0 ? "bold" : "normal"};">${r.exportAmount > 0 ? fmtMoney(r.exportAmount) : "—"}</td>
            <td class="left" style="font-size: 8.5pt;">${esc(r.note || "—")}</td>
          </tr>
        `).join("")}
        ${list.length === 0 ? `
          <tr>
            <td colspan="11" class="center" style="padding: 24px; font-style: italic;">
              Không có phát sinh giao dịch nhập xuất kho nào trong kỳ báo cáo
            </td>
          </tr>
        ` : ""}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="6" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng phát sinh:</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(totalImportQuantity)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(totalExportQuantity)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalImportVal)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalExportVal)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote" style="display: flex; flex-direction: column; gap: 3px;">
      <div><strong>Tổng giá trị nhập kho bằng chữ:</strong> ${amountToWords(totalImportVal)}</div>
      <div><strong>Tổng giá trị xuất kho bằng chữ:</strong> ${amountToWords(totalExportVal)}</div>
    </div>

    ${sigRow4Warehouse({ user, role: "Thủ kho" })}
  `;

  return wrapPage(bodyHtml, true, "Báo cáo Tổng Hợp Nhập - Xuất Kho - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. BÁO CÁO TỔNG HỢP NHẬP - XUẤT - TỒN (A4 LANDSCAPE - MẪU S11/S12-DN)
// ─────────────────────────────────────────────────────────────────────────────

export function buildInventoryHtml({ products = [], dateFrom, dateTo, summary = {}, storeConfig }) {
  const user = getCurrentUser();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  let sumBeginningQty = 0;
  let sumBeginningVal = 0;
  let sumImportQty = 0;
  let sumImportVal = 0;
  let sumExportQty = 0;
  let sumExportVal = 0;
  let sumAdjQty = 0;
  let sumAdjVal = 0;
  let sumEndingQty = 0;
  let sumEndingVal = 0;

  const rows = products.map((p, idx) => {
    const code = p.MaSP || p.code || `SP${String(idx + 1).padStart(3, "0")}`;
    const name = p.TenSP || p.name || "Sản phẩm";
    const uom = p.DonViTinh || p.dvt || p.DVT || "Cái";
    const price = Number(p.GiaNhap || p.GiaBan || 0);

    const begQty = Number(p.TonDau ?? (p.stock || 0));
    const begVal = Number(p.ThanhTienTonDau !== undefined ? p.ThanhTienTonDau : (begQty * price));
    const impQty = Number(p.NhapTrongKy ?? 0);
    const impVal = Number(p.ThanhTienNhap !== undefined ? p.ThanhTienNhap : (impQty * price));
    const expQty = Number(p.XuatTrongKy ?? 0);
    const expVal = Number(p.ThanhTienXuat !== undefined ? p.ThanhTienXuat : (expQty * price));
    const adjQty = Number(p.DieuChinh ?? 0);
    const adjVal = Number(p.ThanhTienDieuChinh !== undefined ? p.ThanhTienDieuChinh : (adjQty * price));
    const endQty = Number(p.TonCuoi ?? p.stock ?? (begQty + impQty - expQty + adjQty));
    const endVal = Number(p.ThanhTienTonCuoi !== undefined ? p.ThanhTienTonCuoi : (p.GiaTriTon !== undefined ? p.GiaTriTon : (endQty * price)));

    sumBeginningQty += begQty;
    sumBeginningVal += begVal;
    sumImportQty += impQty;
    sumImportVal += impVal;
    sumExportQty += expQty;
    sumExportVal += expVal;
    sumAdjQty += adjQty;
    sumAdjVal += adjVal;
    sumEndingQty += endQty;
    sumEndingVal += endVal;

    return `
      <tr>
        <td class="center mono">${idx + 1}</td>
        <td class="center mono"><strong>${esc(code)}</strong></td>
        <td class="left">${esc(name)}</td>
        <td class="center">${esc(uom)}</td>
        <td class="right mono">${fmtMoney(price)}</td>
        <td class="right mono">${fmtNumber(begQty)}</td>
        <td class="right mono">${fmtMoney(begVal)}</td>
        <td class="right mono">${fmtNumber(impQty)}</td>
        <td class="right mono">${fmtMoney(impVal)}</td>
        <td class="right mono">${fmtNumber(expQty)}</td>
        <td class="right mono">${fmtMoney(expVal)}</td>
        <td class="right mono">${adjQty !== 0 ? (adjQty > 0 ? "+" + fmtNumber(adjQty) : fmtNumber(adjQty)) : "—"}</td>
        <td class="right mono">${adjVal !== 0 ? fmtMoney(adjVal) : "—"}</td>
        <td class="right mono" style="font-weight: bold;">${fmtNumber(endQty)}</td>
        <td class="right mono" style="font-weight: bold;">${fmtMoney(endVal)}</td>
      </tr>
    `;
  }).join("");

  if (summary.totalBeginningStock !== undefined) sumBeginningQty = Number(summary.totalBeginningStock);
  if (summary.totalBeginningValue !== undefined) sumBeginningVal = Number(summary.totalBeginningValue);
  if (summary.totalImportStock !== undefined) sumImportQty = Number(summary.totalImportStock);
  if (summary.totalImportValue !== undefined) sumImportVal = Number(summary.totalImportValue);
  if (summary.totalExportStock !== undefined) sumExportQty = Number(summary.totalExportStock);
  if (summary.totalExportValue !== undefined) sumExportVal = Number(summary.totalExportValue);
  if (summary.totalAdjustmentStock !== undefined) sumAdjQty = Number(summary.totalAdjustmentStock);
  if (summary.totalAdjustmentValue !== undefined) sumAdjVal = Number(summary.totalAdjustmentValue);
  if (summary.totalEndingStock !== undefined) sumEndingQty = Number(summary.totalEndingStock);
  if (summary.totalInventoryValue !== undefined) sumEndingVal = Number(summary.totalInventoryValue);

  const bodyHtml = `
    ${accountingHeader({
      title: "BẢNG TỔNG HỢP NHẬP - XUẤT - TỒN KHO",
      subTitle: getPeriodString(dateFrom, dateTo) + " · Công thức: Tồn cuối = Tồn đầu + Nhập - Xuất ± Điều chỉnh",
      formNo: "Mẫu số S11-DN / S12-DN",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <table class="rpt-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 3%">STT</th>
          <th rowspan="2" style="width: 7%">Mã SP</th>
          <th rowspan="2" style="width: 18%">Tên sản phẩm</th>
          <th rowspan="2" style="width: 5%">ĐVT</th>
          <th rowspan="2" style="width: 7%">Đơn giá (đ)</th>
          <th colspan="2">Tồn đầu kỳ</th>
          <th colspan="2">Nhập trong kỳ</th>
          <th colspan="2">Xuất trong kỳ</th>
          <th colspan="2">Điều chỉnh kho</th>
          <th colspan="2">Tồn cuối kỳ</th>
        </tr>
        <tr>
          <th style="width: 4%">SL</th>
          <th style="width: 7%">Thành tiền</th>
          <th style="width: 4%">SL</th>
          <th style="width: 7%">Thành tiền</th>
          <th style="width: 4%">SL</th>
          <th style="width: 7%">Thành tiền</th>
          <th style="width: 4%">SL</th>
          <th style="width: 6%">Thành tiền</th>
          <th style="width: 4%">SL</th>
          <th style="width: 8%">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="15" class="center" style="padding:24px; color:#94A3B8">Không có dữ liệu tồn kho trong kỳ báo cáo</td></tr>`}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="5" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng (${products.length} mặt hàng):</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(sumBeginningQty)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(sumBeginningVal)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(sumImportQty)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(sumImportVal)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(sumExportQty)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(sumExportVal)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(sumAdjQty)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(sumAdjVal)}</td>
          <td class="right mono" style="font-weight: bold; font-size: 10.5pt;">${fmtNumber(sumEndingQty)}</td>
          <td class="right mono" style="font-weight: bold; font-size: 10.5pt;">${fmtMoney(sumEndingVal)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Hà Nội, ngày ${day} tháng ${month} năm ${year}
    </div>

    ${sigRow4Warehouse({ user, role: "Thủ kho" })}
  `;

  return wrapPage(bodyHtml, true, "Bảng Tổng Hợp Nhập - Xuất - Tồn - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (MẪU SỐ B 02 - DN)
// (Kèm theo Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính)
// ─────────────────────────────────────────────────────────────────────────────

export function buildIncomeStatementHtml({ items = [], year, curPeriod = {}, prevPeriod = {}, summary = {}, storeConfig }) {
  const targetYear = year || new Date().getFullYear();
  const user = getCurrentUser();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH",
      subTitle: `Kỳ kế toán: ${curPeriod.label || `Năm ${targetYear}`} (${formatDate(curPeriod.from)} – ${formatDate(curPeriod.to)})`,
      formNo: "Mẫu số B 02 - DN",
      standardText: "Kèm theo Thông tư số 99/2025/TT-BTC ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <table class="rpt-table" style="margin-top: 6px;">
      <thead>
        <tr>
          <th style="width: 48%">CHỈ TIÊU</th>
          <th style="width: 8%">Mã số</th>
          <th style="width: 10%">Thuyết minh</th>
          <th style="width: 17%">Năm nay</th>
          <th style="width: 17%">Năm trước</th>
        </tr>
        <tr style="font-style: italic; font-size: 8.5pt; background: #fafafa;">
          <th class="center">1</th>
          <th class="center">2</th>
          <th class="center">3</th>
          <th class="center">4</th>
          <th class="center">5</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr style="${item.isBold ? 'font-weight: bold;' : ''}">
            <td class="left" style="${item.isSub ? 'padding-left: 20px; font-style: italic;' : ''}">${esc(item.name)}</td>
            <td class="center mono">${esc(item.code)}</td>
            <td class="center mono" style="font-size: 8.5pt; color: #333;">${esc(item.note || "")}</td>
            <td class="right mono">${item.na ? "—" : fmtMoney(item.cur)}</td>
            <td class="right mono">${item.na ? "—" : fmtMoney(item.prev)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div style="font-size: 9.5pt; font-style: italic; margin-top: 6px; margin-bottom: 8px; color: #333;">
      (*) Chỉ tiêu mã số 70 và 71 chỉ áp dụng tại công ty cổ phần.
    </div>

    <div style="display: flex; justify-content: flex-end; margin-top: 12px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Phê duyệt, ngày ${day} tháng ${month} năm ${targetYear}
    </div>

    ${sigRow3Legal({ user, thirdRole: "Người đại diện theo pháp luật" })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Kết quả Hoạt động Kinh doanh - Mẫu B 02-DN");
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. SỔ CHI TIẾT VẬT LIỆU, DỤNG CỤ, SẢN PHẨM, HÀNG HÓA (MẪU SỐ S10-DN)
// (Kèm theo Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính)
// ─────────────────────────────────────────────────────────────────────────────

export function buildProductLedgerHtml({ product = {}, data = [], from, to, tonDauQty = 0, tonDauAmount = 0, totalNhapQty = 0, totalNhapAmount = 0, totalXuatQty = 0, totalXuatAmount = 0, tonCuoiQty = 0, tonCuoiAmount = 0, storeConfig }) {
  const user = getCurrentUser();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const bodyHtml = `
    ${accountingHeader({
      title: "SỔ CHI TIẾT VẬT LIỆU, DỤNG CỤ (SẢN PHẨM, HÀNG HOÁ)",
      subTitle: getPeriodString(from, to),
      formNo: "Mẫu số S10-DN",
      standardText: "Kèm theo Thông tư số 99/2025/TT-BTC ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính",
      extraRight: "<div>Đơn vị tính: " + esc(product.unit || "Cái") + "</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 10.5pt; border-bottom: 1px dashed #000; padding-bottom: 5px;">
      <div><strong>Tài khoản:</strong> ${esc(product.account || "156")} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Tên kho:</strong> ${esc(product.warehouse || "Kho chính")}</div>
      <div><strong>Tên, quy cách:</strong> <span style="font-weight: bold; text-transform: uppercase;">${esc(product.name || "Sản phẩm")}</span> (Mã: <strong>${esc(product.code || "")}</strong>)</div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th colspan="2">Chứng từ</th>
          <th rowspan="2" style="width: 24%">Diễn giải</th>
          <th rowspan="2" style="width: 6%">TK đối ứng</th>
          <th rowspan="2" style="width: 9%">Đơn giá (đ)</th>
          <th colspan="2">Nhập</th>
          <th colspan="2">Xuất</th>
          <th colspan="2">Tồn</th>
          <th rowspan="2" style="width: 8%">Ghi chú</th>
        </tr>
        <tr>
          <th style="width: 7%">Số hiệu</th>
          <th style="width: 8%">Ngày</th>
          <th style="width: 5%">SL</th>
          <th style="width: 9%">Thành tiền</th>
          <th style="width: 5%">SL</th>
          <th style="width: 9%">Thành tiền</th>
          <th style="width: 5%">SL</th>
          <th style="width: 9%">Thành tiền</th>
        </tr>
        <tr style="font-style: italic; font-size: 8pt; background: #fafafa;">
          <th class="center">A</th>
          <th class="center">B</th>
          <th class="center">C</th>
          <th class="center">D</th>
          <th class="center">1</th>
          <th class="center">2</th>
          <th class="center">3=1x2</th>
          <th class="center">4</th>
          <th class="center">5=1x4</th>
          <th class="center">6</th>
          <th class="center">7=1x6</th>
          <th class="center">8</th>
        </tr>
      </thead>
      <tbody>
        <!-- Dòng số dư đầu kỳ -->
        <tr style="font-weight: bold; background: #fdfdfd;">
          <td class="center">—</td>
          <td class="center">—</td>
          <td class="left">Số dư đầu kỳ</td>
          <td class="center">—</td>
          <td class="right mono">${fmtMoney(product.costPrice || 0)}</td>
          <td class="right mono">—</td>
          <td class="right mono">—</td>
          <td class="right mono">—</td>
          <td class="right mono">—</td>
          <td class="right mono">${fmtNumber(tonDauQty)}</td>
          <td class="right mono">${fmtMoney(tonDauAmount)}</td>
          <td class="center">—</td>
        </tr>

        <!-- Các dòng phát sinh -->
        ${data.map((r) => `
          <tr>
            <td class="center mono"><strong>${esc(r.voucherCode)}</strong></td>
            <td class="center">${formatDate(r.voucherDate)}</td>
            <td class="left">${esc(r.description)}</td>
            <td class="center mono">${esc(r.tkDoiUng || "")}</td>
            <td class="right mono">${fmtMoney(r.price)}</td>
            <td class="right mono">${r.nhapQty > 0 ? fmtNumber(r.nhapQty) : "—"}</td>
            <td class="right mono">${r.nhapAmount > 0 ? fmtMoney(r.nhapAmount) : "—"}</td>
            <td class="right mono">${r.xuatQty > 0 ? fmtNumber(r.xuatQty) : "—"}</td>
            <td class="right mono">${r.xuatAmount > 0 ? fmtMoney(r.xuatAmount) : "—"}</td>
            <td class="right mono" style="font-weight: bold;">${fmtNumber(r.tonQty)}</td>
            <td class="right mono" style="font-weight: bold;">${fmtMoney(r.tonAmount)}</td>
            <td class="left" style="font-size: 8.5pt;">${esc(r.note || "")}</td>
          </tr>
        `).join("")}

        <!-- Dòng cộng phát sinh trong kỳ -->
        <tr class="rpt-total-row">
          <td colspan="4" class="right" style="font-weight: bold; text-transform: uppercase;">Cộng phát sinh trong kỳ:</td>
          <td class="center mono">x</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(totalNhapQty)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalNhapAmount)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtNumber(totalXuatQty)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalXuatAmount)}</td>
          <td class="center mono">x</td>
          <td class="center mono">x</td>
          <td></td>
        </tr>

        <!-- Dòng số dư cuối kỳ -->
        <tr style="font-weight: bold; background: #fdfdfd;">
          <td colspan="4" class="right" style="text-transform: uppercase;">Số dư cuối kỳ:</td>
          <td class="right mono">${fmtMoney(product.costPrice || 0)}</td>
          <td class="center mono">—</td>
          <td class="center mono">—</td>
          <td class="center mono">—</td>
          <td class="center mono">—</td>
          <td class="right mono" style="font-size: 10.5pt;">${fmtNumber(tonCuoiQty)}</td>
          <td class="right mono" style="font-size: 10.5pt;">${fmtMoney(tonCuoiAmount)}</td>
          <td class="center">—</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; font-size: 10pt; font-style: italic; margin-top: 8px;">
      <div>- Sổ này có 01 trang, đánh số từ trang 01 đến trang 01</div>
      <div>- Ngày mở sổ: 01/01/${year}</div>
    </div>

    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Ngày ${day} tháng ${month} năm ${year}
    </div>

    ${sigRow3Legal({ user, firstRole: "Người ghi sổ", thirdRole: "Người đại diện theo pháp luật" })}
  `;

  return wrapPage(bodyHtml, true, `Sổ chi tiết hàng hóa ${product.code || ""} - Mẫu S10-DN`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. SỔ NHẬT KÝ CHUNG (MẪU SỐ S03a-DNN)
// (Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)
// ─────────────────────────────────────────────────────────────────────────────

export function buildGeneralJournalHtml({ data = [], totalDebit = 0, totalCredit = 0, from, to, year, storeConfig }) {
  const user = getCurrentUser();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const targetYear = year || now.getFullYear();

  const bodyHtml = `
    ${accountingHeader({
      title: "SỔ NHẬT KÝ CHUNG",
      subTitle: `Năm ${targetYear}` + (from && to ? ` (Từ ${formatDate(from)} đến ${formatDate(to)})` : ""),
      formNo: "Mẫu số S03a-DNN",
      standardText: "Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <table class="rpt-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 10%">Ngày tháng ghi sổ</th>
          <th colspan="2">Chứng từ</th>
          <th rowspan="2" style="width: 32%">Diễn giải</th>
          <th rowspan="2" style="width: 6%">Đã ghi Sổ Cái</th>
          <th rowspan="2" style="width: 5%">STT dòng</th>
          <th rowspan="2" style="width: 9%">Số hiệu TK đối ứng</th>
          <th colspan="2">Số phát sinh (đ)</th>
        </tr>
        <tr>
          <th style="width: 10%">Số hiệu</th>
          <th style="width: 9%">Ngày tháng</th>
          <th style="width: 13%">Nợ</th>
          <th style="width: 13%">Có</th>
        </tr>
        <tr style="font-style: italic; font-size: 8pt; background: #fafafa;">
          <th class="center">A</th>
          <th class="center">B</th>
          <th class="center">C</th>
          <th class="center">D</th>
          <th class="center">E</th>
          <th class="center">G</th>
          <th class="center">H</th>
          <th class="center">1</th>
          <th class="center">2</th>
        </tr>
      </thead>
      <tbody>
        <tr style="font-style: italic; background: #fdfdfd;">
          <td colspan="7" class="left" style="padding-left: 14px;">Số trang trước chuyển sang:</td>
          <td class="right mono">—</td>
          <td class="right mono">—</td>
        </tr>

        ${data.map((r, idx) => `
          <tr>
            <td class="center">${formatDate(r.date)}</td>
            <td class="center mono"><strong>${esc(r.voucherCode)}</strong></td>
            <td class="center">${formatDate(r.voucherDate)}</td>
            <td class="left">${esc(r.description)}</td>
            <td class="center">${esc(r.postedLedger || "X")}</td>
            <td class="center mono">${r.lineNo || (idx + 1)}</td>
            <td class="center mono" style="font-weight: bold;">${esc(r.accountDebit || r.accountCredit || "")}</td>
            <td class="right mono">${r.debitAmount > 0 ? fmtMoney(r.debitAmount) : ""}</td>
            <td class="right mono">${r.creditAmount > 0 ? fmtMoney(r.creditAmount) : ""}</td>
          </tr>
        `).join("")}

        <tr style="font-style: italic; background: #fdfdfd;">
          <td colspan="4" class="left" style="padding-left: 14px;">Cộng chuyển sang trang sau:</td>
          <td class="center">x</td>
          <td class="center">x</td>
          <td class="center">x</td>
          <td class="right mono">${fmtMoney(totalDebit)}</td>
          <td class="right mono">${fmtMoney(totalCredit)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="7" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng số phát sinh:</td>
          <td class="right mono" style="font-weight: bold; font-size: 10.5pt;">${fmtMoney(totalDebit)}</td>
          <td class="right mono" style="font-weight: bold; font-size: 10.5pt;">${fmtMoney(totalCredit)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="display: flex; justify-content: space-between; font-size: 10pt; font-style: italic; margin-top: 8px;">
      <div>- Sổ này có 01 trang, đánh số từ trang 01 đến trang 01</div>
      <div>- Ngày mở sổ: 01/01/${targetYear}</div>
    </div>

    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Ngày ${day} tháng ${month} năm ${targetYear}
    </div>

    ${sigRow3Legal({ user, firstRole: "Người lập biểu", thirdRole: "Người đại diện theo pháp luật" })}
  `;

  return wrapPage(bodyHtml, false, "Sổ Nhật Ký Chung - Mẫu S03a-DNN");
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. SỔ TÀI SẢN CỐ ĐỊNH (MẪU SỐ S21-DN)
// (Ban hành theo Thông tư số 200/2014/TT-BTC Ngày 22/12/2014 của Bộ Tài chính)
// ─────────────────────────────────────────────────────────────────────────────

export function buildFixedAssetsHtml({ year, notice, nextSteps = [], storeConfig }) {
  const user = getCurrentUser();
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const targetYear = year || now.getFullYear();

  const bodyHtml = `
    ${accountingHeader({
      title: "SỔ TÀI SẢN CỐ ĐỊNH",
      subTitle: `Năm ${targetYear} · Loại tài sản: Toàn bộ TSCĐ hữu hình & vô hình`,
      formNo: "Mẫu số S21-DN",
      standardText: "Ban hành theo Thông tư số 200/2014/TT-BTC Ngày 22/12/2014 của Bộ Tài chính",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <table class="rpt-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 4%">STT</th>
          <th colspan="2">Chứng từ ghi tăng</th>
          <th rowspan="2" style="width: 17%">Tên, đặc điểm, ký hiệu TSCĐ</th>
          <th rowspan="2" style="width: 8%">Nước SX</th>
          <th rowspan="2" style="width: 8%">Tháng năm đưa vào SD</th>
          <th rowspan="2" style="width: 8%">Số hiệu TSCĐ</th>
          <th rowspan="2" style="width: 10%">Nguyên giá TSCĐ (đ)</th>
          <th colspan="3">Khấu hao TSCĐ</th>
          <th colspan="2">Chứng từ ghi giảm</th>
          <th rowspan="2" style="width: 10%">Lý do giảm TSCĐ</th>
        </tr>
        <tr>
          <th style="width: 7%">Số hiệu</th>
          <th style="width: 7%">Ngày tháng</th>
          <th style="width: 6%">Tỷ lệ (%)</th>
          <th style="width: 8%">Mức KH (đ)</th>
          <th style="width: 9%">KH đã tính đến khi giảm</th>
          <th style="width: 6%">Số hiệu</th>
          <th style="width: 7%">Ngày tháng</th>
        </tr>
        <tr style="font-style: italic; font-size: 8pt; background: #fafafa;">
          <th class="center">A</th>
          <th class="center">B</th>
          <th class="center">C</th>
          <th class="center">D</th>
          <th class="center">E</th>
          <th class="center">G</th>
          <th class="center">H</th>
          <th class="center">1</th>
          <th class="center">2</th>
          <th class="center">3</th>
          <th class="center">4</th>
          <th class="center">I</th>
          <th class="center">K</th>
          <th class="center">L</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="14" class="center" style="padding: 28px; font-style: italic; line-height: 1.6; color: #475569;">
            <div style="font-weight: bold; font-size: 11pt; color: #0F172A; margin-bottom: 6px;">
              Chưa có dữ liệu phát sinh tài sản cố định trong kỳ báo cáo
            </div>
            <div>
              ${esc(notice || "Hệ thống ERP hiện tại tập trung vận hành Bán hàng POS, Quản lý kho, Công nợ và Quỹ tiền mặt. Module Quản trị Tài sản Cố định & Khấu hao tự động (TSCĐ) chưa được tích hợp trong cơ sở dữ liệu hiện hành.")}
            </div>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="7" class="right" style="font-weight: bold;">Cộng:</td>
          <td class="right mono">0</td>
          <td class="center">x</td>
          <td class="right mono">0</td>
          <td class="right mono">0</td>
          <td class="center">x</td>
          <td class="center">x</td>
          <td class="center">x</td>
        </tr>
      </tfoot>
    </table>

    <div style="display: flex; justify-content: space-between; font-size: 10pt; font-style: italic; margin-top: 8px;">
      <div>- Sổ này có 01 trang, đánh số từ trang 01 đến trang 01</div>
      <div>- Ngày mở sổ: 01/01/${targetYear}</div>
    </div>

    <div style="display: flex; justify-content: flex-end; margin-top: 14px; margin-bottom: 6px; font-style: italic; font-size: 10.5pt;">
      Ngày ${day} tháng ${month} năm ${targetYear}
    </div>

    ${sigRow3Legal({ user, firstRole: "Người ghi sổ", thirdRole: "Giám đốc" })}
  `;

  return wrapPage(bodyHtml, true, "Sổ Tài Sản Cố Định - Mẫu S21-DN");
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. BÁO CÁO CÔNG NỢ (A4 LANDSCAPE)
// ─────────────────────────────────────────────────────────────────────────────

export function buildDebtsHtml({ debts = [], customerDebts = [], supplierDebts = [], customers = [], suppliers = [], dateFrom, dateTo, storeConfig }) {
  const periodText = getPeriodString(dateFrom, dateTo);

  const cList = customerDebts.length > 0
    ? customerDebts
    : debts.filter((d) => d.type === "customers" || !!d.MaKH || !d.MaNCC);

  const sList = supplierDebts.length > 0
    ? supplierDebts
    : debts.filter((d) => d.type === "suppliers" || !!d.MaNCC);

  let totalCustDebt = 0;
  const cRows = cList.map((d, idx) => {
    const cust = customers.find((c) => c.id === d.MaKH || c.MaKH === d.MaKH);
    const name = cust?.HoTen || d.partnerName || d.TenKH || d.MaKH || "Khách hàng";
    const rem = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
    const issueDate = formatDate(d.NgayPhatSinh || d.createdAt);
    const dueDate = formatDate(d.HanThanhToan || d.NgayPhatSinh || d.createdAt);
    totalCustDebt += rem;

    return `
      <tr>
        <td class="center mono">${idx + 1}</td>
        <td class="left">${esc(name)}</td>
        <td class="right mono"><strong>${fmtMoney(rem)}</strong></td>
        <td class="center mono">${issueDate}</td>
        <td class="center mono">${dueDate}</td>
        <td class="center">${rem <= 0 ? "Đã trả hết" : "Còn nợ"}</td>
      </tr>
    `;
  }).join("");

  let totalSuppDebt = 0;
  const sRows = sList.map((d, idx) => {
    const supp = suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
    const name = supp?.TenNCC || d.partnerName || d.TenNCC || d.MaNCC || "Nhà cung cấp";
    const rem = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
    const issueDate = formatDate(d.NgayPhatSinh || d.createdAt);
    const dueDate = formatDate(d.HanThanhToan || d.NgayPhatSinh || d.createdAt);
    totalSuppDebt += rem;

    return `
      <tr>
        <td class="center mono">${idx + 1}</td>
        <td class="left">${esc(name)}</td>
        <td class="right mono"><strong>${fmtMoney(rem)}</strong></td>
        <td class="center mono">${issueDate}</td>
        <td class="center mono">${dueDate}</td>
        <td class="center">${rem <= 0 ? "Đã trả hết" : "Còn nợ"}</td>
      </tr>
    `;
  }).join("");

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO CÔNG NỢ CHI TIẾT",
      subTitle: periodText,
      formNo: "SỔ THEO DÕI CÔNG NỢ",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10.5pt;">
      <div><strong>Tổng công nợ phải thu (KH):</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalCustDebt)} đ</span></div>
      <div><strong>Tổng công nợ phải trả (NCC):</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalSuppDebt)} đ</span></div>
      <div><strong>Chênh lệch công nợ:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalCustDebt - totalSuppDebt)} đ</span></div>
    </div>

    <div class="flex-2col">
      <div class="col-half">
        <div class="sec-title">I. CÔNG NỢ PHẢI THU (Khách hàng)</div>
        <table class="rpt-table">
          <thead>
            <tr>
              <th style="width: 8%">STT</th>
              <th style="width: 32%">Khách hàng</th>
              <th style="width: 22%">Số tiền nợ</th>
              <th style="width: 19%">Ngày lập</th>
              <th style="width: 19%">Hạn trả</th>
            </tr>
          </thead>
          <tbody>
            ${cRows || `<tr><td colspan="5" class="center" style="padding:12px; font-style:italic">Không có công nợ phải thu</td></tr>`}
          </tbody>
          <tfoot>
            <tr class="rpt-total-row">
              <td colspan="2" class="center">Tổng phải thu:</td>
              <td class="right mono">${fmtMoney(totalCustDebt)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="col-half">
        <div class="sec-title">II. CÔNG NỢ PHẢI TRẢ (Nhà cung cấp)</div>
        <table class="rpt-table">
          <thead>
            <tr>
              <th style="width: 8%">STT</th>
              <th style="width: 32%">Nhà cung cấp</th>
              <th style="width: 22%">Số tiền nợ</th>
              <th style="width: 19%">Ngày lập</th>
              <th style="width: 19%">Hạn trả</th>
            </tr>
          </thead>
          <tbody>
            ${sRows || `<tr><td colspan="5" class="center" style="padding:12px; font-style:italic">Không có công nợ phải trả</td></tr>`}
          </tbody>
          <tfoot>
            <tr class="rpt-total-row">
              <td colspan="2" class="center">Tổng phải trả:</td>
              <td class="right mono">${fmtMoney(totalSuppDebt)}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    ${sigRow3Legal({ user: getCurrentUser(), firstRole: "Người lập biểu", thirdRole: "Giám đốc" })}
  `;

  return wrapPage(bodyHtml, true, "Báo cáo Công Nợ - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. BÁO CÁO THU - CHI TỔNG HỢP (A4 LANDSCAPE)
// ─────────────────────────────────────────────────────────────────────────────

export function buildCashFlowHtml({ entries = [], totalThu = 0, totalChi = 0, dateFrom, dateTo, storeConfig }) {
  const periodText = getPeriodString(dateFrom, dateTo);
  const balance = totalThu - totalChi;

  const rows = entries.map((e, idx) => `
    <tr>
      <td class="center mono">${idx + 1}</td>
      <td class="center">${formatDate(e.date)}</td>
      <td class="center"><strong>${esc(e.code || e.number)}</strong></td>
      <td class="center">${e.type === "thu" ? "Thu" : "Chi"}</td>
      <td class="left">${esc(e.person || "—")}</td>
      <td class="left">${esc(e.reason || "—")}</td>
      <td class="right mono">${e.type === "thu" ? fmtMoney(e.amount) : "—"}</td>
      <td class="right mono">${e.type === "chi" ? fmtMoney(e.amount) : "—"}</td>
    </tr>
  `).join("");

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO TỔNG HỢP THU – CHI",
      subTitle: periodText,
      formNo: "SỔ QUỸ TIỀN MẶT TỔNG HỢP",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10.5pt;">
      <div><strong>Tổng thu:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalThu)} đ</span></div>
      <div><strong>Tổng chi:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalChi)} đ</span></div>
      <div><strong>Chênh lệch quỹ:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(balance)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 11%">Ngày chứng từ</th>
          <th style="width: 12%">Số phiếu</th>
          <th style="width: 8%">Loại</th>
          <th style="width: 22%">Đối tượng</th>
          <th style="width: 24%">Nội dung</th>
          <th style="width: 9%">Thu (đ)</th>
          <th style="width: 9%">Chi (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="8" class="center" style="padding:16px; font-style:italic">Không có phát sinh thu chi trong kỳ</td></tr>`}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="6" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng phát sinh:</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalThu)}</td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalChi)}</td>
        </tr>
      </tfoot>
    </table>

    ${sigRow4Cash({ user: getCurrentUser() })}
  `;

  return wrapPage(bodyHtml, true, "Báo cáo Thu - Chi Tổng Hợp - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. BÁO CÁO DOANH SỐ BÁN HÀNG THEO NHÂN VIÊN (A4 PORTRAIT)
// ─────────────────────────────────────────────────────────────────────────────

export function buildSalesByEmployeeHtml({ data = [], totalRevenue = 0, totalInvoices = 0, dateFrom, dateTo, storeConfig }) {
  const periodText = getPeriodString(dateFrom, dateTo);

  const rows = data.map((r, idx) => `
    <tr>
      <td class="center mono">${r.stt || (idx + 1)}</td>
      <td class="center mono"><strong>${esc(r.empCode)}</strong></td>
      <td class="left">${esc(r.empName)}</td>
      <td class="left">${esc(r.position)}</td>
      <td class="right mono">${fmtNumber(r.invoicesCount)}</td>
      <td class="right mono">${fmtNumber(r.totalProductsSold)}</td>
      <td class="right mono" style="font-weight: bold;">${fmtMoney(r.totalRevenue)}</td>
    </tr>
  `).join("");

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO DOANH SỐ BÁN HÀNG THEO NHÂN VIÊN",
      subTitle: periodText,
      formNo: "QUẢN TRỊ BÁN HÀNG NỘI BỘ",
      standardText: "Hệ thống quản lý chuỗi Cửa hàng Mẹ & Bé",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; border: 1px solid #000; font-size: 10.5pt;">
      <div><strong>Tổng số nhân sự:</strong> <span class="mono">${data.length}</span> nhân viên</div>
      <div><strong>Tổng số hóa đơn:</strong> <span class="mono">${fmtNumber(totalInvoices)}</span> đơn</div>
      <div><strong>Tổng doanh số:</strong> <span class="mono" style="font-weight: bold;">${fmtMoney(totalRevenue)} đ</span></div>
    </div>

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 5%">STT</th>
          <th style="width: 12%">Mã NV</th>
          <th style="width: 25%">Họ tên nhân viên</th>
          <th style="width: 18%">Vị trí / Chức vụ</th>
          <th style="width: 12%">Số HĐ</th>
          <th style="width: 12%">Số SP bán</th>
          <th style="width: 16%">Doanh số (đ)</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="7" class="center" style="padding:20px; font-style:italic">Không có phát sinh bán hàng trong kỳ</td></tr>`}
      </tbody>
      <tfoot>
        <tr class="rpt-total-row">
          <td colspan="4" class="right" style="font-weight: bold; text-transform: uppercase;">Tổng cộng:</td>
          <td class="right mono">${fmtNumber(totalInvoices)}</td>
          <td></td>
          <td class="right mono" style="font-weight: bold;">${fmtMoney(totalRevenue)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="words-footnote">
      <strong>Số tiền viết bằng chữ:</strong> ${amountToWords(totalRevenue)}
    </div>

    ${sigRow3Legal({ user: getCurrentUser(), firstRole: "Người lập biểu", thirdRole: "Giám đốc" })}
  `;

  return wrapPage(bodyHtml, false, "Báo cáo Doanh Số Nhân Viên - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// 16. BÁO CÁO KIỂM KÊ VÀ ĐIỀU CHỈNH KHO (A4 LANDSCAPE)
// ─────────────────────────────────────────────────────────────────────────────

export function buildStocktakeAdjustmentsHtml({ data = [], dateFrom, dateTo, storeConfig }) {
  const periodText = getPeriodString(dateFrom, dateTo);

  const rows = data.map((r, idx) => `
    <tr>
      <td class="center mono">${r.stt || (idx + 1)}</td>
      <td class="center">${formatDate(r.date)}</td>
      <td class="center mono"><strong>${esc(r.voucherCode)}</strong></td>
      <td class="center mono">${esc(r.productCode)}</td>
      <td class="left">${esc(r.productName)}</td>
      <td class="center">${esc(r.unit)}</td>
      <td class="right mono">${r.qtyDiff > 0 ? "+" + fmtNumber(r.qtyDiff) : fmtNumber(r.qtyDiff)}</td>
      <td class="right mono">${fmtMoney(r.unitPrice)}</td>
      <td class="right mono" style="font-weight: bold;">${fmtMoney(r.amountDiff)}</td>
      <td class="center">${esc(r.type)}</td>
      <td class="left" style="font-size: 8.5pt;">${esc(r.reason)}</td>
    </tr>
  `).join("");

  const bodyHtml = `
    ${accountingHeader({
      title: "BÁO CÁO KIỂM KÊ VÀ ĐIỀU CHỈNH KHO",
      subTitle: periodText,
      formNo: "SỔ THEO DÕI XỬ LÝ CHÊNH LỆCH KHO",
      standardText: "Theo chế độ Kế toán Doanh nghiệp Việt Nam",
      extraRight: "<div>Đơn vị tính: VNĐ</div>",
    })}

    <table class="rpt-table">
      <thead>
        <tr>
          <th style="width: 4%">STT</th>
          <th style="width: 8%">Ngày</th>
          <th style="width: 9%">Số phiếu ĐC</th>
          <th style="width: 8%">Mã hàng</th>
          <th style="width: 18%">Tên hàng hóa</th>
          <th style="width: 5%">ĐVT</th>
          <th style="width: 7%">SL chênh lệch</th>
          <th style="width: 9%">Đơn giá vốn</th>
          <th style="width: 11%">Trị giá chênh lệch</th>
          <th style="width: 9%">Loại điều chỉnh</th>
          <th style="width: 12%">Lý do xử lý</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="11" class="center" style="padding:20px; font-style:italic">Không có biên bản điều chỉnh kiểm kê kho trong kỳ</td></tr>`}
      </tbody>
    </table>

    ${sigRow4Warehouse({ user: getCurrentUser(), role: "Thủ kho" })}
  `;

  return wrapPage(bodyHtml, true, "Báo cáo Kiểm Kê Điều Chỉnh Kho - Cửa hàng Mẹ & Bé");
}

// ─────────────────────────────────────────────────────────────────────────────
// CHỨC NĂNG IN CHÍNH ROUTER
// ─────────────────────────────────────────────────────────────────────────────

export function printReport(type, payload = {}) {
  let html = "";
  switch (type) {
    case "revenue":
      html = buildRevenueHtml(payload);
      break;
    case "inventory":
      html = buildInventoryHtml(payload);
      break;
    case "warehouse":
      html = buildWarehouseHtml(payload);
      break;
    case "debts":
      html = buildDebtsHtml(payload);
      break;
    case "cash-flow":
      html = buildCashFlowHtml(payload);
      break;
    case "cash-receipts":
      html = buildCashReceiptsHtml(payload);
      break;
    case "cash-payments":
      html = buildCashPaymentsHtml(payload);
      break;
    case "bank-receipts":
      html = buildBankReceiptsHtml(payload);
      break;
    case "bank-payments":
      html = buildBankPaymentsHtml(payload);
      break;
    case "warehouse-receipts":
      html = buildWarehouseReceiptsHtml(payload);
      break;
    case "warehouse-issues":
      html = buildWarehouseIssuesHtml(payload);
      break;
    case "income-statement":
      html = buildIncomeStatementHtml(payload);
      break;
    case "product-ledger":
      html = buildProductLedgerHtml(payload);
      break;
    case "general-journal":
      html = buildGeneralJournalHtml(payload);
      break;
    case "fixed-assets":
      html = buildFixedAssetsHtml(payload);
      break;
    case "sales-by-employee":
      html = buildSalesByEmployeeHtml(payload);
      break;
    case "stocktake-adjustments":
      html = buildStocktakeAdjustmentsHtml(payload);
      break;
    default:
      console.warn("Unknown report print type:", type);
      return;
  }

  const win = window.open("", "_blank", "width=1050,height=850,scrollbars=yes,resizable=yes");
  if (!win) {
    alert("Trình duyệt đã chặn cửa sổ in. Vui lòng cấp quyền pop-up cho trang web để xem và in bản báo cáo A4.");
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  win.onload = () => {
    setTimeout(() => {
      try {
        win.print();
      } catch (e) {
        console.error("Print trigger error:", e);
      }
    }, 450);
  };
}
