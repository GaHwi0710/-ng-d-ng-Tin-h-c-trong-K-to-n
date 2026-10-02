import { amountToWords } from "./amountToWords.js";
import { getStoreConfig, getBrandLogoUrl } from "./storeConfig.js";
import {
  renderPhieuNhapKhoM01VTHtml,
  printPhieuNhapKhoM01VT,
  renderPhieuXuatKhoM02VTHtml,
  printPhieuXuatKhoM02VT,
} from "./accountingDocsPrint.js";

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
    number: isReceipt ? (record.MaPN || record.id || "") : (record.MaPX || record.id || ""),
    supplierName: supplier?.TenNCC || record.NguoiLienQuan || "",
    supplierTax: supplier?.MST || "0101234567",
    supplierAddress: supplier?.DiaChi || record.DiaChi || "Hà Nội",
    supplierPhone: supplier?.SDT || "0912 345 678",
    receiverName: record.NguoiNhan || record.NguoiLienQuan || (isReceipt ? "" : "Khách mua lẻ"),
    receiverDept: record.DiaChi || record.BoPhanNhan || (isReceipt ? "" : "Bộ phận bán hàng"),
    reason,
    warehouse: record.Kho || "Kho chính",
    location: record.DiaDiem || cfg.address || "Hà Nội",
    TkNo: record.TkNo || (isReceipt ? "156" : "632"),
    TkCo: record.TkCo || (isReceipt ? (Number(record.SoTienDaTra || 0) >= total ? "111" : "331") : "156"),
    SoChungTuGoc: record.SoChungTuGoc || record.attachedDocs || "",
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
  if (model.isReceipt) {
    return renderPhieuNhapKhoM01VTHtml(model);
  }
  return renderPhieuXuatKhoM02VTHtml(model);
}

export function printWarehouseVoucher(model) {
  if (model.isReceipt) {
    return printPhieuNhapKhoM01VT(model);
  }
  return printPhieuXuatKhoM02VT(model);
}
