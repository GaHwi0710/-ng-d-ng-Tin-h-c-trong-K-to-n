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
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord, deleteRecord } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { StatusBadge } from "../../components/Badge.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function ProductsPage({ title, description }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get("category");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState(urlCategory || "all");
  const [stockStatus, setStockStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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
  });

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
    const lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 10).length;
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
  }, [products, query, selectedCat, stockStatus, categories]);

  function handleSelectCat(cat) {
    setSelectedCat(cat);
    if (cat === "all") {
      searchParams.delete("category");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
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
    });
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
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formData.TenSP.trim()) return toast("Tên sản phẩm là bắt buộc");
    if (!formData.MaSP.trim()) return toast("Mã sản phẩm là bắt buộc");
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
        MaLoai: matchedCat?.id || formData.MaLoai,
        LoaiHang: matchedCat?.TenLoai || formData.LoaiHang,
        GiaNhap: Number(formData.GiaNhap) || 0,
        GiaBan: Number(formData.GiaBan) || 0,
        stock: Number(formData.stock) || 0,
      };
      const saved = await saveRecord("products", payload);
      const completeSaved = {
        ...saved,
        MaLoai: payload.MaLoai,
        LoaiHang: payload.LoaiHang,
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

  async function handleDelete(id, name) {
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm "${name}"?`)) return;
    try {
      await deleteRecord("products", id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast("Đã xóa sản phẩm");
    } catch (err) {
      toast(err.message || "Không thể xóa");
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
                    <div className="prod-name-cell">
                      <strong className="prod-title">{p.TenSP}</strong>
                      <span className="prod-cat-pill">
                        {p.LoaiHang ||
                          categories.find((c) => String(c.id) === String(p.MaLoai))?.TenLoai ||
                          "Khác"}
                      </span>
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
                    <div className="prod-stock-cell">
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <strong style={{ color: st <= 0 ? "var(--danger)" : st <= 10 ? "var(--warn)" : "var(--success)" }}>
                          {st} {p.DonViTinh}
                        </strong>
                        <span style={{ color: "var(--text-faint)", fontSize: 11 }}>
                          {st <= 0 ? "Hết" : st <= 10 ? "Ít" : "Sẵn"}
                        </span>
                      </div>
                      <div className="prod-stock-bar-wrap">
                        <div
                          className={`prod-stock-bar ${st <= 0 ? "bar-out" : st <= 10 ? "bar-low" : "bar-ok"}`}
                          style={{ width: `${Math.min(100, (st / 150) * 100)}%` }}
                        />
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
            <label htmlFor="p-code">Mã sản phẩm *</label>
            <input
              id="p-code"
              type="text"
              required
              value={formData.MaSP}
              onChange={(e) => setFormData({ ...formData, MaSP: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="p-cat">Loại hàng / Danh mục *</label>
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
          <label htmlFor="p-name">Tên sản phẩm *</label>
          <input
            id="p-name"
            type="text"
            required
            placeholder="Ví dụ: Xe đạp 3 bánh trẻ em"
            value={formData.TenSP}
            onChange={(e) => setFormData({ ...formData, TenSP: e.target.value })}
          />
        </div>

        <div className="form-grid">
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
          <div className="field">
            <label htmlFor="p-stock">Số lượng tồn kho</label>
            <input
              id="p-stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
          </div>
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
            <label htmlFor="p-hsd">Hạn sử dụng</label>
            <input
              id="p-hsd"
              type="date"
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
      </Modal>
    </section>
  );
}