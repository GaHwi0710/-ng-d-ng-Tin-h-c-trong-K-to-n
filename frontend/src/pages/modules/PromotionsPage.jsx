import { useState, useEffect, useMemo } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  GiftIcon,
  SparklesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";

export function PromotionsPage({ title, description }) {
  const [promotions, setPromotions] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    TenKM: "",
    PhanTramGiam: 10,
    NgayBatDau: new Date().toISOString().slice(0, 10),
    NgayKetThuc: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    DieuKienApDung: "",
    TrangThai: "Đang áp dụng",
  });

  useEffect(() => {
    listRecords("promotions").then(setPromotions);
  }, []);

  const stats = useMemo(() => {
    const total = promotions.length;
    const now = new Date().toISOString().slice(0, 10);
    const active = promotions.filter((p) => p.TrangThai === "Đang áp dụng" || (p.NgayBatDau <= now && p.NgayKetThuc >= now)).length;
    const upcoming = promotions.filter((p) => p.TrangThai === "Sắp diễn ra" || p.NgayBatDau > now).length;
    return { total, active, upcoming };
  }, [promotions]);

  const visible = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return promotions.filter((p) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        (p.TenKM || "").toLowerCase().includes(q) ||
        (p.DieuKienApDung || "").toLowerCase().includes(q);

      if (!matchQuery) return false;

      const isCurrent = p.NgayBatDau <= now && p.NgayKetThuc >= now;
      const isUp = p.NgayBatDau > now;
      const isPast = p.NgayKetThuc < now;

      if (statusFilter === "active" && !isCurrent && p.TrangThai !== "Đang áp dụng") return false;
      if (statusFilter === "upcoming" && !isUp && p.TrangThai !== "Sắp diễn ra") return false;
      if (statusFilter === "expired" && !isPast && p.TrangThai !== "Đã kết thúc") return false;

      return true;
    });
  }, [promotions, query, statusFilter]);

  function openCreate() {
    setEditing(null);
    setFormData({
      TenKM: "",
      PhanTramGiam: 10,
      NgayBatDau: new Date().toISOString().slice(0, 10),
      NgayKetThuc: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      DieuKienApDung: "",
      TrangThai: "Đang áp dụng",
    });
    setModalOpen(true);
  }

  function openEdit(promo) {
    setEditing(promo);
    setFormData({
      id: promo.id,
      TenKM: promo.TenKM || "",
      PhanTramGiam: promo.PhanTramGiam || 10,
      NgayBatDau: promo.NgayBatDau || "",
      NgayKetThuc: promo.NgayKetThuc || "",
      DieuKienApDung: promo.DieuKienApDung || "",
      TrangThai: promo.TrangThai || "Đang áp dụng",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.TenKM.trim()) return toast("Tên chương trình khuyến mãi là bắt buộc");
    if (Number(formData.PhanTramGiam) <= 0 || Number(formData.PhanTramGiam) > 100) {
      return toast("Phần trăm giảm giá phải từ 1% đến 100%");
    }
    if (formData.NgayBatDau > formData.NgayKetThuc) {
      return toast("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
    }

    try {
      const payload = {
        ...formData,
        PhanTramGiam: Number(formData.PhanTramGiam) || 0,
      };
      const saved = await saveRecord("promotions", payload);
      setPromotions((prev) =>
        editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]
      );
      setModalOpen(false);
      toast(editing ? "Đã cập nhật chương trình" : "Đã tạo chương trình khuyến mãi");
    } catch (err) {
      toast(err.message || "Lỗi lưu chương trình");
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Bạn có chắc muốn xóa chương trình "${name}"?`)) return;
    try {
      await deleteRecord("promotions", id);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      toast("Đã xóa khuyến mãi");
    } catch (err) {
      toast(err.message || "Không thể xóa");
    }
  }

  return (
    <section aria-labelledby="promo-heading" className="module-specialized promo-page">
      <header className="page-header">
        <hgroup>
          <h1 id="promo-heading">{title}</h1>
          <p>{description || "Thiết lập các chương trình khuyến mãi, voucher giảm giá và ưu đãi tri ân khách hàng."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Tạo khuyến mãi mới
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng chương trình"
          value={String(stats.total)}
          delta="Chiến dịch ưu đãi"
          icon={GiftIcon}
        />
        <StatCard
          label="Đang áp dụng"
          value={String(stats.active)}
          delta="Hiệu lực tại quầy"
          valueClass="positive"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Sắp diễn ra"
          value={String(stats.upcoming)}
          delta="Kế hoạch sắp tới"
          valueClass="accent"
          icon={ClockIcon}
        />
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar">
        <div className="invoice-search" style={{ flex: 1, maxWidth: 420 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên chương trình, điều kiện..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          <button
            type="button"
            className={`filter-chip ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === "active" ? "active" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            Đang áp dụng
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === "upcoming" ? "active" : ""}`}
            onClick={() => setStatusFilter("upcoming")}
          >
            Sắp diễn ra
          </button>
          <button
            type="button"
            className={`filter-chip ${statusFilter === "expired" ? "active" : ""}`}
            onClick={() => setStatusFilter("expired")}
          >
            Đã kết thúc
          </button>
        </div>
      </div>

      {/* Promotions Cards Grid */}
      <div className="promo-grid" style={{ marginTop: 18 }}>
        {visible.map((promo) => {
          const now = new Date().toISOString().slice(0, 10);
          const isCurrent = promo.NgayBatDau <= now && promo.NgayKetThuc >= now;
          const isUp = promo.NgayBatDau > now;
          const statusBadge = isCurrent
            ? { text: "Đang diễn ra", cls: "promo-badge-active" }
            : isUp
            ? { text: "Sắp diễn ra", cls: "promo-badge-up" }
            : { text: "Đã kết thúc", cls: "promo-badge-exp" };

          return (
            <article key={promo.id} className="promo-card">
              <div className="promo-left-stub">
                <span className="promo-discount-num">{promo.PhanTramGiam}%</span>
                <span className="promo-discount-lbl">GIẢM GIÁ</span>
              </div>

              <div className="promo-main-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <span className={`promo-status-pill ${statusBadge.cls}`}>{statusBadge.text}</span>
                    <h3 className="promo-title">{promo.TenKM}</h3>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-sm-btn"
                      title="Chỉnh sửa"
                      onClick={() => openEdit(promo)}
                    >
                      <PencilSquareIcon className="ic" />
                    </button>
                    <button
                      type="button"
                      className="icon-sm-btn del"
                      title="Xóa"
                      onClick={() => handleDelete(promo.id, promo.TenKM)}
                    >
                      <TrashIcon className="ic" />
                    </button>
                  </div>
                </div>

                <p className="promo-cond">
                  <strong>Điều kiện:</strong> {promo.DieuKienApDung || "Áp dụng cho mọi đơn hàng"}
                </p>

                <div className="promo-dates">
                  <CalendarDaysIcon width={15} height={15} style={{ flexShrink: 0 }} />
                  <span>
                    {promo.NgayBatDau} → {promo.NgayKetThuc}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
        {!visible.length && (
          <div className="cat-empty-wrap" style={{ gridColumn: "1 / -1" }}>
            <p>Không có chương trình khuyến mãi nào phù hợp</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật chương trình khuyến mãi" : "Tạo chương trình khuyến mãi mới"}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="field">
          <label htmlFor="pm-name">Tên chương trình khuyến mãi *</label>
          <input
            id="pm-name"
            type="text"
            required
            placeholder="Ví dụ: Ưu đãi Ngày của Mẹ"
            value={formData.TenKM}
            onChange={(e) => setFormData({ ...formData, TenKM: e.target.value })}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="pm-pct">Mức giảm giá (%) *</label>
            <input
              id="pm-pct"
              type="number"
              min="1"
              max="100"
              required
              value={formData.PhanTramGiam}
              onChange={(e) => setFormData({ ...formData, PhanTramGiam: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pm-status">Trạng thái áp dụng</label>
            <select
              id="pm-status"
              value={formData.TrangThai}
              onChange={(e) => setFormData({ ...formData, TrangThai: e.target.value })}
            >
              <option value="Đang áp dụng">Đang áp dụng</option>
              <option value="Sắp diễn ra">Sắp diễn ra</option>
              <option value="Đã kết thúc">Đã kết thúc</option>
            </select>
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="pm-start">Ngày bắt đầu</label>
            <input
              id="pm-start"
              type="date"
              required
              value={formData.NgayBatDau}
              onChange={(e) => setFormData({ ...formData, NgayBatDau: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pm-end">Ngày kết thúc</label>
            <input
              id="pm-end"
              type="date"
              required
              value={formData.NgayKetThuc}
              onChange={(e) => setFormData({ ...formData, NgayKetThuc: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pm-cond">Điều kiện áp dụng</label>
          <input
            id="pm-cond"
            type="text"
            placeholder="Ví dụ: Đơn hàng từ 300.000đ, áp dụng nhóm sữa..."
            value={formData.DieuKienApDung}
            onChange={(e) => setFormData({ ...formData, DieuKienApDung: e.target.value })}
          />
        </div>
      </Modal>
    </section>
  );
}