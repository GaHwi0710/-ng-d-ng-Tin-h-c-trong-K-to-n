import { useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel = "Lưu",
  cancelLabel = "Hủy",
  wide = false,
  extraWide = false,
  loading = false,
  submitDisabled = false,
  submitVariant = "primary",
  children,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Khóa cuộn trang nền khi mở modal
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!open) return null;

  const widthClass = extraWide ? " modal-extrawide" : wide ? " modal-wide" : "";

  return (
    <div
      className="modal-overlay show"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <article className={`modal${widthClass} erp-modal`}>
        <header className="modal-head">
          <div>
            <h3 id="modal-title" className="modal-title">{title}</h3>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button
            className="close-x"
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
          >
            <XMarkIcon className="ic" aria-hidden="true" />
          </button>
        </header>

        <section className="modal-body">{children}</section>

        <footer className="modal-foot">
          <button className="btn btn-outline" type="button" onClick={onClose}>
            {cancelLabel}
          </button>
          {onSubmit && (
            <button
              className={`btn btn-${submitVariant}`}
              type="button"
              onClick={onSubmit}
              disabled={loading || submitDisabled}
            >
              {loading ? "Đang xử lý..." : submitLabel}
            </button>
          )}
        </footer>
      </article>
    </div>
  );
}
