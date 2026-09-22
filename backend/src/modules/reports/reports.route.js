import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";

const router = Router();
const parseId = (val) => (ObjectId.isValid(val) ? new ObjectId(val) : null);

// Helper ánh xạ đối tác và chi tiết sản phẩm cho chứng từ
async function populateCustomersMap(db) {
  const custs = await db.collection("KhachHang").find({}).toArray();
  const map = new Map();
  for (const c of custs) {
    map.set(c._id.toString(), c);
    if (c.MaKH) map.set(c.MaKH, c);
  }
  return map;
}

async function populateSuppliersMap(db) {
  const supps = await db.collection("NhaCungCap").find({}).toArray();
  const map = new Map();
  for (const s of supps) {
    map.set(s._id.toString(), s);
    if (s.MaNCC) map.set(s.MaNCC, s);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────
// 1. BÁO CÁO DOANH THU
// ─────────────────────────────────────────────────────────────
router.get("/revenue", async (req, res, next) => {
  try {
    const db = getDatabase();
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
    const custMap = await populateCustomersMap(db);

    // Gắn thông tin khách hàng và chi tiết sản phẩm
    invoices = invoices.map((inv) => {
      const rawCId = inv.MaKH ? inv.MaKH.toString() : "";
      const cust = custMap.get(rawCId) || (inv.MaKHCode ? custMap.get(inv.MaKHCode) : null);
      return {
        id: inv._id.toString(),
        ...inv,
        MaKHCode: inv.MaKHCode || cust?.MaKH || null,
        TenKH: inv.TenKH || cust?.HoTen || (inv.MaKH ? "Khách hàng" : "Khách vãng lai"),
      };
    });

    // Lọc theo sản phẩm hoặc danh mục nếu có yêu cầu
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

    res.json({ report: "revenue", total, orders: invoices.length, allOrdersCount: totalOrders, weekly, data: invoices });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 2. BÁO CÁO NHẬP – XUẤT KHO
// ─────────────────────────────────────────────────────────────
router.get("/warehouse", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, supplierId, productId, categoryId, status } = req.query;

    const receiptFilter = {};
    const issueFilter = {};

    if (from || to) {
      receiptFilter.NgayNhap = {};
      issueFilter.NgayXuat = {};
      if (from) {
        receiptFilter.NgayNhap.$gte = String(from).slice(0, 10);
        issueFilter.NgayXuat.$gte = String(from).slice(0, 10);
      }
      if (to) {
        receiptFilter.NgayNhap.$lte = String(to).slice(0, 10);
        issueFilter.NgayXuat.$lte = String(to).slice(0, 10);
      }
    }

    if (status && status !== "all") {
      receiptFilter.TrangThai = status;
      issueFilter.TrangThai = status;
    }

    if (supplierId && supplierId !== "all") {
      const sId = parseId(supplierId);
      receiptFilter.$or = [
        ...(sId ? [{ MaNCC: sId }] : []),
        { MaNCC: String(supplierId) },
        { MaNCCCode: String(supplierId) },
      ];
    }

    const [rawReceipts, rawIssues, suppMap, stocks, products] = await Promise.all([
      db.collection("PhieuNhap").find(receiptFilter).sort({ NgayNhap: -1 }).toArray(),
      supplierId && supplierId !== "all" ? [] : db.collection("PhieuXuat").find(issueFilter).sort({ NgayXuat: -1 }).toArray(),
      populateSuppliersMap(db),
      db.collection("TonKho").find({}).toArray(),
      db.collection("SanPham").find({}).toArray(),
    ]);

    const filterDetails = (lines) => {
      if (!Array.isArray(lines)) return [];
      return lines.filter((line) => {
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
    };

    let receipts = rawReceipts.map((r) => {
      const rawSId = r.MaNCC ? r.MaNCC.toString() : "";
      const supp = suppMap.get(rawSId) || (r.MaNCCCode ? suppMap.get(r.MaNCCCode) : null);
      return {
        id: r._id.toString(),
        ...r,
        TenNCC: r.TenNCC || supp?.TenNCC || r.NguoiLienQuan || "Nhà cung cấp",
        details: r.details || [],
      };
    });

    let issues = rawIssues.map((i) => ({
      id: i._id.toString(),
      ...i,
      details: i.details || [],
    }));

    if ((productId && productId !== "all") || (categoryId && categoryId !== "all")) {
      receipts = receipts.filter((r) => filterDetails(r.details).length > 0);
      issues = issues.filter((i) => filterDetails(i.details).length > 0);
    }

    const totalImportUnits = receipts.reduce((sum, rec) => {
      const activeDetails = (productId && productId !== "all") || (categoryId && categoryId !== "all") ? filterDetails(rec.details) : (rec.details || []);
      return sum + activeDetails.reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0);
    }, 0);

    const totalExportUnits = issues.reduce((sum, iss) => {
      const activeDetails = (productId && productId !== "all") || (categoryId && categoryId !== "all") ? filterDetails(iss.details) : (iss.details || []);
      return sum + activeDetails.reduce((s, l) => s + Number(l.SoLuong || l.quantity || 0), 0);
    }, 0);

    const totalImportValue = receipts.reduce((sum, rec) => sum + Number(rec.TongTien || 0), 0);
    const totalExportValue = issues.reduce((sum, iss) => sum + Number(iss.TongTien || 0), 0);
    const exportImportRatio = totalImportUnits > 0 ? Number(((totalExportUnits / totalImportUnits) * 100).toFixed(1)) : 0;

    const totalCurrentStockUnits = stocks.reduce((sum, s) => sum + Number(s.SoLuongTon || 0), 0) ||
      products.reduce((sum, p) => sum + Number(p.stock || 0), 0);

    const transactions = [
      ...receipts.map((r) => ({
        id: r.id || r.MaPN,
        type: "import",
        typeLabel: "Nhập kho",
        badge: "green",
        code: r.MaPN || r.id,
        date: r.NgayNhap || r.createdAt,
        detailsCount: (r.details || []).length,
        person: r.TenNCC || r.NguoiLienQuan || r.NguoiLap || "Nhân viên kho",
        total: r.TongTien || 0,
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
        total: i.TongTien || 0,
      })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // Timeline 7 ngày
    const today = new Date();
    const trend = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - idx));
      const dateStr = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;

      const dayImports = receipts
        .filter((r) => String(r.NgayNhap || r.createdAt || "").slice(0, 10) === dateStr)
        .reduce((sum, r) => sum + (r.details || []).reduce((s, l) => s + Number(l.SoLuong || 0), 0), 0);

      const dayExports = issues
        .filter((i) => String(i.NgayXuat || i.createdAt || "").slice(0, 10) === dateStr)
        .reduce((sum, i) => sum + (i.details || []).reduce((s, l) => s + Number(l.SoLuong || 0), 0), 0);

      return { label, date: dateStr, importVal: dayImports, exportVal: dayExports };
    });

    res.json({
      report: "warehouse",
      totalImportUnits,
      totalExportUnits,
      totalImportValue,
      totalExportValue,
      totalCurrentStockUnits,
      exportImportRatio,
      receipts,
      issues,
      transactions,
      trend,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 3. BÁO CÁO TỒN KHO
// ─────────────────────────────────────────────────────────────
router.get("/inventory", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { categoryId, productId, stockStatus, search } = req.query;

    const query = {};
    if (productId && productId !== "all") {
      const pId = parseId(productId);
      query.$or = [
        ...(pId ? [{ _id: pId }] : []),
        { MaSP: String(productId) },
      ];
    }

    if (categoryId && categoryId !== "all" && categoryId !== "Tất cả") {
      const catObjId = parseId(categoryId);
      const catConditions = [
        { LoaiHang: categoryId },
        ...(catObjId ? [{ MaLoai: catObjId }] : []),
        { MaLoai: categoryId },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: catConditions }];
        delete query.$or;
      } else {
        query.$or = catConditions;
      }
    }

    if (search) {
      const q = String(search).trim();
      const searchConditions = [
        { TenSP: { $regex: q, $options: "i" } },
        { MaSP: { $regex: q, $options: "i" } },
      ];
      if (query.$and) {
        query.$and.push({ $or: searchConditions });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
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
        TrangThai: p.TrangThai || "Đang bán",
        HanSuDung: p.HanSuDung,
        HinhAnh: p.HinhAnh,
      };
    });

    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "out") data = data.filter((p) => Number(p.stock) <= 0);
      else if (stockStatus === "low") data = data.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10);
      else if (stockStatus === "in") data = data.filter((p) => Number(p.stock) > 10);
    }

    const totalInventoryValue = data.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.GiaNhap || p.GiaBan || 0), 0);
    const lowStockCount = data.filter((p) => Number(p.stock || 0) <= 10).length;

    res.json({
      report: "inventory",
      data,
      totalProducts: data.length,
      totalInventoryValue,
      lowStockCount,
      inStockRate: data.length > 0 ? Math.round(((data.length - lowStockCount) / data.length) * 100) : 100,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 4. BÁO CÁO CÔNG NỢ
// ─────────────────────────────────────────────────────────────
router.get("/debts", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, supplierId, customerId, status } = req.query;

    const baseDateFilter = {};
    if (from) baseDateFilter.$gte = String(from).slice(0, 10);
    if (to) baseDateFilter.$lte = String(to).slice(0, 10);
    const hasDateFilter = from || to;

    // 1. Công nợ Nhà cung cấp
    const suppFilter = {
      $or: [
        { LoaiCongNo: "Nhà cung cấp" },
        { type: "suppliers" },
        { MaNCC: { $exists: true, $ne: null } },
      ],
    };
    if (status && status !== "all") {
      suppFilter.TrangThai = status;
    }
    if (hasDateFilter) {
      suppFilter.NgayPhatSinh = baseDateFilter;
    }
    if (supplierId && supplierId !== "all") {
      const sId = parseId(supplierId);
      suppFilter.$and = [
        {
          $or: [
            ...(sId ? [{ MaNCC: sId }] : []),
            { MaNCC: String(supplierId) },
            { MaNCCCode: String(supplierId) },
          ],
        },
      ];
    }

    // 2. Công nợ Khách hàng
    const custFilter = {
      $or: [
        { LoaiCongNo: "Khách hàng" },
        { type: "customers" },
        { MaKH: { $exists: true, $ne: null } },
      ],
    };
    if (status && status !== "all") {
      custFilter.TrangThai = status;
    }
    if (hasDateFilter) {
      custFilter.NgayPhatSinh = baseDateFilter;
    }
    if (customerId && customerId !== "all") {
      const cId = parseId(customerId);
      custFilter.$and = [
        {
          $or: [
            ...(cId ? [{ MaKH: cId }] : []),
            { MaKH: String(customerId) },
            { MaKHCode: String(customerId) },
          ],
        },
      ];
    }

    const [supplierDebtsRaw, customerDebtsRaw, suppMap, custMap] = await Promise.all([
      db.collection("CongNo").find(suppFilter).toArray(),
      db.collection("CongNo").find(custFilter).toArray(),
      populateSuppliersMap(db),
      populateCustomersMap(db),
    ]);

    const supplierDebts = supplierDebtsRaw
      .filter((d) => !d.MaKH && (!!d.MaNCC || d.type === "suppliers" || d.LoaiCongNo === "Nhà cung cấp"))
      .map((d) => {
        const rawSId = d.MaNCC ? d.MaNCC.toString() : "";
        const supp = suppMap.get(rawSId) || (d.MaNCCCode ? suppMap.get(d.MaNCCCode) : null);
        return {
          id: d._id.toString(),
          ...d,
          partnerName: d.partnerName || supp?.TenNCC || d.MaNCCCode || "Nhà cung cấp",
          SoTienConLai: Number(d.SoTienConLai ?? (Number(d.SoTien || 0) - Number(d.SoTienDaTra || 0))),
        };
      });

    const customerDebts = customerDebtsRaw
      .filter((d) => !d.MaNCC && (!!d.MaKH || d.type === "customers" || d.LoaiCongNo === "Khách hàng"))
      .map((d) => {
        const rawCId = d.MaKH ? d.MaKH.toString() : "";
        const cust = custMap.get(rawCId) || (d.MaKHCode ? custMap.get(d.MaKHCode) : null);
        return {
          id: d._id.toString(),
          ...d,
          partnerName: d.partnerName || cust?.HoTen || d.MaKHCode || "Khách hàng",
          SoTienConLai: Number(d.SoTienConLai ?? (Number(d.SoTien || 0) - Number(d.SoTienDaTra || 0))),
        };
      });

    const totalPayable = supplierDebts.reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);
    const totalReceivable = customerDebts.reduce((sum, d) => sum + Number(d.SoTienConLai || 0), 0);

    const debtorSuppliersCount = new Set(supplierDebts.map((d) => d.MaNCC?.toString() || d.partnerName).filter(Boolean)).size;
    const debtorCustomersCount = new Set(customerDebts.map((d) => d.MaKH?.toString() || d.partnerName).filter(Boolean)).size;

    res.json({
      report: "debts",
      total: totalPayable,
      totalPayable,
      totalReceivable,
      debtorSuppliersCount,
      debtorCustomersCount,
      supplierDebts,
      customerDebts,
      data: supplierDebts,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 5. BÁO CÁO THU – CHI TIỀN MẶT
// ─────────────────────────────────────────────────────────────
router.get("/cash-flow", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, status } = req.query;

    const filterThu = {};
    const filterChi = {};

    if (from || to) {
      filterThu.NgayLap = {};
      filterChi.NgayLap = {};
      if (from) {
        filterThu.NgayLap.$gte = String(from).slice(0, 10);
        filterChi.NgayLap.$gte = String(from).slice(0, 10);
      }
      if (to) {
        filterThu.NgayLap.$lte = String(to).slice(0, 10);
        filterChi.NgayLap.$lte = String(to).slice(0, 10);
      }
    }

    if (status && status !== "all") {
      filterThu.TrangThai = status;
      filterChi.TrangThai = status;
    }

    const [receipts, payments] = await Promise.all([
      db.collection("PhieuThu").find(filterThu).sort({ NgayLap: -1 }).toArray(),
      db.collection("PhieuChi").find(filterChi).sort({ NgayLap: -1 }).toArray(),
    ]);

    const totalThu = receipts.reduce((s, r) => s + Number(r.SoTien || 0), 0);
    const totalChi = payments.reduce((s, p) => s + Number(p.SoTien || 0), 0);

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

    // Mảng entries chi tiết kết hợp Phiếu thu & Phiếu chi
    const entries = [
      ...receipts.map((r) => ({
        id: r._id.toString(),
        date: r.NgayLap,
        code: r.MaPT,
        number: r.MaPT,
        type: "thu",
        person: r.NguoiNopTien || "Khách hàng",
        reason: r.LyDo || "Thu tiền",
        amount: Number(r.SoTien || 0),
        status: r.TrangThai || "Đã lập",
        createdAt: r.createdAt || r.NgayLap,
      })),
      ...payments.map((p) => ({
        id: p._id.toString(),
        date: p.NgayLap,
        code: p.MaPC,
        number: p.MaPC,
        type: "chi",
        person: p.NguoiNhanTien || "Nhà cung cấp",
        reason: p.LyDo || "Chi tiền",
        amount: Number(p.SoTien || 0),
        status: p.TrangThai || "Đã lập",
        createdAt: p.createdAt || p.NgayLap,
      })),
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      report: "cash-flow",
      totalThu,
      totalChi,
      balance: totalThu - totalChi,
      receiptCount: receipts.length,
      paymentCount: payments.length,
      monthly,
      entries,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
