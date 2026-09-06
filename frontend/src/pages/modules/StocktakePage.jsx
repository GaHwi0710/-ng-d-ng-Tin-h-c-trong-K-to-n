import { useState, useEffect, useMemo } from "react";
import {
  CheckCircleIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { listRecords, saveRecord } from "../../lib/api.js";
import { toast } from "../../components/Toast.jsx";
import { StatCard } from "../../components/StatCard.jsx";

export function StocktakePage({ title }) {
  const [products, setProducts] = useState([]);
  const [stocktakes, setStocktakes] = useState([]);
  const [actual, setActual] = useState({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    listRecords("products").then(setProducts);
    listRecords("stocktakes").then(setStocktakes).catch(() => setStocktakes([]));
  }, []);

  const stats = useMemo(() => {
    let match = 0;
    let deficit = 0;
    let surplus = 0;
    products.forEach((p) => {
      const sys = Number(p.stock || 0);
      const real = Number(actual[p.id] ?? sys);
      const diff = real - sys;
      if (diff === 0) match++;
      else if (diff < 0) deficit++;
      else surplus++;
    });
    return { total: products.length, match, deficit, surplus };
  }, [products, actual]);

  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => !q || p.TenSP.toLowerCase().includes(q) || (p.MaSP || "").toLowerCase().includes(q));
  }, [products, query]);

  async function submit() {
    try {
      const saved = await saveRecord("stocktakes", {
        note: "Kiểm kê định kỳ",
        NgayKiemKe: new Date().toISOString().slice(0, 10),
        items: products.map((product) => ({
          productId: product.id,
          sys: Number(product.stock || 0),
          actual: Number(actual[product.id] ?? product.stock ?? 0),
        })),
      });
      setStocktakes((current) => [saved, ...current]);
      toast("Đã lưu kiểm kê và điều chỉnh lại tồn kho");
    } catch (error) {
      toast(error.message);
    }
  }

  function printStocktake(record) {
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) return;
    const lines = (record.details || []).map((line, index) => `<tr><td>${index + 1}</td><td>${line.MaSPCode || line.MaSP || ""}</td><td>${line.TenSP || ""}</td><td>${line.SoLuongHeThong || 0}</td><td>${line.SoLuongThucTe || 0}</td><td>${line.ChenhLech > 0 ? "+" : ""}${line.ChenhLech || 0}</td></tr>`).join("");
    printWindow.document.write(`<html><head><title>${record.MaKK || record.id}</title><style>body{font-family:Arial;margin:36px;color:#1f2a37}h1{text-align:center}p{text-align:center;color:#6b7680}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #999;padding:8px}th{background:#e7f0ee}td:first-child{text-align:center}</style></head><body><h1>PHIẾU KIỂM KÊ KHO</h1><p>${record.MaKK || record.id} · ${record.NgayKiemKe || ""} · ${new Date(record.createdAt || Date.now()).toLocaleString("vi-VN")}</p><table><thead><tr><th>STT</th><th>Mã hàng</th><th>Sản phẩm</th><th>Tồn hệ thống</th><th>Thực tế</th><th>Chênh lệch</th></tr></thead><tbody>${lines}</tbody></table><p style="margin-top:42px">Người lập phiếu ____________________ &nbsp;&nbsp;&nbsp; Người kiểm kê ____________________</p></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <section aria-labelledby="stocktake-heading" className="module-specialized stocktake-page">
      <header className="page-header">
        <hgroup>
          <h1 id="stocktake-heading">{title}</h1>
          <p>Đối chiếu tồn kho trên hệ thống với số lượng thực tế tại quầy và kho chứa.</p>
        </hgroup>
        <button
          className="btn btn-primary"
          type="button"
          onClick={submit}
        >
          <CheckCircleIcon className="btn-icon" aria-hidden="true" />
          Lưu &amp; Cập nhật tồn kho
        </button>
      </header>

      {/* Discrepancy stats */}
      <div className="stats-grid">
        <StatCard
          label="Mặt hàng cần kiểm"
          value={String(stats.total)}
          delta={`${stats.match} khớp hoàn toàn`}
          icon={CubeIcon}
        />
        <StatCard
          label="Lệch âm (Thất thoát)"
          value={String(stats.deficit)}
          delta="Cần xác minh nguyên nhân"
          valueClass="danger"
          icon={ExclamationTriangleIcon}
        />
        <StatCard
          label="Lệch dương (Thừa hàng)"
          value={String(stats.surplus)}
          delta="Thừa so với hệ thống"
          valueClass="positive"
        />
      </div>

      {/* Toolbar */}
      <div className="cust-toolbar" style={{ marginTop: 14 }}>
        <div className="invoice-search" style={{ flex: 1, maxWidth: 440 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            type="search"
            placeholder="Tìm theo tên sản phẩm, mã SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-shell" style={{ marginTop: 14 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>STT</th>
              <th>Mã &amp; Tên sản phẩm</th>
              <th style={{ width: 80 }}>ĐVT</th>
              <th style={{ width: 130, textAlign: "right" }}>Tồn hệ thống</th>
              <th style={{ width: 170, textAlign: "center" }}>Số lượng thực tế</th>
              <th style={{ width: 130, textAlign: "center" }}>Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, idx) => {
              const sys = Number(product.stock || 0);
              const real = Number(actual[product.id] ?? sys);
              const diff = real - sys;
              return (
                <tr key={product.id} className="stocktake-row">
                  <td style={{ color: "var(--text-faint)", fontWeight: 600 }}>{idx + 1}</td>
                  <td>
                    <div>
                      <strong className="cust-name">{product.TenSP}</strong>
                      <span className="prod-code-badge" style={{ marginTop: 2, display: "inline-block" }}>{product.MaSP}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-soft)" }}>{product.DonViTinh}</td>
                  <td style={{ textAlign: "right", fontSize: 14, fontWeight: 600 }}>
                    {sys} {product.DonViTinh}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => setActual((curr) => ({ ...curr, [product.id]: Math.max(0, real - 1) }))}
                      >
                        −
                      </button>
                      <input
                        className="po-num-input"
                        style={{ width: 80, textAlign: "center", fontWeight: 700 }}
                        type="number"
                        min="0"
                        value={actual[product.id] ?? sys}
                        onChange={(e) =>
                          setActual((current) => ({
                            ...current,
                            [product.id]: Number(e.target.value),
                          }))
                        }
                        aria-label={`Số lượng thực tế ${product.TenSP}`}
                      />
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => setActual((curr) => ({ ...curr, [product.id]: real + 1 }))}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className={`diff-pill ${
                        diff < 0
                          ? "diff-neg"
                          : diff > 0
                          ? "diff-pos"
                          : "diff-zero"
                      }`}
                    >
                      {diff > 0 ? `+${diff}` : diff}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-soft)", margin: "0 0 14px" }}>
          LỊCH SỬ PHIẾU KIỂM KÊ ĐÃ LƯU
        </h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Thời điểm kiểm kê</th>
                <th>Số mặt hàng</th>
                <th>Số mục lệch</th>
                <th style={{ width: 130, textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.MaKK || record.id}</strong></td>
                  <td>{record.createdAt ? new Date(record.createdAt).toLocaleString("vi-VN") : record.NgayKiemKe}</td>
                  <td>{record.details?.length || record.items?.length || 0} mặt hàng</td>
                  <td>
                    <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                      {record.details?.filter((line) => Number(line.ChenhLech) !== 0).length || 0} mặt hàng
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => printStocktake(record)}>
                      <PrinterIcon className="btn-icon" aria-hidden="true" /> In phiếu
                    </button>
                  </td>
                </tr>
              ))}
              {!stocktakes.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                    Chưa có phiếu kiểm kê nào được lưu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}