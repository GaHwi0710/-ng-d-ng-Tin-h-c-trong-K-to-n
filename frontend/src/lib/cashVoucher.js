import { amountToWords } from "./amountToWords.js";
import { getStoreConfig, DEFAULT_STORE_CONFIG, getBrandLogoUrl } from "./storeConfig.js";
import { renderPhieuChiM02TTHtml, printPhieuChiM02TT, renderPhieuThuM01TTHtml, printPhieuThuM01TT } from "./accountingDocsPrint.js";

const money = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

// Thông tin đơn vị in trên đầu phiếu thu / phiếu chi (theo mẫu 01-TT, 02-TT)
export const CASH_VOUCHER_COMPANY = DEFAULT_STORE_CONFIG;

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
    TkNo: record.TkNo || (isThu ? "111" : "331"),
    TkCo: record.TkCo || (isThu ? "131" : "111"),
    debit: record.TkNo || (isThu ? "111" : "331"),
    credit: record.TkCo || (isThu ? "131" : "111"),
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
  if (!model.isThu) {
    return renderPhieuChiM02TTHtml(model);
  }
  return renderPhieuThuM01TTHtml(model);
}

export function printCashVoucher(model) {
  if (!model.isThu) {
    return printPhieuChiM02TT(model);
  }
  return printPhieuThuM01TT(model);
}
