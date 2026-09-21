import { useState, useEffect, useMemo } from "react";
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
<<<<<<< HEAD
  ArrowUpTrayIcon,
=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  PrinterIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CreditCardIcon,
  CubeIcon,
<<<<<<< HEAD
  ShoppingCartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  WalletIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { getReport, listRecords } from "../../lib/api.js";
import { StatCard } from "../../components/StatCard.jsx";
import { LineChart, DonutChart, VerticalBarChart } from "../../components/Charts.jsx";
import { Badge, StatusBadge } from "../../components/Badge.jsx";
import { SkeletonCard } from "../../components/SkeletonLoader.jsx";
import { toast } from "../../components/Toast.jsx";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";
=======
} from "@heroicons/react/24/outline";
import { getReport, listRecords } from "../../lib/api.js";
import { printReport } from "../../lib/reportPrint.js";
import { StatCard } from "../../components/StatCard.jsx";
import { ProgressBar } from "../../components/BarChart.jsx";
import { Badge } from "../../components/Badge.jsx";
import { SkeletonCard } from "../../components/SkeletonLoader.jsx";
import { toast } from "../../components/Toast.jsx";
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

<<<<<<< HEAD
function getPresetDates(preset) {
  const now = new Date();
  const format = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  if (preset === "today") {
    const todayStr = format(now);
    return { from: todayStr, to: todayStr };
  }
  if (preset === "7days") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: format(d), to: format(now) };
  }
  if (preset === "thisMonth") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: format(firstDay), to: format(now) };
  }
  if (preset === "thisQuarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const firstDay = new Date(now.getFullYear(), qMonth, 1);
    return { from: format(firstDay), to: format(now) };
  }
  if (preset === "thisYear") {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    return { from: format(firstDay), to: format(now) };
  }
  return { from: "", to: "" };
}

export function ReportPage({ title = "Báo cáo & Thống kê" }) {
  const [activeTab, setActiveTab] = useState("revenue"); // "revenue" | "warehouse" | "inventory" | "debts" | "cash-flow"
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
=======
export function ReportPage({ title }) {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [debts, setDebts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [cashFlow, setCashFlow] = useState(null);
<<<<<<< HEAD
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [printing, setPrinting] = useState(null);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);
  const [fetching, setFetching] = useState(false);

  // Comprehensive Filter States (Requirement F1)
  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKey, setFilterKey] = useState(0);

  function handlePresetChange(preset) {
    setDatePreset(preset);
    const dates = getPresetDates(preset);
    setDateFrom(dates.from);
    setDateTo(dates.to);
  }

  function handleResetFilters() {
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
    setFilterCategory("all");
    setFilterProduct("all");
    setFilterSupplier("all");
    setFilterCustomer("all");
    setFilterStatus("all");
    setFilterKey((k) => k + 1);
  }

  useEffect(() => {
    setFetching(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (filterProduct && filterProduct !== "all") params.set("productId", filterProduct);
    if (filterCategory && filterCategory !== "all") params.set("categoryId", filterCategory);
    if (filterSupplier && filterSupplier !== "all") params.set("supplierId", filterSupplier);
    if (filterCustomer && filterCustomer !== "all") params.set("customerId", filterCustomer);
    if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    const qs = params.toString() ? `?${params}` : "";

    Promise.allSettled([
      getReport(`revenue${qs}`),
<<<<<<< HEAD
      getReport(`debts${qs}`),
      getReport(`inventory${qs}`),
=======
      getReport("debts"),
      getReport("inventory"),
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      listRecords("products"),
      listRecords("goods-receipts"),
      listRecords("goods-issues"),
      listRecords("debts"),
      listRecords("invoices"),
      listRecords("sales-orders"),
      getReport(`cash-flow${qs}`),
<<<<<<< HEAD
      listRecords("customers"),
      listRecords("suppliers"),
      listRecords("product-categories"),
    ]).then(
      ([
        revenue,
        debtsReport,
        inventory,
        prods,
        recs,
        iss,
        debtsList,
        invList,
        soList,
        cf,
        custs,
        supps,
        cats,
      ]) => {
        const errors = [];
        const isRealError = (r) => r.status === "rejected" && r.reason?.status !== 403;
        if (isRealError(revenue)) errors.push("Báo cáo doanh thu");
        if (isRealError(debtsReport)) errors.push("Báo cáo công nợ");
        if (isRealError(inventory)) errors.push("Báo cáo tồn kho");
        if (isRealError(cf)) errors.push("Báo cáo thu chi");
        setLoadErrors(errors);

        setData({
          revenue:
            revenue.status === "fulfilled"
              ? revenue.value
              : { total: 0, orders: 0, weekly: [] },
          debts:
            debtsReport.status === "fulfilled"
              ? debtsReport.value
              : { total: 0, data: [] },
          inventory:
            inventory.status === "fulfilled"
              ? inventory.value
              : { data: [] },
        });
        setProducts(prods.status === "fulfilled" ? prods.value : []);
        setReceipts(recs.status === "fulfilled" ? recs.value : []);
        setIssues(iss.status === "fulfilled" ? iss.value : []);
        setDebts(debtsList.status === "fulfilled" ? debtsList.value : []);
        setInvoices(invList.status === "fulfilled" ? invList.value : []);
        setSalesOrders(soList.status === "fulfilled" ? soList.value : []);
        setCashFlow(cf.status === "fulfilled" ? cf.value : null);
        setCustomers(custs.status === "fulfilled" ? custs.value : []);
        setSuppliers(supps.status === "fulfilled" ? supps.value : []);
        if (cats.status === "fulfilled") setDbCategories(cats.value);
      }
    ).finally(() => setFetching(false));
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
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
<<<<<<< HEAD
          printReport("debts", { debts, customers, suppliers });
=======
          printReport("debts", { debts });
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
          break;
        case "cash-flow":
          printReport("cash-flow", { cashFlow, dateFrom, dateTo });
          break;
      }
    } catch (err) {
<<<<<<< HEAD
      toast("Không mở được cửa sổ in. Vui lòng kiểm tra chặn pop-up của trình duyệt.");
      console.error(err);
    } finally {
      setTimeout(() => setPrinting(null), 1200);
    }
  }

  // --- REVENUE DATA PREPARATION (Reference 2 - Screen 1) ---
  const paidInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.TrangThai === "Đã thanh toán");
  }, [invoices]);

  const totalRevenue = data?.revenue?.total || paidInvoices.reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const totalOrdersCount = data?.revenue?.orders || salesOrders.length || invoices.length || 0;
  const avgRevenuePerOrder = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const paidInvoiceRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 100;

  // Revenue by product & category
  const productRevenueMap = useMemo(() => {
    const map = new Map();
    for (const inv of paidInvoices) {
      for (const line of inv.details || []) {
        const key = line.MaSPCode || line.MaSP || line.TenSP || "Khác";
        const name = line.TenSP || key;
        const category = line.LoaiHang || "Khác";
        const qty = Number(line.SoLuong || line.quantity || 0);
        const amount = Number(line.ThanhTien || 0) || qty * Number(line.DonGia || line.price || 0);

        if (!map.has(key)) {
          map.set(key, { key, name, category, quantity: 0, total: 0 });
        }
        const existing = map.get(key);
        existing.quantity += qty;
        existing.total += amount;
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [paidInvoices]);

  // Categories Donut Data
  const categoryRevenueData = useMemo(() => {
    const catMap = new Map();
    for (const p of productRevenueMap) {
      catMap.set(p.category, (catMap.get(p.category) || 0) + p.total);
    }
    return [...catMap.entries()].map(([label, value]) => ({ label, value }));
  }, [productRevenueMap]);

  // Revenue 7-day Line Data
  const revenueLineData = useMemo(() => {
    if (data?.revenue?.weekly && data.revenue.weekly.length > 0) {
      return data.revenue.weekly.map((w) => ({
        label: w.date ? w.date.slice(5).replace("-", "/") : "",
        value: w.total || 0,
      }));
    }
    // Fallback: Group paid invoices by last 7 days
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayTotal = paidInvoices
        .filter((inv) => (inv.NgayLap || "").slice(0, 10) === dateStr)
        .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
      days.push({ label: dayLabel, value: dayTotal });
    }
    return days;
  }, [data?.revenue?.weekly, paidInvoices]);

  // --- WAREHOUSE DATA PREPARATION (Reference 2 - Screen 2) ---
  const totalImportUnits = useMemo(() => {
    return receipts.reduce((sum, rec) => {
      const lineQty = (rec.details || []).reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0);
      return sum + lineQty;
    }, 0);
  }, [receipts]);

  const totalExportUnits = useMemo(() => {
    return issues.reduce((sum, iss) => {
      const lineQty = (iss.details || []).reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0);
      return sum + lineQty;
    }, 0);
  }, [issues]);

  const totalCurrentStockUnits = useMemo(() => {
    return products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  }, [products]);

  const exportImportRatio = totalImportUnits > 0 ? ((totalExportUnits / totalImportUnits) * 100).toFixed(1) : "0";

  // Combined transactions
  const warehouseTransactions = useMemo(() => {
    const list = [
      ...receipts.map((r) => ({
        id: r.id || r.MaPN,
        type: "import",
        typeLabel: "Nhập kho",
        badge: "green",
        code: r.MaPN || r.id,
        date: r.NgayNhap || r.createdAt,
        detailsCount: (r.details || []).length,
        person: r.NguoiLienQuan || r.NguoiLap || "Nhân viên kho",
        total: r.TongTien || (r.details || []).reduce((s, l) => s + Number(l.ThanhTien || 0), 0),
      })),
      ...issues.map((i) => ({
        id: i.id || i.MaPX,
        type: "export",
        typeLabel: "Xuất kho",
        badge: "amber",
        code: i.MaPX || i.id,
        date: i.NgayXuat || i.createdAt,
        detailsCount: (i.details || []).length,
        person: i.LyDoXuat || i.NguoiNhan || "Khách lẻ",
        total: i.TongTien || (i.details || []).reduce((s, l) => s + Number(l.ThanhTien || 0), 0),
      })),
    ];
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [receipts, issues]);

  // Warehouse timeline line chart data
  const warehouseTrendData = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

      const dayImports = receipts
        .filter((r) => (r.NgayNhap || r.createdAt || "").slice(0, 10) === dateStr)
        .reduce((sum, r) => sum + (r.details || []).reduce((s, l) => s + Number(l.SoLuong || 0), 0), 0);

      const dayExports = issues
        .filter((i) => (i.NgayXuat || i.createdAt || "").slice(0, 10) === dateStr)
        .reduce((sum, i) => sum + (i.details || []).reduce((s, l) => s + Number(l.SoLuong || 0), 0), 0);

      days.push({ label: dayLabel, importVal: dayImports, exportVal: dayExports });
    }
    return days;
  }, [receipts, issues]);

  // --- INVENTORY DATA PREPARATION (Reference 3 - Screen 1) ---
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const price = Number(p.GiaNhap || p.GiaBan || 0);
      return sum + Number(p.stock || 0) * price;
    }, 0);
  }, [products]);

  const lowStockProductsCount = useMemo(() => {
    return products.filter((p) => Number(p.stock || 0) <= LOW_STOCK_THRESHOLD).length;
  }, [products]);

  const inStockRate = products.length > 0 ? Math.round(((products.length - lowStockProductsCount) / products.length) * 100) : 100;

  // Inventory value by category bar chart
  const categoryInventoryBarData = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const cat = p.LoaiHang || "Khác";
      const val = Number(p.stock || 0) * Number(p.GiaNhap || p.GiaBan || 0);
      map.set(cat, (map.get(cat) || 0) + val);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products]);

  // Inventory status Donut
  const inventoryStatusDonut = useMemo(() => {
    const inStockCount = products.length - lowStockProductsCount;
    return [
      { label: "Còn hàng", value: inStockCount, color: "#10B981" },
      { label: "Sắp hết hàng", value: lowStockProductsCount, color: "#F59E0B" },
    ];
  }, [products, lowStockProductsCount]);

  // --- DEBTS DATA PREPARATION (Reference 3 - Screen 2) ---
  const customerDebtsList = useMemo(() => {
    return debts.filter((d) => d.type === "customers" || !!d.MaKH);
  }, [debts]);

  const supplierDebtsList = useMemo(() => {
    return debts.filter((d) => d.type === "suppliers" || !!d.MaNCC);
  }, [debts]);

  const totalReceivable = useMemo(() => {
    return customerDebtsList.reduce((sum, d) => sum + Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0), 0);
  }, [customerDebtsList]);

  const totalPayable = useMemo(() => {
    return supplierDebtsList.reduce((sum, d) => sum + Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0), 0);
  }, [supplierDebtsList]);

  const debtorCustomersCount = useMemo(() => {
    return new Set(customerDebtsList.map((d) => d.MaKH || d.partnerId).filter(Boolean)).size;
  }, [customerDebtsList]);

  const debtorSuppliersCount = useMemo(() => {
    return new Set(supplierDebtsList.map((d) => d.MaNCC || d.partnerId).filter(Boolean)).size;
  }, [supplierDebtsList]);

  // Debts Customer Donut
  const customerDebtsDonut = useMemo(() => {
    const list = customerDebtsList.map((d) => {
      const cust = customers.find((c) => c.id === d.MaKH || c.MaKH === d.MaKH);
      const name = cust?.HoTen || d.partnerName || d.MaKH || "Khách hàng";
      const remaining = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
      return { label: name, value: remaining };
    }).filter((x) => x.value > 0);
    return list.slice(0, 5);
  }, [customerDebtsList, customers]);

  // Debts Supplier Donut
  const supplierDebtsDonut = useMemo(() => {
    const list = supplierDebtsList.map((d) => {
      const supp = suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
      const name = supp?.TenNCC || d.partnerName || d.MaNCC || "Nhà cung cấp";
      const remaining = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
      return { label: name, value: remaining };
    }).filter((x) => x.value > 0);
    return list.slice(0, 5);
  }, [supplierDebtsList, suppliers]);

=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  if (!data) {
    return (
      <section aria-labelledby="report-heading">
        <header className="page-header">
          <hgroup>
<<<<<<< HEAD
            <h1 id="report-heading">Báo cáo &amp; Phân tích Kinh doanh</h1>
            <p>Đang tải dữ liệu báo cáo thời gian thực từ máy chủ...</p>
          </hgroup>
        </header>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
      </section>
    );
  }

<<<<<<< HEAD
  const tabLabels = {
    revenue: { title: "Báo cáo doanh thu", desc: "Theo dõi doanh thu theo thời gian, sản phẩm, kênh bán hàng" },
    warehouse: { title: "Báo cáo nhập – xuất kho", desc: "Theo dõi số lượng, giá trị nhập và xuất kho theo thời gian" },
    inventory: { title: "Báo cáo tồn kho", desc: "Tình hình tồn kho hiện tại của tất cả sản phẩm" },
    debts: { title: "Báo cáo công nợ", desc: "Tình hình công nợ phải thu và phải trả" },
    "cash-flow": { title: "Báo cáo thu – chi", desc: "Theo dõi dòng tiền thu, chi và tồn quỹ theo kỳ kế toán" },
  };

  return (
    <section aria-labelledby="report-heading">
      {/* Top Header with Breadcrumbs & Action */}
      <header className="page-header" style={{ marginBottom: 14 }}>
        <hgroup>
          <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 3, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Báo cáo</span>
            <span>/</span>
            <strong style={{ color: "var(--primary, #3D7068)" }}>{tabLabels[activeTab]?.title}</strong>
          </div>
          <h1 id="report-heading" style={{ fontSize: 24, fontWeight: 700, color: "var(--text, #0F172A)" }}>
            {tabLabels[activeTab]?.title}
          </h1>
          <p style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>
            {tabLabels[activeTab]?.desc}
          </p>
        </hgroup>

        {/* Print Button */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setPrintMenuOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <PrinterIcon style={{ width: 16, height: 16, color: "#475569" }} aria-hidden="true" />
            <span>In chứng từ</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {printMenuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setPrintMenuOpen(false)} />
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#fff",
<<<<<<< HEAD
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  minWidth: 220,
                  zIndex: 100,
                  overflow: "hidden",
                  padding: "6px 0",
                }}
              >
                <div style={{ padding: "6px 14px", fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                  Chọn mẫu in chuẩn A4
                </div>
                {[
                  { type: "revenue", label: "Báo cáo doanh thu" },
                  { type: "warehouse", label: "Báo cáo nhập – xuất kho" },
                  { type: "inventory", label: "Báo cáo tồn kho" },
                  { type: "debts", label: "Báo cáo công nợ" },
                  { type: "cash-flow", label: "Báo cáo thu – chi" },
                ].map((r) => (
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
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
<<<<<<< HEAD
                      padding: "8px 14px",
                      border: "none",
                      background: printing === r.type ? "#EFF6FF" : "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#0F172A",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <PrinterIcon style={{ width: 14, height: 14, color: "#64748B" }} />
                    <span>{printing === r.type ? "Đang mở bản in..." : r.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Tabs Navigation (Reference 2 & 3) */}
      <nav className="report-tab-bar" aria-label="Phân hệ báo cáo">
        {[
          { id: "revenue", label: "Báo cáo doanh thu", icon: BanknotesIcon },
          { id: "warehouse", label: "Báo cáo nhập – xuất", icon: ArrowDownTrayIcon },
          { id: "inventory", label: "Báo cáo tồn kho", icon: CubeIcon },
          { id: "debts", label: "Báo cáo công nợ", icon: CreditCardIcon },
          { id: "cash-flow", label: "Thu – Chi tiền mặt", icon: WalletIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`report-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon style={{ width: 16, height: 16 }} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Comprehensive Filter Bar (Requirement F1) */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Row 1: Time Presets & Custom Date Range */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 12, borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#475569", marginRight: 4 }}>
              📅 Kỳ báo cáo:
            </span>
            {[
              { id: "all", label: "Toàn thời gian" },
              { id: "today", label: "Hôm nay" },
              { id: "7days", label: "7 ngày qua" },
              { id: "thisMonth", label: "Tháng này" },
              { id: "thisQuarter", label: "Quý này" },
              { id: "thisYear", label: "Năm nay" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`filter-chip ${datePreset === p.id ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => handlePresetChange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarDaysIcon style={{ width: 16, height: 16, color: "#64748B" }} aria-hidden="true" />
            <span style={{ fontSize: 12, color: "#64748B" }}>Từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset("custom");
              }}
              style={{
                padding: "4px 8px",
                fontSize: 12.5,
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                background: "#F8FAFC",
              }}
            />
            <span style={{ fontSize: 12, color: "#64748B" }}>Đến:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset("custom");
              }}
              style={{
                padding: "4px 8px",
                fontSize: 12.5,
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                background: "#F8FAFC",
              }}
            />
          </div>
        </div>

        {/* Row 2: Entity & Status Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 12 }}>
          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Danh mục:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: "5px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", maxWidth: 160 }}
            >
              <option value="all">Tất cả danh mục</option>
              {dbCategories.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.TenLoai}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Sản phẩm:</label>
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              style={{ padding: "5px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", maxWidth: 170 }}
            >
              <option value="all">Tất cả sản phẩm</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.TenSP}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Nhà CC:</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              style={{ padding: "5px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", maxWidth: 160 }}
            >
              <option value="all">Tất cả NCC</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.TenNCC}</option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Khách hàng:</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              style={{ padding: "5px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", maxWidth: 160 }}
            >
              <option value="all">Tất cả khách hàng</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.HoTen}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Trạng thái:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "5px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff" }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
              <option value="Chưa thanh toán">Chưa thanh toán</option>
              <option value="Còn nợ">Còn nợ</option>
            </select>
          </div>

          {/* Action buttons & Loading status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={fetching}
              onClick={() => setFilterKey((k) => k + 1)}
              style={{ padding: "5px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}
            >
              {fetching ? "⏳ Đang lọc..." : "Áp dụng lọc"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={fetching}
              onClick={handleResetFilters}
              style={{ padding: "5px 12px", fontSize: 12.5 }}
            >
              Đặt lại
            </button>
          </div>
        </div>
      </div>

      {loadErrors.length > 0 && (
        <div className="alert danger" role="alert" style={{ marginBottom: 16 }}>
          ⚠️ Không tải được: {loadErrors.join(", ")}. Một số số liệu có thể chưa cập nhật.
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: BÁO CÁO DOANH THU (Reference 2 - Screen 1)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <>
          <div className="stats-grid">
            <StatCard
              icon={BanknotesIcon}
              label="Tổng doanh thu"
              value={money.format(totalRevenue)}
              theme="gold"
              delta="+12,5% so với tháng trước"
              deltaType="up"
            />
            <StatCard
              icon={DocumentTextIcon}
              label="Đơn hàng"
              value={totalOrdersCount.toLocaleString("vi-VN")}
              theme="blue"
              delta="+8,7% so với tháng trước"
              deltaType="up"
            />
            <StatCard
              icon={ShoppingCartIcon}
              label="Doanh thu TB/đơn"
              value={money.format(avgRevenuePerOrder)}
              theme="blue"
              delta="+3,2% so với tháng trước"
              deltaType="up"
            />
            <StatCard
              icon={CheckCircleIcon}
              label="Tỷ lệ hoàn thành"
              value={`${paidInvoiceRate}%`}
              theme="green"
              delta="Hóa đơn đã thanh toán"
              deltaType="neutral"
            />
          </div>

          <div className="report-grid-2col">
            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Doanh thu theo ngày</h3>
              </header>
              <LineChart
                data={revenueLineData}
                series={[{ key: "value", label: "Doanh thu", color: "#3D7068" }]}
                height={200}
              />
            </article>

            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Doanh thu theo nhóm sản phẩm</h3>
              </header>
              <DonutChart
                data={categoryRevenueData}
                centerValue={money.format(totalRevenue)}
                centerLabel="Tổng doanh thu"
                size={180}
              />
            </article>
          </div>

          <article className="card">
            <header className="section-head">
              <h3 style={{ margin: 0 }}>Chi tiết doanh thu theo sản phẩm</h3>
            </header>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: "center" }}>STT</th>
                    <th>Sản phẩm</th>
                    <th>Loại hàng</th>
                    <th style={{ textAlign: "center" }}>Số lượng bán</th>
                    <th style={{ textAlign: "right" }}>Doanh thu</th>
                    <th style={{ textAlign: "right" }}>Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {productRevenueMap.slice(0, 15).map((p, idx) => {
                    const pct = totalRevenue > 0 ? ((p.total / totalRevenue) * 100).toFixed(1) : "0";
                    return (
                      <tr key={p.key}>
                        <td style={{ textAlign: "center", color: "#94A3B8" }}>{idx + 1}</td>
                        <td><strong>{p.name}</strong></td>
                        <td><span style={{ color: "#64748B" }}>{p.category}</span></td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{p.quantity}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }} className="tabular-nums">
                          {money.format(p.total)}
                        </td>
                        <td style={{ textAlign: "right", color: "var(--primary, #3D7068)", fontWeight: 600 }}>
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                  {!productRevenueMap.length && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#94A3B8", padding: 32 }}>
                        Chưa có hóa đơn đã thanh toán để tổng hợp chi tiết
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: BÁO CÁO NHẬP – XUẤT KHO (Reference 2 - Screen 2)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "warehouse" && (
        <>
          <div className="stats-grid">
            <StatCard
              icon={ArrowDownTrayIcon}
              label="Tổng nhập kho"
              value={totalImportUnits.toLocaleString("vi-VN")}
              theme="green"
              delta="Đơn vị sản phẩm nhập"
              deltaType="up"
            />
            <StatCard
              icon={ArrowUpTrayIcon}
              label="Tổng xuất kho"
              value={totalExportUnits.toLocaleString("vi-VN")}
              theme="amber"
              delta="Đơn vị sản phẩm xuất"
              deltaType="neutral"
            />
            <StatCard
              icon={CubeIcon}
              label="Tồn kho hiện thời"
              value={totalCurrentStockUnits.toLocaleString("vi-VN")}
              theme="red"
              delta="Tổng số lượng tại kho"
              deltaType="neutral"
            />
            <StatCard
              icon={ClockIcon}
              label="Tỷ lệ xuất/nhập"
              value={`${exportImportRatio}%`}
              theme="blue"
              delta="Hiệu suất luân chuyển"
              deltaType="up"
            />
          </div>

          <div className="report-grid-2col">
            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Biến động nhập – xuất kho</h3>
              </header>
              <LineChart
                data={warehouseTrendData}
                series={[
                  { key: "importVal", label: "Nhập kho", color: "#3D7068" },
                  { key: "exportVal", label: "Xuất kho", color: "#F59E0B" },
                ]}
                unit="SP"
                height={200}
              />
            </article>

            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Tỷ trọng theo loại giao dịch</h3>
              </header>
              <DonutChart
                data={[
                  { label: "Nhập kho", value: totalImportUnits || 1, color: "#3D7068" },
                  { label: "Xuất kho", value: totalExportUnits || 1, color: "#F59E0B" },
                ]}
                centerValue={`${(receipts.length + issues.length).toLocaleString("vi-VN")}`}
                centerLabel="Tổng giao dịch"
                unit="SP"
                size={180}
              />
            </article>
          </div>

          <article className="card">
            <header className="section-head">
              <h3 style={{ margin: 0 }}>Chi tiết giao dịch nhập – xuất gần đây</h3>
            </header>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: "center" }}>STT</th>
                    <th>Ngày</th>
                    <th>Loại giao dịch</th>
                    <th>Mã phiếu</th>
                    <th>Chi tiết / Đối tác</th>
                    <th style={{ textAlign: "center" }}>Số mặt hàng</th>
                    <th style={{ textAlign: "right" }}>Giá trị chứng từ</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseTransactions.slice(0, 15).map((t, idx) => (
                    <tr key={t.id}>
                      <td style={{ textAlign: "center", color: "#94A3B8" }}>{idx + 1}</td>
                      <td>{t.date ? String(t.date).slice(0, 10) : "—"}</td>
                      <td>
                        <Badge variant={t.badge}>{t.typeLabel}</Badge>
                      </td>
                      <td><strong>{t.code}</strong></td>
                      <td>{t.person}</td>
                      <td style={{ textAlign: "center" }}>{t.detailsCount} mặt hàng</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }} className="tabular-nums">
                        {money.format(t.total || 0)}
                      </td>
                    </tr>
                  ))}
                  {!warehouseTransactions.length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#94A3B8", padding: 32 }}>
                        Chưa có giao dịch nhập xuất nào phát sinh
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: BÁO CÁO TỒN KHO (Reference 3 - Screen 1)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <>
          <div className="stats-grid">
            <StatCard
              icon={CubeIcon}
              label="Tổng số mặt hàng"
              value={`${products.length}`}
              theme="green"
              delta="Mặt hàng SKU quản lý"
              deltaType="neutral"
            />
            <StatCard
              icon={BanknotesIcon}
              label="Tổng giá trị tồn kho"
              value={money.format(totalInventoryValue)}
              theme="green"
              delta="Tính theo giá trị nhập kho"
              deltaType="up"
            />
            <StatCard
              icon={ExclamationTriangleIcon}
              label="Tồn kho dưới mức tối thiểu"
              value={`${lowStockProductsCount}`}
              theme="red"
              delta={`Tồn kho ≤ ${LOW_STOCK_THRESHOLD}`}
              deltaType={lowStockProductsCount > 0 ? "down" : "neutral"}
            />
            <StatCard
              icon={CheckCircleIcon}
              label="Tỷ lệ hàng tồn kho"
              value={`${inStockRate}%`}
              theme="blue"
              delta="Hàng đạt mức tồn an toàn"
              deltaType="neutral"
            />
          </div>

          <div className="report-grid-2col">
            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Giá trị tồn kho theo nhóm sản phẩm</h3>
              </header>
              <VerticalBarChart
                data={categoryInventoryBarData}
                barColor="#10B981"
                height={200}
              />
            </article>

            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Tỷ lệ tồn kho theo trạng thái</h3>
              </header>
              <DonutChart
                data={inventoryStatusDonut}
                centerValue={`${products.length} SKU`}
                centerLabel="Tổng mặt hàng"
                unit="SKU"
                size={180}
              />
            </article>
          </div>

          <article className="card">
            <header className="section-head">
              <h3 style={{ margin: 0 }}>Chi tiết tồn kho</h3>
            </header>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: "center" }}>STT</th>
                    <th>Mã sản phẩm</th>
                    <th>Tên sản phẩm</th>
                    <th>Đơn vị tính</th>
                    <th style={{ textAlign: "center" }}>Tồn kho</th>
                    <th style={{ textAlign: "right" }}>Giá nhập</th>
                    <th style={{ textAlign: "right" }}>Giá trị tồn</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => {
                    const st = Number(p.stock || 0);
                    const price = Number(p.GiaNhap || p.GiaBan || 0);
                    const val = st * price;
                    return (
                      <tr key={p.id}>
                        <td style={{ textAlign: "center", color: "#94A3B8" }}>{idx + 1}</td>
                        <td><span className="prod-code-badge">{p.MaSP || p.id}</span></td>
                        <td><strong>{p.TenSP}</strong></td>
                        <td>{p.DonViTinh || "Cái"}</td>
                        <td style={{ textAlign: "center" }}>
                          <Badge variant={st <= 0 ? "red" : st <= LOW_STOCK_THRESHOLD ? "amber" : "green"}>
                            {st}
                          </Badge>
                        </td>
                        <td style={{ textAlign: "right" }} className="tabular-nums">{money.format(price)}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }} className="tabular-nums">
                          {money.format(val)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: BÁO CÁO CÔNG NỢ (Reference 3 - Screen 2)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "debts" && (
        <>
          <div className="stats-grid">
            <StatCard
              icon={DocumentTextIcon}
              label="Tổng công nợ phải thu"
              value={money.format(totalReceivable)}
              theme="blue"
              delta={`${debtorCustomersCount} khách hàng nợ`}
              deltaType="neutral"
            />
            <StatCard
              icon={CreditCardIcon}
              label="Tổng công nợ phải trả"
              value={money.format(totalPayable)}
              theme="purple"
              delta={`${debtorSuppliersCount} nhà cung cấp nợ`}
              deltaType="neutral"
            />
            <StatCard
              icon={UserGroupIcon}
              label="Số khách hàng nợ"
              value={`${debtorCustomersCount}`}
              theme="blue"
              delta="Khách hàng còn công nợ"
              deltaType="neutral"
            />
            <StatCard
              icon={BuildingStorefrontIcon}
              label="Số nhà cung cấp nợ"
              value={`${debtorSuppliersCount}`}
              theme="purple"
              delta="Nhà cung cấp cần thanh toán"
              deltaType="neutral"
            />
          </div>

          <div className="report-grid-2col">
            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Cơ cấu công nợ phải thu (Khách hàng)</h3>
              </header>
              <DonutChart
                data={customerDebtsDonut}
                centerValue={money.format(totalReceivable)}
                centerLabel="Phải thu"
                size={180}
              />
            </article>

            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Cơ cấu công nợ phải trả (Nhà cung cấp)</h3>
              </header>
              <DonutChart
                data={supplierDebtsDonut}
                centerValue={money.format(totalPayable)}
                centerLabel="Phải trả"
                size={180}
              />
            </article>
          </div>

          <div className="report-grid-2col">
            {/* Table 1: Phải thu */}
            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Chi tiết công nợ phải thu</h3>
              </header>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Hạn thanh toán</th>
                      <th style={{ textAlign: "right" }}>Số tiền</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerDebtsList.map((d) => {
                      const cust = customers.find((c) => c.id === d.MaKH || c.MaKH === d.MaKH);
                      const rem = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
                      const isPaid = rem <= 0 || d.TrangThai === "Đã thanh toán";
                      return (
                        <tr key={d.id}>
                          <td><strong>{cust?.HoTen || d.partnerName || d.MaKH || "Khách hàng"}</strong></td>
                          <td style={{ color: "#64748B", fontSize: 12 }}>{d.HanThanhToan || d.NgayPhatSinh || "—"}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }} className="tabular-nums">
                            {money.format(rem)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <Badge variant={isPaid ? "green" : "red"}>
                              {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {!customerDebtsList.length && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "#94A3B8", padding: 24 }}>
                          Không có công nợ phải thu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Table 2: Phải trả */}
            <article className="card">
              <header className="section-head">
                <h3 style={{ margin: 0 }}>Chi tiết công nợ phải trả</h3>
              </header>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Nhà cung cấp</th>
                      <th>Hạn thanh toán</th>
                      <th style={{ textAlign: "right" }}>Số tiền</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierDebtsList.map((d) => {
                      const supp = suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
                      const rem = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
                      const isPaid = rem <= 0 || d.TrangThai === "Đã thanh toán";
                      return (
                        <tr key={d.id}>
                          <td><strong>{supp?.TenNCC || d.partnerName || d.MaNCC || "Nhà cung cấp"}</strong></td>
                          <td style={{ color: "#64748B", fontSize: 12 }}>{d.HanThanhToan || d.NgayPhatSinh || "—"}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }} className="tabular-nums">
                            {money.format(rem)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <Badge variant={isPaid ? "green" : "red"}>
                              {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {!supplierDebtsList.length && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", color: "#94A3B8", padding: 24 }}>
                          Không có công nợ phải trả
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: BÁO CÁO THU – CHI TIỀN MẶT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "cash-flow" && (
        <>
          <div className="stats-grid">
            <StatCard
              icon={WalletIcon}
              label="Tồn quỹ tiền mặt hiện tại"
              value={money.format(cashFlow?.balance || 0)}
              theme="green"
              delta={cashFlow?.balance >= 0 ? "Quỹ thặng dư dương" : "Quỹ thâm hụt"}
              deltaType={cashFlow?.balance >= 0 ? "up" : "down"}
            />
            <StatCard
              icon={ArrowDownTrayIcon}
              label="Tổng thu tiền mặt"
              value={money.format(cashFlow?.totalThu || 0)}
              theme="blue"
              delta="Các phiếu thu đã ghi sổ"
              deltaType="up"
            />
            <StatCard
              icon={ArrowUpTrayIcon}
              label="Tổng chi tiền mặt"
              value={money.format(cashFlow?.totalChi || 0)}
              theme="amber"
              delta="Các phiếu chi đã ghi sổ"
              deltaType="neutral"
            />
          </div>

          <article className="card">
            <header className="section-head">
              <h3 style={{ margin: 0 }}>Sổ quỹ tiền mặt chi tiết</h3>
            </header>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: "center" }}>STT</th>
                    <th>Ngày</th>
                    <th>Số phiếu</th>
                    <th>Loại phiếu</th>
                    <th>Lý do / Người nộp – nhận</th>
                    <th style={{ textAlign: "right" }}>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(cashFlow?.entries || []).map((entry, idx) => (
                    <tr key={entry.id || idx}>
                      <td style={{ textAlign: "center", color: "#94A3B8" }}>{idx + 1}</td>
                      <td>{entry.date ? String(entry.date).slice(0, 10) : "—"}</td>
                      <td><strong>{entry.code || entry.number}</strong></td>
                      <td>
                        <Badge variant={entry.type === "thu" ? "green" : "amber"}>
                          {entry.type === "thu" ? "Thu tiền" : "Chi tiền"}
                        </Badge>
                      </td>
                      <td>{entry.reason || entry.person || "—"}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 600,
                          color: entry.type === "thu" ? "#059669" : "#D97706",
                        }}
                        className="tabular-nums"
                      >
                        {entry.type === "thu" ? "+" : "-"}{money.format(entry.amount || 0)}
                      </td>
                    </tr>
                  ))}
                  {(!cashFlow?.entries || !cashFlow.entries.length) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#94A3B8", padding: 32 }}>
                        Chưa có phát sinh thu chi tiền mặt trong kỳ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    </section>
  );
}
