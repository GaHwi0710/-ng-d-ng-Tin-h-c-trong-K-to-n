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
import ConfirmDialog from "../../components/ConfirmDialog";

export function PromotionsPage({ title, description }) {
  const [promotions, setPromotions] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: "" });

  const initialForm = {
    MaKM: "",
    TenKM: "",
    LoaiGiam: "percentage", // "percentage" | "fixed"
    PhanTramGiam: 10,
    GiaTriGiam: 50000,
    PhamVi: "Toàn bộ", // "Toàn bộ" | "Theo đối tượng"
    DoiTuong: "Tất cả", // "Tất cả" | "Hạng Bạc" | "Hạng Vàng" | "Hạng Kim Cương"
    DiemYeuCau: "",
    NgayBatDau: new Date().toISOString().slice(0, 10),
    NgayKetThuc: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    DieuKienApDung: "",
    TrangThai: "Đang áp dụng",
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    listRecords("promotions").then(setPromotions);
  }, []);

  const stats = useMemo(() => {
    const total = promotions.length;
    const now = new Date().toISOString().slice(0, 10);
    const active = promotions.filter(
      (p) => p.TrangThai === "Đang áp dụng" || (p.NgayBatDau <= now && p.NgayKetThuc >= now)
    ).length;
    const upcoming = promotions.filter(
      (p) => p.TrangThai === "Sắp diễn ra" || p.NgayBatDau > now
    ).length;
    const vouchers = promotions.filter((p) => p.PhamVi === "Theo đối tượng" || (p.GiaTriGiam && p.GiaTriGiam > 0)).length;
    return { total, active, upcoming, vouchers };
  }, [promotions]);

  const visible = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return promotions.filter((p) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        (p.TenKM || "").toLowerCase().includes(q) ||
        (p.MaKM || p.id || "").toLowerCase().includes(q) ||
        (p.DoiTuong || "").toLowerCase().includes(q) ||
        (p.DieuKienApDung || "").toLowerCase().includes(q);

      if (!matchQuery) return false;

      const isCurrent = p.NgayBatDau <= now && p.NgayKetThuc >= now;
      const isUp = p.NgayBatDau > now;
      const isPast = p.NgayKetThuc < now;

      if (statusFilter === "active" && !isCurrent && p.TrangThai !== "Đang áp dụng") return false;
      if (statusFilter === "upcoming" && !isUp && p.TrangThai !== "Sắp diễn ra") return false;
      if (statusFilter === "expired" && !isPast && p.TrangThai !== "Đã kết thúc") return false;

      if (scopeFilter === "all_customers" && p.PhamVi === "Theo đối tượng") return false;
      if (scopeFilter === "by_tier" && p.PhamVi !== "Theo đối tượng") return false;

      return true;
    });
  }, [promotions, query, statusFilter, scopeFilter]);

  function openCreate() {
    setEditing(null);
    setFormData({
      ...initialForm,
      MaKM: `KM${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setModalOpen(true);
  }

  function openEdit(promo) {
    setEditing(promo);
    const isFixed = Boolean(promo.GiaTriGiam && Number(promo.GiaTriGiam) > 0);
    setFormData({
      id: promo.id,
      MaKM: promo.MaKM || promo.id || "",
      TenKM: promo.TenKM || "",
      LoaiGiam: isFixed ? "fixed" : "percentage",
      PhanTramGiam: promo.PhanTramGiam || 10,
      GiaTriGiam: promo.GiaTriGiam || 50000,
      PhamVi: promo.PhamVi || (promo.DoiTuong && promo.DoiTuong !== "Tất cả" ? "Theo đối tượng" : "Toàn bộ"),
      DoiTuong: promo.DoiTuong || "Tất cả",
      DiemYeuCau: promo.DiemYeuCau || "",
      NgayBatDau: promo.NgayBatDau || "",
      NgayKetThuc: promo.NgayKetThuc || "",
      DieuKienApDung: promo.DieuKienApDung || "",
      TrangThai: promo.TrangThai || "Đang áp dụng",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.MaKM.trim()) return toast("Mã khuyến mãi / Voucher là bắt buộc");
    if (!formData.TenKM.trim()) return toast("Tên chương trình là bắt buộc");

    if (formData.LoaiGiam === "percentage") {
      if (Number(formData.PhanTramGiam) <= 0 || Number(formData.PhanTramGiam) > 100) {
        return toast("Phần trăm giảm giá phải từ 1% đến 100%");
      }
    } else {
      if (Number(formData.GiaTriGiam) <= 0) {
        return toast("Số tiền giảm phải lớn hơn 0");
      }
    }

    if (formData.NgayBatDau && formData.NgayKetThuc && formData.NgayBatDau > formData.NgayKetThuc) {
      return toast("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
    }

    try {
      const payload = {
        ...formData,
        MaKM: formData.MaKM.trim().toUpperCase(),
        PhanTramGiam: formData.LoaiGiam === "percentage" ? Number(formData.PhanTramGiam) : 0,
        GiaTriGiam: formData.LoaiGiam === "fixed" ? Number(formData.GiaTriGiam) : 0,
        DiemYeuCau: Number(formData.DiemYeuCau) || 0,
      };
      const saved = await saveRecord("promotions", payload);
      setPromotions((prev) =>
        editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]
      );
      setModalOpen(false);
      toast(editing ? "Đã cập nhật chương trình khuyến mãi" : "Đã tạo chương trình khuyến mãi mới");
    } catch (err) {
      toast(err.message || "Lỗi lưu chương trình");
    }
  }

  function handleDelete(id, name) {
    setConfirmDialog({ open: true, id, name });
  }

  async function executeDelete() {
    const { id } = confirmDialog;
    setConfirmDialog({ open: false, id: null, name: "" });
    try {
      await deleteRecord("promotions", id);
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast("Đã xóa chương trình khuyến mãi thành công");
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa");
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
          Tạo khuyến mãi / Voucher mới
        </button>
      </header>

      {/* POLICY BANNER: Phân biệt điểm tích lũy vs mã khuyến mãi */}
      <div
        style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #eff6ff 100%)",
          border: "1.5px solid #a7f3d0",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 18,
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <SparklesIcon width={28} height={28} style={{ color: "#059669", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#065f46" }}>
              💎 Chính sách Phân hạng Thành viên &amp; Quyền lợi Voucher Tích lũy
            </h3>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#047857", lineHeight: 1.5 }}>
              Khách hàng tự động tích lũy <strong>1 điểm cho mỗi 10.000 VNĐ</strong> mua sắm tại cửa hàng. Khi đạt đủ điểm phân hạng, khách hàng được quyền áp dụng Voucher tương ứng tại quầy thu ngân (POS):
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
                fontSize: 12.5,
              }}
            >
              <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
                <span style={{ fontWeight: 700, color: "#475569" }}>🥈 Hạng Bạc (≥ 100 điểm)</span>
                <div style={{ marginTop: 4, color: "#1e293b" }}>
                  Mã: <strong style={{ color: "#059669" }}>BAC50K</strong> — Voucher giảm <strong>50.000 đ</strong>
                </div>
              </div>
              <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #fde047" }}>
                <span style={{ fontWeight: 700, color: "#b45309" }}>🥇 Hạng Vàng (≥ 500 điểm)</span>
                <div style={{ marginTop: 4, color: "#1e293b" }}>
                  Mã: <strong style={{ color: "#d97706" }}>VANG100K</strong> — Voucher giảm <strong>100.000 đ</strong>
                </div>
              </div>
              <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #a5f3fc" }}>
                <span style={{ fontWeight: 700, color: "#0369a1" }}>💎 Hạng Kim Cương (≥ 1000 điểm)</span>
                <div style={{ marginTop: 4, color: "#1e293b" }}>
                  Mã: <strong style={{ color: "#0284c7" }}>KC200K</strong> — Voucher giảm <strong>200.000 đ</strong>
                </div>
              </div>
              <div style={{ background: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <span style={{ fontWeight: 700, color: "#475569" }}>🏷️ Khuyến mãi Toàn bộ</span>
                <div style={{ marginTop: 4, color: "#1e293b" }}>
                  Mã: <strong style={{ color: "#4f46e5" }}>KMALL10</strong> — Giảm <strong>10%</strong> toàn bộ đơn
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng chương trình"
          value={String(stats.total)}
          delta="Chiến dịch & Voucher"
          icon={GiftIcon}
        />
        <StatCard
          label="Đang áp dụng"
          value={String(stats.active)}
          delta="Có hiệu lực tại quầy"
          valueClass="positive"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Voucher theo đối tượng"
          value={String(stats.vouchers)}
          delta="Dành cho thành viên"
          valueClass="accent"
          icon={SparklesIcon}
        />
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar" style={{ flexWrap: "wrap" }}>
        <div className="invoice-search" style={{ flex: 1, minWidth: 260, maxWidth: 420 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên KM, mã ưu đãi, đối tượng..."
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
            Tất cả trạng thái
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

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-soft)" }}>Phạm vi:</span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "#fff",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <option value="all">Tất cả phạm vi</option>
            <option value="all_customers">Toàn bộ khách hàng</option>
            <option value="by_tier">Theo đối tượng thành viên</option>
          </select>
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

          const isFixed = Boolean(promo.GiaTriGiam && Number(promo.GiaTriGiam) > 0);
          const discountDisplay = isFixed
            ? `${(Number(promo.GiaTriGiam) / 1000).toLocaleString("vi-VN")}K`
            : `${promo.PhanTramGiam || 0}%`;

          return (
            <article key={promo.id} className="promo-card">
              <div className="promo-left-stub" style={{ background: isFixed ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : undefined }}>
                <span className="promo-discount-num">{discountDisplay}</span>
                <span className="promo-discount-lbl">{isFixed ? "VOUCHER TIỀN" : "GIẢM GIÁ"}</span>
              </div>

              <div className="promo-main-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                      <span className={`promo-status-pill ${statusBadge.cls}`}>{statusBadge.text}</span>
                      <span
                        style={{
                          background: "#e0f2fe",
                          color: "#0369a1",
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 6,
                          letterSpacing: "0.5px",
                        }}
                      >
                        MÃ: {promo.MaKM || promo.id}
                      </span>
                    </div>
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

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: promo.PhamVi === "Theo đối tượng" ? "#fef3c7" : "#f1f5f9",
                      color: promo.PhamVi === "Theo đối tượng" ? "#92400e" : "#475569",
                      fontWeight: 600,
                    }}
                  >
                    Phạm vi: {promo.PhamVi || "Toàn bộ"}
                  </span>
                  {promo.DoiTuong && promo.DoiTuong !== "Tất cả" && (
                    <span
                      style={{
                        fontSize: 11.5,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#ecfdf5",
                        color: "#065f46",
                        fontWeight: 600,
                      }}
                    >
                      Đối tượng: {promo.DoiTuong}
                    </span>
                  )}
                  {Number(promo.DiemYeuCau) > 0 && (
                    <span
                      style={{
                        fontSize: 11.5,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#ede9fe",
                        color: "#5b21b6",
                        fontWeight: 600,
                      }}
                    >
                      Đổi: {promo.DiemYeuCau} điểm
                    </span>
                  )}
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
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pm-code">Mã khuyến mãi / Voucher <span className="required-star">*</span></label>
            <input
              id="pm-code"
              type="text"
              required
              placeholder="Ví dụ: KMALL10, BAC50K"
              value={formData.MaKM}
              onChange={(e) => setFormData({ ...formData, MaKM: e.target.value.toUpperCase() })}
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

        <div className="field">
          <label htmlFor="pm-name">Tên chương trình khuyến mãi / Voucher <span className="required-star">*</span></label>
          <input
            id="pm-name"
            type="text"
            required
            placeholder="Ví dụ: Ưu đãi Hạng Vàng 100K hoặc Giảm 10% Toàn Cửa Hàng"
            value={formData.TenKM}
            onChange={(e) => setFormData({ ...formData, TenKM: e.target.value })}
          />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="pm-type">Hình thức giảm giá</label>
            <select
              id="pm-type"
              value={formData.LoaiGiam}
              onChange={(e) => setFormData({ ...formData, LoaiGiam: e.target.value })}
            >
              <option value="percentage">Phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (VNĐ)</option>
            </select>
          </div>
          <div className="field">
            {formData.LoaiGiam === "percentage" ? (
              <>
                <label htmlFor="pm-pct">Mức giảm (%) <span className="required-star">*</span></label>
                <input
                  id="pm-pct"
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={formData.PhanTramGiam}
                  onChange={(e) => setFormData({ ...formData, PhanTramGiam: e.target.value })}
                />
              </>
            ) : (
              <>
                <label htmlFor="pm-amt">Số tiền giảm (VNĐ) <span className="required-star">*</span></label>
                <input
                  id="pm-amt"
                  type="number"
                  min="1000"
                  step="5000"
                  required
                  placeholder="Ví dụ: 50000, 100000"
                  value={formData.GiaTriGiam}
                  onChange={(e) => setFormData({ ...formData, GiaTriGiam: e.target.value })}
                />
              </>
            )}
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="pm-scope">Phạm vi áp dụng</label>
            <select
              id="pm-scope"
              value={formData.PhamVi}
              onChange={(e) => {
                const p = e.target.value;
                setFormData({
                  ...formData,
                  PhamVi: p,
                  DoiTuong: p === "Toàn bộ" ? "Tất cả" : (formData.DoiTuong === "Tất cả" ? "Hạng Bạc" : formData.DoiTuong),
                });
              }}
            >
              <option value="Toàn bộ">Toàn bộ khách hàng</option>
              <option value="Theo đối tượng">Theo đối tượng thành viên</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pm-target">Đối tượng áp dụng</label>
            <select
              id="pm-target"
              disabled={formData.PhamVi === "Toàn bộ"}
              value={formData.DoiTuong}
              onChange={(e) => setFormData({ ...formData, DoiTuong: e.target.value })}
            >
              <option value="Tất cả">Tất cả khách hàng</option>
              <option value="Hạng Bạc">Hạng Bạc (≥ 100 điểm)</option>
              <option value="Hạng Vàng">Hạng Vàng (≥ 500 điểm)</option>
              <option value="Hạng Kim Cương">Hạng Kim Cương (≥ 1000 điểm)</option>
              <option value="Hạng Bạc trở lên">Hạng Bạc trở lên (≥ 100 điểm)</option>
              <option value="Hạng Vàng trở lên">Hạng Vàng trở lên (≥ 500 điểm)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="promo-points">Số điểm cần đổi <span className="required-star">*</span></label>
          <input
            id="promo-points"
            type="number"
            min="0"
            value={formData.DiemYeuCau || ""}
            onChange={e => setFormData({ ...formData, DiemYeuCau: e.target.value })}
            placeholder="VD: 100, 500, 1000"
            required
          />
          <small style={{ color: "var(--text-faint)", fontSize: "11.5px" }}>Số điểm khách hàng cần đổi để nhận voucher này</small>
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

        <div className="form-grid">
          <div className="field">
            <label htmlFor="pm-start">Ngày bắt đầu <span className="required-star">*</span></label>
            <input
              id="pm-start"
              type="date"
              required
              value={formData.NgayBatDau}
              onChange={(e) => setFormData({ ...formData, NgayBatDau: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pm-end">Ngày kết thúc <span className="required-star">*</span></label>
            <input
              id="pm-end"
              type="date"
              required
              value={formData.NgayKetThuc}
              onChange={(e) => setFormData({ ...formData, NgayKetThuc: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận xóa khuyến mãi"
        itemName={confirmDialog.name}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null, name: "" })}
      />
    </section>
  );
}