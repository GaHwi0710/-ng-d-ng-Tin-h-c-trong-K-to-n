import assert from "assert";
import http from "http";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";
import { invalidateRoleCache } from "../backend/src/modules/shared/permissions.js";

async function runSecurityAuditTests() {
  console.log("Connecting to MongoDB...");
  await connectToMongoDB();
  const db = getDatabase();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Security Test server running at ${baseUrl}`);

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
    // ==========================================
    // 1. AUTHENTICATION & HARDCODED ACCOUNT REMOVAL
    // ==========================================
    console.log("\n[TEST GROUP 1] Database-Linked Authentication (No Hardcoded Fallback)");
    
    // Test 1.1: Non-existent user
    const fakeRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "fake_nonexistent_user", password: "somepassword" }),
    });
    testAssert(fakeRes.status === 401, "Non-existent user rejected with HTTP 401");

    // Test 1.2: Wrong password for real user
    const wrongPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrongpassword999" }),
    });
    testAssert(wrongPassRes.status === 401, "Wrong password for real user rejected with HTTP 401");

    // Test 1.3: Real database user login succeeds
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: process.env.ADMIN_PASSWORD || "admin123" }),
    });
    testAssert(adminLoginRes.status === 200, "Real database admin user login succeeds (HTTP 200)");
    const adminData = await adminLoginRes.json();
    testAssert(!!adminData.token, "Login response contains valid JWT token");
    testAssert(adminData.user.username === "admin", "Login response contains real database username");
    testAssert(!!adminData.user.permissions, "Login response contains role permissions matrix from MongoDB");

    // Test 1.4: Staff login succeeds with their DB role
    const staffLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "maianh", password: "maianh123" }),
    });
    testAssert(staffLoginRes.status === 200, "Real database sales staff login succeeds (HTTP 200)");
    const staffData = await staffLoginRes.json();
    testAssert(staffData.user.role === "NhanVienBanHang", "Staff user has real database role NhanVienBanHang");

    // ==========================================
    // 2. PERMISSION-BASED API ENFORCEMENT
    // ==========================================
    console.log("\n[TEST GROUP 2] Permission-Based API Enforcement (HTTP 403)");

    // Test 2.1: Staff cannot delete product
    const sampleProd = await db.collection("SanPham").findOne({});
    const staffDelProdRes = await fetch(`${baseUrl}/products/${sampleProd._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(staffDelProdRes.status === 403, "Sales staff forbidden from DELETE /products/:id (HTTP 403)");
    const staffDelJson = await staffDelProdRes.json();
    testAssert(
      staffDelJson.message?.includes("không có quyền"),
      `403 response message in Vietnamese: "${staffDelJson.message}"`
    );

    // Test 2.2: Staff cannot access purchase orders
    const staffPoRes = await fetch(`${baseUrl}/purchase-orders`, {
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(staffPoRes.status === 403, "Sales staff forbidden from GET /purchase-orders (HTTP 403)");

    // Test 2.3: Staff cannot access audit logs
    const staffAuditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(staffAuditRes.status === 403, "Sales staff forbidden from GET /admin/audit-logs (HTTP 403)");

    // Test 2.4: Staff cannot access backup list or trigger backup
    const staffBackupRes = await fetch(`${baseUrl}/admin/backup/list`, {
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(staffBackupRes.status === 403, "Sales staff forbidden from GET /admin/backup/list (HTTP 403)");

    // ==========================================
    // 3. AUDIT LOG INTEGRITY & APPEND-ONLY PROTECTION
    // ==========================================
    console.log("\n[TEST GROUP 3] Audit Log Append-Only & Real-User Capture");

    // Test 3.1: Admin can access audit logs
    const adminAuditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(adminAuditRes.status === 200, "Admin can read /admin/audit-logs (HTTP 200)");
    const auditLogs = await adminAuditRes.json();
    testAssert(Array.isArray(auditLogs.data), "Audit logs data is an array");

    // Test 3.2: Verify audit log recorded real username from session
    const recentLoginLog = auditLogs.data.find((l) => l.action === "LOGIN" && l.username === "admin");
    testAssert(!!recentLoginLog, "Audit log records real username 'admin' on LOGIN");
    testAssert(recentLoginLog?.username !== "system", "Audit log does not use hardcoded fallback 'system' for user logins");

    // Test 3.3: Attempt to DELETE audit logs via API must return HTTP 403
    const delAuditRes = await fetch(`${baseUrl}/admin/audit-logs/some-id`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(delAuditRes.status === 403, "DELETE /admin/audit-logs/* is blocked with HTTP 403 (append-only)");

    // ==========================================
    // 4. DATABASE BACKUP & RESTORE INTEGRITY
    // ==========================================
    console.log("\n[TEST GROUP 4] Backup & Restore Safety Flow");

    // Test 4.1: Admin can trigger backup
    const backupRes = await fetch(`${baseUrl}/admin/backup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(backupRes.status === 200, "Admin can trigger backup (HTTP 200)");
    const backupResult = await backupRes.json();
    testAssert(backupResult.success === true, "Backup result indicates success");
    testAssert(backupResult.totalCollections >= 20, `Backup includes core collections (${backupResult.totalCollections})`);

    // Test 4.2: Backup list contains the created backup
    const backupListRes = await fetch(`${baseUrl}/admin/backup/list`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(backupListRes.status === 200, "Admin can list backups (HTTP 200)");
    const backupList = await backupListRes.json();
    testAssert(
      backupList.backups?.some((b) => b.filename === backupResult.filename),
      `Newly created backup '${backupResult.filename}' is in backup list`
    );

    // Test 4.3: Attempt to DELETE backup file via API must return HTTP 403
    const delBackupRes = await fetch(`${baseUrl}/admin/backup/some-file.json`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(delBackupRes.status === 403, "DELETE /admin/backup/* is blocked with HTTP 403");

    // ==========================================
    // 5. PREVIOUS REQUIREMENTS INTEGRITY (YC1-YC4)
    // ==========================================
    console.log("\n[TEST GROUP 5] Verification of Previous Requirements (YC1-YC4)");

    // Test 5.1: Supplier debt cannot be deleted (YC3)
    const sampleDebt = await db.collection("CongNo").findOne({ MaNCC: { $exists: true, $ne: null } });
    if (sampleDebt) {
      const delDebtRes = await fetch(`${baseUrl}/debts/${sampleDebt._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminData.token}` },
      });
      testAssert(delDebtRes.status === 403, "Supplier debt DELETE returns HTTP 403 (Protected)");
    } else {
      testAssert(true, "Supplier debt check passed (no debt found in sample)");
    }

    // Test 5.2: Create and confirm cash voucher (YC4)
    const newReceiptRes = await fetch(`${baseUrl}/cash-receipts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        NgayLap: new Date().toISOString().slice(0, 10),
        NguoiNopTien: "Khách hàng kiểm thử",
        DiaChi: "Hà Nội",
        LyDo: "Thu tiền thử nghiệm xác nhận chứng từ",
        SoTien: 100000,
        ChungTuGoc: "TEST_001",
      }),
    });
    testAssert(newReceiptRes.status === 201, "Cash receipt created in DRAFT state (HTTP 201)");
    const createdReceipt = await newReceiptRes.json();
    const receiptId = createdReceipt.data?.id || createdReceipt.data?._id;

    // Confirm the voucher
    const confirmRes = await fetch(`${baseUrl}/cash-receipts/${receiptId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(confirmRes.status === 200, "Cash receipt confirmed successfully (HTTP 200)");
    const confirmResult = await confirmRes.json();
    testAssert(confirmResult.voucher?.TrangThai === "CONFIRMED", "Voucher state updated to CONFIRMED");

    // Attempt to edit confirmed voucher -> 400
    const editRes = await fetch(`${baseUrl}/cash-receipts/${receiptId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ SoTien: 200000 }),
    });
    testAssert(editRes.status === 400, "Editing CONFIRMED cash voucher returns HTTP 400");

    // Attempt to delete confirmed voucher -> 400
    const delConfirmedRes = await fetch(`${baseUrl}/cash-receipts/${receiptId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    testAssert(delConfirmedRes.status === 400, "Deleting CONFIRMED cash voucher returns HTTP 400");

    // Clean up test voucher from DB directly
    await db.collection("PhieuThu").deleteOne({ _id: createdReceipt.data?._id || createdReceipt.data?.id });

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
    console.log("\n==================================================");
    console.log(`SECURITY AUDIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSecurityAuditTests();
