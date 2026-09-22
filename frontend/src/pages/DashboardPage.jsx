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
  ArchiveBoxArrowDownIcon,
  WalletIcon,
  ArrowRightIcon,
  EyeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { StatCard } from "../components/StatCard.jsx";
import { ProductImage } from "../components/ProductImage.jsx";
import { BarChart, ProgressBar } from "../components/BarChart.jsx";
import { LineChart, DonutChart } from "../components/Charts.jsx";
import { Badge, StatusBadge } from "../components/Badge.jsx";
import { SkeletonCard, SkeletonRow } from "../components/SkeletonLoader.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    products: [],
    orders: [],
    invoices: [],
    debts: [],
    customers: [],
    revenue: { total: 0, orders: 0, weekly: [] },
  });
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      listRecords("products"),
      listRecords("sales-orders"),
      listRecords("invoices"),
      listRecords("debts"),
      getReport("revenue"),
      listRecords("customers"),
    ])
      .then(([products, orders, invoices, debts, revenue, customers]) => {
        setData({
          products: products.status === "fulfilled" ? products.value : [],
          orders: orders.status === "fulfilled" ? orders.value : [],
          invoices: invoices.status === "fulfilled" ? invoices.value : [],
          debts: debts.status === "fulfilled" ? debts.value : [],
          customers: customers.status === "fulfilled" ? customers.value : [],
          revenue:
            revenue.status === "fulfilled"
              ? revenue.value
              : { total: 0, orders: 0, weekly: [] },
        });
        setLoadError("");
      })
      .catch((error) =>
        setLoadError(error.message || "Không tải được dữ liệu từ máy chủ")
      )
      .finally(() => setLoading(false));
  }, [reloadKey]);

  // Dùng total từ API report (đã lọc "Đã thanh toán") để tránh tính lại
  const totalRevenue =
    data.revenue?.total ||
    data.invoices
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

  const customerMap = useMemo(() => {
    const map = new Map();
    for (const c of data.customers || []) {
      map.set(String(c.id || c._id), c);
      if (c.MaKH) map.set(String(c.MaKH), c);
    }
    return map;
  }, [data.customers]);

  // 5 Hóa đơn gần nhất
  const recentInvoices = useMemo(() => {
    return [...data.invoices]
      .sort((a, b) => new Date(b.createdAt || b.NgayLap) - new Date(a.createdAt || a.NgayLap))
      .slice(0, 5);
  }, [data.invoices]);

  // Doanh thu 7 ngày gần nhất — ưu tiên API report
  const apiWeekly = data.revenue?.weekly;
  const hasApiData =
    Array.isArray(apiWeekly) &&
    apiWeekly.length > 0 &&
    apiWeekly.some((w) => w.total > 0);

  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const weeklyRevenue = hasApiData
    ? apiWeekly.map((item) => item.total / 100000)
    : last7Days.map(
        (date) =>
          data.invoices
            .filter(
              (inv) =>
                inv.TrangThai === "Đã thanh toán" &&
                inv.NgayLap?.slice(0, 10) === date
            )
            .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0) / 100000
      );

  const dayLabels = hasApiData
    ? apiWeekly.map((item) =>
        new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(
          new Date(`${item.date}T00:00:00`)
        )
      )
    : last7Days.map((date) =>
        new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(
          new Date(`${date}T00:00:00`)
        )
      );

  // Doanh thu theo danh mục — tính từ hóa đơn đã thanh toán
  const categories = useMemo(() => {
    const byCategory = new Map();
    for (const inv of data.invoices) {
      if (inv.TrangThai !== "Đã thanh toán") continue;
      for (const line of inv.details || []) {
        const name = line.LoaiHang || "Khác";
        const amount =
          Number(line.ThanhTien) ||
          Number(line.SoLuong || line.quantity || 0) *
            Number(line.DonGia || line.price || 0);
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
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <hgroup>
          <h1 id="dashboard-heading">Bảng điều khiển Tổng quan</h1>
          <p>
            Doanh thu, đơn hàng, công nợ và tình trạng tồn kho — đồng bộ theo thời gian thực.
          </p>
        </hgroup>

        {/* Quick ERP Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-sm"
            type="button"
            onClick={() => navigate("/sales-orders")}
          >
            <BanknotesIcon className="btn-icon" aria-hidden="true" />
            Tạo đơn bán POS
          </button>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => navigate("/goods-receipts")}
          >
            <ArchiveBoxArrowDownIcon className="btn-icon" aria-hidden="true" />
            Nhập kho (01-VT)
          </button>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => navigate("/cash-receipts")}
          >
            <WalletIcon className="btn-icon" aria-hidden="true" />
            Lập phiếu thu
          </button>
        </div>
      </header>

      {loadError && (
        <div
          className="alert danger"
          role="alert"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <span>Không tải được dữ liệu: {loadError}</span>
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Tải lại
          </button>
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="stats-grid stats-grid-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="stats-grid stats-grid-5">
          <StatCard
            icon={DocumentTextIcon}
            label="Doanh thu đã thu"
            value={money.format(totalRevenue)}
            theme="gold"
            delta={revenueWeekDelta}
            deltaType="up"
            onClick={() => navigate("/reports")}
          />
          <StatCard
            icon={ShoppingCartIcon}
            label="Tổng đơn hàng"
            value={totalOrders.toLocaleString("vi-VN")}
            theme="blue"
            delta={`${data.revenue?.orders ?? totalOrders} đơn ghi nhận`}
            deltaType="neutral"
            onClick={() => navigate("/sales-orders")}
          />
          <StatCard
            icon={ExclamationTriangleIcon}
            label="Hóa đơn chưa thu"
            value={pendingInvoices.toString()}
            theme="amber"
            delta={pendingInvoices > 0 ? "Cần ghi nhận thanh toán" : "Đã thanh toán đủ"}
            deltaType={pendingInvoices > 0 ? "down" : "neutral"}
            onClick={() => navigate("/invoices")}
          />
          <StatCard
            icon={BanknotesIcon}
            label="Dư nợ còn lại"
            value={money.format(totalDebt)}
            theme="purple"
            delta={totalDebt > 0 ? "Cần theo dõi công nợ" : "Không có công nợ"}
            deltaType={totalDebt > 0 ? "down" : "neutral"}
            onClick={() => navigate("/debts")}
          />
          <StatCard
            icon={CubeIcon}
            label="Sản phẩm sắp hết"
            value={lowStockProducts.length.toString()}
            theme="red"
            delta={`Tồn kho ≤ ${LOW_STOCK_THRESHOLD}`}
            deltaType={lowStockProducts.length > 0 ? "down" : "neutral"}
            onClick={() => navigate("/inventory")}
          />
        </div>
      )}

      {/* 2 Column Charts: Line Chart + Donut Chart (Reference 2 Layout) */}
      <div className="report-grid-2col">
        {/* Revenue 7-day Trend */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0 }}>Doanh thu theo ngày (7 ngày gần nhất)</h3>
              <p className="desc" style={{ margin: "3px 0 0" }}>Theo dõi biến động doanh thu thực tế</p>
            </hgroup>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate("/reports")}
            >
              Báo cáo
              <ArrowRightIcon className="btn-icon" style={{ marginLeft: 2 }} />
            </button>
          </header>
          <div style={{ paddingTop: 8 }}>
            <LineChart
              data={weeklyRevenue.map((val, idx) => ({
                label: dayLabels[idx] || `N${idx + 1}`,
                value: val * 100000,
              }))}
              series={[{ key: "value", label: "Doanh thu", color: "#3D7068" }]}
              height={200}
            />
          </div>
        </article>

        {/* Revenue by Category Donut */}
        <article className="card">
          <header className="section-head">
            <hgroup>
              <h3 style={{ margin: 0 }}>Cơ cấu doanh thu theo nhóm hàng</h3>
              <p className="desc" style={{ margin: "3px 0 0" }}>Tỷ trọng theo loại hàng đã thanh toán</p>
            </hgroup>
          </header>
          <div style={{ paddingTop: 6 }}>
            {categories.length > 0 ? (
              <DonutChart
                data={categories.map((c) => ({
                  label: c.name,
                  value: c.value,
                }))}
                centerValue={money.format(totalRevenue)}
                centerLabel="Tổng doanh thu"
                size={180}
              />
            ) : (
              <div className="chart-empty-state" style={{ height: 180, display: "grid", placeItems: "center", color: "#94A3B8" }}>
                <span>Chưa có doanh thu theo danh mục</span>
              </div>
            )}
          </div>
        </article>
      </div>

        {/* Recent Invoices */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0 }}>Hóa đơn gần nhất</h3>
              <p className="desc" style={{ margin: "3px 0 0" }}>5 giao dịch gần đây nhất trong hệ thống</p>
            </hgroup>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/invoices")}
              style={{ color: "var(--primary)" }}
            >
              Tất cả ({data.invoices.length})
            </button>
          </header>
          <div className="table-shell" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã HĐ</th>
                  <th>Khách hàng</th>
                  <th style={{ textAlign: "right" }}>Tổng tiền</th>
                  <th style={{ textAlign: "center" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length > 0 ? (
                  recentInvoices.map((inv) => (
                    <tr key={inv.id || inv.MaHD} style={{ cursor: "pointer" }} onClick={() => navigate("/invoices")}>
                      <td>
                        <span className="prod-code-badge">{inv.MaHD || inv.id}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: 13, color: "var(--text-dark)" }}>
                          {inv.TenKH || (inv.MaKH && customerMap.get(String(inv.MaKH))?.HoTen) || inv.HoTen || "Khách vãng lai"}
                        </strong>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                          {inv.NgayLap ? new Date(inv.NgayLap).toLocaleDateString("vi-VN") : "—"}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {money.format(inv.TongTien || 0)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <StatusBadge status={inv.TrangThai} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                      Chưa có hóa đơn nào phát sinh
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

      {/* Low Stock Warning */}
      <article className="card">
        <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <hgroup>
            <h3 style={{ margin: 0 }}>Cảnh báo tồn kho tối thiểu</h3>
            <p className="desc" style={{ margin: "3px 0 0" }}>
              Các mặt hàng có số lượng tồn kho ≤ {LOW_STOCK_THRESHOLD} cần nhập bổ sung
            </p>
          </hgroup>
          {lowStockProducts.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => navigate("/purchase-orders")}
            >
              <ShoppingCartIcon className="btn-icon" aria-hidden="true" />
              Lập đơn nhập kho ({lowStockProducts.length} mặt hàng)
            </button>
          )}
        </header>

        <div className="table-shell" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Sản phẩm</th>
                <th scope="col">Loại hàng</th>
                <th scope="col" style={{ textAlign: "center" }}>Tồn hiện tại</th>
                <th scope="col" style={{ textAlign: "center" }}>Mức an toàn</th>
                <th scope="col" style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <ProductImage
                          src={p.HinhAnh}
                          alt={p.TenSP}
                          category={p.LoaiHang}
                          size={36}
                        />
                        <div>
                          <strong style={{ color: "var(--text-dark)" }}>{p.TenSP}</strong>
                          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
                            Mã: {p.MaSP || p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{p.LoaiHang || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <Badge variant={Number(p.stock) === 0 ? "red" : "amber"}>
                        {p.stock} {p.DonViTinh}
                      </Badge>
                    </td>
                    <td style={{ textAlign: "center", color: "var(--text-soft)" }}>
                      {LOW_STOCK_THRESHOLD} {p.DonViTinh}
                    </td>
                    <td style={{ textAlign: "center" }}>
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
                    style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}
                  >
                    ✅ Tuyệt vời! Tất cả sản phẩm đều đảm bảo định mức an toàn.
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
