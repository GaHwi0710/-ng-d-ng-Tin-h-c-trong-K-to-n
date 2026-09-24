import { useState, useEffect, useMemo } from "react";
import {
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { listRecords } from "../../lib/api.js";
import { StatusBadge } from "../../components/Badge.jsx";
import { ProductImage } from "../../components/ProductImage.jsx";
import { StatCard } from "../../components/StatCard.jsx";
import { Pagination } from "../../components/Pagination.jsx";
import { EmptyState } from "../../components/EmptyState.jsx";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function InventoryPage({ title }) {
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [stockFilter, setStockFilter] = useState("Tất cả"); // "Tất cả" | "Còn hàng" | "Sắp hết" | "Hết hàng"

  useEffect(() => {
    listRecords("inventory").then(setProducts);
    listRecords("product-categories").then(setDbCategories).catch(() => []);
  }, []);

  const categories = useMemo(() => {
    const fromDb = dbCategories.map((c) => c.TenLoai).filter(Boolean);
    const fromProds = products.map((p) => p.LoaiHang).filter(Boolean);
    return ["Tất cả", ...new Set([...fromDb, ...fromProds])];
  }, [dbCategories, products]);

  const visible = products.filter((product) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (product.TenSP || "").toLowerCase().includes(q) ||
      (product.MaSP || product.id || "").toLowerCase().includes(q) ||
      (product.LoaiHang || "").toLowerCase().includes(q);
    if (!matchesQuery) return false;

    if (category !== "Tất cả" && product.LoaiHang !== category) return false;

    const stock = Number(product.stock ?? product.SoLuongTon ?? 0);
    const threshold = Number(product.SoLuongToiThieu || LOW_STOCK_THRESHOLD);
    if (stockFilter === "Hết hàng" && stock > 0) return false;
    if (stockFilter === "Sắp hết" && (stock <= 0 || stock > threshold)) return false;
    if (stockFilter === "Còn hàng" && stock <= threshold) return false;

    return true;
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query, category, stockFilter]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const outOfStockCount = products.filter((p) => Number(p.stock || 0) <= 0).length;
  const lowStockCount = products.filter((p) => {
    const s = Number(p.stock || 0);
    const thresh = Number(p.SoLuongToiThieu || LOW_STOCK_THRESHOLD);
    return s > 0 && s <= thresh;
  }).length;
  const totalValuation = products.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.GiaNhap || 0), 0);
  const now = new Date();

  return (
    <section aria-labelledby="inventory-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="inventory-heading">{title}</h1>
          <p>Kiểm tra và theo dõi số lượng tồn kho theo sản phẩm, danh mục, giá nhập và giá bán thực tế.</p>
        </hgroup>
        <time className="inventory-now" dateTime={now.toISOString()}>Cập nhật lúc {now.toLocaleString("vi-VN")}</time>
      </header>

      <div className="inventory-overview">
        <article>
          <span>Tổng mặt hàng</span>
          <strong>{products.length}</strong>
          <small>SKU đang quản lý</small>
        </article>
        <article>
          <span>Tổng số lượng tồn</span>
          <strong>{totalUnits.toLocaleString("vi-VN")}</strong>
          <small>Đơn vị sản phẩm</small>
        </article>
        <article>
          <span>Tổng giá trị tồn</span>
          <strong style={{ color: "var(--primary-dark)" }}>{money.format(totalValuation)}</strong>
          <small>Tính theo giá nhập</small>
        </article>
        <article>
          <span>Hết hàng / Sắp hết</span>
          <strong className={outOfStockCount > 0 ? "danger" : lowStockCount > 0 ? "warning" : ""}>
            {outOfStockCount} / {lowStockCount}
          </strong>
          <small>{outOfStockCount} hết hàng · {lowStockCount} sắp hết</small>
        </article>
      </div>

      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div className="stock-alert-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>⚠️ Cảnh báo tồn kho: Có <strong>{outOfStockCount}</strong> sản phẩm đã hết hàng và <strong>{lowStockCount}</strong> sản phẩm chạm ngưỡng tồn tối thiểu. Vui lòng lập đơn đặt hàng NCC bổ sung.</span>
        </div>
      )}

      {/* Filter and search toolbar */}
      <div className="inventory-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
        <label className="invoice-search" style={{ flex: 1, minWidth: 260, maxWidth: 400 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo mã SP, tên sản phẩm, danh mục..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {/* Quick status filters */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[
            { label: "Tất cả", value: "Tất cả", count: products.length },
            { label: "Còn hàng", value: "Còn hàng", count: products.length - outOfStockCount - lowStockCount },
            { label: "Sắp hết", value: "Sắp hết", count: lowStockCount },
            { label: "Hết hàng", value: "Hết hàng", count: outOfStockCount },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`filter-chip ${stockFilter === tab.value ? "active" : ""}`}
              onClick={() => setStockFilter(tab.value)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="filter-chips">
          {categories.map((item) => (
            <button
              type="button"
              className={`filter-chip ${category === item ? "active" : ""}`}
              key={item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col" style={{ width: 45 }}>STT</th>
              <th scope="col" style={{ width: 90 }}>Mã SP</th>
              <th scope="col">Tên sản phẩm</th>
              <th scope="col">Danh mục</th>
              <th scope="col" style={{ width: 70, textAlign: "center" }}>ĐVT</th>
              <th scope="col" style={{ textAlign: "right", width: 110 }}>Giá nhập</th>
              <th scope="col" style={{ textAlign: "right", width: 110 }}>Giá bán</th>
              <th scope="col" style={{ textAlign: "right", width: 100 }}>Số lượng tồn</th>
              <th scope="col" style={{ width: 140, textAlign: "center" }}>Tình trạng tồn</th>
              <th scope="col" style={{ width: 140 }}>Cập nhật gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((p, idx) => {
              const stock = Number(p.stock ?? p.SoLuongTon ?? 0);
              const thresh = Number(p.SoLuongToiThieu || LOW_STOCK_THRESHOLD);
              return (
                <tr key={p.id}>
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{(page - 1) * pageSize + idx + 1}</td>
                  <td><span className="prod-code-badge">{p.MaSP || p.id}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ProductImage src={p.HinhAnh} alt={p.TenSP} category={p.LoaiHang} size={34} />
                      <strong style={{ color: "var(--text)" }}>{p.TenSP}</strong>
                    </div>
                  </td>
                  <td>{p.LoaiHang || "—"}</td>
                  <td style={{ textAlign: "center" }}>{p.DonViTinh}</td>
                  <td style={{ textAlign: "right", color: "var(--text-soft)" }}>{money.format(p.GiaNhap || 0)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{money.format(p.GiaBan || 0)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                    {stock.toLocaleString("vi-VN")}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {stock <= 0 ? (
                      <span className="stock-status-out">⛔ Hết hàng</span>
                    ) : stock <= thresh ? (
                      <span className="stock-status-low">⚠️ Sắp hết ({stock}/{thresh})</span>
                    ) : (
                      <span className="stock-status-ok">✅ An toàn ({stock})</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-soft)" }}>
                    {p.stockUpdatedAt ? new Date(p.stockUpdatedAt).toLocaleString("vi-VN") : "Hệ thống"}
                  </td>
                </tr>
              );
            })}
            {!visible.length && (
              <tr>
                <td colSpan={10} style={{ padding: 0 }}>
                  <EmptyState
                    icon={CubeIcon}
                    title="Không có sản phẩm nào phù hợp"
                    description={`Không tìm thấy mặt hàng nào phù hợp với bộ lọc tìm kiếm.`}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {visible.length > 0 && (
        <Pagination
          currentPage={page}
          totalItems={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </section>
  );
}

