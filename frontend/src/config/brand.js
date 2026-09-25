/**
 * brand.js — Nhận diện thương hiệu Cửa hàng Mẹ & Bé
 * Quản lý tập trung Logo, Favicon, Tên thương hiệu và Thông tin doanh nghiệp
 * Đáp ứng yêu cầu: "SAU NÀY CHỈ CẦN ĐỔI 1 FILE LOGO -> TOÀN BỘ PROJECT ĐƯỢC ĐỔI LOGO"
 */

export const BRAND = {
  name: "Cửa hàng Mẹ & Bé",
  shortName: "Mẹ & Bé",
  fullName: "Hệ thống quản lý Cửa hàng Mẹ và Bé",
  slogan: "Hệ thống quản lý Cửa hàng Mẹ và Bé",
  logo: "/logo.png",
  favicon: "/favicon.png",
  faviconSvg: "/favicon.svg",
  address: "123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội",
  phone: "0987 654 321",
  hotline: "0987 654 321",
  email: "contact@cuahangmebe.vn",
  website: "www.cuahangmebe.vn",
  taxCode: "0109876543",
};

/**
 * Trả về URL tuyệt đối của logo thương hiệu chính thức
 * Đảm bảo 100% hiển thị và load thành công trong cửa sổ in ấn popup (window.open)
 */
export function getBrandLogoUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${BRAND.logo}`;
  }
  return BRAND.logo;
}
