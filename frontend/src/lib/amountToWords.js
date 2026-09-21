const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const HANG = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];

function docHangChuc(chuc, donvi) {
  if (chuc > 1) {
    let s = ` ${CHU_SO[chuc]} mươi`;
    if (donvi === 1) s += " mốt";
    else if (donvi === 4) s += " tư";
    else if (donvi === 5) s += " lăm";
    else if (donvi > 0) s += ` ${CHU_SO[donvi]}`;
    return s;
  }
  if (chuc === 1) {
    let s = " mười";
    if (donvi === 5) s += " lăm";
    else if (donvi > 0) s += ` ${CHU_SO[donvi]}`;
    return s;
  }
  return "";
}

function docBaSo(n, docLinh) {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donvi = n % 10;
  let s = "";

  if (tram > 0) {
    s += `${CHU_SO[tram]} trăm`;
    if (chuc === 0 && donvi > 0) s += " lẻ";
  } else if (docLinh && (chuc > 0 || donvi > 0)) {
    s += "không trăm";
    if (chuc === 0) s += " lẻ";
  }

  s += docHangChuc(chuc, donvi);

  if (chuc === 0 && donvi > 0) {
    s += ` ${CHU_SO[donvi]}`;
  }

  return s.trim();
}

export function amountToWords(value) {
  let n = Math.round(Number(value) || 0);
  if (n === 0) return "Không đồng";
  if (n < 0) n = Math.abs(n);

  const groups = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  const parts = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i];
    if (group === 0) continue;
    const docLinh = i < groups.length - 1;
    const words = docBaSo(group, docLinh);
    if (words) parts.push(`${words}${HANG[i] ? ` ${HANG[i]}` : ""}`);
  }

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}
