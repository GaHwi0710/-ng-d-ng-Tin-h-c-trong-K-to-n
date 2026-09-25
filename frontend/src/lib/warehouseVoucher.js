import { amountToWords } from "./amountToWords.js";
import { getStoreConfig, getBrandLogoUrl } from "./storeConfig.js";

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
      name: line.TenSP || product.TenSP || "Sản phẩm",
      code: line.MaSPCode || product.MaSP || "",
      unit: line.DonViTinh || product.DonViTinh || "Cái",
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
    (item) => item.id === record.MaNCC || item.id === record.supplierId || item.MaNCC === record.MaNCC
  );
  const date = record.NgayNhap || record.NgayXuat || new Date().toISOString().slice(0, 10);
  const lines = normalizeVoucherLines(record.details || [], products);
  const total =
    Number(record.TongTien) || lines.reduce((sum, line) => sum + line.amount, 0);
  const reason = isReceipt
    ? record.LyDoNhap || (supplier ? `Nhập hàng từ ${supplier.TenNCC}` : "Nhập hàng vào kho")
    : record.LyDoXuat || record.reason || "Bán hàng cho khách";

  const cfg = getStoreConfig();

  return {
    isReceipt,
    company: cfg.brandName || cfg.name || "Cửa hàng Mẹ & Bé",
    slogan: cfg.subtitle || "Hệ thống quản lý Cửa hàng Mẹ và Bé",
    address: cfg.address,
    phone: cfg.phone,
    hotline: cfg.hotline || cfg.phone,
    email: cfg.email,
    website: cfg.website,
    date,
    number: record.MaPN || record.MaPX || record.id || "",
    supplierName: supplier?.TenNCC || record.NguoiLienQuan || "",
    supplierTax: supplier?.MST || "0101234567",
    supplierAddress: supplier?.DiaChi || record.DiaChi || "Hà Nội",
    supplierPhone: supplier?.SDT || "0912 345 678",
    receiverName: record.NguoiNhan || record.NguoiLienQuan || "Khách lẻ",
    reason,
    warehouse: record.Kho || "Kho chính",
    location: record.DiaDiem || "Hà Nội",
    lines,
    total,
    discount: Number(record.ChietKhau || record.discount || 0),
    preparedBy: record.NguoiLap || userName || "Nhân viên kho",
  };
}

const VOUCHER_CSS = `
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
  }
`;

export function buildWarehouseVoucherHtml(model) {
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
  ${typeof window !== "undefined" && window.location?.origin ? `<base href="${window.location.origin}/">` : ""}
  <style>${VOUCHER_CSS}</style>
</head>
<body>
  <div class="doc-container">
    <!-- Header (Reference 1) -->
    <header class="doc-header">
      <div class="brand-left">
        <img src="${getBrandLogoUrl()}" class="voucher-logo-img" alt="Logo Mẹ & Bé" style="width:46px;height:46px;object-fit:contain;flex-shrink:0;" />
        <div class="brand-info">
          <h2>${esc(model.company)}</h2>
          <div class="slogan">${esc(model.slogan)}</div>
          <div class="brand-meta">
            <div>📍 <strong>Địa chỉ:</strong> ${esc(model.address)}</div>
            <div>☎ <strong>Hotline:</strong> ${esc(model.hotline || model.phone)} | ✉ <strong>Email:</strong> ${esc(model.email)}</div>
            <div>🌐 <strong>Website:</strong> ${esc(model.website || "www.cuahangmebe.vn")}</div>
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
    </div>
  </div>
</body>
</html>`;
}

export function printWarehouseVoucher(model) {
  const html = buildWarehouseVoucherHtml(model);
  const win = window.open("", "_blank", "width=850,height=900");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
}
