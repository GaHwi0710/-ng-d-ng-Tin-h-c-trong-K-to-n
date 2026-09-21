/**
 * Test script: Backorder/Replenishment — PO → PhieuNhap → TonKho → CongNo
 * Chạy: node test_po_flow.js
 */
import { connectToMongoDB, closeMongoDB } from "./src/config/mongodb.js";
import { ObjectId } from "mongodb";

let db;
let pass = 0;
let fail = 0;
const BASE = "http://localhost:5000/api";

// Lấy token admin
async function getToken() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  if (!res.ok) throw new Error("Không đăng nhập được admin");
  const data = await res.json();
  return data.token;
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(name, condition, extra = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${name}${extra ? " — " + extra : ""}`);
    pass++;
  } else {
    console.log(`  ❌ FAIL: ${name}${extra ? " — " + extra : ""}`);
    fail++;
  }
}

async function main() {
  db = await connectToMongoDB();
  const token = await getToken();
  console.log("\n════════════════════════════════════════════");
  console.log(" TEST: Đặt hàng NCC → Nhập kho → Tồn kho");
  console.log("════════════════════════════════════════════\n");

  // Lấy NCC và sản phẩm từ DB
  const supplier = await db.collection("NhaCungCap").findOne({ TrangThai: { $ne: "Ngưng hoạt động" } });
  if (!supplier) { console.log("Không tìm thấy NCC đang hoạt động — skip tests"); process.exit(1); }
  const product = await db.collection("SanPham").findOne({ TrangThai: { $ne: "Ngừng bán" } });
  if (!product) { console.log("Không tìm thấy sản phẩm đang bán — skip tests"); process.exit(1); }

  const suppId = String(supplier._id);
  const prodId = String(product._id);
  const stockBefore = (await db.collection("TonKho").findOne({ MaSP: product._id }))?.SoLuongTon ?? 0;

  // Đếm CongNo trước
  const debtCountBefore = await db.collection("CongNo").countDocuments({ MaNCC: supplier._id });

  // ── Test 1: Tạo PO → tồn kho KHÔNG tăng ──────────────────────────────────
  console.log("Test 1: Tạo PO không tăng tồn kho");
  const r1 = await api("POST", "/purchase-orders", {
    MaNCC: suppId,
    NgayDat: new Date().toISOString().slice(0, 10),
    items: [{ productId: prodId, quantity: 100, price: 50000 }],
  }, token);
  ok("POST /purchase-orders → 201", r1.status === 201);
  const poId = r1.data?.data?.id;
  ok("PO có id", !!poId);
  const stockAfterPO = (await db.collection("TonKho").findOne({ MaSP: product._id }))?.SoLuongTon ?? 0;
  ok("Tồn kho không tăng khi tạo PO", stockAfterPO === stockBefore, `before=${stockBefore}, after=${stockAfterPO}`);
  const debtAfterPO = await db.collection("CongNo").countDocuments({ MaNCC: supplier._id });
  ok("Không phát sinh CongNo khi tạo PO", debtAfterPO === debtCountBefore);
  const poDoc1 = await db.collection("DonDatHang").findOne({ _id: new ObjectId(poId) });
  ok("PO items có quantityReceived = 0", (poDoc1?.items || []).every(i => i.quantityReceived === 0));
  ok("PO trạng thái = Đang chờ nhập", poDoc1?.TrangThai === "Đang chờ nhập", `actual: ${poDoc1?.TrangThai}`);

  // ── Test 5: NCC inactive → tạo PO → 400 ──────────────────────────────────
  console.log("\nTest 5: NCC ngưng hoạt động không tạo được PO");
  const inactiveSupp = await db.collection("NhaCungCap").findOne({ TrangThai: "Ngưng hoạt động" });
  if (inactiveSupp) {
    const r5 = await api("POST", "/purchase-orders", {
      MaNCC: String(inactiveSupp._id),
      NgayDat: new Date().toISOString().slice(0, 10),
      items: [{ productId: prodId, quantity: 10, price: 50000 }],
    }, token);
    ok("NCC inactive → 400", r5.status === 400, `status=${r5.status}`);
  } else {
    console.log("  ⏭ Skip (không có NCC ngưng hoạt động)");
  }

  // ── Test 6: Sản phẩm ngừng bán → không thêm vào PO ───────────────────────
  console.log("\nTest 6: Sản phẩm ngừng bán không đặt được");
  const inactiveProd = await db.collection("SanPham").findOne({ TrangThai: "Ngừng bán" });
  if (inactiveProd) {
    const r6 = await api("POST", "/purchase-orders", {
      MaNCC: suppId,
      NgayDat: new Date().toISOString().slice(0, 10),
      items: [{ productId: String(inactiveProd._id), quantity: 10, price: 50000 }],
    }, token);
    ok("Product inactive → 400", r6.status === 400, `status=${r6.status}`);
  } else {
    console.log("  ⏭ Skip (không có sản phẩm ngừng bán)");
  }

  // ── Test 2: Nhập 40/100 ───────────────────────────────────────────────────
  console.log("\nTest 2: Nhập một phần (40/100)");
  const r2 = await api("POST", `/purchase-orders/${poId}/receive`, {
    items: [{ productId: prodId, quantity: 40, price: 50000 }],
    SoTienDaTra: 1000000,
  }, token);
  ok("POST /purchase-orders/:id/receive → 201", r2.status === 201, `status=${r2.status} msg=${r2.data?.message}`);
  const stockAfter40 = (await db.collection("TonKho").findOne({ MaSP: product._id }))?.SoLuongTon ?? 0;
  ok("Tồn kho tăng +40", stockAfter40 === stockBefore + 40, `expected ${stockBefore + 40}, got ${stockAfter40}`);
  const poDoc2 = await db.collection("DonDatHang").findOne({ _id: new ObjectId(poId) });
  ok("PO trạng thái = Nhập một phần", poDoc2?.TrangThai === "Nhập một phần", `actual: ${poDoc2?.TrangThai}`);
  ok("PO items[0].quantityReceived = 40", (poDoc2?.items || [])[0]?.quantityReceived === 40);
  const debtAfter40 = await db.collection("CongNo").countDocuments({ MaNCC: supplier._id });
  ok("Công nợ phát sinh sau nhập kho", debtAfter40 > debtCountBefore);

  // ── Test 4 (trước 3): Nhập quá số còn thiếu → 400 ────────────────────────
  console.log("\nTest 4: Nhập vượt số còn thiếu → bị chặn");
  const r4pre = await api("POST", `/purchase-orders/${poId}/receive`, {
    items: [{ productId: prodId, quantity: 70, price: 50000 }], // còn thiếu 60, nhập 70 → lỗi
    SoTienDaTra: 0,
  }, token);
  ok("Nhập vượt remaining → 400", r4pre.status === 400, `status=${r4pre.status} msg=${r4pre.data?.message}`);
  const stockAfterBadAttempt = (await db.collection("TonKho").findOne({ MaSP: product._id }))?.SoLuongTon ?? 0;
  ok("Tồn kho không tăng khi bị chặn", stockAfterBadAttempt === stockAfter40);

  // ── Test 3: Nhập thêm 60/60 → Hoàn thành ─────────────────────────────────
  console.log("\nTest 3: Nhập phần còn lại (60/60) → Hoàn thành");
  const r3 = await api("POST", `/purchase-orders/${poId}/receive`, {
    items: [{ productId: prodId, quantity: 60, price: 50000 }],
    SoTienDaTra: 0,
  }, token);
  ok("Nhập tiếp 60 → 201", r3.status === 201, `status=${r3.status}`);
  const stockAfterFull = (await db.collection("TonKho").findOne({ MaSP: product._id }))?.SoLuongTon ?? 0;
  ok("Tồn kho tăng đúng +100 tổng", stockAfterFull === stockBefore + 100, `expected ${stockBefore + 100}, got ${stockAfterFull}`);
  const poDoc3 = await db.collection("DonDatHang").findOne({ _id: new ObjectId(poId) });
  ok("PO trạng thái = Hoàn thành", poDoc3?.TrangThai === "Hoàn thành", `actual: ${poDoc3?.TrangThai}`);
  ok("PO items[0].quantityReceived = 100", (poDoc3?.items || [])[0]?.quantityReceived === 100);

  // ── Test 4 full: PO Hoàn thành không nhập thêm được ──────────────────────
  console.log("\nTest 4 (full): Nhập thêm khi PO Hoàn thành → bị chặn");
  const r4full = await api("POST", `/purchase-orders/${poId}/receive`, {
    items: [{ productId: prodId, quantity: 1, price: 50000 }],
    SoTienDaTra: 0,
  }, token);
  ok("PO Hoàn thành → nhập thêm → 400", r4full.status === 400, `status=${r4full.status} msg=${r4full.data?.message}`);

  // ── Test 7: PO bị hủy → không nhập được ─────────────────────────────────
  console.log("\nTest 7: PO Đã hủy không tạo phiếu nhập được");
  const r7po = await api("POST", "/purchase-orders", {
    MaNCC: suppId,
    NgayDat: new Date().toISOString().slice(0, 10),
    TrangThai: "Đã hủy",
    items: [{ productId: prodId, quantity: 10, price: 50000 }],
  }, token);
  if (r7po.data?.data?.id) {
    // Cập nhật trạng thái = Đã hủy thủ công
    await db.collection("DonDatHang").updateOne(
      { _id: new ObjectId(r7po.data.data.id) },
      { $set: { TrangThai: "Đã hủy" } }
    );
    const r7receive = await api("POST", `/purchase-orders/${r7po.data.data.id}/receive`, {
      items: [{ productId: prodId, quantity: 5, price: 50000 }],
    }, token);
    ok("PO Đã hủy → nhập → 400", r7receive.status === 400, `status=${r7receive.status} msg=${r7receive.data?.message}`);
    // Cleanup
    await db.collection("DonDatHang").deleteOne({ _id: new ObjectId(r7po.data.data.id) });
  } else {
    console.log("  ⏭ Skip (không tạo được PO test)");
  }

  // ── Test GET /purchase-orders/:id/receipts ────────────────────────────────
  console.log("\nTest: GET /purchase-orders/:id/receipts");
  const rReceipts = await api("GET", `/purchase-orders/${poId}/receipts`, null, token);
  ok("GET receipts → 200", rReceipts.status === 200, `status=${rReceipts.status}`);
  ok("Receipts data có summaryItems", Array.isArray(rReceipts.data?.data?.summaryItems));
  ok("Receipts đã link 2 phiếu nhập", (rReceipts.data?.data?.receipts || []).length === 2, `count=${(rReceipts.data?.data?.receipts || []).length}`);
  ok("totalReceived = 100", rReceipts.data?.data?.totalReceived === 100, `got=${rReceipts.data?.data?.totalReceived}`);
  ok("totalRemaining = 0", rReceipts.data?.data?.totalRemaining === 0, `got=${rReceipts.data?.data?.totalRemaining}`);

  // ── Cleanup test PO và phiếu nhập ────────────────────────────────────────
  await db.collection("DonDatHang").deleteOne({ _id: new ObjectId(poId) });
  await db.collection("CT_DonDatHang").deleteMany({ MaDDH: new ObjectId(poId) });
  await db.collection("PhieuNhap").deleteMany({ MaDDH: new ObjectId(poId) });
  await db.collection("CongNo").deleteMany({ MaDDH: new ObjectId(poId) });
  // Khôi phục tồn kho
  await db.collection("TonKho").updateOne({ MaSP: product._id }, { $set: { SoLuongTon: stockBefore } });
  await db.collection("SanPham").updateOne({ _id: product._id }, { $set: { stock: stockBefore } });

  console.log("\n════════════════════════════════════════════");
  console.log(` KẾT QUẢ: ${pass} PASS / ${pass + fail} TESTS`);
  if (fail > 0) console.log(` ❌ ${fail} tests FAIL`);
  else console.log(" ✅ Tất cả tests PASS");
  console.log("════════════════════════════════════════════\n");

  await closeMongoDB();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
