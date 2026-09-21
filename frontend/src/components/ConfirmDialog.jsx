import { useEffect, useRef } from "react";

/**
 * ConfirmDialog – Hộp thoại xác nhận hiện đại thay thế window.confirm()
 *
 * Props:
 *  open        – boolean, hiển thị hay không
 *  title       – tiêu đề (mặc định "Xác nhận xóa")
 *  message     – nội dung mô tả
 *  itemName    – tên đối tượng hiển thị in đậm (tuỳ chọn)
 *  onConfirm   – callback khi người dùng xác nhận
 *  onCancel    – callback khi người dùng hủy
 *  confirmLabel– nhãn nút xác nhận (mặc định "Xóa")
 *  cancelLabel – nhãn nút hủy (mặc định "Hủy")
 *  variant     – "danger" (mặc định) | "warning"
 */
export default function ConfirmDialog({
  open,
  title = "Xác nhận xóa",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này? Hành động này không thể hoàn tác.",
  itemName,
  onConfirm,
  onCancel,
  confirmLabel = "Xóa",
  cancelLabel = "Hủy",
  variant = "danger",
}) {
  const overlayRef = useRef(null);
  const confirmBtnRef = useRef(null);

  /* Bắt phím Escape để đóng */
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onCancel?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  /* Auto-focus nút xác nhận khi mở */
  useEffect(() => {
    if (open && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="confirm-dialog-overlay"
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onCancel?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="confirm-dialog">
        {/* Icon cảnh báo */}
        <div className={`confirm-dialog-icon ${isDanger ? "icon-danger" : "icon-warning"}`}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {isDanger ? (
              <>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            )}
          </svg>
        </div>

        {/* Tiêu đề */}
        <h3 className="confirm-dialog-title" id="confirm-dialog-title">{title}</h3>

        {/* Nội dung */}
        <p className="confirm-dialog-message">
          {itemName ? (
            <>Bạn có chắc chắn muốn xóa <strong>"{itemName}"</strong>? Hành động này không thể hoàn tác.</>
          ) : (
            message
          )}
        </p>

        {/* Nút hành động */}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-outline confirm-dialog-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={`btn confirm-dialog-confirm ${isDanger ? "confirm-btn-danger" : "confirm-btn-warning"}`}
            onClick={onConfirm}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
