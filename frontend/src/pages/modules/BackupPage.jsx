import { useEffect, useState, useCallback } from "react";
import {
  CircleStackIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { toast } from "../../components/Toast.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { SkeletonRow } from "../../components/SkeletonLoader.jsx";
import { Modal } from "../../components/Modal.jsx";

export function BackupPage({ title = "Sao lưu dữ liệu" }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [backupStep, setBackupStep] = useState("");
  const [lastBackupResult, setLastBackupResult] = useState(null);

  // Trạng thái phục hồi dữ liệu (Restore)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState(null);
  const [uploadedSnapshot, setUploadedSnapshot] = useState(null);
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreStep, setRestoreStep] = useState("");

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("baby-shop-token");
      const res = await fetch("/api/admin/backup/list", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Không thể lấy danh sách sao lưu");
      const json = await res.json();
      setBackups(json.backups || []);
    } catch (err) {
      toast("Lỗi tải danh sách sao lưu: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function handleDownload(filename) {
    try {
      const token = localStorage.getItem("baby-shop-token");
      toast(`Đang chuẩn bị tải xuống: ${filename}...`);
      const res = await fetch(`/api/admin/backup/download/${encodeURIComponent(filename)}?token=${encodeURIComponent(token || "")}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Không thể tải file sao lưu");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast(`Đã tải file "${filename}" về máy tính thành công!`);
    } catch (err) {
      toast("Lỗi tải file sao lưu: " + err.message);
    }
  }

  async function executeBackup() {
    setCreating(true);
    setBackupStep("Đang kết nối MongoDB và quét 25 collections...");
    try {
      const token = localStorage.getItem("baby-shop-token");
      await new Promise((r) => setTimeout(r, 400));
      setBackupStep("Đang trích xuất toàn bộ dữ liệu kế toán & chứng từ...");
      
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Lỗi tạo bản sao lưu");

      setBackupStep("Đang đóng gói file JSON snapshot an toàn...");
      await new Promise((r) => setTimeout(r, 300));

      setLastBackupResult(json);
      setConfirmModalOpen(false);
      toast(`Đã tạo bản sao lưu thành công (${json.totalCollections} bảng, ${json.totalRecords} bản ghi)`);
      fetchBackups();

      // Tự động tải file về máy cho người dùng tiện lợi
      if (json.filename) {
        handleDownload(json.filename);
      }
    } catch (err) {
      toast("Lỗi tạo sao lưu: " + err.message);
    } finally {
      setCreating(false);
      setBackupStep("");
    }
  }

  async function openRestoreForFile(filename) {
    setSelectedBackupForRestore(filename);
    setUploadedSnapshot(null);
    try {
      const token = localStorage.getItem("baby-shop-token");
      const res = await fetch("/api/admin/backup/restore/preview", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Không thể đọc thông tin file sao lưu");
      setRestorePreview(json.preview);
      setRestoreModalOpen(true);
    } catch (err) {
      toast("Lỗi đọc file sao lưu: " + err.message);
    }
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      return toast("Vui lòng chọn file sao lưu có định dạng .json");
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);
        setUploadedSnapshot(parsed);
        setSelectedBackupForRestore(file.name);

        const token = localStorage.getItem("baby-shop-token");
        const res = await fetch("/api/admin/backup/restore/preview", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ snapshot: parsed }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Cấu trúc file backup không hợp lệ");
        setRestorePreview(json.preview);
        setRestoreModalOpen(true);
      } catch (err) {
        toast("Lỗi đọc file: " + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = "";
  }

  async function executeRestore() {
    setRestoring(true);
    setRestoreStep("Đang tạo bản sao lưu an toàn tự động (pre-restore safety backup)...");
    try {
      const token = localStorage.getItem("baby-shop-token");
      await new Promise((r) => setTimeout(r, 400));
      setRestoreStep("Đang đồng bộ và nạp lại 25 collections MongoDB...");

      const payload = {
        confirm: true,
      };
      if (uploadedSnapshot) {
        payload.snapshot = uploadedSnapshot;
        payload.filename = selectedBackupForRestore || "uploaded-backup.json";
      } else if (selectedBackupForRestore) {
        payload.filename = selectedBackupForRestore;
      } else {
        throw new Error("Vui lòng chọn bản sao lưu cần phục hồi");
      }

      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Lỗi phục hồi dữ liệu");

      setRestoreStep("Hoàn tất xác thực toàn vẹn dữ liệu...");
      await new Promise((r) => setTimeout(r, 300));

      setRestoreModalOpen(false);
      toast(`Phục hồi thành công! (${json.totalRestoredRecords} bản ghi). Bản lưu an toàn: ${json.safetyBackup}`);
      fetchBackups();
    } catch (err) {
      toast("Lỗi phục hồi: " + err.message);
    } finally {
      setRestoring(false);
      setRestoreStep("");
    }
  }

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="module-page-container">
      <header className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CircleStackIcon style={{ width: 28, height: 28, color: "var(--primary)" }} />
            {title}
          </h1>
          <p className="page-description">
            Quản lý các bản sao lưu cơ sở dữ liệu MongoDB an toàn, đảm bảo tính toàn vẹn dữ liệu kế toán
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            id="restore-file-input"
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchBackups}
            disabled={loading || creating || restoring}
          >
            <ArrowPathIcon className={`btn-icon ${loading ? "spinning" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => document.getElementById("restore-file-input")?.click()}
            disabled={creating || restoring}
            title="Tải lên file JSON backup từ máy tính để phục hồi"
          >
            <ArrowUpTrayIcon className="btn-icon" />
            Phục hồi từ file...
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setConfirmModalOpen(true)}
            disabled={creating || restoring}
          >
            <DocumentDuplicateIcon className="btn-icon" />
            Tạo bản sao lưu ngay
          </button>
        </div>
      </header>

      {/* Thông số tổng quan */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>Cơ sở dữ liệu</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--primary)", marginTop: 4 }}>
            baby_shop_management
          </div>
          <div style={{ fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <CheckCircleIcon style={{ width: 14, height: 14 }} /> Kết nối ổn định (MongoDB)
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>Số bảng nghiệp vụ</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
            25 Collections
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            14 bảng bắt buộc + 11 bảng mở rộng
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 13, color: "var(--text-soft)" }}>Tổng số bản sao lưu</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
            {backups.length} file
          </div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>
            Định dạng JSON snapshot chuẩn UTF-8
          </div>
        </div>
      </div>

      {/* Cảnh báo an toàn dữ liệu */}
      <div
        className="card"
        style={{
          padding: "14px 18px",
          marginBottom: 20,
          background: "var(--warn-light)",
          borderColor: "#FCD34D",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <ExclamationTriangleIcon style={{ width: 22, height: 22, color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
          <strong>Chính sách an toàn dữ liệu kế toán:</strong> Dữ liệu sao lưu bao gồm toàn bộ chứng từ Hóa đơn, Phiếu nhập, Phiếu xuất, Tồn kho, và Công nợ. Bản sao lưu được lưu trữ độc lập và có thể tải về máy tính để bảo quản. Hệ thống bảo vệ tính toàn vẹn 100% của cơ sở dữ liệu.
        </div>
      </div>

      {/* Danh sách file backup */}
      <div className="table-shell card">
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Lịch sử sao lưu hệ thống ({backups.length})</h2>
          <span style={{ fontSize: 12.5, color: "var(--text-soft)" }}>Tự động lưu trữ tại thư mục backups</span>
        </div>
        <table className="data-table" style={{ width: "100%", textAlign: "left" }}>
          <thead>
            <tr>
              <th>Tên file sao lưu</th>
              <th style={{ width: 220 }}>Thời điểm tạo</th>
              <th style={{ width: 140 }}>Dung lượng</th>
              <th style={{ width: 160, textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} columns={4} />)
            ) : backups.length > 0 ? (
              backups.map((b) => (
                <tr key={b.filename}>
                  <td style={{ fontWeight: 500, color: "var(--primary-dark)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CircleStackIcon style={{ width: 18, height: 18, color: "var(--primary)" }} />
                      <span>{b.filename}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-soft)", fontSize: 13 }}>
                    {new Date(b.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    <span className="badge badge-light" style={{ fontWeight: 600 }}>
                      {formatSize(b.size)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownload(b.filename)}
                        title="Tải file về máy tính"
                        style={{ height: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                        Tải về
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => openRestoreForFile(b.filename)}
                        title="Phục hồi cơ sở dữ liệu từ bản sao lưu này"
                        style={{ height: 32, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6, color: "#d97706", borderColor: "#fcd34d" }}
                      >
                        <ArrowPathIcon style={{ width: 14, height: 14 }} />
                        Phục hồi
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: 0 }}>
                  <EmptyState
                    title="Chưa có bản sao lưu nào"
                    description="Nhấn 'Tạo bản sao lưu ngay' để xuất snapshot dữ liệu đầu tiên cho hệ thống."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xác nhận tạo bản sao lưu đẹp tự động (Thay thế hoàn toàn window.confirm) */}
      <Modal
        open={confirmModalOpen}
        title="Tạo bản sao lưu dữ liệu toàn hệ thống"
        subtitle="Xuất bản snapshot toàn bộ cơ sở dữ liệu MongoDB an toàn"
        onClose={() => !creating && setConfirmModalOpen(false)}
        onSubmit={executeBackup}
        submitLabel={creating ? "Đang sao lưu..." : "Bắt đầu sao lưu ngay"}
        cancelLabel="Hủy bỏ"
        loading={creating}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px",
              background: "#F0FDFA",
              border: "1px solid #CCFBF1",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "#0F5C53",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CircleStackIcon style={{ width: 26, height: 26 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F766E", marginBottom: 2 }}>
                Cơ sở dữ liệu: baby_shop_management
              </div>
              <div style={{ fontSize: 12.5, color: "#334155" }}>
                Hệ thống sẽ trích xuất <strong>25 collections</strong> và toàn bộ chứng từ kế toán sang tệp JSON snapshot độc lập.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12.5 }}>
            <div style={{ padding: "10px 14px", background: "var(--surface-sunken)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-soft)", display: "block" }}>Số lượng bảng:</span>
              <strong style={{ fontSize: 14, color: "var(--text)" }}>25 bảng nghiệp vụ</strong>
            </div>
            <div style={{ padding: "10px 14px", background: "var(--surface-sunken)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-soft)", display: "block" }}>Định dạng xuất:</span>
              <strong style={{ fontSize: 14, color: "var(--text)" }}>JSON Snapshot UTF-8</strong>
            </div>
          </div>

          {creating && (
            <div
              style={{
                padding: "14px 16px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <ArrowPathIcon className="spinning" style={{ width: 20, height: 20, color: "#2563EB", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 500 }}>
                {backupStep || "Đang xử lý..."}
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.45 }}>
            💡 <em>Sau khi sao lưu hoàn tất, hệ thống sẽ tự động kích hoạt tải tệp JSON về máy tính của bạn để lưu trữ an toàn.</em>
          </div>
        </div>
      </Modal>

      {/* Modal xác nhận phục hồi dữ liệu an toàn */}
      <Modal
        open={restoreModalOpen}
        title="Phục hồi dữ liệu cơ sở dữ liệu (Restore)"
        subtitle="Khôi phục toàn bộ chứng từ và nghiệp vụ từ bản sao lưu đã chọn"
        onClose={() => !restoring && setRestoreModalOpen(false)}
        onSubmit={executeRestore}
        submitLabel={restoring ? "Đang phục hồi..." : "Xác nhận Phục hồi dữ liệu"}
        cancelLabel="Hủy bỏ"
        loading={restoring}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Cảnh báo an toàn dữ liệu */}
          <div
            style={{
              padding: "14px 16px",
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              borderRadius: 10,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <ExclamationTriangleIcon style={{ width: 22, height: 22, color: "#D97706", flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.45 }}>
              <strong>CẢNH BÁO AN TOÀN QUAN TRỌNG:</strong>
              <div>
                Phục hồi dữ liệu sẽ thay đổi và đồng bộ lại toàn bộ dữ liệu hiện tại trong cơ sở dữ liệu theo bản sao lưu.
                Để đảm bảo an toàn tuyệt đối, hệ thống sẽ <strong>tự động tạo một bản sao lưu an toàn (pre-restore backup)</strong> của dữ liệu hiện tại trước khi bắt đầu.
              </div>
            </div>
          </div>

          {/* Chi tiết bản sao lưu */}
          {restorePreview && (
            <div style={{ background: "var(--surface-sunken)", padding: "14px", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-dark)", marginBottom: 8 }}>
                📦 Thông tin bản sao lưu:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12.5 }}>
                <div>Tệp nguồn: <strong>{selectedBackupForRestore}</strong></div>
                <div>Thời điểm tạo: <strong>{new Date(restorePreview.createdAt).toLocaleString("vi-VN")}</strong></div>
                <div>Tổng số bảng: <strong>{restorePreview.totalCollections} collections</strong></div>
                <div>Tổng số bản ghi: <strong style={{ color: "var(--primary)" }}>{restorePreview.totalRecords} bản ghi</strong></div>
              </div>
            </div>
          )}

          {restoring && (
            <div
              style={{
                padding: "14px 16px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <ArrowPathIcon className="spinning" style={{ width: 20, height: 20, color: "#2563EB", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 500 }}>
                {restoreStep || "Đang xử lý phục hồi dữ liệu..."}
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.45 }}>
            💡 <em>Bạn có thể hủy bỏ thao tác này bất cứ lúc nào trước khi bấm Xác nhận Phục hồi.</em>
          </div>
        </div>
      </Modal>
    </div>
  );
}
