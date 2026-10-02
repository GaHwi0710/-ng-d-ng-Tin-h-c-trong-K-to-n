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
    let { from, to, year, month, customerId, productId, categoryId, status, groupBy } = req.query;

    // 1. Xác định chế độ gom nhóm (day / month / year) - Mặc định theo ngày
    let validGroupBy = String(groupBy || "").toLowerCase();
    if (!["day", "month", "year"].includes(validGroupBy)) {
      validGroupBy = year && !from && !to ? "month" : "day";
    }

    // 2. Xử lý thời gian và validation
    if (year && !from && !to) {
      const yNum = Number(year);
      if (!Number.isInteger(yNum) || yNum < 2000 || yNum > 2100) {
        return res.status(400).json({ error: "Năm báo cáo không hợp lệ (phải từ 2000 đến 2100)" });
      }
      from = `${year}-01-01`;
      to = `${year}-12-31`;
    }

    if (month && !from && !to) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: "Tháng báo cáo không hợp lệ (định dạng YYYY-MM)" });
      }
      from = `${month}-01`;
      const [y, m] = month.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      to = `${month}-${String(lastDay).padStart(2, "0")}`;
    }

    if (from && to && String(from).slice(0, 10) > String(to).slice(0, 10)) {
      return res.status(400).json({ error: "Ngày bắt đầu không được lớn hơn ngày kết thúc" });
    }

    // 3. Xây dựng filter MongoDB: Doanh thu tính từ HoaDon (SalesInvoices), loại bỏ hóa đơn hủy
    const filter = {};
    if (status && status !== "all") {
      filter.TrangThai = status;
    } else {
      filter.TrangThai = { $ne: "Đã hủy" };
    }

    if (from || to) {
      const fromStr = from ? String(from).slice(0, 10) : "";
      const toStr = to ? String(to).slice(0, 10) : "";
      const dateConds = [];

      const strCond = {};
      if (fromStr) strCond.$gte = fromStr;
      if (toStr) strCond.$lte = toStr;
      dateConds.push({ NgayLap: strCond });

      const dateObjCond = {};
      if (fromStr) dateObjCond.$gte = new Date(`${fromStr}T00:00:00.000Z`);
      if (toStr) dateObjCond.$lte = new Date(`${toStr}T23:59:59.999Z`);
      dateConds.push({ NgayLap: dateObjCond });

      filter.$or = dateConds;
    }

    if (customerId && customerId !== "all") {
      const cId = parseId(customerId);
      const custConds = [
        ...(cId ? [{ MaKH: cId }] : []),
        { MaKH: String(customerId) },
        { MaKHCode: String(customerId) },
      ];
      if (filter.$and) {
        filter.$and.push({ $or: custConds });
      } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: custConds }];
        delete filter.$or;
      } else {
        filter.$or = custConds;
      }
    }

    let invoices = await db.collection("HoaDon").find(filter).sort({ NgayLap: 1 }).toArray();
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

    // 4. Tính toán tổng số liệu tài chính chính xác (Tránh double-count)
    const total = invoices.reduce((sum, i) => sum + Number(i.TongTien || 0), 0);
    const totalPaid = invoices.reduce((sum, i) => {
      const paid = Number(i.SoTienDaTra !== undefined ? i.SoTienDaTra : (i.TrangThai === "Đã thanh toán" ? i.TongTien : 0));
      return sum + paid;
    }, 0);
    const totalUnpaid = invoices.reduce((sum, i) => {
      const unpaid = Number(i.SoTienConLai !== undefined ? i.SoTienConLai : (i.TrangThai === "Chưa thanh toán" ? i.TongTien : 0));
      return sum + unpaid;
    }, 0);
    const totalOrders = await db.collection("DonHang").countDocuments();

    // 5. Gom nhóm dữ liệu theo Ngày / Tháng / Năm (UC23)
    const periodMap = new Map();

    const formatPeriodLabel = (pKey, mode) => {
      if (mode === "year") return `Năm ${pKey}`;
      if (mode === "month") {
        const parts = pKey.split("-");
        return parts.length >= 2 ? `Tháng ${parts[1]}/${parts[0]}` : pKey;
      }
      const parts = pKey.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return pKey;
    };

    // Nếu chọn theo Tháng và đang trong một năm xác định -> Khởi tạo sẵn 12 tháng
    if (validGroupBy === "month") {
      let targetYear = year;
      if (!targetYear && from && to && String(from).slice(0, 4) === String(to).slice(0, 4)) {
        targetYear = String(from).slice(0, 4);
      }
      if (targetYear) {
        for (let m = 1; m <= 12; m++) {
          const mStr = `${targetYear}-${String(m).padStart(2, "0")}`;
          periodMap.set(mStr, {
            period: mStr,
            label: formatPeriodLabel(mStr, "month"),
            revenue: 0,
            ordersCount: 0,
            paidAmount: 0,
            unpaidAmount: 0,
          });
        }
      }
    }

    const toDateStr = (v) => {
      if (!v) return "";
      if (v instanceof Date && !isNaN(v.getTime())) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, "0");
        const d = String(v.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      const s = String(v);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const parsed = new Date(v);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      return "";
    };

    // Tập hợp doanh thu từ từng hóa đơn thực tế
    for (const inv of invoices) {
      const dateStr = toDateStr(inv.NgayLap) || toDateStr(inv.createdAt) || "Chưa rõ";
      let pKey = "";
      if (validGroupBy === "year") {
        pKey = dateStr.slice(0, 4) || "Chưa rõ";
      } else if (validGroupBy === "month") {
        pKey = dateStr.slice(0, 7) || "Chưa rõ";
      } else {
        pKey = dateStr || "Chưa rõ";
      }

      if (!periodMap.has(pKey)) {
        periodMap.set(pKey, {
          period: pKey,
          label: formatPeriodLabel(pKey, validGroupBy),
          revenue: 0,
          ordersCount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
        });
      }

      const item = periodMap.get(pKey);
      const invTotal = Number(inv.TongTien || 0);
      const invPaid = Number(inv.SoTienDaTra !== undefined ? inv.SoTienDaTra : (inv.TrangThai === "Đã thanh toán" ? invTotal : 0));
      const invUnpaid = Number(inv.SoTienConLai !== undefined ? inv.SoTienConLai : (inv.TrangThai === "Chưa thanh toán" ? invTotal : 0));

      item.revenue += invTotal;
      item.ordersCount += 1;
      item.paidAmount += invPaid;
      item.unpaidAmount += invUnpaid;
    }

    // Sắp xếp breakdown theo thứ tự thời gian
    const breakdown = [...periodMap.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((b) => ({
        ...b,
        percentage: total > 0 ? ((b.revenue / total) * 100).toFixed(1) : "0",
      }));

    // 6. Mảng 7 ngày cho Dashboard (Backward compatibility)
    const todayStr = toDateStr(new Date());
    const makeDates = (anchor) => {
      const cleanAnchor = toDateStr(anchor) || todayStr;
      const baseDate = new Date(`${cleanAnchor}T00:00:00`);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - (6 - i));
        return !isNaN(d.getTime()) ? toDateStr(d) : cleanAnchor;
      });
    };

    let dates = makeDates(to || todayStr);

    if (
      invoices.length > 0 &&
      !dates.some((d) => invoices.some((inv) => toDateStr(inv.NgayLap || inv.createdAt) === d))
    ) {
      const latestDate = invoices
        .map((inv) => toDateStr(inv.NgayLap || inv.createdAt))
        .filter(Boolean)
        .sort()
        .at(-1);
      if (latestDate) dates = makeDates(latestDate);
    }

    const weekly = dates.map((date) => ({
      date,
      total: invoices
        .filter((inv) => toDateStr(inv.NgayLap || inv.createdAt) === date)
        .reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0),
    }));

    res.json({
      report: "revenue",
      groupBy: validGroupBy,
      from: from || null,
      to: to || null,
      year: year || null,
      total,
      totalPaid,
      totalUnpaid,
      orders: invoices.length,
      allOrdersCount: totalOrders,
      breakdown,
      weekly,
      data: invoices,
    });
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
      const fromStr = from ? String(from).slice(0, 10) : "";
      const toStr = to ? String(to).slice(0, 10) : "";
      const makeDateQuery = (field) => {
        const strCond = {};
        if (fromStr) strCond.$gte = fromStr;
        if (toStr) strCond.$lte = toStr;
        const objCond = {};
        if (fromStr) objCond.$gte = new Date(`${fromStr}T00:00:00.000Z`);
        if (toStr) objCond.$lte = new Date(`${toStr}T23:59:59.999Z`);
        return [{ [field]: strCond }, { [field]: objCond }];
      };
      receiptFilter.$or = makeDateQuery("NgayNhap");
      issueFilter.$or = makeDateQuery("NgayXuat");
    }

    if (status && status !== "all") {
      receiptFilter.TrangThai = status;
      issueFilter.TrangThai = status;
    }

    if (supplierId && supplierId !== "all") {
      const sId = parseId(supplierId);
      const suppConds = [
        ...(sId ? [{ MaNCC: sId }] : []),
        { MaNCC: String(supplierId) },
        { MaNCCCode: String(supplierId) },
      ];
      if (receiptFilter.$or) {
        receiptFilter.$and = [{ $or: receiptFilter.$or }, { $or: suppConds }];
        delete receiptFilter.$or;
      } else {
        receiptFilter.$or = suppConds;
      }
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
// 3. BÁO CÁO TỒN KHO (UC24)
// ─────────────────────────────────────────────────────────────
router.get("/inventory", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { categoryId, productId, stockStatus, search } = req.query;

    // Date range params (hỗ trợ cả from/to và startDate/endDate)
    const fromParam = req.query.from || req.query.startDate;
    const toParam = req.query.to || req.query.endDate;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const firstDayOfMonthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

    const fromStr = fromParam ? String(fromParam).slice(0, 10) : firstDayOfMonthStr;
    const toStr = toParam ? String(toParam).slice(0, 10) : todayStr;

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

    const [products, stocks, categories, goodsReceipts, invoices, goodsIssues, adjustments] = await Promise.all([
      db.collection("SanPham").find(query).toArray(),
      db.collection("TonKho").find({}).toArray(),
      db.collection("LoaiHang").find({}).toArray(),
      db.collection("PhieuNhap").find({}).toArray(),
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuXuat").find({}).toArray(),
      db.collection("DieuChinhKho").find({}).toArray(),
    ]);

    const catMap = new Map(categories.map((c) => [c._id.toString(), c.TenLoai]));
    const stockMap = new Map(stocks.map((s) => [s.MaSP?.toString(), Number(s.SoLuongTon || 0)]));

    // Helper: format doc date as YYYY-MM-DD
    const extractDateStr = (doc, field) => {
      const v = doc[field] || doc.createdAt;
      if (!v) return "";
      if (typeof v === "string") return v.slice(0, 10);
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, "0");
        const d = String(v.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      return "";
    };

    let data = products.map((p) => {
      const catName = p.LoaiHang || (p.MaLoai ? catMap.get(p.MaLoai.toString()) : "") || "";
      const pid = p._id.toString();
      const pCode = p.MaSP;
      const curStock = stockMap.has(pid) ? stockMap.get(pid) : Number(p.stock || 0);

      const matchesProduct = (item) => {
        if (!item) return false;
        const itemPid = item.MaSP?._id ? item.MaSP._id.toString() : item.MaSP?.toString();
        return itemPid === pid || item.MaSP === pCode || item.productCode === pCode || item.productId === pid || item.MaSPCode === pCode;
      };

      // 1. Nhập kho từ PhieuNhap
      let nhapTrongKy = 0;
      let nhapSauKy = 0;
      for (const pn of goodsReceipts) {
        const d = extractDateStr(pn, "NgayNhap");
        for (const item of (pn.details || [])) {
          if (matchesProduct(item)) {
            const qty = Number(item.SoLuong || item.quantity || 0);
            if (d >= fromStr && d <= toStr) nhapTrongKy += qty;
            if (d > toStr) nhapSauKy += qty;
          }
        }
      }

      // 2. Xuất kho: Bán hàng (HoaDon) + Xuất kho khác (PhieuXuat không có MaDH)
      let xuatTrongKy = 0;
      let xuatSauKy = 0;

      // Xuất từ hóa đơn bán hàng
      for (const hd of invoices) {
        const d = extractDateStr(hd, "NgayLap");
        for (const item of (hd.details || [])) {
          if (matchesProduct(item)) {
            const qty = Number(item.SoLuong || item.quantity || 0);
            if (d >= fromStr && d <= toStr) xuatTrongKy += qty;
            if (d > toStr) xuatSauKy += qty;
          }
        }
      }

      // Xuất kho khác từ PhieuXuat (bỏ qua nếu đã liên kết đơn hàng để tránh double-count)
      for (const px of goodsIssues) {
        if (px.MaDH) continue;
        const d = extractDateStr(px, "NgayXuat");
        for (const item of (px.details || [])) {
          if (matchesProduct(item)) {
            const qty = Number(item.SoLuong || item.quantity || 0);
            if (d >= fromStr && d <= toStr) xuatTrongKy += qty;
            if (d > toStr) xuatSauKy += qty;
          }
        }
      }

      // ERR-09 FIX: 3. Điều chỉnh kho (DieuChinhKho) — ±DieuChinh
      // SoLuongDieuChinh > 0 = tăng tồn (như nhập), < 0 = giảm tồn (như xuất)
      let dieuChinhTrongKy = 0;
      let dieuChinhSauKy = 0;
      for (const dc of adjustments) {
        const d = extractDateStr(dc, "NgayDieuChinh");
        for (const item of (dc.details || dc.items || [])) {
          if (matchesProduct(item)) {
            const qty = Number(item.SoLuongDieuChinh || item.SoLuongChenhLech || item.quantity || 0);
            if (d >= fromStr && d <= toStr) dieuChinhTrongKy += qty;
            if (d > toStr) dieuChinhSauKy += qty;
          }
        }
        // DieuChinhKho records without details (single-product adjustment)
        if (!(dc.details || dc.items || []).length && matchesProduct(dc)) {
          const qty = Number(dc.SoLuongDieuChinh || dc.SoLuongChenhLech || 0);
          const d = extractDateStr(dc, "NgayDieuChinh");
          if (d >= fromStr && d <= toStr) dieuChinhTrongKy += qty;
          if (d > toStr) dieuChinhSauKy += qty;
        }
      }

      // 4. Tính toán Tồn cuối và Tồn đầu chuẩn kế toán:
      // Công thức: TonCuoi = TonDau + NhapTrongKy - XuatTrongKy ± DieuChinh
      // TonCuoi hiện tại = curStock trừ phát sinh sau kỳ báo cáo
      const tonCuoi = Math.max(0, curStock - nhapSauKy + xuatSauKy - dieuChinhSauKy);
      // Đẳng thức kế toán: TonCuoi = TonDau + NhapTrongKy - XuatTrongKy + DieuChinhTrongKy
      // => TonDau = TonCuoi - NhapTrongKy + XuatTrongKy - DieuChinhTrongKy
      const tonDau = tonCuoi - nhapTrongKy + xuatTrongKy - dieuChinhTrongKy;

      const giaNhap = Number(p.GiaNhap || p.GiaBan || 0);
      const thanhTienTonDau = tonDau * giaNhap;
      const thanhTienNhap = nhapTrongKy * giaNhap;
      const thanhTienXuat = xuatTrongKy * giaNhap;
      const thanhTienDieuChinh = dieuChinhTrongKy * giaNhap;
      const giaTriTon = tonCuoi * giaNhap;

      return {
        id: pid,
        MaSP: p.MaSP,
        TenSP: p.TenSP,
        LoaiHang: catName,
        DonViTinh: p.DonViTinh || "Cái",
        GiaNhap: giaNhap,
        GiaBan: Number(p.GiaBan || 0),
        TonDau: tonDau,
        ThanhTienTonDau: thanhTienTonDau,
        NhapTrongKy: nhapTrongKy,
        ThanhTienNhap: thanhTienNhap,
        XuatTrongKy: xuatTrongKy,
        ThanhTienXuat: thanhTienXuat,
        DieuChinh: dieuChinhTrongKy,
        ThanhTienDieuChinh: thanhTienDieuChinh,
        TonCuoi: tonCuoi,
        ThanhTienTonCuoi: giaTriTon,
        stock: tonCuoi,
        GiaTriTon: giaTriTon,
        TrangThai: p.TrangThai || "Đang bán",
        HanSuDung: p.HanSuDung,
        HinhAnh: p.HinhAnh,
      };
    });

    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "out") data = data.filter((p) => Number(p.TonCuoi) <= 0);
      else if (stockStatus === "low") data = data.filter((p) => Number(p.TonCuoi) > 0 && Number(p.TonCuoi) <= 10);
      else if (stockStatus === "in") data = data.filter((p) => Number(p.TonCuoi) > 10);
    }

    const totalBeginningStock = data.reduce((sum, p) => sum + p.TonDau, 0);
    const totalBeginningValue = data.reduce((sum, p) => sum + (p.ThanhTienTonDau || 0), 0);
    const totalImportStock = data.reduce((sum, p) => sum + p.NhapTrongKy, 0);
    const totalImportValue = data.reduce((sum, p) => sum + (p.ThanhTienNhap || 0), 0);
    const totalExportStock = data.reduce((sum, p) => sum + p.XuatTrongKy, 0);
    const totalExportValue = data.reduce((sum, p) => sum + (p.ThanhTienXuat || 0), 0);
    const totalAdjustmentStock = data.reduce((sum, p) => sum + (p.DieuChinh || 0), 0);
    const totalAdjustmentValue = data.reduce((sum, p) => sum + (p.ThanhTienDieuChinh || 0), 0);
    const totalEndingStock = data.reduce((sum, p) => sum + p.TonCuoi, 0);
    const totalInventoryValue = data.reduce((sum, p) => sum + p.GiaTriTon, 0);
    const lowStockCount = data.filter((p) => Number(p.TonCuoi) <= 10).length;

    res.json({
      report: "inventory",
      from: fromStr,
      to: toStr,
      startDate: fromStr,
      endDate: toStr,
      data,
      totalProducts: data.length,
      totalBeginningStock,
      totalBeginningValue,
      totalImportStock,
      totalImportValue,
      totalExportStock,
      totalExportValue,
      totalAdjustmentStock,
      totalAdjustmentValue,
      totalEndingStock,
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

// ─────────────────────────────────────────────────────────────
// 5.1. BÁO CÁO THU TIỀN MẶT ĐỘC LẬP (Chuẩn Kế toán A4)
// ─────────────────────────────────────────────────────────────
router.get("/cash-receipts", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, q, status } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";
    const searchTerm = q ? String(q).trim().toLowerCase() : "";

    // Lấy tất cả phiếu thu
    const rawReceipts = await db.collection("PhieuThu").find({}).toArray();

    const extractDateStr = (doc) => {
      const v = doc.NgayLap || doc.NgayThu || doc.createdAt;
      if (!v) return "";
      if (typeof v === "string") return v.slice(0, 10);
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, "0");
        const d = String(v.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      return "";
    };

    // 1. Lọc giao dịch tiền mặt & loại trừ giao dịch chuyển khoản/ngân hàng
    const nonCashKeywords = ["chuyển khoản", "chuyen khoan", "ngân hàng", "ngan hang", "bank"];
    const filtered = [];
    const seen = new Set();

    for (const r of rawReceipts) {
      const method = String(r.PhuongThuc || "").toLowerCase();
      const isBankTransfer = nonCashKeywords.some((kw) => method.includes(kw));
      if (isBankTransfer) continue;

      // Chống trùng lặp theo MaPT hoặc _id
      const uniqueKey = r.MaPT || r._id.toString();
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);

      // Lọc theo ngày: toDate bao gồm toàn bộ giao dịch trong ngày đó (<= toDate)
      const dateStr = extractDateStr(r);
      if (fromStr && dateStr < fromStr) continue;
      if (toStr && dateStr > toStr) continue;

      // Lọc theo trạng thái
      if (status && status !== "all" && r.TrangThai !== status) continue;

      // Lọc theo từ khóa tìm kiếm (mã phiếu, đối tượng nộp, nội dung, chứng từ gốc)
      if (searchTerm) {
        const matchCode = String(r.MaPT || "").toLowerCase().includes(searchTerm);
        const matchPerson = String(r.NguoiNopTien || "").toLowerCase().includes(searchTerm);
        const matchReason = String(r.LyDo || "").toLowerCase().includes(searchTerm);
        const matchDoc = String(r.ChungTuGoc || "").toLowerCase().includes(searchTerm);
        if (!matchCode && !matchPerson && !matchReason && !matchDoc) continue;
      }

      filtered.push({
        id: r._id.toString(),
        NgayThu: dateStr,
        SoPhieuThu: r.MaPT || "",
        DoiTuongNop: r.NguoiNopTien || "Khách hàng",
        NoiDung: r.LyDo || "Thu tiền mặt",
        ChungTuGoc: r.ChungTuGoc || "—",
        HinhThucThu: "Tiền mặt",
        SoTien: Number(r.SoTien || 0),
        TrangThai: r.TrangThai || "Đã lập",
        NguoiLap: r.NguoiLap || "—",
        createdAt: r.createdAt || r.NgayLap,
      });
    }

    // 2. Sắp xếp tăng dần theo ngày (NgayLap ascending)
    filtered.sort((a, b) => {
      const dComp = String(a.NgayThu || "").localeCompare(String(b.NgayThu || ""));
      if (dComp !== 0) return dComp;
      const cComp = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (cComp !== 0) return cComp;
      return String(a.SoPhieuThu || "").localeCompare(String(b.SoPhieuThu || ""));
    });

    // 3. Đánh số thứ tự (STT) 1, 2, 3...
    const data = filtered.map((item, idx) => ({
      stt: idx + 1,
      ...item,
    }));

    const totalAmount = data.reduce((sum, item) => sum + Number(item.SoTien || 0), 0);

    // 4. Tính toán số dư quỹ tiền mặt đầu kỳ và cuối kỳ (Chuẩn kế toán)
    let openingBalance = 0;
    if (fromStr) {
      const priorReceipts = rawReceipts
        .filter((r) => {
          const method = String(r.PhuongThuc || "").toLowerCase();
          if (nonCashKeywords.some((kw) => method.includes(kw))) return false;
          if (r.TrangThai === "Đã hủy") return false;
          const d = extractDateStr(r);
          return d && d < fromStr;
        })
        .reduce((sum, r) => sum + Number(r.SoTien || 0), 0);

      const allPayments = await db.collection("PhieuChi").find({}).toArray();
      const priorPayments = allPayments
        .filter((p) => {
          const method = String(p.PhuongThuc || "").toLowerCase();
          if (nonCashKeywords.some((kw) => method.includes(kw))) return false;
          if (p.TrangThai === "Đã hủy") return false;
          const d = extractDateStr(p);
          return d && d < fromStr;
        })
        .reduce((sum, p) => sum + Number(p.SoTien || 0), 0);

      openingBalance = Math.max(0, priorReceipts - priorPayments);
    }
    const closingBalance = openingBalance + totalAmount;

    res.json({
      report: "cash-receipts",
      from: fromStr,
      to: toStr,
      openingBalance,
      closingBalance,
      totalAmount,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 5.2. BÁO CÁO CHI TIỀN MẶT ĐỘC LẬP (Chuẩn Kế toán A4)
// ─────────────────────────────────────────────────────────────
router.get("/cash-payments", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, q, status } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";
    const searchTerm = q ? String(q).trim().toLowerCase() : "";

    // Lấy tất cả phiếu chi
    const rawPayments = await db.collection("PhieuChi").find({}).toArray();

    const extractDateStr = (doc) => {
      const v = doc.NgayLap || doc.NgayChi || doc.createdAt;
      if (!v) return "";
      if (typeof v === "string") return v.slice(0, 10);
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, "0");
        const d = String(v.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      return "";
    };

    // 1. Lọc giao dịch tiền mặt & loại trừ giao dịch chuyển khoản/ngân hàng
    const nonCashKeywords = ["chuyển khoản", "chuyen khoan", "ngân hàng", "ngan hang", "bank"];
    const filtered = [];
    const seen = new Set();

    for (const p of rawPayments) {
      const method = String(p.PhuongThuc || "").toLowerCase();
      const isBankTransfer = nonCashKeywords.some((kw) => method.includes(kw));
      if (isBankTransfer) continue;

      // Chống trùng lặp theo MaPC hoặc _id
      const uniqueKey = p.MaPC || p._id.toString();
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);

      // Lọc theo ngày: toDate bao gồm toàn bộ giao dịch trong ngày đó (<= toDate)
      const dateStr = extractDateStr(p);
      if (fromStr && dateStr < fromStr) continue;
      if (toStr && dateStr > toStr) continue;

      // Lọc theo trạng thái
      if (status && status !== "all" && p.TrangThai !== status) continue;

      // Lọc theo từ khóa tìm kiếm (mã phiếu, đối tượng nhận, nội dung, chứng từ gốc)
      if (searchTerm) {
        const matchCode = String(p.MaPC || "").toLowerCase().includes(searchTerm);
        const matchPerson = String(p.NguoiNhanTien || p.NguoiNhan || "").toLowerCase().includes(searchTerm);
        const matchReason = String(p.LyDo || "").toLowerCase().includes(searchTerm);
        const matchDoc = String(p.ChungTuGoc || "").toLowerCase().includes(searchTerm);
        if (!matchCode && !matchPerson && !matchReason && !matchDoc) continue;
      }

      filtered.push({
        id: p._id.toString(),
        NgayChi: dateStr,
        SoPhieuChi: p.MaPC || "",
        DoiTuongNhan: p.NguoiNhanTien || p.NguoiNhan || "Nhà cung cấp",
        NoiDung: p.LyDo || "Chi tiền mặt",
        ChungTuGoc: p.ChungTuGoc || "—",
        HinhThucChi: "Tiền mặt",
        SoTien: Number(p.SoTien || 0),
        TrangThai: p.TrangThai || "Đã lập",
        NguoiLap: p.NguoiLap || "—",
        createdAt: p.createdAt || p.NgayLap,
      });
    }

    // 2. Sắp xếp tăng dần theo ngày (NgayLap ascending)
    filtered.sort((a, b) => {
      const dComp = String(a.NgayChi || "").localeCompare(String(b.NgayChi || ""));
      if (dComp !== 0) return dComp;
      const cComp = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (cComp !== 0) return cComp;
      return String(a.SoPhieuChi || "").localeCompare(String(b.SoPhieuChi || ""));
    });

    // 3. Đánh số thứ tự (STT) 1, 2, 3...
    const data = filtered.map((item, idx) => ({
      stt: idx + 1,
      ...item,
    }));

    const totalAmount = data.reduce((sum, item) => sum + Number(item.SoTien || 0), 0);

    // 4. Tính toán số dư quỹ tiền mặt đầu kỳ và cuối kỳ (Chuẩn kế toán)
    let openingBalance = 0;
    if (fromStr) {
      const allReceipts = await db.collection("PhieuThu").find({}).toArray();
      const priorReceipts = allReceipts
        .filter((r) => {
          const method = String(r.PhuongThuc || "").toLowerCase();
          if (nonCashKeywords.some((kw) => method.includes(kw))) return false;
          if (r.TrangThai === "Đã hủy") return false;
          const d = extractDateStr(r);
          return d && d < fromStr;
        })
        .reduce((sum, r) => sum + Number(r.SoTien || 0), 0);

      const priorPayments = rawPayments
        .filter((p) => {
          const method = String(p.PhuongThuc || "").toLowerCase();
          if (nonCashKeywords.some((kw) => method.includes(kw))) return false;
          if (p.TrangThai === "Đã hủy") return false;
          const d = extractDateStr(p);
          return d && d < fromStr;
        })
        .reduce((sum, p) => sum + Number(p.SoTien || 0), 0);

      openingBalance = Math.max(0, priorReceipts - priorPayments);
    }
    const closingBalance = Math.max(0, openingBalance - totalAmount);

    res.json({
      report: "cash-payments",
      from: fromStr,
      to: toStr,
      openingBalance,
      closingBalance,
      totalAmount,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 5.3. BÁO CÁO NHẬP KHO ĐỘC LẬP (Chuẩn Kế toán A4)
// ─────────────────────────────────────────────────────────────
router.get("/warehouse-receipts", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, supplierId, productId, categoryId, q, receiptCode, status } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";
    const searchTerm = q ? String(q).trim().toLowerCase() : "";
    const codeFilter = receiptCode ? String(receiptCode).trim().toLowerCase() : "";

    const [rawReceipts, suppMap, products] = await Promise.all([
      db.collection("PhieuNhap").find({ TrangThai: { $ne: "Đã hủy" } }).sort({ NgayNhap: 1 }).toArray(),
      populateSuppliersMap(db),
      db.collection("SanPham").find({}).toArray(),
    ]);

    const prodMap = new Map();
    for (const p of products) {
      prodMap.set(p._id.toString(), p);
      if (p.MaSP) prodMap.set(p.MaSP, p);
      if (p.id) prodMap.set(String(p.id), p);
    }

    const flatRows = [];

    for (const r of rawReceipts) {
      if (status && status !== "all" && r.TrangThai !== status) continue;

      const rawDate = r.NgayNhap || r.createdAt;
      const dateStr = rawDate ? (typeof rawDate === "string" ? rawDate.slice(0, 10) : new Date(rawDate).toISOString().slice(0, 10)) : "";
      if (fromStr && dateStr < fromStr) continue;
      if (toStr && dateStr > toStr) continue;

      const rawSId = r.MaNCC ? r.MaNCC.toString() : "";
      const supp = suppMap.get(rawSId) || (r.MaNCCCode ? suppMap.get(r.MaNCCCode) : null);
      const suppName = r.TenNCC || supp?.TenNCC || r.NguoiLienQuan || "Nhà cung cấp";
      if (supplierId && supplierId !== "all") {
        const matchSupp = String(r.MaNCC) === String(supplierId) ||
                          String(r.supplierId) === String(supplierId) ||
                          (supp && String(supp._id) === String(supplierId)) ||
                          (supp && supp.MaNCC === supplierId);
        if (!matchSupp) continue;
      }

      const code = String(r.MaPN || r.id || "").trim();
      if (codeFilter && !code.toLowerCase().includes(codeFilter)) continue;

      let details = Array.isArray(r.details) && r.details.length > 0 ? r.details : [];
      if (!details.length) {
        const ctList = await db.collection("CT_PhieuNhap").find({
          $or: [
            { MaPN: r._id },
            { MaPN: r._id.toString() },
            ...(r.MaPN ? [{ MaPN: r.MaPN }] : [])
          ]
        }).toArray();
        if (ctList.length) details = ctList;
      }

      if (!details.length) {
        details = [{
          MaSP: r.MaSP || "SP001",
          TenSP: r.TenSP || "Hàng hóa nhập kho",
          DonViTinh: r.DonViTinh || "Cái",
          SoLuong: Number(r.SoLuong || 1),
          DonGia: Number(r.DonGia || r.TongTien || 0),
          ThanhTien: Number(r.TongTien || 0),
        }];
      }

      for (let idx = 0; idx < details.length; idx++) {
        const item = details[idx];
        const pId = item.MaSP || item.productId || item.id;
        const prod = prodMap.get(String(pId)) || {};

        if (productId && productId !== "all") {
          const matchProd = String(item.MaSP) === String(productId) ||
                            String(item.productId) === String(productId) ||
                            String(item.MaSPCode) === String(productId) ||
                            String(prod._id) === String(productId) ||
                            String(prod.MaSP) === String(productId);
          if (!matchProd) continue;
        }

        if (categoryId && categoryId !== "all") {
          const matchCat = (item.LoaiHang && item.LoaiHang === categoryId) ||
                           (prod.LoaiHang && prod.LoaiHang === categoryId) ||
                           (prod.MaLoai && String(prod.MaLoai) === String(categoryId));
          if (!matchCat) continue;
        }

        const qty = Number(item.SoLuong ?? item.quantity ?? 1);
        const unitPrice = Number(item.DonGia ?? item.price ?? prod.GiaNhap ?? 0);
        const amount = Number(item.ThanhTien ?? (qty * unitPrice));
        const itemCode = item.MaSPCode || prod.MaSP || item.MaSP || "—";
        const itemName = item.TenSP || prod.TenSP || "Hàng hóa";
        const unit = item.DonViTinh || prod.DonViTinh || "Cái";
        const note = r.GhiChu || r.LyDoNhap || r.SoChungTuGoc || "";

        if (searchTerm) {
          const matchCode = code.toLowerCase().includes(searchTerm);
          const matchSupp = suppName.toLowerCase().includes(searchTerm);
          const matchName = itemName.toLowerCase().includes(searchTerm);
          const matchItemCode = String(itemCode).toLowerCase().includes(searchTerm);
          const matchNote = note.toLowerCase().includes(searchTerm);
          if (!matchCode && !matchSupp && !matchName && !matchItemCode && !matchNote) continue;
        }

        flatRows.push({
          id: `${r._id}-${idx}`,
          voucherId: r._id.toString(),
          NgayNhap: dateStr,
          SoPhieuNhap: code,
          NhaCungCap: suppName,
          MaSP: itemCode,
          TenSP: itemName,
          DonViTinh: unit,
          SoLuong: qty,
          DonGia: unitPrice,
          ThanhTien: amount,
          GhiChu: note,
          Kho: r.Kho || "Kho chính",
          rawDate: dateStr,
          createdAt: r.createdAt || dateStr,
        });
      }
    }

    flatRows.sort((a, b) => {
      const dComp = String(a.NgayNhap || "").localeCompare(String(b.NgayNhap || ""));
      if (dComp !== 0) return dComp;
      const cComp = String(a.SoPhieuNhap || "").localeCompare(String(b.SoPhieuNhap || ""));
      if (cComp !== 0) return cComp;
      return String(a.id).localeCompare(String(b.id));
    });

    const data = flatRows.map((row, idx) => ({
      stt: idx + 1,
      ...row,
    }));

    const totalQuantity = data.reduce((s, row) => s + Number(row.SoLuong || 0), 0);
    const totalAmount = data.reduce((s, row) => s + Number(row.ThanhTien || 0), 0);

    res.json({
      report: "warehouse-receipts",
      from: fromStr,
      to: toStr,
      totalQuantity,
      totalAmount,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 5.4. BÁO CÁO XUẤT KHO ĐỘC LẬP (Chuẩn Kế toán A4)
// ─────────────────────────────────────────────────────────────
router.get("/warehouse-issues", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, reason, productId, categoryId, q, issueCode, status } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";
    const searchTerm = q ? String(q).trim().toLowerCase() : "";
    const codeFilter = issueCode ? String(issueCode).trim().toLowerCase() : "";

    const [rawIssues, products] = await Promise.all([
      db.collection("PhieuXuat").find({ TrangThai: { $ne: "Đã hủy" } }).sort({ NgayXuat: 1 }).toArray(),
      db.collection("SanPham").find({}).toArray(),
    ]);

    const prodMap = new Map();
    for (const p of products) {
      prodMap.set(p._id.toString(), p);
      if (p.MaSP) prodMap.set(p.MaSP, p);
      if (p.id) prodMap.set(String(p.id), p);
    }

    const flatRows = [];

    for (const i of rawIssues) {
      if (status && status !== "all" && i.TrangThai !== status) continue;

      const rawDate = i.NgayXuat || i.createdAt;
      const dateStr = rawDate ? (typeof rawDate === "string" ? rawDate.slice(0, 10) : new Date(rawDate).toISOString().slice(0, 10)) : "";
      if (fromStr && dateStr < fromStr) continue;
      if (toStr && dateStr > toStr) continue;

      const exportReason = i.LyDoXuat || i.reason || "Bán hàng";
      if (reason && reason !== "all" && exportReason !== reason) continue;

      const code = String(i.MaPX || i.id || "").trim();
      if (codeFilter && !code.toLowerCase().includes(codeFilter)) continue;

      const receiver = i.NguoiNhan || i.NguoiLienQuan || i.KhachHang || i.customerName || "Khách mua lẻ";

      let details = Array.isArray(i.details) && i.details.length > 0 ? i.details : [];
      if (!details.length) {
        const ctList = await db.collection("CT_PhieuXuat").find({
          $or: [
            { MaPX: i._id },
            { MaPX: i._id.toString() },
            ...(i.MaPX ? [{ MaPX: i.MaPX }] : [])
          ]
        }).toArray();
        if (ctList.length) details = ctList;
      }

      if (!details.length) {
        details = [{
          MaSP: i.MaSP || "SP001",
          TenSP: i.TenSP || "Hàng hóa xuất kho",
          DonViTinh: i.DonViTinh || "Cái",
          SoLuong: Number(i.SoLuong || 1),
          DonGia: Number(i.DonGia || i.TongTien || 0),
          ThanhTien: Number(i.TongTien || 0),
        }];
      }

      for (let idx = 0; idx < details.length; idx++) {
        const item = details[idx];
        const pId = item.MaSP || item.productId || item.id;
        const prod = prodMap.get(String(pId)) || {};

        if (productId && productId !== "all") {
          const matchProd = String(item.MaSP) === String(productId) ||
                            String(item.productId) === String(productId) ||
                            String(item.MaSPCode) === String(productId) ||
                            String(prod._id) === String(productId) ||
                            String(prod.MaSP) === String(productId);
          if (!matchProd) continue;
        }

        if (categoryId && categoryId !== "all") {
          const matchCat = (item.LoaiHang && item.LoaiHang === categoryId) ||
                           (prod.LoaiHang && prod.LoaiHang === categoryId) ||
                           (prod.MaLoai && String(prod.MaLoai) === String(categoryId));
          if (!matchCat) continue;
        }

        const qty = Number(item.SoLuong ?? item.quantity ?? 1);
        const unitPrice = Number(item.DonGia ?? item.price ?? prod.GiaNhap ?? 0);
        const amount = Number(item.ThanhTien ?? (qty * unitPrice));
        const itemCode = item.MaSPCode || prod.MaSP || item.MaSP || "—";
        const itemName = item.TenSP || prod.TenSP || "Hàng hóa";
        const unit = item.DonViTinh || prod.DonViTinh || "Cái";

        if (searchTerm) {
          const matchCode = code.toLowerCase().includes(searchTerm);
          const matchReceiver = receiver.toLowerCase().includes(searchTerm);
          const matchName = itemName.toLowerCase().includes(searchTerm);
          const matchItemCode = String(itemCode).toLowerCase().includes(searchTerm);
          const matchReason = exportReason.toLowerCase().includes(searchTerm);
          if (!matchCode && !matchReceiver && !matchName && !matchItemCode && !matchReason) continue;
        }

        flatRows.push({
          id: `${i._id}-${idx}`,
          voucherId: i._id.toString(),
          NgayXuat: dateStr,
          SoPhieuXuat: code,
          DoiTuongNhan: receiver,
          MaSP: itemCode,
          TenSP: itemName,
          DonViTinh: unit,
          SoLuong: qty,
          DonGia: unitPrice,
          ThanhTien: amount,
          LyDoXuat: exportReason,
          Kho: i.Kho || "Kho chính",
          rawDate: dateStr,
          createdAt: i.createdAt || dateStr,
        });
      }
    }

    flatRows.sort((a, b) => {
      const dComp = String(a.NgayXuat || "").localeCompare(String(b.NgayXuat || ""));
      if (dComp !== 0) return dComp;
      const cComp = String(a.SoPhieuXuat || "").localeCompare(String(b.SoPhieuXuat || ""));
      if (cComp !== 0) return cComp;
      return String(a.id).localeCompare(String(b.id));
    });

    const data = flatRows.map((row, idx) => ({
      stt: idx + 1,
      ...row,
    }));

    const totalQuantity = data.reduce((s, row) => s + Number(row.SoLuong || 0), 0);
    const totalAmount = data.reduce((s, row) => s + Number(row.ThanhTien || 0), 0);

    res.json({
      report: "warehouse-issues",
      from: fromStr,
      to: toStr,
      totalQuantity,
      totalAmount,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 5.5. BÁO CÁO THU TIỀN CHUYỂN KHOẢN (NGÂN HÀNG)
// ─────────────────────────────────────────────────────────────
router.get("/bank-receipts", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, q } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";
    const searchTerm = q ? String(q).trim().toLowerCase() : "";

    const [payments, invoices, custMap] = await Promise.all([
      db.collection("ThanhToan").find({}).toArray(),
      db.collection("HoaDon").find({}).toArray(),
      populateCustomersMap(db),
    ]);

    const invMap = new Map();
    for (const inv of invoices) {
      invMap.set(inv._id.toString(), inv);
      if (inv.MaHD) invMap.set(inv.MaHD, inv);
    }

    const bankKeywords = ["chuyển khoản", "chuyen khoan", "ngân hàng", "ngan hang", "bank"];
    const rows = [];

    for (const t of payments) {
      const method = String(t.PhuongThuc || "").toLowerCase();
      const isBank = bankKeywords.some((kw) => method.includes(kw));
      if (!isBank) continue;

      const rawDate = t.NgayThanhToan || t.createdAt;
      const dateStr = rawDate ? (typeof rawDate === "string" ? rawDate.slice(0, 10) : new Date(rawDate).toISOString().slice(0, 10)) : "";
      if (fromStr && dateStr < fromStr) continue;
      if (toStr && dateStr > toStr) continue;

      const inv = t.MaHD ? invMap.get(t.MaHD.toString()) : null;
      const custId = inv?.MaKH ? inv.MaKH.toString() : "";
      const cust = custId ? custMap.get(custId) : null;
      const payer = cust?.HoTen || inv?.TenKH || "Khách hàng";
      const code = t.MaTT || t._id.toString();
      const refDoc = inv?.MaHD || (t.MaHD ? String(t.MaHD).slice(-6) : "—");
      const reason = `Thu chuyển khoản thanh toán hóa đơn ${refDoc}`;
      const amount = Number(t.SoTien || 0);

      if (searchTerm) {
        const matchCode = code.toLowerCase().includes(searchTerm);
        const matchPayer = payer.toLowerCase().includes(searchTerm);
        const matchReason = reason.toLowerCase().includes(searchTerm);
        const matchDoc = refDoc.toLowerCase().includes(searchTerm);
        if (!matchCode && !matchPayer && !matchReason && !matchDoc) continue;
      }

      rows.push({
        id: t._id.toString(),
        NgayThu: dateStr,
        SoGiaoDich: code,
        DoiTuongNop: payer,
        NoiDung: reason,
        ChungTuGoc: refDoc,
        HinhThucThu: "Chuyển khoản / Ngân hàng",
        SoTien: amount,
        TrangThai: t.TrangThai || "Thành công",
        createdAt: t.createdAt || dateStr,
      });
    }

    rows.sort((a, b) => String(a.NgayThu).localeCompare(String(b.NgayThu)) || String(a.SoGiaoDich).localeCompare(String(b.SoGiaoDich)));

    const data = rows.map((r, idx) => ({ stt: idx + 1, ...r }));
    const totalAmount = data.reduce((s, r) => s + Number(r.SoTien || 0), 0);

    res.json({
      report: "bank-receipts",
      from: fromStr,
      to: toStr,
      totalAmount,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 5.6. BÁO CÁO CHI TIỀN CHUYỂN KHOẢN (ỦY NHIỆM CHI)
// ─────────────────────────────────────────────────────────────
router.get("/bank-payments", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, q } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";
    const searchTerm = q ? String(q).trim().toLowerCase() : "";

    const rawPayments = await db.collection("PhieuChi").find({}).toArray();
    const bankKeywords = ["chuyển khoản", "chuyen khoan", "ngân hàng", "ngan hang", "bank", "unc"];
    const rows = [];

    for (const p of rawPayments) {
      const method = String(p.PhuongThuc || "").toLowerCase();
      const isBank = bankKeywords.some((kw) => method.includes(kw));
      if (!isBank) continue;

      const rawDate = p.NgayLap || p.NgayChi || p.createdAt;
      const dateStr = rawDate ? (typeof rawDate === "string" ? rawDate.slice(0, 10) : new Date(rawDate).toISOString().slice(0, 10)) : "";
      if (fromStr && dateStr < fromStr) continue;
      if (toStr && dateStr > toStr) continue;

      const code = p.MaPC || p._id.toString();
      const receiver = p.NguoiNhanTien || p.NguoiNhan || "Nhà cung cấp";
      const reason = p.LyDo || "Ủy nhiệm chi chuyển khoản";
      const refDoc = p.ChungTuGoc || "—";
      const amount = Number(p.SoTien || 0);

      if (searchTerm) {
        const matchCode = code.toLowerCase().includes(searchTerm);
        const matchRec = receiver.toLowerCase().includes(searchTerm);
        const matchReason = reason.toLowerCase().includes(searchTerm);
        if (!matchCode && !matchRec && !matchReason) continue;
      }

      rows.push({
        id: p._id.toString(),
        NgayChi: dateStr,
        SoGiaoDich: code,
        DoiTuongNhan: receiver,
        NoiDung: reason,
        ChungTuGoc: refDoc,
        HinhThucChi: "Ủy nhiệm chi / Chuyển khoản",
        SoTien: amount,
        TrangThai: p.TrangThai || "Thành công",
        createdAt: p.createdAt || dateStr,
      });
    }

    rows.sort((a, b) => String(a.NgayChi).localeCompare(String(b.NgayChi)));
    const data = rows.map((r, idx) => ({ stt: idx + 1, ...r }));
    const totalAmount = data.reduce((s, r) => s + Number(r.SoTien || 0), 0);

    res.json({
      report: "bank-payments",
      from: fromStr,
      to: toStr,
      totalAmount,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 6. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (MẪU B 02 - DN)
// (Kèm theo Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính)
// ─────────────────────────────────────────────────────────────
router.get("/income-statement", async (req, res, next) => {
  try {
    const db = getDatabase();
    let { from, to, year } = req.query;

    const currentYear = year ? Number(year) : (from ? Number(String(from).slice(0, 4)) : new Date().getFullYear());
    const prevYear = currentYear - 1;

    let curFrom = from ? String(from).slice(0, 10) : `${currentYear}-01-01`;
    let curTo = to ? String(to).slice(0, 10) : `${currentYear}-12-31`;

    let prevFrom = `${prevYear}-${curFrom.slice(5)}`;
    let prevTo = `${prevYear}-${curTo.slice(5)}`;

    const [invoices, returns, products, payments] = await Promise.all([
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuTraHang").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("SanPham").find({}).toArray(),
      db.collection("PhieuChi").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
    ]);

    const prodMap = new Map();
    for (const p of products) {
      prodMap.set(p._id.toString(), p);
      if (p.MaSP) prodMap.set(p.MaSP, p);
    }

    const calcForPeriod = (startDate, endDate) => {
      let grossRev = 0;
      let totalDiscount = 0;
      let costOfGoods = 0;

      for (const inv of invoices) {
        const d = inv.NgayLap ? (typeof inv.NgayLap === "string" ? inv.NgayLap.slice(0, 10) : new Date(inv.NgayLap).toISOString().slice(0, 10)) : "";
        if (d >= startDate && d <= endDate) {
          for (const item of (inv.details || [])) {
            const qty = Number(item.SoLuong || item.quantity || 0);
            const price = Number(item.DonGia || item.price || 0);
            const discount = Number(item.GiamGia || 0);
            grossRev += qty * price;
            totalDiscount += discount;

            const pId = item.MaSP ? (item.MaSP._id ? item.MaSP._id.toString() : item.MaSP.toString()) : "";
            const p = prodMap.get(pId) || prodMap.get(item.MaSPCode);
            const cost = Number(p?.GiaNhap || price * 0.7);
            costOfGoods += qty * cost;
          }
        }
      }

      let salesReturns = 0;
      for (const ret of returns) {
        const d = ret.NgayTra ? (typeof ret.NgayTra === "string" ? ret.NgayTra.slice(0, 10) : new Date(ret.NgayTra).toISOString().slice(0, 10)) : "";
        if (d >= startDate && d <= endDate) {
          salesReturns += Number(ret.TongTien || ret.SoTien || 0);
        }
      }

      const deductions = totalDiscount + salesReturns;
      const netRev = Math.max(0, grossRev - deductions);
      const grossProfit = netRev - costOfGoods;

      let sellingExp = 0;
      let adminExp = 0;
      for (const p of payments) {
        const d = p.NgayLap || p.NgayChi ? (typeof (p.NgayLap || p.NgayChi) === "string" ? (p.NgayLap || p.NgayChi).slice(0, 10) : new Date(p.NgayLap || p.NgayChi).toISOString().slice(0, 10)) : "";
        if (d >= startDate && d <= endDate) {
          const reason = String(p.LyDo || "").toLowerCase();
          if (reason.includes("vận chuyển") || reason.includes("bán hàng") || reason.includes("giao hàng") || reason.includes("marketing") || reason.includes("quảng cáo")) {
            sellingExp += Number(p.SoTien || 0);
          } else if (!reason.includes("nhà cung cấp") && !reason.includes("ncc") && !reason.includes("tiền hàng") && !reason.includes("phiếu nhập")) {
            adminExp += Number(p.SoTien || 0);
          }
        }
      }

      const operatingProfit = grossProfit - (sellingExp + adminExp);
      const otherIncome = 0;
      const otherExpense = 0;
      const otherProfit = otherIncome - otherExpense;
      const accountingProfitBeforeTax = operatingProfit + otherProfit;
      const currentTax = accountingProfitBeforeTax > 0 ? Math.round(accountingProfitBeforeTax * 0.2) : 0;
      const deferredTax = 0;
      const netProfitAfterTax = accountingProfitBeforeTax - currentTax - deferredTax;

      return {
        grossRev,
        deductions,
        netRev,
        costOfGoods,
        grossProfit,
        realEstateProfit: 0,
        financialRev: 0,
        financialExp: 0,
        interestExp: 0,
        sellingExp,
        adminExp,
        operatingProfit,
        otherIncome,
        otherExpense,
        otherProfit,
        accountingProfitBeforeTax,
        currentTax,
        deferredTax,
        netProfitAfterTax,
      };
    };

    const cur = calcForPeriod(curFrom, curTo);
    const prev = calcForPeriod(prevFrom, prevTo);

    const items = [
      { stt: 1, name: "1. Doanh thu bán hàng và cung cấp dịch vụ", code: "01", note: "VI.25", cur: cur.grossRev, prev: prev.grossRev },
      { stt: 2, name: "2. Các khoản giảm trừ doanh thu", code: "02", note: "VI.26", cur: cur.deductions, prev: prev.deductions },
      { stt: 3, name: "3. Doanh thu thuần về bán hàng và cung cấp dịch vụ (10 = 01 - 02)", code: "10", note: "", cur: cur.netRev, prev: prev.netRev, isBold: true },
      { stt: 4, name: "4. Giá vốn hàng bán", code: "11", note: "VI.27", cur: cur.costOfGoods, prev: prev.costOfGoods },
      { stt: 5, name: "5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (20 = 10 - 11)", code: "20", note: "", cur: cur.grossProfit, prev: prev.grossProfit, isBold: true },
      { stt: 6, name: "6. Lãi/lỗ của hoạt động bán, thanh lý bất động sản đầu tư", code: "21", note: "", cur: 0, prev: 0, na: true },
      { stt: 7, name: "7. Doanh thu hoạt động tài chính", code: "22", note: "VI.28", cur: cur.financialRev, prev: prev.financialRev },
      { stt: 8, name: "8. Chi phí tài chính", code: "23", note: "VI.29", cur: cur.financialExp, prev: prev.financialExp },
      { stt: "", name: "  - Trong đó: Chi phí đi vay", code: "24", note: "", cur: cur.interestExp, prev: prev.interestExp, isSub: true },
      { stt: 9, name: "9. Chi phí bán hàng", code: "25", note: "VI.30", cur: cur.sellingExp, prev: prev.sellingExp },
      { stt: 10, name: "10. Chi phí quản lý doanh nghiệp", code: "26", note: "VI.31", cur: cur.adminExp, prev: prev.adminExp },
      { stt: 11, name: "11. Lợi nhuận thuần từ hoạt động kinh doanh {30 = 20 + 21 + 22 - (23 + 25 + 26)}", code: "30", note: "", cur: cur.operatingProfit, prev: prev.operatingProfit, isBold: true },
      { stt: 12, name: "12. Thu nhập khác", code: "31", note: "VI.32", cur: cur.otherIncome, prev: prev.otherIncome },
      { stt: 13, name: "13. Chi phí khác", code: "32", note: "VI.33", cur: cur.otherExpense, prev: prev.otherExpense },
      { stt: 14, name: "14. Lợi nhuận khác (40 = 31 - 32)", code: "40", note: "", cur: cur.otherProfit, prev: prev.otherProfit, isBold: true },
      { stt: 15, name: "15. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)", code: "50", note: "", cur: cur.accountingProfitBeforeTax, prev: prev.accountingProfitBeforeTax, isBold: true },
      { stt: 16, name: "16. Chi phí thuế TNDN hiện hành", code: "51", note: "VI.34", cur: cur.currentTax, prev: prev.currentTax },
      { stt: 17, name: "17. Chi phí thuế TNDN hoãn lại", code: "52", note: "VI.35", cur: cur.deferredTax, prev: prev.deferredTax },
      { stt: 18, name: "18. Lợi nhuận sau thuế thu nhập doanh nghiệp (60 = 50 - 51 - 52)", code: "60", note: "", cur: cur.netProfitAfterTax, prev: prev.netProfitAfterTax, isBold: true },
      { stt: 19, name: "19. Lãi cơ bản trên cổ phiếu (*)", code: "70", note: "", cur: "—", prev: "—", na: true },
      { stt: 20, name: "20. Lãi suy giảm trên cổ phiếu (*)", code: "71", note: "", cur: "—", prev: "—", na: true },
    ];

    res.json({
      report: "income-statement",
      template: "Mẫu số B 02 - DN",
      standard: "Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính",
      year: currentYear,
      curPeriod: { from: curFrom, to: curTo, label: `Năm ${currentYear}` },
      prevPeriod: { from: prevFrom, to: prevTo, label: `Năm ${prevYear}` },
      items,
      summary: cur,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 7. SỔ CHI TIẾT VẬT LIỆU, DỤNG CỤ, SẢN PHẨM, HÀNG HÓA (MẪU S10-DN)
// (Kèm theo Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính)
// ─────────────────────────────────────────────────────────────
router.get("/product-ledger", async (req, res, next) => {
  try {
    const db = getDatabase();
    let { productId, from, to, year } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";

    const [allProducts, tonKhoList, goodsReceipts, invoices, goodsIssues, adjustments, suppliers, customers] = await Promise.all([
      db.collection("SanPham").find({}).toArray(),
      db.collection("TonKho").find({}).toArray(),
      db.collection("PhieuNhap").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuXuat").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("DieuChinhKho").find({}).toArray(),
      populateSuppliersMap(db),
      populateCustomersMap(db),
    ]);

    let selectedProduct = null;
    if (productId && productId !== "all") {
      selectedProduct = allProducts.find((p) => p._id.toString() === String(productId) || p.MaSP === String(productId) || String(p.id) === String(productId));
    }
    if (!selectedProduct && allProducts.length > 0) {
      selectedProduct = allProducts[0];
    }

    if (!selectedProduct) {
      return res.json({
        report: "product-ledger",
        products: [],
        product: null,
        data: [],
        totalNhapQty: 0,
        totalNhapAmount: 0,
        totalXuatQty: 0,
        totalXuatAmount: 0,
        tonDauQty: 0,
        tonDauAmount: 0,
        tonCuoiQty: 0,
        tonCuoiAmount: 0,
      });
    }

    const pid = selectedProduct._id.toString();
    const pCode = selectedProduct.MaSP;
    const giaNhap = Number(selectedProduct.GiaNhap || selectedProduct.GiaBan || 0);

    const matchesProduct = (item) => {
      if (!item) return false;
      const itemPid = item.MaSP?._id ? item.MaSP._id.toString() : item.MaSP?.toString();
      return itemPid === pid || item.MaSP === pCode || item.productCode === pCode || item.productId === pid || item.MaSPCode === pCode;
    };

    const extractDate = (doc, field) => {
      const v = doc[field] || doc.createdAt;
      if (!v) return "";
      if (typeof v === "string") return v.slice(0, 10);
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return "";
    };

    // Tính Tồn đầu kỳ chuẩn theo logic kiểm toán
    const stockDoc = tonKhoList.find((s) => s.MaSP?.toString() === pid);
    const curStock = stockDoc ? Number(stockDoc.SoLuongTon || 0) : Number(selectedProduct.stock || 0);

    let nhapSauKy = 0;
    let xuatSauKy = 0;
    let dieuChinhSauKy = 0;
    let nhapTrongKy = 0;
    let xuatTrongKy = 0;
    let dieuChinhTrongKy = 0;

    const entries = [];

    // 1. Nhập từ PhieuNhap
    for (const pn of goodsReceipts) {
      const d = extractDate(pn, "NgayNhap");
      for (const item of (pn.details || [])) {
        if (matchesProduct(item)) {
          const qty = Number(item.SoLuong || item.quantity || 0);
          const price = Number(item.DonGia || giaNhap);
          const amount = qty * price;
          if (toStr && d > toStr) nhapSauKy += qty;
          if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
            nhapTrongKy += qty;
            const supp = pn.MaNCC ? suppliers.get(pn.MaNCC.toString()) : null;
            entries.push({
              voucherDate: d,
              voucherCode: pn.MaPN || "PN",
              description: `Nhập kho từ ${pn.TenNCC || supp?.TenNCC || "Nhà cung cấp"}`,
              tkDoiUng: pn.TkCo || "331",
              price: price,
              nhapQty: qty,
              nhapAmount: amount,
              xuatQty: 0,
              xuatAmount: 0,
              note: pn.GhiChu || "",
              createdAt: pn.createdAt || d,
            });
          }
        }
      }
    }

    // 2. Xuất bán từ HoaDon
    for (const hd of invoices) {
      const d = extractDate(hd, "NgayLap");
      for (const item of (hd.details || [])) {
        if (matchesProduct(item)) {
          const qty = Number(item.SoLuong || item.quantity || 0);
          const amount = qty * giaNhap;
          if (toStr && d > toStr) xuatSauKy += qty;
          if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
            xuatTrongKy += qty;
            const cust = hd.MaKH ? customers.get(hd.MaKH.toString()) : null;
            entries.push({
              voucherDate: d,
              voucherCode: hd.MaHD || "HD",
              description: `Xuất bán hàng cho ${hd.TenKH || cust?.HoTen || "Khách hàng"}`,
              tkDoiUng: "632",
              price: giaNhap,
              nhapQty: 0,
              nhapAmount: 0,
              xuatQty: qty,
              xuatAmount: amount,
              note: `Hóa đơn ${hd.MaHD || ""}`,
              createdAt: hd.createdAt || d,
            });
          }
        }
      }
    }

    // 3. Xuất kho khác từ PhieuXuat (không liên kết đơn hàng)
    for (const px of goodsIssues) {
      if (px.MaDH) continue;
      const d = extractDate(px, "NgayXuat");
      for (const item of (px.details || [])) {
        if (matchesProduct(item)) {
          const qty = Number(item.SoLuong || item.quantity || 0);
          const amount = qty * giaNhap;
          if (toStr && d > toStr) xuatSauKy += qty;
          if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
            xuatTrongKy += qty;
            entries.push({
              voucherDate: d,
              voucherCode: px.MaPX || "PX",
              description: `Xuất kho: ${px.LyDoXuat || "Khác"}`,
              tkDoiUng: "632",
              price: giaNhap,
              nhapQty: 0,
              nhapAmount: 0,
              xuatQty: qty,
              xuatAmount: amount,
              note: px.GhiChu || "",
              createdAt: px.createdAt || d,
            });
          }
        }
      }
    }

    // 4. Điều chỉnh kho
    for (const dc of adjustments) {
      const d = extractDate(dc, "NgayDieuChinh");
      for (const item of (dc.details || dc.items || [])) {
        if (matchesProduct(item)) {
          const qty = Number(item.SoLuongDieuChinh || item.SoLuongChenhLech || 0);
          if (toStr && d > toStr) dieuChinhSauKy += qty;
          if ((!fromStr || d >= fromStr) && (!toStr || d <= toStr)) {
            dieuChinhTrongKy += qty;
            if (qty > 0) {
              entries.push({
                voucherDate: d,
                voucherCode: dc.MaDC || "DC",
                description: `Điều chỉnh kiểm kê tăng (${dc.LyDo || "Kiểm kê"})`,
                tkDoiUng: "1381",
                price: giaNhap,
                nhapQty: qty,
                nhapAmount: qty * giaNhap,
                xuatQty: 0,
                xuatAmount: 0,
                note: dc.GhiChu || "",
                createdAt: dc.createdAt || d,
              });
            } else if (qty < 0) {
              const absQty = Math.abs(qty);
              entries.push({
                voucherDate: d,
                voucherCode: dc.MaDC || "DC",
                description: `Điều chỉnh kiểm kê giảm (${dc.LyDo || "Kiểm kê"})`,
                tkDoiUng: "3381",
                price: giaNhap,
                nhapQty: 0,
                nhapAmount: 0,
                xuatQty: absQty,
                xuatAmount: absQty * giaNhap,
                note: dc.GhiChu || "",
                createdAt: dc.createdAt || d,
              });
            }
          }
        }
      }
    }

    const tonCuoiQty = Math.max(0, curStock - nhapSauKy + xuatSauKy - dieuChinhSauKy);
    const tonDauQty = Math.max(0, tonCuoiQty - nhapTrongKy + xuatTrongKy - dieuChinhTrongKy);
    const tonDauAmount = tonDauQty * giaNhap;
    const tonCuoiAmount = tonCuoiQty * giaNhap;

    // Sắp xếp chứng từ phát sinh theo thời gian
    entries.sort((a, b) => {
      const dComp = String(a.voucherDate).localeCompare(String(b.voucherDate));
      if (dComp !== 0) return dComp;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    // Tính lũy kế tồn sau mỗi dòng
    let runningQty = tonDauQty;
    const dataRows = entries.map((r, idx) => {
      runningQty = runningQty + Number(r.nhapQty || 0) - Number(r.xuatQty || 0);
      const runningAmount = runningQty * (r.price || giaNhap);
      return {
        stt: idx + 1,
        ...r,
        tonQty: runningQty,
        tonAmount: runningAmount,
      };
    });

    const totalNhapQty = dataRows.reduce((s, r) => s + Number(r.nhapQty || 0), 0);
    const totalNhapAmount = dataRows.reduce((s, r) => s + Number(r.nhapAmount || 0), 0);
    const totalXuatQty = dataRows.reduce((s, r) => s + Number(r.xuatQty || 0), 0);
    const totalXuatAmount = dataRows.reduce((s, r) => s + Number(r.xuatAmount || 0), 0);

    const productsList = allProducts.map((p) => ({
      id: p._id.toString(),
      code: p.MaSP,
      name: p.TenSP,
      unit: p.DonViTinh || "Cái",
      costPrice: Number(p.GiaNhap || 0),
    }));

    res.json({
      report: "product-ledger",
      template: "Mẫu số S10-DN",
      standard: "Thông tư số 99/2025/TT-BTC ngày 27/10/2025 của Bộ trưởng Bộ Tài chính",
      from: fromStr,
      to: toStr,
      product: {
        id: selectedProduct._id.toString(),
        code: selectedProduct.MaSP,
        name: selectedProduct.TenSP,
        unit: selectedProduct.DonViTinh || "Cái",
        account: "156",
        warehouse: "Kho chính",
        costPrice: giaNhap,
      },
      products: productsList,
      tonDauQty,
      tonDauAmount,
      totalNhapQty,
      totalNhapAmount,
      totalXuatQty,
      totalXuatAmount,
      tonCuoiQty,
      tonCuoiAmount,
      data: dataRows,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 8. SỔ NHẬT KÝ CHUNG (MẪU S03a-DNN)
// (Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính)
// ─────────────────────────────────────────────────────────────
router.get("/general-journal", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to, year } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";

    const [invoices, receipts, payments, goodsReceipts, products, custMap, suppMap] = await Promise.all([
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuThu").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuChi").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuNhap").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("SanPham").find({}).toArray(),
      populateCustomersMap(db),
      populateSuppliersMap(db),
    ]);

    const prodMap = new Map();
    for (const p of products) {
      prodMap.set(p._id.toString(), p);
      if (p.MaSP) prodMap.set(p.MaSP, p);
    }

    const journalEntries = [];

    // 1. Nghiệp vụ Bán hàng từ HoaDon
    for (const inv of invoices) {
      const d = inv.NgayLap ? (typeof inv.NgayLap === "string" ? inv.NgayLap.slice(0, 10) : new Date(inv.NgayLap).toISOString().slice(0, 10)) : "";
      if (fromStr && d < fromStr) continue;
      if (toStr && d > toStr) continue;

      const cust = inv.MaKH ? custMap.get(inv.MaKH.toString()) : null;
      const custName = inv.TenKH || cust?.HoTen || "Khách mua lẻ";
      const totalAmount = Number(inv.TongTien || 0);

      // Tính giá vốn
      let cogs = 0;
      for (const item of (inv.details || [])) {
        const qty = Number(item.SoLuong || item.quantity || 0);
        const pId = item.MaSP ? (item.MaSP._id ? item.MaSP._id.toString() : item.MaSP.toString()) : "";
        const prod = prodMap.get(pId) || prodMap.get(item.MaSPCode);
        const cost = Number(prod?.GiaNhap || (Number(item.DonGia || 0) * 0.7));
        cogs += qty * cost;
      }

      // Bút toán 1: Doanh thu bán hàng (Nợ 111/131 - Có 511)
      const tkTien = inv.TrangThai === "Đã thanh toán" ? "111" : "131";
      journalEntries.push({
        date: d,
        voucherCode: inv.MaHD || "HD",
        voucherDate: d,
        description: `Doanh thu bán hàng cho ${custName}`,
        postedLedger: "X",
        lineNo: 1,
        accountDebit: tkTien,
        accountCredit: "",
        debitAmount: totalAmount,
        creditAmount: 0,
        createdAt: inv.createdAt || d,
      });
      journalEntries.push({
        date: d,
        voucherCode: inv.MaHD || "HD",
        voucherDate: d,
        description: `Doanh thu bán hàng cho ${custName}`,
        postedLedger: "X",
        lineNo: 2,
        accountDebit: "",
        accountCredit: "511",
        debitAmount: 0,
        creditAmount: totalAmount,
        createdAt: inv.createdAt || d,
      });

      // Bút toán 2: Xuất kho giá vốn (Nợ 632 - Có 156)
      if (cogs > 0) {
        journalEntries.push({
          date: d,
          voucherCode: inv.MaHD || "HD",
          voucherDate: d,
          description: `Giá vốn hàng bán xuất kho theo hóa đơn ${inv.MaHD || ""}`,
          postedLedger: "X",
          lineNo: 3,
          accountDebit: "632",
          accountCredit: "",
          debitAmount: cogs,
          creditAmount: 0,
          createdAt: inv.createdAt || d,
        });
        journalEntries.push({
          date: d,
          voucherCode: inv.MaHD || "HD",
          voucherDate: d,
          description: `Giá vốn hàng bán xuất kho theo hóa đơn ${inv.MaHD || ""}`,
          postedLedger: "X",
          lineNo: 4,
          accountDebit: "",
          accountCredit: "156",
          debitAmount: 0,
          creditAmount: cogs,
          createdAt: inv.createdAt || d,
        });
      }
    }

    // 2. Nghiệp vụ Nhập kho từ PhieuNhap (Nợ 156 - Có 331)
    for (const pn of goodsReceipts) {
      const d = pn.NgayNhap ? (typeof pn.NgayNhap === "string" ? pn.NgayNhap.slice(0, 10) : new Date(pn.NgayNhap).toISOString().slice(0, 10)) : "";
      if (fromStr && d < fromStr) continue;
      if (toStr && d > toStr) continue;

      const supp = pn.MaNCC ? suppMap.get(pn.MaNCC.toString()) : null;
      const suppName = pn.TenNCC || supp?.TenNCC || "Nhà cung cấp";
      const totalAmount = Number(pn.TongTien || 0);

      journalEntries.push({
        date: d,
        voucherCode: pn.MaPN || "PN",
        voucherDate: d,
        description: `Nhập kho nguyên vật liệu, hàng hóa từ ${suppName}`,
        postedLedger: "X",
        lineNo: 1,
        accountDebit: "156",
        accountCredit: "",
        debitAmount: totalAmount,
        creditAmount: 0,
        createdAt: pn.createdAt || d,
      });
      journalEntries.push({
        date: d,
        voucherCode: pn.MaPN || "PN",
        voucherDate: d,
        description: `Phải trả nhà cung cấp ${suppName}`,
        postedLedger: "X",
        lineNo: 2,
        accountDebit: "",
        accountCredit: "331",
        debitAmount: 0,
        creditAmount: totalAmount,
        createdAt: pn.createdAt || d,
      });
    }

    // 3. Nghiệp vụ Thu tiền mặt từ PhieuThu (Nợ 111 - Có 131/511/711)
    for (const pt of receipts) {
      const d = pt.NgayLap || pt.NgayThu ? (typeof (pt.NgayLap || pt.NgayThu) === "string" ? (pt.NgayLap || pt.NgayThu).slice(0, 10) : new Date(pt.NgayLap || pt.NgayThu).toISOString().slice(0, 10)) : "";
      if (fromStr && d < fromStr) continue;
      if (toStr && d > toStr) continue;

      const amount = Number(pt.SoTien || 0);
      journalEntries.push({
        date: d,
        voucherCode: pt.MaPT || "PT",
        voucherDate: d,
        description: `Thu tiền mặt: ${pt.LyDo || "Thu tiền"}`,
        postedLedger: "X",
        lineNo: 1,
        accountDebit: "111",
        accountCredit: "",
        debitAmount: amount,
        creditAmount: 0,
        createdAt: pt.createdAt || d,
      });
      journalEntries.push({
        date: d,
        voucherCode: pt.MaPT || "PT",
        voucherDate: d,
        description: `Đối ứng thu tiền mặt: ${pt.LyDo || "Thu tiền"}`,
        postedLedger: "X",
        lineNo: 2,
        accountDebit: "",
        accountCredit: "131",
        debitAmount: 0,
        creditAmount: amount,
        createdAt: pt.createdAt || d,
      });
    }

    // 4. Nghiệp vụ Chi tiền mặt từ PhieuChi (Nợ 331/641/642 - Có 111)
    for (const pc of payments) {
      const d = pc.NgayLap || pc.NgayChi ? (typeof (pc.NgayLap || pc.NgayChi) === "string" ? (pc.NgayLap || pc.NgayChi).slice(0, 10) : new Date(pc.NgayLap || pc.NgayChi).toISOString().slice(0, 10)) : "";
      if (fromStr && d < fromStr) continue;
      if (toStr && d > toStr) continue;

      const amount = Number(pc.SoTien || 0);
      const reason = String(pc.LyDo || "").toLowerCase();
      const tkNo = reason.includes("nhà cung cấp") || reason.includes("ncc") || reason.includes("tiền hàng") ? "331" : (reason.includes("vận chuyển") || reason.includes("bán hàng") ? "641" : "642");

      journalEntries.push({
        date: d,
        voucherCode: pc.MaPC || "PC",
        voucherDate: d,
        description: `Chi tiền mặt: ${pc.LyDo || "Chi phí kinh doanh"}`,
        postedLedger: "X",
        lineNo: 1,
        accountDebit: tkNo,
        accountCredit: "",
        debitAmount: amount,
        creditAmount: 0,
        createdAt: pc.createdAt || d,
      });
      journalEntries.push({
        date: d,
        voucherCode: pc.MaPC || "PC",
        voucherDate: d,
        description: `Chi tiền mặt: ${pc.LyDo || "Chi phí kinh doanh"}`,
        postedLedger: "X",
        lineNo: 2,
        accountDebit: "",
        accountCredit: "111",
        debitAmount: 0,
        creditAmount: amount,
        createdAt: pc.createdAt || d,
      });
    }

    journalEntries.sort((a, b) => String(a.date).localeCompare(String(b.date)) || new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const data = journalEntries.map((row, idx) => ({
      stt: idx + 1,
      ...row,
    }));

    const totalDebit = data.reduce((s, r) => s + Number(r.debitAmount || 0), 0);
    const totalCredit = data.reduce((s, r) => s + Number(r.creditAmount || 0), 0);

    res.json({
      report: "general-journal",
      template: "Mẫu số S03a-DNN",
      standard: "Thông tư số 133/2016/TT-BTC ngày 26/8/2016 của Bộ Tài chính",
      from: fromStr,
      to: toStr,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
      totalEntries: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 9. SỔ TÀI SẢN CỐ ĐỊNH (MẪU S21-DN)
// (Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)
// ─────────────────────────────────────────────────────────────
router.get("/fixed-assets", async (req, res, next) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    res.json({
      report: "fixed-assets",
      template: "Mẫu số S21-DN",
      standard: "Thông tư số 200/2014/TT-BTC Ngày 22/12/2014 của Bộ Tài chính",
      year: targetYear,
      isModuleAvailable: false,
      data: [],
      columns: [
        { code: "A", name: "Số thứ tự" },
        { code: "B", name: "Số hiệu chứng từ tăng TSCĐ" },
        { code: "C", name: "Ngày tháng chứng từ tăng TSCĐ" },
        { code: "D", name: "Tên, đặc điểm, ký hiệu TSCĐ" },
        { code: "E", name: "Nước sản xuất" },
        { code: "G", name: "Tháng năm đưa vào sử dụng" },
        { code: "H", name: "Số hiệu TSCĐ" },
        { code: "1", name: "Nguyên giá TSCĐ" },
        { code: "2", name: "Tỷ lệ (%) khấu hao" },
        { code: "3", name: "Mức khấu hao" },
        { code: "4", name: "Khấu hao đã tính đến khi ghi giảm" },
        { code: "I", name: "Số hiệu chứng từ giảm TSCĐ" },
        { code: "K", name: "Ngày tháng chứng từ giảm TSCĐ" },
        { code: "L", name: "Lý do giảm TSCĐ" },
      ],
      notice: "Hệ thống ERP Cửa hàng Mẹ & Bé hiện tại tập trung vận hành Bán hàng POS, Quản lý kho, Công nợ khách hàng & nhà cung cấp, Quỹ tiền mặt. Module Quản trị Tài sản Cố định & Khấu hao chưa ghi nhận dữ liệu trong cơ sở dữ liệu hiện hành.",
      nextSteps: [
        "Khởi tạo bảng danh mục Tài sản cố định (Mã TSCĐ, Tên TSCĐ, Nguyên giá, Năm sử dụng, Tỷ lệ KH)",
        "Tích hợp chức năng hạch toán trích khấu hao hàng tháng Nợ TK 641, 642 / Có TK 214",
        "Tích hợp quy trình bàn giao, điều chuyển và thanh lý TSCĐ theo chuẩn VAS",
      ],
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 10. BÁO CÁO DOANH SỐ BÁN HÀNG THEO NHÂN VIÊN
// ─────────────────────────────────────────────────────────────
router.get("/sales-by-employee", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";

    const [invoices, employees] = await Promise.all([
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("NhanVien").find({}).toArray(),
    ]);

    const empMap = new Map();
    for (const e of employees) {
      empMap.set(e._id.toString(), e);
      if (e.MaNV) empMap.set(e.MaNV, e);
      if (e.username) empMap.set(e.username, e);
    }

    const byEmp = new Map();

    for (const inv of invoices) {
      const d = inv.NgayLap ? (typeof inv.NgayLap === "string" ? inv.NgayLap.slice(0, 10) : new Date(inv.NgayLap).toISOString().slice(0, 10)) : "";
      if (fromStr && d < fromStr) continue;
      if (toStr && d > toStr) continue;

      const rawEmpId = inv.MaNV ? inv.MaNV.toString() : "unassigned";
      const emp = empMap.get(rawEmpId);
      const empName = emp?.HoTen || inv.NguoiLap || "Nhân viên bán hàng";
      const empCode = emp?.MaNV || inv.MaNV || "NV";

      const key = `${empCode}-${empName}`;
      const entry = byEmp.get(key) || {
        empCode,
        empName,
        position: emp?.ChucVu || "Thu ngân / Bán hàng",
        invoicesCount: 0,
        totalRevenue: 0,
        totalProductsSold: 0,
      };

      entry.invoicesCount += 1;
      entry.totalRevenue += Number(inv.TongTien || 0);
      const itemsCount = (inv.details || []).reduce((s, it) => s + Number(it.SoLuong || it.quantity || 0), 0);
      entry.totalProductsSold += itemsCount;
      byEmp.set(key, entry);
    }

    const data = [...byEmp.values()].sort((a, b) => b.totalRevenue - a.totalRevenue).map((item, idx) => ({ stt: idx + 1, ...item }));
    const totalRevenue = data.reduce((s, r) => s + r.totalRevenue, 0);
    const totalInvoices = data.reduce((s, r) => s + r.invoicesCount, 0);

    res.json({
      report: "sales-by-employee",
      from: fromStr,
      to: toStr,
      totalRevenue,
      totalInvoices,
      data,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────
// 11. BÁO CÁO KIỂM KÊ VÀ ĐIỀU CHỈNH KHO
// ─────────────────────────────────────────────────────────────
router.get("/stocktake-adjustments", async (req, res, next) => {
  try {
    const db = getDatabase();
    const { from, to } = req.query;

    const fromStr = from ? String(from).slice(0, 10) : "";
    const toStr = to ? String(to).slice(0, 10) : "";

    const [stocktakes, adjustments, products] = await Promise.all([
      db.collection("KiemKe").find({}).toArray(),
      db.collection("DieuChinhKho").find({}).toArray(),
      db.collection("SanPham").find({}).toArray(),
    ]);

    const prodMap = new Map();
    for (const p of products) {
      prodMap.set(p._id.toString(), p);
      if (p.MaSP) prodMap.set(p.MaSP, p);
    }

    const rows = [];

    // Duyệt qua phiếu điều chỉnh kho
    for (const dc of adjustments) {
      const d = dc.NgayDieuChinh ? (typeof dc.NgayDieuChinh === "string" ? dc.NgayDieuChinh.slice(0, 10) : new Date(dc.NgayDieuChinh).toISOString().slice(0, 10)) : "";
      if (fromStr && d < fromStr) continue;
      if (toStr && d > toStr) continue;

      const code = dc.MaDC || dc._id.toString();
      const reason = dc.LyDo || dc.LyDoDieuChinh || "Điều chỉnh kho";
      const creator = dc.NguoiThucHien || dc.NguoiLap || "Thủ kho";

      for (const item of (dc.details || dc.items || [])) {
        const pId = item.MaSP ? (item.MaSP._id ? item.MaSP._id.toString() : item.MaSP.toString()) : "";
        const prod = prodMap.get(pId) || prodMap.get(item.MaSPCode);
        const qtyDiff = Number(item.SoLuongDieuChinh || item.SoLuongChenhLech || 0);
        const unitPrice = Number(prod?.GiaNhap || 0);
        const amountDiff = qtyDiff * unitPrice;

        rows.push({
          id: `${dc._id}-${item.MaSP || ""}`,
          voucherCode: code,
          date: d,
          productCode: prod?.MaSP || item.MaSPCode || "—",
          productName: prod?.TenSP || item.TenSP || "Hàng hóa",
          unit: prod?.DonViTinh || "Cái",
          qtyDiff,
          unitPrice,
          amountDiff,
          reason,
          creator,
          type: qtyDiff > 0 ? "Điều chỉnh tăng" : (qtyDiff < 0 ? "Điều chỉnh giảm" : "Khớp tồn"),
        });
      }
    }

    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const data = rows.map((r, idx) => ({ stt: idx + 1, ...r }));

    res.json({
      report: "stocktake-adjustments",
      from: fromStr,
      to: toStr,
      totalCount: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

