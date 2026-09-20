import { amountToWords } from "./amountToWords.js";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

// Thông tin đơn vị in trên đầu phiếu thu / phiếu chi (theo mẫu 01-TT, 02-TT)
export const CASH_VOUCHER_COMPANY = {
  name: "CÔNG TY TNHH ĐỒ GỖ TRƯỜNG GIANG",
  address: "Số 24 Ngọc Dại, Đại Mộ, Nam Từ Liêm, Hà Nội",
  phone: "0916.596.689 - 0967.596.698",
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseDateParts(value) {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : new Date();
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

// "PT012" -> "0000012" (đánh số 7 chữ số như mẫu in)
function voucherNumber(code) {
  const digits = String(code ?? "").replace(/\D/g, "");
  return digits ? digits.padStart(7, "0") : dotted(code);
}

export function buildCashVoucherModel({ kind, record, userName = "" }) {
  const isThu = kind === "thu";
  return {
    isThu,
    number: record.MaPT || record.MaPC || record.id || "",
    date: record.NgayLap || new Date().toISOString().slice(0, 10),
    personName: (isThu ? record.NguoiNopTien : record.NguoiNhanTien) || "",
    address: record.DiaChi || "",
    reason: record.LyDo || "",
    amount: Number(record.SoTien || 0),
    attachedNote: record.KemTheo || "",
    sourceDocs: record.ChungTuGoc || record.SoChungTuGoc || "",
    preparedBy: record.NguoiLap || userName,
  };
}

const CASH_CSS = `
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
    font-family: "Times New Roman", Times, serif;
    font-size: 13.5px;
    line-height: 1.4;
  }
  .cv {
    width: 265mm;
    max-width: 100%;
    margin: 0 auto;
    padding: 2mm 4mm;
  }
  .cv-top {
    display: grid;
    grid-template-columns: 1fr 72mm;
    gap: 10px;
    align-items: start;
  }
  .cv-brand { display: flex; gap: 10px; align-items: flex-start; }
  .cv-logo {
    width: 46px;
    height: 46px;
    border: 2px solid #1b3d91;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #1b3d91;
    font-weight: 700;
    font-size: 15px;
    flex: none;
  }
  .cv-company { font-weight: 700; color: #1b3d91; font-size: 14.5px; }
  .cv-company small { display: block; font-weight: 400; color: #333; font-size: 12.5px; }
  .cv-form-no { text-align: center; font-size: 12px; color: #1b3d91; }
  .cv-form-no strong { display: block; font-size: 13.5px; margin-bottom: 2px; }
  .cv-title {
    text-align: center;
    margin: 6px 0 0;
    color: #1b3d91;
  }
  .cv-title h1 {
    margin: 0;
    font-size: 26px;
    letter-spacing: 2px;
    font-weight: 700;
  }
  .cv-num {
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 10px;
    margin: 2px 0;
  }
  .cv-num b { font-size: 15px; color: #1b3d91; }
  .cv-num span {
    color: #c00;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: 1.5px;
    min-width: 110px;
    text-align: center;
  }
  .cv-sub { text-align: center; font-style: italic; margin: 4px 0 14px; }
  .cv-info { margin: 0 0 14px; max-width: 225mm; }
  .cv-line {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 6px;
    align-items: end;
    margin: 7px 0;
  }
  .cv-line .fill {
    border-bottom: 1px dotted #333;
    min-height: 17px;
    padding: 0 4px;
    font-weight: 600;
  }
  .cv-sign-date { text-align: right; font-style: italic; margin: 18px 0 6px; }
  .cv-signs {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    text-align: center;
    font-size: 13px;
  }
  .cv-signs strong { display: block; font-size: 13.5px; }
  .cv-signs em { display: block; font-size: 11.5px; font-style: italic; margin-top: 2px; }
  .cv-signs .space { height: 56px; }
  .cv-foot { margin-top: 16px; }
  .cv-foot .cv-line { margin: 5px 0; }
  @media print {
    .cv { width: auto; padding: 0; }
  }
`;

export function buildCashVoucherHtml(model) {
  const { d, m, y } = parseDateParts(model.date);
  const title = model.isThu ? "PHIẾU THU" : "PHIẾU CHI";
  const formNo = model.isThu ? "01-TT" : "02-TT";
  const personLabel = model.isThu
    ? "Họ, tên người nộp tiền"
    : "Họ, tên người nhận tiền";
  const reasonLabel = model.isThu ? "Lý do nộp" : "Lý do chi";
  const signs = model.isThu
    ? [
        { role: "Giám đốc", note: "(Ký, họ tên, đóng dấu)" },
        { role: "Kế toán trưởng", note: "(Ký, họ tên)" },
        { role: "Người nộp tiền", note: "(Ký, họ tên)" },
        { role: "Người lập phiếu", note: "(Ký, họ tên)", name: model.preparedBy },
        { role: "Thủ quỹ", note: "(Ký, họ tên)" },
      ]
    : [
        { role: "Giám đốc", note: "(Ký, họ tên, đóng dấu)" },
        { role: "Kế toán trưởng", note: "(Ký, họ tên)" },
        { role: "Thủ quỹ", note: "(Ký, họ tên)" },
        { role: "Người lập phiếu", note: "(Ký, họ tên)", name: model.preparedBy },
        { role: "Người nhận tiền", note: "(Ký, họ tên)" },
      ];

  const receivedLine = model.isThu
    ? `<div class="cv-line"><span>Đã nhận đủ số tiền (viết bằng chữ):</span><span class="fill">${dotted(amountToWords(model.amount))}</span><span></span></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} ${esc(model.number)}</title>
  <style>${CASH_CSS}</style>
</head>
<body>
  <div class="cv">
    <div class="cv-top">
      <div class="cv-brand">
        <div class="cv-logo">TG</div>
        <div class="cv-company">
          ${esc(CASH_VOUCHER_COMPANY.name)}
          <small><strong>Địa chỉ:</strong> ${esc(CASH_VOUCHER_COMPANY.address)}</small>
          <small><strong>Điện thoại:</strong> ${esc(CASH_VOUCHER_COMPANY.phone)}</small>
        </div>
      </div>
      <div class="cv-form-no">
        <strong>Mẫu số ${formNo}</strong>
        (Ban hành theo TT 200/2014/TT-BTC<br/>ngày 22/12/2014 của Bộ trưởng BTC)
      </div>
    </div>

    <div class="cv-title"><h1>${title}</h1></div>
    <div class="cv-num"><b>Số:</b><span>${voucherNumber(model.number)}</span></div>
    <div class="cv-sub">Ngày ${d} tháng ${m} năm ${y}</div>

    <div class="cv-info">
      <div class="cv-line"><span>${personLabel}:</span><span class="fill">${dotted(model.personName)}</span><span></span></div>
      <div class="cv-line"><span>Địa chỉ:</span><span class="fill">${dotted(model.address)}</span><span></span></div>
      <div class="cv-line"><span>${reasonLabel}:</span><span class="fill">${dotted(model.reason)}</span><span></span></div>
      <div class="cv-line"><span>Số tiền:</span><span class="fill">${money.format(model.amount)} ₫</span><span></span></div>
      <div class="cv-line"><span>(Viết bằng chữ):</span><span class="fill">${dotted(amountToWords(model.amount))}</span><span></span></div>
      <div class="cv-line"><span>Kèm theo:</span><span class="fill">${dotted(model.attachedNote)}</span><span>&nbsp;&nbsp;Chứng từ gốc: ${dotted(model.sourceDocs)}</span></div>
      ${receivedLine}
    </div>

    <div class="cv-sign-date">Ngày ${d} tháng ${m} năm ${y}</div>
    <div class="cv-signs">
      ${signs.map((sign) => `
      <div>
        <strong>${sign.role}</strong>
        <em>${sign.note}</em>
        <div class="space"></div>
        ${sign.name ? esc(sign.name) : ""}
      </div>`).join("")}
    </div>

    <div class="cv-foot">
      <div class="cv-line"><span>+ Tỷ giá ngoại tệ ( vàng bạc, đá quý):</span><span class="fill"></span><span></span></div>
      <div class="cv-line"><span>+ Số tiền quy đổi:</span><span class="fill"></span><span></span></div>
    </div>
  </div>
</body>
</html>`;
}

export function printCashVoucher(model) {
  const html = buildCashVoucherHtml(model);
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
