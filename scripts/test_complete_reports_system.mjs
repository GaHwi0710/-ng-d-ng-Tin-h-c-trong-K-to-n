import "../backend/node_modules/dotenv/config.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";
import {
  buildRevenueHtml,
  buildCashReceiptsHtml,
  buildCashPaymentsHtml,
  buildBankReceiptsHtml,
  buildBankPaymentsHtml,
  buildWarehouseReceiptsHtml,
  buildWarehouseIssuesHtml,
  buildInventoryHtml,
  buildIncomeStatementHtml,
  buildProductLedgerHtml,
  buildGeneralJournalHtml,
  buildFixedAssetsHtml,
  buildDebtsHtml,
  buildCashFlowHtml,
  buildSalesByEmployeeHtml,
  buildStocktakeAdjustmentsHtml,
  buildWarehouseHtml,
} from "../frontend/src/lib/reportPrint.js";

async function runCompleteReportsVerification() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log("\n===============================================================================");
  console.log("KIỂM THỬ TOÀN DIỆN HỆ THỐNG BÁO CÁO & MẪU IN KẾ TOÁN ERP (16 BÁO CÁO CHUẨN VAS)");
  console.log(`Server running at ${baseUrl}`);
  console.log("===============================================================================\n");

  let totalPassed = 0;
  let totalFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      totalPassed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      totalFailed++;
    }
  }

  // 1. Authenticate
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.data?.token;
  assert(Boolean(token), "Xác thực tài khoản kế toán quản trị thành công");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH (MẪU B 02 - DN, TT 99/2025/TT-BTC)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[1] BÁO CÁO KẾT QUẢ HĐKD (MẪU B 02 - DN)");
  const pnlRes = await fetch(`${baseUrl}/reports/income-statement?year=2026`, { headers: authHeaders });
  assert(pnlRes.status === 200, "API GET /api/reports/income-statement?year=2026 trả về 200");
  const pnlJson = await pnlRes.json();

  assert(pnlJson.report === "income-statement", "Đúng định danh báo cáo 'income-statement'");
  assert(Number(pnlJson.year) === 2026, "Năm báo cáo khớp 2026");
  assert(Array.isArray(pnlJson.items) && pnlJson.items.length >= 20, "Đủ 20 chỉ tiêu kế toán chuẩn mực theo TT 99/2025/TT-BTC");

  const item01 = pnlJson.items.find((i) => i.code === "01");
  const item10 = pnlJson.items.find((i) => i.code === "10");
  const item11 = pnlJson.items.find((i) => i.code === "11");
  const item20 = pnlJson.items.find((i) => i.code === "20");
  const item50 = pnlJson.items.find((i) => i.code === "50");
  const item51 = pnlJson.items.find((i) => i.code === "51");
  const item60 = pnlJson.items.find((i) => i.code === "60");

  assert(item01.cur > 0, `Doanh thu bán hàng (Mã 01) lấy từ HĐ thực tế: ${item01.cur} đ`);
  assert(item10.cur === item01.cur, `Doanh thu thuần (Mã 10) = Mã 01 - Mã 02: ${item10.cur} đ`);
  assert(item11.cur > 0, `Giá vốn hàng bán (Mã 11) lấy từ phiếu xuất kho: ${item11.cur} đ`);
  assert(item20.cur === item10.cur - item11.cur, `Lợi nhuận gộp (Mã 20 = 10 - 11): ${item20.cur} đ`);
  assert(item51.cur === Math.round(Math.max(0, item50.cur) * 0.2), `Thuế TNDN 20% (Mã 51) tính chính xác: ${item51.cur} đ`);
  assert(item60.cur === item50.cur - item51.cur, `Lợi nhuận sau thuế (Mã 60 = 50 - 51): ${item60.cur} đ`);

  const pnlHtml = buildIncomeStatementHtml({
    items: pnlJson.items,
    year: pnlJson.year,
    curPeriod: pnlJson.curPeriod,
    prevPeriod: pnlJson.prevPeriod,
    summary: pnlJson.summary,
  });
  assert(pnlHtml.includes("BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH"), "Mẫu in có tiêu đề chuẩn B 02 - DN");
  assert(pnlHtml.includes("Thông tư số 99/2025/TT-BTC"), "Mẫu in ghi rõ căn cứ pháp lý TT 99/2025/TT-BTC");
  assert(pnlHtml.includes("Người lập biểu") && pnlHtml.includes("Kế toán trưởng"), "Mẫu in có đủ chữ ký Người lập biểu và Kế toán trưởng");

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SỔ CHI TIẾT SẢN PHẨM HÀNG HÓA (MẪU S10-DN, TT 99/2025/TT-BTC)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[2] SỔ CHI TIẾT VẬT LIỆU, SẢN PHẨM, HÀNG HÓA (MẪU S10-DN)");
  const prods = await db.collection("SanPham").find({}).limit(1).toArray();
  const testProdId = prods[0]?.id || prods[0]?._id?.toString() || "SP001";

  const s10Res = await fetch(`${baseUrl}/reports/product-ledger?productId=${testProdId}`, { headers: authHeaders });
  assert(s10Res.status === 200, `API GET /api/reports/product-ledger?productId=${testProdId} trả về 200`);
  const s10Json = await s10Res.json();

  assert(s10Json.report === "product-ledger", "Đúng định danh báo cáo 'product-ledger'");
  assert(Boolean(s10Json.product?.name || s10Json.product?.TenSP), `Thông tin sản phẩm tồn tại: ${s10Json.product?.name || s10Json.product?.TenSP}`);
  assert(typeof s10Json.tonDauQty === "number", `Tồn đầu kỳ hợp lệ: ${s10Json.tonDauQty} sản phẩm`);
  assert(typeof s10Json.tonCuoiQty === "number", `Tồn cuối kỳ hợp lệ: ${s10Json.tonCuoiQty} sản phẩm`);
  assert(Array.isArray(s10Json.data), "Danh sách các dòng nghiệp vụ nhập xuất hợp lệ");

  const s10Html = buildProductLedgerHtml({
    product: s10Json.product,
    data: s10Json.data,
    from: "2026-09-01",
    to: "2026-09-30",
    tonDauQty: s10Json.tonDauQty,
    tonDauAmount: s10Json.tonDauAmount,
    totalNhapQty: s10Json.totalNhapQty,
    totalNhapAmount: s10Json.totalNhapAmount,
    totalXuatQty: s10Json.totalXuatQty,
    totalXuatAmount: s10Json.totalXuatAmount,
    tonCuoiQty: s10Json.tonCuoiQty,
    tonCuoiAmount: s10Json.tonCuoiAmount,
  });
  assert(s10Html.includes("SỔ CHI TIẾT"), "Mẫu in có tiêu đề chuẩn S10-DN");
  assert(s10Html.includes("Mẫu số S10-DN"), "Mẫu in thể hiện ký hiệu Mẫu số S10-DN");
  assert(s10Html.includes("page-landscape"), "Sổ chi tiết định dạng A4 Landscape theo quy định");

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SỔ NHẬT KÝ CHUNG (MẪU S03a-DNN, TT 133/2016/TT-BTC)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[3] SỔ NHẬT KÝ CHUNG (MẪU S03a-DNN)");
  const gjRes = await fetch(`${baseUrl}/reports/general-journal?year=2026`, { headers: authHeaders });
  assert(gjRes.status === 200, "API GET /api/reports/general-journal trả về 200");
  const gjJson = await gjRes.json();

  assert(gjJson.report === "general-journal", "Đúng định danh báo cáo 'general-journal'");
  assert(Array.isArray(gjJson.data), "Có danh sách định khoản kép");
  assert(typeof gjJson.totalDebit === "number" && typeof gjJson.totalCredit === "number", "Có số tổng phát sinh Nợ và Có");
  assert(gjJson.totalDebit === gjJson.totalCredit, `CÂN ĐỐI KÉP KẾ TOÁN CHUẨN MỰC: Tổng Nợ = ${gjJson.totalDebit} === Tổng Có = ${gjJson.totalCredit}`);

  const gjHtml = buildGeneralJournalHtml({
    data: gjJson.data,
    totalDebit: gjJson.totalDebit,
    totalCredit: gjJson.totalCredit,
    year: "2026",
  });
  assert(gjHtml.includes("SỔ NHẬT KÝ CHUNG"), "Mẫu in có tiêu đề chuẩn S03a-DNN");
  assert(gjHtml.includes("Thông tư số 133/2016/TT-BTC"), "Mẫu in ghi rõ căn cứ pháp lý TT 133/2016/TT-BTC");
  assert(gjHtml.includes("Sổ Cái") || gjHtml.includes("sổ cái"), "Mẫu in có cột 'Đã ghi sổ cái'");

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SỔ TÀI SẢN CỐ ĐỊNH (MẪU S21-DN, TT 200/2014/TT-BTC)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[4] SỔ TÀI SẢN CỐ ĐỊNH (MẪU S21-DN)");
  const faRes = await fetch(`${baseUrl}/reports/fixed-assets?year=2026`, { headers: authHeaders });
  assert(faRes.status === 200, "API GET /api/reports/fixed-assets trả về 200");
  const faJson = await faRes.json();

  assert(faJson.report === "fixed-assets", "Đúng định danh báo cáo 'fixed-assets'");
  assert(Boolean(faJson.notice), "Có thông báo chính thức chuẩn kế toán không tạo số liệu giả");

  const faHtml = buildFixedAssetsHtml({
    year: "2026",
    notice: faJson.notice,
    nextSteps: faJson.nextSteps,
  });
  assert(faHtml.includes("SỔ TÀI SẢN CỐ ĐỊNH"), "Mẫu in có tiêu đề chuẩn S21-DN");
  assert(faHtml.includes("200/2014/TT-BTC"), "Mẫu in ghi nhận căn cứ TT 200/2014/TT-BTC");
  assert(faHtml.includes("page-landscape"), "Mẫu in A4 Landscape cho Sổ TSCĐ");

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. BÁO CÁO THU & CHI TIỀN GỬI NGÂN HÀNG
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[5] BÁO CÁO THU & CHI TIỀN GỬI NGÂN HÀNG");
  const brRes = await fetch(`${baseUrl}/reports/bank-receipts`, { headers: authHeaders });
  assert(brRes.status === 200, "API GET /api/reports/bank-receipts trả về 200");
  const brJson = await brRes.json();
  assert(brJson.report === "bank-receipts", "Báo cáo thu ngân hàng xác định đúng");

  const bpRes = await fetch(`${baseUrl}/reports/bank-payments`, { headers: authHeaders });
  assert(bpRes.status === 200, "API GET /api/reports/bank-payments trả về 200");
  const bpJson = await bpRes.json();
  assert(bpJson.report === "bank-payments", "Báo cáo chi ngân hàng xác định đúng");

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. BÁO CÁO DOANH THU THEO NHÂN VIÊN & KIỂM KÊ KHO
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[6] BÁO CÁO DOANH THU NHÂN VIÊN & KIỂM KÊ KHO");
  const sbeRes = await fetch(`${baseUrl}/reports/sales-by-employee`, { headers: authHeaders });
  assert(sbeRes.status === 200, "API GET /api/reports/sales-by-employee trả về 200");
  const sbeJson = await sbeRes.json();
  assert(Array.isArray(sbeJson.data), "Có danh sách doanh thu từng nhân viên");

  const staRes = await fetch(`${baseUrl}/reports/stocktake-adjustments`, { headers: authHeaders });
  assert(staRes.status === 200, "API GET /api/reports/stocktake-adjustments trả về 200");
  const staJson = await staRes.json();
  assert(Array.isArray(staJson.data), "Có danh sách kiểm kê điều chỉnh kho");

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. BÁO CÁO NHẬP - XUẤT - TỒN 10 NHÓM CỘT (MẪU S11/S12-DN)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[7] BÁO CÁO NHẬP - XUẤT - TỒN (10 NHÓM CỘT KẾ TOÁN)");
  const invRes = await fetch(`${baseUrl}/reports/inventory`, { headers: authHeaders });
  assert(invRes.status === 200, "API GET /api/reports/inventory trả về 200");
  const invJson = await invRes.json();

  assert(Array.isArray(invJson.data), "Dữ liệu tồn kho dạng mảng");
  if (invJson.data.length > 0) {
    const s = invJson.data[0];
    assert(s.TonDau !== undefined && s.NhapTrongKy !== undefined && s.XuatTrongKy !== undefined && s.TonCuoi !== undefined, "Có đủ 4 đại lượng: Tồn đầu, Nhập, Xuất, Tồn cuối");
    assert(s.ThanhTienTonDau !== undefined && s.ThanhTienNhap !== undefined && s.ThanhTienXuat !== undefined && s.GiaTriTon !== undefined, "Có đủ 4 giá trị thành tiền tương ứng");
  }

  const invHtml = buildInventoryHtml({
    products: invJson.data,
    summary: invJson.summary,
  });
  assert(invHtml.includes("NHẬP - XUẤT - TỒN"), "Mẫu in tồn kho có tiêu đề chuẩn");
  assert(invHtml.includes("page-landscape"), "Mẫu in tồn kho thiết lập A4 Landscape");

  // [8] BÁO CÁO TỔNG HỢP NHẬP – XUẤT KHO
  console.log("\n[8] BÁO CÁO TỔNG HỢP NHẬP – XUẤT KHO (SỔ THEO DÕI BIẾN ĐỘNG KHO)");
  const whRes = await fetch(`${baseUrl}/reports/warehouse`, { headers: authHeaders });
  assert(whRes.status === 200, "API GET /api/reports/warehouse trả về 200");
  const whJson = await whRes.json();
  assert(whJson.report === "warehouse", "Đúng định danh báo cáo 'warehouse'");
  assert(Array.isArray(whJson.transactions), "Dữ liệu giao dịch nhập xuất dạng mảng");

  const whHtml = buildWarehouseHtml({
    receipts: whJson.receipts || [],
    issues: whJson.issues || [],
    transactions: whJson.transactions || [],
    totalImportUnits: whJson.totalImportUnits,
    totalExportUnits: whJson.totalExportUnits,
    totalImportValue: whJson.totalImportValue,
    totalExportValue: whJson.totalExportValue,
  });
  assert(whHtml.includes("BÁO CÁO TỔNG HỢP NHẬP – XUẤT KHO"), "Mẫu in tổng hợp nhập xuất kho có tiêu đề chuẩn");
  assert(whHtml.includes("SỔ THEO DÕI BIẾN ĐỘNG KHO HÀNG"), "Mẫu in có mẫu số sổ kho chuẩn mực");
  assert(whHtml.includes("page-landscape"), "Mẫu in tổng hợp nhập xuất kho thiết lập A4 Landscape");

  // Kết thúc server
  server.close();

  console.log("\n===============================================================================");
  console.log(`KẾT QUẢ TỔNG THỂ: ${totalPassed} PASSED / ${totalFailed} FAILED`);
  console.log("===============================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runCompleteReportsVerification().catch((err) => {
  console.error("Lỗi thực thi kiểm thử:", err);
  process.exit(1);
});
