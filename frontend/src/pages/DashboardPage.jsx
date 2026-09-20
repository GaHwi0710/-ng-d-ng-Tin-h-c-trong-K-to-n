import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReport, listRecords } from "../lib/api.js";
import { LOW_STOCK_THRESHOLD } from "../lib/constants.js";
import {
  DocumentTextIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { StatCard } from "../components/StatCard.jsx";
import { ProductImage } from "../components/ProductImage.jsx";
import { BarChart, ProgressBar } from "../components/BarChart.jsx";
import { Badge } from "../components/Badge.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    products: [],
    orders: [],
    invoices: [],
    debts: [],
    revenue: { total: 0, orders: 0, weekly: [] },
  });
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Dùng allSettled: dashboard hiển thị phần dữ liệu tài khoản được phép xem,
    // phần không có quyền sẽ về rỗng thay vì báo lỗi cả trang.
    // Không fetch riêng "invoices" nữa — dùng data từ revenue report + invoices
    // chỉ để tính categories (fetch 1 lần).
    Promise.allSettled([
      listRecords("products"),
      listRecords("sales-orders"),
      listRecords("invoices"),
      listRecords("debts"),
      getReport("revenue"),
    ]).then(([products, orders, invoices, debts, revenue]) => {
      setData({
        products: products.status === "fulfilled" ? products.value : [],
        orders: orders.status === "fulfilled" ? orders.value : [],
        invoices: invoices.status === "fulfilled" ? invoices.value : [],
        debts: debts.status === "fulfilled" ? debts.value : [],
        revenue: revenue.status === "fulfilled" ? revenue.value : { total: 0, orders: 0, weekly: [] },
      });
      setLoadError("");
    }).catch((error) => setLoadError(error.message || "Không tải được dữ liệu từ máy chủ"));
  }, [reloadKey]);

  // Dùng total từ API report (đã lọc "Đã thanh toán") để tránh tính lại
  const totalRevenue = data.revenue?.total || data.invoices
    .filter((inv) => inv.TrangThai === "Đã thanh toán")
    .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);

  const totalOrders = data.orders.length;

  const pendingInvoices = data.invoices.filter(
    (inv) => inv.TrangThai === "Chưa thanh toán"
  ).length;

  const lowStockProducts = data.products.filter(
    (p) => Number(p.stock || 0) <= LOW_STOCK_THRESHOLD
  );

  const totalDebt = data.debts.reduce(
    (sum, d) => sum + Number(d.SoTienConLai || 0),
    0
  );

  // Doanh thu 7 ngày gần nhất — ưu tiên API report
  const apiWeekly = data.revenue?.weekly;
  const hasApiData = Array.isArray(apiWeekly) && apiWeekly.length > 0 && apiWeekly.some((w) => w.total > 0);

  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const weeklyRevenue = hasApiData
    ? apiWeekly.map((item) => item.total / 100000)
    : last7Days.map((date) =>
        data.invoices
          .filter((inv) => inv.TrangThai === "Đã thanh toán" && inv.NgayLap?.slice(0, 10) === date)
          .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0) / 100000
      );

  const dayLabels = hasApiData
    ? apiWeekly.map((item) =>
        new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(new Date(`${item.date}T00:00:00`))
      )
    : last7Days.map((date) =>
        new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(new Date(`${date}T00:00:00`))
      );

  // Doanh thu theo danh mục — tính từ hóa đơn đã thanh toán
  const categories = useMemo(() => {
    const byCategory = new Map();
    for (const inv of data.invoices) {
      if (inv.TrangThai !== "Đã thanh toán") continue;
      for (const line of inv.details || []) {
        const name = line.LoaiHang || "Không phân loại";
        const amount = Number(line.ThanhTien) ||
          (Number(line.SoLuong || line.quantity || 0) * Number(line.DonGia || line.price || 0));
        byCategory.set(name, (byCategory.get(name) || 0) + amount);
      }
    }
    return [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.invoices]);
  const maxCatValue = Math.max(1, ...categories.map((c) => c.value));

  // % thay đổi doanh thu tuần này so với tuần trước
  const revenueWeekDelta = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - 6);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const paid = data.invoices.filter((inv) => inv.TrangThai === "Đã thanh toán");

    const thisWeek = paid
      .filter((inv) => {
        const d = inv.NgayLap?.slice(0, 10);
        return d && d >= startOfThisWeek.toISOString().slice(0, 10);
      })
      .reduce((s, inv) => s + Number(inv.TongTien || 0), 0);

    const lastWeek = paid
      .filter((inv) => {
        const d = inv.NgayLap?.slice(0, 10);
        const from = startOfLastWeek.toISOString().slice(0, 10);
        const to = startOfThisWeek.toISOString().slice(0, 10);
        return d && d >= from && d < to;
      })
      .reduce((s, inv) => s + Number(inv.TongTien || 0), 0);

    if (!lastWeek) return thisWeek > 0 ? "+100%" : "Chưa có dữ liệu tuần trước";
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% so với tuần trước`;
  }, [data.invoices]);

  return (
    <section aria-labelledby="dashboard-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="dashboard-heading">Tổng quan</h1>
          <p>
            Doanh thu, đơn hàng, tồn kho và cảnh báo sản phẩm — cập nhật theo
            thời gian thực.
          </p>
        </hgroup>
      </header>

      {loadError && (
        <div className="alert danger" role="alert" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <span>Không tải được dữ liệu: {loadError}</span>
          <button className="btn btn-sm" type="button" onClick={() => setReloadKey((current) => current + 1)}>Tải lại</button>
        </div>
      )}

      {/* Stat Cards — 5 thẻ: doanh thu, đơn hàng, hóa đơn chưa thu, công nợ, tồn kho */}
      <div className="stats-grid">
        <StatCard
          icon={DocumentTextIcon}
          label="Doanh thu đã thu"
          value={money.format(totalRevenue)}
          valueClass="accent"
          delta={revenueWeekDelta}
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Tổng đơn hàng"
          value={totalOrders.toLocaleString("vi-VN")}
          delta={`${data.revenue?.orders ?? totalOrders} đơn tổng cộng`}
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Hóa đơn chưa thu"
          value={pendingInvoices.toString()}
          valueClass="danger"
          delta="Cần ghi nhận thanh toán"
          deltaDown
        />
        <StatCard
          icon={BanknotesIcon}
          label="Công nợ còn lại"
          value={money.format(totalDebt)}
          valueClass={totalDebt > 0 ? "danger" : undefined}
          delta={totalDebt > 0 ? "Cần theo dõi thu hồi" : "Không có công nợ"}
          deltaDown={totalDebt > 0}
        />
        <StatCard
          icon={CubeIcon}
          label="Sản phẩm sắp hết"
          value={lowStockProducts.length.toString()}
          valueClass="warn"
          delta={`Dưới mức tồn tối thiểu (≤ ${LOW_STOCK_THRESHOLD})`}
          deltaDown
        />
      </div>

      {/* Revenue Chart */}
      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <hgroup>
            <h3>Doanh thu 7 ngày gần nhất</h3>
            <p className="desc">Đơn vị: trăm nghìn đồng (hover để xem chi tiết)</p>
          </hgroup>
        </header>
        <BarChart data={weeklyRevenue} labels={dayLabels} />
      </article>

      {/* Revenue by Category */}
      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <hgroup>
            <h3>Doanh thu theo danh mục sản phẩm</h3>
          </hgroup>
        </header>
        {categories.length > 0 ? categories.map((cat) => (
          <ProgressBar
            key={cat.name}
            label={cat.name}
            value={cat.value}
            max={maxCatValue}
            amount={money.format(cat.value)}
          />
        )) : (
          <p style={{ textAlign: "center", color: "var(--text-faint)", padding: "18px 0" }}>
            Chưa có dữ liệu — số liệu hiển thị sau khi có hóa đơn đã thanh toán.
          </p>
        )}
      </article>

      {/* Low Stock Warning */}
      <article className="card">
        <header className="section-head">
          <hgroup>
            <h3>Cảnh báo tồn kho</h3>
            <p className="desc">Sản phẩm dưới mức tồn kho tối thiểu</p>
          </hgroup>
        </header>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th scope="col">Sản phẩm</th>
                <th scope="col">Loại</th>
                <th scope="col">Tồn hiện tại</th>
                <th scope="col">Mức tối thiểu</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <ProductImage src={p.HinhAnh} alt={p.TenSP} category={p.LoaiHang} size={34} />
                        <strong>{p.TenSP}</strong>
                      </div>
                    </td>
                    <td>{p.LoaiHang || "—"}</td>
                    <td>
                      <Badge variant="red">
                        {p.stock} {p.DonViTinh}
                      </Badge>
                    </td>
                    <td>10</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => navigate("/purchase-orders")}
                      >
                        Đặt thêm
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", color: "var(--text-faint)" }}
                  >
                    Không có sản phẩm nào dưới mức tồn tối thiểu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
