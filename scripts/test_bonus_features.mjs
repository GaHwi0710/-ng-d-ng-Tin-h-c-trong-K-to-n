import assert from "assert";
import http from "http";
import fs from "fs";
import path from "path";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

async function runBonusTests() {
  console.log("Connecting to MongoDB...");
  await connectToMongoDB();
  const db = getDatabase();

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
    // 1. AUTHENTICATION TEST
    console.log("\n[TEST 1] Authentication for Admin (QuanLy) & Staff (NhanVienBanHang)");
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    }).then((r) => r.json());

    const staffLogin = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "maianh", password: "maianh123" }),
    }).then((r) => r.json());

    testAssert(!!adminLogin.token, "Admin login returned valid token");
    testAssert(!!staffLogin.token, "Staff login returned valid token");

    // 2. AUDIT LOG RBAC & QUERY
    console.log("\n[TEST 2] Audit Log System (Phase 6)");
    const staffAuditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${staffLogin.token}` },
    });
    testAssert(staffAuditRes.status === 403, "Staff forbidden from accessing /admin/audit-logs (HTTP 403)");

    const adminAuditRes = await fetch(`${baseUrl}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    testAssert(adminAuditRes.status === 200, "Admin can access /admin/audit-logs (HTTP 200)");
    const auditData = await adminAuditRes.json();
    testAssert(Array.isArray(auditData.data), "Audit logs data is an array");
    testAssert(typeof auditData.total === "number", `Audit logs total count is numeric (${auditData.total})`);

    // Verify LOGIN action was logged
    const hasLoginLog = auditData.data.some((l) => l.action === "LOGIN");
    testAssert(hasLoginLog, "Audit log contains LOGIN action event");

    // 3. DATABASE BACKUP SYSTEM (Phase 7)
    console.log("\n[TEST 3] Database Backup System (Phase 7)");
    const staffBackupRes = await fetch(`${baseUrl}/admin/backup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${staffLogin.token}` },
    });
    testAssert(staffBackupRes.status === 403, "Staff forbidden from triggering backup (HTTP 403)");

    const adminBackupRes = await fetch(`${baseUrl}/admin/backup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    testAssert(adminBackupRes.status === 200, "Admin can trigger /admin/backup (HTTP 200)");
    const backupJson = await adminBackupRes.json();
    testAssert(backupJson.success === true, "Backup response indicates success");
    testAssert(backupJson.totalCollections >= 14, `Backup includes all core collections (${backupJson.totalCollections})`);
    testAssert(backupJson.totalRecords > 0, `Backup snapshot contains documents (${backupJson.totalRecords} records)`);

    // Check backup file exists on disk
    const backupListRes = await fetch(`${baseUrl}/admin/backup/list`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    }).then((r) => r.json());

    testAssert(Array.isArray(backupListRes.backups), "Backup list returns array of files");
    const foundCreated = backupListRes.backups.some((b) => b.filename === backupJson.filename);
    testAssert(foundCreated, `Newly created backup file '${backupJson.filename}' appears in backup list`);

    // Download backup file
    const downloadRes = await fetch(`${baseUrl}/admin/backup/download/${backupJson.filename}`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    });
    testAssert(downloadRes.status === 200, "Backup file can be downloaded (HTTP 200)");
    const downloadedText = await downloadRes.text();
    const parsedSnapshot = JSON.parse(downloadedText);
    testAssert(parsedSnapshot.system && parsedSnapshot.collections, "Downloaded backup file has valid JSON snapshot schema");

    // 4. VERIFY BACKUP AUDIT LOG RECORDED
    console.log("\n[TEST 4] Audit Log Event for Backup");
    const updatedAuditRes = await fetch(`${baseUrl}/admin/audit-logs?action=BACKUP`, {
      headers: { Authorization: `Bearer ${adminLogin.token}` },
    }).then((r) => r.json());

    testAssert(updatedAuditRes.data.length > 0, "BACKUP action was recorded in AuditLogs collection");
    testAssert(updatedAuditRes.data[0].action === "BACKUP", "Audit log has action 'BACKUP'");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log("\n==================================================");
  console.log(`BONUS FEATURES TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runBonusTests().catch((e) => {
  console.error("Fatal test error:", e);
  process.exit(1);
});
