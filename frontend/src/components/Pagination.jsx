import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";

export function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Tính danh sách các trang cần hiển thị
  const getPageNumbers = () => {
    const pages = [];
    const delta = 1; // Số trang hiển thị quanh safePage
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= safePage - delta && i <= safePage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  if (totalItems <= 0) return null;

  return (
    <div className="erp-pagination" aria-label="Phân trang dữ liệu">
      <div className="erp-pagination-info">
        <span>
          Hiển thị <strong>{startItem}</strong> – <strong>{endItem}</strong> trong tổng số <strong>{totalItems}</strong> bản ghi
        </span>
        {onPageSizeChange && (
          <label className="erp-pagination-size">
            <span>Số dòng:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange?.(1);
              }}
              aria-label="Số bản ghi trên mỗi trang"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="erp-pagination-controls">
          <button
            type="button"
            className="erp-page-btn nav-btn"
            disabled={safePage <= 1}
            onClick={() => onPageChange?.(1)}
            aria-label="Trang đầu"
            title="Về trang đầu"
          >
            <ChevronDoubleLeftIcon className="ic" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="erp-page-btn nav-btn"
            disabled={safePage <= 1}
            onClick={() => onPageChange?.(safePage - 1)}
            aria-label="Trang trước"
            title="Trang trước"
          >
            <ChevronLeftIcon className="ic" aria-hidden="true" />
          </button>

          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="erp-page-dots">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`erp-page-btn ${p === safePage ? "active" : ""}`}
                onClick={() => onPageChange?.(p)}
                aria-current={p === safePage ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className="erp-page-btn nav-btn"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange?.(safePage + 1)}
            aria-label="Trang kế tiếp"
            title="Trang kế tiếp"
          >
            <ChevronRightIcon className="ic" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="erp-page-btn nav-btn"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange?.(totalPages)}
            aria-label="Trang cuối"
            title="Đến trang cuối"
          >
            <ChevronDoubleRightIcon className="ic" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
