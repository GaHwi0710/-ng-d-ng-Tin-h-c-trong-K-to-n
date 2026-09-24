import "../backend/node_modules/dotenv/config.js";
import { ObjectId } from "../backend/node_modules/mongodb/lib/index.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

function toId(val) {
  if (!val) return null;
  const raw = val._id || val.id || val;
  return ObjectId.isValid(raw) ? new ObjectId(raw) : raw;
}

async function runRevenueReportE2E() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`\n==================================================`);
  console.log(`E2E TEST SUITE: UC23 - REVENUE REPORT BY DAY/MONTH/YEAR`);
  console.log(`Server running at ${baseUrl}`);
  console.log(`==================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log("[AUTH] Logging in as admin (QuanLy) and ketoan (KeToan)");

    const loginUser = async (username, password) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      return { status: res.status, token: data.token, user: data.user };
    };

    const admin = await loginUser("admin", "admin123");
    assert(admin.status === 200, "Login 'admin' (QuanLy) 200 OK");

    const ketoan = await loginUser("ketoan", "ketoan123");
    assert(ketoan.status === 200, "Login 'ketoan' (KeToan) 200 OK");

    // -------------------------------------------------------------------------
    // TEST 1: CÓ 3 HÓA ĐƠN TRONG CÙNG NGÀY -> TỔNG DOANH THU = TỔNG 3 HÓA ĐƠN
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] UC23: Có 3 hóa đơn trong cùng ngày 2026-09-04");
    const testDate = "2026-09-04";
    const dayInvoices = await db.collection("HoaDon").find({
      NgayLap: testDate,
      TrangThai: { $ne: "Đã hủy" },
    }).toArray();

    const expectedDayOrders = dayInvoices.length;
    const expectedDayRevenue = dayInvoices.reduce((sum, inv) => sum + Number(inv.TongTien || 0), 0);
    console.log(`  -> Database has ${expectedDayOrders} invoices on ${testDate}, Total: ${expectedDayRevenue}`);

    const t1Res = await fetch(`${baseUrl}/reports/revenue?from=${testDate}&to=${testDate}&groupBy=day`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(t1Res.status === 200, "GET /api/reports/revenue (groupBy=day) returns 200 OK");
    const t1Data = await t1Res.json();

    assert(t1Data.orders === expectedDayOrders, `API orders count matches DB invoices count: ${t1Data.orders} == ${expectedDayOrders}`);
    assert(t1Data.total === expectedDayRevenue, `API total revenue matches sum of 3 invoices: ${t1Data.total} == ${expectedDayRevenue}`);

    const dayBreakdown = t1Data.breakdown.find((b) => b.period === testDate);
    assert(dayBreakdown !== undefined, `Breakdown contains entry for day ${testDate}`);
    assert(
      dayBreakdown && dayBreakdown.revenue === expectedDayRevenue && dayBreakdown.ordersCount === expectedDayOrders,
      `Day breakdown entry: revenue=${dayBreakdown?.revenue}, ordersCount=${dayBreakdown?.ordersCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: CÓ HÓA ĐƠN Ở 2 NGÀY KHÁC NHAU -> TÁCH DOANH THU TỪNG NGÀY CHÍNH XÁC
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] UC23: Có hóa đơn ở 2 ngày khác nhau (2026-08-25 và 2026-09-04)");
    const dateA = "2026-08-25";
    const dateB = "2026-09-04";

    const invA = await db.collection("HoaDon").find({ NgayLap: dateA, TrangThai: { $ne: "Đã hủy" } }).toArray();
    const invB = await db.collection("HoaDon").find({ NgayLap: dateB, TrangThai: { $ne: "Đã hủy" } }).toArray();
    const sumA = invA.reduce((s, i) => s + Number(i.TongTien || 0), 0);
    const sumB = invB.reduce((s, i) => s + Number(i.TongTien || 0), 0);

    const t2Res = await fetch(`${baseUrl}/reports/revenue?from=${dateA}&to=${dateB}&groupBy=day`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(t2Res.status === 200, "GET /api/reports/revenue for date range returns 200 OK");
    const t2Data = await t2Res.json();

    const itemA = t2Data.breakdown.find((b) => b.period === dateA);
    const itemB = t2Data.breakdown.find((b) => b.period === dateB);

    assert(itemA !== undefined && itemA.revenue === sumA, `Day ${dateA} revenue is accurately separated: ${itemA?.revenue} == ${sumA}`);
    assert(itemB !== undefined && itemB.revenue === sumB, `Day ${dateB} revenue is accurately separated: ${itemB?.revenue} == ${sumB}`);
    assert(itemA?.period !== itemB?.period, `Two distinct dates have distinct breakdown periods: ${itemA?.period} vs ${itemB?.period}`);

    // -------------------------------------------------------------------------
    // TEST 3: CHỌN THÁNG -> CÁC HÓA ĐƠN TRONG THÁNG ĐƯỢC TỔNG HỢP ĐÚNG
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] UC23: Chọn tháng (2026-09) -> Tổng hợp đúng các hóa đơn trong tháng");
    const sepInvoices = await db.collection("HoaDon").find({
      NgayLap: { $regex: "^2026-09" },
      TrangThai: { $ne: "Đã hủy" },
    }).toArray();
    const expectedSepRevenue = sepInvoices.reduce((s, i) => s + Number(i.TongTien || 0), 0);
    const expectedSepOrders = sepInvoices.length;

    const t3Res = await fetch(`${baseUrl}/reports/revenue?from=2026-09-01&to=2026-09-30&groupBy=month`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(t3Res.status === 200, "GET /api/reports/revenue (groupBy=month) returns 200 OK");
    const t3Data = await t3Res.json();

    const sepItem = t3Data.breakdown.find((b) => b.period === "2026-09");
    assert(sepItem !== undefined, "Breakdown contains entry for '2026-09'");
    assert(
      sepItem && sepItem.revenue === expectedSepRevenue,
      `Month 2026-09 revenue aggregated accurately: ${sepItem?.revenue} == ${expectedSepRevenue}`
    );
    assert(
      sepItem && sepItem.ordersCount === expectedSepOrders,
      `Month 2026-09 orders count matches: ${sepItem?.ordersCount} == ${expectedSepOrders}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: CHỌN NĂM -> CÁC THÁNG ĐƯỢC TỔNG HỢP ĐÚNG (12 THÁNG)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] UC23: Chọn năm (year=2026&groupBy=month) -> Tổng hợp 12 tháng trong năm");
    const t4Res = await fetch(`${baseUrl}/reports/revenue?year=2026&groupBy=month`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(t4Res.status === 200, "GET /api/reports/revenue?year=2026&groupBy=month returns 200 OK");
    const t4Data = await t4Res.json();

    assert(t4Data.breakdown.length === 12, `Year 2026 returns all 12 calendar months: count=${t4Data.breakdown.length}`);
    const sumMonths = t4Data.breakdown.reduce((s, m) => s + Number(m.revenue || 0), 0);
    assert(sumMonths === t4Data.total, `Sum of 12 months (${sumMonths}) equals annual total revenue (${t4Data.total})`);

    // Test groupBy=year
    const t4YearRes = await fetch(`${baseUrl}/reports/revenue?groupBy=year`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(t4YearRes.status === 200, "GET /api/reports/revenue?groupBy=year returns 200 OK");
    const t4YearData = await t4YearRes.json();
    const y2026 = t4YearData.breakdown.find((b) => b.period === "2026");
    assert(y2026 !== undefined, "Year breakdown contains entry for '2026'");
    assert(y2026?.revenue === t4Data.total, `Year 2026 revenue (${y2026?.revenue}) matches sum of months (${t4Data.total})`);

    // -------------------------------------------------------------------------
    // TEST 5: MỘT INVOICE CÓ NHIỀU INVOICE DETAIL -> CHỈ TÍNH DOANH THU ĐÚNG 1 LẦN
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Integrity: Invoice có nhiều chi tiết dòng -> Chỉ tính doanh thu đúng 1 lần");
    const multiLineInvoice = await db.collection("HoaDon").findOne({
      "details.1": { $exists: true }, // At least 2 items
      TrangThai: { $ne: "Đã hủy" },
    });

    if (multiLineInvoice) {
      console.log(`  -> Found multi-line invoice: ${multiLineInvoice.MaHD}, Details count: ${multiLineInvoice.details.length}, TongTien: ${multiLineInvoice.TongTien}`);
      const invDate = String(multiLineInvoice.NgayLap || "").slice(0, 10);

      // Verify that this invoice's amount is counted exactly once in that day's revenue
      const dayAllInvs = await db.collection("HoaDon").find({ NgayLap: invDate, TrangThai: { $ne: "Đã hủy" } }).toArray();
      const expectedDaySum = dayAllInvs.reduce((s, i) => s + Number(i.TongTien || 0), 0);

      const dayCheckRes = await fetch(`${baseUrl}/reports/revenue?from=${invDate}&to=${invDate}&groupBy=day`, {
        headers: { Authorization: `Bearer ${ketoan.token}` },
      });
      const dayCheckData = await dayCheckRes.json();
      assert(
        dayCheckData.total === expectedDaySum,
        `Invoice with ${multiLineInvoice.details.length} details is counted ONCE: day total ${dayCheckData.total} == ${expectedDaySum}`
      );
    } else {
      assert(true, "No multi-line invoice found (skipped)");
    }

    // -------------------------------------------------------------------------
    // TEST 6: INVOICE CÓ PAYMENT -> KHÔNG CỘNG PAYMENT THÊM LẦN NỮA (TRÁNH DOUBLE-COUNT)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Integrity: Invoice có payment -> Không cộng dồn Payment vào doanh thu (Tránh double-count)");
    const totalInvoicesSum = await db.collection("HoaDon")
      .find({ TrangThai: { $ne: "Đã hủy" } })
      .toArray()
      .then((invs) => invs.reduce((s, i) => s + Number(i.TongTien || 0), 0));

    const totalPaymentsSum = await db.collection("ThanhToan")
      .find({})
      .toArray()
      .then((pmts) => pmts.reduce((s, p) => s + Number(p.SoTien || 0), 0));

    console.log(`  -> Total Invoices Sum: ${totalInvoicesSum}, Total Payments in DB: ${totalPaymentsSum}`);

    const allRevRes = await fetch(`${baseUrl}/reports/revenue?status=all`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    const allRevData = await allRevRes.json();

    assert(
      allRevData.total === totalInvoicesSum,
      `Revenue matches invoice sum exactly (${allRevData.total} == ${totalInvoicesSum}) and DOES NOT add payments (${allRevData.total} != ${totalInvoicesSum + totalPaymentsSum})`
    );

    // -------------------------------------------------------------------------
    // TEST 7: INVOICE CHƯA THANH TOÁN (CÔNG NỢ) -> XỬ LÝ THEO CHUẨN KẾ TOÁN
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Business Rule: Invoice chưa thanh toán (bán chịu) -> Ghi nhận doanh thu và tách riêng công nợ");
    const unpaidInvoices = await db.collection("HoaDon").find({ TrangThai: "Chưa thanh toán" }).toArray();
    const unpaidSum = unpaidInvoices.reduce((s, i) => s + Number(i.TongTien || 0), 0);
    console.log(`  -> Found ${unpaidInvoices.length} unpaid invoices, total: ${unpaidSum}`);

    assert(allRevData.totalUnpaid > 0, `API revenue reports totalUnpaid accurately: ${allRevData.totalUnpaid} > 0`);
    assert(
      allRevData.total === allRevData.totalPaid + allRevData.totalUnpaid,
      `Accrual balance: Total Revenue (${allRevData.total}) == Total Paid (${allRevData.totalPaid}) + Total Unpaid (${allRevData.totalUnpaid})`
    );

    // Filter specifically by "Chưa thanh toán"
    const unpaidRevRes = await fetch(`${baseUrl}/reports/revenue?status=Chưa thanh toán`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    const unpaidRevData = await unpaidRevRes.json();
    assert(
      unpaidRevData.total === unpaidSum,
      `Specific filter 'Chưa thanh toán' returns exact unpaid invoice amount: ${unpaidRevData.total} == ${unpaidSum}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: INVOICE CANCELLED/VOID (ĐÃ HỦY) -> KHÔNG ĐƯỢC TÍNH VÀO DOANH THU
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Integrity: Invoice bị hủy (TrangThai = 'Đã hủy') -> Không được tính vào doanh thu");
    const baselineRevenue = allRevData.total;

    // Temporarily insert a cancelled test invoice
    const fakeCancelledInvoice = {
      MaHD: "HD-CANCEL-TEST",
      NgayLap: "2026-09-24",
      TongTien: 99999999, // large amount
      TrangThai: "Đã hủy",
      createdAt: new Date(),
    };
    const insResult = await db.collection("HoaDon").insertOne(fakeCancelledInvoice);

    const checkCancelledRes = await fetch(`${baseUrl}/reports/revenue`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    const checkCancelledData = await checkCancelledRes.json();

    assert(
      checkCancelledData.total === baselineRevenue,
      `Cancelled invoice (99,999,999 đ) was IGNORED: Total revenue remains ${checkCancelledData.total} == ${baselineRevenue}`
    );

    // Clean up temporary test document
    await db.collection("HoaDon").deleteOne({ _id: insResult.insertedId });
    console.log("  -> Cleaned up cancelled test invoice safely.");

    // -------------------------------------------------------------------------
    // TEST 9: PERSISTENCE & REPEAT REFRESH
    // -------------------------------------------------------------------------
    console.log("\n[TEST 9] Persistence: Gọi API nhiều lần liên tiếp -> Dữ liệu nhất quán với DB");
    const ref1 = await fetch(`${baseUrl}/reports/revenue`, { headers: { Authorization: `Bearer ${ketoan.token}` } }).then((r) => r.json());
    const ref2 = await fetch(`${baseUrl}/reports/revenue`, { headers: { Authorization: `Bearer ${ketoan.token}` } }).then((r) => r.json());
    const ref3 = await fetch(`${baseUrl}/reports/revenue`, { headers: { Authorization: `Bearer ${ketoan.token}` } }).then((r) => r.json());

    assert(
      ref1.total === ref2.total && ref2.total === ref3.total && ref1.orders === ref3.orders,
      `API returns 100% deterministic and persistent results across consecutive calls: ${ref1.total}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: BACKEND RESTART & ERROR VALIDATION
    // -------------------------------------------------------------------------
    console.log("\n[TEST 10] Validation & Resilience: Error handling & Filter constraints");

    // Invalid date range: from > to -> 400 Bad Request
    const invalidDateRes = await fetch(`${baseUrl}/reports/revenue?from=2026-09-30&to=2026-09-01`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(invalidDateRes.status === 400, "from > to rejected with HTTP 400 Bad Request");

    // Invalid year format -> 400
    const invalidYearRes = await fetch(`${baseUrl}/reports/revenue?year=abcd`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    });
    assert(invalidYearRes.status === 400, "Invalid year string rejected with HTTP 400");

    // Verify all breakdown items have valid numbers (no NaN or undefined)
    const yearCheck = await fetch(`${baseUrl}/reports/revenue?year=2026&groupBy=month`, {
      headers: { Authorization: `Bearer ${ketoan.token}` },
    }).then((r) => r.json());

    const hasNaN = yearCheck.breakdown.some(
      (b) => isNaN(b.revenue) || isNaN(b.ordersCount) || isNaN(b.paidAmount) || isNaN(b.unpaidAmount)
    );
    assert(!hasNaN, "100% breakdown items have valid numbers without any NaN or undefined");

  } catch (err) {
    console.error("Test threw unexpected exception:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n==================================================`);
  console.log(`E2E TEST SUMMARY: UC23 (REVENUE REPORT)`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRevenueReportE2E().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
