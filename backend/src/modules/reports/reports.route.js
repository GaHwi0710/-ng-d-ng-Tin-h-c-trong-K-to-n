import { Router } from "express";
<<<<<<< HEAD
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";

const router = Router();
const parseId = (val) => (ObjectId.isValid(val) ? new ObjectId(val) : null);
=======
import { getDatabase } from "../../config/mongodb.js";

const router = Router();
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de

router.get("/revenue", async (req, res, next) => {
  try {
    const db = getDatabase();
<<<<<<< HEAD
    const { from, to, customerId, productId, categoryId, status } = req.query;

    const filter = {};
    if (status && status !== "all") {
      filter.TrangThai = status;
    } else {
      filter.TrangThai = "Đã thanh toán";
    }

    if (from || to) {
      filter.NgayLap = {};
      if (from) filter.NgayLap.$gte = String(from).slice(0, 10);
      if (to) filter.NgayLap.$lte = String(to).slice(0, 10);
    }

    if (customerId && customerId !== "all") {
      const cId = parseId(customerId);
      filter.$or = [
        ...(cId ? [{ MaKH: cId }] : []),
        { MaKH: String(customerId) },
        { MaKHCode: String(customerId) },
      ];
    }

    let invoices = await db.collection("HoaDon").find(filter).sort({ NgayLap: -1 }).toArray();

    // Filter by product or category if requested
    if ((productId && productId !== "all") || (categoryId && categoryId !== "all")) {
      invoices = invoices.filter((inv) => {
        return (inv.details || []).some((line) => {
          const matchProduct =
            !productId ||
            productId === "all" ||
            String(line.MaSP) === String(productId) ||
            String(line.productId) === String(productId) ||
            String(line.MaSPCode) === String(productId);
          const matchCategory =
            !categoryId ||
            categoryId === "all" ||
            line.LoaiHang === categoryId ||
            String(line.MaLoai) === String(categoryId);
          return matchProduct && matchCategory;
        });
      });
    }

    const total = invoices.reduce((sum, i) => sum + Number(i.TongTien || 0), 0);
    const totalOrders = await db.collection("DonHang").countDocuments();

    // Helper tạo mảng 7 ngày kết thúc tại anchor
    const makeDates = (anchor) =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(`${anchor}T00:00:00`);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });

    const todayStr = new Date().toISOString().slice(0, 10);
    let dates = makeDates(to || todayStr);

=======
    const { from, to } = req.query;

    // Lọc chỉ hóa đơn đã thanh toán, hỗ trợ khoảng ngày tùy chọn
    const filter = { TrangThai: "Đã thanh toán" };
    if (from || to) {
      filter.NgayLap = {};
      if (from) filter.NgayLap.$gte = from;
      if (to)   filter.NgayLap.$lte = to;
    }

    const invoices = await db.collection("HoaDon").find(filter).toArray();
    const total = invoices.reduce((sum, i) => sum + Number(i.TongTien || 0), 0);
    // Đếm đơn hàng thực (DonHang), không phải số hóa đơn (HoaDon)
    const totalOrders = await db.collection("DonHang").countDocuments();

    // Helper tạo mảng 7 ngày kết thúc tại anchor
    const makeDates = (anchor) => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${anchor}T00:00:00`);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    let dates = makeDates(todayStr);

    // Nếu 7 ngày gần nhất không có giao dịch nào nhưng DB có data,
    // dịch cửa sổ về quanh ngày có giao dịch mới nhất
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    if (
      invoices.length > 0 &&
      !dates.some((d) => invoices.some((inv) => String(inv.NgayLap || "").slice(0, 10) === d))
    ) {
      const latestDate = invoices
        .map((inv) => String(inv.NgayLap || "").slice(0, 10))
        .filter(Boolean)
        .sort()
        .at(-1);
      if (latestDate) dates = makeDates(latestDate);
    }

    const weekly = dates.map((date) => ({
      date,
      total: invoices
        .filter((inv) => String(inv.NgayLap || "").slice(0, 10) === date)
        .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0),
    }));

<<<<<<< HEAD
    res.json({ report: "revenue", total, orders: invoices.length, allOrdersCount: totalOrders, weekly, data: invoices });
=======
    res.json({ report: "revenue", total, orders: totalOrders, weekly });
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  } catch (err) {
    next(err);
  }
});

<<<<<<< HEAD
router.get("/inventory", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { categoryId, stockStatus, search } = req.query;

    const query = {};
    if (categoryId && categoryId !== "all" && categoryId !== "Tất cả") {
      const catObjId = parseId(categoryId);
      query.$or = [
        { LoaiHang: categoryId },
        ...(catObjId ? [{ MaLoai: catObjId }] : []),
        { MaLoai: categoryId },
      ];
    }
    if (search) {
      const q = String(search).trim();
      query.$or = [
        ...(query.$or || []),
        { TenSP: { $regex: q, $options: "i" } },
        { MaSP: { $regex: q, $options: "i" } },
      ];
    }

    const products = await db.collection("SanPham").find(query).toArray();
    const stocks = await db.collection("TonKho").find({}).toArray();
    const categories = await db.collection("LoaiHang").find({}).toArray();
    const catMap = new Map(categories.map((c) => [c._id.toString(), c.TenLoai]));
    const stockMap = new Map(stocks.map((s) => [s.MaSP?.toString(), s.SoLuongTon]));

    let data = products.map((p) => {
      const catName = p.LoaiHang || (p.MaLoai ? catMap.get(p.MaLoai.toString()) : "") || "";
      const currentStock = stockMap.has(p._id.toString()) ? stockMap.get(p._id.toString()) : (p.stock || 0);
      return {
        id: p._id.toString(),
        MaSP: p.MaSP,
        TenSP: p.TenSP,
        LoaiHang: catName,
        DonViTinh: p.DonViTinh,
        GiaNhap: p.GiaNhap,
        GiaBan: p.GiaBan,
        stock: currentStock,
        TrangThai: p.TrangThai,
        HanSuDung: p.HanSuDung,
        HinhAnh: p.HinhAnh,
      };
    });

    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "out") data = data.filter((p) => Number(p.stock) <= 0);
      else if (stockStatus === "low") data = data.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10);
      else if (stockStatus === "in") data = data.filter((p) => Number(p.stock) > 10);
    }

    res.json({ report: "inventory", data, totalProducts: data.length });
=======
router.get("/inventory", async (_req, res, next) => {
  try {
    const db = getDatabase();
    const products = await db.collection("SanPham").find({}).toArray();
    const stocks = await db.collection("TonKho").find({}).toArray();
    const stockMap = new Map(stocks.map((s) => [s.MaSP?.toString(), s.SoLuongTon]));

    const data = products.map((p) => ({
      id: p._id.toString(),
      MaSP: p.MaSP,
      TenSP: p.TenSP,
      LoaiHang: p.LoaiHang,
      DonViTinh: p.DonViTinh,
      GiaNhap: p.GiaNhap,
      GiaBan: p.GiaBan,
      stock: stockMap.has(p._id.toString()) ? stockMap.get(p._id.toString()) : (p.stock || 0),
      TrangThai: p.TrangThai,
      HanSuDung: p.HanSuDung,
      HinhAnh: p.HinhAnh,
    }));

    res.json({ report: "inventory", data });
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  } catch (err) {
    next(err);
  }
});

<<<<<<< HEAD
router.get("/debts", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, supplierId, status } = req.query;

    const suppFilter = { LoaiCongNo: "Nhà cung cấp" };
    if (status && status !== "all") {
      suppFilter.TrangThai = status;
    }
    if (from || to) {
      suppFilter.NgayPhatSinh = {};
      if (from) suppFilter.NgayPhatSinh.$gte = String(from).slice(0, 10);
      if (to) suppFilter.NgayPhatSinh.$lte = String(to).slice(0, 10);
    }
    if (supplierId && supplierId !== "all") {
      const sId = parseId(supplierId);
      suppFilter.$or = [
        ...(sId ? [{ MaNCC: sId }] : []),
        { MaNCC: String(supplierId) },
        { MaNCCCode: String(supplierId) },
      ];
    }

    const [supplierDebts, unpaidInvoices, allSuppliers] = await Promise.all([
      db.collection("CongNo").find(suppFilter).toArray(),
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã thanh toán" } }).toArray(),
      db.collection("NhaCungCap").find({}).toArray(),
    ]);

    const suppMap = new Map(allSuppliers.map((s) => [s._id.toString(), s.TenNCC]));

    const supplierDebtsMapped = supplierDebts.map((d) => ({
      id: d._id.toString(),
      ...d,
      partnerName: d.partnerName || (d.MaNCC ? suppMap.get(d.MaNCC.toString()) : "") || d.MaNCCCode || "Nhà cung cấp",
    }));

    const totalPayable = supplierDebtsMapped.reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);
    const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.SoTienConLai ?? inv.TongTien ?? 0), 0);

    res.json({
      report: "debts",
      total: totalPayable,
      totalPayable,
      totalReceivable,
      data: supplierDebtsMapped,
      unpaidInvoices: unpaidInvoices.map((i) => ({ id: i._id.toString(), ...i })),
    });
=======
router.get("/debts", async (_req, res, next) => {
  try {
    const db = getDatabase();
    const debts = await db.collection("CongNo").find({}).toArray();
    const total = debts.reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);
    res.json({ report: "debts", total, data: debts.map((d) => ({ id: d._id.toString(), ...d })) });
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  } catch (err) {
    next(err);
  }
});

router.get("/cash-flow", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to } = req.query;

    const dateFilter = {};
<<<<<<< HEAD
    if (from) dateFilter.$gte = String(from).slice(0, 10);
    if (to) dateFilter.$lte = String(to).slice(0, 10);
=======
    if (from) dateFilter.$gte = from;
    if (to)   dateFilter.$lte = to;
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    const hasDateFilter = from || to;

    const [receipts, payments] = await Promise.all([
      db.collection("PhieuThu").find(hasDateFilter ? { NgayLap: dateFilter } : {}).toArray(),
      db.collection("PhieuChi").find(hasDateFilter ? { NgayLap: dateFilter } : {}).toArray(),
    ]);

    const totalThu = receipts.reduce((s, r) => s + Number(r.SoTien || 0), 0);
    const totalChi = payments.reduce((s, p) => s + Number(p.SoTien || 0), 0);

<<<<<<< HEAD
=======
    // Nhóm theo tháng
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    const byMonth = new Map();
    for (const r of receipts) {
      const month = String(r.NgayLap || "").slice(0, 7);
      if (!month) continue;
      const entry = byMonth.get(month) || { month, thu: 0, chi: 0 };
      entry.thu += Number(r.SoTien || 0);
      byMonth.set(month, entry);
    }
    for (const p of payments) {
      const month = String(p.NgayLap || "").slice(0, 7);
      if (!month) continue;
      const entry = byMonth.get(month) || { month, thu: 0, chi: 0 };
      entry.chi += Number(p.SoTien || 0);
      byMonth.set(month, entry);
    }
    const monthly = [...byMonth.values()]
      .map((m) => ({ ...m, balance: m.thu - m.chi }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      report: "cash-flow",
      totalThu,
      totalChi,
      balance: totalThu - totalChi,
      receiptCount: receipts.length,
      paymentCount: payments.length,
      monthly,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
