import "../backend/node_modules/dotenv/config.js";
import { ObjectId } from "../backend/node_modules/mongodb/lib/index.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

function toId(val) {
  if (!val) return null;
  const raw = val._id || val.id || val;
  return ObjectId.isValid(raw) ? new ObjectId(raw) : raw;
}

async function runPurchasingE2E() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`\n==================================================`);
  console.log(`E2E TEST: PURCHASING / GOODS RECEIPT / DEBT / PAYMENT`);
  console.log(`Test server running at ${baseUrl}`);
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
    // -------------------------------------------------------------
    // 1. AUTHENTICATE ACTORS
    // -------------------------------------------------------------
    console.log("[STEP 1] Login as multiple actors");

    // Login as admin (QuanLy)
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, "Login as 'admin' (QuanLy) 200 OK");
    const adminToken = adminData.token;

    // Login as muahang (NhanVienMuaHang)
    const mhRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "muahang", password: "muahang123" }),
    });
    const mhData = await mhRes.json();
    assert(mhRes.status === 200, "Login as 'muahang' (NhanVienMuaHang) 200 OK");
    const mhToken = mhData.token;

    // Login as vanhung (ThuKho)
    const tkRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "vanhung", password: "vanhung123" }),
    });
    const tkData = await tkRes.json();
    assert(tkRes.status === 200, "Login as 'vanhung' (ThuKho) 200 OK");
    const tkToken = tkData.token;

    // Login as ketoan (KeToan)
    const ktRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "ketoan", password: "ketoan123" }),
    });
    const ktData = await ktRes.json();
    assert(ktRes.status === 200, "Login as 'ketoan' (KeToan) 200 OK");
    const ktToken = ktData.token;

    // -------------------------------------------------------------
    // 2. MASTER DATA INTEGRITY: CATEGORY (UC09) & SUPPLIER (UC06)
    // -------------------------------------------------------------
    console.log("\n[STEP 2] Master Data Validation: Category & Supplier Integrity");

    // Check duplicate category name rejection (409)
    const dupCatRes = await fetch(`${baseUrl}/product-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ TenLoai: "Sữa" }),
    });
    assert(dupCatRes.status === 409, "Duplicate category name 'Sữa' rejected with HTTP 409 Conflict");

    // Check category delete constraint when products exist (400)
    const catSua = await db.collection("LoaiHang").findOne({ TenLoai: "Sữa" });
    if (catSua) {
      const delCatRes = await fetch(`${baseUrl}/product-categories/${catSua._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(delCatRes.status === 400, "Deleting category with active products rejected with HTTP 400 Bad Request");
    }

    // -------------------------------------------------------------
    // 3. CREATE TEST SUPPLIER & TEST PRODUCT
    // -------------------------------------------------------------
    console.log("\n[STEP 3] Setup Test Supplier & Product");
    const uniqueSuffix = Date.now().toString().slice(-6);
    const testSupplierCode = `NCC-TEST-${uniqueSuffix}`;
    const testProductCode = `SP-TEST-${uniqueSuffix}`;

    // Create active supplier
    const supRes = await fetch(`${baseUrl}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mhToken}` },
      body: JSON.stringify({
        MaNCC: testSupplierCode,
        TenNCC: `Nhà Cung Cấp E2E ${uniqueSuffix}`,
        SDT: "0987654321",
        Email: `ncc_${uniqueSuffix}@example.com`,
        DiaChi: "123 Phố Test, Hà Nội",
        TrangThai: "Hoạt động",
      }),
    });
    const supData = await supRes.json();
    assert(supRes.status === 201, "Created test supplier successfully (201 Created)");
    const testSupplier = supData.data;

    // Create inactive supplier to verify inactive check
    const inactSupRes = await fetch(`${baseUrl}/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mhToken}` },
      body: JSON.stringify({
        MaNCC: `NCC-INACT-${uniqueSuffix}`,
        TenNCC: `NCC Ngưng Hoạt Động ${uniqueSuffix}`,
        TrangThai: "Ngưng hoạt động",
      }),
    });
    const inactSupData = await inactSupRes.json();
    const inactSupplier = inactSupData.data;

    // Create test product with valid HanSuDung and MaLoai
    const prodRes = await fetch(`${baseUrl}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkToken}` },
      body: JSON.stringify({
        MaSP: testProductCode,
        TenSP: `Sản Phẩm E2E Test ${uniqueSuffix}`,
        MaLoai: catSua._id.toString(),
        LoaiHang: catSua.TenLoai,
        DonViTinh: "Hộp",
        GiaNhap: 50000,
        GiaBan: 75000,
        HanSuDung: "2027-12-31",
        TrangThai: "Đang bán",
        SoLuongToiThieu: 10,
      }),
    });
    const prodData = await prodRes.json();
    assert(prodRes.status === 201, "Created test product successfully (201 Created)");
    const testProduct = prodData.data;

    // Check initial inventory of test product
    const initialInv = await db.collection("TonKho").findOne({ MaSP: toId(testProduct) });
    const initialStock = Number(initialInv?.SoLuongTon || initialInv?.SoLuong || 0);
    assert(initialStock === 0, `Initial stock for ${testProductCode} is 0`);

    // Verify inactive supplier cannot be used in PO
    const failPoRes = await fetch(`${baseUrl}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mhToken}` },
      body: JSON.stringify({
        supplierId: inactSupplier.id,
        items: [{ productId: testProduct.id, quantity: 50, price: 50000 }],
      }),
    });
    assert(failPoRes.status === 400, "Purchase order for inactive supplier rejected with HTTP 400");

    // -------------------------------------------------------------
    // 4. STEP 4: CREATE PURCHASE ORDER (100 UNITS) - UC10
    // -------------------------------------------------------------
    console.log("\n[STEP 4] Create PO for 100 units & Verify Stock is Unchanged");
    const poPayload = {
      supplierId: testSupplier.id,
      items: [{ productId: testProduct.id, quantity: 100, price: 50000 }],
      expectedDeliveryDate: "2026-10-01",
      notes: "PO kiểm thử E2E 100 hộp",
    };

    const poRes = await fetch(`${baseUrl}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${mhToken}` },
      body: JSON.stringify(poPayload),
    });
    const poData = await poRes.json();
    assert(poRes.status === 201, "Purchase order created successfully (201 Created)");
    const po = poData.data;
    assert(po.TrangThai === "Đang chờ nhập", `PO initial status is 'Đang chờ nhập' (actual: ${po.TrangThai})`);
    assert(Number(po.TongTien) === 5000000, `PO total amount is 5,000,000 (actual: ${po.TongTien})`);

    // Verify stock is still 0 (PO creation must NOT increase inventory)
    const stockAfterPo = await db.collection("TonKho").findOne({ MaSP: toId(testProduct) });
    const stockAfterPoVal = Number(stockAfterPo?.SoLuongTon || stockAfterPo?.SoLuong || 0);
    assert(stockAfterPoVal === 0, `Stock after PO creation remains 0 (actual: ${stockAfterPoVal})`);

    // -------------------------------------------------------------
    // 5. STEP 5: RECEIVE 60 UNITS (PARTIAL GOODS RECEIPT) - UC11
    // -------------------------------------------------------------
    console.log("\n[STEP 5] Goods Receipt 1: Receive 60 units (Partial Receive)");
    const gr1Payload = {
      purchaseOrderId: po.id,
      supplierId: testSupplier.id,
      items: [{ productId: testProduct.id, quantity: 60, price: 50000 }],
      paidAmount: 0, // Unpaid -> Generates full debt
      notes: "Nhập đợt 1: 60 hộp",
    };

    const gr1Res = await fetch(`${baseUrl}/goods-receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkToken}` },
      body: JSON.stringify(gr1Payload),
    });
    const gr1Data = await gr1Res.json();
    assert(gr1Res.status === 201, "Goods Receipt 1 created successfully (201 Created)");
    const gr1 = gr1Data.data;

    // Verify stock increased by +60
    const stockAfterGr1 = await db.collection("TonKho").findOne({ MaSP: toId(testProduct) });
    const stockAfterGr1Val = Number(stockAfterGr1?.SoLuongTon || stockAfterGr1?.SoLuong || 0);
    assert(stockAfterGr1Val === 60, `Inventory stock increased from 0 to 60 (actual: ${stockAfterGr1Val})`);

    // Verify PO status and item tracking updated
    const poAfterGr1 = await db.collection("DonDatHang").findOne({ _id: toId(po) });
    assert(poAfterGr1 !== null, "PO record found after Goods Receipt 1");
    assert(poAfterGr1?.TrangThai === "Nhập một phần", `PO status updated to 'Nhập một phần' (actual: ${poAfterGr1?.TrangThai})`);
    const poItem1 = poAfterGr1?.items?.find((it) => String(it.productId || it.MaSP) === String(testProduct.id || testProduct.MaSP));
    assert(poItem1?.quantityReceived === 60, `PO item quantityReceived is 60 (actual: ${poItem1?.quantityReceived})`);

    // Verify Supplier Debt for Receipt 1
    const debt1 = await db.collection("CongNo").findOne({ MaPN: toId(gr1) });
    assert(debt1 !== null, "Supplier CongNo record created for Goods Receipt 1");
    assert(debt1?.LoaiCongNo === "Nhà cung cấp", "CongNo type is 'Nhà cung cấp'");
    assert(Number(debt1?.SoTien) === 3000000, `CongNo amount is 3,000,000 (actual: ${debt1?.SoTien})`);
    assert(Number(debt1?.SoTienConLai) === 3000000, `CongNo remaining balance is 3,000,000 (actual: ${debt1?.SoTienConLai})`);
    assert(debt1?.TrangThai === "Còn nợ", "CongNo status is 'Còn nợ'");

    // -------------------------------------------------------------
    // 6. STEP 6: RECEIVE REMAINING 40 UNITS (COMPLETE GOODS RECEIPT) - UC11
    // -------------------------------------------------------------
    console.log("\n[STEP 6] Goods Receipt 2: Receive remaining 40 units (Complete Receive)");
    const gr2Payload = {
      purchaseOrderId: po.id,
      supplierId: testSupplier.id,
      items: [{ productId: testProduct.id, quantity: 40, price: 50000 }],
      paidAmount: 0,
      notes: "Nhập đợt 2: 40 hộp còn lại",
    };

    const gr2Res = await fetch(`${baseUrl}/goods-receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkToken}` },
      body: JSON.stringify(gr2Payload),
    });
    const gr2Data = await gr2Res.json();
    assert(gr2Res.status === 201, "Goods Receipt 2 created successfully (201 Created)");
    const gr2 = gr2Data.data;

    // Verify stock increased by +40 -> total 100
    const stockAfterGr2 = await db.collection("TonKho").findOne({ MaSP: toId(testProduct) });
    const stockAfterGr2Val = Number(stockAfterGr2?.SoLuongTon || stockAfterGr2?.SoLuong || 0);
    assert(stockAfterGr2Val === 100, `Inventory stock increased from 60 to 100 (actual: ${stockAfterGr2Val})`);

    // Verify PO status is now "Hoàn thành"
    const poAfterGr2 = await db.collection("DonDatHang").findOne({ _id: toId(po) });
    assert(poAfterGr2?.TrangThai === "Hoàn thành", `PO status updated to 'Hoàn thành' (actual: ${poAfterGr2?.TrangThai})`);
    const poItem2 = poAfterGr2?.items?.find((it) => String(it.productId || it.MaSP) === String(testProduct.id || testProduct.MaSP));
    assert(poItem2?.quantityReceived === 100, `PO item quantityReceived is 100 (actual: ${poItem2?.quantityReceived})`);

    // Verify Goods Receipt 2 details & original voucher
    assert(gr2.SoChungTuGoc === po.MaDDH, `Goods Receipt 2 has SoChungTuGoc '${po.MaDDH}' (actual: ${gr2.SoChungTuGoc})`);
    const ctPn2 = await db.collection("CT_PhieuNhap").find({ MaPN: toId(gr2) }).toArray();
    assert(ctPn2.length === 1 && ctPn2[0].SoLuong === 40, "CT_PhieuNhap contains 40 units");

    // Verify Supplier Debt for Receipt 2
    const debt2 = await db.collection("CongNo").findOne({ MaPN: toId(gr2) });
    assert(debt2 !== null, "Supplier CongNo record created for Goods Receipt 2");
    assert(Number(debt2?.SoTien) === 2000000, `Debt 2 amount is 2,000,000 (actual: ${debt2?.SoTien})`);

    // -------------------------------------------------------------
    // 7. STEP 7: SETTLE SUPPLIER DEBT (PARTIAL & FULL) - UC18, UC19
    // -------------------------------------------------------------
    console.log("\n[STEP 7] Settle Supplier Debt 1: Partial payment then full payment");

    // Partial payment: Pay 1,000,000 of 3,000,000 via Cash
    const payPartRes = await fetch(`${baseUrl}/debts/${debt1._id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ktToken}` },
      body: JSON.stringify({
        amount: 1000000,
        paymentMethod: "Tiền mặt",
        notes: "Thanh toán đợt 1 cho PN 60 hộp",
      }),
    });
    const payPartData = await payPartRes.json();
    assert(payPartRes.status === 200, "Partial debt payment recorded (200 OK)");

    // Verify CongNo updated accurately
    const debt1AfterPart = await db.collection("CongNo").findOne({ _id: toId(debt1) });
    assert(Number(debt1AfterPart.SoTienDaTra) === 1000000, `CongNo SoTienDaTra is 1,000,000 (actual: ${debt1AfterPart.SoTienDaTra})`);
    assert(Number(debt1AfterPart.SoTienConLai) === 2000000, `CongNo SoTienConLai is 2,000,000 (actual: ${debt1AfterPart.SoTienConLai})`);
    assert(debt1AfterPart.TrangThai === "Còn nợ", "CongNo status is still 'Còn nợ'");

    // Verify ThanhToan record created
    const ttPart = await db.collection("ThanhToan").findOne({ MaCN: toId(debt1) });
    assert(ttPart !== null, "ThanhToan record created for debt payment (UC19)");
    assert(ttPart?.LoaiThanhToan === "Chi trả NCC", `ThanhToan LoaiThanhToan is 'Chi trả NCC' (actual: ${ttPart?.LoaiThanhToan})`);
    assert(ttPart?.TenNCC === testSupplier.TenNCC, `ThanhToan TenNCC correctly populated: '${ttPart?.TenNCC}'`);

    // Verify PhieuChi record created (since paymentMethod was Tiền mặt)
    const pcPart = await db.collection("PhieuChi").findOne({ MaCN: toId(debt1) });
    assert(pcPart !== null, "PhieuChi cash payment voucher created for supplier settlement (UC18)");
    assert(Number(pcPart?.SoTien) === 1000000, `PhieuChi amount is 1,000,000 (actual: ${pcPart?.SoTien})`);
    assert(pcPart?.NguoiNhanTien === testSupplier.TenNCC, `PhieuChi recipient is '${testSupplier.TenNCC}'`);

    // Full remaining payment: Pay remaining 2,000,000 via Chuyển khoản
    const payFullRes = await fetch(`${baseUrl}/debts/${debt1._id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ktToken}` },
      body: JSON.stringify({
        amount: 2000000,
        paymentMethod: "Chuyển khoản",
        notes: "Thanh toán dứt điểm đợt 2 cho PN 60 hộp",
      }),
    });
    assert(payFullRes.status === 200, "Full remaining debt payment recorded (200 OK)");

    // Verify CongNo is completely cleared
    const debt1AfterFull = await db.collection("CongNo").findOne({ _id: toId(debt1) });
    assert(Number(debt1AfterFull.SoTienConLai) === 0, `Debt 1 remaining balance is 0 (actual: ${debt1AfterFull.SoTienConLai})`);
    assert(debt1AfterFull.TrangThai === "Đã thanh toán", "Debt 1 status updated to 'Đã thanh toán'");

    // Verify linked PhieuNhap status updated
    const pn1AfterFull = await db.collection("PhieuNhap").findOne({ _id: toId(gr1) });
    assert(pn1AfterFull.TrangThai === "Đã thanh toán", "Linked PhieuNhap status updated to 'Đã thanh toán'");

    // -------------------------------------------------------------
    // 8. STEP 8: DIRECT GOODS RECEIPT WITH IMMEDIATE CASH PAYMENT
    // -------------------------------------------------------------
    console.log("\n[STEP 8] Immediate Cash Payment on Goods Receipt");
    const grImmediatePayload = {
      supplierId: testSupplier.id,
      items: [{ productId: testProduct.id, quantity: 10, price: 50000 }],
      paidAmount: 500000, // Pay 100% immediately in cash
      paymentMethod: "Tiền mặt",
      notes: "Nhập trực tiếp thanh toán ngay 100%",
    };

    const grImmRes = await fetch(`${baseUrl}/goods-receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tkToken}` },
      body: JSON.stringify(grImmediatePayload),
    });
    const grImmData = await grImmRes.json();
    assert(grImmRes.status === 201, "Goods Receipt with immediate cash payment created (201 Created)");
    const grImm = grImmData.data;

    // Verify CongNo has SoTienConLai = 0 and TrangThai = 'Đã thanh toán'
    const debtImm = await db.collection("CongNo").findOne({ MaPN: toId(grImm) });
    assert(debtImm !== null, "CongNo created for immediate payment receipt");
    assert(Number(debtImm.SoTienConLai) === 0, `Immediate receipt CongNo balance is 0 (actual: ${debtImm.SoTienConLai})`);
    assert(debtImm.TrangThai === "Đã thanh toán", "Immediate receipt CongNo status is 'Đã thanh toán'");

    // Verify automatic PhieuChi created
    const pcImm = await db.collection("PhieuChi").findOne({ MaPN: toId(grImm) });
    assert(pcImm !== null, "Immediate PhieuChi auto-created for cash receipt (UC18)");
    assert(Number(pcImm.SoTien) === 500000, `Immediate PhieuChi amount is 500,000 (actual: ${pcImm.SoTien})`);

    // Verify automatic ThanhToan created
    const ttImm = await db.collection("ThanhToan").findOne({ MaPN: toId(grImm) });
    assert(ttImm !== null, "Immediate ThanhToan auto-created for cash receipt (UC19)");

    // -------------------------------------------------------------
    // 9. STEP 9: SUPPLIER DELETE GUARD (SOFT DELETE) - UC06
    // -------------------------------------------------------------
    console.log("\n[STEP 9] Supplier Delete Guard: Soft-delete when transactions exist");
    const delSupRes = await fetch(`${baseUrl}/suppliers/${testSupplier.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delSupRes.status === 200, "Delete request for supplier with transactions returned 200");
    const supAfterDel = await db.collection("NhaCungCap").findOne({ _id: toId(testSupplier) });
    assert(supAfterDel.TrangThai === "Ngưng hoạt động", `Supplier with transactions was soft-deleted to 'Ngưng hoạt động' (actual: ${supAfterDel.TrangThai})`);

    // -------------------------------------------------------------
    // 10. CLEAN UP TEMPORARY TEST DATA (WITHOUT DROPPING COLLECTIONS)
    // -------------------------------------------------------------
    console.log("\n[STEP 10] Clean up temporary E2E test data cleanly");
    await db.collection("DonDatHang").deleteOne({ _id: toId(po) });
    await db.collection("CT_DonDatHang").deleteMany({ MaDDH: toId(po) });
    await db.collection("PhieuNhap").deleteMany({ _id: { $in: [toId(gr1), toId(gr2), toId(grImm)] } });
    await db.collection("CT_PhieuNhap").deleteMany({ MaPN: { $in: [toId(gr1), toId(gr2), toId(grImm)] } });
    await db.collection("CongNo").deleteMany({ MaPN: { $in: [toId(gr1), toId(gr2), toId(grImm)] } });
    await db.collection("ThanhToan").deleteMany({ MaPN: { $in: [toId(gr1), toId(gr2), toId(grImm)] } });
    await db.collection("PhieuChi").deleteMany({ MaPN: { $in: [toId(gr1), toId(gr2), toId(grImm)] } });
    await db.collection("SanPham").deleteOne({ _id: toId(testProduct) });
    await db.collection("TonKho").deleteOne({ MaSP: toId(testProduct) });
    await db.collection("NhaCungCap").deleteMany({ MaNCC: { $in: [testSupplierCode, `NCC-INACT-${uniqueSuffix}`] } });
    console.log("  ✅ Cleaned up temporary test entities safely.");

    console.log(`\n==================================================`);
    console.log(`ALL PURCHASING E2E TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    server.close();
    process.exit(1);
  }
}

runPurchasingE2E();
