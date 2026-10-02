/**
 * accountingDocsPrint.js — Chuẩn hóa mẫu in 5 chứng từ kế toán theo quy chuẩn Bộ Tài Chính
 * 
 * Danh sách 5 chứng từ:
 * 1. Phiếu nhập kho — Mẫu số 01 – VT (Ban hành theo QĐ số 15/2006/QĐ-BTC & TT 200/2014/TT-BTC)
 * 2. Phiếu chi — Mẫu số 02 – TT (Kèm theo Thông tư số 99/2025/TT-BTC / TT 133/2016/TT-BTC)
 * 3. Phiếu báo nợ ngân hàng — Techcombank Internet Banking / Bank Debit Advice
 * 4. Biên bản kiểm kê vật tư, sản phẩm, hàng hóa — Mẫu số 05 – VT (Ban hành theo TT 133/2016/TT-BTC)
 * 5. Biên bản trả lại hàng hóa — Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC
 */

import { amountToWords } from "./amountToWords.js";
import { getStoreConfig, getBrandLogoUrl } from "./storeConfig.js";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateParts(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return {
      d: String(now.getDate()).padStart(2, "0"),
      m: String(now.getMonth() + 1).padStart(2, "0"),
      y: String(now.getFullYear()),
      full: now.toLocaleDateString("vi-VN"),
    };
  }
  return {
    d: String(date.getDate()).padStart(2, "0"),
    m: String(date.getMonth() + 1).padStart(2, "0"),
    y: String(date.getFullYear()),
    full: date.toLocaleDateString("vi-VN"),
  };
}

/**
 * Shared CSS for all accounting documents (Strict A4 Portrait standard)
 */
const BASE_PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 14mm 15mm 14mm 15mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    background: #fff;
    color: #000;
    font-family: "Times New Roman", Times, serif;
    font-size: 13pt;
    line-height: 1.35;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .doc-wrapper {
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
    padding: 2mm 0;
  }
  
  /* Toolbar shown in browser popup, hidden when printed */
  .print-toolbar {
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background: #1e293b;
    color: #fff;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
  }
  .print-toolbar-title {
    font-weight: 600;
  }
  .print-toolbar-actions {
    display: flex;
    gap: 10px;
  }
  .print-btn {
    background: #2563eb;
    color: #fff;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .print-btn:hover { background: #1d4ed8; }
  .close-btn {
    background: #475569;
    color: #fff;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }
  .close-btn:hover { background: #334155; }

  @media print {
    .print-toolbar { display: none !important; }
    body { padding: 0; }
    .doc-wrapper { max-width: 100%; padding: 0; }
  }

  /* Table standard 1px solid black border */
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 12pt;
  }
  table.doc-table th, table.doc-table td {
    border: 1px solid #000;
    padding: 5px 6px;
    vertical-align: middle;
  }
  table.doc-table th {
    font-weight: bold;
    text-align: center;
    background: #fbfbfb;
  }
  table.doc-table thead {
    display: table-header-group;
  }
  table.doc-table tr {
    page-break-inside: avoid;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-italic { font-style: italic; }

  /* Signatures block */
  .sig-block {
    margin-top: 15px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sig-row {
    display: flex;
    justify-content: space-between;
    text-align: center;
    margin-top: 6px;
  }
  .sig-col {
    flex: 1;
    padding: 0 4px;
  }
  .sig-title {
    font-weight: bold;
    font-size: 12pt;
  }
  .sig-note {
    font-style: italic;
    font-size: 10.5pt;
    color: #222;
  }
  .sig-space {
    height: 65px;
  }
  .sig-name {
    font-weight: bold;
    font-size: 11.5pt;
  }
`;

/**
 * 1. PHIẾU NHẬP KHO — MẪU SỐ 01 – VT (Theo ảnh media_1790859497787.png)
 */
export function renderPhieuNhapKhoM01VTHtml(data = {}) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayNhap || data.date);
  const code = data.MaPN || data.number || data.MaPNCode || "PN...";
  const tkNo = data.TkNo || data.debit || "156";
  const tkCo = data.TkCo || data.credit || (data.SoTienConLai === 0 ? "111" : "331");
  const deliveryPerson = data.NguoiGiaoHang || data.supplierName || data.TenNCC || data.NguoiLienQuan || "Nhà cung cấp";
  const sourceDoc = data.SoChungTuGoc || data.SoChungTu || data.MaDDH || data.attachedDocs || "Đơn đặt hàng";
  const warehouse = data.Kho || data.warehouse || "Kho chính";
  const location = data.DiaDiem || data.location || cfg.address;
  const note = data.GhiChu || data.LyDoNhap || data.reason || `Nhập hàng từ ${deliveryPerson}`;

  const lines = (data.details || data.lines || data.items || []).map((item, idx) => {
    const qtyDoc = Number(item.SoLuongYeuCau ?? item.requested ?? item.SoLuong ?? item.quantity ?? 0);
    const qtyActual = Number(item.SoLuong ?? item.actual ?? item.quantity ?? qtyDoc);
    const unitPrice = Number(item.DonGia ?? item.price ?? item.GiaNhap ?? 0);
    const amount = Number(item.ThanhTien ?? item.amount ?? qtyActual * unitPrice);
    return {
      stt: idx + 1,
      name: item.TenSP || item.name || "Sản phẩm",
      code: item.MaSPCode || item.MaSP || item.code || "",
      unit: item.DonViTinh || item.unit || "Hộp",
      qtyDoc,
      qtyActual,
      unitPrice,
      amount,
    };
  });

  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0) || Number(data.TongTien || data.total || 0);

  const rowsHtml = lines.length
    ? lines.map((l) => `
        <tr>
          <td class="text-center">${l.stt}</td>
          <td>${esc(l.name)}</td>
          <td class="text-center">${esc(l.code)}</td>
          <td class="text-center">${esc(l.unit)}</td>
          <td class="text-center">${l.qtyDoc}</td>
          <td class="text-center">${l.qtyActual}</td>
          <td class="text-right">${money.format(l.unitPrice)}</td>
          <td class="text-right">${money.format(l.amount)}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td class="text-center">1</td>
          <td>Hàng hóa vật tư nhập kho</td>
          <td class="text-center">SP001</td>
          <td class="text-center">Hộp</td>
          <td class="text-center">1</td>
          <td class="text-center">1</td>
          <td class="text-right">${money.format(totalAmount)}</td>
          <td class="text-right">${money.format(totalAmount)}</td>
        </tr>
      `;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Phiếu nhập kho - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📄 Xem trước Mẫu số 01 – VT: Phiếu nhập kho (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Header Top Row -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div>
        <div style="font-weight: bold; text-transform: uppercase;">Đơn vị: ${esc(cfg.brandName || cfg.name)}</div>
        <div>Địa chỉ: ${esc(cfg.address)}</div>
        <div>Bộ phận: Kho Vận &amp; Mua Hàng</div>
      </div>
      <div style="text-align: center; font-size: 11pt;">
        <div style="font-weight: bold;">Mẫu số 01 – VT</div>
        <div style="font-style: italic; font-size: 9.5pt; max-width: 250px;">
          (Ban hành theo QĐ số: 15/2006/QĐ-BTC<br/>ngày 20/3/2006 của Bộ trưởng BTC)
        </div>
      </div>
    </div>

    <!-- Title & Sub-box -->
    <div style="text-align: center; margin: 10px 0 12px;">
      <h1 style="font-size: 19pt; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">PHIẾU NHẬP KHO</h1>
      <div style="font-style: italic; font-size: 12pt;">Ngày ${date.d} tháng ${date.m} năm ${date.y}</div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12pt;">
        <div style="width: 33%;"></div>
        <div style="width: 33%; font-weight: bold;">Số: ${esc(code)}</div>
        <div style="width: 33%; text-align: right;">
          <div>Nợ: ${esc(tkNo)}</div>
          <div>Có: ${esc(tkCo)}</div>
        </div>
      </div>
    </div>

    <!-- Document Info Lines -->
    <div style="margin-bottom: 10px; font-size: 12.5pt; line-height: 1.6;">
      <div>- Họ và tên người giao: <strong>${esc(deliveryPerson)}</strong></div>
      <div>- Theo: <strong>${esc(sourceDoc)}</strong> &nbsp;&nbsp; số: <strong>${esc(data.SoChungTuGocCode || data.SoChungTuGoc || code)}</strong> &nbsp;&nbsp; ngày ${date.d} tháng ${date.m} năm ${date.y} của ${esc(deliveryPerson)}</div>
      <div>Nhập tại kho: <strong>${esc(warehouse)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Địa điểm: <strong>${esc(location)}</strong></div>
      ${note ? `<div>- Diễn giải: <em>${esc(note)}</em></div>` : ""}
    </div>

    <!-- Products Table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 38px;">STT</th>
          <th rowspan="2">Tên nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ, sản phẩm, hàng hoá</th>
          <th rowspan="2" style="width: 75px;">Mã số</th>
          <th rowspan="2" style="width: 50px;">Đơn vị tính</th>
          <th colspan="2">Số lượng</th>
          <th rowspan="2" style="width: 90px;">Đơn giá</th>
          <th rowspan="2" style="width: 105px;">Thành tiền</th>
        </tr>
        <tr>
          <th style="width: 60px;">Theo chứng từ</th>
          <th style="width: 60px;">Thực nhập</th>
        </tr>
        <tr style="font-size: 10pt; background: #fafafa;">
          <th>A</th>
          <th>B</th>
          <th>C</th>
          <th>D</th>
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="font-weight: bold;">
          <td colspan="4" class="text-center">Cộng</td>
          <td class="text-center">${lines.reduce((s, l) => s + l.qtyDoc, 0)}</td>
          <td class="text-center">${lines.reduce((s, l) => s + l.qtyActual, 0)}</td>
          <td class="text-center">X</td>
          <td class="text-right">${money.format(totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Amount in words & Attached documents -->
    <div style="margin-top: 6px; font-size: 12.5pt; line-height: 1.5;">
      <div>- Tổng số tiền (viết bằng chữ): <strong>${esc(amountToWords(totalAmount))}.</strong></div>
      <div>- Số chứng từ gốc kèm theo: <strong>${esc(sourceDoc || "01 bộ hóa đơn/chứng từ nguồn")}</strong></div>
    </div>

    <!-- Date line right -->
    <div style="text-align: right; font-style: italic; margin-top: 10px; font-size: 12pt;">
      Ngày ${date.d} tháng ${date.m} năm 20${date.y.slice(-2)}
    </div>

    <!-- 4 Signatures -->
    <div class="sig-block">
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-title">Người lập phiếu</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.NguoiLap || "Nhân viên")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người giao hàng</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(deliveryPerson)}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Thủ kho</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.ThuKho || "Trần Văn Hùng")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Kế toán trưởng</div>
          <div class="sig-note">(Hoặc bộ phận có nhu cầu nhập)<br/>(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.KeToanTruong || "Nguyễn Thị Mai")}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 2. PHIẾU XUẤT KHO — MẪU SỐ 02 – VT (Theo Thông tư 200/2014/TT-BTC & TT 133/2016/TT-BTC)
 */
export function renderPhieuXuatKhoM02VTHtml(data = {}) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayXuat || data.date);
  const code = data.MaPX || data.number || data.MaPXCode || "PX...";
  const tkNo = data.TkNo || data.debit || "632";
  const tkCo = data.TkCo || data.credit || "156";
  const receiver = data.NguoiNhan || data.receiverName || data.customerName || data.TenKH || data.NguoiLienQuan || "Khách mua lẻ";
  const receiverDept = data.BoPhanNhan || data.DiaChi || data.receiverDept || "Bộ phận bán hàng";
  const reason = data.LyDoXuat || data.LyDo || data.reason || "Xuất bán lẻ hàng hóa";
  const warehouse = data.Kho || data.warehouse || "Kho chính";
  const location = data.DiaDiem || data.location || cfg.address;
  const sourceDoc = data.SoChungTuGoc || data.attachedDocs || data.ChungTuGoc || "";

  const lines = (data.details || data.lines || data.items || []).map((item, idx) => {
    const qtyDoc = Number(item.SoLuongYeuCau ?? item.requested ?? item.SoLuong ?? item.quantity ?? item.actual ?? 0);
    const qtyActual = Number(item.SoLuong ?? item.actual ?? item.quantity ?? qtyDoc);
    const unitPrice = Number(item.DonGia ?? item.price ?? item.GiaBan ?? item.GiaNhap ?? 0);
    const amount = Number(item.ThanhTien ?? item.amount ?? qtyActual * unitPrice);
    return {
      stt: idx + 1,
      name: item.TenSP || item.name || "Sản phẩm",
      code: item.MaSPCode || item.MaSP || item.code || "",
      unit: item.DonViTinh || item.unit || "Cái",
      qtyDoc,
      qtyActual,
      unitPrice,
      amount,
    };
  });

  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0) || Number(data.TongTien || data.total || 0);

  const rowsHtml = lines.length
    ? lines.map((l) => `
        <tr>
          <td class="text-center">${l.stt}</td>
          <td>${esc(l.name)}</td>
          <td class="text-center">${esc(l.code)}</td>
          <td class="text-center">${esc(l.unit)}</td>
          <td class="text-center">${l.qtyDoc}</td>
          <td class="text-center">${l.qtyActual}</td>
          <td class="text-right">${money.format(l.unitPrice)}</td>
          <td class="text-right">${money.format(l.amount)}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td class="text-center">1</td>
          <td>Hàng hóa xuất kho</td>
          <td class="text-center">SP001</td>
          <td class="text-center">Cái</td>
          <td class="text-center">1</td>
          <td class="text-center">1</td>
          <td class="text-right">${money.format(totalAmount)}</td>
          <td class="text-right">${money.format(totalAmount)}</td>
        </tr>
      `;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Phiếu xuất kho - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📄 Xem trước Mẫu số 02 – VT: Phiếu xuất kho (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Header Top Row -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
      <div>
        <div style="font-weight: bold; text-transform: uppercase;">Đơn vị: ${esc(cfg.brandName || cfg.name)}</div>
        <div>Địa chỉ: ${esc(cfg.address)}</div>
        <div>Bộ phận: Kho Vận &amp; Bán Hàng</div>
      </div>
      <div style="text-align: center; font-size: 11pt;">
        <div style="font-weight: bold;">Mẫu số 02 – VT</div>
        <div style="font-style: italic; font-size: 9.5pt; max-width: 260px;">
          (Ban hành theo Thông tư số 200/2014/TT-BTC<br/>ngày 22/12/2014 của Bộ Tài chính)
        </div>
      </div>
    </div>

    <!-- Title & Sub-box -->
    <div style="text-align: center; margin: 10px 0 12px;">
      <h1 style="font-size: 19pt; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 2px;">PHIẾU XUẤT KHO</h1>
      <div style="font-style: italic; font-size: 12pt;">Ngày ${date.d} tháng ${date.m} năm ${date.y}</div>
      <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12pt;">
        <div style="width: 33%;"></div>
        <div style="width: 33%; font-weight: bold;">Số: ${esc(code)}</div>
        <div style="width: 33%; text-align: right;">
          <div>Nợ: <strong>${esc(tkNo)}</strong></div>
          <div>Có: <strong>${esc(tkCo)}</strong></div>
        </div>
      </div>
    </div>

    <!-- Document Info Lines -->
    <div style="margin-bottom: 10px; font-size: 12.5pt; line-height: 1.6;">
      <div>- Họ và tên người nhận hàng: <strong>${esc(receiver)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Địa chỉ (bộ phận): <strong>${esc(receiverDept)}</strong></div>
      <div>- Lý do xuất kho: <strong>${esc(reason)}</strong></div>
      <div>- Xuất tại kho (ngăn lô): <strong>${esc(warehouse)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Địa điểm: <strong>${esc(location)}</strong></div>
      ${sourceDoc ? `<div>- Theo: <strong>${esc(sourceDoc)}</strong> &nbsp;&nbsp; số: <strong>${esc(data.SoChungTuGocCode || data.SoChungTuGoc || code)}</strong> &nbsp;&nbsp; ngày ${date.d} tháng ${date.m} năm ${date.y}</div>` : ""}
    </div>

    <!-- Products Table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 38px;">STT</th>
          <th rowspan="2">Tên nhãn hiệu, quy cách phẩm chất vật tư, dụng cụ, sản phẩm, hàng hoá</th>
          <th rowspan="2" style="width: 75px;">Mã số</th>
          <th rowspan="2" style="width: 50px;">Đơn vị tính</th>
          <th colspan="2">Số lượng</th>
          <th rowspan="2" style="width: 90px;">Đơn giá</th>
          <th rowspan="2" style="width: 105px;">Thành tiền</th>
        </tr>
        <tr>
          <th style="width: 65px;">Theo chứng từ</th>
          <th style="width: 65px;">Thực xuất</th>
        </tr>
        <tr style="font-size: 10pt; background: #fafafa;">
          <th>A</th>
          <th>B</th>
          <th>C</th>
          <th>D</th>
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="font-weight: bold;">
          <td colspan="4" class="text-center">Cộng</td>
          <td class="text-center">${lines.reduce((s, l) => s + l.qtyDoc, 0)}</td>
          <td class="text-center">${lines.reduce((s, l) => s + l.qtyActual, 0)}</td>
          <td class="text-center">X</td>
          <td class="text-right">${money.format(totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Amount in words & Attached documents -->
    <div style="margin-top: 6px; font-size: 12.5pt; line-height: 1.5;">
      <div>- Tổng số tiền (viết bằng chữ): <strong>${esc(amountToWords(totalAmount))}.</strong></div>
      <div>- Số chứng từ gốc kèm theo: <strong>${esc(sourceDoc || "01 bộ hóa đơn/chứng từ nguồn")}</strong></div>
    </div>

    <!-- Date line right -->
    <div style="text-align: right; font-style: italic; margin-top: 10px; font-size: 12pt;">
      Ngày ${date.d} tháng ${date.m} năm 20${date.y.slice(-2)}
    </div>

    <!-- 5 Signatures -->
    <div class="sig-block">
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-title">Người lập phiếu</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.NguoiLap || "Nhân viên")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người nhận hàng</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(receiver)}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Thủ kho</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.ThuKho || "Trần Văn Hùng")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Kế toán trưởng</div>
          <div class="sig-note">(Hoặc bộ phận có nhu cầu xuất)<br/>(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.KeToanTruong || "Nguyễn Thị Mai")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Giám đốc</div>
          <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.GiamDoc || "Đã duyệt")}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 3. PHIẾU CHI — MẪU SỐ 02 – TT (Theo ảnh media_1790859501586.png)
 */
export function renderPhieuChiM02TTHtml(data = {}) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayChi || data.NgayLap || data.date);
  const code = data.MaPC || data.number || "PC...";
  const recipient = data.NguoiNhanTien || data.TenNCC || data.receiverName || data.personName || "Người nhận tiền";
  const address = data.DiaChi || data.address || cfg.address;
  const reason = data.LyDo || data.LyDoChi || data.reason || "Thanh toán công nợ nhà cung cấp";
  const amount = Number(data.SoTien || data.amount || 0);
  const attached = data.KemTheo || data.sourceDocs || data.ChungTuGoc || "Chứng từ gốc liên quan";
  const quyenSo = data.QuyenSo || "01";
  const tkNo = data.TkNo || (data.MaNCC ? "331" : "642");
  const tkCo = data.TkCo || (data.PhuongThuc === "Chuyển khoản" ? "112" : "111");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Phiếu chi - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📄 Xem trước Mẫu số 02 – TT: Phiếu chi (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Header Top Row -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <div>
        <div style="font-weight: bold; text-transform: uppercase;">Đơn vị: ${esc(cfg.brandName || cfg.name)}</div>
        <div>Địa chỉ: ${esc(cfg.address)}</div>
      </div>
      <div style="text-align: center; font-size: 11pt;">
        <div style="font-weight: bold;">Mẫu số 02 – TT</div>
        <div style="font-style: italic; font-size: 9.5pt; max-width: 250px;">
          (Kèm theo Thông tư số 99/2025/TT-BTC<br/>ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)
        </div>
      </div>
    </div>

    <!-- Title & Sub-box -->
    <div style="text-align: center; margin: 12px 0 10px;">
      <h1 style="font-size: 20pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px;">PHIẾU CHI</h1>
      <div style="font-style: italic; font-size: 12pt;">Ngày ${date.d} tháng ${date.m} năm ${date.y}</div>
      <div style="display: flex; justify-content: flex-end; margin-top: -15px; font-size: 11.5pt; text-align: left;">
        <div style="border: 1px dashed #999; padding: 4px 12px; border-radius: 4px; background: #fafafa;">
          <div>Quyển số: <strong>${esc(quyenSo)}</strong></div>
          <div>Số: <strong>${esc(code)}</strong></div>
          <div>Nợ: <strong>${esc(tkNo)}</strong></div>
          <div>Có: <strong>${esc(tkCo)}</strong></div>
        </div>
      </div>
    </div>

    <!-- Content fields -->
    <div style="margin: 10px 0 15px; font-size: 12.5pt; line-height: 1.8;">
      <div>Họ và tên người nhận tiền: <strong>${esc(recipient)}</strong></div>
      <div>Địa chỉ: <strong>${esc(address)}</strong></div>
      <div>Lý do chi: <strong>${esc(reason)}</strong></div>
      <div>Số tiền: <strong style="font-size: 13.5pt;">${money.format(amount)} đ</strong> &nbsp;&nbsp;&nbsp;&nbsp; (Viết bằng chữ): <strong>${esc(amountToWords(amount))}.</strong></div>
      <div>Kèm theo: <strong>${esc(attached)}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chứng từ gốc: <strong>${esc(data.ChungTuGoc || "Hóa đơn/Phiếu nhập kho")}</strong></div>
    </div>

    <!-- Date line right -->
    <div style="text-align: right; font-style: italic; margin-top: 10px; font-size: 12pt;">
      Ngày ${date.d} tháng ${date.m} năm 20${date.y.slice(-2)}
    </div>

    <!-- 5 Signatures -->
    <div class="sig-block">
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-title">Giám đốc</div>
          <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
          <div class="sig-space"></div>
          <div class="sig-name">Đã duyệt chi</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Kế toán trưởng</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">Nguyễn Thị Mai</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Thủ quỹ</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">Lê Thị Hoa</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người lập phiếu</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(data.NguoiLap || "Kế toán viên")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người nhận tiền</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space"></div>
          <div class="sig-name">${esc(recipient)}</div>
        </div>
      </div>
    </div>

    <!-- Bottom Confirmation Section -->
    <div style="margin-top: 25px; border-top: 1px dotted #555; padding-top: 8px; font-size: 11pt; line-height: 1.5;">
      <div>Đã nhận đủ số tiền (viết bằng chữ): <strong>${esc(amountToWords(amount))}.</strong></div>
      <div>+ Tỷ giá ngoại tệ (vàng bạc, đá quý): ....................................................................................................................</div>
      <div>+ Số tiền quy đổi: ......................................................................................................................................................</div>
      <div style="font-style: italic; margin-top: 4px;">(Liên gửi ra ngoài phải đóng dấu)</div>
      <div style="font-style: italic; font-size: 9.5pt; color: #444; margin-top: 4px;">
        Ghi chú: Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 3. PHIẾU BÁO NỢ NGÂN HÀNG (Theo ảnh media_1790859505949.png)
 */
export function renderPhieuBaoNoNganHangHtml(data = {}) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayChi || data.NgayThanhToan || data.date);
  const code = data.MaPC || data.MaTT || data.number || "PC001";
  const amount = Number(data.SoTien || data.amount || 0);
  const transCode = data.MaGiaoDich || `FT${date.y.slice(-2)}${date.m}${date.d}${String(code).replace(/\D/g, "").padStart(6, "0")}\\BNK`;
  const refCode = data.SoThamChieu || `${date.y.slice(-2)}${date.m}${date.d}75541794.010001`;
  const bankName = data.NganHang || cfg.bankName || "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)";
  const transferAccountName = cfg.accountName || "CÔNG TY TNHH MẸ VÀ BÉ BABY SHOP";
  const transferAccountNumber = cfg.bankAccount || "19036868688888";
  const receiverName = data.TenNCC || data.NguoiNhanTien || data.receiverName || "Đối tác nhận tiền";
  const receiverAccount = data.SoTaiKhoanNhan || data.receiverAccount || "0987654321999";
  const receiverBank = data.NganHangNhan || data.receiverBank || "Techcombank / Vietcombank";
  const memo = data.NoiDung || data.LyDo || `Thanh toán công nợ theo chứng từ ${esc(data.ChungTuGoc || code)}`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Phiếu báo nợ - ${esc(transCode)}</title>
  <style>
    ${BASE_PRINT_CSS}
    .bank-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .bank-logo-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bank-logo-svg {
      width: 44px;
      height: 44px;
    }
    .bank-title-red {
      color: #E11D48;
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin: 12px 0 14px;
      letter-spacing: 0.5px;
    }
    .bank-party-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    .bank-party-table th {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      padding: 6px 10px;
      text-align: left;
      font-weight: bold;
      width: 50%;
    }
    .bank-party-table td {
      border: 1px solid #CBD5E1;
      padding: 8px 10px;
      vertical-align: top;
      font-size: 11.5pt;
      line-height: 1.6;
    }
    .bank-detail-box {
      border: 1px solid #CBD5E1;
      padding: 10px 14px;
      margin-top: 10px;
      font-size: 12pt;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">🏦 Xem trước Phiếu báo nợ ngân hàng (${esc(transCode)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Top System Brand -->
    <div style="text-align: center; font-size: 10pt; color: #475569; margin-bottom: 6px; letter-spacing: 1px;">
      TECHCOMBANK INTERNETBANKING
    </div>

    <!-- Bank Header -->
    <div class="bank-header">
      <div>
        <div class="bank-logo-wrap">
          <!-- Techcombank official red dual-rhombus SVG icon -->
          <svg class="bank-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="10" fill="#E11D48"/>
            <path d="M30 50L50 30L70 50L50 70L30 50Z" fill="white"/>
            <path d="M42 50L50 42L58 50L50 58L42 50Z" fill="#E11D48"/>
          </svg>
          <div>
            <div style="font-size: 16pt; font-weight: bold; color: #0F172A; line-height: 1.2;">TECHCOMBANK</div>
            <div style="font-size: 10pt; color: #334155;">Ngân hàng TMCP Kỹ thương Việt Nam</div>
            <div style="font-size: 9.5pt; color: #64748B;">Mã số thuế: 0100230800</div>
          </div>
        </div>
      </div>
      <div style="text-align: right; font-size: 10pt; color: #334155; line-height: 1.5;">
        <div>Số giao dịch: <strong>${esc(transCode)}</strong></div>
        <div>Số tham chiếu: <strong>${esc(refCode)}</strong></div>
      </div>
    </div>

    <!-- Title Red -->
    <div class="bank-title-red">PHIẾU BÁO NỢ</div>

    <!-- Customer Organization Info -->
    <div style="font-size: 12pt; margin-bottom: 8px; line-height: 1.5;">
      <div>Tên tổ chức: <strong>${esc(cfg.brandName || cfg.name || transferAccountName)}</strong></div>
      <div>Mã số thuế: <strong>${esc(cfg.taxCode || "0109876543")}</strong></div>
      <div>Địa chỉ: <strong>${esc(cfg.address)}</strong></div>
    </div>

    <!-- Parties Table -->
    <table class="bank-party-table">
      <thead>
        <tr>
          <th>Người chuyển tiền</th>
          <th>Người nhận tiền</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div>Tên tài khoản: <strong>${esc(transferAccountName)}</strong></div>
            <div>Số tài khoản: <strong>${esc(transferAccountNumber)}</strong></div>
            <div>Tại Ngân hàng: <strong>${esc(bankName)}</strong></div>
          </td>
          <td>
            <div>Tên tài khoản: <strong>${esc(receiverName)}</strong></div>
            <div>Số tài khoản: <strong>${esc(receiverAccount)}</strong></div>
            <div>Tại Ngân hàng: <strong>${esc(receiverBank)}</strong></div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Transaction Details -->
    <div class="bank-detail-box">
      <div style="font-weight: bold; margin-bottom: 4px; text-decoration: underline;">Chi tiết giao dịch:</div>
      <div style="display: flex; justify-content: space-between;">
        <span>Ngày giao dịch:</span>
        <strong>${date.full}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Loại tiền:</span>
        <strong>VND</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Số tiền giao dịch:</span>
        <strong style="font-size: 13pt;">${money.format(amount)} VND</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Tổng phí + thuế:</span>
        <strong>0 VND</strong>
      </div>
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CBD5E1; padding-top: 4px; margin-top: 4px;">
        <span style="font-weight: bold;">Tổng số tiền:</span>
        <strong style="font-size: 14pt; color: #E11D48;">${money.format(amount)} VND</strong>
      </div>
      <div style="margin-top: 4px;">
        <span>Số tiền bằng chữ:</span>
        <strong>${esc(amountToWords(amount))}.</strong>
      </div>
      <div style="margin-top: 4px;">
        <span>Nội dung thanh toán:</span>
        <strong>${esc(memo)}</strong>
      </div>
    </div>

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-around; margin-top: 25px; text-align: center;">
      <div>
        <div style="font-weight: bold; font-size: 12pt;">Giao dịch viên/Chuyên viên</div>
        <div style="font-style: italic; font-size: 10pt; color: #555;">(Ký, ghi rõ họ tên)</div>
        <div style="height: 60px;"></div>
        <div style="font-weight: bold; font-size: 11pt;">Lê Thị Mai Anh</div>
      </div>
      <div>
        <div style="font-weight: bold; font-size: 12pt;">Kiểm soát viên</div>
        <div style="font-style: italic; font-size: 10pt; color: #555;">(Ký, ghi rõ họ tên)</div>
        <div style="height: 60px;"></div>
        <div style="font-weight: bold; font-size: 11pt;">Trần Hoàng Nam</div>
      </div>
    </div>

    <!-- Footer Note -->
    <div style="text-align: center; font-style: italic; font-size: 9pt; color: #64748B; margin-top: 35px; border-top: 1px solid #E2E8F0; padding-top: 6px;">
      Phiếu này được in từ hệ thống ngân hàng điện tử của Techcombank 1/1 &nbsp;|&nbsp; Chứng từ thanh toán hợp lệ đối soát kế toán
    </div>
  </div>
</body>
</html>`;
}

/**
 * 4. BIÊN BẢN KIỂM KÊ VẬT TƯ, SẢN PHẨM, HÀNG HÓA — MẪU SỐ 05 - VT (Theo ảnh media_1790860039790.png)
 */
export function renderBienBanKiemKeM05VTHtml(data = {}, products = []) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayKiem || data.NgayLap || data.date);
  const code = data.MaKK || data.number || "KK001";
  const warehouse = data.Kho || "Kho chính";
  const members = data.BanKiemKe || [
    { name: data.NguoiLap || "Trần Văn Hùng", role: "Thủ kho", rep: "Trưởng ban" },
    { name: "Nguyễn Thị Mai", role: "Kế toán kho", rep: "Ủy viên" },
    { name: "Phạm Quốc Tuấn", role: "Quản lý kho vận", rep: "Ủy viên" },
  ];

  const items = (data.details || data.items || []).map((line, idx) => {
    const prod = products.find((p) => String(p.id) === String(line.MaSP) || String(p.MaSP) === String(line.MaSP)) || {};
    const name = line.TenSP || prod.TenSP || "Sản phẩm";
    const pCode = line.MaSPCode || prod.MaSP || `SP${String(idx + 1).padStart(3, "0")}`;
    const unit = line.DonViTinh || prod.DonViTinh || "Hộp";
    const price = Number(line.DonGia || prod.GiaNhap || 100000);
    const sysQty = Number(line.SoLuongSoSach ?? line.TonHeThong ?? line.sysQty ?? 0);
    const actQty = Number(line.SoLuongThucTe ?? line.TonThucTe ?? line.actualQty ?? sysQty);
    const diff = actQty - sysQty;
    const sysAmount = sysQty * price;
    const actAmount = actQty * price;

    const thuaQty = diff > 0 ? diff : 0;
    const thuaAmount = diff > 0 ? diff * price : 0;
    const thieuQty = diff < 0 ? Math.abs(diff) : 0;
    const thieuAmount = diff < 0 ? Math.abs(diff) * price : 0;

    return {
      stt: idx + 1,
      name,
      code: pCode,
      unit,
      price,
      sysQty,
      sysAmount,
      actQty,
      actAmount,
      thuaQty,
      thuaAmount,
      thieuQty,
      thieuAmount,
      good: "100%",
      poor: "",
      damaged: "",
    };
  });

  const totalSysAmount = items.reduce((s, i) => s + i.sysAmount, 0);
  const totalActAmount = items.reduce((s, i) => s + i.actAmount, 0);
  const totalThuaAmount = items.reduce((s, i) => s + i.thuaAmount, 0);
  const totalThieuAmount = items.reduce((s, i) => s + i.thieuAmount, 0);

  const rowsHtml = items.length
    ? items.map((i) => `
        <tr>
          <td class="text-center">${i.stt}</td>
          <td>${esc(i.name)}</td>
          <td class="text-center">${esc(i.code)}</td>
          <td class="text-center">${esc(i.unit)}</td>
          <td class="text-right">${money.format(i.price)}</td>
          <td class="text-center">${i.sysQty}</td>
          <td class="text-right">${money.format(i.sysAmount)}</td>
          <td class="text-center">${i.actQty}</td>
          <td class="text-right">${money.format(i.actAmount)}</td>
          <td class="text-center">${i.thuaQty || ""}</td>
          <td class="text-right">${i.thuaAmount ? money.format(i.thuaAmount) : ""}</td>
          <td class="text-center">${i.thieuQty || ""}</td>
          <td class="text-right">${i.thieuAmount ? money.format(i.thieuAmount) : ""}</td>
          <td class="text-center">100%</td>
          <td class="text-center"></td>
          <td class="text-center"></td>
        </tr>
      `).join("")
    : `
        <tr>
          <td colspan="16" class="text-center font-italic" style="padding: 12px;">Chưa có danh sách mặt hàng kiểm kê</td>
        </tr>
      `;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Biên bản kiểm kê - ${esc(code)}</title>
  <style>
    ${BASE_PRINT_CSS}
    @page { size: A4 landscape; margin: 10mm 12mm; }
    .doc-wrapper { max-width: 275mm; }
    table.doc-table { font-size: 10.5pt; }
    table.doc-table th, table.doc-table td { padding: 4px 5px; }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📋 Xem trước Mẫu số 05 - VT: Biên bản kiểm kê vật tư, sản phẩm, hàng hóa (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4 Ngang)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Top Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
      <div>
        <div style="font-weight: bold; text-transform: uppercase;">Đơn vị: ${esc(cfg.brandName || cfg.name)}</div>
        <div>Bộ phận: Kho Hàng &amp; Quản Lý Vật Tư</div>
      </div>
      <div style="text-align: center; font-size: 11pt;">
        <div style="font-weight: bold;">Mẫu số 05 - VT</div>
        <div style="font-style: italic; font-size: 9.5pt; max-width: 280px;">
          (Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)
        </div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin: 6px 0 10px;">
      <h1 style="font-size: 17pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">
        BIÊN BẢN KIỂM KÊ VẬT TƯ, SẢN PHẨM, HÀNG HÓA
      </h1>
      <div style="font-style: italic; font-size: 11.5pt;">Số biên bản: <strong>${esc(code)}</strong></div>
    </div>

    <!-- Intro Meta -->
    <div style="font-size: 11.5pt; line-height: 1.5; margin-bottom: 6px;">
      <div>- Thời điểm kiểm kê: 08 giờ 00 phút, ngày ${date.d} tháng ${date.m} năm ${date.y}</div>
      <div>- Ban kiểm kê gồm:</div>
      ${members.map((m, idx) => `
        <div style="margin-left: 15px;">
          Ông/Bà: <strong>${esc(m.name)}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: <strong>${esc(m.role)}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Đại diện: <strong>${esc(m.rep)}</strong>
        </div>
      `).join("")}
      <div>- Đã kiểm kê kho: <strong>${esc(warehouse)}</strong> có những mặt hàng dưới đây:</div>
    </div>

    <!-- 16-Column Multi-Level Table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 30px;">STT</th>
          <th rowspan="2">Tên, nhãn hiệu, quy cách vật tư, dụng cụ,...</th>
          <th rowspan="2" style="width: 60px;">Mã số</th>
          <th rowspan="2" style="width: 45px;">Đơn vị tính</th>
          <th rowspan="2" style="width: 75px;">Đơn giá</th>
          <th colspan="2">Theo sổ kế toán</th>
          <th colspan="2">Theo kiểm kê</th>
          <th colspan="4">Chênh lệch</th>
          <th colspan="3">Phẩm chất</th>
        </tr>
        <tr>
          <th style="width: 45px;">Số lượng</th>
          <th style="width: 75px;">Thành tiền</th>
          <th style="width: 45px;">Số lượng</th>
          <th style="width: 75px;">Thành tiền</th>
          <th style="width: 40px;">Thừa SL</th>
          <th style="width: 65px;">Thừa TT</th>
          <th style="width: 40px;">Thiếu SL</th>
          <th style="width: 65px;">Thiếu TT</th>
          <th style="width: 45px;">Còn tốt 100%</th>
          <th style="width: 45px;">Kém PC</th>
          <th style="width: 45px;">Mất PC</th>
        </tr>
        <tr style="font-size: 9pt; background: #fafafa;">
          <th>A</th>
          <th>B</th>
          <th>C</th>
          <th>D</th>
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
          <th>5</th>
          <th>6</th>
          <th>7</th>
          <th>8</th>
          <th>9</th>
          <th>10</th>
          <th>11</th>
          <th>12</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="font-weight: bold; background: #fbfbfb;">
          <td colspan="4" class="text-center">Cộng</td>
          <td class="text-center">X</td>
          <td class="text-center">X</td>
          <td class="text-right">${money.format(totalSysAmount)}</td>
          <td class="text-center">X</td>
          <td class="text-right">${money.format(totalActAmount)}</td>
          <td class="text-center">X</td>
          <td class="text-right">${totalThuaAmount ? money.format(totalThuaAmount) : "0"}</td>
          <td class="text-center">X</td>
          <td class="text-right">${totalThieuAmount ? money.format(totalThieuAmount) : "0"}</td>
          <td class="text-center">X</td>
          <td class="text-center">X</td>
          <td class="text-center">X</td>
        </tr>
      </tbody>
    </table>

    <!-- Date line right -->
    <div style="text-align: right; font-style: italic; margin-top: 8px; font-size: 11pt;">
      Ngày ${date.d} tháng ${date.m} năm 20${date.y.slice(-2)}
    </div>

    <!-- 4 Signatures -->
    <div class="sig-block" style="margin-top: 8px;">
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-title">Giám đốc</div>
          <div class="sig-note">(Ý kiến giải quyết số chênh lệch)<br/>(Ký, họ tên)</div>
          <div class="sig-space" style="height: 50px;"></div>
          <div class="sig-name">Đã duyệt xử lý</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Kế toán trưởng</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 50px;"></div>
          <div class="sig-name">Nguyễn Thị Mai</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Thủ kho</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 50px;"></div>
          <div class="sig-name">${esc(members[0]?.name || "Trần Văn Hùng")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Trưởng ban kiểm kê</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 50px;"></div>
          <div class="sig-name">${esc(members[0]?.name || "Trần Văn Hùng")}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 5. BIÊN BẢN TRẢ LẠI HÀNG HÓA (Theo ảnh media_1790860109246.png)
 */
export function renderBienBanTraLaiHangHoaHtml(data = {}, products = [], customers = []) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayTra || data.date);
  const code = data.MaPTH || data.number || "PTH001";
  const invoiceCode = data.MaHDCode || data.MaHD || data.MaDHCode || data.MaDH || "HĐ/ĐH gốc";
  const invoiceDate = formatDateParts(data.NgayBanGiao || data.NgayHoaDon || data.NgayTra);
  const reason = data.LyDo || data.reason || "Lỗi kỹ thuật, bao bì móp méo không đảm bảo chất lượng";

  // Phân biệt: Khách hàng trả cửa hàng vs Cửa hàng trả nhà cung cấp
  const isCustomerReturn = data.LoaiTraHang !== "supplier" && !data.isSupplierReturn;

  const seller = isCustomerReturn
    ? {
        name: cfg.brandName || cfg.name || "CÔNG TY TNHH MẸ VÀ BÉ BABY SHOP",
        tax: cfg.taxCode || "0109876543",
        address: cfg.address,
        rep: "Bà Nguyễn Thị Mai",
        role: "Giám đốc",
      }
    : {
        name: data.TenNCC || "NHÀ CUNG CẤP VẬT TƯ MẸ & BÉ",
        tax: data.MaSoThueNCC || "0108889999",
        address: data.DiaChiNCC || "Hà Nội",
        rep: data.DaiDienNCC || "Ông Trần Văn Hùng",
        role: "Giám đốc",
      };

  const buyer = isCustomerReturn
    ? {
        name: data.TenKH || "KHÁCH HÀNG MUA HÀNG",
        tax: data.MaSoThueKH || "—",
        address: data.DiaChiKH || "Hà Nội",
        rep: data.TenKH || "Khách hàng",
        role: "Người mua hàng",
      }
    : {
        name: cfg.brandName || cfg.name || "CÔNG TY TNHH MẸ VÀ BÉ BABY SHOP",
        tax: cfg.taxCode || "0109876543",
        address: cfg.address,
        rep: "Bà Nguyễn Thị Mai",
        role: "Giám đốc",
      };

  const items = (data.details || data.lines || data.items || []).map((line, idx) => {
    const prod = products.find((p) => String(p.id) === String(line.MaSP) || String(p.MaSP) === String(line.MaSP)) || {};
    const name = line.TenSP || prod.TenSP || "Sản phẩm";
    const pCode = line.MaSPCode || prod.MaSP || `SP${String(idx + 1).padStart(3, "0")}`;
    const unit = line.DonViTinh || prod.DonViTinh || "Hộp";
    const qty = Number(line.SoLuong || line.quantity || 1);
    const price = Number(line.DonGia || line.price || prod.GiaBan || 0);
    const amount = qty * price;
    return {
      stt: idx + 1,
      name,
      code: pCode,
      unit,
      qty,
      price,
      amount,
      condition: line.TinhTrang || "Lỗi kỹ thuật, không đảm bảo chất lượng",
    };
  });

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  const rowsHtml = items.length
    ? items.map((i) => `
        <tr>
          <td class="text-center">${i.stt}</td>
          <td><strong>${esc(i.name)}</strong></td>
          <td class="text-center">${esc(i.code)}</td>
          <td class="text-center">${esc(i.unit)}</td>
          <td class="text-center"><strong>${i.qty}</strong></td>
          <td class="text-right">${money.format(i.price)}</td>
          <td class="text-right"><strong>${money.format(i.amount)}</strong></td>
          <td>${esc(i.condition)}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td class="text-center">1</td>
          <td>Hàng hóa trả lại theo thỏa thuận</td>
          <td class="text-center">SP001</td>
          <td class="text-center">Hộp</td>
          <td class="text-center">1</td>
          <td class="text-right">${money.format(totalAmount)}</td>
          <td class="text-right">${money.format(totalAmount)}</td>
          <td>Lỗi kỹ thuật</td>
        </tr>
      `;

  const itemNames = items.map((i) => i.name).join(", ") || "Hàng hóa mua tại cửa hàng";

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Biên bản trả lại hàng hóa - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📜 Xem trước Biên bản trả lại hàng hóa (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- National Header -->
    <div style="text-align: center; margin-bottom: 12px;">
      <div style="font-weight: bold; font-size: 13pt; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div style="font-weight: bold; font-size: 13.5pt;">Độc lập – Tự do – Hạnh phúc</div>
      <div style="width: 140px; height: 1px; background: #000; margin: 4px auto 0;"></div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin: 14px 0 12px;">
      <h1 style="font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">
        BIÊN BẢN TRẢ LẠI HÀNG HÓA
      </h1>
      <div style="font-size: 12pt;">(Số: <strong>${esc(code)}</strong>)</div>
    </div>

    <!-- Legal Framework -->
    <div style="font-size: 11.5pt; font-style: italic; line-height: 1.5; margin-bottom: 10px; color: #1e293b;">
      <div>- Căn cứ Nghị định 123/2020/NĐ-CP ngày 19 tháng 10 năm 2020 quy định về hoá đơn, chứng từ;</div>
      <div>- Căn cứ Thông tư 78/2021/TT-BTC ngày 17 tháng 9 năm 2021 hướng dẫn thực hiện một số điều của Luật Quản lý thuế, Nghị định 123/2020/NĐ-CP quy định về hóa đơn, chứng từ.</div>
    </div>

    <!-- Parties Intro -->
    <div style="font-size: 12pt; line-height: 1.6; margin-bottom: 10px;">
      <div>Hôm nay, ngày ${date.d} tháng ${date.m} năm 20${date.y.slice(-2)}, hai bên chúng tôi gồm có:</div>
      
      <div style="margin: 6px 0 6px 12px;">
        <div><strong>Đơn vị bán hàng:</strong> <strong>${esc(seller.name)}</strong></div>
        <div>Mã số thuế: ${esc(seller.tax)}</div>
        <div>Địa chỉ: ${esc(seller.address)}</div>
        <div style="display: flex; justify-content: space-between; max-width: 480px;">
          <span>Đại diện: <strong>${esc(seller.rep)}</strong></span>
          <span>Chức vụ: <strong>${esc(seller.role)}</strong></span>
        </div>
      </div>

      <div style="margin: 6px 0 6px 12px;">
        <div><strong>Đơn vị mua hàng:</strong> <strong>${esc(buyer.name)}</strong></div>
        <div>Mã số thuế: ${esc(buyer.tax)}</div>
        <div>Địa chỉ: ${esc(buyer.address)}</div>
        <div style="display: flex; justify-content: space-between; max-width: 480px;">
          <span>Đại diện: <strong>${esc(buyer.rep)}</strong></span>
          <span>Chức vụ: <strong>${esc(buyer.role)}</strong></span>
        </div>
      </div>
    </div>

    <!-- Inspection and Fact Statement -->
    <div style="font-size: 12pt; line-height: 1.6; margin-bottom: 8px; text-align: justify;">
      Sau khi đã kiểm tra lại về chất lượng của mặt hàng <strong>${esc(itemNames)}</strong> đã bàn giao ngày ${invoiceDate.d}/${invoiceDate.m}/${invoiceDate.y}, theo hóa đơn số <strong>${esc(invoiceCode)}</strong>, thì chúng tôi xác nhận rằng có số lượng hàng hóa bị lỗi kỹ thuật hoặc bao bì không đảm bảo chất lượng theo tiêu chuẩn nhà sản xuất:
    </div>

    <!-- Returned Goods Table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 35px;">STT</th>
          <th>Tên hàng hóa</th>
          <th style="width: 75px;">Mã số</th>
          <th style="width: 50px;">ĐVT</th>
          <th style="width: 60px;">Số lượng</th>
          <th style="width: 95px;">Đơn giá</th>
          <th style="width: 105px;">Thành tiền</th>
          <th style="width: 120px;">Tình trạng hàng</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="font-weight: bold; background: #fafafa;">
          <td colspan="4" class="text-center">Tổng cộng</td>
          <td class="text-center">${items.reduce((s, i) => s + i.qty, 0)}</td>
          <td class="text-center">X</td>
          <td class="text-right">${money.format(totalAmount)}</td>
          <td class="text-center">X</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 12pt; margin: 4px 0 8px;">
      Số tiền bằng chữ: <strong>${esc(amountToWords(totalAmount))}.</strong>
    </div>

    <!-- Agreements -->
    <div style="font-size: 12pt; line-height: 1.6; margin-bottom: 12px; text-align: justify;">
      <strong>Do đó, hai bên chúng tôi thống nhất như sau:</strong>
      <div style="margin-left: 12px; margin-top: 3px;">
        <div>+ Bên mua sẽ trả lại số hàng hóa không đảm bảo chất lượng nêu trên vào ngày ${date.d}/${date.m}/${date.y}.</div>
        <div>+ Khi nhận lại hàng, bên bán sẽ xuất hóa đơn / điều chỉnh chứng từ kế toán theo quy định tại khoản 1 Điều 4 Nghị định 123/2020/NĐ-CP; điểm b khoản 2 Điều 19 Nghị định 123/2020/NĐ-CP và khoản 1 Điều 7 Thông tư 78/2021/TT-BTC.</div>
        <div>+ Biên bản này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để làm căn cứ hạch toán kế toán.</div>
      </div>
    </div>

    <!-- Signatures (2 columns) -->
    <div class="sig-block" style="margin-top: 20px;">
      <div class="sig-row" style="justify-content: space-around;">
        <div class="sig-col" style="max-width: 250px;">
          <div class="sig-title">ĐẠI DIỆN BÊN BÁN</div>
          <div class="sig-note">(Ký, ghi rõ họ tên, đóng dấu)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name">${esc(seller.rep)}</div>
        </div>
        <div class="sig-col" style="max-width: 250px;">
          <div class="sig-title">ĐẠI DIỆN BÊN MUA</div>
          <div class="sig-note">(Ký, ghi rõ họ tên, đóng dấu)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name">${esc(buyer.rep)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal print popup window invoker
 */
export function openVoucherPrint(title, html) {
  const win = window.open("", "_blank", "width=920,height=960,resizable=yes,scrollbars=yes");
  if (!win) {
    alert("Trình duyệt đã chặn cửa sổ in ấn. Vui lòng cho phép mở popup để xem và in chứng từ.");
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  return true;
}

/**
 * Individual direct print functions
 */
export function printPhieuNhapKhoM01VT(data) {
  const html = renderPhieuNhapKhoM01VTHtml(data);
  return openVoucherPrint(`Phiếu nhập kho - ${data.MaPN || "M01-VT"}`, html);
}

export function printPhieuXuatKhoM02VT(data) {
  const html = renderPhieuXuatKhoM02VTHtml(data);
  return openVoucherPrint(`Phiếu xuất kho - ${data.MaPX || "M02-VT"}`, html);
}

export function printPhieuChiM02TT(data) {
  const html = renderPhieuChiM02TTHtml(data);
  return openVoucherPrint(`Phiếu chi - ${data.MaPC || "M02-TT"}`, html);
}

export function printPhieuBaoNoNganHang(data) {
  const html = renderPhieuBaoNoNganHangHtml(data);
  return openVoucherPrint(`Phiếu báo nợ - ${data.MaPC || data.MaTT || "BankDebitAdvice"}`, html);
}

export function printBienBanKiemKeM05VT(data, products = []) {
  const html = renderBienBanKiemKeM05VTHtml(data, products);
  return openVoucherPrint(`Biên bản kiểm kê - ${data.MaKK || "M05-VT"}`, html);
}

export function printBienBanTraLaiHangHoa(data, products = [], customers = []) {
  const html = renderBienBanTraLaiHangHoaHtml(data, products, customers);
  return openVoucherPrint(`Biên bản trả lại hàng hóa - ${data.MaPTH || "ReturnVoucher"}`, html);
}

/**
 * 6. PHIẾU THU — MẪU SỐ 01 – TT (Theo ảnh media_1790860227747.png)
 */
export function renderPhieuThuM01TTHtml(data = {}) {
  const cfg = getStoreConfig();
  const date = formatDateParts(data.NgayThu || data.NgayLap || data.date);
  const code = data.MaPT || data.number || data.MaPTCode || "PT00001";
  const quyenSo = data.QuyenSo || "01";
  const amount = Number(data.SoTien || data.amount || data.TongTien || 0);

  const tkNo = data.TkNo || data.debit || "1111";
  const tkCo = data.TkCo || data.credit || (data.LyDo?.includes("nợ") ? "131" : "5111");

  const payerName = data.NguoiNopTien || data.NguoiNop || data.TenKH || data.customerName || data.HoTen || "Khách mua lẻ";
  const address = data.DiaChi || data.address || (data.TenKH ? "Khách hàng tại cửa hàng" : "Hà Nội");
  const reason = data.LyDo || data.reason || (data.MaHDCode || data.MaHD ? `Thu tiền bán hàng theo hóa đơn ${data.MaHDCode || data.MaHD}` : "Thu tiền bán hàng");
  const attachedDocs = data.ChungTuGoc || data.sourceDocs || data.KemTheo || data.attachedDocs || (data.MaHDCode ? `01 Hóa đơn ${data.MaHDCode}` : "01 Hóa đơn bán lẻ");
  const preparedBy = data.NguoiLap || data.preparedBy || "Thủ quỹ";

  // Build Nợ / Có box
  let accountingRowsHtml = "";
  if (Array.isArray(data.coLines) && data.coLines.length > 0) {
    accountingRowsHtml = `
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span><strong>Nợ:</strong> ${esc(tkNo)}:</span>
        <span style="font-weight: 600;">${money.format(amount)}</span>
      </div>
      ${data.coLines.map(line => `
        <div style="display: flex; justify-content: space-between; gap: 8px;">
          <span><strong>Có:</strong> ${esc(line.tk || "5111")}:</span>
          <span style="font-weight: 600;">${money.format(Number(line.amount || 0))}</span>
        </div>
      `).join("")}
    `;
  } else {
    accountingRowsHtml = `
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span><strong>Nợ:</strong> ${esc(tkNo)}:</span>
        <span style="font-weight: 600;">${money.format(amount)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span><strong>Có:</strong> ${esc(tkCo)}:</span>
        <span style="font-weight: 600;">${money.format(amount)}</span>
      </div>
    `;
  }

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Phiếu thu - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📄 Xem trước Mẫu số 01 – TT: Phiếu thu (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Header Top Row (Image media_1790860227747.png) -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
      <div>
        <div style="font-weight: bold; font-size: 13pt; text-transform: uppercase;">${esc(cfg.brandName || cfg.name || "CỬA HÀNG MẸ & BÉ")}</div>
        <div style="font-size: 11pt; margin-top: 2px;">${esc(cfg.address)}</div>
        <div style="font-size: 10.5pt; color: #333;">MST: ${esc(cfg.mst || "0101234567")} - Hotline: ${esc(cfg.hotline || cfg.phone)}</div>
      </div>
      <div style="text-align: center; font-size: 11pt;">
        <div style="font-weight: bold; font-size: 12pt;">Mẫu số 01 - TT</div>
        <div style="font-style: italic; font-size: 9.5pt; max-width: 250px; line-height: 1.25; margin-top: 2px;">
          (Ban hành theo Thông tư số 200/2014/TT-BTC<br/>ngày 22/12/2014 của Bộ Tài chính)
        </div>
      </div>
    </div>

    <!-- Title & Right Accounting Box -->
    <div style="position: relative; margin: 10px 0 16px;">
      <div style="text-align: center;">
        <h1 style="font-size: 20pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px;">PHIẾU THU</h1>
        <div style="font-style: italic; font-size: 12pt;">Ngày ${date.d} tháng ${date.m} năm ${date.y}</div>
      </div>

      <div style="position: absolute; right: 0; top: 0; font-size: 11pt; text-align: left;">
        <div>Quyển số: <strong>${esc(quyenSo)}</strong></div>
        <div>Số: <strong style="color: #b91c1c;">${esc(code)}</strong></div>
        <div style="border: 1.5px solid #000; padding: 4px 8px; margin-top: 4px; min-width: 175px;">
          ${accountingRowsHtml}
        </div>
      </div>
    </div>

    <!-- Main Content Fields -->
    <div style="font-size: 12.5pt; line-height: 1.85; margin-top: 28px;">
      <div style="display: flex;">
        <span style="min-width: 180px;">Họ tên người nộp tiền:</span>
        <span style="flex: 1; font-weight: bold; border-bottom: 1px dotted #333; padding-left: 4px;">${esc(payerName)}</span>
      </div>
      <div style="display: flex;">
        <span style="min-width: 180px;">Địa chỉ:</span>
        <span style="flex: 1; border-bottom: 1px dotted #333; padding-left: 4px;">${esc(address)}</span>
      </div>
      <div style="display: flex;">
        <span style="min-width: 180px;">Lý do nộp:</span>
        <span style="flex: 1; border-bottom: 1px dotted #333; padding-left: 4px;">${esc(reason)}</span>
      </div>
      <div style="display: flex;">
        <span style="min-width: 180px;">Số tiền:</span>
        <span style="flex: 1; font-weight: bold; border-bottom: 1px dotted #333; padding-left: 4px;">${money.format(amount)} VND</span>
      </div>
      <div style="display: flex;">
        <span style="min-width: 180px;">Viết bằng chữ:</span>
        <span style="flex: 1; font-style: italic; font-weight: bold; border-bottom: 1px dotted #333; padding-left: 4px;">${esc(amountToWords(amount))}.</span>
      </div>
      <div style="display: flex;">
        <span style="min-width: 180px;">Kèm theo:</span>
        <span style="flex: 1; border-bottom: 1px dotted #333; padding-left: 4px;">${esc(attachedDocs)}</span>
      </div>
    </div>

    <!-- Date of signature -->
    <div style="text-align: right; font-style: italic; font-size: 12pt; margin-top: 14px; margin-bottom: 4px;">
      Ngày ${date.d} tháng ${date.m} năm ${date.y}
    </div>

    <!-- 5 Signatures (Standard TT 200 / TT 133) -->
    <div class="sig-block" style="margin-top: 4px;">
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-title">Giám đốc</div>
          <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
          <div class="sig-space" style="height: 60px;"></div>
          <div class="sig-name"></div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Kế toán trưởng</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 60px;"></div>
          <div class="sig-name"></div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người nộp tiền</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 60px;"></div>
          <div class="sig-name">${esc(payerName)}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người lập phiếu</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 60px;"></div>
          <div class="sig-name">${esc(preparedBy)}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Thủ quỹ</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 60px;"></div>
          <div class="sig-name"></div>
        </div>
      </div>
    </div>

    <!-- Bottom Confirmation -->
    <div style="margin-top: 18px; font-size: 12pt; line-height: 1.6;">
      <div>Đã nhận đủ số tiền (Viết bằng chữ): &nbsp;<strong style="font-style: italic;">${esc(amountToWords(amount))}.</strong></div>
      <div style="margin-top: 6px; font-size: 11pt; color: #333;">
        <div>+ Tỷ giá ngoại tệ (vàng bạc, đá quý): ............................................................................................................</div>
        <div style="margin-top: 4px;">+ Số tiền quy đổi: .........................................................................................................................................</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 7. HÓA ĐƠN BÁN LẺ — KHỔ K80 (Theo ảnh media_1790860231521.png)
 */
export function renderHoaDonBanLeK80Html(invoice = {}, options = {}) {
  const store = options.storeConfig || getStoreConfig();
  const customer = options.customer || null;
  const cashier = options.cashier || invoice.NguoiLap || "Nhân viên bán hàng";

  const code = invoice.MaHD || invoice.id || "HD...";
  const orderCode = invoice.MaDHCode || invoice.MaDH || invoice.orderCode || code;
  
  const dateObj = invoice.createdAt ? new Date(invoice.createdAt) : (invoice.NgayLap ? new Date(invoice.NgayLap) : new Date());
  const dateStr = !Number.isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("vi-VN") + " " + dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleDateString("vi-VN");

  const lines = (invoice.details || invoice.items || []).map((l, idx) => {
    const qty = Number(l.SoLuong ?? l.quantity ?? 1);
    const unitPrice = Number(l.DonGia ?? l.price ?? l.GiaBan ?? 0);
    const amount = Number(l.ThanhTien ?? (qty * unitPrice));
    return {
      stt: idx + 1,
      name: l.TenSP || l.name || "Sản phẩm",
      code: l.MaSPCode || l.MaSP || l.code || "",
      unit: l.DonViTinh || l.unit || "Cái",
      qty,
      unitPrice,
      amount,
    };
  });

  const subtotal = Number(invoice.TienHang || (invoice.TongTien + (invoice.GiamGia || 0)) || lines.reduce((s, i) => s + i.amount, 0));
  const discount = Number(invoice.GiamGia || invoice.discount || 0);
  const vatAmount = Number(invoice.ThueVAT || invoice.vatAmount || 0);
  const finalTotal = Number(invoice.TongTien || invoice.total || (subtotal - discount + vatAmount));
  const totalItems = lines.length;
  const totalQty = lines.reduce((s, i) => s + i.qty, 0);

  const paymentMethod = invoice.HinhThucThanhToan || invoice.paymentMethod || invoice.PhuongThuc || "Tiền mặt";
  const isPaid = (invoice.TrangThai === "Đã thanh toán" || invoice.status === "completed" || invoice.SoTienConLai === 0);
  const cashGiven = Number(invoice.TienKhachDua || (isPaid ? finalTotal : 0));
  const changeDue = Math.max(0, cashGiven - finalTotal);

  const custName = customer?.HoTen || invoice.TenKH || invoice.customerName || "Khách lẻ";
  const custPhone = customer?.SDT || invoice.SDT || invoice.customerPhone || "";

  const itemsHtml = lines.map((it) => `
    <tr>
      <td colspan="4" style="padding-top: 5px; font-weight: 600; line-height: 1.25; word-break: break-word;">
        ${it.stt}. ${esc(it.name)}
      </td>
    </tr>
    <tr style="border-bottom: 1px dotted #ccc;">
      <td style="padding-bottom: 4px; font-size: 10px; color: #555;">
        ${it.code ? esc(it.code) + " · " : ""}${esc(it.unit)}
      </td>
      <td style="padding-bottom: 4px; text-align: right;">${money.format(it.unitPrice)}</td>
      <td style="padding-bottom: 4px; text-align: center; font-weight: 600;">${it.qty}</td>
      <td style="padding-bottom: 4px; text-align: right; font-weight: 600;">${money.format(it.amount)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Hóa đơn bán lẻ - ${esc(code)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 2mm 3mm 4mm 3mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background: #fff;
      color: #000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-wrapper {
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 2mm 0;
    }
    .receipt-toolbar {
      position: sticky;
      top: 0;
      background: #1e293b;
      color: #fff;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      z-index: 9999;
      font-family: sans-serif;
    }
    .receipt-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      font-size: 12px;
    }
    .dashed-sep {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .dotted-sep {
      border-top: 1px dotted #555;
      margin: 4px 0;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    @media print {
      .receipt-toolbar { display: none !important; }
      .receipt-wrapper { width: 100%; padding: 0; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt-toolbar">
    <div>🧾 Hóa đơn bán lẻ K80 (${esc(code)})</div>
    <div style="display: flex; gap: 8px;">
      <button class="receipt-btn" onclick="window.print()">🖨️ In Bill</button>
      <button class="receipt-btn" style="background:#475569;" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="receipt-wrapper">
    <!-- Header (Ref: Zylker Mart in media_1790860231521.png) -->
    <div class="text-center" style="margin-bottom: 6px;">
      <div class="font-bold" style="font-size: 14pt; text-transform: uppercase; letter-spacing: 0.5px;">
        ${esc(store.brandName || store.name || "CỬA HÀNG MẸ & BÉ")}
      </div>
      <div style="font-size: 10px; color: #333; margin-top: 1px;">
        ${esc(store.subtitle || "Hệ thống chăm sóc Mẹ và Bé")}
      </div>
      <div style="font-size: 10.5px; margin-top: 3px;">
        ${esc(store.address)}
      </div>
      <div style="font-size: 10.5px;">
        Hotline: <strong>${esc(store.hotline || store.phone)}</strong>
      </div>
      ${store.mst ? `<div style="font-size: 10px; color: #444;">MST: ${esc(store.mst)}</div>` : ""}
    </div>

    <!-- Title: Retail Invoice -->
    <div class="text-center font-bold" style="font-size: 13.5pt; text-decoration: underline; margin: 8px 0 6px; letter-spacing: 0.5px;">
      HÓA ĐƠN BÁN LẺ
    </div>
    <div class="text-center" style="font-size: 9.5px; color: #555; margin-top: -5px; margin-bottom: 8px;">
      (RETAIL INVOICE)
    </div>

    <!-- Order & Customer Meta (Ref: Order# SB-5, Bill# SI-5, Date) -->
    <div style="font-size: 11px; line-height: 1.4; margin-bottom: 4px;">
      <div>Mã đơn hàng: <strong>${esc(orderCode)}</strong></div>
      <div>Số hóa đơn: <strong>${esc(code)}</strong></div>
      <div>Ngày giờ bán: ${esc(dateStr)}</div>
      <div>Thu ngân: <strong>${esc(cashier)}</strong></div>
      <div>Khách hàng: <strong>${esc(custName)}</strong>${custPhone ? ` (${esc(custPhone)})` : ""}</div>
    </div>

    <!-- Dashed separator -->
    <div class="dashed-sep"></div>

    <!-- Table Header (Item, Rate, Qty, Amount) -->
    <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
      <thead>
        <tr style="border-bottom: 1px dashed #000;">
          <th class="text-left" style="padding: 4px 0; width: 44%;">Mặt hàng</th>
          <th class="text-right" style="padding: 4px 0; width: 22%;">Đ.Giá</th>
          <th class="text-center" style="padding: 4px 0; width: 10%;">SL</th>
          <th class="text-right" style="padding: 4px 0; width: 24%;">T.Tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Dashed separator -->
    <div class="dashed-sep"></div>

    <!-- Summary Block (Sub Total, Taxes, TOTAL) -->
    <div style="font-size: 11px; line-height: 1.5;">
      <div style="display: flex; justify-content: space-between;">
        <span>Tổng tiền hàng (Sub Total):</span>
        <span style="font-weight: 500;">${money.format(subtotal)}</span>
      </div>
      ${discount > 0 ? `
      <div style="display: flex; justify-content: space-between; color: #b91c1c;">
        <span>Chiết khấu / Giảm giá:</span>
        <span style="font-weight: 500;">-${money.format(discount)}</span>
      </div>` : ""}
      <div style="display: flex; justify-content: space-between;">
        <span>Thuế GTGT (VAT):</span>
        <span>${vatAmount > 0 ? money.format(vatAmount) : "0 ₫ (0%)"}</span>
      </div>
      
      <div class="dashed-sep"></div>

      <!-- TOTAL (Bold prominent row) -->
      <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13.5pt; font-weight: bold;">
        <span>TỔNG CỘNG:</span>
        <span>${money.format(finalTotal)}</span>
      </div>

      <div class="dashed-sep"></div>

      <!-- Quantities & Payment breakdown -->
      <div style="font-size: 10.5px; color: #333; margin: 4px 0;">
        <div style="font-style: italic;">
          Số mặt hàng: <strong>${totalItems}</strong> &nbsp;|&nbsp; Tổng số lượng: <strong>${totalQty}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 3px;">
          <span>Tiền khách đưa:</span>
          <span>${money.format(cashGiven)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Tiền thừa trả lại:</span>
          <span>${money.format(changeDue)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Phương thức:</span>
          <span>${esc(paymentMethod)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Trạng thái:</span>
          <strong style="color: ${isPaid ? '#047857' : '#b91c1c'};">${isPaid ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}</strong>
        </div>
      </div>
    </div>

    <!-- Dashed separator -->
    <div class="dashed-sep"></div>

    <!-- Footer: Thank you message (Ref: Thank you for your visit!) -->
    <div class="text-center" style="margin-top: 10px; margin-bottom: 6px;">
      <div class="font-bold" style="font-size: 11.5pt;">
        Cảm ơn Quý khách và hẹn gặp lại!
      </div>
      <div style="font-size: 9.5px; font-style: italic; color: #555; margin-top: 2px;">
        (Thank you for your visit!)
      </div>
      <div style="font-size: 9px; color: #444; margin-top: 6px; line-height: 1.35;">
        Quý khách vui lòng kiểm tra kỹ hàng hóa và giữ hóa đơn trong vòng 7 ngày khi có nhu cầu đổi trả sản phẩm.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 8. HÓA ĐƠN BÁN LẺ — KHỔ A4 PORTRAIT
 */
export function renderHoaDonBanLeA4Html(invoice = {}, options = {}) {
  const cfg = options.storeConfig || getStoreConfig();
  const customer = options.customer || null;
  const cashier = options.cashier || invoice.NguoiLap || "Nhân viên bán hàng";

  const code = invoice.MaHD || invoice.id || "HD...";
  const orderCode = invoice.MaDHCode || invoice.MaDH || invoice.orderCode || code;

  const dateObj = invoice.createdAt ? new Date(invoice.createdAt) : (invoice.NgayLap ? new Date(invoice.NgayLap) : new Date());
  const dateParts = formatDateParts(dateObj);

  const lines = (invoice.details || invoice.items || []).map((l, idx) => {
    const qty = Number(l.SoLuong ?? l.quantity ?? 1);
    const unitPrice = Number(l.DonGia ?? l.price ?? l.GiaBan ?? 0);
    const amount = Number(l.ThanhTien ?? (qty * unitPrice));
    return {
      stt: idx + 1,
      name: l.TenSP || l.name || "Sản phẩm",
      code: l.MaSPCode || l.MaSP || l.code || "",
      unit: l.DonViTinh || l.unit || "Cái",
      qty,
      unitPrice,
      amount,
    };
  });

  const subtotal = Number(invoice.TienHang || (invoice.TongTien + (invoice.GiamGia || 0)) || lines.reduce((s, i) => s + i.amount, 0));
  const discount = Number(invoice.GiamGia || invoice.discount || 0);
  const vatAmount = Number(invoice.ThueVAT || invoice.vatAmount || 0);
  const finalTotal = Number(invoice.TongTien || invoice.total || (subtotal - discount + vatAmount));

  const paymentMethod = invoice.HinhThucThanhToan || invoice.paymentMethod || invoice.PhuongThuc || "Tiền mặt";
  const isPaid = (invoice.TrangThai === "Đã thanh toán" || invoice.status === "completed" || invoice.SoTienConLai === 0);
  const custName = customer?.HoTen || invoice.TenKH || invoice.customerName || "Khách lẻ";
  const custPhone = customer?.SDT || invoice.SDT || "";
  const custAddress = customer?.DiaChi || invoice.DiaChi || "";

  const rowsHtml = lines.map((it) => `
    <tr>
      <td class="text-center">${it.stt}</td>
      <td><strong>${esc(it.name)}</strong>${it.code ? ` <span style="color:#64748b; font-size:10pt;">(${esc(it.code)})</span>` : ""}</td>
      <td class="text-center">${esc(it.unit)}</td>
      <td class="text-center font-bold">${it.qty}</td>
      <td class="text-right">${money.format(it.unitPrice)}</td>
      <td class="text-right font-bold">${money.format(it.amount)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Hóa đơn bán lẻ A4 - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📄 Xem trước Hóa đơn bán lẻ A4 (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In hóa đơn (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px;">
      <div>
        <div style="font-weight: bold; font-size: 15pt; text-transform: uppercase;">${esc(cfg.brandName || cfg.name || "CỬA HÀNG MẸ & BÉ")}</div>
        <div style="font-size: 11pt; margin-top: 2px;">${esc(cfg.address)}</div>
        <div style="font-size: 11pt;">Hotline: <strong>${esc(cfg.hotline || cfg.phone)}</strong> | Email: ${esc(cfg.email || "cskh@mebe.vn")}</div>
        <div style="font-size: 10.5pt; color: #444;">Website: ${esc(cfg.website || "www.cuahangmebe.vn")}</div>
      </div>
      <div style="text-align: right; font-size: 11pt;">
        <div>Số HĐ: <strong style="color: #b91c1c; font-size: 13pt;">${esc(code)}</strong></div>
        <div>Mã đơn: <strong>${esc(orderCode)}</strong></div>
        <div>Ngày: <strong>${dateParts.d}/${dateParts.m}/${dateParts.y}</strong></div>
        <div>Trạng thái: <strong style="color: ${isPaid ? '#047857' : '#b91c1c'};">${isPaid ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}</strong></div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin: 14px 0 12px;">
      <h1 style="font-size: 21pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin: 0;">HÓA ĐƠN BÁN LẺ</h1>
      <div style="font-size: 11pt; color: #555; margin-top: 2px;">(RETAIL INVOICE)</div>
    </div>

    <!-- Customer info -->
    <div style="border: 1px solid #000; padding: 8px 12px; margin-bottom: 14px; font-size: 12pt; line-height: 1.6;">
      <div style="display: flex; justify-content: space-between;">
        <div>Khách hàng: <strong>${esc(custName)}</strong></div>
        <div>Điện thoại: <strong>${esc(custPhone || "—")}</strong></div>
      </div>
      <div>Địa chỉ: ${esc(custAddress || "—")}</div>
      <div style="display: flex; justify-content: space-between;">
        <div>Phương thức thanh toán: <strong>${esc(paymentMethod)}</strong></div>
        <div>Thu ngân: <strong>${esc(cashier)}</strong></div>
      </div>
    </div>

    <!-- Table -->
    <table class="grid-table">
      <thead>
        <tr>
          <th style="width: 40px;" class="text-center">STT</th>
          <th>Tên hàng hóa, quy cách</th>
          <th style="width: 60px;" class="text-center">ĐVT</th>
          <th style="width: 60px;" class="text-center">SL</th>
          <th style="width: 110px;" class="text-right">Đơn giá</th>
          <th style="width: 125px;" class="text-right">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr>
          <td colspan="5" class="text-right font-bold">Tổng tiền hàng:</td>
          <td class="text-right font-bold">${money.format(subtotal)}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td colspan="5" class="text-right" style="color: #b91c1c;">Chiết khấu / Giảm giá:</td>
          <td class="text-right" style="color: #b91c1c; font-weight: bold;">-${money.format(discount)}</td>
        </tr>` : ""}
        <tr>
          <td colspan="5" class="text-right">Thuế GTGT (VAT):</td>
          <td class="text-right">${vatAmount > 0 ? money.format(vatAmount) : "0 ₫"}</td>
        </tr>
        <tr style="background: #f8fafc; font-size: 13pt;">
          <td colspan="5" class="text-right font-bold">TỔNG CỘNG THANH TOÁN:</td>
          <td class="text-right font-bold" style="color: #b91c1c;">${money.format(finalTotal)}</td>
        </tr>
      </tbody>
    </table>

    <div style="font-size: 12pt; margin: 10px 0;">
      Số tiền bằng chữ: <strong>${esc(amountToWords(finalTotal))}.</strong>
    </div>

    <!-- Signatures -->
    <div class="sig-block" style="margin-top: 24px;">
      <div class="sig-row" style="justify-content: space-around;">
        <div class="sig-col" style="max-width: 250px;">
          <div class="sig-title">NGƯỜI MUA HÀNG</div>
          <div class="sig-note">(Ký, ghi rõ họ tên)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name">${esc(custName)}</div>
        </div>
        <div class="sig-col" style="max-width: 250px;">
          <div class="sig-title">NGƯỜI BÁN HÀNG</div>
          <div class="sig-note">(Ký, ghi rõ họ tên)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name">${esc(cashier)}</div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px; font-style: italic; font-size: 10.5pt; color: #555;">
      Cảm ơn Quý khách và hẹn gặp lại! Quý khách vui lòng giữ hóa đơn trong vòng 7 ngày để được hỗ trợ đổi trả.
    </div>
  </div>
</body>
</html>`;
}

export function printPhieuThuM01TT(data) {
  const html = renderPhieuThuM01TTHtml(data);
  return openVoucherPrint(`Phiếu thu - ${data.MaPT || "M01-TT"}`, html);
}

export function printHoaDonBanLe(invoice, format = "k80", options = {}) {
  const html = format === "a4" ? renderHoaDonBanLeA4Html(invoice, options) : renderHoaDonBanLeK80Html(invoice, options);
  return openVoucherPrint(`Hóa đơn bán lẻ - ${invoice.MaHD || "Invoice"}`, html);
}

/**
 * 9. ĐƠN ĐẶT HÀNG — PURCHASE ORDER (Mẫu chuẩn A4 giao dịch thương mại)
 */
export function renderDonDatHangHtml(order = {}, options = {}) {
  const cfg = options.storeConfig || getStoreConfig();
  const supplier = options.supplier || null;
  const date = formatDateParts(order.NgayDat || order.createdAt);
  const code = order.MaDDH || order.code || order.id || "PO...";
  const items = order.items || order.details || [];
  const lines = items.map((it, idx) => {
    const qty = Number(it.quantity ?? it.SoLuong ?? 1);
    const price = Number(it.price ?? it.DonGia ?? it.GiaNhap ?? 0);
    const amount = Number(it.total ?? it.ThanhTien ?? (qty * price));
    return {
      stt: idx + 1,
      name: it.TenSP || it.name || "Sản phẩm",
      code: it.MaSPCode || it.MaSP || it.code || "",
      unit: it.DonViTinh || it.unit || "Cái",
      qty,
      price,
      amount,
    };
  });

  const totalAmount = Number(order.TongTien || lines.reduce((s, i) => s + i.amount, 0));
  const suppName = supplier?.TenNCC || order.TenNCC || order.supplierName || order.MaNCCCode || "Nhà cung cấp";
  const suppPhone = supplier?.SDT || order.SDT || "—";
  const suppAddress = supplier?.DiaChi || order.DiaChi || "—";
  const suppTax = supplier?.MST || "—";

  const rowsHtml = lines.map((l) => `
    <tr>
      <td class="text-center">${l.stt}</td>
      <td class="text-center">${esc(l.code)}</td>
      <td><strong>${esc(l.name)}</strong></td>
      <td class="text-center">${esc(l.unit)}</td>
      <td class="text-center"><strong>${l.qty}</strong></td>
      <td class="text-right">${money.format(l.price)}</td>
      <td class="text-right"><strong>${money.format(l.amount)}</strong></td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>Đơn đặt hàng - ${esc(code)}</title>
  <style>${BASE_PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-title">📄 Xem trước Đơn đặt mua hàng (${esc(code)})</div>
    <div class="print-toolbar-actions">
      <button class="print-btn" onclick="window.print()">🖨️ In chứng từ (Print A4)</button>
      <button class="close-btn" onclick="window.close()">✖ Đóng</button>
    </div>
  </div>

  <div class="doc-wrapper">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
      <div>
        <div style="font-weight: bold; font-size: 13pt; text-transform: uppercase;">${esc(cfg.brandName || cfg.name || "CỬA HÀNG MẸ & BÉ")}</div>
        <div style="font-size: 10.5pt; color: #444;">${esc(cfg.subtitle || "Hệ thống quản lý chuỗi Cửa hàng Mẹ & Bé")}</div>
        <div style="font-size: 11pt; margin-top: 3px;">Địa chỉ: ${esc(cfg.address)}</div>
        <div style="font-size: 10.5pt;">Hotline: ${esc(cfg.hotline || cfg.phone)} | MST: ${esc(cfg.mst || "0101234567")}</div>
      </div>
      <div style="text-align: right; font-size: 11pt; line-height: 1.5;">
        <div>Mã đơn: <strong style="font-size: 13pt; color: #047857;">${esc(code)}</strong></div>
        <div>Ngày lập: <strong>${date.full}</strong></div>
        <div>Trạng thái: <strong>${esc(order.TrangThai || "Chờ xử lý")}</strong></div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin: 15px 0 12px;">
      <h1 style="font-size: 21pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 3px;">ĐƠN ĐẶT HÀNG</h1>
      <div style="font-style: italic; font-size: 11pt; color: #444;">(PURCHASE ORDER)</div>
    </div>

    <!-- Supplier info box -->
    <div style="border: 1px solid #000; padding: 10px 14px; margin-bottom: 14px; font-size: 11.5pt; line-height: 1.65; background: #fafafa;">
      <div style="font-weight: bold; text-transform: uppercase; font-size: 12pt; margin-bottom: 4px; border-bottom: 1px dashed #aaa; padding-bottom: 3px;">
        Đơn vị cung cấp (Bên bán):
      </div>
      <div>- Nhà cung cấp: <strong style="font-size: 12pt;">${esc(suppName)}</strong></div>
      <div>- Địa chỉ: ${esc(suppAddress)}</div>
      <div>- Điện thoại / Hotline: <strong>${esc(suppPhone)}</strong> &nbsp;&nbsp;|&nbsp;&nbsp; Mã số thuế: <strong>${esc(suppTax)}</strong></div>
      <div>- Ghi chú đặt hàng: <em>${esc(order.GhiChu || order.note || "Giao hàng theo đúng quy cách, chủng loại và đơn giá thỏa thuận.")}</em></div>
    </div>

    <!-- Item table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 40px;">STT</th>
          <th style="width: 90px;">Mã SP</th>
          <th>Tên hàng hóa, quy cách sản phẩm</th>
          <th style="width: 65px;">ĐVT</th>
          <th style="width: 75px;">Số lượng</th>
          <th style="width: 110px;">Đơn giá</th>
          <th style="width: 125px;">Thành tiền (VNĐ)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="font-weight: bold; background: #fdfdfd;">
          <td colspan="4" class="text-center">TỔNG CỘNG</td>
          <td class="text-center">${lines.reduce((s, i) => s + i.qty, 0)}</td>
          <td class="text-center">—</td>
          <td class="text-right" style="font-size: 12pt; color: #047857;">${money.format(totalAmount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Words & Terms -->
    <div style="margin-top: 10px; font-size: 12pt; line-height: 1.6;">
      <div>- Tổng số tiền đặt hàng (viết bằng chữ): <strong>${esc(amountToWords(totalAmount))}.</strong></div>
      <div>- Địa điểm giao hàng: <strong>${esc(order.DiaDiemGiaoHang || cfg.address)}</strong></div>
      <div>- Thời hạn giao hàng: <strong>${esc(order.HanGiaoHang || "Trong vòng 03 ngày kể từ ngày đặt hàng")}</strong></div>
    </div>

    <!-- Date of signature -->
    <div style="text-align: right; font-style: italic; margin-top: 14px; font-size: 12pt;">
      Hà Nội, ngày ${date.d} tháng ${date.m} năm ${date.y}
    </div>

    <!-- 3 Signatures -->
    <div class="sig-block" style="margin-top: 6px;">
      <div class="sig-row">
        <div class="sig-col">
          <div class="sig-title">Đại diện Bên Bán</div>
          <div class="sig-note">(Ký, họ tên, đóng dấu xác nhận)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name"></div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Người lập đơn</div>
          <div class="sig-note">(Ký, họ tên)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name">${esc(order.NguoiLap || order.MaNVCode || "Nhân viên mua hàng")}</div>
        </div>
        <div class="sig-col">
          <div class="sig-title">Giám đốc duyệt</div>
          <div class="sig-note">(Ký, họ tên, đóng dấu)</div>
          <div class="sig-space" style="height: 65px;"></div>
          <div class="sig-name">Đã phê duyệt</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printDonDatHang(order, options = {}) {
  const html = renderDonDatHangHtml(order, options);
  return openVoucherPrint(`Đơn đặt hàng - ${order.MaDDH || "PO"}`, html);
}

