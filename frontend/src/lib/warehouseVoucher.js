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

function dotted(text) {
  const value = String(text ?? "").trim();
  return value ? esc(value) : "&nbsp;";
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
      name: line.TenSP || product.TenSP || "",
      code: line.MaSPCode || product.MaSP || "",
      unit: line.DonViTinh || product.DonViTinh || "",
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
    (item) => item.id === record.MaNCC || item.id === record.supplierId
  );
  const date = record.NgayNhap || record.NgayXuat || new Date().toISOString().slice(0, 10);
  const lines = normalizeVoucherLines(record.details || [], products);
  const total =
    Number(record.TongTien) || lines.reduce((sum, line) => sum + line.amount, 0);
  const reason = isReceipt
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
    reason,
    warehouse: record.Kho || "Kho chính",
    location: record.DiaDiem || "Hà Nội",
    lines,
    total,
    attachedDocs: record.SoChungTuGoc || record.MaDDHCode || record.MaDHCode || record.MaDDH || record.MaDH || "",
    preparedBy: record.NguoiLap || userName,
    minRows: 8,
  };
}

const VOUCHER_CSS = `
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
  }
`;

export function buildWarehouseVoucherHtml(model) {
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
        <td class="l">${esc(line.name)}</td>
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
    </div>
  </div>
</body>
</html>`;
}

export function printWarehouseVoucher(model) {
  const html = buildWarehouseVoucherHtml(model);
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
}
