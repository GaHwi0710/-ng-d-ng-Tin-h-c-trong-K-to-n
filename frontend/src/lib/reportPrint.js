/**
 * reportPrint.js — Tạo và in báo cáo dạng HTML cho cửa hàng Mẹ & Bé
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
      </div>
    </div>
  `;
}

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
      </div>
    </div>
  `;
}

function footer() {
  return `<div class="rpt-footer"><span>Báo cáo tạo tự động bởi Hệ thống Mẹ &amp; Bé</span><span>In lúc: ${now()}</span></div>`;
}

function buildPage(body) {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>Báo cáo - Mẹ &amp; Bé</title><style>${baseStyle}</style></head><body><div class="page">${body}</div></body></html>`;
}

/* ── 1. Doanh thu ─────────────────────────────────────────── */
function buildRevenueHtml({ revenueData, invoices, salesOrders }) {
  const total = revenueData?.total || invoices.reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const collected = invoices.filter(i => i.TrangThai === "Đã thanh toán").reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const outstanding = total - collected;
  const orderCount = salesOrders?.length || invoices.length;
  const weekly = revenueData?.weekly || [];
  const maxW = Math.max(1, ...weekly.map(w => w.total));

  const weekRows = weekly.map(w => `<tr><td>${esc(w.date)}</td><td class="right"><strong>${moneyFmt.format(w.total)}</strong></td><td><div class="bar-wrap"><div class="bar-fill" style="width:${Math.round(w.total/maxW*100)}%;background:#3D7068"></div></div></td></tr>`).join("");

  const invRows = invoices.map((inv, i) => {
    const badge = inv.TrangThai === "Đã thanh toán" ? "badge-green" : inv.TrangThai === "Thanh toán một phần" ? "badge-amber" : "badge-red";
    return `<tr><td class="center">${i+1}</td><td><strong>${esc(inv.MaHD || inv.id)}</strong></td><td>${esc(inv.MaDHCode || inv.MaDH || "—")}</td><td>${esc(inv.NgayLap || "—")}</td><td class="right">${moneyFmt.format(Number(inv.TongTien||0))}</td><td class="right">${moneyFmt.format(Number(inv.SoTienConLai ?? inv.TongTien ?? 0))}</td><td class="center"><span class="badge ${badge}">${esc(inv.TrangThai||"—")}</span></td></tr>`;
  }).join("");

  return buildPage(`
    ${shopHeader("Tổng hợp đến hiện tại")}
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
  }).join("");

  return buildPage(`
    ${shopHeader("Tại thời điểm hiện tại")}
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

/* ── Main export ─────────────────────────────────────────── */
export function printReport(type, payload) {
  let html;
  switch (type) {
    case "revenue":   html = buildRevenueHtml(payload); break;
    case "inventory": html = buildInventoryHtml(payload); break;
    case "warehouse": html = buildWarehouseHtml(payload); break;
    case "debts":     html = buildDebtsHtml(payload); break;
    default: console.warn("Unknown report type:", type); return;
  }

  const win = window.open("", "_blank", "width=960,height=750,scrollbars=yes");
  if (!win) {
    alert("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép pop-up và thử lại.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => { setTimeout(() => win.print(), 500); };
}
