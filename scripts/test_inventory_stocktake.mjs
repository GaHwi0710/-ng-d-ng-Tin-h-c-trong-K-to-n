import "../backend/node_modules/dotenv/config.js";
import { ObjectId } from "../backend/node_modules/mongodb/lib/index.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

function toId(val) {
  if (!val) return null;
  const raw = val._id || val.id || val;
  return ObjectId.isValid(raw) ? new ObjectId(raw) : raw;
}

async function runInventoryStocktakeE2E() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log(`\n==================================================`);
  console.log(`E2E TEST SUITE: UC20, UC21, UC22 (INVENTORY & STOCKTAKE)`);
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

  // Cleanup registry to preserve DB state
  const createdStocktakeIds = [];
  const createdAdjustmentIds = [];
  let originalStock = null;
  let targetProduct = null;

  try {
    // -------------------------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log("[AUTH] Logging in actors: ThuKho (vanhung), QuanLy (admin), NhanVienBanHang (maianh), KeToan (ketoan)");

    const loginUser = async (username, password) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      return { status: res.status, token: data.token, user: data.user };
    };

    const vanhung = await loginUser("vanhung", "vanhung123");
    assert(vanhung.status === 200, "Login 'vanhung' (ThuKho) 200 OK");

    const admin = await loginUser("admin", "admin123");
    assert(admin.status === 200, "Login 'admin' (QuanLy) 200 OK");

    const maianh = await loginUser("maianh", "maianh123");
    assert(maianh.status === 200, "Login 'maianh' (NhanVienBanHang) 200 OK");

    const ketoan = await loginUser("ketoan", "ketoan123");
    assert(ketoan.status === 200, "Login 'ketoan' (KeToan) 200 OK");

    // -------------------------------------------------------------------------
    // TEST 1: UC20 - XEM DANH SÁCH TỒN KHO BAN ĐẦU
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] UC20: Xem danh sách tồn kho ban đầu (GET /api/inventory)");
    const invRes = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    });
    assert(invRes.status === 200, "GET /api/inventory returns 200 OK");
    const invData = await invRes.json();
    assert(Array.isArray(invData.data) && invData.data.length > 0, "Inventory returns list of products");

    // Check fields on each product
    const sample = invData.data[0];
    assert(
      sample.MaSP && sample.TenSP && sample.DonViTinh &&
      typeof sample.GiaNhap === "number" &&
      typeof sample.GiaBan === "number" &&
      typeof sample.SoLuongTon === "number" &&
      sample.SoLuongToiThieu !== undefined,
      `Inventory item has all required fields: MaSP (${sample.MaSP}), TenSP, ĐVT, GiaNhap, GiaBan, SoLuongTon (${sample.SoLuongTon}), SoLuongToiThieu`
    );

    // Pick a target product with valid stock for testing
    targetProduct = invData.data.find((p) => p.stock > 10) || invData.data[0];
    targetProduct._id = targetProduct._id || targetProduct.id;
    originalStock = Number(targetProduct.stock);
    console.log(`  -> Selected target product for testing: [${targetProduct.MaSP}] ${targetProduct.TenSP}, Initial Stock S0 = ${originalStock}`);

    // Verify consistency with MongoDB TonKho collection
    const dbStockDoc0 = await db.collection("TonKho").findOne({ MaSP: toId(targetProduct._id) });
    const dbQty0 = Number(dbStockDoc0?.SoLuongTon ?? dbStockDoc0?.SoLuong ?? targetProduct.stock);
    assert(dbQty0 === originalStock, `Direct DB check: TonKho.SoLuongTon (${dbQty0}) == API stock (${originalStock})`);

    // -------------------------------------------------------------------------
    // TEST 2: UC21 - LẬP PHIẾU KIỂM KÊ ĐỢT 1 (CHÊNH LỆCH ÂM: -5)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] UC21: Lập phiếu kiểm kê đợt 1 với số thực tế < hệ thống (S0 - 5 = " + (originalStock - 5) + ")");
    const stocktake1Payload = {
      NgayKiemKe: new Date().toISOString().slice(0, 10),
      GhiChu: "Kiểm kê định kỳ đợt 1 - phát hiện thiếu hụt vỡ hỏng",
      items: [
        {
          productId: targetProduct._id,
          actual: originalStock - 5,
          reason: "Bị vỡ nứt hộp khi vận chuyển",
        },
      ],
    };

    const st1Res = await fetch(`${baseUrl}/stocktakes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify(stocktake1Payload),
    });
    assert(st1Res.status === 201, "POST /api/stocktakes returns 201 Created");
    const st1Data = await st1Res.json();
    const stocktake1 = st1Data.data;
    createdStocktakeIds.push(stocktake1._id);

    assert(stocktake1.MaKK && stocktake1.MaKK.startsWith("KK"), `Auto-generated MaKK: ${stocktake1.MaKK}`);
    assert(stocktake1.TrangThai === "Chờ điều chỉnh", `Stocktake status is "Chờ điều chỉnh" (found discrepancy -5)`);
    assert(stocktake1.TongChenhLech === -5, `TongChenhLech calculated correctly: ${stocktake1.TongChenhLech}`);

    // Verify detail line in CT_KiemKe
    const detailLines1 = await db.collection("CT_KiemKe").find({
      $or: [{ MaKK: stocktake1._id }, { MaKK: toId(stocktake1._id) }, { MaKK: stocktake1.MaKK }],
    }).toArray();
    assert(detailLines1.length >= 1, "CT_KiemKe records inserted successfully");
    const line1 = detailLines1.find((l) => String(l.MaSP) === String(targetProduct._id));
    assert(
      line1 && line1.SoLuongHeThong === originalStock && line1.SoLuongThucTe === originalStock - 5 && line1.ChenhLech === -5,
      `CT_KiemKe line: Sys=${line1?.SoLuongHeThong}, Actual=${line1?.SoLuongThucTe}, Diff=${line1?.ChenhLech}`
    );

    // CRUCIAL REQUIREMENT: Stock MUST NOT be changed upon creating stocktake!
    const invAfterST1 = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    }).then((r) => r.json());
    const prodAfterST1 = invAfterST1.data.find((p) => String(p._id) === String(targetProduct._id));
    assert(
      Number(prodAfterST1.stock) === originalStock,
      `[CRITICAL UC21 RULE] Stock in inventory remains UNCHANGED after stocktake creation: ${prodAfterST1.stock} == ${originalStock}`
    );

    const dbStockDocAfterST1 = await db.collection("TonKho").findOne({ MaSP: toId(targetProduct._id) });
    const dbQtyAfterST1 = Number(dbStockDocAfterST1?.SoLuongTon ?? dbStockDocAfterST1?.SoLuong);
    assert(
      dbQtyAfterST1 === originalStock,
      `[CRITICAL UC21 RULE] Direct DB TonKho.SoLuongTon remains UNCHANGED: ${dbQtyAfterST1} == ${originalStock}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: UC22 - THỰC HIỆN ĐIỀU CHỈNH TỒN KHO ĐỢT 1
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] UC22: Thực hiện điều chỉnh tồn kho đợt 1 từ phiếu kiểm kê đợt 1");
    const adj1Res = await fetch(`${baseUrl}/stocktakes/${stocktake1._id}/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({ reason: "Xác nhận điều chỉnh hao hụt hàng vỡ đợt 1" }),
    });
    assert(adj1Res.status === 200, "POST /api/stocktakes/:id/adjust returns 200 OK");
    const adj1Data = await adj1Res.json();
    const historyDoc1 = adj1Data.data;
    if (historyDoc1?._id) createdAdjustmentIds.push(historyDoc1._id);

    // Verify stocktake status updated to "Đã điều chỉnh"
    const st1Updated = await db.collection("KiemKe").findOne({ _id: toId(stocktake1._id) });
    assert(st1Updated.TrangThai === "Đã điều chỉnh", `Stocktake record status is now "Đã điều chỉnh"`);
    assert(st1Updated.NgayDieuChinh && st1Updated.NguoiDieuChinh, `Stocktake recorded NgayDieuChinh and NguoiDieuChinh (${st1Updated.NguoiDieuChinh})`);

    // Verify inventory NOW UPDATED to S0 - 5
    const invAfterAdj1 = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    }).then((r) => r.json());
    const prodAfterAdj1 = invAfterAdj1.data.find((p) => String(p._id) === String(targetProduct._id));
    assert(
      Number(prodAfterAdj1.stock) === originalStock - 5,
      `[CRITICAL UC22 RULE] Stock is now updated after adjustment: ${prodAfterAdj1.stock} == ${originalStock - 5}`
    );

    const dbStockDocAfterAdj1 = await db.collection("TonKho").findOne({ MaSP: toId(targetProduct._id) });
    const dbQtyAfterAdj1 = Number(dbStockDocAfterAdj1?.SoLuongTon ?? dbStockDocAfterAdj1?.SoLuong);
    assert(
      dbQtyAfterAdj1 === originalStock - 5,
      `Direct DB TonKho.SoLuongTon updated: ${dbQtyAfterAdj1} == ${originalStock - 5}`
    );

    // Verify DieuChinhKho audit record
    const dcRecord1 = await db.collection("DieuChinhKho").findOne({ MaKK: stocktake1.MaKK });
    assert(dcRecord1 !== null, `DieuChinhKho audit record saved for ${stocktake1.MaKK}`);
    assert(
      dcRecord1 && dcRecord1.details && dcRecord1.details[0].TonTruoc === originalStock &&
      dcRecord1.details[0].TonSau === originalStock - 5 &&
      dcRecord1.details[0].ChenhLech === -5,
      `Audit record details: TonTruoc=${dcRecord1?.details?.[0]?.TonTruoc}, TonSau=${dcRecord1?.details?.[0]?.TonSau}, ChenhLech=${dcRecord1?.details?.[0]?.ChenhLech}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: UC21 - LẬP PHIẾU KIỂM KÊ ĐỢT 2 (CHÊNH LỆCH DƯƠNG: +13)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] UC21: Lập phiếu kiểm kê đợt 2 với số thực tế > hệ thống (S1 + 13 = " + (originalStock - 5 + 13) + ")");
    const currentStockS1 = originalStock - 5;
    const stocktake2Payload = {
      NgayKiemKe: new Date().toISOString().slice(0, 10),
      GhiChu: "Kiểm kê đợt 2 - tìm thấy hàng dư tại kệ phụ",
      items: [
        {
          productId: targetProduct._id,
          actual: currentStockS1 + 13,
          reason: "Tìm thấy 13 cái tại kệ phụ chưa nhập thẻ kho",
        },
      ],
    };

    const st2Res = await fetch(`${baseUrl}/stocktakes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify(stocktake2Payload),
    });
    assert(st2Res.status === 201, "POST /api/stocktakes (đợt 2) returns 201 Created");
    const st2Data = await st2Res.json();
    const stocktake2 = st2Data.data;
    createdStocktakeIds.push(stocktake2._id);

    assert(stocktake2.TrangThai === "Chờ điều chỉnh", `Stocktake 2 status is "Chờ điều chỉnh" (found discrepancy +13)`);
    assert(stocktake2.TongChenhLech === 13, `TongChenhLech đợt 2 calculated: ${stocktake2.TongChenhLech}`);

    // Verify stock remains S1 (unchanged)
    const invAfterST2 = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    }).then((r) => r.json());
    const prodAfterST2 = invAfterST2.data.find((p) => String(p._id) === String(targetProduct._id));
    assert(
      Number(prodAfterST2.stock) === currentStockS1,
      `[CRITICAL UC21 RULE] Stock remains unchanged after stocktake 2: ${prodAfterST2.stock} == ${currentStockS1}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: UC22 - THỰC HIỆN ĐIỀU CHỈNH TỒN KHO ĐỢT 2
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] UC22: Thực hiện điều chỉnh tồn kho đợt 2 từ phiếu kiểm kê đợt 2");
    const adj2Res = await fetch(`${baseUrl}/stocktakes/${stocktake2._id}/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({ reason: "Xác nhận nhập bổ sung 13 cái thừa kho phụ" }),
    });
    assert(adj2Res.status === 200, "POST /api/stocktakes/:id/adjust (đợt 2) returns 200 OK");
    const adj2Data = await adj2Res.json();
    const historyDoc2 = adj2Data.data;
    if (historyDoc2?._id) createdAdjustmentIds.push(historyDoc2._id);

    // Verify inventory NOW UPDATED to S1 + 13 = originalStock + 8
    const expectedFinalStock = originalStock + 8;
    const invAfterAdj2 = await fetch(`${baseUrl}/inventory`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    }).then((r) => r.json());
    const prodAfterAdj2 = invAfterAdj2.data.find((p) => String(p._id) === String(targetProduct._id));
    assert(
      Number(prodAfterAdj2.stock) === expectedFinalStock,
      `[CRITICAL UC22 RULE] Stock after 2nd adjustment: ${prodAfterAdj2.stock} == ${expectedFinalStock}`
    );

    // Verify 2nd audit log in DieuChinhKho
    const dcRecord2 = await db.collection("DieuChinhKho").findOne({ MaKK: stocktake2.MaKK });
    assert(
      dcRecord2 && dcRecord2.details && dcRecord2.details[0].TonTruoc === currentStockS1 &&
      dcRecord2.details[0].TonSau === expectedFinalStock &&
      dcRecord2.details[0].ChenhLech === 13,
      `Audit record 2 details: TonTruoc=${dcRecord2?.details?.[0]?.TonTruoc}, TonSau=${dcRecord2?.details?.[0]?.TonSau}, ChenhLech=${dcRecord2?.details?.[0]?.ChenhLech}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: UC22 - KIỂM TRA LỊCH SỬ ĐIỀU CHỈNH TỒN KHO (API)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] UC22: Kiểm tra lịch sử điều chỉnh tồn kho (GET /api/inventory/adjustments & /api/stocktakes/adjustments)");
    const histRes1 = await fetch(`${baseUrl}/inventory/adjustments`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    });
    assert(histRes1.status === 200, "GET /api/inventory/adjustments returns 200 OK");
    const histData1 = await histRes1.json();
    assert(Array.isArray(histData1.data), "Adjustments endpoint returns array");

    const foundAdj1 = histData1.data.find((h) => h.MaKK === stocktake1.MaKK);
    const foundAdj2 = histData1.data.find((h) => h.MaKK === stocktake2.MaKK);
    assert(foundAdj1 !== undefined, `Found adjustment history for đợt 1 (${stocktake1.MaKK})`);
    assert(foundAdj2 !== undefined, `Found adjustment history for đợt 2 (${stocktake2.MaKK})`);

    const histRes2 = await fetch(`${baseUrl}/stocktakes/adjustments`, {
      headers: { Authorization: `Bearer ${vanhung.token}` },
    });
    assert(histRes2.status === 200, "GET /api/stocktakes/adjustments returns 200 OK");

    // -------------------------------------------------------------------------
    // TEST 7: RBAC - KIỂM TRA PHÂN QUYỀN ĐIỀU CHỈNH KHO
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] RBAC: Kiểm tra phân quyền điều chỉnh kho");

    // NhanVienBanHang (maianh) trying to adjust -> 403 Forbidden
    const unauthAdjRes = await fetch(`${baseUrl}/stocktakes/${stocktake1._id}/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${maianh.token}`,
      },
      body: JSON.stringify({ reason: "Cố tình điều chỉnh không có quyền" }),
    });
    assert(
      unauthAdjRes.status === 403,
      `NhanVienBanHang (maianh) rejected with HTTP 403 Forbidden: ${unauthAdjRes.status}`
    );

    // KeToan (ketoan) trying to adjust -> 403 Forbidden
    const ketoanAdjRes = await fetch(`${baseUrl}/stocktakes/${stocktake1._id}/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ketoan.token}`,
      },
      body: JSON.stringify({ reason: "Kế toán không có quyền điều chỉnh kho" }),
    });
    assert(
      ketoanAdjRes.status === 403,
      `KeToan (ketoan) rejected with HTTP 403 Forbidden: ${ketoanAdjRes.status}`
    );

    // QuanLy (admin) has full rights -> can view and adjust
    const adminCheckRes = await fetch(`${baseUrl}/inventory/adjustments`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(adminCheckRes.status === 200, "QuanLy (admin) has full access to view adjustments (200 OK)");

    // -------------------------------------------------------------------------
    // TEST 8: INTEGRITY & REPEAT ADJUSTMENT GUARD
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Integrity & Repeat adjustment guard");

    // Attempting to adjust stocktake1 AGAIN should fail with 400 Bad Request
    const repeatAdjRes = await fetch(`${baseUrl}/stocktakes/${stocktake1._id}/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({ reason: "Cố tình điều chỉnh lại lần 2" }),
    });
    assert(
      repeatAdjRes.status === 400,
      `Adjusting an already adjusted stocktake rejected with HTTP 400 Bad Request: ${repeatAdjRes.status}`
    );
    const repeatData = await repeatAdjRes.json();
    assert(
      repeatData.message && repeatData.message.includes("điều chỉnh"),
      `Clear error message returned: "${repeatData.message}"`
    );

    // Direct inventory adjustment endpoint (POST /api/inventory/adjust)
    const directAdjRes = await fetch(`${baseUrl}/inventory/adjust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({
        reason: "Điều chỉnh trực tiếp để kiểm tra API",
        items: [{ productId: targetProduct._id, newStock: expectedFinalStock }],
      }),
    });
    assert(directAdjRes.status === 200, "POST /api/inventory/adjust direct adjustment returns 200 OK");
    const directData = await directAdjRes.json();
    if (directData?.data?._id) createdAdjustmentIds.push(directData.data._id);

    // -------------------------------------------------------------------------
    // TEST 9: NO DOUBLE-COUNT & SYNC INTEGRITY
    // -------------------------------------------------------------------------
    console.log("\n[TEST 9] No double-count & Inventory report sync integrity");

    // Check report inventory endpoint (UC24)
    const rptInvRes = await fetch(`${baseUrl}/reports/inventory`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(rptInvRes.status === 200, "GET /api/reports/inventory returns 200 OK");
    const rptData = await rptInvRes.json();
    const rptProd = rptData.data?.find((p) => String(p._id) === String(targetProduct._id) || p.MaSP === targetProduct.MaSP);
    assert(
      rptProd && Number(rptProd.SoLuongTon || rptProd.TonHienTai || rptProd.stock) === expectedFinalStock,
      `Report inventory is 100% synchronized with live inventory: ${rptProd?.SoLuongTon || rptProd?.stock} == ${expectedFinalStock}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: VALIDATION & EDGE CASES & CLEANUP
    // -------------------------------------------------------------------------
    console.log("\n[TEST 10] Validation, Edge Cases & Data State Preservation");

    // Negative actual stock in stocktake -> 400
    const negSTRes = await fetch(`${baseUrl}/stocktakes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({
        items: [{ productId: targetProduct._id, actual: -10 }],
      }),
    });
    assert(negSTRes.status === 400, "Negative actual stock in stocktake rejected with HTTP 400");

    // Empty items in stocktake -> 400
    const emptySTRes = await fetch(`${baseUrl}/stocktakes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({ items: [] }),
    });
    assert(emptySTRes.status === 400, "Empty items in stocktake rejected with HTTP 400");

    // Non-existent product -> 404 / 400
    const notFoundSTRes = await fetch(`${baseUrl}/stocktakes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({
        items: [{ productId: new ObjectId().toString(), actual: 50 }],
      }),
    });
    assert(notFoundSTRes.status >= 400, "Non-existent product rejected with error status >= 400");

    // Stocktake with 100% matched items -> Status: "Khớp hoàn toàn"
    const matchSTRes = await fetch(`${baseUrl}/stocktakes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${vanhung.token}`,
      },
      body: JSON.stringify({
        items: [{ productId: targetProduct._id, actual: expectedFinalStock }],
      }),
    });
    assert(matchSTRes.status === 201, "Matched stocktake created with 201 Created");
    const matchData = await matchSTRes.json();
    assert(matchData.data.TrangThai === "Khớp hoàn toàn", `Matched stocktake status is "Khớp hoàn toàn"`);
    createdStocktakeIds.push(matchData.data._id);

    // CLEANUP TEST DATA: Revert target product stock back to originalStock
    console.log(`\n[CLEANUP] Reverting target product stock back to original S0 = ${originalStock}`);
    await db.collection("TonKho").updateOne(
      { MaSP: toId(targetProduct._id) },
      { $set: { SoLuongTon: originalStock, SoLuong: originalStock } }
    );
    await db.collection("SanPham").updateOne(
      { _id: toId(targetProduct._id) },
      { $set: { stock: originalStock } }
    );

    // Clean up temporary test stocktakes and details
    for (const sid of createdStocktakeIds) {
      await db.collection("KiemKe").deleteOne({ _id: toId(sid) });
      await db.collection("CT_KiemKe").deleteMany({ MaKK: toId(sid) });
    }
    for (const did of createdAdjustmentIds) {
      await db.collection("DieuChinhKho").deleteOne({ _id: toId(did) });
    }

    // Verify stock is restored cleanly
    const finalCheckDoc = await db.collection("TonKho").findOne({ MaSP: toId(targetProduct._id) });
    assert(
      Number(finalCheckDoc.SoLuongTon) === originalStock,
      `Database state preserved: TonKho restored cleanly to original ${originalStock}`
    );

  } catch (err) {
    console.error("Test threw unexpected exception:", err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n==================================================`);
  console.log(`E2E TEST SUMMARY: UC20, UC21, UC22`);
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runInventoryStocktakeE2E().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
