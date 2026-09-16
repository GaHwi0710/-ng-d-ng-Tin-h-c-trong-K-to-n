import { useState, useEffect } from "react";
import { getCategoryIcon } from "../pages/modules/ProductsPage.jsx";

// Ảnh sản phẩm dùng chung cho mọi nơi hiển thị sản phẩm (bảng, modal, giỏ hàng...)
// size: chiều dài cạnh (px). Ảnh lỗi hoặc thiếu sẽ tự chuyển sang biểu tượng theo danh mục.
export function ProductImage({ src, alt = "", category = "", size = 34, borderRadius = 8, style }) {
  const [failed, setFailed] = useState(false);

  // Đổi src (ví dụ sửa sản phẩm) thì cho phép thử tải lại
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const dimensionStyle = {
    width: size,
    height: size,
    borderRadius,
    objectFit: "cover",
    border: "1px solid var(--border, #e2e8f0)",
    flexShrink: 0,
    background: "#fff",
    ...style,
  };

  const showImage = src && !failed;
  if (showImage) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        style={dimensionStyle}
      />
    );
  }
  return (
    <div
      style={{ ...dimensionStyle, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.55, background: "var(--surface-sunken, #f1f5f9)" }}
      title={alt}
    >
      {getCategoryIcon(category)}
    </div>
  );
}
