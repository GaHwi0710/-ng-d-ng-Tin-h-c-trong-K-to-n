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

    // Tập hợp doanh thu từ từng hóa đơn thực tế
    for (const inv of invoices) {
      const dateStr = String(inv.NgayLap || "").slice(0, 10);
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

    const [products, stocks, categories, goodsReceipts, invoices, goodsIssues] = await Promise.all([
      db.collection("SanPham").find(query).toArray(),
      db.collection("TonKho").find({}).toArray(),
      db.collection("LoaiHang").find({}).toArray(),
      db.collection("PhieuNhap").find({}).toArray(),
      db.collection("HoaDon").find({ TrangThai: { $ne: "Đã hủy" } }).toArray(),
      db.collection("PhieuXuat").find({}).toArray(),
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

      // 3. Tính toán Tồn cuối và Tồn đầu chuẩn kế toán:
      // Tồn cuối kỳ = tồn hiện tại trừ nhập phát sinh sau kỳ cộng xuất phát sinh sau kỳ
      const tonCuoi = Math.max(0, curStock - nhapSauKy + xuatSauKy);
      // Đẳng thức kế toán bắt buộc: TonCuoi = TonDau + NhapTrongKy - XuatTrongKy
      // => TonDau = TonCuoi - NhapTrongKy + XuatTrongKy
      const tonDau = tonCuoi - nhapTrongKy + xuatTrongKy;

      const giaNhap = Number(p.GiaNhap || p.GiaBan || 0);
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
        NhapTrongKy: nhapTrongKy,
        XuatTrongKy: xuatTrongKy,
        TonCuoi: tonCuoi,
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
    const totalImportStock = data.reduce((sum, p) => sum + p.NhapTrongKy, 0);
    const totalExportStock = data.reduce((sum, p) => sum + p.XuatTrongKy, 0);
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
      totalImportStock,
      totalExportStock,
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

export default router;
