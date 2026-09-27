import http from "http";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";
import { invalidateRoleCache } from "../backend/src/modules/shared/permissions.js";

async function testRealtimePermission() {
  console.log("Connecting to MongoDB for Realtime Permission Test...");
  await connectToMongoDB();
  const db = getDatabase();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let passed = 0;
  let failed = 0;
  function testAssert(condition, msg) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // Login as Admin
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: process.env.ADMIN_PASSWORD || "admin123" }),
    });
    const adminData = await adminLoginRes.json();

    // Login as Sales Staff
    const staffLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "maianh", password: "maianh123" }),
    });
    const staffData = await staffLoginRes.json();

    console.log("\n[TEST] Real-Time Permission Grant & Revoke Flow");

    // 1. Initial State: Sales Staff cannot view purchase-orders
    const check1 = await fetch(`${baseUrl}/purchase-orders`, {
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(check1.status === 403, "Staff initially DENIED purchase-orders (HTTP 403)");

    // 2. Admin grants 'xem' on purchase-orders to NhanVienBanHang
    const roleDoc = await db.collection("VaiTro").findOne({ MaKey: "NhanVienBanHang" });
    const updatedPerms = {
      ...roleDoc.QuyenHan,
      "purchase-orders": ["xem"],
    };
    const updateRoleRes = await fetch(`${baseUrl}/admin/roles/${roleDoc._id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ QuyenHan: updatedPerms }),
    });
    testAssert(updateRoleRes.status === 200, "Admin grants purchase-orders.xem to NhanVienBanHang (HTTP 200)");

    // 3. Immediately test staff access: with the new permission in DB and cache invalidated, staff can now view!
    const check2 = await fetch(`${baseUrl}/purchase-orders`, {
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(check2.status === 200, "Staff immediately ALLOWED to view purchase-orders (HTTP 200) without server restart!");

    // 4. Admin revokes the permission
    const revertedPerms = {
      ...roleDoc.QuyenHan,
      "purchase-orders": [],
    };
    const revokeRoleRes = await fetch(`${baseUrl}/admin/roles/${roleDoc._id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ QuyenHan: revertedPerms }),
    });
    testAssert(revokeRoleRes.status === 200, "Admin revokes purchase-orders.xem from NhanVienBanHang (HTTP 200)");

    // 5. Test staff access: immediately revoked!
    const check3 = await fetch(`${baseUrl}/purchase-orders`, {
      headers: { Authorization: `Bearer ${staffData.token}` },
    });
    testAssert(check3.status === 403, "Staff immediately DENIED purchase-orders again (HTTP 403) after revocation!");

  } catch (err) {
    console.error("Error in realtime test:", err);
    failed++;
  } finally {
    server.close();
    console.log(`\nREALTIME PERMISSION TEST: ${passed} PASSED, ${failed} FAILED`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

testRealtimePermission();
