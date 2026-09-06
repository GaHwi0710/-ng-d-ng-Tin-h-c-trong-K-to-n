import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  TagIcon,
  CubeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";

const AVAILABLE_ICONS = ["🍼", "👶", "👕", "🥣", "🧸", "🧴", "🚲", "🚼", "🛴", "🍎", "👟", "🛏️", "📚", "🏷️"];

function resolveCategoryIcon(cat) {
  if (cat?.Icon) return cat.Icon;

  const name = (cat?.TenLoai || "").toLowerCase();

  if (name.includes("xe đạp") || name.includes("xe dap") || name.includes("bicycle") || name.includes("bike")) {
    return "🚲";
  }
  if (name.includes("xe đẩy") || name.includes("xe day") || name.includes("stroller")) {
    return "🚼";
  }
  if (name.includes("xe chòi") || name.includes("xe lắc") || name.includes("scooter")) {
    return "🛴";
  }
  if (name.includes("xe")) {
    return "🚲";
  }
  if (name.includes("sữa") || name.includes("sua") || name.includes("milk")) {
    return "🍼";
  }
  if (name.includes("bỉm") || name.includes("bim") || name.includes("tã") || name.includes("ta") || name.includes("diaper")) {
    return "👶";
  }
  if (name.includes("quần") || name.includes("áo") || name.includes("thời trang") || name.includes("váy")) {
    return "👕";
  }
  if (name.includes("đồ chơi") || name.includes("do choi") || name.includes("toy") || name.includes("gấu")) {
    return "🧸";
  }
  if (name.includes("đồ dùng") || name.includes("bình") || name.includes("núm") || name.includes("bát")) {
    return "🥣";
  }
  if (name.includes("chăm sóc") || name.includes("khăn") || name.includes("tắm") || name.includes("gội") || name.includes("kem")) {
    return "🧴";
  }
  if (name.includes("ăn dặm") || name.includes("bánh") || name.includes("kẹo") || name.includes("thực phẩm")) {
    return "🍎";
  }
  if (name.includes("giày") || name.includes("dép")) {
    return "👟";
  }
  if (name.includes("giường") || name.includes("cũi") || name.includes("nôi")) {
    return "🛏️";
  }

  return "🏷️";
}

export function CategoriesPage({ title, description }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    TenLoai: "",
    MoTa: "",
    Icon: "🚲",
  });

  useEffect(() => {
    listRecords("product-categories").then(setCategories);
    listRecords("products").then(setProducts).catch(() => []);
  }, []);

  const stats = useMemo(() => {
    const total = categories.length;
    const totalSku = products.length;
    let topCat = "—";
    let maxSku = 0;

    categories.forEach((cat) => {
      const count = products.filter(
        (p) =>
          (p.LoaiHang && p.LoaiHang.toLowerCase().trim() === (cat.TenLoai || "").toLowerCase().trim()) ||
          String(p.MaLoai) === String(cat.id)
      ).length;
      if (count > maxSku) {
        maxSku = count;
        topCat = cat.TenLoai;
      }
    });

    return { total, totalSku, topCat, maxSku };
  }, [categories, products]);

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return categories.filter((item) => {
      if (!q) return true;
      return (
        (item.TenLoai || "").toLowerCase().includes(q) ||
        (item.MoTa || "").toLowerCase().includes(q)
      );
    });
  }, [categories, query]);

  function openCreate() {
    setEditing(null);
    setFormData({ TenLoai: "", MoTa: "", Icon: "🚲" });
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditing(cat);
    setFormData({
      id: cat.id,
      TenLoai: cat.TenLoai || "",
      MoTa: cat.MoTa || "",
      Icon: resolveCategoryIcon(cat),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.TenLoai.trim()) return toast("Tên loại hàng là bắt buộc");

    try {
      const saved = await saveRecord("product-categories", formData);
      setCategories((prev) =>
        editing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]
      );
      setModalOpen(false);
      toast(editing ? "Đã cập nhật loại hàng" : "Đã thêm loại hàng mới");
    } catch (err) {
      toast(err.message || "Lỗi lưu loại hàng");
    }
  }

  async function handleDelete(id, name) {
    const inUse = products.some((p) => p.LoaiHang === name);
    if (inUse) {
      return toast(`Không thể xóa vì đang có sản phẩm thuộc danh mục "${name}"`);
    }

    if (!window.confirm(`Bạn có chắc muốn xóa loại hàng "${name}"?`)) return;
    try {
      await deleteRecord("product-categories", id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast("Đã xóa loại hàng");
    } catch (err) {
      toast(err.message || "Không thể xóa");
    }
  }

  return (
    <section aria-labelledby="categories-page-heading" className="module-specialized cat-page">
      <header className="page-header">
        <hgroup>
          <h1 id="categories-page-heading">{title}</h1>
          <p>{description || "Phân loại mặt hàng giúp quản lý kho, sắp xếp danh mục bán lẻ và phân tích doanh thu."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Thêm loại hàng mới
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng số loại hàng"
          value={String(stats.total)}
          delta="Đang hoạt động"
          icon={TagIcon}
        />
        <StatCard
          label="Tổng sản phẩm phân nhóm"
          value={String(stats.totalSku)}
          delta="Mặt hàng SKU"
          icon={CubeIcon}
        />
        <StatCard
          label="Nhóm lớn nhất"
          value={stats.topCat}
          delta={`${stats.maxSku} sản phẩm`}
          valueClass="accent"
        />
      </div>

      {/* Search */}
      <div className="cust-toolbar">
        <div className="invoice-search" style={{ flex: 1, maxWidth: 440 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên hoặc mô tả loại hàng..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="cat-card-grid" style={{ marginTop: 18 }}>
        {visible.map((cat) => {
          const skuCount = products.filter(
            (p) => (p.LoaiHang && p.LoaiHang.toLowerCase() === (cat.TenLoai || "").toLowerCase()) || String(p.MaLoai) === String(cat.id)
          ).length;
          const icon = resolveCategoryIcon(cat);

          return (
            <article key={cat.id} className="cat-card">
              <div className="cat-card-header">
                <div className="cat-card-icon" style={{ fontSize: 24 }}>{icon}</div>
                <div className="cat-card-info">
                  <h3 className="cat-card-title">{cat.TenLoai}</h3>
                  <span className="cat-card-badge">{skuCount} sản phẩm</span>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-sm-btn"
                    title="Chỉnh sửa"
                    onClick={() => openEdit(cat)}
                  >
                    <PencilSquareIcon className="ic" />
                  </button>
                  <button
                    type="button"
                    className="icon-sm-btn del"
                    title="Xóa"
                    onClick={() => handleDelete(cat.id, cat.TenLoai)}
                  >
                    <TrashIcon className="ic" />
                  </button>
                </div>
              </div>

              <p className="cat-card-desc">{cat.MoTa || "Chưa có mô tả chi tiết cho loại hàng này."}</p>

              <div className="cat-card-footer">
                <button
                  type="button"
                  className="cat-view-btn"
                  onClick={() => navigate(`/products?category=${encodeURIComponent(cat.TenLoai)}`)}
                >
                  <span>Xem sản phẩm</span>
                  <ArrowRightIcon width={14} height={14} />
                </button>
              </div>
            </article>
          );
        })}
        {!visible.length && (
          <div className="cat-empty-wrap" style={{ gridColumn: "1 / -1" }}>
            <p>Không tìm thấy loại hàng nào</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật loại hàng" : "Thêm loại hàng mới"}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="field">
          <label htmlFor="cat-name">Tên loại hàng *</label>
          <input
            id="cat-name"
            type="text"
            required
            placeholder="Ví dụ: Xe đạp trẻ em"
            value={formData.TenLoai}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({
                ...prev,
                TenLoai: val,
                Icon: resolveCategoryIcon({ TenLoai: val, Icon: prev.Icon === "🏷️" ? "" : prev.Icon }),
              }));
            }}
          />
        </div>

        <div className="field">
          <label>Biểu tượng minh họa (Icon)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 12px" }}>
            {AVAILABLE_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setFormData({ ...formData, Icon: emoji })}
                style={{
                  width: 38,
                  height: 38,
                  fontSize: 20,
                  border: formData.Icon === emoji ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                  borderRadius: 10,
                  background: formData.Icon === emoji ? "var(--primary-light)" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="cat-desc">Mô tả phân loại</label>
          <textarea
            id="cat-desc"
            rows={3}
            placeholder="Mô tả phạm vi các mặt hàng thuộc danh mục này..."
            value={formData.MoTa}
            onChange={(e) => setFormData({ ...formData, MoTa: e.target.value })}
          />
        </div>
      </Modal>
    </section>
  );
}