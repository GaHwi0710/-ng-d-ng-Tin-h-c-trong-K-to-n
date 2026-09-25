/**
 * storeConfig.js — Cấu hình thông tin đơn vị Cửa hàng Mẹ & Bé
 * Đồng bộ toàn bộ tiêu đề, địa chỉ, số điện thoại, email in chứng từ & hóa đơn.
 */

import { BRAND, getBrandLogoUrl } from "../config/brand.js";

export { BRAND, getBrandLogoUrl };

export const DEFAULT_STORE_CONFIG = {
  name: BRAND.name,
  brandName: BRAND.name,
  title: BRAND.name,
  desc: BRAND.fullName,
  subtitle: BRAND.fullName,
  slogan: BRAND.slogan,
  address: BRAND.address,
  phone: BRAND.phone,
  hotline: BRAND.hotline,
  email: BRAND.email,
  website: BRAND.website,
  taxCode: BRAND.taxCode,
  logo: BRAND.logo,
  favicon: BRAND.favicon,
  bankId: (typeof import.meta !== "undefined" && import.meta.env?.VITE_BANK_ID) || "MB",
  bankName: "MB Bank (Ngân hàng Quân Đội)",
  bankAccount: (typeof import.meta !== "undefined" && import.meta.env?.VITE_BANK_ACCOUNT) || "0987654321001",
  accountName: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ACCOUNT_NAME) || "CUA HANG ME VA BE",
};

/**
 * Tạo URL mã QR thanh toán VietQR động chuẩn NAPAS
 */
export function getVietQrUrl({ bankId, bankAccount, accountName, amount, content } = {}) {
  const cfg = getStoreConfig();
  const bank = bankId || cfg.bankId || "MB";
  const acc = bankAccount || cfg.bankAccount || "0987654321001";
  const name = encodeURIComponent(accountName || cfg.accountName || "CUA HANG ME VA BE");
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  const desc = encodeURIComponent(content || "Thanh toan hoa don");

  return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amt}&addInfo=${desc}&accountName=${name}`;
}

export function getStoreConfig() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("baby_shop_store_info") : null;
    let custom = {};
    if (raw) {
      custom = JSON.parse(raw);
    }
    const merged = { ...DEFAULT_STORE_CONFIG, ...custom };
    // Luôn bảo đảm địa chỉ, hotline, email, website theo chuẩn nhận diện thương hiệu
    if (!merged.address || merged.address.includes("P. Dịch Vọng") || !merged.address.includes("Phường Dịch Vọng")) {
      merged.address = BRAND.address;
    }
    if (!merged.phone || merged.phone === "0123456789") {
      merged.phone = BRAND.phone;
    }
    merged.hotline = BRAND.hotline;
    if (!merged.email || merged.email === "admin@babyshop.vn") {
      merged.email = BRAND.email;
    }
    if (!merged.website) {
      merged.website = BRAND.website;
    }
    return merged;
  } catch {
    return DEFAULT_STORE_CONFIG;
  }
}

export function saveStoreConfig(newConfig) {
  try {
    const current = getStoreConfig();
    const updated = { ...current, ...newConfig };
    localStorage.setItem("baby_shop_store_info", JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_STORE_CONFIG;
  }
}
