import { amountToWords } from "./amountToWords.js";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseDateParts(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() };
  }
  return { d: date.getDate(), m: date.getMonth() + 1, y: date.getFullYear() };
}

<<<<<<< HEAD
=======
function dotted(text) {
  const value = String(text ?? "").trim();
  return value ? esc(value) : "&nbsp;";
}

>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
export function normalizeVoucherLines(details = [], products = []) {
  return details.map((line, index) => {
    const product =
      products.find(
        (item) =>
          String(item.id) === String(line.id) ||
          String(item.id) === String(line.productId) ||
          String(item.MaSP) === String(line.MaSP) ||
          String(item.id) === String(line.MaSP)
      ) || {};
    const quantity = Number(line.quantity ?? line.SoLuong ?? 0);
    const requested = Number(line.requested ?? line.SoLuongYeuCau ?? quantity);
    const price = Number(line.price ?? line.DonGia ?? 0);
    return {
      stt: index + 1,
<<<<<<< HEAD
      name: line.TenSP || product.TenSP || "Sản phẩm",
      code: line.MaSPCode || product.MaSP || "",
      unit: line.DonViTinh || product.DonViTinh || "Cái",
=======
      name: line.TenSP || product.TenSP || "",
      image: line.HinhAnh || product.HinhAnh || "",
      code: line.MaSPCode || product.MaSP || "",
      unit: line.DonViTinh || product.DonViTinh || "",
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      requested,
      actual: quantity,
      price,
      amount: quantity * price,
    };
  });
}

export function buildWarehouseVoucherModel({
  isReceipt,
  record,
  products = [],
  suppliers = [],
  userName = "",
}) {
  const supplier = suppliers.find(
<<<<<<< HEAD
    (item) => item.id === record.MaNCC || item.id === record.supplierId || item.MaNCC === record.MaNCC
=======
    (item) => item.id === record.MaNCC || item.id === record.supplierId
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  );
  const date = record.NgayNhap || record.NgayXuat || new Date().toISOString().slice(0, 10);
  const lines = normalizeVoucherLines(record.details || [], products);
  const total =
    Number(record.TongTien) || lines.reduce((sum, line) => sum + line.amount, 0);
  const reason = isReceipt
<<<<<<< HEAD
    ? record.LyDoNhap || (supplier ? `Nhập hàng từ ${supplier.TenNCC}` : "Nhập hàng vào kho")
    : record.LyDoXuat || record.reason || "Bán hàng cho khách";

  return {
    isReceipt,
    company: "Cửa hàng Mẹ & Bé",
    slogan: "Đồng hành cùng bé yêu",
    address: "123 Nguyễn Văn Cừ, Long Biên, Hà Nội",
    phone: "0987 654 321",
    email: "mebe@cuahang.vn",
    date,
    number: record.MaPN || record.MaPX || record.id || "",
    supplierName: supplier?.TenNCC || record.NguoiLienQuan || "",
    supplierTax: supplier?.MST || "0101234567",
    supplierAddress: supplier?.DiaChi || record.DiaChi || "Hà Nội",
    supplierPhone: supplier?.SDT || "0912 345 678",
    receiverName: record.NguoiNhan || record.NguoiLienQuan || "Khách lẻ",
=======
    ? record.LyDoNhap ||
      (supplier ? `Nhập hàng từ ${supplier.TenNCC}` : "Nhập kho")
    : record.LyDoXuat || record.reason || "";

  return {
    isReceipt,
    company: record.DonVi || "Cửa hàng Mẹ & Bé",
    department: record.BoPhan || "Kho hàng",
    date,
    number: record.MaPN || record.MaPX || record.id || "",
    debit: record.TkNo || (isReceipt ? "156" : "632"),
    credit: record.TkCo || (isReceipt ? "331" : "156"),
    personName:
      record.NguoiLienQuan ||
      (isReceipt ? supplier?.TenNCC : "") ||
      "",
    address: record.DiaChi || supplier?.DiaChi || "",
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    reason,
    warehouse: record.Kho || "Kho chính",
    location: record.DiaDiem || "Hà Nội",
    lines,
    total,
<<<<<<< HEAD
    discount: Number(record.ChietKhau || record.discount || 0),
    preparedBy: record.NguoiLap || userName || "Nhân viên kho",
=======
    attachedDocs: record.SoChungTuGoc || record.MaDDHCode || record.MaDHCode || record.MaDDH || record.MaDH || "",
    preparedBy: record.NguoiLap || userName,
    minRows: 8,
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  };
}

const VOUCHER_CSS = `
<<<<<<< HEAD
  @page { size: A4 portrait; margin: 12mm 14mm; }
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
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
    flex-shrink: 0;
  }
  .brand-logo-receipt { background: #E7F0EE; color: #3D7068; border: 1px solid #B5D2CB; }
  .brand-logo-issue   { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
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
    font-size: 11px;
    color: #64748B;
    line-height: 1.6;
  }
  .meta-right {
    text-align: right;
    font-size: 12px;
    color: #334155;
    line-height: 1.6;
  }
  .meta-right strong {
    color: #0F172A;
    font-size: 13px;
  }
  .doc-title-row {
    text-align: center;
    margin: 14px 0 16px;
  }
  .doc-title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .title-receipt { color: #2A4F49; }
  .title-issue   { color: #065F46; }
  
  .info-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 18px;
    font-size: 12.5px;
  }
  .info-box-title {
    font-weight: 700;
    color: #334155;
    margin-bottom: 6px;
    font-size: 12px;
    text-transform: uppercase;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 18px;
  }
  .info-row {
    display: flex;
    gap: 6px;
  }
  .info-label {
    color: #64748B;
    min-width: 90px;
  }
  .info-val {
    color: #0F172A;
    font-weight: 500;
  }
  
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 12px;
  }
  table.doc-table th {
    background: #F1F5F9;
    color: #334155;
    font-weight: 600;
    padding: 8px 10px;
    border: 1px solid #CBD5E1;
    text-align: left;
  }
  table.doc-table td {
    padding: 8px 10px;
    border: 1px solid #E2E8F0;
    color: #1E293B;
  }
  table.doc-table th.center, table.doc-table td.center { text-align: center; }
  table.doc-table th.right, table.doc-table td.right { text-align: right; }
  
  .summary-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 14px;
  }
  .summary-table {
    width: 280px;
    font-size: 12.5px;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    color: #475569;
  }
  .summary-row.highlight {
    padding: 8px 10px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 13.5px;
    margin-top: 4px;
  }
  .hl-receipt { background: #E7F0EE; color: #2A4F49; }
  .hl-issue   { background: #ECFDF5; color: #065F46; }
  
  .words-row {
    font-style: italic;
    color: #475569;
    font-size: 12px;
    margin-bottom: 24px;
  }
  
  .signatures-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    text-align: center;
    margin-top: 20px;
  }
  .sig-title {
    font-weight: 700;
    color: #0F172A;
    font-size: 12.5px;
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
  .sig-name {
    font-weight: 600;
    color: #334155;
    font-size: 12px;
  }
  .footnote {
    margin-top: 26px;
    font-size: 11px;
    color: #94A3B8;
    font-style: italic;
  }
  
  @media print {
    body { padding: 0; }
    .doc-container { width: 100%; max-width: none; padding: 0; }
=======
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: "Times New Roman", Times, serif;
    font-size: 13px;
    line-height: 1.35;
  }
  .vt {
    width: 190mm;
    max-width: 100%;
    margin: 0 auto;
    padding: 4mm 2mm;
  }
  .vt-top {
    display: grid;
    grid-template-columns: 1fr 78mm;
    gap: 8px;
    align-items: start;
  }
  .vt-meta { font-size: 13px; }
  .vt-dot {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px;
    align-items: end;
    margin: 2px 0;
  }
  .vt-dot span:last-child {
    border-bottom: 1px dotted #222;
    min-height: 16px;
    padding: 0 4px;
  }
  .vt-form-no {
    text-align: center;
    font-size: 12.5px;
  }
  .vt-form-no strong {
    font-size: 14px;
    display: block;
    margin-bottom: 2px;
  }
  .vt-title {
    text-align: center;
    margin: 10px 0 2px;
  }
  .vt-title h1 {
    margin: 0;
    font-size: 22px;
    letter-spacing: 0.6px;
    font-weight: 700;
  }
  .vt-sub {
    text-align: center;
    margin: 4px 0;
  }
  .vt-so { text-align: center; margin: 2px 0 8px; }
  .vt-so b { margin-right: 6px; }
  .vt-so span {
    display: inline-block;
    min-width: 90px;
    border-bottom: 1px dotted #222;
    padding: 0 8px;
  }
  .vt-tk {
    width: 46mm;
    margin-left: auto;
    font-size: 13px;
  }
  .vt-info { margin: 8px 0 10px; }
  .vt-info .vt-dot { margin: 5px 0; }
  .vt-row2 {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 16px;
  }
  table.vt-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  table.vt-table th,
  table.vt-table td {
    border: 1px solid #111;
    padding: 4px 3px;
    vertical-align: middle;
  }
  table.vt-table th {
    font-weight: 700;
    text-align: center;
  }
  .c { text-align: center; }
  .r { text-align: right; }
  .l { text-align: left; }
  .vt-foot { margin-top: 10px; }
  .vt-sign-date { text-align: right; font-style: italic; margin: 14px 0 10px; }
  .vt-signs {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    text-align: center;
    font-size: 12px;
  }
  .vt-signs strong { display: block; }
  .vt-signs em {
    display: block;
    font-size: 11px;
    font-style: italic;
    margin-top: 2px;
  }
  .vt-signs .space { height: 58px; }
  @media print {
    .vt { width: auto; padding: 0; }
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  }
`;

export function buildWarehouseVoucherHtml(model) {
<<<<<<< HEAD
  const isReceipt = model.isReceipt;
  const title = isReceipt ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO";
  const titleClass = isReceipt ? "title-receipt" : "title-issue";
  const logoClass = isReceipt ? "brand-logo-receipt" : "brand-logo-issue";
  const hlClass = isReceipt ? "hl-receipt" : "hl-issue";
  const finalTotal = model.total - (model.discount || 0);

  const linesHtml = model.lines
    .map(
      (line, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><strong>${esc(line.name)}</strong>${line.code ? ` <span style="color:#64748b">(${esc(line.code)})</span>` : ""}</td>
      <td class="center">${esc(line.unit)}</td>
      <td class="center">${line.actual}</td>
      <td class="right">${money.format(line.price)}</td>
      <td class="right"><strong>${money.format(line.amount)}</strong></td>
    </tr>
  `
    )
    .join("");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>${esc(title)} - ${esc(model.number)}</title>
  <style>${VOUCHER_CSS}</style>
</head>
<body>
  <div class="doc-container">
    <!-- Header (Reference 1) -->
    <header class="doc-header">
      <div class="brand-left">
        <div class="brand-logo-circle ${logoClass}">
          ${isReceipt ? "📥" : "📤"}
        </div>
        <div class="brand-info">
          <h2>${esc(model.company)}</h2>
          <div class="slogan">${esc(model.slogan)}</div>
          <div class="brand-meta">
            <div>📍 Địa chỉ: ${esc(model.address)}</div>
            <div>☎ Điện thoại: ${esc(model.phone)} | ✉ Email: ${esc(model.email)}</div>
          </div>
        </div>
      </div>
      <div class="meta-right">
        <div>${isReceipt ? "Số phiếu" : "Số phiếu"}: <strong>${esc(model.number)}</strong></div>
        <div>Ngày lập: <strong>${esc(model.date)}</strong></div>
        <div>${isReceipt ? "Nhà cung cấp" : "Người nhận"}: <strong>${esc(isReceipt ? model.supplierName : model.receiverName)}</strong></div>
      </div>
    </header>

    <!-- Title -->
    <div class="doc-title-row">
      <h1 class="doc-title ${titleClass}">${esc(title)}</h1>
    </div>

    <!-- Info Block -->
    <div class="info-box">
      <div class="info-box-title">${isReceipt ? "Thông tin nhà cung cấp" : "Thông tin xuất kho"}</div>
      <div class="info-grid">
        ${
          isReceipt
            ? `
          <div class="info-row"><span class="info-label">Tên NCC:</span><span class="info-val">${esc(model.supplierName || "—")}</span></div>
          <div class="info-row"><span class="info-label">Mã số thuế:</span><span class="info-val">${esc(model.supplierTax)}</span></div>
          <div class="info-row"><span class="info-label">Địa chỉ:</span><span class="info-val">${esc(model.supplierAddress)}</span></div>
          <div class="info-row"><span class="info-label">Số ĐT:</span><span class="info-val">${esc(model.supplierPhone)}</span></div>
        `
            : `
          <div class="info-row"><span class="info-label">Lý do xuất:</span><span class="info-val">${esc(model.reason || "Bán hàng")}</span></div>
          <div class="info-row"><span class="info-label">Kho xuất:</span><span class="info-val">${esc(model.warehouse)}</span></div>
          <div class="info-row"><span class="info-label">Người nhận:</span><span class="info-val">${esc(model.receiverName)}</span></div>
          <div class="info-row"><span class="info-label">Người thực hiện:</span><span class="info-val">${esc(model.preparedBy)}</span></div>
        `
        }
      </div>
    </div>

    <!-- Product Table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th class="center" style="width: 40px">STT</th>
          <th>Tên sản phẩm</th>
          <th class="center" style="width: 60px">ĐVT</th>
          <th class="center" style="width: 70px">${isReceipt ? "SL nhập" : "SL xuất"}</th>
          <th class="right" style="width: 110px">Đơn giá</th>
          <th class="right" style="width: 120px">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <!-- Summary Box -->
    <div class="summary-wrap">
      <div class="summary-table">
        <div class="summary-row">
          <span>Tổng tiền hàng:</span>
          <span>${money.format(model.total)}</span>
        </div>
        ${
          model.discount > 0
            ? `
          <div class="summary-row">
            <span>Chiết khấu / Giảm giá:</span>
            <span>${money.format(model.discount)}</span>
          </div>
        `
            : ""
        }
        <div class="summary-row highlight ${hlClass}">
          <span>Tổng thanh toán:</span>
          <span>${money.format(finalTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Amount in words -->
    <div class="words-row">
      <strong>Số tiền bằng chữ:</strong> ${esc(amountToWords(finalTotal))}.
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div>
        <div class="sig-title">${isReceipt ? "Người giao hàng" : "Người nhận hàng"}</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-name"></div>
      </div>
      <div>
        <div class="sig-title">Thủ kho</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-name"></div>
      </div>
      <div>
        <div class="sig-title">Người lập phiếu</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
        <div class="sig-name">${esc(model.preparedBy)}</div>
      </div>
    </div>

    <div class="footnote">
      * ${isReceipt ? "Phiếu nhập kho" : "Phiếu xuất kho"} chỉ có giá trị pháp lý khi có đầy đủ chữ ký của các bên liên quan.
=======
  const { d, m, y } = parseDateParts(model.date);
  const title = model.isReceipt ? "PHIẾU NHẬP KHO" : "PHIẾU XUẤT KHO";
  const formNo = model.isReceipt ? "01 - VT" : "02 - VT";
  const personLabel = model.isReceipt
    ? "Họ và tên người giao hàng"
    : "Họ và tên người nhận hàng";
  const warehouseLabel = model.isReceipt
    ? "Nhập tại kho (ngăn lô)"
    : "Xuất tại kho (ngăn lô)";
  const qtyHead = model.isReceipt ? "Theo chứng từ" : "Yêu cầu";
  const qtyActual = model.isReceipt ? "Thực nhập" : "Thực xuất";
  const sign2 = model.isReceipt ? "Người giao hàng" : "Người nhận hàng";
  const sign4 = model.isReceipt
    ? "Kế toán trưởng<br/>(Hoặc bộ phận có nhu cầu nhập)"
    : "Kế toán trưởng<br/>(Hoặc bộ phận có nhu cầu nhập)";

  const rows = [...model.lines];
  while (rows.length < (model.minRows || 8)) {
    rows.push({ empty: true });
  }

  const body = rows
    .map((line, index) => {
      if (line.empty) {
        return `<tr>
          <td class="c">${index + 1}</td>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>`;
      }
      return `<tr>
        <td class="c">${line.stt}</td>
        <td class="l"><div style="display:flex;align-items:center;gap:6px">${line.image ? `<img src="${line.image}" alt="" onerror="this.style.display='none'" style="width:26px;height:26px;object-fit:cover;border-radius:4px;border:1px solid #e3e6e5"/>` : ""}<span>${esc(line.name)}</span></div></td>
        <td class="c">${esc(line.code)}</td>
        <td class="c">${esc(line.unit)}</td>
        <td class="c">${line.requested || ""}</td>
        <td class="c">${line.actual || ""}</td>
        <td class="r">${line.price ? money.format(line.price) : ""}</td>
        <td class="r">${line.amount ? money.format(line.amount) : ""}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} ${esc(model.number)}</title>
  <style>${VOUCHER_CSS}</style>
</head>
<body>
  <div class="vt">
    <div class="vt-top">
      <div class="vt-meta">
        <div class="vt-dot"><span>Đơn vị:</span><span>${dotted(model.company)}</span></div>
        <div class="vt-dot"><span>Bộ phận:</span><span>${dotted(model.department)}</span></div>
      </div>
      <div class="vt-form-no">
        <strong>Mẫu số ${formNo}</strong>
        (Ban hành theo Thông tư số 133/2016/TT-BTC<br/>ngày 26/8/2016 của Bộ Tài chính)
      </div>
    </div>

    <div class="vt-title"><h1>${title}</h1></div>
    <div class="vt-sub">Ngày ${d} tháng ${m} năm ${y}</div>
    <div class="vt-so"><b>Số:</b><span>${dotted(model.number)}</span></div>
    <div class="vt-tk">
      <div class="vt-dot"><span>Nợ:</span><span>${dotted(model.debit)}</span></div>
      <div class="vt-dot"><span>Có:</span><span>${dotted(model.credit)}</span></div>
    </div>

    <div class="vt-info">
      <div class="vt-dot"><span>- ${personLabel}:</span><span>${dotted(model.personName)}</span></div>
      <div class="vt-dot"><span>- Địa chỉ (bộ phận):</span><span>${dotted(model.address)}</span></div>
      <div class="vt-dot"><span>- Lý do ${model.isReceipt ? "nhập kho" : "xuất kho"}:</span><span>${dotted(model.reason)}</span></div>
      <div class="vt-row2">
        <div class="vt-dot"><span>- ${warehouseLabel}:</span><span>${dotted(model.warehouse)}</span></div>
        <div class="vt-dot"><span>Địa điểm:</span><span>${dotted(model.location)}</span></div>
      </div>
    </div>

    <table class="vt-table">
      <colgroup>
        <col style="width:7%" />
        <col style="width:32%" />
        <col style="width:10%" />
        <col style="width:8%" />
        <col style="width:10%" />
        <col style="width:10%" />
        <col style="width:11%" />
        <col style="width:12%" />
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2">STT</th>
          <th rowspan="2">Tên, nhãn hiệu, quy cách, phẩm chất vật tư, dụng cụ, sản phẩm, hàng hoá</th>
          <th rowspan="2">Mã số</th>
          <th rowspan="2">ĐVT</th>
          <th colspan="2">Số lượng</th>
          <th rowspan="2">Đơn giá</th>
          <th rowspan="2">Thành tiền</th>
        </tr>
        <tr>
          <th>${qtyHead}</th>
          <th>${qtyActual}</th>
        </tr>
        <tr>
          <th>A</th><th>B</th><th>C</th><th>D</th>
          <th>1</th><th>2</th><th>3</th><th>4</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr>
          <td colspan="2" class="c"><strong>Cộng</strong></td>
          <td class="c">x</td>
          <td class="c">x</td>
          <td class="c">x</td>
          <td class="c">x</td>
          <td class="c">x</td>
          <td class="r"><strong>${money.format(model.total)}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="vt-foot">
      <div class="vt-dot"><span>- Tổng số tiền (viết bằng chữ):</span><span>${dotted(amountToWords(model.total))}</span></div>
      <div class="vt-dot"><span>- Số chứng từ gốc kèm theo:</span><span>${dotted(model.attachedDocs)}</span></div>
    </div>

    <div class="vt-sign-date">Ngày ${d} tháng ${m} năm ${y}</div>
    <div class="vt-signs">
      <div>
        <strong>Người lập phiếu</strong>
        <em>(Ký, họ tên)</em>
        <div class="space"></div>
        ${esc(model.preparedBy || "")}
      </div>
      <div>
        <strong>${sign2}</strong>
        <em>(Ký, họ tên)</em>
        <div class="space"></div>
        ${esc(model.personName || "")}
      </div>
      <div>
        <strong>Thủ kho</strong>
        <em>(Ký, họ tên)</em>
        <div class="space"></div>
      </div>
      <div>
        <strong>${sign4}</strong>
        <em>(Ký, họ tên)</em>
        <div class="space"></div>
      </div>
      <div>
        <strong>Giám đốc</strong>
        <em>(Ký, họ tên)</em>
        <div class="space"></div>
      </div>
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    </div>
  </div>
</body>
</html>`;
}

export function printWarehouseVoucher(model) {
  const html = buildWarehouseVoucherHtml(model);
<<<<<<< HEAD
  const win = window.open("", "_blank", "width=850,height=900");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
=======
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    setTimeout(() => frame.remove(), 400);
  };
  win.onafterprint = cleanup;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 1500);
  }, 250);
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
}
