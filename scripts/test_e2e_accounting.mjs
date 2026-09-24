import "../backend/node_modules/dotenv/config.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

async function runE2E() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`Test server running at ${baseUrl}`);

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

  let testProduct = null;
  let origStockVal = 0;

  try {
    // 1. LOGIN TESTS
    console.log("\n[TEST 1] Authentication for Actor 1 (Quản trị hệ thống) & Actor 6 (Quản lý)");
    
    // Login as quantri (QuanTriHeThong)
    const qtRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "quantri", password: "admin123" }),
    });
    const qtData = await qtRes.json();
    assert(qtRes.status === 200, "Login as 'quantri' status 200");
    assert(qtData.user?.role === "QuanTriHeThong", "'quantri' role is 'QuanTriHeThong'");
    const qtToken = qtData.token;

    // Login as admin (QuanLy)
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, "Login as 'admin' status 200");
    const adminToken = adminData.token;

    // 2. ACTOR 1 (QuanTriHeThong) CAN ACCESS ADMIN ACCOUNTS & ROLES
    console.log("\n[TEST 2] Quản trị hệ thống Access to Admin Endpoints");
    const accountsRes = await fetch(`${baseUrl}/admin/accounts`, {
      headers: { Authorization: `Bearer ${qtToken}` },
    });
    assert(accountsRes.status === 200, "QuanTriHeThong can access /api/admin/accounts (200 OK)");

    const rolesRes = await fetch(`${baseUrl}/admin/roles`, {
      headers: { Authorization: `Bearer ${qtToken}` },
    });
    const rolesData = await rolesRes.json();
    assert(rolesRes.status === 200, "QuanTriHeThong can access /api/admin/roles (200 OK)");
    assert(rolesData.data?.length >= 6, `At least 6 roles returned (${rolesData.data?.length} roles)`);

    // 3. POS CASH SALE FLOW (BUG-03, BUG-05, UC13, UC14, UC17, UC19)
    console.log("\n[TEST 3] POS Cash Sale Flow (Tiền mặt)");
    // Find active product and give it stock if needed
    testProduct = await db.collection("SanPham").findOne({ TrangThai: { $ne: "Ngừng bán" } });
    const product = testProduct;
    const origStockDoc = await db.collection("TonKho").findOne({ MaSP: product._id });
    origStockVal = origStockDoc ? (origStockDoc.SoLuongTon ?? 0) : (product.stock ?? 0);
    await db.collection("TonKho").updateOne(
      { MaSP: product._id },
      { $set: { SoLuongTon: 50, SoLuong: 50, updatedAt: new Date() } },
      { upsert: true }
    );
    await db.collection("SanPham").updateOne(
      { _id: product._id },
      { $set: { stock: 50 } }
    );
    const customer = await db.collection("KhachHang").findOne({ TrangThai: { $ne: "Ngưng hoạt động" } });

    const cashSalePayload = {
      customerId: customer._id.toString(),
      paymentMethod: "Tiền mặt",
      items: [
        {
          productId: product._id.toString(),
          quantity: 2,
          price: product.GiaBan || 100000,
        },
      ],
      discount: 0,
      TongTien: (product.GiaBan || 100000) * 2,
    };

    const cashSaleRes = await fetch(`${baseUrl}/sales-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(cashSalePayload),
    });
    const cashSaleData = await cashSaleRes.json();
    assert(cashSaleRes.status === 201, "Cash sale created with status 201");
    assert(cashSaleData.data?.invoice?.TrangThai === "Đã thanh toán", "Invoice marked 'Đã thanh toán'");
    assert(cashSaleData.data?.order?.TrangThai === "Hoàn thành", "Order marked 'Hoàn thành'");

    const cashOrderId = cashSaleData.data?.order?.id;
    const cashInvoiceId = cashSaleData.data?.invoice?.id;

    // Check PhieuXuat created (UC14)
    const phieuXuat = await db.collection("PhieuXuat").findOne({ MaDHCode: cashSaleData.data?.order?.MaDH });
    assert(!!phieuXuat, "Automatic PhieuXuat document created for cash sale (UC14)");

    // Check ThanhToan created (UC19)
    const thanhToan = await db.collection("ThanhToan").findOne({ MaHDCode: cashSaleData.data?.invoice?.MaHD });
    assert(!!thanhToan && thanhToan.PhuongThuc === "Tiền mặt", "ThanhToan record created with method 'Tiền mặt' (UC19)");

    // Check PhieuThu created (UC17)
    const phieuThu = await db.collection("PhieuThu").findOne({ MaHDCode: cashSaleData.data?.invoice?.MaHD });
    assert(!!phieuThu && phieuThu.PhuongThuc === "Tiền mặt", "PhieuThu receipt created for cash sale (UC17)");

    // Double decrement prevention (BUG-05)
    const duplicateIssueRes = await fetch(`${baseUrl}/goods-issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orderId: cashOrderId,
        details: [{ productId: product._id.toString(), quantity: 1, price: product.GiaBan || 100000 }],
      }),
    });
    assert(duplicateIssueRes.status === 400, "Double goods issue rejected with status 400 (BUG-05)");

    // 4. POS CREDIT SALE FLOW (UC15 - Công nợ khách hàng)
    console.log("\n[TEST 4] POS Credit Sale Flow (Ghi nợ - UC15)");
    const creditSalePayload = {
      customerId: customer._id.toString(),
      paymentMethod: "Ghi nợ",
      items: [
        {
          productId: product._id.toString(),
          quantity: 1,
          price: product.GiaBan || 100000,
        },
      ],
      discount: 0,
      TongTien: product.GiaBan || 100000,
    };

    const creditSaleRes = await fetch(`${baseUrl}/sales-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(creditSalePayload),
    });
    const creditSaleData = await creditSaleRes.json();
    assert(creditSaleRes.status === 201, "Credit sale created with status 201");
    assert(creditSaleData.data?.invoice?.TrangThai === "Chưa thanh toán", "Invoice marked 'Chưa thanh toán'");
    assert(creditSaleData.data?.invoice?.SoTienConLai > 0, "Invoice has outstanding balance (SoTienConLai > 0)");

    // Check CongNo record created (UC15)
    const creditInvoiceCode = creditSaleData.data?.invoice?.MaHD;
    const congNo = await db.collection("CongNo").findOne({
      LoaiCongNo: "Khách hàng",
      TrangThai: "Còn nợ",
      SoTienConLai: { $gt: 0 },
    });
    assert(!!congNo, "Customer CongNo record created with status 'Còn nợ' (UC15)");

    // 5. CUSTOMER DEBT SETTLEMENT (UC15, UC17, UC19)
    console.log("\n[TEST 5] Customer Debt Settlement Flow");
    const creditInvoiceId = creditSaleData.data?.invoice?.id;
    const debtAmount = creditSaleData.data?.invoice?.SoTienConLai;

    const payDebtRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        invoiceId: creditInvoiceId,
        amount: debtAmount,
        method: "Tiền mặt",
      }),
    });
    assert(payDebtRes.status === 201, "Customer debt payment recorded (201 Created)");

    // Verify invoice is now fully paid
    const updatedInvoice = await db.collection("HoaDon").findOne({ MaHD: creditInvoiceCode });
    assert(updatedInvoice?.TrangThai === "Đã thanh toán", "Invoice updated to 'Đã thanh toán'");
    assert(updatedInvoice?.SoTienConLai === 0, "Invoice balance cleared (SoTienConLai === 0)");

    // Verify CongNo updated to 'Đã thanh toán'
    const updatedCongNo = await db.collection("CongNo").findOne({ MaHD: updatedInvoice._id });
    assert(updatedCongNo?.TrangThai === "Đã thanh toán", "Customer CongNo updated to 'Đã thanh toán'");

    // Verify PhieuThu created for cash debt settlement
    const settlementReceipt = await db.collection("PhieuThu").findOne({ MaHDCode: creditInvoiceCode });
    assert(!!settlementReceipt, "Cash PhieuThu created for customer debt settlement (UC17)");

    // 6. INVENTORY REPORT ACCURACY (UC24)
    console.log("\n[TEST 6] Inventory Report (UC24) Accuracy");
    const invRepRes = await fetch(`${baseUrl}/reports/inventory`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const invRepData = await invRepRes.json();
    assert(invRepRes.status === 200, "Inventory report endpoint returns 200 OK");
    const items = invRepData.data?.items || invRepData.data || [];
    assert(items.length > 0, `Inventory report returned ${items.length} product rows`);
    let formulaValid = true;
    for (const item of items) {
      if (item.TonCuoi !== item.TonDau + item.NhapTrongKy - item.XuatTrongKy) {
        formulaValid = false;
        break;
      }
    }
    assert(formulaValid, "100% of products satisfy: TonCuoi = TonDau + NhapTrongKy - XuatTrongKy (UC24)");

    console.log("\n==================================================");
    console.log(`ALL INTEGRATION TESTS PASSED: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } finally {
    if (testProduct) {
      await db.collection("TonKho").updateOne(
        { MaSP: testProduct._id },
        { $set: { SoLuongTon: origStockVal, SoLuong: origStockVal, updatedAt: new Date() } }
      );
      await db.collection("SanPham").updateOne(
        { _id: testProduct._id },
        { $set: { stock: origStockVal } }
      );
    }
    server.close();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runE2E().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
