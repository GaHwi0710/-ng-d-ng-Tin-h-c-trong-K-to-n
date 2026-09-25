import { useState, useEffect, useMemo } from "react";
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PrinterIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CreditCardIcon,
  CubeIcon,
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
import { exportToExcel, exportToPdf } from "../../lib/exportUtils.js";
import { LOW_STOCK_THRESHOLD } from "../../lib/constants.js";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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
  const [receipts, setReceipts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [debts, setDebts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [cashFlow, setCashFlow] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [printing, setPrinting] = useState(null);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);
  const [fetching, setFetching] = useState(false);

  // Comprehensive Filter States (Requirement F1)
  const initialPresetDates = getPresetDates("thisMonth");
  const [datePreset, setDatePreset] = useState("thisMonth");
  const [dateFrom, setDateFrom] = useState(initialPresetDates.from);
  const [dateTo, setDateTo] = useState(initialPresetDates.to);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKey, setFilterKey] = useState(0);

  // Báo cáo doanh thu theo Ngày / Tháng / Năm
  const [revenueGroupBy, setRevenueGroupBy] = useState("day"); // "day" | "month" | "year"
  const [selectedRevenueYear, setSelectedRevenueYear] = useState(new Date().getFullYear().toString());

  function handlePresetChange(preset) {
    setDatePreset(preset);
    const dates = getPresetDates(preset);
    setDateFrom(dates.from);
    setDateTo(dates.to);
    setFilterKey((k) => k + 1);
  }

  function handleResetFilters() {
    setDatePreset("thisMonth");
    const dates = getPresetDates("thisMonth");
    setDateFrom(dates.from);
    setDateTo(dates.to);
    setFilterCategory("all");
    setFilterProduct("all");
    setFilterSupplier("all");
    setFilterCustomer("all");
    setFilterStatus("all");
    setRevenueGroupBy("day");
    setSelectedRevenueYear(new Date().getFullYear().toString());
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
    const qs = params.toString() ? `?${params}` : "";

    const revParams = new URLSearchParams(params);
    revParams.set("groupBy", revenueGroupBy);
    if (revenueGroupBy === "month" && selectedRevenueYear) {
      revParams.set("year", selectedRevenueYear);
    }
    const revQs = revParams.toString() ? `?${revParams}` : "";

    Promise.allSettled([
      getReport(`revenue${revQs}`),
      getReport(`debts${qs}`),
      getReport(`inventory${qs}`),
      listRecords("products"),
      listRecords("goods-receipts"),
      listRecords("goods-issues"),
      listRecords("debts"),
      listRecords("invoices"),
      listRecords("sales-orders"),
      getReport(`cash-flow${qs}`),
      listRecords("customers"),
      listRecords("suppliers"),
      listRecords("product-categories"),
      getReport(`warehouse${qs}`),
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
        warehouseReport,
      ]) => {
        const errors = [];
        const isRealError = (r) => r.status === "rejected" && r.reason?.status !== 403;
        if (isRealError(revenue)) errors.push("Báo cáo doanh thu");
        if (isRealError(debtsReport)) errors.push("Báo cáo công nợ");
        if (isRealError(inventory)) errors.push("Báo cáo tồn kho");
        if (isRealError(cf)) errors.push("Báo cáo thu chi");
        if (isRealError(warehouseReport)) errors.push("Báo cáo nhập xuất");
        setLoadErrors(errors);

        setData({
          revenue:
            revenue.status === "fulfilled"
              ? revenue.value
              : { total: 0, orders: 0, weekly: [], data: [] },
          debts:
            debtsReport.status === "fulfilled"
              ? debtsReport.value
              : { total: 0, totalPayable: 0, totalReceivable: 0, debtorCustomersCount: 0, debtorSuppliersCount: 0, customerDebts: [], supplierDebts: [], data: [] },
          inventory:
            inventory.status === "fulfilled"
              ? inventory.value
              : { data: [], totalProducts: 0, totalInventoryValue: 0, lowStockCount: 0, inStockRate: 100 },
          warehouse:
            warehouseReport.status === "fulfilled"
              ? warehouseReport.value
              : { totalImportUnits: 0, totalExportUnits: 0, totalImportValue: 0, totalExportValue: 0, exportImportRatio: 0, transactions: [], trend: [] },
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
  }, [filterKey, dateFrom, dateTo, filterCategory, filterProduct, filterSupplier, filterCustomer, filterStatus, revenueGroupBy, selectedRevenueYear]);

  async function handlePrint(type) {
    if (!data) return;
    setPrinting(type);
    setPrintMenuOpen(false);
    try {
      const { printReport } = await import("../../lib/reportPrint.js");
      switch (type) {
        case "revenue":
          printReport("revenue", {
            revenueData: data?.revenue,
            invoices: revenueInvoices,
            salesOrders,
            dateFrom,
            dateTo,
          });
          break;
        case "inventory":
          printReport("inventory", {
            products: inventoryProducts,
            dateFrom: dateFrom || data?.inventory?.from,
            dateTo: dateTo || data?.inventory?.to,
            summary: {
              totalBeginningStock,
              totalImportStock,
              totalExportStock,
              totalEndingStock,
              totalInventoryValue,
            },
          });
          break;
        case "warehouse":
          printReport("warehouse", { receipts, issues, dateFrom, dateTo });
          break;
        case "debts":
          printReport("debts", {
            debts,
            customerDebts: customerDebtsList,
            supplierDebts: supplierDebtsList,
            customers,
            suppliers,
            dateFrom,
            dateTo,
          });
          break;
        case "cash-flow":
          printReport("cash-flow", {
            cashFlow,
            invoices: revenueInvoices,
            receipts,
            dateFrom,
            dateTo,
          });
          break;
      }
    } catch (err) {
      toast("Không mở được cửa sổ in. Vui lòng kiểm tra chặn pop-up của trình duyệt.");
      console.error(err);
    } finally {
      setTimeout(() => setPrinting(null), 1200);
    }
  }

  // --- REVENUE DATA PREPARATION (Reference 2 - Screen 1) ---
  const revenueInvoices = useMemo(() => {
    if (data?.revenue?.data && Array.isArray(data.revenue.data) && data.revenue.data.length > 0) {
      return data.revenue.data;
    }
    return invoices.filter((inv) => inv.TrangThai !== "Đã hủy");
  }, [data?.revenue?.data, invoices]);

  const totalRevenue = data?.revenue?.total !== undefined ? data.revenue.total : revenueInvoices.reduce((s, i) => s + Number(i.TongTien || 0), 0);
  const totalPaid = data?.revenue?.totalPaid !== undefined ? data.revenue.totalPaid : revenueInvoices.reduce((s, i) => s + Number(i.SoTienDaTra ?? (i.TrangThai === "Đã thanh toán" ? i.TongTien : 0)), 0);
  const totalUnpaid = data?.revenue?.totalUnpaid !== undefined ? data.revenue.totalUnpaid : (totalRevenue - totalPaid);
  const totalOrdersCount = data?.revenue?.orders !== undefined ? data.revenue.orders : revenueInvoices.length;
  const avgRevenuePerOrder = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const paidInvoiceRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 100;

  const revenueBreakdown = useMemo(() => {
    return data?.revenue?.breakdown || [];
  }, [data?.revenue?.breakdown]);

  // Revenue by product & category
  const productRevenueMap = useMemo(() => {
    const map = new Map();
    for (const inv of revenueInvoices) {
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
  }, [revenueInvoices]);

  // Categories Donut Data
  const categoryRevenueData = useMemo(() => {
    const catMap = new Map();
    for (const p of productRevenueMap) {
      catMap.set(p.category, (catMap.get(p.category) || 0) + p.total);
    }
    return [...catMap.entries()].map(([label, value]) => ({ label, value }));
  }, [productRevenueMap]);

  // Revenue Line / Trend Data
  const revenueChartData = useMemo(() => {
    if (revenueBreakdown.length > 0) {
      return revenueBreakdown.map((b) => ({
        label: b.label ? b.label.replace("Tháng ", "T").replace("Năm ", "") : b.period,
        value: b.revenue || 0,
      }));
    }
    if (data?.revenue?.weekly && data.revenue.weekly.length > 0) {
      return data.revenue.weekly.map((w) => ({
        label: w.date ? w.date.slice(5).replace("-", "/") : "",
        value: w.total || 0,
      }));
    }
    return [];
  }, [revenueBreakdown, data?.revenue?.weekly]);

  // --- WAREHOUSE DATA PREPARATION (Reference 2 - Screen 2) ---
  const totalImportUnits = data?.warehouse?.totalImportUnits !== undefined
    ? data.warehouse.totalImportUnits
    : receipts.reduce((sum, rec) => sum + (rec.details || []).reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0), 0);

  const totalExportUnits = data?.warehouse?.totalExportUnits !== undefined
    ? data.warehouse.totalExportUnits
    : issues.reduce((sum, iss) => sum + (iss.details || []).reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0), 0);

  const totalCurrentStockUnits = data?.warehouse?.totalCurrentStockUnits !== undefined
    ? data.warehouse.totalCurrentStockUnits
    : products.reduce((sum, p) => sum + Number(p.stock || 0), 0);

  const exportImportRatio = data?.warehouse?.exportImportRatio !== undefined
    ? data.warehouse.exportImportRatio
    : (totalImportUnits > 0 ? ((totalExportUnits / totalImportUnits) * 100).toFixed(1) : "0");

  // Combined transactions
  const warehouseTransactions = useMemo(() => {
    if (data?.warehouse?.transactions && Array.isArray(data.warehouse.transactions) && data.warehouse.transactions.length > 0) {
      return data.warehouse.transactions;
    }
    const list = [
      ...receipts.map((r) => ({
        id: r.id || r.MaPN,
        type: "import",
        typeLabel: "Nhập kho",
        badge: "green",
        code: r.MaPN || r.id,
        date: r.NgayNhap || r.createdAt,
        detailsCount: (r.details || []).length,
        person: r.TenNCC || r.NguoiLienQuan || r.NguoiLap || "Nhân viên kho",
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
  }, [data?.warehouse?.transactions, receipts, issues]);

  // Warehouse timeline line chart data
  const warehouseTrendData = useMemo(() => {
    if (data?.warehouse?.trend && Array.isArray(data.warehouse.trend) && data.warehouse.trend.length > 0) {
      return data.warehouse.trend;
    }
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
  }, [data?.warehouse?.trend, receipts, issues]);

  // --- INVENTORY DATA PREPARATION (Reference 3 - Screen 1) ---
  const inventoryProducts = useMemo(() => {
    if (data?.inventory?.data && Array.isArray(data.inventory.data)) {
      return data.inventory.data;
    }
    return products;
  }, [data?.inventory?.data, products]);

  const totalInventoryValue = data?.inventory?.totalInventoryValue !== undefined
    ? data.inventory.totalInventoryValue
    : inventoryProducts.reduce((sum, p) => {
        const price = Number(p.GiaNhap || p.GiaBan || 0);
        return sum + Number(p.TonCuoi ?? p.stock ?? 0) * price;
      }, 0);

  const totalBeginningStock = data?.inventory?.totalBeginningStock !== undefined
    ? data.inventory.totalBeginningStock
    : inventoryProducts.reduce((sum, p) => sum + Number(p.TonDau || 0), 0);

  const totalImportStock = data?.inventory?.totalImportStock !== undefined
    ? data.inventory.totalImportStock
    : inventoryProducts.reduce((sum, p) => sum + Number(p.NhapTrongKy || 0), 0);

  const totalExportStock = data?.inventory?.totalExportStock !== undefined
    ? data.inventory.totalExportStock
    : inventoryProducts.reduce((sum, p) => sum + Number(p.XuatTrongKy || 0), 0);

  const totalEndingStock = data?.inventory?.totalEndingStock !== undefined
    ? data.inventory.totalEndingStock
    : inventoryProducts.reduce((sum, p) => sum + Number(p.TonCuoi ?? p.stock ?? 0), 0);

  const lowStockProductsCount = data?.inventory?.lowStockCount !== undefined
    ? data.inventory.lowStockCount
    : inventoryProducts.filter((p) => Number(p.TonCuoi ?? p.stock ?? 0) <= LOW_STOCK_THRESHOLD).length;

  const inStockRate = data?.inventory?.inStockRate !== undefined
    ? data.inventory.inStockRate
    : (inventoryProducts.length > 0 ? Math.round(((inventoryProducts.length - lowStockProductsCount) / inventoryProducts.length) * 100) : 100);

  // Inventory value by category bar chart
  const categoryInventoryBarData = useMemo(() => {
    const map = new Map();
    for (const p of inventoryProducts) {
      const cat = p.LoaiHang || "Khác";
      const val = Number(p.TonCuoi ?? p.stock ?? 0) * Number(p.GiaNhap || p.GiaBan || 0);
      map.set(cat, (map.get(cat) || 0) + val);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [inventoryProducts]);

  // Inventory status Donut
  const inventoryStatusDonut = useMemo(() => {
    const inStockCount = Math.max(0, inventoryProducts.length - lowStockProductsCount);
    return [
      { label: "Còn hàng", value: inStockCount, color: "#10B981" },
      { label: "Sắp hết hàng", value: lowStockProductsCount, color: "#F59E0B" },
    ];
  }, [inventoryProducts, lowStockProductsCount]);

  // --- DEBTS DATA PREPARATION (Reference 3 - Screen 2) ---
  const customerDebtsList = useMemo(() => {
    if (data?.debts?.customerDebts && Array.isArray(data.debts.customerDebts)) {
      return data.debts.customerDebts;
    }
    return debts.filter((d) => d.type === "customers" || !!d.MaKH);
  }, [data?.debts?.customerDebts, debts]);

  const supplierDebtsList = useMemo(() => {
    if (data?.debts?.supplierDebts && Array.isArray(data.debts.supplierDebts)) {
      return data.debts.supplierDebts;
    }
    return debts.filter((d) => d.type === "suppliers" || !!d.MaNCC);
  }, [data?.debts?.supplierDebts, debts]);

  const totalReceivable = data?.debts?.totalReceivable !== undefined
    ? data.debts.totalReceivable
    : customerDebtsList.reduce((sum, d) => sum + Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0), 0);

  const totalPayable = data?.debts?.totalPayable !== undefined
    ? data.debts.totalPayable
    : supplierDebtsList.reduce((sum, d) => sum + Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0), 0);

  const debtorCustomersCount = data?.debts?.debtorCustomersCount !== undefined
    ? data.debts.debtorCustomersCount
    : new Set(customerDebtsList.map((d) => d.MaKH || d.partnerId).filter(Boolean)).size;

  const debtorSuppliersCount = data?.debts?.debtorSuppliersCount !== undefined
    ? data.debts.debtorSuppliersCount
    : new Set(supplierDebtsList.map((d) => d.MaNCC || d.partnerId).filter(Boolean)).size;

  // Debts Customer Donut
  const customerDebtsDonut = useMemo(() => {
    const list = customerDebtsList.map((d) => {
      const cust = customers.find((c) => c.id === d.MaKH || c.MaKH === d.MaKH);
      const name = d.partnerName || cust?.HoTen || d.MaKH || "Khách hàng";
      const remaining = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
      return { label: name, value: remaining };
    }).filter((x) => x.value > 0);
    return list.slice(0, 5);
  }, [customerDebtsList, customers]);

  // Debts Supplier Donut
  const supplierDebtsDonut = useMemo(() => {
    const list = supplierDebtsList.map((d) => {
      const supp = suppliers.find((s) => s.id === d.MaNCC || s.MaNCC === d.MaNCC);
      const name = d.partnerName || supp?.TenNCC || d.MaNCC || "Nhà cung cấp";
      const remaining = Number(d.SoTienConLai ?? (d.SoTien - (d.SoTienDaTra || 0)) ?? 0);
      return { label: name, value: remaining };
    }).filter((x) => x.value > 0);
    return list.slice(0, 5);
  }, [supplierDebtsList, suppliers]);

  if (!data) {
    return (
      <section aria-labelledby="report-heading">
        <header className="page-header">
          <hgroup>
            <h1 id="report-heading">Báo cáo &amp; Phân tích Kinh doanh</h1>
            <p>Đang tải dữ liệu báo cáo thời gian thực từ máy chủ...</p>
          </hgroup>
        </header>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  const tabLabels = {
    revenue: { title: "Báo cáo doanh thu", desc: "Theo dõi doanh thu theo thời gian, sản phẩm, kênh bán hàng" },
    warehouse: { title: "Báo cáo nhập – xuất kho", desc: "Theo dõi số lượng, giá trị nhập và xuất kho theo thời gian" },
    inventory: { title: "Báo cáo tồn kho", desc: "Tình hình tồn kho hiện tại của tất cả sản phẩm" },
    debts: { title: "Báo cáo công nợ", desc: "Tình hình công nợ phải thu và phải trả" },
    "cash-flow": { title: "Báo cáo thu – chi", desc: "Theo dõi dòng tiền thu, chi và tồn quỹ theo kỳ kế toán" },
  };

  function handleExportData() {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (activeTab === "revenue") {
      const headers = ["STT", "Thời gian", "Số hóa đơn", "Doanh thu (đ)", "Đã thanh toán (đ)", "Còn nợ (đ)", "Tỷ trọng (%)"];
      const rows = revenueBreakdown.map((item, idx) => [
        idx + 1,
        item.period,
        item.ordersCount,
        item.revenue,
        item.paid,
        item.unpaid,
        totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) + "%" : "0%",
      ]);
      const summary = ["Tổng cộng", `Toàn kỳ (${revenueBreakdown.length} kỳ)`, totalOrdersCount, totalRevenue, totalPaid, totalUnpaid, "100%"];
      exportToExcel(`DoanhThu_${todayStr}`, `BÁO CÁO TỔNG HỢP DOANH THU THEO KỲ (${dateFrom} - ${dateTo})`, headers, rows, summary);
      toast("Đã xuất file Excel Báo cáo Doanh thu thành công");
    } else if (activeTab === "inventory") {
      const headers = ["STT", "Mã SP", "Tên sản phẩm", "Loại hàng", "ĐVT", "Tồn đầu", "Nhập trong kỳ", "Xuất trong kỳ", "Tồn cuối", "Đơn giá vốn", "Giá trị tồn kho"];
      const rows = inventoryProducts.map((p, idx) => [
        idx + 1,
        p.MaSP || p.code || "—",
        p.TenSP || p.name || "—",
        p.LoaiHang || "—",
        p.DonViTinh || p.DVT || "Cái",
        p.TonDau ?? 0,
        p.NhapTrongKy ?? 0,
        p.XuatTrongKy ?? 0,
        p.TonCuoi ?? p.stock ?? 0,
        p.GiaNhap || 0,
        (p.TonCuoi ?? p.stock ?? 0) * (p.GiaNhap || 0),
      ]);
      const summary = ["Tổng cộng", "", `${inventoryProducts.length} mặt hàng`, "", "", totalBeginningStock, totalImportStock, totalExportStock, totalEndingStock, "", totalInventoryValue];
      exportToExcel(`TonKho_${todayStr}`, `BÁO CÁO TỔNG HỢP TỒN KHO THEO KỲ (${dateFrom} - ${dateTo})`, headers, rows, summary);
      toast("Đã xuất file Excel Báo cáo Tồn kho thành công");
    } else if (activeTab === "debts") {
      const headers = ["Mã đối tượng", "Tên đối tượng", "Loại công nợ", "Số tiền (đ)", "Đã thanh toán (đ)", "Còn lại (đ)", "Trạng thái"];
      const allDebts = [...(customerDebtsList || []), ...(supplierDebtsList || [])];
      const rows = allDebts.map((d) => [
        d.MaKHCode || d.MaNCCCode || "—",
        d.TenKH || d.TenNCC || "—",
        d.LoaiCongNo || "—",
        d.SoTien || 0,
        d.SoTienDaTra || 0,
        d.SoTienConLai || 0,
        d.TrangThai || "—",
      ]);
      exportToExcel(`CongNo_${todayStr}`, `BÁO CÁO CÔNG NỢ CHI TIẾT (${dateFrom} - ${dateTo})`, headers, rows);
      toast("Đã xuất file Excel Báo cáo Công nợ thành công");
    } else if (activeTab === "warehouse") {
      const headers = ["STT", "Mã chứng từ", "Loại", "Ngày lập", "Người liên quan", "Số SP", "Tổng tiền (đ)"];
      const rows = warehouseTransactions.map((tx, idx) => [
        idx + 1,
        tx.code || tx.id || "—",
        tx.typeLabel || (tx.type === "import" ? "Nhập kho" : "Xuất kho"),
        tx.date ? String(tx.date).slice(0, 10) : "—",
        tx.person || "—",
        tx.detailsCount || 0,
        tx.total || 0,
      ]);
      const totalWarehouseVal = warehouseTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
      const summary = ["Tổng cộng", `${warehouseTransactions.length} chứng từ`, "", "", "", "", totalWarehouseVal];
      exportToExcel(`ChungTuKho_${todayStr}`, `BÁO CÁO NHẬP - XUẤT KHO (${dateFrom} - ${dateTo})`, headers, rows, summary);
      toast("Đã xuất file Excel Báo cáo Nhập - Xuất kho thành công");
    } else {
      toast("Đã sẵn sàng xuất dữ liệu cho phân hệ này");
    }
  }

  async function handleExportPdf() {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      toast("Đang khởi tạo file PDF...");
      if (activeTab === "revenue") {
        const headers = ["STT", "Thời gian", "Số HĐ", "Doanh thu (đ)", "Đã thu (đ)", "Còn nợ (đ)", "Tỷ trọng"];
        const rows = revenueBreakdown.map((item, idx) => [
          idx + 1,
          item.period,
          item.ordersCount,
          item.revenue,
          item.paid,
          item.unpaid,
          totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) + "%" : "0%",
        ]);
        const summary = ["Tổng cộng", `Toàn kỳ (${revenueBreakdown.length} kỳ)`, totalOrdersCount, totalRevenue, totalPaid, totalUnpaid, "100%"];
        await exportToPdf(`BaoCaoDoanhThu_${todayStr}.pdf`, `BÁO CÁO TỔNG HỢP DOANH THU THEO KỲ (${dateFrom} - ${dateTo})`, headers, rows, summary);
        toast("Đã xuất file PDF Báo cáo Doanh thu thành công!");
      } else if (activeTab === "inventory") {
        const headers = ["STT", "Mã SP", "Tên sản phẩm", "ĐVT", "Tồn đầu", "Nhập kỳ", "Xuất kỳ", "Tồn cuối", "Giá vốn (đ)", "Trị giá tồn (đ)"];
        const rows = inventoryProducts.map((p, idx) => [
          idx + 1,
          p.MaSP || p.code || "—",
          p.TenSP || p.name || "—",
          p.DonViTinh || p.DVT || "Cái",
          p.TonDau ?? 0,
          p.NhapTrongKy ?? 0,
          p.XuatTrongKy ?? 0,
          p.TonCuoi ?? p.stock ?? 0,
          p.GiaNhap || 0,
          (p.TonCuoi ?? p.stock ?? 0) * (p.GiaNhap || 0),
        ]);
        const summary = ["Tổng cộng", "", `${inventoryProducts.length} mặt hàng`, "", totalBeginningStock, totalImportStock, totalExportStock, totalEndingStock, "", totalInventoryValue];
        await exportToPdf(`BaoCaoTonKho_${todayStr}.pdf`, `BÁO CÁO TỔNG HỢP TỒN KHO THEO KỲ (${dateFrom} - ${dateTo})`, headers, rows, summary);
        toast("Đã xuất file PDF Báo cáo Tồn kho thành công!");
      } else if (activeTab === "warehouse") {
        const headers = ["STT", "Mã chứng từ", "Loại", "Ngày lập", "Người liên quan", "Số SP", "Tổng tiền (đ)"];
        const rows = warehouseTransactions.map((tx, idx) => [
          idx + 1,
          tx.code || tx.id || "—",
          tx.typeLabel || (tx.type === "import" ? "Nhập kho" : "Xuất kho"),
          tx.date ? String(tx.date).slice(0, 10) : "—",
          tx.person || "—",
          tx.detailsCount || 0,
          tx.total || 0,
        ]);
        const totalWarehouseVal = warehouseTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
        const summary = ["Tổng cộng", `${warehouseTransactions.length} chứng từ`, "", "", "", "", totalWarehouseVal];
        await exportToPdf(`BaoCaoNhapXuat_${todayStr}.pdf`, `BÁO CÁO NHẬP - XUẤT KHO (${dateFrom} - ${dateTo})`, headers, rows, summary);
        toast("Đã xuất file PDF Báo cáo Nhập - Xuất kho thành công!");
      } else if (activeTab === "debts") {
        const headers = ["Mã ĐT", "Tên đối tượng", "Loại nợ", "Tổng nợ (đ)", "Đã trả (đ)", "Còn nợ (đ)", "Trạng thái"];
        const allDebts = [...(customerDebtsList || []), ...(supplierDebtsList || [])];
        const rows = allDebts.map((d) => [
          d.MaKHCode || d.MaNCCCode || "—",
          d.TenKH || d.TenNCC || "—",
          d.LoaiCongNo || "—",
          d.SoTien || 0,
          d.SoTienDaTra || 0,
          d.SoTienConLai || 0,
          d.TrangThai || "—",
        ]);
        await exportToPdf(`BaoCaoCongNo_${todayStr}.pdf`, `BÁO CÁO CÔNG NỢ CHI TIẾT (${dateFrom} - ${dateTo})`, headers, rows);
        toast("Đã xuất file PDF Báo cáo Công nợ thành công!");
      } else {
        toast("Đã sẵn sàng xuất PDF cho phân hệ này");
      }
    } catch (err) {
      toast("Lỗi xuất PDF: " + err.message);
    }
  }

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

        {/* Action Buttons: Export Excel + Export PDF + Print A4 */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={handleExportData}
            title="Xuất bảng dữ liệu hiện tại ra Excel (.xls)"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <ArrowDownTrayIcon style={{ width: 16, height: 16, color: "var(--primary)" }} aria-hidden="true" />
            <span>Xuất Excel</span>
          </button>

          <button
            className="btn btn-outline"
            type="button"
            onClick={handleExportPdf}
            title="Tải trực tiếp file báo cáo PDF (.pdf)"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <DocumentTextIcon style={{ width: 16, height: 16, color: "var(--primary)" }} aria-hidden="true" />
            <span>Xuất PDF</span>
          </button>

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
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#fff",
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

          <div className="erp-date-range">
            <CalendarDaysIcon aria-hidden="true" />
            <span className="date-label">Từ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset("custom");
              }}
              title="Từ ngày"
            />
            <span className="date-sep">–</span>
            <span className="date-label">Đến:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset("custom");
              }}
              title="Đến ngày"
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
              className="filter-select"
              style={{ maxWidth: 170 }}
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
              className="filter-select"
              style={{ maxWidth: 180 }}
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
              className="filter-select"
              style={{ maxWidth: 170 }}
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
              className="filter-select"
              style={{ maxWidth: 170 }}
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
              className="filter-select"
              style={{ maxWidth: 160 }}
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
          TAB 1: BÁO CÁO DOANH THU (Theo Ngày / Tháng / Năm)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "revenue" && (
        <>
          {/* Mode Switcher */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                📊 Chế độ tổng hợp doanh thu:
              </span>
              {[
                { id: "day", label: "📅 Theo ngày", desc: "Chi tiết theo từng ngày phát sinh" },
                { id: "month", label: "📆 Theo tháng", desc: "Tổng hợp 12 tháng trong năm" },
                { id: "year", label: "🗓️ Theo năm", desc: "Tổng hợp so sánh qua các năm" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`btn btn-sm ${revenueGroupBy === m.id ? "btn-primary" : "btn-outline"}`}
                  style={{
                    padding: "5px 14px",
                    fontSize: 12.5,
                    fontWeight: revenueGroupBy === m.id ? 700 : 500,
                    borderRadius: 6,
                  }}
                  onClick={() => {
                    setRevenueGroupBy(m.id);
                  }}
                  title={m.desc}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {revenueGroupBy === "month" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Năm báo cáo:</label>
                <select
                  value={selectedRevenueYear}
                  onChange={(e) => {
                    setSelectedRevenueYear(e.target.value);
                  }}
                  style={{ padding: "4px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", fontWeight: 600 }}
                >
                  {["2024", "2025", "2026", "2027"].map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="stats-grid">
            <StatCard
              icon={BanknotesIcon}
              label="Tổng doanh thu"
              value={money.format(totalRevenue)}
              theme="gold"
              delta="Hóa đơn bán hàng hợp lệ"
              deltaType="up"
            />
            <StatCard
              icon={CheckCircleIcon}
              label="Đã thu tiền"
              value={money.format(totalPaid)}
              theme="green"
              delta={`${paidInvoiceRate}% trên tổng doanh thu`}
              deltaType="up"
            />
            <StatCard
              icon={ClockIcon}
              label="Chưa thanh toán / Nợ"
              value={money.format(totalUnpaid)}
              theme={totalUnpaid > 0 ? "danger" : "blue"}
              delta={totalUnpaid > 0 ? "Công nợ khách hàng" : "Không có nợ đọng"}
              deltaType={totalUnpaid > 0 ? "down" : "neutral"}
            />
            <StatCard
              icon={DocumentTextIcon}
              label="Số hóa đơn"
              value={totalOrdersCount.toLocaleString("vi-VN")}
              theme="blue"
              delta={`TB ${money.format(avgRevenuePerOrder)} / đơn`}
              deltaType="neutral"
            />
          </div>

          <div className="report-grid-2col">
            <article className="card">
              <header className="section-head">
                <div>
                  <h3 style={{ margin: 0 }}>
                    Biểu đồ doanh thu {revenueGroupBy === "year" ? "theo năm" : revenueGroupBy === "month" ? `theo tháng (${selectedRevenueYear})` : "theo ngày"}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                    Diễn biến doanh thu thực tế qua các mốc thời gian
                  </p>
                </div>
              </header>
              <LineChart
                data={revenueChartData}
                series={[{ key: "value", label: "Doanh thu", color: "#3D7068" }]}
                height={220}
              />
            </article>

            <article className="card">
              <header className="section-head">
                <div>
                  <h3 style={{ margin: 0 }}>Doanh thu theo nhóm sản phẩm</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748B" }}>
                    Cơ cấu đóng góp của từng loại hàng
                  </p>
                </div>
              </header>
              <DonutChart
                data={categoryRevenueData}
                centerValue={money.format(totalRevenue)}
                centerLabel="Tổng doanh thu"
                size={180}
              />
            </article>
          </div>

          {/* BẢNG TỔNG HỢP DOANH THU THEO KỲ */}
          <article className="card" style={{ marginBottom: 18 }}>
            <header className="section-head">
              <div>
                <h3 style={{ margin: 0 }}>
                  Bảng tổng hợp doanh thu {revenueGroupBy === "year" ? "theo năm" : revenueGroupBy === "month" ? `theo tháng (${selectedRevenueYear})` : "theo ngày"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#64748B" }}>
                  Tổng hợp doanh thu, tình trạng thu tiền và tỷ trọng đóng góp theo kỳ
                </p>
              </div>
              <span className="badge-count">{revenueBreakdown.length} kỳ</span>
            </header>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: "center" }}>STT</th>
                    <th>Thời gian ({revenueGroupBy === "year" ? "Năm" : revenueGroupBy === "month" ? "Tháng" : "Ngày"})</th>
                    <th style={{ textAlign: "center", width: 90 }}>Số HĐ</th>
                    <th style={{ textAlign: "right" }}>Doanh thu</th>
                    <th style={{ textAlign: "right" }}>Đã thanh toán</th>
                    <th style={{ textAlign: "right" }}>Còn nợ</th>
                    <th style={{ textAlign: "right", width: 90 }}>Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueBreakdown.map((row, idx) => (
                    <tr key={row.period}>
                      <td style={{ textAlign: "center", color: "#94A3B8" }}>{idx + 1}</td>
                      <td><strong>{row.label || row.period}</strong></td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{row.ordersCount}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }} className="tabular-nums">
                        {money.format(row.revenue)}
                      </td>
                      <td style={{ textAlign: "right", color: "#059669", fontWeight: 600 }} className="tabular-nums">
                        {money.format(row.paidAmount)}
                      </td>
                      <td style={{ textAlign: "right", color: row.unpaidAmount > 0 ? "#DC2626" : "#64748B", fontWeight: 600 }} className="tabular-nums">
                        {money.format(row.unpaidAmount)}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--primary, #3D7068)", fontWeight: 700 }}>
                        {row.percentage}%
                      </td>
                    </tr>
                  ))}
                  {!revenueBreakdown.length && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "#94A3B8", padding: 32 }}>
                        Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn
                      </td>
                    </tr>
                  )}
                </tbody>
                {revenueBreakdown.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#F8FAFC", fontWeight: 700 }}>
                      <td colSpan={2} style={{ textAlign: "right" }}>Tổng cộng:</td>
                      <td style={{ textAlign: "center" }}>{totalOrdersCount}</td>
                      <td style={{ textAlign: "right" }} className="tabular-nums">{money.format(totalRevenue)}</td>
                      <td style={{ textAlign: "right", color: "#059669" }} className="tabular-nums">{money.format(totalPaid)}</td>
                      <td style={{ textAlign: "right", color: totalUnpaid > 0 ? "#DC2626" : "#64748B" }} className="tabular-nums">{money.format(totalUnpaid)}</td>
                      <td style={{ textAlign: "right", color: "var(--primary, #3D7068)" }}>100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </article>

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
              value={`${inventoryProducts.length}`}
              theme="green"
              delta="Mặt hàng SKU hiển thị"
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
                centerValue={`${inventoryProducts.length} SKU`}
                centerLabel="Tổng mặt hàng"
                unit="SKU"
                size={180}
              />
            </article>
          </div>

          <article className="card">
            <header className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>Báo cáo tổng hợp Nhập – Xuất – Tồn kho</h3>
                <small style={{ color: "#64748B", fontSize: 12.5 }}>
                  Kỳ báo cáo: Từ {dateFrom || data?.inventory?.from || "đầu tháng"} đến {dateTo || data?.inventory?.to || "hiện tại"} · Đẳng thức: Tồn cuối = Tồn đầu + Nhập trong kỳ - Xuất trong kỳ
                </small>
              </div>
              <span className="badge-count">{inventoryProducts.length} mặt hàng</span>
            </header>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 44, textAlign: "center" }}>STT</th>
                    <th style={{ width: 95 }}>Mã SP</th>
                    <th>Tên sản phẩm</th>
                    <th style={{ width: 70, textAlign: "center" }}>ĐVT</th>
                    <th style={{ textAlign: "right", minWidth: 85 }}>Tồn đầu</th>
                    <th style={{ textAlign: "right", minWidth: 95 }}>Nhập trong kỳ</th>
                    <th style={{ textAlign: "right", minWidth: 95 }}>Xuất trong kỳ</th>
                    <th style={{ textAlign: "right", minWidth: 85 }}>Tồn cuối</th>
                    <th style={{ textAlign: "right", minWidth: 105 }}>Giá nhập</th>
                    <th style={{ textAlign: "right", minWidth: 120 }}>Giá trị tồn</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryProducts.map((p, idx) => {
                    const tonDau = Number(p.TonDau ?? (p.stock || 0));
                    const nhap = Number(p.NhapTrongKy || 0);
                    const xuat = Number(p.XuatTrongKy || 0);
                    const tonCuoi = Number(p.TonCuoi ?? p.stock ?? 0);
                    const price = Number(p.GiaNhap || p.GiaBan || 0);
                    const val = Number(p.GiaTriTon !== undefined ? p.GiaTriTon : tonCuoi * price);
                    return (
                      <tr key={p.id || p.MaSP || idx}>
                        <td style={{ textAlign: "center", color: "#94A3B8" }}>{idx + 1}</td>
                        <td><span className="prod-code-badge">{p.MaSP || p.id}</span></td>
                        <td><strong>{p.TenSP}</strong></td>
                        <td style={{ textAlign: "center" }}>{p.DonViTinh || "Cái"}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }} className="tabular-nums">
                          {tonDau.toLocaleString("vi-VN")}
                        </td>
                        <td style={{ textAlign: "right", color: nhap > 0 ? "#16A34A" : "#64748B", fontWeight: nhap > 0 ? 600 : 400 }} className="tabular-nums">
                          {nhap > 0 ? `+${nhap.toLocaleString("vi-VN")}` : "0"}
                        </td>
                        <td style={{ textAlign: "right", color: xuat > 0 ? "#DC2626" : "#64748B", fontWeight: xuat > 0 ? 600 : 400 }} className="tabular-nums">
                          {xuat > 0 ? `-${xuat.toLocaleString("vi-VN")}` : "0"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Badge variant={tonCuoi <= 0 ? "red" : tonCuoi <= LOW_STOCK_THRESHOLD ? "amber" : "green"}>
                            {tonCuoi.toLocaleString("vi-VN")}
                          </Badge>
                        </td>
                        <td style={{ textAlign: "right" }} className="tabular-nums">{money.format(price)}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--primary, #3D7068)" }} className="tabular-nums">
                          {money.format(val)}
                        </td>
                      </tr>
                    );
                  })}
                  {!inventoryProducts.length && (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", color: "#94A3B8", padding: 32 }}>
                        Không có mặt hàng nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  )}
                </tbody>
                {inventoryProducts.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#F8FAFC", fontWeight: 700, borderTop: "2px solid #CBD5E1" }}>
                      <td colSpan={4} style={{ textAlign: "right" }}>
                        Tổng cộng:
                      </td>
                      <td style={{ textAlign: "right" }} className="tabular-nums">
                        {totalBeginningStock.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ textAlign: "right", color: "#16A34A" }} className="tabular-nums">
                        +{totalImportStock.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ textAlign: "right", color: "#DC2626" }} className="tabular-nums">
                        -{totalExportStock.toLocaleString("vi-VN")}
                      </td>
                      <td style={{ textAlign: "right" }} className="tabular-nums">
                        {totalEndingStock.toLocaleString("vi-VN")}
                      </td>
                      <td></td>
                      <td style={{ textAlign: "right", color: "var(--primary, #3D7068)" }} className="tabular-nums">
                        {money.format(totalInventoryValue)}
                      </td>
                    </tr>
                  </tfoot>
                )}
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
    </section>
  );
}
