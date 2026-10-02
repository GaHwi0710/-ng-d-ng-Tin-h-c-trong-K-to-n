/**
 * test_cash_reports.mjs
 * Kiểm thử toàn diện phân hệ Báo cáo Thu tiền mặt và Báo cáo Chi tiền mặt độc lập
 * Chuẩn mực Kế toán Doanh nghiệp Việt Nam - ERP Cửa hàng Mẹ & Bé
 */

import "../backend/node_modules/dotenv/config.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

let server;
let baseUrl;
let db;
let adminToken;

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASS: ${message}`);
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

async function run() {
  console.log("\n=======================================================");
  console.log("KIỂM THỬ PHÂN HỆ BÁO CÁO THU - CHI TIỀN MẶT ĐỘC LẬP");
  console.log("=======================================================\n");

  await connectToMongoDB();
  db = getDatabase();
  console.log("Kết nối MongoDB database thành công");

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`Test server running at ${baseUrl}\n`);

  // Đăng nhập tài khoản admin để lấy token
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  adminToken = loginData.token || loginData.data?.token;
  assert(!!adminToken, "Đăng nhập admin thành công để kiểm thử báo cáo kế toán");

  try {
    // ─────────────────────────────────────────────────────────────
    // PHẦN 1: BÁO CÁO THU TIỀN MẶT ĐỘC LẬP (CASH RECEIPTS)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [PHẦN 1] BÁO CÁO THU TIỀN MẶT ĐỘC LẬP (GET /reports/cash-receipts) ---");
    const resThu = await request("/reports/cash-receipts");
    assert(resThu.status === 200, "GET /api/reports/cash-receipts trả về HTTP 200");
    assert(resThu.data.report === "cash-receipts", "Mã loại báo cáo là 'cash-receipts'");
    assert(Array.isArray(resThu.data.data), "Trường data là một mảng chứng từ");
    assert(resThu.data.data.length > 0, `Đã tải thành công ${resThu.data.data.length} phiếu thu tiền mặt`);

    // Kiểm tra cấu trúc 8 cột bắt buộc
    const firstThu = resThu.data.data[0];
    assert(firstThu.stt === 1, "Cột 1: STT bắt đầu từ 1");
    assert(firstThu.NgayThu !== undefined, `Cột 2: Ngày thu tồn tại (${firstThu.NgayThu})`);
    assert(firstThu.SoPhieuThu && firstThu.SoPhieuThu.startsWith("PT"), `Cột 3: Số phiếu thu định dạng chuẩn (${firstThu.SoPhieuThu})`);
    assert(firstThu.DoiTuongNop !== undefined, `Cột 4: Đối tượng nộp tiền (${firstThu.DoiTuongNop})`);
    assert(firstThu.NoiDung !== undefined, `Cột 5: Nội dung thu (${firstThu.NoiDung})`);
    assert(firstThu.ChungTuGoc !== undefined, `Cột 6: Chứng từ gốc (${firstThu.ChungTuGoc})`);
    assert(firstThu.HinhThucThu === "Tiền mặt", `Cột 7: Hình thức thu đúng là 'Tiền mặt'`);
    assert(typeof firstThu.SoTien === "number" && firstThu.SoTien > 0, `Cột 8: Số tiền là số dương (${firstThu.SoTien.toLocaleString("vi-VN")} đ)`);

    // Kiểm tra loại trừ giao dịch phi tiền mặt (chuyển khoản, ngân hàng)
    const hasBankReceipt = resThu.data.data.some((r) => {
      const h = String(r.HinhThucThu || "").toLowerCase();
      const n = String(r.NoiDung || "").toLowerCase();
      return h.includes("chuyển khoản") || h.includes("ngân hàng");
    });
    assert(!hasBankReceipt, "100% bản ghi trong Báo cáo thu tiền mặt là Tiền mặt, không chứa chuyển khoản");

    // Kiểm tra chống trùng lặp chứng từ
    const thuCodes = resThu.data.data.map((r) => r.SoPhieuThu);
    const uniqueThuCodes = new Set(thuCodes);
    assert(thuCodes.length === uniqueThuCodes.size, `Không có chứng từ trùng lặp (${thuCodes.length}/${uniqueThuCodes.size} duy nhất)`);

    // Kiểm tra sắp xếp tăng dần theo ngày (NgayLap ascending)
    let isThuSortedAsc = true;
    for (let i = 1; i < resThu.data.data.length; i++) {
      const prevDate = resThu.data.data[i - 1].NgayThu || "";
      const curDate = resThu.data.data[i].NgayThu || "";
      if (prevDate.localeCompare(curDate) > 0) {
        isThuSortedAsc = false;
        break;
      }
    }
    assert(isThuSortedAsc, "Danh sách phiếu thu được sắp xếp tăng dần theo ngày thu (earliest first)");

    // Kiểm tra dòng tổng cộng
    const sumThu = resThu.data.data.reduce((acc, r) => acc + Number(r.SoTien || 0), 0);
    assert(resThu.data.totalAmount === sumThu, `Tổng tiền thu khớp chính xác tổng các dòng (${resThu.data.totalAmount.toLocaleString("vi-VN")} đ)`);

    // Kiểm tra lọc dữ liệu độc lập: Tìm kiếm theo mã chứng từ hoặc người nộp
    const searchTarget = firstThu.SoPhieuThu;
    const resThuSearch = await request(`/reports/cash-receipts?q=${searchTarget}`);
    assert(resThuSearch.status === 200, `Tìm kiếm phiếu thu theo '${searchTarget}' trả về HTTP 200`);
    assert(resThuSearch.data.data.length >= 1, `Tìm thấy kết quả tìm kiếm cho '${searchTarget}'`);
    assert(resThuSearch.data.data.some((r) => r.SoPhieuThu === searchTarget), `Kết quả chứa đúng phiếu ${searchTarget}`);

    // Kiểm tra lọc theo ngày (boundary check: toDate bao gồm toàn bộ giao dịch trong ngày đó)
    const dateTarget = firstThu.NgayThu;
    const resThuDate = await request(`/reports/cash-receipts?from=${dateTarget}&to=${dateTarget}`);
    assert(resThuDate.status === 200, `Lọc phiếu thu theo ngày ${dateTarget} trả về HTTP 200`);
    const allMatchDate = resThuDate.data.data.every((r) => r.NgayThu === dateTarget);
    assert(allMatchDate, `Toàn bộ ${resThuDate.data.data.length} phiếu thu trong kết quả đều thuộc ngày ${dateTarget}`);

    // ─────────────────────────────────────────────────────────────
    // PHẦN 2: BÁO CÁO CHI TIỀN MẶT ĐỘC LẬP (CASH PAYMENTS)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [PHẦN 2] BÁO CÁO CHI TIỀN MẶT ĐỘC LẬP (GET /reports/cash-payments) ---");
    const resChi = await request("/reports/cash-payments");
    assert(resChi.status === 200, "GET /api/reports/cash-payments trả về HTTP 200");
    assert(resChi.data.report === "cash-payments", "Mã loại báo cáo là 'cash-payments'");
    assert(Array.isArray(resChi.data.data), "Trường data là một mảng chứng từ");
    assert(resChi.data.data.length > 0, `Đã tải thành công ${resChi.data.data.length} phiếu chi tiền mặt`);

    // Kiểm tra cấu trúc 8 cột bắt buộc
    const firstChi = resChi.data.data[0];
    assert(firstChi.stt === 1, "Cột 1: STT bắt đầu từ 1");
    assert(firstChi.NgayChi !== undefined, `Cột 2: Ngày chi tồn tại (${firstChi.NgayChi})`);
    assert(firstChi.SoPhieuChi && firstChi.SoPhieuChi.startsWith("PC"), `Cột 3: Số phiếu chi định dạng chuẩn (${firstChi.SoPhieuChi})`);
    assert(firstChi.DoiTuongNhan !== undefined, `Cột 4: Đối tượng nhận tiền (${firstChi.DoiTuongNhan})`);
    assert(firstChi.NoiDung !== undefined, `Cột 5: Nội dung chi (${firstChi.NoiDung})`);
    assert(firstChi.ChungTuGoc !== undefined, `Cột 6: Chứng từ gốc (${firstChi.ChungTuGoc})`);
    assert(firstChi.HinhThucChi === "Tiền mặt", `Cột 7: Hình thức chi đúng là 'Tiền mặt'`);
    assert(typeof firstChi.SoTien === "number" && firstChi.SoTien > 0, `Cột 8: Số tiền là số dương (${firstChi.SoTien.toLocaleString("vi-VN")} đ)`);

    // Kiểm tra loại trừ giao dịch chuyển khoản ngân hàng (ví dụ PC073, PC078, PC080)
    const hasBankPayment = resChi.data.data.some((p) => {
      const h = String(p.HinhThucChi || "").toLowerCase();
      return h.includes("chuyển khoản") || h.includes("ngân hàng");
    });
    assert(!hasBankPayment, "100% bản ghi trong Báo cáo chi tiền mặt là Tiền mặt, không chứa chuyển khoản");

    // Kiểm tra các phiếu chi tạo bởi thanh toán chuyển khoản không xuất hiện ở Báo cáo chi tiền mặt
    const dbBankPayments = await db.collection("PhieuChi").find({ PhuongThuc: "Chuyển khoản" }).toArray();
    if (dbBankPayments.length > 0) {
      const bankCodes = new Set(dbBankPayments.map((p) => p.MaPC));
      const leakedBankVoucher = resChi.data.data.find((p) => bankCodes.has(p.SoPhieuChi));
      assert(!leakedBankVoucher, `Không bị rò rỉ bất kỳ phiếu chi chuyển khoản ngân hàng nào (${dbBankPayments.length} phiếu CK loại trừ thành công)`);
    } else {
      assert(true, "Không có phiếu chi chuyển khoản nào trong DB bị rò rỉ");
    }

    // Kiểm tra chống trùng lặp chứng từ
    const chiCodes = resChi.data.data.map((p) => p.SoPhieuChi);
    const uniqueChiCodes = new Set(chiCodes);
    assert(chiCodes.length === uniqueChiCodes.size, `Không có chứng từ trùng lặp (${chiCodes.length}/${uniqueChiCodes.size} duy nhất)`);

    // Kiểm tra sắp xếp tăng dần theo ngày (NgayLap ascending)
    let isChiSortedAsc = true;
    for (let i = 1; i < resChi.data.data.length; i++) {
      const prevDate = resChi.data.data[i - 1].NgayChi || "";
      const curDate = resChi.data.data[i].NgayChi || "";
      if (prevDate.localeCompare(curDate) > 0) {
        isChiSortedAsc = false;
        break;
      }
    }
    assert(isChiSortedAsc, "Danh sách phiếu chi được sắp xếp tăng dần theo ngày chi (earliest first)");

    // Kiểm tra dòng tổng cộng
    const sumChi = resChi.data.data.reduce((acc, p) => acc + Number(p.SoTien || 0), 0);
    assert(resChi.data.totalAmount === sumChi, `Tổng tiền chi khớp chính xác tổng các dòng (${resChi.data.totalAmount.toLocaleString("vi-VN")} đ)`);

    // Kiểm tra tìm kiếm độc lập theo đối tượng nhận
    const recipientSearch = firstChi.DoiTuongNhan.split(" ")[0];
    const resChiSearch = await request(`/reports/cash-payments?q=${encodeURIComponent(recipientSearch)}`);
    assert(resChiSearch.status === 200, `Tìm kiếm phiếu chi theo '${recipientSearch}' trả về HTTP 200`);
    assert(resChiSearch.data.data.length >= 1, `Tìm thấy kết quả tìm kiếm cho '${recipientSearch}'`);

    // ─────────────────────────────────────────────────────────────
    // PHẦN 3: ĐỘC LẬP TUYỆT ĐỐI — KHÔNG GỘP THU & CHI
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [PHẦN 3] ĐỘC LẬP TUYỆT ĐỐI — KHÔNG GỘP THU & CHI ---");
    const thuIds = new Set(resThu.data.data.map((r) => r.id));
    const chiIds = new Set(resChi.data.data.map((p) => p.id));
    let intersectionCount = 0;
    for (const id of thuIds) {
      if (chiIds.has(id)) intersectionCount++;
    }
    assert(intersectionCount === 0, "Không có giao dịch nào bị lẫn lộn giữa Báo cáo Thu và Báo cáo Chi");

    // ─────────────────────────────────────────────────────────────
    // PHẦN 4: HỒI QUY CÁC BÁO CÁO CŨ (KHÔNG BỊ ẢNH HƯỞNG)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- [PHẦN 4] KIỂM TRA HỒI QUY CÁC BÁO CÁO HỆ THỐNG ---");
    const [rev, inv, wh, debts, cf] = await Promise.all([
      request("/reports/revenue"),
      request("/reports/inventory"),
      request("/reports/warehouse"),
      request("/reports/debts"),
      request("/reports/cash-flow"),
    ]);

    assert(rev.status === 200, "Báo cáo doanh thu (GET /reports/revenue) hoạt động bình thường");
    assert(inv.status === 200, "Báo cáo tồn kho (GET /reports/inventory) hoạt động bình thường");
    assert(wh.status === 200, "Báo cáo nhập - xuất kho (GET /reports/warehouse) hoạt động bình thường");
    assert(debts.status === 200, "Báo cáo công nợ (GET /reports/debts) hoạt động bình thường");
    assert(cf.status === 200, "Báo cáo dòng tiền cũ (GET /reports/cash-flow) vẫn tương thích ngược");

    console.log("\n=======================================================");
    console.log(`KẾT THÚC KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASSED, 0 FAILED`);
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    if (server) server.close();
    process.exit(0);
  }
}

run();
