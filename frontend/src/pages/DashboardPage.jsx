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
  CheckCircleIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  TagIcon,
  FireIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
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
  const [timeRange, setTimeRange] = useState("7days"); // "today" | "7days" | "thisMonth" | "thisYear" | "all"
  const [data, setData] = useState({
    products: [],
    orders: [],
    invoices: [],
    debts: [],
    customers: [],
    receipts: [],
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
      listRecords("goods-receipts"),
    ])
      .then(([products, orders, invoices, debts, revenue, customers, receipts]) => {
        setData({
          products: products.status === "fulfilled" ? products.value : [],
          orders: orders.status === "fulfilled" ? orders.value : [],
          invoices: invoices.status === "fulfilled" ? invoices.value : [],
          debts: debts.status === "fulfilled" ? debts.value : [],
          customers: customers.status === "fulfilled" ? customers.value : [],
          receipts: receipts.status === "fulfilled" ? receipts.value : [],
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

  // Bộ lọc hóa đơn theo khoảng thời gian được chọn
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (timeRange === "today") {
      return data.invoices.filter((i) => (i.NgayLap?.slice(0, 10) || "") === todayStr);
    }
    if (timeRange === "7days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      const fromStr = d.toISOString().slice(0, 10);
      return data.invoices.filter((i) => (i.NgayLap?.slice(0, 10) || "") >= fromStr);
    }
    if (timeRange === "thisMonth") {
      const mStr = todayStr.slice(0, 7);
      return data.invoices.filter((i) => (i.NgayLap?.slice(0, 7) || "") === mStr);
    }
    if (timeRange === "thisYear") {
      const yStr = todayStr.slice(0, 4);
      return data.invoices.filter((i) => (i.NgayLap?.slice(0, 4) || "") === yStr);
    }
    return data.invoices;
  }, [data.invoices, timeRange]);

  // 1. Doanh thu bán hàng (Accrual)
  const validInvoices = useMemo(
    () => filteredInvoices.filter((i) => i.TrangThai !== "Đã hủy"),
    [filteredInvoices]
  );
  const totalRevenue = useMemo(
    () => validInvoices.reduce((s, i) => s + Number(i.TongTien || 0), 0),
    [validInvoices]
  );

  // 2. Thực thu (Đã thanh toán)
  const totalPaid = useMemo(
    () =>
      validInvoices.reduce(
        (s, i) =>
          s +
          Number(
            i.SoTienDaTra ?? (i.TrangThai === "Đã thanh toán" ? i.TongTien : 0)
          ),
        0
      ),
    [validInvoices]
  );

  // 3. Công nợ khách hàng (Phải thu)
  const customerDebt = useMemo(() => {
    return data.debts
      .filter(
        (d) =>
          (d.LoaiCongNo === "Khách hàng" || (!d.LoaiCongNo && d.MaKHCode)) &&
          d.TrangThai !== "Đã thanh toán"
      )
      .reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);
  }, [data.debts]);

  // 4. Công nợ nhà cung cấp (Phải trả)
  const supplierDebt = useMemo(() => {
    return data.debts
      .filter(
        (d) =>
          (d.LoaiCongNo === "Nhà cung cấp" || (!d.LoaiCongNo && d.MaNCCCode)) &&
          d.TrangThai !== "Đã thanh toán"
      )
      .reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);
  }, [data.debts]);

  // 5. Giá trị tồn kho hiện tại (stock * GiaNhap)
  const totalInventoryValue = useMemo(() => {
    return data.products.reduce(
      (sum, p) =>
        sum + Number(p.stock || 0) * Number(p.GiaNhap || p.GiaBan || 0),
      0
    );
  }, [data.products]);

  // 6. Số sản phẩm đang kinh doanh
  const totalProducts = data.products.length;

  // 7. Số hóa đơn trong kỳ
  const totalInvoicesCount = validInvoices.length;

  // 8. Số đơn nhập kho
  const totalReceiptsCount = data.receipts.length;

  // Cảnh báo tồn kho thấp
  const lowStockProducts = useMemo(
    () => data.products.filter((p) => Number(p.stock || 0) <= LOW_STOCK_THRESHOLD),
    [data.products]
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
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.NgayLap) - new Date(a.createdAt || a.NgayLap)
      )
      .slice(0, 5);
  }, [data.invoices]);

  // 5 Đơn nhập kho gần nhất
  const recentReceipts = useMemo(() => {
    return [...(data.receipts || [])]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.NgayNhap) - new Date(a.createdAt || a.NgayNhap)
      )
      .slice(0, 5);
  }, [data.receipts]);

  // Top sản phẩm bán chạy trong kỳ
  const topProducts = useMemo(() => {
    const map = new Map();
    for (const inv of validInvoices) {
      for (const item of inv.details || []) {
        const code = item.MaSPCode || item.MaSP || item.TenSP || "SP";
        const name = item.TenSP || code;
        const qty = Number(item.SoLuong || item.quantity || 0);
        const amount =
          Number(item.ThanhTien || 0) ||
          qty * Number(item.DonGia || item.price || 0);
        if (!map.has(code)) {
          map.set(code, {
            code,
            name,
            quantity: 0,
            revenue: 0,
            image: item.HinhAnh,
            category: item.LoaiHang,
          });
        }
        const entry = map.get(code);
        entry.quantity += qty;
        entry.revenue += amount;
      }
    }
    return [...map.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [validInvoices]);

  // Biểu đồ doanh thu 7 ngày gần nhất (sử dụng giá trị thực VND)
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const weeklyRevenue = useMemo(() => {
    return last7Days.map((date) => {
      return data.invoices
        .filter(
          (inv) =>
            inv.TrangThai !== "Đã hủy" &&
            inv.NgayLap?.slice(0, 10) === date
        )
        .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
    });
  }, [data.invoices, last7Days]);

  const dayLabels = useMemo(() => {
    return last7Days.map((date) => {
      const parts = date.split("-");
      return `${parts[2]}/${parts[1]}`;
    });
  }, [last7Days]);

  // Cơ cấu doanh thu theo nhóm hàng
  const categories = useMemo(() => {
    const byCategory = new Map();
    for (const inv of validInvoices) {
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
  }, [validInvoices]);

  return (
    <section aria-labelledby="dashboard-heading" className="dashboard-container">
      <header
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo.png"
            alt="Logo Mẹ & Bé"
            className="dash-brand-logo"
            style={{ width: 46, height: 46, objectFit: "contain", flexShrink: 0 }}
          />
          <hgroup>
            <h1 id="dashboard-heading" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--primary-dark)" }}>
              Bảng điều khiển Tổng quan — Cửa hàng Mẹ &amp; Bé
            </h1>
            <p style={{ color: "var(--text-soft)", fontSize: 13, margin: "3px 0 0" }}>
              Trung tâm điều hành kinh doanh, quản lý kho &amp; hạch toán kế toán theo thời gian thực
            </p>
          </hgroup>
        </div>

      </header>

      {/* 4 Quick Actions Cards Bar */}
      <div className="dash-quick-actions-bar">
        <div className="dash-quick-card" onClick={() => navigate("/sales-orders")}>
          <div className="dash-quick-icon teal">
            <ShoppingCartIcon style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div className="dash-quick-title">Bán hàng nhanh (POS)</div>
            <div className="dash-quick-desc">Thu ngân tại quầy, xuất hóa đơn tức thì (F2)</div>
          </div>
        </div>

        <div className="dash-quick-card" onClick={() => navigate("/goods-receipts")}>
          <div className="dash-quick-icon blue">
            <ArchiveBoxArrowDownIcon style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div className="dash-quick-title">Nhập kho (01-VT)</div>
            <div className="dash-quick-desc">Nhập hàng NCC, tăng tồn kho & công nợ</div>
          </div>
        </div>

        <div className="dash-quick-card" onClick={() => navigate("/stocktakes")}>
          <div className="dash-quick-icon amber">
            <ClipboardDocumentCheckIcon style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div className="dash-quick-title">Kiểm kê kho</div>
            <div className="dash-quick-desc">Đối soát tồn thực tế & điều chỉnh chênh lệch</div>
          </div>
        </div>

        <div className="dash-quick-card" onClick={() => navigate("/reports")}>
          <div className="dash-quick-icon purple">
            <ChartBarIcon style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div className="dash-quick-title">Báo cáo quản trị</div>
            <div className="dash-quick-desc">Doanh thu, tồn kho, công nợ, dòng tiền (F9)</div>
          </div>
        </div>
      </div>

      {/* Segmented Time Range Filter */}
      <div
        className="card"
        style={{
          padding: "10px 14px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-soft)", fontSize: 13 }}>
          <CalendarDaysIcon style={{ width: 18, height: 18, color: "var(--primary)" }} />
          <span>Kỳ thống kê:</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "today", label: "Hôm nay" },
            { id: "7days", label: "7 ngày qua" },
            { id: "thisMonth", label: "Tháng này" },
            { id: "thisYear", label: "Năm nay" },
            { id: "all", label: "Toàn thời gian" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTimeRange(item.id)}
              className={`btn btn-sm ${timeRange === item.id ? "btn-primary" : "btn-ghost"}`}
              style={{
                fontSize: 12.5,
                fontWeight: timeRange === item.id ? 600 : 500,
                borderRadius: "var(--radius-pill)",
                padding: "4px 14px",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* 8 Stat Cards Grid */}
      {loading ? (
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
          <StatCard
            icon={DocumentTextIcon}
            label="Doanh thu bán hàng"
            value={money.format(totalRevenue)}
            theme="gold"
            delta={`${totalInvoicesCount} hóa đơn hợp lệ`}
            deltaType="neutral"
            onClick={() => navigate("/reports")}
          />
          <StatCard
            icon={CheckCircleIcon}
            label="Đã thu tiền mặt/CK"
            value={money.format(totalPaid)}
            theme="emerald"
            delta={`Đạt ${totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 100}% doanh thu`}
            deltaType="up"
            onClick={() => navigate("/reports")}
          />
          <StatCard
            icon={CreditCardIcon}
            label="Công nợ khách hàng"
            value={money.format(customerDebt)}
            theme="amber"
            delta={customerDebt > 0 ? "Phải thu từ khách" : "Đã thu đủ"}
            deltaType={customerDebt > 0 ? "down" : "neutral"}
            onClick={() => navigate("/debts")}
          />
          <StatCard
            icon={BuildingStorefrontIcon}
            label="Công nợ nhà cung cấp"
            value={money.format(supplierDebt)}
            theme="purple"
            delta={supplierDebt > 0 ? "Phải trả nhà cung cấp" : "Đã thanh toán đủ"}
            deltaType={supplierDebt > 0 ? "down" : "neutral"}
            onClick={() => navigate("/debts")}
          />
          <StatCard
            icon={CubeIcon}
            label="Giá trị tồn kho"
            value={money.format(totalInventoryValue)}
            theme="blue"
            delta="Tổng giá trị vốn hiện hữu"
            deltaType="neutral"
            onClick={() => navigate("/inventory")}
          />
          <StatCard
            icon={TagIcon}
            label="Sản phẩm kinh doanh"
            value={totalProducts.toString()}
            theme="teal"
            delta={`${lowStockProducts.length} mặt hàng sắp hết`}
            deltaType={lowStockProducts.length > 0 ? "down" : "neutral"}
            onClick={() => navigate("/products")}
          />
          <StatCard
            icon={ShoppingCartIcon}
            label="Hóa đơn trong kỳ"
            value={totalInvoicesCount.toString()}
            theme="indigo"
            delta="Hóa đơn bán lẻ"
            deltaType="neutral"
            onClick={() => navigate("/invoices")}
          />
          <StatCard
            icon={ArchiveBoxArrowDownIcon}
            label="Đơn nhập kho"
            value={totalReceiptsCount.toString()}
            theme="blue"
            delta="Phiếu nhập hàng đã lập"
            deltaType="neutral"
            onClick={() => navigate("/goods-receipts")}
          />
        </div>
      )}

      {/* 2 Column Charts: Line Chart + Donut Chart */}
      <div className="report-grid-2col" style={{ marginBottom: 20 }}>
        {/* Revenue 7-day Trend */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0, fontSize: 16 }}>Xu hướng doanh thu theo ngày</h3>
              <p className="desc" style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                7 ngày gần nhất (số liệu thực tế từ hóa đơn hợp lệ)
              </p>
            </hgroup>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate("/reports")}
            >
              Xem báo cáo
              <ArrowRightIcon className="btn-icon" style={{ marginLeft: 2 }} />
            </button>
          </header>
          <div style={{ paddingTop: 10 }}>
            <LineChart
              data={weeklyRevenue.map((val, idx) => ({
                label: dayLabels[idx] || `N${idx + 1}`,
                value: val,
              }))}
              series={[{ key: "value", label: "Doanh thu", color: "#3D7068" }]}
              height={210}
            />
          </div>
        </article>

        {/* Revenue by Category Donut */}
        <article className="card">
          <header className="section-head">
            <hgroup>
              <h3 style={{ margin: 0, fontSize: 16 }}>Cơ cấu doanh thu theo nhóm hàng</h3>
              <p className="desc" style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                Tỷ trọng nhóm hàng trong kỳ thống kê
              </p>
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
                size={190}
              />
            ) : (
              <div className="chart-empty-state" style={{ height: 190, display: "grid", placeItems: "center", color: "var(--text-faint)" }}>
                <span>Chưa có phát sinh doanh thu trong kỳ</span>
              </div>
            )}
          </div>
        </article>
      </div>

      {/* 2 Column Bottom: Top Products & Recent Invoices */}
      <div className="report-grid-2col">
        {/* Top Selling Products */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <FireIcon style={{ width: 20, height: 20, color: "#EA580C" }} />
                Top sản phẩm bán chạy
              </h3>
              <p className="desc" style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                Sản phẩm có lượng tiêu thụ cao nhất trong kỳ
              </p>
            </hgroup>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/products")}
              style={{ color: "var(--primary)" }}
            >
              Xem tất cả
            </button>
          </header>
          <div className="table-shell" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 45 }}>#</th>
                  <th>Sản phẩm</th>
                  <th style={{ textAlign: "center" }}>SL bán</th>
                  <th style={{ textAlign: "right" }}>Doanh số</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length > 0 ? (
                  topProducts.map((p, idx) => (
                    <tr key={p.code}>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: idx === 0 ? "#FDE047" : idx === 1 ? "#E2E8F0" : idx === 2 ? "#FED7AA" : "transparent",
                            fontWeight: 700,
                            fontSize: 12,
                            color: "#0F172A",
                          }}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.code}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge badge-primary">{p.quantity}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "var(--primary-dark)" }}>
                        {money.format(p.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                      Chưa có đơn hàng trong kỳ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Recent Invoices */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0, fontSize: 16 }}>Hóa đơn bán lẻ gần nhất</h3>
              <p className="desc" style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                5 hóa đơn phát sinh gần đây nhất
              </p>
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
      </div>

      {/* 2 Column Bottom: Recent Purchases (Nhập kho) & Low Stock Warning */}
      <div className="report-grid-2col" style={{ marginTop: 20 }}>
        {/* Recent Purchases / Goods Receipts */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0, fontSize: 16 }}>Đơn nhập kho gần nhất</h3>
              <p className="desc" style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                5 phiếu nhập hàng phát sinh gần đây nhất
              </p>
            </hgroup>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/goods-receipts")}
              style={{ color: "var(--primary)" }}
            >
              Tất cả ({data.receipts.length})
            </button>
          </header>
          <div className="table-shell" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Mã PN</th>
                  <th>Nhà cung cấp</th>
                  <th style={{ textAlign: "right" }}>Tổng tiền</th>
                  <th style={{ textAlign: "center" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.length > 0 ? (
                  recentReceipts.map((rcp) => (
                    <tr key={rcp.id || rcp.MaPN} style={{ cursor: "pointer" }} onClick={() => navigate("/goods-receipts")}>
                      <td>
                        <span className="prod-code-badge">{rcp.MaPN || rcp.id}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: 13, color: "var(--text-dark)" }}>
                          {rcp.TenNCC || rcp.MaNCCCode || "Nhà cung cấp"}
                        </strong>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                          {rcp.NgayNhap ? new Date(rcp.NgayNhap).toLocaleDateString("vi-VN") : "—"}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {money.format(rcp.TongTien || 0)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <StatusBadge status={rcp.TrangThai || "Hoàn thành"} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-faint)", padding: 24 }}>
                      Chưa có phiếu nhập kho nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Low Stock Warning Section */}
        <article className="card">
          <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <hgroup>
              <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
                <ExclamationTriangleIcon style={{ width: 20, height: 20, color: "var(--warn)" }} />
                Cảnh báo tồn kho ({lowStockProducts.length})
              </h3>
              <p className="desc" style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-soft)" }}>
                Hàng có tồn kho ≤ {LOW_STOCK_THRESHOLD} sản phẩm
              </p>
            </hgroup>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigate("/purchase-orders")}
            >
              Lập PO NCC
            </button>
          </header>
          <div className="table-shell" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style={{ textAlign: "center" }}>Tồn kho</th>
                  <th style={{ textAlign: "right" }}>Giá nhập</th>
                  <th style={{ textAlign: "center" }}>Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.slice(0, 5).map((p) => (
                    <tr key={p.id || p.MaSP}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.TenSP}</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.MaSP || p.id}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Badge variant={Number(p.stock || 0) === 0 ? "red" : "amber"}>
                          {p.stock ?? 0} {p.DonViTinh || "Cái"}
                        </Badge>
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {money.format(p.GiaNhap || 0)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="badge badge-light" style={{ color: Number(p.stock || 0) === 0 ? "var(--danger)" : "var(--warn)" }}>
                          {Number(p.stock || 0) === 0 ? "Hết hàng" : "Sắp hết"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "#059669", padding: 24 }}>
                      ✓ Tất cả sản phẩm đều đảm bảo định mức tồn kho an toàn
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
