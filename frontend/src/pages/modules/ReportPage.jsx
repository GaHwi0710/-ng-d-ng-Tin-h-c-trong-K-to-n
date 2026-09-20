import { useState, useEffect, useMemo } from "react";
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CreditCardIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { getReport, listRecords } from "../../lib/api.js";
import { printReport } from "../../lib/reportPrint.js";
import { StatCard } from "../../components/StatCard.jsx";
import { ProgressBar } from "../../components/BarChart.jsx";
import { Badge } from "../../components/Badge.jsx";
import { SkeletonCard } from "../../components/SkeletonLoader.jsx";
import { toast } from "../../components/Toast.jsx";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function ReportPage({ title }) {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [debts, setDebts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [cashFlow, setCashFlow] = useState(null);
  const [printing, setPrinting] = useState(null); // which report is printing
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);
  // Bộ lọc ngày — để trống = lấy toàn bộ
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterKey, setFilterKey] = useState(0); // tăng để trigger re-fetch

  useEffect(() => {
    // Dùng allSettled: hiển thị phần dữ liệu được phép xem,
    // phần bị 403 trả về rỗng thay vì crash toàn trang
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo)   params.set("to",   dateTo);
    const qs = params.toString() ? `?${params}` : "";

    Promise.allSettled([
      getReport(`revenue${qs}`),
      getReport("debts"),
      getReport("inventory"),
      listRecords("products"),
      listRecords("goods-receipts"),
      listRecords("goods-issues"),
      listRecords("debts"),
      listRecords("invoices"),
      listRecords("sales-orders"),
      getReport(`cash-flow${qs}`),
    ]).then(([revenue, debtsReport, inventory, prods, recs, iss, debtsList, invList, soList, cf]) => {
      // Thu thập lỗi thực sự (không phải 403 vì đó là do phân quyền, không phải lỗi)
      const errors = [];
      const isRealError = (r) => r.status === "rejected" && r.reason?.status !== 403;
      if (isRealError(revenue)) errors.push("Báo cáo doanh thu");
      if (isRealError(debtsReport)) errors.push("Báo cáo công nợ");
      if (isRealError(inventory)) errors.push("Báo cáo tồn kho");
      if (isRealError(cf)) errors.push("Báo cáo thu chi");
      setLoadErrors(errors);

      setData({
        revenue: revenue.status === "fulfilled" ? revenue.value : { total: 0, orders: 0, weekly: [] },
        debts: debtsReport.status === "fulfilled" ? debtsReport.value : { total: 0, data: [] },
        inventory: inventory.status === "fulfilled" ? inventory.value : { data: [] },
      });
      setProducts(prods.status === "fulfilled" ? prods.value : []);
      setReceipts(recs.status === "fulfilled" ? recs.value : []);
      setIssues(iss.status === "fulfilled" ? iss.value : []);
      setDebts(debtsList.status === "fulfilled" ? debtsList.value : []);
      setInvoices(invList.status === "fulfilled" ? invList.value : []);
      setSalesOrders(soList.status === "fulfilled" ? soList.value : []);
      setCashFlow(cf.status === "fulfilled" ? cf.value : null);
    });
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePrint(type) {
    if (!data) return;
    setPrinting(type);
    setPrintMenuOpen(false);
    try {
      const { printReport } = await import("../../lib/reportPrint.js");
      switch (type) {
        case "revenue":
          printReport("revenue", { revenueData: data?.revenue, invoices, salesOrders });
          break;
        case "inventory":
          printReport("inventory", { products });
          break;
        case "warehouse":
          printReport("warehouse", { receipts, issues });
          break;
        case "debts":
          printReport("debts", { debts });
          break;
        case "cash-flow":
          printReport("cash-flow", { cashFlow, dateFrom, dateTo });
          break;
      }
    } catch (err) {
      toast("Không mở được cửa sổ in. Kiểm tra pop-up blocker.");
      console.error(err);
    } finally {
      setTimeout(() => setPrinting(null), 1500);
    }
  }

  // Doanh thu theo danh mục tính từ hóa đơn ĐÃ THANH TOÁN, nhóm theo Loại hàng của sản phẩm.
  const categories = useMemo(() => {
    const productMap = new Map(products.map((product) => [String(product.id), product]));
    const byCategory = new Map();
    for (const invoice of invoices) {
      if (invoice.TrangThai !== "Đã thanh toán") continue;
      for (const line of invoice.details || []) {
        const product = productMap.get(String(line.MaSP || line.productId || ""));
        const name = product?.LoaiHang || line.LoaiHang || "Không phân loại";
        const amount = Number(line.ThanhTien) || (Number(line.SoLuong || line.quantity || 0) * Number(line.DonGia || line.price || 0));
        byCategory.set(name, (byCategory.get(name) || 0) + amount);
      }
    }
    return [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [invoices, products]);
  const maxCatValue = Math.max(1, ...categories.map((c) => c.value));

  // Loading state với Skeleton shimmer sau khi tất cả hooks đã khai báo
  if (!data) {
    return (
      <section aria-labelledby="report-heading">
        <header className="page-header">
          <hgroup>
            <h1 id="report-heading">{title}</h1>
            <p>Tổng hợp doanh thu, nhập xuất kho, công nợ và thu chi tiền mặt.</p>
          </hgroup>
        </header>
        <div className="stats-grid" style={{ marginTop: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="card" style={{ height: 220, marginTop: 20, background: "var(--surface-sunken)", opacity: 0.5 }} />
      </section>
    );
  }

  const printReports = [
    { type: "revenue",   label: "Báo cáo doanh thu",     icon: "📊" },
    { type: "inventory", label: "Báo cáo tồn kho",        icon: "📦" },
    { type: "warehouse", label: "Báo cáo nhập – xuất kho", icon: "🏭" },
    { type: "debts",     label: "Báo cáo công nợ",         icon: "💳" },
    { type: "cash-flow", label: "Báo cáo thu chi",          icon: "💰" },
  ];

  const money2 = (v) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(v);

  return (
    <section aria-labelledby="report-heading">
      <header className="page-header">
        <hgroup>
          <h1 id="report-heading">{title}</h1>
          <p>Tổng hợp doanh thu, nhập xuất kho, công nợ và thu chi tiền mặt.</p>
        </hgroup>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Bộ lọc ngày */}
          <label style={{ fontSize: 12, color: "var(--text-soft)", display: "flex", alignItems: "center", gap: 4 }}>
            Từ
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)" }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--text-soft)", display: "flex", alignItems: "center", gap: 4 }}>
            đến
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)" }}
            />
          </label>
          <button
            className="btn btn-sm btn-outline"
            type="button"
            onClick={() => setFilterKey((k) => k + 1)}
          >
            Lọc
          </button>
          {(dateFrom || dateTo) && (
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => { setDateFrom(""); setDateTo(""); setFilterKey((k) => k + 1); }}
              style={{ color: "var(--text-faint)" }}
            >
              Xóa lọc
            </button>
          )}
          {/* Print dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setPrintMenuOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <PrinterIcon className="btn-icon" aria-hidden="true" />
              In báo cáo
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          {printMenuOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={() => setPrintMenuOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#fff",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "0 8px 32px rgba(31,42,55,.14)",
                  minWidth: 230,
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "8px 14px 6px", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Chọn loại báo cáo
                </div>
                {printReports.map((r) => (
                  <button
                    key={r.type}
                    type="button"
                    onClick={() => handlePrint(r.type)}
                    disabled={printing === r.type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "9px 14px",
                      border: "none",
                      background: printing === r.type ? "var(--primary-light)" : "transparent",
                      cursor: printing === r.type ? "wait" : "pointer",
                      fontSize: 13,
                      color: "var(--text)",
                      fontWeight: 500,
                      textAlign: "left",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => { if (printing !== r.type) e.currentTarget.style.background = "var(--primary-light)"; }}
                    onMouseLeave={(e) => { if (printing !== r.type) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    {printing === r.type ? "Đang mở cửa sổ in..." : r.label}
                  </button>
                ))}
                <div style={{ borderTop: "1px solid var(--border)", padding: "8px 14px" }}>
                  <p style={{ fontSize: 10.5, color: "var(--text-faint)", margin: 0 }}>
                    💡 Cho phép pop-up nếu trình duyệt yêu cầu
                  </p>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {loadErrors.length > 0 && (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          ⚠️ Không tải được dữ liệu: {loadErrors.join(", ")}. Một số số liệu có thể không chính xác.
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          label="Doanh thu đã thu"
          value={money.format(data.revenue?.total || 0)}
          valueClass="accent"
        />
        <StatCard
          label="Tổng đơn hàng"
          value={String(data.revenue?.orders || salesOrders.length || 0)}
        />
        <StatCard
          label="Số phiếu xuất kho"
          value={String(issues.length)}
        />
        <StatCard
          label="Công nợ chưa thu"
          value={money.format(data.debts?.total || 0)}
          valueClass="danger"
        />
        {cashFlow && (
          <StatCard
            label="Tồn quỹ tiền mặt"
            value={money2(cashFlow.balance)}
            valueClass={cashFlow.balance >= 0 ? "accent" : "danger"}
            delta={`Thu: ${money2(cashFlow.totalThu)} / Chi: ${money2(cashFlow.totalChi)}`}
          />
        )}
      </div>

      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <h3>Doanh thu theo danh mục sản phẩm</h3>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            title="In báo cáo doanh thu"
            onClick={() => handlePrint("revenue")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PrinterIcon style={{ width: 14 }} aria-hidden="true" />
            In doanh thu
          </button>
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
        {!categories.length && (
          <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 18 }}>
            Chưa có doanh thu theo danh mục — số liệu sẽ hiển thị sau khi có hóa đơn đã thanh toán.
          </p>
        )}
      </article>

      <article className="card" style={{ marginBottom: 20 }}>
        <header className="section-head">
          <h3>Tình trạng tồn kho</h3>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => handlePrint("inventory")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PrinterIcon style={{ width: 14 }} aria-hidden="true" />
            In tồn kho
          </button>
        </header>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
          {[
            { label: "Tổng mặt hàng", value: products.length, color: "var(--text)" },
            { label: "Còn hàng (>10)", value: products.filter(p => Number(p.stock||0) > 10).length, color: "var(--success)" },
            { label: "Sắp hết (1-10)", value: products.filter(p => Number(p.stock||0) > 0 && Number(p.stock||0) <= 10).length, color: "var(--warn)" },
            { label: "Hết hàng (0)", value: products.filter(p => Number(p.stock||0) <= 0).length, color: "var(--danger)" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 16px", textAlign: "center", border: "1px solid var(--border)", minWidth: 110 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <header className="section-head">
          <h3>Nhập – Xuất kho gần đây</h3>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => handlePrint("warehouse")}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <PrinterIcon style={{ width: 14 }} aria-hidden="true" />
            In nhập – xuất kho
          </button>
        </header>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th scope="col">Loại</th>
                <th scope="col">Mã phiếu</th>
                <th scope="col">Ngày</th>
                <th scope="col">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((si) => (
                <tr key={si.id}>
                  <td><Badge variant="green">Nhập kho</Badge></td>
                  <td>{si.MaPN || si.id}</td>
                  <td>{si.NgayNhap}</td>
                  <td>{si.details?.length || 0} mặt hàng</td>
                </tr>
              ))}
              {issues.map((so) => (
                <tr key={so.id}>
                  <td><Badge variant="amber">Xuất kho</Badge></td>
                  <td>{so.MaPX || so.id}</td>
                  <td>{so.NgayXuat}</td>
                  <td>{so.LyDoXuat}</td>
                </tr>
              ))}
              {!receipts.length && !issues.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-faint)", padding: 32 }}>
                    Chưa có dữ liệu nhập xuất
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
