import { Router } from "express";
import { getDatabase } from "../../config/mongodb.js";

const router = Router();

router.get("/revenue", async (_req, res, next) => {
  try {
    const db = getDatabase();
    const invoices = await db.collection("HoaDon").find({}).toArray();
    const total = invoices
      .filter((i) => i.TrangThai === "Đã thanh toán")
      .reduce((sum, i) => sum + Number(i.TongTien || 0), 0);
    const totalOrders = invoices.length;

    // Last 7 days
    const today = new Date();
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const date = d.toISOString().slice(0, 10);
      const dayTotal = invoices
        .filter((inv) => inv.TrangThai === "Đã thanh toán" && String(inv.NgayLap || "").slice(0, 10) === date)
        .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
      return { date, total: dayTotal };
    });

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

export default router;
