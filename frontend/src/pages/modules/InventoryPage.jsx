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
    const matchesQuery =
      !query ||
      (product.TenSP || "").toLowerCase().includes(query.toLowerCase()) ||
      (product.MaSP || product.id || "").toLowerCase().includes(query.toLowerCase()) ||
      (product.LoaiHang || "").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "Tất cả" || product.LoaiHang === category);
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setPage(1);
  }, [query, category]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page, pageSize]);

  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock || 0) <= LOW_STOCK_THRESHOLD).length;
  const now = new Date();

  return (
    <section aria-labelledby="inventory-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="inventory-heading">{title}</h1>
          <p>Theo dõi số lượng tồn kho theo sản phẩm, danh mục và thời điểm cập nhật.</p>
        </hgroup>
        <time className="inventory-now" dateTime={now.toISOString()}>Cập nhật lúc {now.toLocaleString("vi-VN")}</time>
      </header>

      <div className="inventory-overview"><article><span>Tổng mặt hàng</span><strong>{products.length}</strong><small>SKU đang quản lý</small></article><article><span>Tổng số lượng tồn</span><strong>{totalUnits.toLocaleString("vi-VN")}</strong><small>Đơn vị sản phẩm</small></article><article><span>Sắp hết hàng</span><strong className="warning">{lowStock}</strong><small>Tồn kho không quá {LOW_STOCK_THRESHOLD}</small></article></div>

      {lowStock > 0 && (
        <div className="stock-alert-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>⚠️ Cảnh báo: Có <strong>{lowStock}</strong> sản phẩm sắp hết hoặc đã hết hàng (tồn kho ≤ {LOW_STOCK_THRESHOLD}). Vui lòng kiểm tra và đặt hàng bổ sung.</span>
        </div>
      )}

      <div className="inventory-toolbar"><label className="invoice-search"><MagnifyingGlassIcon aria-hidden="true" /><input type="search" placeholder="Tìm mã hoặc tên sản phẩm..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-chips">{categories.map((item) => <button type="button" className={`filter-chip ${category === item ? "active" : ""}`} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th scope="col">Mã SP</th>
              <th scope="col">Tên sản phẩm</th>
              <th scope="col">Loại</th>
              <th scope="col">ĐVT</th>
              <th scope="col">Tồn kho</th>
              <th scope="col">Cập nhật gần nhất</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((p) => {
              const stock = Number(p.stock || 0);
              return (
              <tr key={p.id}>
                <td><span className="prod-code-badge">{p.MaSP || p.id}</span></td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ProductImage src={p.HinhAnh} alt={p.TenSP} category={p.LoaiHang} size={34} />
                    <strong>{p.TenSP}</strong>
                  </div>
                </td>
                <td>{p.LoaiHang || "—"}</td>
                <td>{p.DonViTinh}</td>
                <td>
                  {stock <= 0 ? (
                    <span className="stock-status-out">⛔ Hết hàng</span>
                  ) : stock <= 10 ? (
                    <span className="stock-status-low">⚠️ Sắp hết ({stock})</span>
                  ) : (
                    <span className="stock-status-ok">✅ Còn hàng ({stock})</span>
                  )}
                </td>
                <td>{p.stockUpdatedAt ? new Date(p.stockUpdatedAt).toLocaleString("vi-VN") : "Chưa có mốc thời gian"}</td>
                <td><StatusBadge status={p.TrangThai} /></td>
              </tr>
            )})}
            {!visible.length && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <EmptyState
                    icon={CubeIcon}
                    title="Không có sản phẩm nào phù hợp"
                    description={`Không tìm thấy mặt hàng nào trong danh mục "${category}".`}
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

