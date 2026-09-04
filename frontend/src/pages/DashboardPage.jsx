import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRecords } from "../lib/api.js";
import {
  DocumentTextIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { StatCard } from "../components/StatCard.jsx";
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
  });

  useEffect(() => {
    Promise.all([
      listRecords("products"),
      listRecords("sales-orders"),
      listRecords("invoices"),
      listRecords("debts"),
    ]).then(([products, orders, invoices, debts]) =>
      setData({ products, orders, invoices, debts })
    );
  }, []);

  const totalRevenue = data.invoices
    .filter((inv) => inv.TrangThai === "Đã thanh toán")
    .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
  const totalOrders = data.orders.length;
  const pendingInvoices = data.invoices.filter(
    (inv) => inv.TrangThai === "Chưa thanh toán"
  ).length;
  const lowStockProducts = data.products.filter(
    (p) => Number(p.stock || 0) <= 10
  );
  const totalDebt = data.debts.reduce(
    (sum, d) => sum + Number(d.SoTienConLai || 0),
    0
  );

  // Simulated weekly revenue for the chart (reflecting 500K user scale)
  const weeklyRevenue = [4200, 5800, 3500, 7000, 6400, 9000, 7600];
  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  // Revenue by category
  const categories = [
    { name: "Sữa", value: 2815000 },
    { name: "Bỉm/tã", value: 916000 },
    { name: "Đồ dùng cho bé", value: 370000 },
    { name: "Quần áo trẻ em", value: 198000 },
    { name: "Đồ chơi", value: 188000 },
    { name: "Chăm sóc mẹ và bé", value: 228000 },
  ];
  const maxCatValue = Math.max(1, ...categories.map((c) => c.value));

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

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon={DocumentTextIcon}
          label="Doanh thu đã thu"
          value={money.format(totalRevenue)}
          valueClass="accent"
          delta="+12% so với tuần trước"
        />
        <StatCard
          icon={ShoppingCartIcon}
          label="Tổng đơn hàng"
          value={totalOrders.toLocaleString("vi-VN")}
          delta={`${totalOrders} đơn trong tuần này`}
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Hóa đơn chưa thu"
          value={pendingInvoices.toString()}
          valueClass="danger"
          delta="Cần theo dõi công nợ"
          deltaDown
        />
        <StatCard
          icon={CubeIcon}
          label="Sản phẩm sắp hết"
          value={lowStockProducts.length.toString()}
          valueClass="warn"
          delta="Dưới mức tồn tối thiểu"
          deltaDown
        />
      </div>

      {/* Revenue Chart */}
      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <hgroup>
            <h3>Doanh thu 7 ngày gần nhất</h3>
            <p className="desc">Đơn vị: trăm nghìn đồng</p>
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
        {categories.map((cat) => (
          <ProgressBar
            key={cat.name}
            label={cat.name}
            value={cat.value}
            max={maxCatValue}
            amount={money.format(cat.value)}
          />
        ))}
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
                      <strong>{p.TenSP}</strong>
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
