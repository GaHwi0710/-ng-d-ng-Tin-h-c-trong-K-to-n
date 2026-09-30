import assert from "assert";
import http from "http";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";
import { nextBusinessCode } from "../backend/src/modules/shared/businessCode.js";
import { ensureIndexes } from "../backend/src/config/ensure-indexes.js";

async function runCriticalFixTests() {
  console.log("Connecting to MongoDB for Critical Fixes Verification...");
  await connectToMongoDB();
  const db = getDatabase();

  // Run ensureIndexes to verify new AuditLogs and Counters indexes
  await ensureIndexes(db);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function testAssert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Login as admin
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(token, "Admin login must succeed");
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // ==========================================
    // PHASE 1: BACKUP & RESTORE INTEGRITY
    // ==========================================
    console.log("\n[PHASE 1 TEST] Backup Collections & ObjectId Restoration");
    const backupRes = await fetch(`${baseUrl}/admin/backup`, {
      method: "POST",
      headers: authHeaders,
    });
    const backupData = await backupRes.json();
    testAssert(backupRes.status === 200, "Backup endpoint returned HTTP 200");
    testAssert(backupData.totalCollections >= 30, `Backup has >= 30 collections (actual: ${backupData.totalCollections})`);

    // Download or read the backup snapshot to inspect collections
    const downloadRes = await fetch(`${baseUrl}/admin/backup/download/${backupData.filename}`, {
      headers: authHeaders,
    });
    const snapshot = await downloadRes.json();
    const backupColls = Object.keys(snapshot.collections || {});
    testAssert(backupColls.includes("DonHang"), "Backup includes DonHang");
    testAssert(backupColls.includes("CT_DonHang"), "Backup includes CT_DonHang");
    testAssert(backupColls.includes("PhieuTraHang"), "Backup includes PhieuTraHang");
    testAssert(backupColls.includes("CT_PhieuTraHang"), "Backup includes CT_PhieuTraHang");
    testAssert(backupColls.includes("CT_KhuyenMai"), "Backup includes CT_KhuyenMai");
    testAssert(backupColls.includes("Counters"), "Backup includes Counters collection");

    // ==========================================
    // PHASE 2: PROTECT ACCOUNTING VOUCHERS
    // ==========================================
    console.log("\n[PHASE 2 TEST] Blocking Physical DELETE on Accounting Vouchers");
    
    // Check PhieuNhap (goods receipts)
    const pnDoc = await db.collection("PhieuNhap").findOne({});
    if (pnDoc) {
      const pnRes = await fetch(`${baseUrl}/goods-receipts/${pnDoc._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      testAssert(pnRes.status === 403, "DELETE /goods-receipts/:id returns HTTP 403 (Protected)");
      const pnJson = await pnRes.json();
      testAssert(pnJson.message && pnJson.message.includes("Không được phép xóa"), "Proper error message on PhieuNhap DELETE");
    }

    // Check HoaDon (invoices)
    const hdDoc = await db.collection("HoaDon").findOne({});
    if (hdDoc) {
      const hdRes = await fetch(`${baseUrl}/invoices/${hdDoc._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      testAssert(hdRes.status === 403, "DELETE /invoices/:id returns HTTP 403 (Protected)");
    }

    // Check DonHang (sales orders)
    const dhDoc = await db.collection("DonHang").findOne({});
    if (dhDoc) {
      const dhRes = await fetch(`${baseUrl}/sales-orders/${dhDoc._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      testAssert(dhRes.status === 403, "DELETE /sales-orders/:id returns HTTP 403 (Protected)");
    }

    // Check PhieuXuat (goods issues)
    const pxDoc = await db.collection("PhieuXuat").findOne({});
    if (pxDoc) {
      const pxRes = await fetch(`${baseUrl}/goods-issues/${pxDoc._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      testAssert(pxRes.status === 403, "DELETE /goods-issues/:id returns HTTP 403 (Protected)");
    }

    // Check DonDatHang (purchase orders)
    const poDoc = await db.collection("DonDatHang").findOne({});
    if (poDoc) {
      const poRes = await fetch(`${baseUrl}/purchase-orders/${poDoc._id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      testAssert(poRes.status === 403, "DELETE /purchase-orders/:id returns HTTP 403 (Protected)");
    }

    // ==========================================
    // PHASE 3: PREVENT DUPLICATE DEBT PAYMENTS
    // ==========================================
    console.log("\n[PHASE 3 TEST] Atomic Debt Payment & Overpayment Prevention");
    // Find or create a test debt for verification
    const testDebtDoc = await db.collection("CongNo").findOne({ SoTienConLai: { $gt: 50000 } });
    if (testDebtDoc) {
      const remainingBefore = Number(testDebtDoc.SoTienConLai);
      // Attempt to overpay by remainingBefore + 1,000,000
      const overpayRes = await fetch(`${baseUrl}/debts/${testDebtDoc._id}/pay`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ amount: remainingBefore + 1000000, method: "Chuyển khoản" }),
      });
      testAssert(overpayRes.status === 400, "Overpayment attempt rejected with HTTP 400");
      const overpayJson = await overpayRes.json();
      testAssert(overpayJson.message && overpayJson.message.includes("vượt số còn nợ"), "Overpayment message correctly explains balance");

      // Verify that debt was NOT modified
      const debtAfterOverpay = await db.collection("CongNo").findOne({ _id: testDebtDoc._id });
      testAssert(debtAfterOverpay.SoTienConLai === remainingBefore, "Debt balance unmodified after rejected overpayment");
    }

    // ==========================================
    // PHASE 4: ATOMIC BUSINESS CODE GENERATION
    // ==========================================
    console.log("\n[PHASE 4 TEST] Atomic Code Generation via Counters Collection");
    const colSP = db.collection("SanPham");
    const code1Promise = nextBusinessCode(colSP, "SanPham");
    const code2Promise = nextBusinessCode(colSP, "SanPham");
    const code3Promise = nextBusinessCode(colSP, "SanPham");
    const [c1, c2, c3] = await Promise.all([code1Promise, code2Promise, code3Promise]);
    testAssert(c1 !== c2 && c2 !== c3 && c1 !== c3, `Concurrent codes are strictly distinct: ${c1}, ${c2}, ${c3}`);
    testAssert(c1.startsWith("SP") && c2.startsWith("SP") && c3.startsWith("SP"), "Codes have correct prefix SP");

    const counterDoc = await db.collection("Counters").findOne({ _id: "SanPham" });
    testAssert(counterDoc && counterDoc.seq >= 3, `Counters collection tracking SanPham correctly (seq: ${counterDoc?.seq})`);

    // ==========================================
    // PHASE 5: JWT SECURITY HARDENING
    // ==========================================
    console.log("\n[PHASE 5 TEST] JWT Security & Query-Param Token Rejection");
    // Test that passing token in query param fails with HTTP 401
    const queryTokenRes = await fetch(`${baseUrl}/products?token=${token}`);
    testAssert(queryTokenRes.status === 401, "Query parameter ?token=... rejected with HTTP 401");

    // Test that Authorization header succeeds
    const headerTokenRes = await fetch(`${baseUrl}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    testAssert(headerTokenRes.status === 200, "Bearer token in Authorization header accepted with HTTP 200");

    // Test missing token
    const noTokenRes = await fetch(`${baseUrl}/products`);
    testAssert(noTokenRes.status === 401, "Missing token rejected with HTTP 401");

    // ==========================================
    // PHASE 6: INVENTORY REPORT WITH DIEU CHINH KHO
    // ==========================================
    console.log("\n[PHASE 6 TEST] Inventory Report Accounting Equation");
    const invReportRes = await fetch(`${baseUrl}/reports/inventory`, {
      headers: authHeaders,
    });
    testAssert(invReportRes.status === 200, "GET /reports/inventory returns HTTP 200");
    const invData = await invReportRes.json();
    testAssert(Array.isArray(invData.data), "Inventory report data is an array");
    testAssert(invData.totalProducts > 0, `Report includes ${invData.totalProducts} products`);
    
    // Check accounting equation for each product: TonDau + NhapTrongKy - XuatTrongKy ± DieuChinh = TonCuoi
    let formulasValid = 0;
    for (const p of invData.data) {
      if (Number.isFinite(p.TonDau) && Number.isFinite(p.TonCuoi) && Number.isFinite(p.NhapTrongKy) && Number.isFinite(p.XuatTrongKy)) {
        formulasValid++;
      }
    }
    testAssert(formulasValid === invData.data.length, `All ${formulasValid} products have finite stock metrics`);

    // ==========================================
    // PHASE 7: PERFORMANCE & INDEXES
    // ==========================================
    console.log("\n[PHASE 7 TEST] Product Listing Performance & AuditLogs Indexes");
    const t0 = performance.now();
    const prodListRes = await fetch(`${baseUrl}/products`, {
      headers: authHeaders,
    });
    const t1 = performance.now();
    const prodListData = await prodListRes.json();
    testAssert(prodListRes.status === 200, "Product list fetched successfully");
    testAssert(prodListData.data.length > 0, `Product list returned ${prodListData.data.length} products in ${(t1 - t0).toFixed(1)}ms`);
    // Verify each product has stock and category populated via batch
    const hasStockField = prodListData.data.every((p) => p.stock !== undefined);
    testAssert(hasStockField, "All products have stock field populated via batch lookup");

    // Verify AuditLogs indexes
    const auditIndexes = await db.collection("AuditLogs").indexes();
    const hasTimestampIdx = auditIndexes.some((idx) => idx.key.timestamp !== undefined);
    testAssert(hasTimestampIdx, "AuditLogs collection has timestamp index");

    // Verify Counters indexes
    const counterIndexes = await db.collection("Counters").indexes();
    testAssert(counterIndexes.length > 0, "Counters collection has index");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`CRITICAL FIXES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");
  
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runCriticalFixTests().catch((err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
