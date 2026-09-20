import { Router } from "express";
import { getDatabase } from "../../config/mongodb.js";

const router = Router();

router.get("/revenue", async (req, res, next) => {
  try {
    const db = getDatabase();
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

    res.json({ report: "revenue", total, orders: totalOrders, weekly });
  } catch (err) {
    next(err);
  }
});

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
  } catch (err) {
    next(err);
  }
});

router.get("/debts", async (_req, res, next) => {
  try {
    const db = getDatabase();
    const debts = await db.collection("CongNo").find({}).toArray();
    const total = debts.reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);
    res.json({ report: "debts", total, data: debts.map((d) => ({ id: d._id.toString(), ...d })) });
  } catch (err) {
    next(err);
  }
});

router.get("/cash-flow", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = from;
    if (to)   dateFilter.$lte = to;
    const hasDateFilter = from || to;

    const [receipts, payments] = await Promise.all([
      db.collection("PhieuThu").find(hasDateFilter ? { NgayLap: dateFilter } : {}).toArray(),
      db.collection("PhieuChi").find(hasDateFilter ? { NgayLap: dateFilter } : {}).toArray(),
    ]);

    const totalThu = receipts.reduce((s, r) => s + Number(r.SoTien || 0), 0);
    const totalChi = payments.reduce((s, p) => s + Number(p.SoTien || 0), 0);

    // Nhóm theo tháng
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
