import { useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export function Modal({ open, title, onClose, onSubmit, submitLabel = "Lưu", wide = false, children }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay show"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <article className={`modal${wide ? " modal-wide" : ""}`}>
        <header className="modal-head">
          <h3 id="modal-title">{title}</h3>
          <button className="close-x" type="button" onClick={onClose} aria-label="Đóng">
            <XMarkIcon className="ic" aria-hidden="true" />
          </button>
        </header>
        <section className="modal-body">{children}</section>
        <footer className="modal-foot">
          <button className="btn btn-outline" type="button" onClick={onClose}>Hủy</button>
          {onSubmit && (
            <button className="btn btn-primary" type="button" onClick={onSubmit}>{submitLabel}</button>
          )}
        </footer>
      </article>
    </div>
  );
}
