/**
<<<<<<< HEAD
 * reportPrint.js — Tạo và in báo cáo chuẩn Kế toán / ERP A4 cho Cửa hàng Mẹ & Bé
 * Dựa trên tham chiếu Reference 1 (Báo cáo công nợ & biểu mẫu kế toán)
=======
 * reportPrint.js — Tạo và in báo cáo dạng HTML cho cửa hàng Mẹ & Bé
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
 */

const moneyFmt = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function now() {
  return new Date().toLocaleString("vi-VN");
}

function getCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem("baby-shop-user") || "{}");
<<<<<<< HEAD
    return u.fullName || u.username || "Người lập biểu";
  } catch {
    return "Người lập biểu";
  }
}

const baseStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #1e293b;
    background: #f1f5f9;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 10px auto;
    padding: 16mm 18mm 16mm;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  }
  .mono {
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
  
  /* HEADER */
  .rpt-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #3D7068;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .rpt-brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rpt-logo {
    width: 40px;
    height: 40px;
    background: #3D7068;
    color: #FFFFFF;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 18px;
  }
  .rpt-brand-name {
    font-size: 16px;
    font-weight: 800;
    color: #2A4F49;
    letter-spacing: -0.3px;
    text-transform: uppercase;
  }
  .rpt-brand-sub {
    font-size: 11px;
    color: #475569;
    margin-top: 2px;
  }
  .rpt-meta {
    text-align: right;
    font-size: 11px;
    color: #475569;
    line-height: 1.6;
  }
  .rpt-meta strong {
    color: #2A4F49;
  }

  /* TITLE */
  .rpt-title-box {
    text-align: center;
    margin: 12px 0 16px;
  }
  .rpt-title {
    font-size: 18px;
    font-weight: 800;
    color: #2A4F49;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .rpt-subtitle {
    font-size: 11.5px;
    color: #64748b;
    margin-top: 4px;
    font-style: italic;
  }

  /* STAT CARDS ROW */
  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .stat-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    text-align: center;
    border-top: 3px solid #64748b;
  }
  .stat-box.primary { border-top-color: #3D7068; background: #E7F0EE; }
  .stat-box.success { border-top-color: #059669; background: #f0fdf4; }
  .stat-box.danger  { border-top-color: #dc2626; background: #fef2f2; }
  .stat-box.amber   { border-top-color: #d97706; background: #fffbeb; }

  .stat-box .val {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
    font-family: 'JetBrains Mono', monospace;
  }
  .stat-box.primary .val { color: #2A4F49; }
  .stat-box.success .val { color: #047857; }
  .stat-box.danger  .val { color: #b91c1c; }
  .stat-box.amber   .val { color: #b45309; }

  .stat-box .lbl {
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    margin-top: 4px;
    letter-spacing: 0.3px;
  }

  /* SECTION TITLE */
  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: #2A4F49;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-left: 3px solid #3D7068;
    padding-left: 8px;
    margin: 20px 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-title span.badge-count {
    font-size: 10.5px;
    background: #e2e8f0;
    color: #334155;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 600;
  }

  /* TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 12px;
  }
  thead {
    background: #3D7068;
    color: #ffffff;
  }
  thead th {
    padding: 7px 8px;
    font-weight: 600;
    text-align: left;
    font-size: 10.5px;
    border: 1px solid #1e293b;
    letter-spacing: 0.2px;
  }
  tbody tr:nth-child(even) {
    background: #f8fafc;
  }
  td {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  td.right, th.right { text-align: right; }
  td.center, th.center { text-align: center; }

  tfoot tr {
    background: #f1f5f9;
    font-weight: 700;
  }
  tfoot td {
    border: 1px solid #cbd5e1;
    padding: 7px 8px;
  }

  /* BADGES */
  .badge {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .badge-red   { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
  .badge-blue  { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .badge-gray  { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

  /* BARS */
  .bar-wrap { background: #e2e8f0; border-radius: 3px; height: 6px; overflow: hidden; width: 100%; min-width: 60px; }
  .bar-fill { height: 100%; border-radius: 3px; }

  /* SUMMARY & ALERT */
  .summary-box {
    margin-top: 14px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 11px;
    display: flex;
    justify-content: flex-end;
    gap: 28px;
  }
  .alert-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 14px;
    font-size: 11px;
    color: #991b1b;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* SIGNATURES (3 columns - Reference 1) */
  .sig-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-top: 28px;
    text-align: center;
    page-break-inside: avoid;
  }
  .sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .sig-title {
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    text-transform: uppercase;
  }
  .sig-subtitle {
    font-size: 10px;
    color: #64748b;
    font-style: italic;
    margin-top: 2px;
  }
  .sig-space {
    height: 55px;
  }
  .sig-line {
    border-bottom: 1px dotted #94a3b8;
    width: 140px;
    margin-bottom: 4px;
  }
  .sig-name {
    font-size: 11px;
    font-weight: 600;
    color: #1e293b;
  }

  /* FOOTER */
  .rpt-footer {
    margin-top: 24px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94a3b8;
    page-break-inside: avoid;
  }

  @page {
    size: A4;
    margin: 12mm 15mm;
  }
  @media print {
    body {
      background: #ffffff;
    }
    .page {
      box-shadow: none;
      margin: 0;
      width: 100%;
      min-height: auto;
      padding: 0;
    }
  }
`;

function shopHeader(dateRange, subtitleText) {
  return `
    <div class="rpt-header">
      <div class="rpt-brand-row">
        <div class="rpt-logo">MB</div>
        <div>
          <div class="rpt-brand-name">Cửa hàng Mẹ &amp; Bé</div>
          <div class="rpt-brand-sub">Đ/c: 123 Đường Mẹ &amp; Bé, Q. Hải Châu, TP. Đà Nẵng | ĐT: (0236) 3888 999</div>
        </div>
      </div>
      <div class="rpt-meta">
        <div><strong>Thời điểm in:</strong> ${now()}</div>
        ${dateRange ? `<div><strong>Kỳ báo cáo:</strong> ${esc(dateRange)}</div>` : ""}
        <div><strong>Người lập biểu:</strong> ${esc(getCurrentUser())}</div>
=======
    return u.fullName || u.username || "Người dùng";
  } catch { return "Người dùng"; }
}

const baseStyle = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 12.5px;
    color: #1F2A37;
    background: #fff;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 15mm 12mm; }
  .rpt-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #3D7068; padding-bottom: 10px; margin-bottom: 16px; }
  .rpt-brand-name { font-size: 17px; font-weight: 700; color: #3D7068; }
  .rpt-brand-sub { font-size: 11px; color: #6B7680; margin-top: 2px; }
  .rpt-meta { text-align: right; font-size: 11px; color: #6B7680; line-height: 1.7; }
  .rpt-title { text-align: center; margin: 12px 0 4px; font-size: 16px; font-weight: 700; color: #2A4F49; text-transform: uppercase; }
  .rpt-subtitle { text-align: center; font-size: 11.5px; color: #6B7680; margin-bottom: 18px; }
  .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat-box { background: #F7F8FA; border: 1px solid #E3E6E5; border-radius: 8px; padding: 10px 12px; text-align: center; }
  .stat-box .val { font-size: 14px; font-weight: 700; color: #3D7068; line-height: 1.2; }
  .stat-box .lbl { font-size: 10.5px; color: #9AA3AB; margin-top: 3px; }
  .stat-box.danger .val { color: #C0524B; }
  .stat-box.accent .val { color: #B9636C; }
  .section-title { font-size: 11.5px; font-weight: 700; color: #3D7068; text-transform: uppercase; letter-spacing: .4px; border-bottom: 1.5px solid #E3E6E5; padding-bottom: 4px; margin: 16px 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead { background: #3D7068; color: #fff; }
  thead th { padding: 6px 8px; font-weight: 600; text-align: left; font-size: 10.5px; }
  tbody tr:nth-child(even) { background: #F7F8FA; }
  td { padding: 5px 8px; border-bottom: 1px solid #EEF0F2; vertical-align: middle; }
  td.right, th.right { text-align: right; }
  td.center, th.center { text-align: center; }
  .badge { display: inline-block; font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 100px; white-space: nowrap; }
  .badge-green { background: #E5F3EA; color: #2E7D50; }
  .badge-amber { background: #FEF3C7; color: #92400E; }
  .badge-red   { background: #FBEAEA; color: #C0524B; }
  .badge-gray  { background: #F1F5F9; color: #6B7680; }
  .bar-wrap { background: #E3E6E5; border-radius: 4px; height: 6px; overflow: hidden; width: 100%; min-width: 60px; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .alert-box { background: #FBEAEA; border: 1px solid #F2C5C2; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 11.5px; color: #C0524B; font-weight: 600; }
  .summary-box { margin-top: 12px; padding: 10px 14px; background: #F7F8FA; border-radius: 6px; font-size: 11px; display: flex; gap: 32px; }
  .sig-row { display: flex; justify-content: flex-end; gap: 60px; margin-top: 32px; }
  .sig-area { text-align: center; }
  .sig-area .sig-name { font-size: 11px; font-weight: 600; margin-bottom: 2px; }
  .sig-line { border-bottom: 1px dotted #9AA3AB; width: 120px; margin: 28px auto 4px; }
  .sig-note { font-size: 10px; color: #9AA3AB; }
  .rpt-footer { margin-top: 20px; border-top: 1px solid #E3E6E5; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #9AA3AB; }
  @media print {
    html, body { margin: 0; padding: 0; }
    .page { padding: 10mm 12mm; }
  }
`;

function shopHeader(dateRange) {
  return `
    <div class="rpt-header">
      <div>
        <div class="rpt-brand-name">🛍️ Cửa hàng Mẹ &amp; Bé</div>
        <div class="rpt-brand-sub">Hệ thống quản lý bán lẻ sản phẩm mẹ và bé</div>
      </div>
      <div class="rpt-meta">
        <div><strong>Ngày in:</strong> ${now()}</div>
        ${dateRange ? `<div><strong>Kỳ báo cáo:</strong> ${esc(dateRange)}</div>` : ""}
        <div><strong>Người lập:</strong> ${esc(getCurrentUser())}</div>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      </div>
    </div>
  `;
}

<<<<<<< HEAD
function sigRow3() {
  return `
    <div class="sig-row">
      <div class="sig-col">
        <div class="sig-title">Người lập biểu</div>
        <div class="sig-subtitle">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${esc(getCurrentUser())}</div>
      </div>
      <div class="sig-col">
        <div class="sig-title">Kế toán trưởng</div>
        <div class="sig-subtitle">(Ký, họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
      </div>
      <div class="sig-col">
        <div class="sig-title">Giám đốc / Quản lý</div>
        <div class="sig-subtitle">(Ký, họ tên, đóng dấu)</div>
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-name">....................................</div>
=======
function sigRow() {
  return `
    <div class="sig-row">
      <div class="sig-area">
        <div class="sig-name">Người lập báo cáo</div>
        <div class="sig-line"></div>
        <div class="sig-note">(Ký, ghi rõ họ tên)</div>
      </div>
      <div class="sig-area">
        <div class="sig-name">Quản lý cửa hàng</div>
        <div class="sig-line"></div>
        <div class="sig-note">(Ký, ghi rõ họ tên)</div>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      </div>
    </div>
  `;
}

function footer() {
<<<<<<< HEAD
  return `
    <div class="rpt-footer">
      <span>Hệ thống Quản lý Bán lẻ &amp; Kế toán Cửa hàng Mẹ &amp; Bé</span>
      <span>Trang 1 / 1</span>
    </div>
  `;
}

function buildPage(body) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo quản trị - Cửa hàng Mẹ &amp; Bé</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="page">
    ${body}
  </div>
</body>
</html>`;
}

/* ── 1. BÁO CÁO DOANH THU (Reference 2 - Screen 1) ─────────────────────────────────────────── */
function buildRevenueHtml({ revenueData, invoices = [], salesOrders = [] }) {
=======
  return `<div class="rpt-footer"><span>Báo cáo tạo tự động bởi Hệ thống Mẹ &amp; Bé</span><span>In lúc: ${now()}</span></div>`;
}

function buildPage(body) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Báo cáo - Mẹ &amp; Bé</title><style>${baseStyle}</style></head><body><div class="page">${body}</div></body></html>`;
}

/* ── 1. Doanh thu ─────────────────────────────────────────── */
function buildRevenueHtml({ revenueData, invoices, salesOrders }) {
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  const total = revenueData?.total || invoices.reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const collected = invoices.filter(i => i.TrangThai === "Đã thanh toán").reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const outstanding = total - collected;
  const orderCount = salesOrders?.length || invoices.length;
  const weekly = revenueData?.weekly || [];
<<<<<<< HEAD
  const maxW = Math.max(1, ...weekly.map(w => w.total || 0));

  const weekRows = weekly.map(w => `
    <tr>
      <td>${esc(w.date)}</td>
      <td class="right mono"><strong>${moneyFmt.format(w.total)}</strong></td>
      <td>
        <div class="bar-wrap">
          <div class="bar-fill" style="width:${Math.round(w.total/maxW*100)}%;background:#3D7068"></div>
        </div>
      </td>
    </tr>
  `).join("");

  const invRows = invoices.map((inv, i) => {
    const badge = inv.TrangThai === "Đã thanh toán" ? "badge-green" : inv.TrangThai === "Thanh toán một phần" ? "badge-amber" : "badge-red";
    return `
      <tr>
        <td class="center mono">${i+1}</td>
        <td><strong class="mono">${esc(inv.MaHD || inv.id)}</strong></td>
        <td class="mono">${esc(inv.MaDHCode || inv.MaDH || "—")}</td>
        <td>${esc(inv.NgayLap || "—")}</td>
        <td class="right mono"><strong>${moneyFmt.format(Number(inv.TongTien || 0))}</strong></td>
        <td class="right mono" style="color:${Number(inv.SoTienConLai ?? inv.TongTien ?? 0) > 0 ? '#b91c1c' : '#059669'}">${moneyFmt.format(Number(inv.SoTienConLai ?? inv.TongTien ?? 0))}</td>
        <td class="center"><span class="badge ${badge}">${esc(inv.TrangThai || "—")}</span></td>
      </tr>
    `;
=======
  const maxW = Math.max(1, ...weekly.map(w => w.total));

  const weekRows = weekly.map(w => `<tr><td>${esc(w.date)}</td><td class="right"><strong>${moneyFmt.format(w.total)}</strong></td><td><div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(w.total/maxW*100)}%;background:#3D7068"></div></div></td></tr>`).join("");

  const invRows = invoices.map((inv, i) => {
    const badge = inv.TrangThai === "Đã thanh toán" ? "badge-green" : inv.TrangThai === "Thanh toán một phần" ? "badge-amber" : "badge-red";
    return `<tr><td class="center">${i+1}</td><td><strong>${esc(inv.MaHD || inv.id)}</strong></td><td>${esc(inv.MaDHCode || inv.MaDH || "—")}</td><td>${esc(inv.NgayLap || "—")}</td><td class="right">${moneyFmt.format(Number(inv.TongTien||0))}</td><td class="right">${moneyFmt.format(Number(inv.SoTienConLai ?? inv.TongTien ?? 0))}</td><td class="center"><span class="badge ${badge}">${esc(inv.TrangThai||"—")}</span></td></tr>`;
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  }).join("");

  return buildPage(`
    ${shopHeader("Tổng hợp đến hiện tại")}
<<<<<<< HEAD
    <div class="rpt-title-box">
      <div class="rpt-title">Báo cáo doanh thu bán hàng</div>
      <div class="rpt-subtitle">Tổng hợp doanh thu, tình trạng thanh toán và danh sách hóa đơn phát sinh</div>
    </div>

    <div class="stat-row">
      <div class="stat-box primary">
        <div class="val">${moneyFmt.format(total)}</div>
        <div class="lbl">Tổng doanh thu</div>
      </div>
      <div class="stat-box success">
        <div class="val">${moneyFmt.format(collected)}</div>
        <div class="lbl">Đã thanh toán</div>
      </div>
      <div class="stat-box danger">
        <div class="val">${moneyFmt.format(outstanding)}</div>
        <div class="lbl">Chưa thanh toán</div>
      </div>
      <div class="stat-box amber">
        <div class="val">${numFmt.format(orderCount)}</div>
        <div class="lbl">Tổng đơn hàng</div>
      </div>
    </div>

    ${weekly.length ? `
      <div class="section-title">
        <span>Doanh thu theo chu kỳ gần nhất</span>
        <span class="badge-count">${weekly.length} mốc</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Ngày / Giai đoạn</th>
            <th class="right">Doanh thu</th>
            <th style="width:180px">Tỷ trọng</th>
          </tr>
        </thead>
        <tbody>${weekRows}</tbody>
      </table>
    ` : ""}

    <div class="section-title">
      <span>Danh sách hóa đơn bán hàng</span>
      <span class="badge-count">${invoices.length} hóa đơn</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:36px">STT</th>
          <th>Mã HĐ</th>
          <th>Mã Đơn hàng</th>
          <th>Ngày lập</th>
          <th class="right">Tổng tiền</th>
          <th class="right">Còn phải thu</th>
          <th class="center">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${invRows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8">Chưa có dữ liệu hóa đơn</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" class="right">Tổng cộng:</td>
          <td class="right mono">${moneyFmt.format(total)}</td>
          <td class="right mono" style="color:#b91c1c">${moneyFmt.format(outstanding)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    ${sigRow3()}
    ${footer()}
  `);
}

/* ── 2. BÁO CÁO TỒN KHO (Reference 3 - Screen 1) ─────────────────────────────────────────── */
function buildInventoryHtml({ products = [] }) {
  const total = products.length;
  const outOfStock = products.filter(p => Number(p.stock || 0) <= 0).length;
  const lowStock = products.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 10).length;
  const inStock = total - outOfStock - lowStock;
  const totalVal = products.reduce((s, p) => s + (Number(p.stock || 0) * Number(p.GiaBan || p.GiaVon || 0)), 0);

  const sorted = [...products].sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

  const rows = sorted.map((p, i) => {
    const st = Number(p.stock || 0);
    const badge = st <= 0 ? "badge-red" : st <= 10 ? "badge-amber" : "badge-green";
    const label = st <= 0 ? "Hết hàng" : st <= 10 ? "Sắp hết" : "Còn hàng";
    const itemVal = st * Number(p.GiaBan || 0);

    return `
      <tr>
        <td class="center mono">${i+1}</td>
        <td><strong class="mono">${esc(p.MaSP || p.id)}</strong></td>
        <td>${esc(p.TenSP)}</td>
        <td>${esc(p.LoaiHang || "—")}</td>
        <td class="center">${esc(p.DonViTinh || "Cái")}</td>
        <td class="right mono"><strong>${numFmt.format(st)}</strong></td>
        <td class="right mono">${moneyFmt.format(Number(p.GiaBan || 0))}</td>
        <td class="right mono"><strong>${moneyFmt.format(itemVal)}</strong></td>
        <td class="center"><span class="badge ${badge}">${label}</span></td>
      </tr>
    `;
=======
    <div class="rpt-title">Báo cáo doanh thu bán hàng</div>
    <div class="rpt-subtitle">Tổng hợp doanh thu, tình trạng thu tiền và hóa đơn phát sinh</div>
    <div class="stat-row">
      <div class="stat-box accent"><div class="val">${moneyFmt.format(total)}</div><div class="lbl">Tổng doanh thu</div></div>
      <div class="stat-box"><div class="val" style="color:#3E8E5A">${moneyFmt.format(collected)}</div><div class="lbl">Đã thu</div></div>
      <div class="stat-box danger"><div class="val">${moneyFmt.format(outstanding)}</div><div class="lbl">Còn phải thu</div></div>
      <div class="stat-box"><div class="val">${numFmt.format(orderCount)}</div><div class="lbl">Tổng đơn hàng</div></div>
    </div>
    ${weekly.length ? `<div class="section-title">Doanh thu 7 ngày gần nhất</div><table><thead><tr><th>Ngày</th><th class="right">Doanh thu</th><th style="width:160px">Biểu đồ</th></tr></thead><tbody>${weekRows}</tbody></table>` : ""}
    <div class="section-title">Danh sách hóa đơn (${invoices.length})</div>
    <table><thead><tr><th class="center">#</th><th>Mã hóa đơn</th><th>Mã đơn hàng</th><th>Ngày lập</th><th class="right">Tổng tiền</th><th class="right">Còn phải thu</th><th class="center">Trạng thái</th></tr></thead>
    <tbody>${invRows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#9AA3AB">Chưa có hóa đơn</td></tr>'}</tbody></table>
    ${sigRow()}${footer()}
  `);
}

/* ── 2. Tồn kho ─────────────────────────────────────────── */
function buildInventoryHtml({ products }) {
  const total = products.length;
  const outOfStock = products.filter(p => Number(p.stock||0) <= 0).length;
  const lowStock = products.filter(p => Number(p.stock||0) > 0 && Number(p.stock||0) <= 10).length;
  const inStock = total - outOfStock - lowStock;
  const sorted = [...products].sort((a,b) => Number(a.stock||0) - Number(b.stock||0));

  const rows = sorted.map((p, i) => {
    const st = Number(p.stock||0);
    const badge = st <= 0 ? "badge-red" : st <= 10 ? "badge-amber" : "badge-green";
    const label = st <= 0 ? "Hết hàng" : st <= 10 ? "Sắp hết" : "Còn hàng";
    const barColor = st <= 0 ? "#C0524B" : st <= 10 ? "#C08A2E" : "#3E8E5A";
    const barPct = Math.min(100, Math.round(st/150*100));
    return `<tr><td class="center">${i+1}</td><td><strong>${esc(p.MaSP||p.id)}</strong></td><td>${esc(p.TenSP)}</td><td>${esc(p.LoaiHang||"—")}</td><td class="center">${esc(p.DonViTinh||"—")}</td><td class="right"><strong>${numFmt.format(st)}</strong></td><td class="right">${moneyFmt.format(Number(p.GiaBan||0))}</td><td><div class="bar-wrap"><div class="bar-fill" style="width:${barPct}%;background:${barColor}"></div></div></td><td class="center"><span class="badge ${badge}">${label}</span></td></tr>`;
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  }).join("");

  return buildPage(`
    ${shopHeader("Tại thời điểm hiện tại")}
<<<<<<< HEAD
    <div class="rpt-title-box">
      <div class="rpt-title">Báo cáo tình trạng tồn kho hàng hóa</div>
      <div class="rpt-subtitle">Chi tiết số lượng tồn kho, giá trị ước tính và phân loại cảnh báo tồn kho</div>
    </div>

    <div class="stat-row">
      <div class="stat-box primary">
        <div class="val">${numFmt.format(total)}</div>
        <div class="lbl">Tổng mặt hàng</div>
      </div>
      <div class="stat-box success">
        <div class="val">${numFmt.format(inStock)}</div>
        <div class="lbl">Còn hàng (> 10)</div>
      </div>
      <div class="stat-box amber">
        <div class="val">${numFmt.format(lowStock)}</div>
        <div class="lbl">Sắp hết hàng (1-10)</div>
      </div>
      <div class="stat-box danger">
        <div class="val">${numFmt.format(outOfStock)}</div>
        <div class="lbl">Hết hàng (0)</div>
      </div>
    </div>

    ${outOfStock > 0 ? `
      <div class="alert-box">
        ⚠ Có <strong>${outOfStock} mặt hàng</strong> đã hết hàng trong kho. Cần liên hệ Nhà cung cấp để lên đơn đặt hàng nhập kho bổ sung kịp thời.
      </div>
    ` : ""}

    <div class="section-title">
      <span>Bảng chi tiết tồn kho hàng hóa</span>
      <span class="badge-count">${total} sản phẩm</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:36px">STT</th>
          <th>Mã SP</th>
          <th>Tên sản phẩm</th>
          <th>Loại hàng</th>
          <th class="center">ĐVT</th>
          <th class="right">Tồn kho</th>
          <th class="right">Đơn giá bán</th>
          <th class="right">Giá trị tồn</th>
          <th class="center">Tình trạng</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9" style="text-align:center;padding:16px;color:#94a3b8">Chưa có dữ liệu tồn kho</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="right">Tổng giá trị tồn kho ước tính:</td>
          <td class="right mono" colspan="3" style="font-size:12px;color:#1d4ed8">${moneyFmt.format(totalVal)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    ${sigRow3()}
    ${footer()}
  `);
}

/* ── 3. BÁO CÁO NHẬP - XUẤT KHO (Reference 2 - Screen 2) ─────────────────────────────────── */
function buildWarehouseHtml({ receipts = [], issues = [] }) {
  const totalRVal = receipts.reduce((s, r) => s + Number(r.TongTien || 0), 0);
  const totalIVal = issues.reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const totalRQty = receipts.reduce((s, r) => s + Number(r.SoLuong || 0), 0);
  const totalIQty = issues.reduce((s, i) => s + Number(i.SoLuong || 0), 0);

  const rRows = receipts.map((r, i) => `
    <tr>
      <td class="center mono">${i+1}</td>
      <td><strong class="mono">${esc(r.MaPN || r.id)}</strong></td>
      <td>${esc(r.NgayNhap || "—")}</td>
      <td>${esc(r.MaNCCCode || r.MaNCC || "NCC Đối tác")}</td>
      <td class="center mono">${r.details?.length || 1} mh</td>
      <td class="right mono">${numFmt.format(Number(r.SoLuong || 0))}</td>
      <td class="right mono"><strong>${moneyFmt.format(Number(r.TongTien || 0))}</strong></td>
      <td class="center"><span class="badge badge-green">${esc(r.TrangThai || "Hoàn thành")}</span></td>
    </tr>
  `).join("");

  const iRows = issues.map((s, i) => `
    <tr>
      <td class="center mono">${i+1}</td>
      <td><strong class="mono">${esc(s.MaPX || s.id)}</strong></td>
      <td>${esc(s.NgayXuat || "—")}</td>
      <td>${esc(s.LyDoXuat || "Xuất bán / điều chuyển")}</td>
      <td class="center mono">${s.details?.length || 1} mh</td>
      <td class="right mono">${numFmt.format(Number(s.SoLuong || 0))}</td>
      <td class="right mono"><strong>${moneyFmt.format(Number(s.TongTien || 0))}</strong></td>
      <td class="center"><span class="badge badge-blue">${esc(s.TrangThai || "Hoàn thành")}</span></td>
    </tr>
  `).join("");

  return buildPage(`
    ${shopHeader("Tổng hợp toàn bộ chứng từ")}
    <div class="rpt-title-box">
      <div class="rpt-title">Báo cáo tổng hợp nhập – xuất kho</div>
      <div class="rpt-subtitle">Theo dõi luân chuyển hàng hóa qua Phiếu nhập kho (01-VT) và Phiếu xuất kho (02-VT)</div>
    </div>

    <div class="stat-row">
      <div class="stat-box primary">
        <div class="val">${receipts.length}</div>
        <div class="lbl">Phiếu nhập kho</div>
      </div>
      <div class="stat-box success">
        <div class="val">${moneyFmt.format(totalRVal)}</div>
        <div class="lbl">Tổng GT nhập (${numFmt.format(totalRQty)} sp)</div>
      </div>
      <div class="stat-box amber">
        <div class="val">${issues.length}</div>
        <div class="lbl">Phiếu xuất kho</div>
      </div>
      <div class="stat-box danger">
        <div class="val">${moneyFmt.format(totalIVal)}</div>
        <div class="lbl">Tổng GT xuất (${numFmt.format(totalIQty)} sp)</div>
      </div>
    </div>

    <div class="section-title">
      <span>I. Danh sách Phiếu nhập kho (Mẫu 01 - VT)</span>
      <span class="badge-count">${receipts.length} phiếu</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:36px">STT</th>
          <th>Mã phiếu</th>
          <th>Ngày nhập</th>
          <th>Nhà cung cấp</th>
          <th class="center">Số MH</th>
          <th class="right">Tổng SL</th>
          <th class="right">Tổng giá trị</th>
          <th class="center">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${rRows || '<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8">Chưa có phiếu nhập</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="right">Tổng nhập:</td>
          <td class="right mono">${numFmt.format(totalRQty)}</td>
          <td class="right mono" style="color:#059669">${moneyFmt.format(totalRVal)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="section-title" style="margin-top:24px">
      <span>II. Danh sách Phiếu xuất kho (Mẫu 02 - VT)</span>
      <span class="badge-count">${issues.length} phiếu</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:36px">STT</th>
          <th>Mã phiếu</th>
          <th>Ngày xuất</th>
          <th>Lý do xuất</th>
          <th class="center">Số MH</th>
          <th class="right">Tổng SL</th>
          <th class="right">Tổng giá trị</th>
          <th class="center">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${iRows || '<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8">Chưa có phiếu xuất</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="right">Tổng xuất:</td>
          <td class="right mono">${numFmt.format(totalIQty)}</td>
          <td class="right mono" style="color:#3D7068">${moneyFmt.format(totalIVal)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    ${sigRow3()}
    ${footer()}
  `);
}

/* ── 4. BÁO CÁO CÔNG NỢ (Reference 1 Bottom-Middle & Reference 3 Screen 2) ────────────────── */
function buildDebtsHtml({ debts = [], customers = [], suppliers = [] }) {
  // Tách biệt rõ ràng: Công nợ Phải thu Khách hàng & Công nợ Phải trả Nhà cung cấp
  const custDebts = debts.filter(d => d.type === "customers" || d.MaKH || !d.MaNCC);
  const suppDebts = debts.filter(d => d.type === "suppliers" || d.MaNCC);

  const totalCustDebt = custDebts.reduce((s, d) => s + Number(d.SoTien || 0), 0);
  const paidCustDebt  = custDebts.reduce((s, d) => s + Number(d.SoTienDaTra || 0), 0);
  const remCustDebt   = custDebts.reduce((s, d) => s + Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0))), 0);

  const totalSuppDebt = suppDebts.reduce((s, d) => s + Number(d.SoTien || 0), 0);
  const paidSuppDebt  = suppDebts.reduce((s, d) => s + Number(d.SoTienDaTra || 0), 0);
  const remSuppDebt   = suppDebts.reduce((s, d) => s + Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0))), 0);

  const custPendingCount = custDebts.filter(d => Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0))) > 0).length;
  const suppPendingCount = suppDebts.filter(d => Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0))) > 0).length;

  // Bảng khách hàng nợ
  const custRows = custDebts.map((d, i) => {
    const cust = customers.find(c => c.id === d.MaKH || c.MaKH === d.MaKH);
    const rem = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)));
    const badge = rem <= 0 ? "badge-green" : "badge-red";
    const statusText = rem <= 0 ? "Đã tất toán" : (d.TrangThai || "Còn nợ");

    return `
      <tr>
        <td class="center mono">${i+1}</td>
        <td><strong class="mono">${esc(d.MaCN || d.id)}</strong></td>
        <td><strong>${esc(cust?.HoTen || d.MaKHCode || d.MaKH || "Khách lẻ")}</strong></td>
        <td class="mono">${esc(cust?.DienThoai || "—")}</td>
        <td>${esc(d.NgayPhatSinh || "—")}</td>
        <td class="right mono">${moneyFmt.format(Number(d.SoTien || 0))}</td>
        <td class="right mono" style="color:#059669">${moneyFmt.format(Number(d.SoTienDaTra || 0))}</td>
        <td class="right mono"><strong style="color:${rem > 0 ? '#b91c1c' : '#059669'}">${moneyFmt.format(rem)}</strong></td>
        <td class="center"><span class="badge ${badge}">${statusText}</span></td>
      </tr>
    `;
  }).join("");

  // Bảng nhà cung cấp nợ
  const suppRows = suppDebts.map((d, i) => {
    const supp = suppliers.find(s => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
    const rem = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)));
    const badge = rem <= 0 ? "badge-green" : "badge-amber";
    const statusText = rem <= 0 ? "Đã thanh toán" : (d.TrangThai || "Còn nợ");

    return `
      <tr>
        <td class="center mono">${i+1}</td>
        <td><strong class="mono">${esc(d.MaCN || d.id)}</strong></td>
        <td><strong>${esc(supp?.TenNCC || d.MaNCCCode || d.MaNCC || "Nhà cung cấp")}</strong></td>
        <td class="mono">${esc(supp?.DienThoai || "—")}</td>
        <td>${esc(d.NgayPhatSinh || "—")}</td>
        <td class="right mono">${moneyFmt.format(Number(d.SoTien || 0))}</td>
        <td class="right mono" style="color:#059669">${moneyFmt.format(Number(d.SoTienDaTra || 0))}</td>
        <td class="right mono"><strong style="color:${rem > 0 ? '#d97706' : '#059669'}">${moneyFmt.format(rem)}</strong></td>
        <td class="center"><span class="badge ${badge}">${statusText}</span></td>
      </tr>
    `;
  }).join("");

  return buildPage(`
    ${shopHeader("Tổng hợp sổ cái công nợ")}
    <div class="rpt-title-box">
      <div class="rpt-title">Báo cáo tổng hợp công nợ</div>
      <div class="rpt-subtitle">Chi tiết công nợ phải thu của khách hàng và công nợ phải trả cho nhà cung cấp</div>
    </div>

    <!-- 4 KPI Cards Matching Reference 1 Bottom-Middle -->
    <div class="stat-row">
      <div class="stat-box primary">
        <div class="val">${moneyFmt.format(remCustDebt)}</div>
        <div class="lbl">Tổng nợ phải thu (KH)</div>
      </div>
      <div class="stat-box amber">
        <div class="val">${moneyFmt.format(remSuppDebt)}</div>
        <div class="lbl">Tổng nợ phải trả (NCC)</div>
      </div>
      <div class="stat-box danger">
        <div class="val">${custPendingCount}</div>
        <div class="lbl">Khách hàng chưa thanh toán</div>
      </div>
      <div class="stat-box success">
        <div class="val">${suppPendingCount}</div>
        <div class="lbl">NCC cần thanh toán</div>
      </div>
    </div>

    <!-- Section I: Công nợ phải thu Khách hàng -->
    <div class="section-title">
      <span>I. Công nợ phải thu Khách hàng (Tài khoản 131)</span>
      <span class="badge-count">${custDebts.length} khoản nợ</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:32px">STT</th>
          <th>Mã CN</th>
          <th>Khách hàng</th>
          <th>Số điện thoại</th>
          <th>Ngày phát sinh</th>
          <th class="right">Tổng số tiền</th>
          <th class="right">Đã thu</th>
          <th class="right">Còn phải thu</th>
          <th class="center">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${custRows || '<tr><td colspan="9" style="text-align:center;padding:14px;color:#94a3b8">Không có dữ liệu công nợ khách hàng</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="right">Tổng cộng phải thu:</td>
          <td class="right mono">${moneyFmt.format(totalCustDebt)}</td>
          <td class="right mono" style="color:#059669">${moneyFmt.format(paidCustDebt)}</td>
          <td class="right mono" style="color:#b91c1c">${moneyFmt.format(remCustDebt)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- Section II: Công nợ phải trả Nhà cung cấp -->
    <div class="section-title" style="margin-top:24px">
      <span>II. Công nợ phải trả Nhà cung cấp (Tài khoản 331)</span>
      <span class="badge-count">${suppDebts.length} khoản nợ</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:32px">STT</th>
          <th>Mã CN</th>
          <th>Nhà cung cấp</th>
          <th>Số điện thoại</th>
          <th>Ngày phát sinh</th>
          <th class="right">Tổng số tiền</th>
          <th class="right">Đã trả</th>
          <th class="right">Còn phải trả</th>
          <th class="center">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${suppRows || '<tr><td colspan="9" style="text-align:center;padding:14px;color:#94a3b8">Không có dữ liệu công nợ nhà cung cấp</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="right">Tổng cộng phải trả:</td>
          <td class="right mono">${moneyFmt.format(totalSuppDebt)}</td>
          <td class="right mono" style="color:#059669">${moneyFmt.format(paidSuppDebt)}</td>
          <td class="right mono" style="color:#d97706">${moneyFmt.format(remSuppDebt)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="summary-box">
      <span>Tổng chênh lệch phải thu - phải trả: <strong class="mono" style="color:${remCustDebt >= remSuppDebt ? '#059669' : '#b91c1c'}">${moneyFmt.format(remCustDebt - remSuppDebt)}</strong></span>
    </div>

    ${sigRow3()}
    ${footer()}
  `);
}

/* ── 5. BÁO CÁO THU - CHI TIỀN MẶT ─────────────────────────────── */
=======
    <div class="rpt-title">Báo cáo tình trạng tồn kho</div>
    <div class="rpt-subtitle">Số lượng tồn kho hiện tại theo từng mặt hàng, sắp xếp tồn kho tăng dần</div>
    <div class="stat-row">
      <div class="stat-box"><div class="val">${total}</div><div class="lbl">Tổng mặt hàng</div></div>
      <div class="stat-box"><div class="val" style="color:#3E8E5A">${inStock}</div><div class="lbl">Còn hàng (&gt;10)</div></div>
      <div class="stat-box"><div class="val" style="color:#C08A2E">${lowStock}</div><div class="lbl">Sắp hết (1–10)</div></div>
      <div class="stat-box danger"><div class="val">${outOfStock}</div><div class="lbl">Hết hàng (0)</div></div>
    </div>
    <div class="section-title">Chi tiết tồn kho (${total} sản phẩm)</div>
    <table><thead><tr><th class="center">#</th><th>Mã SP</th><th>Tên sản phẩm</th><th>Loại hàng</th><th class="center">ĐVT</th><th class="right">Tồn kho</th><th class="right">Giá bán</th><th style="width:80px">Biểu đồ</th><th class="center">Tình trạng</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:16px;color:#9AA3AB">Chưa có dữ liệu</td></tr>'}</tbody></table>
    ${sigRow()}${footer()}
  `);
}

/* ── 3. Nhập – Xuất kho ─────────────────────────────────── */
function buildWarehouseHtml({ receipts, issues }) {
  const totalRVal = receipts.reduce((s,r) => s + Number(r.TongTien||0), 0);
  const totalIVal = issues.reduce((s,i) => s + Number(i.TongTien||0), 0);

  const rRows = receipts.map((r,i) => `<tr><td class="center">${i+1}</td><td><strong>${esc(r.MaPN||r.id)}</strong></td><td>${esc(r.NgayNhap||"—")}</td><td>${esc(r.MaNCCCode||r.MaNCC||"—")}</td><td class="center">${r.details?.length||0} mh</td><td class="right">${numFmt.format(Number(r.SoLuong||0))}</td><td class="right"><strong>${moneyFmt.format(Number(r.TongTien||0))}</strong></td><td class="center"><span class="badge badge-green">${esc(r.TrangThai||"Đã lưu")}</span></td></tr>`).join("");
  const iRows = issues.map((s,i) => `<tr><td class="center">${i+1}</td><td><strong>${esc(s.MaPX||s.id)}</strong></td><td>${esc(s.NgayXuat||"—")}</td><td>${esc(s.LyDoXuat||"—")}</td><td class="center">${s.details?.length||0} mh</td><td class="right">${numFmt.format(Number(s.SoLuong||0))}</td><td class="right"><strong>${moneyFmt.format(Number(s.TongTien||0))}</strong></td><td class="center"><span class="badge badge-amber">${esc(s.TrangThai||"Đã lưu")}</span></td></tr>`).join("");

  return buildPage(`
    ${shopHeader()}
    <div class="rpt-title">Báo cáo nhập – xuất kho</div>
    <div class="rpt-subtitle">Tổng hợp phiếu nhập kho và phiếu xuất kho trong toàn bộ thời gian</div>
    <div class="stat-row">
      <div class="stat-box"><div class="val">${receipts.length}</div><div class="lbl">Phiếu nhập kho</div></div>
      <div class="stat-box accent"><div class="val">${moneyFmt.format(totalRVal)}</div><div class="lbl">GT nhập kho</div></div>
      <div class="stat-box"><div class="val">${issues.length}</div><div class="lbl">Phiếu xuất kho</div></div>
      <div class="stat-box danger"><div class="val">${moneyFmt.format(totalIVal)}</div><div class="lbl">GT xuất kho</div></div>
    </div>
    <div class="section-title">Phiếu nhập kho (${receipts.length})</div>
    <table><thead><tr><th class="center">#</th><th>Mã phiếu</th><th>Ngày nhập</th><th>Nhà cung cấp</th><th class="center">Chi tiết</th><th class="right">SL</th><th class="right">Tổng tiền</th><th class="center">Trạng thái</th></tr></thead>
    <tbody>${rRows||'<tr><td colspan="8" style="text-align:center;padding:16px;color:#9AA3AB">Chưa có phiếu nhập</td></tr>'}</tbody></table>
    <div class="section-title" style="margin-top:20px">Phiếu xuất kho (${issues.length})</div>
    <table><thead><tr><th class="center">#</th><th>Mã phiếu</th><th>Ngày xuất</th><th>Lý do xuất</th><th class="center">Chi tiết</th><th class="right">SL</th><th class="right">Tổng tiền</th><th class="center">Trạng thái</th></tr></thead>
    <tbody>${iRows||'<tr><td colspan="8" style="text-align:center;padding:16px;color:#9AA3AB">Chưa có phiếu xuất</td></tr>'}</tbody></table>
    ${sigRow()}${footer()}
  `);
}

/* ── 4. Công nợ ─────────────────────────────────────────── */
function buildDebtsHtml({ debts }) {
  const totalDebt = debts.reduce((s,d) => s + Number(d.SoTien||0), 0);
  const totalPaid = debts.reduce((s,d) => s + Number(d.SoTienDaTra||0), 0);
  const totalRem  = debts.reduce((s,d) => s + Number(d.SoTienConLai||0), 0);
  const overdue = debts.filter(d => d.TrangThai === "Còn nợ" || d.TrangThai === "Quá hạn").length;

  const rows = debts.map((d,i) => {
    const rem = Number(d.SoTienConLai||0);
    const badge = d.TrangThai === "Đã thanh toán" ? "badge-green" : rem > 0 ? "badge-red" : "badge-gray";
    return `<tr><td class="center">${i+1}</td><td><strong>${esc(d.MaCN||d.id)}</strong></td><td>${esc(d.MaNCCCode||d.MaNCC||"—")}</td><td>${esc(d.MaKHCode||d.MaKH||"—")}</td><td>${esc(d.NgayPhatSinh||"—")}</td><td class="right">${moneyFmt.format(Number(d.SoTien||0))}</td><td class="right" style="color:#3E8E5A">${moneyFmt.format(Number(d.SoTienDaTra||0))}</td><td class="right"><strong style="color:${rem>0?"#C0524B":"inherit"}">${moneyFmt.format(rem)}</strong></td><td class="center"><span class="badge ${badge}">${esc(d.TrangThai||"—")}</span></td></tr>`;
  }).join("");

  return buildPage(`
    ${shopHeader()}
    <div class="rpt-title">Báo cáo công nợ nhà cung cấp &amp; khách hàng</div>
    <div class="rpt-subtitle">Tổng hợp các khoản công nợ phát sinh, đã thu/trả và còn lại</div>
    <div class="stat-row">
      <div class="stat-box"><div class="val">${debts.length}</div><div class="lbl">Tổng khoản nợ</div></div>
      <div class="stat-box accent"><div class="val">${moneyFmt.format(totalDebt)}</div><div class="lbl">Tổng số tiền nợ</div></div>
      <div class="stat-box"><div class="val" style="color:#3E8E5A">${moneyFmt.format(totalPaid)}</div><div class="lbl">Đã thanh toán</div></div>
      <div class="stat-box danger"><div class="val">${moneyFmt.format(totalRem)}</div><div class="lbl">Còn phải thu</div></div>
    </div>
    ${overdue > 0 ? `<div class="alert-box">⚠ Có ${overdue} khoản công nợ chưa thanh toán cần theo dõi.</div>` : ""}
    <div class="section-title">Chi tiết công nợ (${debts.length})</div>
    <table><thead><tr><th class="center">#</th><th>Mã CN</th><th>Nhà cung cấp</th><th>Khách hàng</th><th>Ngày phát sinh</th><th class="right">Số tiền</th><th class="right">Đã trả</th><th class="right">Còn lại</th><th class="center">Trạng thái</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:16px;color:#9AA3AB">Chưa có dữ liệu</td></tr>'}</tbody></table>
    <div class="summary-box">
      <span>Tổng số tiền nợ: <strong>${moneyFmt.format(totalDebt)}</strong></span>
      <span>Đã thanh toán: <strong style="color:#3E8E5A">${moneyFmt.format(totalPaid)}</strong></span>
      <span>Còn phải thu: <strong style="color:#C0524B">${moneyFmt.format(totalRem)}</strong></span>
    </div>
    ${sigRow()}${footer()}
  `);
}

/* ── 5. Thu chi quỹ tiền mặt ─────────────────────────────── */
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
function buildCashFlowHtml({ cashFlow, dateFrom, dateTo }) {
  const totalThu = cashFlow?.totalThu || 0;
  const totalChi = cashFlow?.totalChi || 0;
  const balance = cashFlow?.balance || 0;
  const receiptCount = cashFlow?.receiptCount || 0;
  const paymentCount = cashFlow?.paymentCount || 0;
  const monthly = cashFlow?.monthly || [];

  const dateRange = (dateFrom || dateTo)
<<<<<<< HEAD
    ? `${dateFrom ? `Từ ngày ${dateFrom}` : ""} ${dateTo ? `đến ngày ${dateTo}` : ""}`.trim()
=======
    ? `${dateFrom ? `Từ ${dateFrom}` : ""} ${dateTo ? `Đến ${dateTo}` : ""}`.trim()
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    : "Toàn bộ thời gian";

  const rows = monthly.map((m, i) => `
    <tr>
<<<<<<< HEAD
      <td class="center mono">${i + 1}</td>
      <td><strong>Tháng ${esc(m.month)}</strong></td>
      <td class="right mono" style="color:#059669">${moneyFmt.format(m.thu || 0)}</td>
      <td class="right mono" style="color:#b91c1c">${moneyFmt.format(m.chi || 0)}</td>
      <td class="right mono"><strong style="color:${(m.balance || 0) >= 0 ? '#059669' : '#b91c1c'}">${moneyFmt.format(m.balance || 0)}</strong></td>
=======
      <td class="center">${i + 1}</td>
      <td><strong>Tháng ${esc(m.month)}</strong></td>
      <td class="right" style="color:#2E7D50">${moneyFmt.format(m.thu)}</td>
      <td class="right" style="color:#C0524B">${moneyFmt.format(m.chi)}</td>
      <td class="right"><strong style="color:${m.balance >= 0 ? '#2E7D50' : '#C0524B'}">${moneyFmt.format(m.balance)}</strong></td>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    </tr>
  `).join("");

  return buildPage(`
    ${shopHeader(dateRange)}
<<<<<<< HEAD
    <div class="rpt-title-box">
      <div class="rpt-title">Báo cáo lưu chuyển tiền tệ (Quỹ tiền mặt)</div>
      <div class="rpt-subtitle">Tổng hợp Phiếu thu tiền (Mẫu 01-TT) và Phiếu chi tiền (Mẫu 02-TT)</div>
    </div>

    <div class="stat-row">
      <div class="stat-box success">
        <div class="val">${moneyFmt.format(totalThu)}</div>
        <div class="lbl">Tổng thu (${receiptCount} phiếu)</div>
      </div>
      <div class="stat-box danger">
        <div class="val">${moneyFmt.format(totalChi)}</div>
        <div class="lbl">Tổng chi (${paymentCount} phiếu)</div>
      </div>
      <div class="stat-box ${balance >= 0 ? 'primary' : 'danger'}">
        <div class="val">${moneyFmt.format(balance)}</div>
        <div class="lbl">Tồn quỹ ròng hiện tại</div>
      </div>
      <div class="stat-box amber">
        <div class="val">${monthly.length}</div>
        <div class="lbl">Số kỳ phát sinh</div>
      </div>
    </div>

    <div class="section-title">
      <span>Chi tiết thu - chi luân chuyển theo tháng</span>
      <span class="badge-count">${monthly.length} kỳ</span>
    </div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:36px">STT</th>
          <th>Kỳ phát sinh</th>
          <th class="right">Tổng số tiền thu</th>
          <th class="right">Tổng số tiền chi</th>
          <th class="right">Chênh lệch dòng tiền (Tồn)</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5" style="text-align:center;padding:16px;color:#94a3b8">Chưa có dữ liệu giao dịch thu chi</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="right">Tổng lũy kế:</td>
          <td class="right mono" style="color:#059669">${moneyFmt.format(totalThu)}</td>
          <td class="right mono" style="color:#b91c1c">${moneyFmt.format(totalChi)}</td>
          <td class="right mono" style="color:${balance >= 0 ? '#059669' : '#b91c1c'}">${moneyFmt.format(balance)}</td>
        </tr>
      </tfoot>
    </table>

    ${sigRow3()}
    ${footer()}
  `);
}

/* ── MAIN EXPORT ─────────────────────────────────────────── */
export function printReport(type, payload) {
  let html;
  switch (type) {
    case "revenue":   html = buildRevenueHtml(payload || {}); break;
    case "inventory": html = buildInventoryHtml(payload || {}); break;
    case "warehouse": html = buildWarehouseHtml(payload || {}); break;
    case "debts":     html = buildDebtsHtml(payload || {}); break;
    case "cash-flow": html = buildCashFlowHtml(payload || {}); break;
    default: console.warn("Unknown report type:", type); return;
  }

  const win = window.open("", "_blank", "width=980,height=800,scrollbars=yes");
=======
    <div class="rpt-title">Báo cáo tổng hợp thu chi quỹ tiền mặt</div>
    <div class="rpt-subtitle">Tổng hợp phiếu thu (mẫu 01-TT) và phiếu chi (mẫu 02-TT)</div>
    <div class="stat-row">
      <div class="stat-box"><div class="val" style="color:#2E7D50">${moneyFmt.format(totalThu)}</div><div class="lbl">Tổng thu (${receiptCount} phiếu)</div></div>
      <div class="stat-box danger"><div class="val">${moneyFmt.format(totalChi)}</div><div class="lbl">Tổng chi (${paymentCount} phiếu)</div></div>
      <div class="stat-box ${balance >= 0 ? 'accent' : 'danger'}"><div class="val">${moneyFmt.format(balance)}</div><div class="lbl">Tồn quỹ hiện tại</div></div>
      <div class="stat-box"><div class="val">${monthly.length}</div><div class="lbl">Số kỳ / tháng</div></div>
    </div>
    <div class="section-title">Chi tiết thu chi theo tháng</div>
    <table>
      <thead>
        <tr>
          <th class="center">#</th>
          <th>Tháng</th>
          <th class="right">Tổng thu</th>
          <th class="right">Tổng chi</th>
          <th class="right">Chênh lệch (Tồn)</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:16px;color:#9AA3AB">Chưa có dữ liệu</td></tr>'}</tbody>
    </table>
    <div class="summary-box">
      <span>Tổng thu: <strong style="color:#2E7D50">${moneyFmt.format(totalThu)}</strong></span>
      <span>Tổng chi: <strong style="color:#C0524B">${moneyFmt.format(totalChi)}</strong></span>
      <span>Tồn quỹ ròng: <strong style="color:${balance >= 0 ? '#2E7D50' : '#C0524B'}">${moneyFmt.format(balance)}</strong></span>
    </div>
    ${sigRow()}${footer()}
  `);
}

/* ── Main export ─────────────────────────────────────────── */
export function printReport(type, payload) {
  let html;
  switch (type) {
    case "revenue":   html = buildRevenueHtml(payload); break;
    case "inventory": html = buildInventoryHtml(payload); break;
    case "warehouse": html = buildWarehouseHtml(payload); break;
    case "debts":     html = buildDebtsHtml(payload); break;
    case "cash-flow": html = buildCashFlowHtml(payload); break;
    default: console.warn("Unknown report type:", type); return;
  }

  const win = window.open("", "_blank", "width=960,height=750,scrollbars=yes");
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  if (!win) {
    alert("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up và thử lại.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
<<<<<<< HEAD
  win.onload = () => {
    setTimeout(() => win.print(), 400);
  };
}
=======
  win.onload = () => { setTimeout(() => win.print(), 500); };
}

>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
