import { useState, useRef, useEffect } from "react";
import {
  PrinterIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

export function DocumentPrintPreviewModal({
  open,
  onClose,
  title = "Xem trước chứng từ kế toán",
  subtitle = "Mẫu chuẩn theo quy định của Bộ Tài Chính",
  htmlContent = "",
  alternativeTemplates = [], // [{ label, icon, isK80, getHtml }]
  printLabel = "",
}) {
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  const iframeRef = useRef(null);

  const activeTemplate = alternativeTemplates.length && alternativeTemplates[activeTemplateIndex]
    ? alternativeTemplates[activeTemplateIndex]
    : null;

  const currentHtml = activeTemplate ? activeTemplate.getHtml() : htmlContent;

  const isK80 = Boolean(
    activeTemplate?.isK80 ||
    activeTemplate?.label?.includes("K80") ||
    (!activeTemplate && (title.includes("K80") || subtitle.includes("K80")))
  );

  const isLandscape = Boolean(
    activeTemplate?.isLandscape ||
    title.toLowerCase().includes("landscape") ||
    subtitle.toLowerCase().includes("landscape") ||
    currentHtml.includes("size: A4 landscape") ||
    currentHtml.includes("size: landscape")
  );

  useEffect(() => {
    if (open && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(currentHtml);
        doc.close();
      }
    }
  }, [open, currentHtml, activeTemplateIndex]);

  if (!open) return null;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleSavePdf = () => {
    // Trình duyệt native in ra PDF
    handlePrint();
  };

  return (
    <div
      className="modal-overlay show"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal-extrawide erp-modal"
        style={{
          width: "95vw",
          maxWidth: isLandscape ? "1280px" : "1050px",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          background: "#fff",
        }}
      >
        {/* Modal Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            flexShrink: 0,
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "8px",
                background: "#E0F2FE",
                color: "#0369A1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DocumentTextIcon style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B" }}>{subtitle}</p>
            </div>
          </div>

          {/* Alternative Templates Switcher if provided */}
          {alternativeTemplates.length > 1 && (
            <div style={{ display: "flex", gap: 6, background: "#E2E8F0", padding: "3px", borderRadius: "8px" }}>
              {alternativeTemplates.map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTemplateIndex(idx)}
                  style={{
                    border: "none",
                    background: activeTemplateIndex === idx ? "#fff" : "transparent",
                    color: activeTemplateIndex === idx ? "#0F172A" : "#64748B",
                    fontWeight: activeTemplateIndex === idx ? 600 : 500,
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: activeTemplateIndex === idx ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t.icon || <DocumentCheckIcon style={{ width: 14, height: 14 }} />}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleSavePdf}
              title="Lưu file PDF qua hộp thoại in"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
              <span>Lưu PDF</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <PrinterIcon style={{ width: 15, height: 15 }} />
              <span>{printLabel || (isK80 ? "In bill K80" : "In chứng từ")}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
              }}
              title="Đóng"
            >
              <XMarkIcon style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </header>

        {/* Modal Body: Document Preview Frame */}
        <div
          style={{
            flex: 1,
            background: "#94A3B8",
            overflow: "auto",
            padding: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: isK80 ? "96mm" : isLandscape ? "297mm" : "210mm",
              minHeight: isK80 ? "160mm" : isLandscape ? "210mm" : "297mm",
              background: "#fff",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              borderRadius: "4px",
              overflow: "hidden",
              transition: "max-width 0.2s ease-in-out",
            }}
          >
            <iframe
              ref={iframeRef}
              title="Voucher Document Preview"
              style={{
                width: "100%",
                height: "100%",
                minHeight: isK80 ? "650px" : "800px",
                border: "none",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
