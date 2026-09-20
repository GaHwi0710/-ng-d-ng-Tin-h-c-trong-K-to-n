import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon,
  PhotoIcon,
  CalendarDaysIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { StatusBadge } from "../../components/Badge.jsx";
import ConfirmDialog from "../../components/ConfirmDialog";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const CATEGORY_ICONS = {
  "Sữa": "🍼",
  "Bỉm/tã": "👶",
  "Quần áo": "👕",
  "Đồ dùng": "🥣",
  "Đồ chơi": "🧸",
  "Chăm sóc": "🧴",
};

export function getCategoryIcon(catName) {
  if (!catName) return "📦";
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (catName.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return "📦";
}

function compressAndReadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WEBP)"));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        resolve(compressedBase64);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProductsPage({ title, description }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState(urlCategory || "all");
  const [stockStatus, setStockStatus] = useState("all");
  const [prodStatus, setProdStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, name: "" });

  const [formData, setFormData] = useState({
    MaSP: "",
    TenSP: "",
    MaLoai: "",
    LoaiHang: "",
    DonViTinh: "Cái",
    GiaNhap: 0,
    GiaBan: 0,
    HanSuDung: "",
    TrangThai: "Đang bán",
    stock: 0,
    HinhAnh: "",
  });

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndReadImage(file);
      if (base64) {
        setFormData((prev) => ({ ...prev, HinhAnh: base64 }));
        toast("Đã tải ảnh lên thành công");
      }
    } catch (err) {
      toast(err.message || "Không thể đọc file ảnh");
    }
    e.target.value = "";
  }

  useEffect(() => {
    listRecords("products").then(setProducts);
    listRecords("product-categories").then(setCategories).catch(() => []);
  }, []);

  useEffect(() => {
    if (urlCategory) {
      setSelectedCat(urlCategory);
    } else {
      setSelectedCat("all");
    }
  }, [urlCategory]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.TrangThai !== "Ngừng bán").length;
    const lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= LOW_STOCK_THRESHOLD).length;
    const outOfStock = products.filter((p) => Number(p.stock || 0) <= 0).length;
    return { total, active, lowStock, outOfStock };
  }, [products]);

  const catList = useMemo(() => {
    const fromApi = categories.map((c) => c.TenLoai).filter(Boolean);
    const fromProds = products.map((p) => p.LoaiHang).filter(Boolean);
    return ["all", ...new Set([...fromApi, ...fromProds])];
  }, [categories, products]);

  const visible = useMemo(() => {
    return products.filter((item) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        (item.TenSP || "").toLowerCase().includes(q) ||
        (item.MaSP || item.id || "").toLowerCase().includes(q) ||
        (item.LoaiHang || "").toLowerCase().includes(q);

      if (!matchQuery) return false;

      if (prodStatus !== "all" && item.TrangThai !== prodStatus) return false;

      if (selectedCat !== "all") {
        const itemCatName = (item.LoaiHang || "").toLowerCase().trim();
        const targetCatName = selectedCat.toLowerCase().trim();
        const matchByName = itemCatName === targetCatName;
        const matchById = String(item.MaLoai) === String(selectedCat);
        const targetCatObj = categories.find(
          (c) =>
            c.TenLoai?.toLowerCase().trim() === targetCatName ||
            String(c.id) === String(selectedCat)
        );
        const matchByCatObj =
          targetCatObj &&
          (String(item.MaLoai) === String(targetCatObj.id) ||
            itemCatName === targetCatObj.TenLoai?.toLowerCase().trim());

        if (!matchByName && !matchById && !matchByCatObj) return false;
      }

      const st = Number(item.stock || 0);
      if (stockStatus === "low" && (st <= 0 || st > 10)) return false;
      if (stockStatus === "out" && st > 0) return false;
      if (stockStatus === "in" && st <= 10) return false;

      return true;
    });
  }, [products, query, selectedCat, stockStatus, prodStatus, categories]);

  function handleSelectCat(cat) {
    setSelectedCat(cat);
    if (cat === "all") {
      searchParams.delete("category");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
  }

  function openDetail(product) {
    setViewingProduct(product);
    setDetailModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    const defaultCat =
      (selectedCat !== "all"
        ? categories.find((c) => c.TenLoai?.toLowerCase().trim() === selectedCat.toLowerCase().trim())
        : null) || categories[0];
    setFormData({
      MaSP: `SP${String(products.length + 1).padStart(3, "0")}`,
      TenSP: "",
      MaLoai: defaultCat?.id || "",
      LoaiHang: defaultCat?.TenLoai || "",
      DonViTinh: "Cái",
      GiaNhap: 0,
      GiaBan: 0,
      HanSuDung: "",
      TrangThai: "Đang bán",
      stock: 0,
      HinhAnh: "",
    });
    setShowUrlInput(false);
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    const matchedCat = categories.find(
      (c) =>
        String(c.id) === String(product.MaLoai) ||
        (c.TenLoai && product.LoaiHang && c.TenLoai.toLowerCase().trim() === product.LoaiHang.toLowerCase().trim())
    );
    setFormData({
      id: product.id,
      MaSP: product.MaSP || product.id,
      TenSP: product.TenSP || "",
      MaLoai: matchedCat?.id || product.MaLoai || "",
      LoaiHang: matchedCat?.TenLoai || product.LoaiHang || "",
      DonViTinh: product.DonViTinh || "Cái",
      GiaNhap: product.GiaNhap || 0,
      GiaBan: product.GiaBan || 0,
      HanSuDung: product.HanSuDung || "",
      TrangThai: product.TrangThai || "Đang bán",
      stock: product.stock || 0,
      HinhAnh: product.HinhAnh || "",
    });
    setShowUrlInput(Boolean(product.HinhAnh && product.HinhAnh.startsWith("http")));
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.TenSP.trim()) return toast("Tên sản phẩm là bắt buộc");
    if (!formData.MaSP.trim()) return toast("Mã sản phẩm là bắt buộc");
    if (!formData.HanSuDung) {
      return toast("Vui lòng chọn Hạn sử dụng cho sản phẩm (Bắt buộc)");
    }
    if (Number(formData.GiaNhap) < 0 || Number(formData.GiaBan) < 0) {
      return toast("Giá nhập và giá bán không được là số âm");
    }

    const matchedCat = categories.find(
      (c) =>
        String(c.id) === String(formData.MaLoai) ||
        (c.TenLoai && formData.LoaiHang && c.TenLoai.toLowerCase().trim() === formData.LoaiHang.toLowerCase().trim())
    ) || categories[0];

    try {
      const payload = {
        ...formData,
        HinhAnh: formData.HinhAnh ? formData.HinhAnh.trim() : "",
        MaLoai: matchedCat?.id || formData.MaLoai,
        LoaiHang: matchedCat?.TenLoai || formData.LoaiHang,
        GiaNhap: Number(formData.GiaNhap) || 0,
        GiaBan: Number(formData.GiaBan) || 0,
      };
      delete payload.stock;
      const saved = await saveRecord("products", payload);
      const completeSaved = {
        ...saved,
        MaLoai: payload.MaLoai,
        LoaiHang: payload.LoaiHang,
        HinhAnh: payload.HinhAnh,
      };
      setProducts((prev) =>
        editing
          ? prev.map((item) => (item.id === completeSaved.id ? completeSaved : item))
          : [completeSaved, ...prev]
      );
      setModalOpen(false);
      toast(editing ? "Đã cập nhật sản phẩm thành công" : "Đã thêm sản phẩm mới thành công");
    } catch (err) {
      toast(err.message || "Lỗi lưu sản phẩm");
    }
  }

  function handleDelete(id, name) {
    setConfirmDialog({ open: true, id, name });
  }

  async function executeDelete() {
    const { id, name } = confirmDialog;
    setConfirmDialog({ open: false, id: null, name: "" });
    try {
      const res = await deleteRecord("products", id);
      if (res?.softDeleted || res?.status === "Ngừng bán") {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, TrangThai: "Ngừng bán" } : p));
        toast(`Sản phẩm "${name}" đã chuyển sang trạng thái ngừng bán do có chứng từ phát sinh`);
      } else {
        setProducts(prev => prev.filter(p => p.id !== id));
        toast("Đã xóa sản phẩm thành công");
      }
    } catch (err) {
      toast(err?.message || "Lỗi khi xóa");
    }
  }

  const marginPercent =
    formData.GiaBan > 0
      ? (((formData.GiaBan - formData.GiaNhap) / formData.GiaBan) * 100).toFixed(0)
      : 0;

  return (
    <section aria-labelledby="products-page-heading" className="module-specialized prod-page">
      <header className="page-header">
        <hgroup>
          <h1 id="products-page-heading">{title}</h1>
          <p>{description || "Quản lý danh mục sản phẩm, bảng giá nhập - bán, theo dõi tồn kho và định mức."}</p>
        </hgroup>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          <PlusIcon className="btn-icon" aria-hidden="true" />
          Thêm sản phẩm mới
        </button>
      </header>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Tổng mặt hàng (SKU)"
          value={String(stats.total)}
          delta={`${stats.active} đang kinh doanh`}
          icon={CubeIcon}
        />
        <StatCard
          label="Sắp hết hàng (≤ 10)"
          value={String(stats.lowStock)}
          delta="Cần đặt hàng bổ sung"
          valueClass="warning"
          icon={ExclamationTriangleIcon}
        />
        <StatCard
          label="Hết hàng (0 tồn)"
          value={String(stats.outOfStock)}
          delta="Tạm ngưng phục vụ"
          valueClass="danger"
          icon={XCircleIcon}
        />
      </div>

      {/* Toolbars */}
      <div className="prod-toolbar-stack">
        <div className="cust-toolbar" style={{ flexWrap: "wrap" }}>
          <div className="invoice-search" style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
            <MagnifyingGlassIcon aria-hidden="true" />
            <input
              type="search"
              placeholder="Tìm theo mã SP, tên mặt hàng hoặc phân loại..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-soft)" }}>Tồn kho:</span>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "#fff",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="in">Còn nhiều hàng (&gt;10)</option>
              <option value="low">Sắp hết hàng (1-10)</option>
              <option value="out">Đã hết hàng (0)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-soft)" }}>Trạng thái:</span>
            <select
              value={prodStatus}
              onChange={(e) => setProdStatus(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "#fff",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đang bán">Đang bán</option>
              <option value="Ngừng bán">Ngừng bán</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        <div className="filter-chips" style={{ marginTop: 10 }}>
          {catList.map((cat) => {
            const isActive =
              cat === "all"
                ? selectedCat === "all"
                : selectedCat.toLowerCase().trim() === cat.toLowerCase().trim();
            return (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${isActive ? "active" : ""}`}
                onClick={() => handleSelectCat(cat)}
              >
                {cat === "all" ? "Tất cả danh mục" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 45 }}>STT</th>
              <th style={{ width: 100 }}>Mã SP</th>
              <th>Tên sản phẩm &amp; Danh mục</th>
              <th style={{ width: 80 }}>ĐVT</th>
              <th style={{ textAlign: "right", width: 120 }}>Giá nhập</th>
              <th style={{ textAlign: "right", width: 130 }}>Giá bán</th>
              <th style={{ textAlign: "center", width: 90 }}>Lợi nhuận</th>
              <th style={{ width: 140 }}>Tồn kho</th>
              <th style={{ width: 110, textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: 90, textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p, idx) => {
              const st = Number(p.stock || 0);
              const margin =
                p.GiaBan > 0
                  ? (((p.GiaBan - p.GiaNhap) / p.GiaBan) * 100).toFixed(0)
                  : 0;

              return (
                <tr key={p.id} className="prod-row">
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <span className="prod-code-badge">{p.MaSP || p.id}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {p.HinhAnh ? (
                        <img
                          src={p.HinhAnh}
                          alt={p.TenSP}
                          onError={(e) => {
                            e.target.style.display = "none";
                            if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                          }}
                          style={{
                            width: 42,
                            height: 42,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid var(--border, #e2e8f0)",
                            flexShrink: 0,
                            cursor: "pointer",
                          }}
                          onClick={() => openDetail(p)}
                        />
                      ) : null}
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          background: "var(--surface-sunken, #f1f5f9)",
                          display: p.HinhAnh ? "none" : "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          flexShrink: 0,
                          border: "1px solid var(--border, #e2e8f0)",
                          cursor: "pointer",
                        }}
                        onClick={() => openDetail(p)}
                      >
                        {getCategoryIcon(p.LoaiHang || "")}
                      </div>
                      <div className="prod-name-cell">
                        <strong
                          className="prod-title"
                          onClick={() => openDetail(p)}
                          style={{ cursor: "pointer" }}
                          title="Bấm để xem chi tiết sản phẩm"
                        >
                          {p.TenSP}
                        </strong>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                          <span className="prod-cat-pill">
                            {p.LoaiHang ||
                              categories.find((c) => String(c.id) === String(p.MaLoai))?.TenLoai ||
                              "Khác"}
                          </span>
                          {p.HanSuDung && (
                            <span style={{ fontSize: 11, color: "var(--text-soft)", background: "var(--surface-sunken, #f1f5f9)", padding: "1px 6px", borderRadius: 4, fontWeight: 500 }}>
                              HSD: {new Date(p.HanSuDung).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-soft)", fontWeight: 500 }}>{p.DonViTinh}</td>
                  <td style={{ textAlign: "right", color: "var(--text-soft)", fontSize: 13 }}>
                    {money.format(p.GiaNhap || 0)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong style={{ color: "var(--primary-dark)", fontSize: 13.5 }}>
                      {money.format(p.GiaBan || 0)}
                    </strong>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`prod-margin-tag ${Number(margin) >= 25 ? "high" : "normal"}`}>
                      +{margin}%
                    </span>
                  </td>
                  <td>
                    <div className="prod-stock-cell" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <strong style={{ fontSize: 13, color: "var(--text-dark)" }}>
                        {st} {p.DonViTinh}
                      </strong>
                      <div>
                        {st <= 0 ? (
                          <span className="badge badge-danger">⚠️ Hết hàng</span>
                        ) : st <= 10 ? (
                          <span className="badge badge-amber">Sắp hết</span>
                        ) : (
                          <span className="badge badge-green">Còn hàng</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <StatusBadge status={p.TrangThai} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="row-actions" style={{ justifyContent: "center" }}>
                      <button
                        type="button"
                        className="icon-sm-btn"
                        title="Xem chi tiết sản phẩm"
                        onClick={() => openDetail(p)}
                      >
                        <EyeIcon className="ic" />
                      </button>
                      <button
                        type="button"
                        className="icon-sm-btn"
                        title="Chỉnh sửa"
                        onClick={() => openEdit(p)}
                      >
                        <PencilSquareIcon className="ic" />
                      </button>
                      <button
                        type="button"
                        className="icon-sm-btn del"
                        title="Xóa"
                        onClick={() => handleDelete(p.id, p.TenSP)}
                      >
                        <TrashIcon className="ic" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "var(--text-faint)", padding: 36 }}>
                  Không tìm thấy sản phẩm nào thuộc phân loại "{selectedCat === "all" ? "Tất cả" : selectedCat}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        title={editing ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="p-code">Mã sản phẩm <span className="required-star">*</span></label>
            <input
              id="p-code"
              type="text"
              required
              value={formData.MaSP}
              onChange={(e) => setFormData({ ...formData, MaSP: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-cat">Loại hàng / Danh mục <span className="required-star">*</span></label>
            <select
              id="p-cat"
              required
              value={
                formData.MaLoai ||
                categories.find(
                  (c) =>
                    c.TenLoai?.toLowerCase().trim() ===
                    (formData.LoaiHang || "").toLowerCase().trim()
                )?.id ||
                ""
              }
              onChange={(e) => {
                const catId = e.target.value;
                const found = categories.find((c) => String(c.id) === String(catId));
                setFormData((prev) => ({
                  ...prev,
                  MaLoai: catId,
                  LoaiHang: found?.TenLoai || "",
                }));
              }}
            >
              <option value="">-- Chọn loại hàng --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.TenLoai}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="p-name">Tên sản phẩm <span className="required-star">*</span></label>
          <input
            id="p-name"
            type="text"
            required
            placeholder="Ví dụ: Xe đạp 3 bánh trẻ em"
            value={formData.TenSP}
            onChange={(e) => setFormData({ ...formData, TenSP: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="p-dvt">Đơn vị tính</label>
          <select
            id="p-dvt"
            value={formData.DonViTinh}
            onChange={(e) => setFormData({ ...formData, DonViTinh: e.target.value })}
          >
            <option value="Chiếc">Chiếc</option>
            <option value="Cái">Cái</option>
            <option value="Hộp">Hộp</option>
            <option value="Gói">Gói</option>
            <option value="Bịch">Bịch</option>
            <option value="Bộ">Bộ</option>
            <option value="Chai">Chai</option>
            <option value="Lon">Lon</option>
          </select>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="p-inprice">Giá nhập (VNĐ)</label>
            <input
              id="p-inprice"
              type="number"
              min="0"
              step="1000"
              value={formData.GiaNhap}
              onChange={(e) => setFormData({ ...formData, GiaNhap: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-outprice">
              Giá bán (VNĐ)
              {formData.GiaBan > 0 && (
                <span style={{ float: "right", color: "var(--success)", fontWeight: 600 }}>
                  Lãi: +{marginPercent}%
                </span>
              )}
            </label>
            <input
              id="p-outprice"
              type="number"
              min="0"
              step="1000"
              value={formData.GiaBan}
              onChange={(e) => setFormData({ ...formData, GiaBan: e.target.value })}
            />
          </div>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="p-hsd">
              Hạn sử dụng <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
            </label>
            <input
              id="p-hsd"
              type="date"
              required
              value={formData.HanSuDung}
              onChange={(e) => setFormData({ ...formData, HanSuDung: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-status">Trạng thái kinh doanh</label>
            <select
              id="p-status"
              value={formData.TrangThai}
              onChange={(e) => setFormData({ ...formData, TrangThai: e.target.value })}
            >
              <option value="Đang bán">Đang bán</option>
              <option value="Ngừng bán">Ngừng bán</option>
            </select>
          </div>
        </div>

        {/* Hình ảnh sản phẩm (Tải từ máy tính hoặc dán link) */}
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ margin: 0, fontWeight: 600 }}>
              Hình ảnh sản phẩm <small style={{ color: "var(--text-faint)", fontWeight: "normal" }}>(tùy chọn)</small>
            </label>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              style={{ background: "none", border: "none", color: "var(--primary-dark, #0f766e)", fontSize: 12, cursor: "pointer", textDecoration: "underline", fontWeight: 500 }}
            >
              {showUrlInput ? "Ẩn nhập link URL" : "Hoặc dán link URL ảnh"}
            </button>
          </div>

          {formData.HinhAnh ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px", background: "var(--surface-sunken, #f8fafc)", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
              <img
                src={formData.HinhAnh}
                alt="Ảnh sản phẩm"
                onError={(e) => { e.target.style.display = "none"; }}
                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", background: "#fff" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: "#fff",
                    border: "1px solid var(--border, #cbd5e1)",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-dark, #334155)",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                >
                  <ArrowUpTrayIcon style={{ width: 16, height: 16, color: "var(--primary, #0f766e)" }} />
                  Đổi ảnh khác từ máy tính
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, HinhAnh: "" })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 6px",
                    background: "none",
                    border: "none",
                    color: "var(--danger, #ef4444)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  ✕ Xóa ảnh này (dùng biểu tượng mặc định)
                </button>
              </div>
            </div>
          ) : (
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "22px 16px",
                borderRadius: 8,
                border: "2px dashed var(--border, #cbd5e1)",
                background: "var(--surface-sunken, #f8fafc)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary, #0f766e)";
                e.currentTarget.style.background = "#f0fdfa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border, #cbd5e1)";
                e.currentTarget.style.background = "var(--surface-sunken, #f8fafc)";
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#e6f4f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <ArrowUpTrayIcon style={{ width: 22, height: 22, color: "var(--primary, #0f766e)" }} />
              </div>
              <strong style={{ fontSize: 13.5, color: "var(--primary-dark, #0f766e)" }}>
                Bấm để chọn ảnh từ máy tính / điện thoại
              </strong>
              <small style={{ color: "var(--text-faint)", marginTop: 4 }}>
                Hỗ trợ file PNG, JPG, JPEG, WEBP (tự động tối ưu dung lượng)
              </small>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          )}

          {showUrlInput && (
            <div style={{ marginTop: 8 }}>
              <input
                id="p-img"
                type="url"
                placeholder="https://... hoặc dán link URL ảnh nếu muốn"
                value={formData.HinhAnh || ""}
                onChange={(e) => setFormData({ ...formData, HinhAnh: e.target.value })}
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Xem chi tiết sản phẩm */}
      {viewingProduct && (
        <Modal
          open={detailModalOpen}
          title="Thông tin chi tiết sản phẩm"
          onClose={() => setDetailModalOpen(false)}
        >
          {/* Header Card */}
          <div style={{ display: "flex", gap: 16, alignItems: "center", paddingBottom: 16, borderBottom: "1px solid var(--border, #e2e8f0)" }}>
            {viewingProduct.HinhAnh ? (
              <img
                src={viewingProduct.HinhAnh}
                alt={viewingProduct.TenSP}
                onError={(e) => {
                  e.target.style.display = "none";
                  if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                }}
                style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border, #e2e8f0)", flexShrink: 0 }}
              />
            ) : null}
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 12,
                background: "var(--surface-sunken, #f1f5f9)",
                display: viewingProduct.HinhAnh ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 42,
                border: "1px solid var(--border, #e2e8f0)",
                flexShrink: 0,
              }}
            >
              {getCategoryIcon(viewingProduct.LoaiHang || "")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                <span className="prod-code-badge" style={{ fontSize: 12, fontWeight: 700 }}>
                  {viewingProduct.MaSP || viewingProduct.id}
                </span>
                <span className="prod-cat-pill">
                  {viewingProduct.LoaiHang || "Sản phẩm"}
                </span>
                <StatusBadge status={viewingProduct.TrangThai} />
              </div>
              <h2 style={{ margin: "2px 0 6px", fontSize: 17, color: "var(--text-dark, #0f172a)", fontWeight: 700, lineHeight: 1.3 }}>
                {viewingProduct.TenSP}
              </h2>
              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Đơn vị tính: <strong style={{ color: "var(--text-dark)" }}>{viewingProduct.DonViTinh || "Cái"}</strong>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
            {/* Giá & Lợi nhuận */}
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
              <div style={{ fontSize: 12, color: "var(--text-soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                💰 Giá bán &amp; Lợi nhuận
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "var(--text-soft)" }}>Giá bán lẻ:</span>
                <strong style={{ fontSize: 14.5, color: "var(--primary-dark, #0f766e)" }}>
                  {money.format(viewingProduct.GiaBan || 0)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "var(--text-soft)" }}>Giá nhập vốn:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dark)" }}>
                  {money.format(viewingProduct.GiaNhap || 0)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px dashed var(--border, #cbd5e1)" }}>
                <span style={{ fontSize: 13, color: "var(--text-soft)" }}>Lãi gộp:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--success, #10b981)" }}>
                  +{money.format(Math.max(0, (viewingProduct.GiaBan || 0) - (viewingProduct.GiaNhap || 0)))}
                  {" "}
                  (+{viewingProduct.GiaBan > 0 ? (((viewingProduct.GiaBan - viewingProduct.GiaNhap) / viewingProduct.GiaBan) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>

            {/* Quản lý kho */}
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
              <div style={{ fontSize: 12, color: "var(--text-soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                📦 Tình trạng tồn kho
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "var(--text-soft)" }}>Tồn hiện tại:</span>
                <strong style={{ fontSize: 15, color: Number(viewingProduct.stock || 0) <= 0 ? "var(--danger)" : Number(viewingProduct.stock || 0) <= LOW_STOCK_THRESHOLD ? "var(--warn)" : "var(--success)" }}>
                  {viewingProduct.stock || 0} {viewingProduct.DonViTinh}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-faint)", marginBottom: 4 }}>
                <span>Đánh giá kho:</span>
                <span style={{ fontWeight: 500, color: Number(viewingProduct.stock || 0) <= 0 ? "var(--danger)" : Number(viewingProduct.stock || 0) <= LOW_STOCK_THRESHOLD ? "var(--warn)" : "var(--success)" }}>
                  {Number(viewingProduct.stock || 0) <= 0 ? "⚠️ Hết hàng" : Number(viewingProduct.stock || 0) <= LOW_STOCK_THRESHOLD ? "⚡ Cận mức tối thiểu" : "✓ Sẵn sàng bán"}
                </span>
              </div>
              <div className="prod-stock-bar-wrap" style={{ marginTop: 6 }}>
                <div
                  className={`prod-stock-bar ${Number(viewingProduct.stock || 0) <= 0 ? "bar-out" : Number(viewingProduct.stock || 0) <= LOW_STOCK_THRESHOLD ? "bar-low" : "bar-ok"}`}
                  style={{ width: `${Math.min(100, ((viewingProduct.stock || 0) / 150) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Hạn sử dụng & Cảnh báo date */}
          <div style={{ marginTop: 12, background: "var(--surface-sunken, #f8fafc)", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border, #e2e8f0)" }}>
            <div style={{ fontSize: 12, color: "var(--text-soft)", textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
              📅 Quản lý Hạn sử dụng (Date)
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-dark)" }}>
                  {viewingProduct.HanSuDung ? new Date(viewingProduct.HanSuDung).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                </span>
              </div>
              {(() => {
                if (!viewingProduct.HanSuDung) return null;
                const diffDays = Math.ceil((new Date(viewingProduct.HanSuDung) - new Date()) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                  return <span className="badge badge-danger" style={{ fontWeight: 700 }}>⛔ Đã hết hạn ({Math.abs(diffDays)} ngày trước)</span>;
                } else if (diffDays <= 30) {
                  return <span className="badge badge-amber" style={{ fontWeight: 700 }}>⚠️ Cận date (Còn {diffDays} ngày)</span>;
                }
                return <span className="badge badge-green" style={{ fontWeight: 700 }}>✓ Còn hạn tốt (Còn {diffDays} ngày)</span>;
              })()}
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setDetailModalOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setDetailModalOpen(false);
                openEdit(viewingProduct);
              }}
            >
              <PencilSquareIcon className="btn-icon" aria-hidden="true" />
              Chỉnh sửa sản phẩm
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title="Xác nhận xóa sản phẩm"
        itemName={confirmDialog.name}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDialog({ open: false, id: null, name: "" })}
      />
    </section>
  );
}