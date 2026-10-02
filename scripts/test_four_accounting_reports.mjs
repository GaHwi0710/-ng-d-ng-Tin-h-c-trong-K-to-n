import "../backend/node_modules/dotenv/config.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";
import {
  buildCashReceiptsHtml,
  buildCashPaymentsHtml,
  buildWarehouseReceiptsHtml,
  buildWarehouseIssuesHtml,
} from "../frontend/src/lib/reportPrint.js";

async function runFourReportsAudit() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log("\n===============================================================================");
  console.log("TEST SUITE: KIỂM TOÁN VÀ CHUẨN HÓA 4 BÁO CÁO KẾ TOÁN (THU - CHI - NHẬP - XUẤT)");
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
  assert(Boolean(token), "Đăng nhập admin thành công và lấy JWT token");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BÁO CÁO THU TIỀN MẶT (/api/reports/cash-receipts)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PHẦN 1] BÁO CÁO THU TIỀN MẶT ĐỘC LẬP (MẪU 8 CỘT CHUẨN KẾ TOÁN)");
  const cashRecRes = await fetch(`${baseUrl}/reports/cash-receipts`, { headers: authHeaders });
  assert(cashRecRes.status === 200, "API GET /api/reports/cash-receipts trả về HTTP 200");
  const cashRecJson = await cashRecRes.json();

  assert(cashRecJson.report === "cash-receipts", "Báo cáo xác định đúng type 'cash-receipts'");
  assert(Array.isArray(cashRecJson.data), "Dữ liệu trả về mảng danh sách phiếu thu tiền mặt");
  assert(typeof cashRecJson.totalAmount === "number", "Có trường tổng số tiền thu (totalAmount)");
  assert(typeof cashRecJson.totalCount === "number", "Có trường tổng số lượng phiếu thu (totalCount)");

  // Kiểm tra tính tiền mặt 100%, không bị lẫn chuyển khoản
  const nonCashRecs = cashRecJson.data.filter((r) => r.HinhThucThu && r.HinhThucThu !== "Tiền mặt");
  assert(nonCashRecs.length === 0, "100% bản ghi là giao dịch thu TIỀN MẶT, đã loại trừ chuyển khoản");

  // Kiểm tra 8 cột dữ liệu chuẩn
  if (cashRecJson.data.length > 0) {
    const sample = cashRecJson.data[0];
    assert(sample.stt !== undefined, "Cột 1: STT tồn tại");
    assert(Boolean(sample.NgayThu), "Cột 2: Ngày thu hợp lệ");
    assert(Boolean(sample.SoPhieuThu), "Cột 3: Số phiếu thu hợp lệ");
    assert(sample.DoiTuongNop !== undefined, "Cột 4: Đối tượng nộp tiền tồn tại");
    assert(sample.NoiDung !== undefined, "Cột 5: Nội dung thu tồn tại");
    assert(sample.ChungTuGoc !== undefined, "Cột 6: Chứng từ gốc kèm theo tồn tại");
    assert(sample.HinhThucThu === "Tiền mặt", "Cột 7: Hình thức thu là 'Tiền mặt'");
    assert(typeof sample.SoTien === "number" && sample.SoTien > 0, "Cột 8: Số tiền thu dương hợp lệ");

    // Không hiển thị ObjectId 24 hex
    const hasRawObjectId = /^[0-9a-fA-F]{24}$/.test(sample.SoPhieuThu);
    assert(!hasRawObjectId, "Mã phiếu thu chuẩn ký hiệu kế toán (PTxxx), không để lộ MongoDB ObjectId");

    // Kiểm tra tính đúng đắn của tổng cộng
    const sumCalc = cashRecJson.data.reduce((s, r) => s + Number(r.SoTien || 0), 0);
    assert(sumCalc === cashRecJson.totalAmount, `Tổng tiền khớp chính xác: sum=${sumCalc} === totalAmount=${cashRecJson.totalAmount}`);

    // Kiểm tra sắp xếp tăng dần theo ngày
    let isSortedAsc = true;
    for (let i = 1; i < cashRecJson.data.length; i++) {
      if (cashRecJson.data[i].NgayThu < cashRecJson.data[i - 1].NgayThu) {
        isSortedAsc = false;
        break;
      }
    }
    assert(isSortedAsc, "Dữ liệu thu tiền mặt được sắp xếp tăng dần theo ngày phát sinh (NgayThu: 1)");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. BÁO CÁO CHI TIỀN MẶT (/api/reports/cash-payments)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PHẦN 2] BÁO CÁO CHI TIỀN MẶT ĐỘC LẬP (MẪU 8 CỘT CHUẨN KẾ TOÁN)");
  const cashPayRes = await fetch(`${baseUrl}/reports/cash-payments`, { headers: authHeaders });
  assert(cashPayRes.status === 200, "API GET /api/reports/cash-payments trả về HTTP 200");
  const cashPayJson = await cashPayRes.json();

  assert(cashPayJson.report === "cash-payments", "Báo cáo xác định đúng type 'cash-payments'");
  assert(Array.isArray(cashPayJson.data), "Dữ liệu trả về mảng danh sách phiếu chi tiền mặt");
  assert(typeof cashPayJson.totalAmount === "number", "Có trường tổng số tiền chi (totalAmount)");
  assert(typeof cashPayJson.totalCount === "number", "Có trường tổng số lượng phiếu chi (totalCount)");

  // Kiểm tra tính tiền mặt 100%, không bị lẫn chuyển khoản
  const nonCashPays = cashPayJson.data.filter((p) => p.HinhThucChi && p.HinhThucChi !== "Tiền mặt");
  assert(nonCashPays.length === 0, "100% bản ghi là giao dịch chi TIỀN MẶT, đã loại trừ chuyển khoản");

  // Kiểm tra 8 cột dữ liệu chuẩn
  if (cashPayJson.data.length > 0) {
    const sample = cashPayJson.data[0];
    assert(sample.stt !== undefined, "Cột 1: STT tồn tại");
    assert(Boolean(sample.NgayChi), "Cột 2: Ngày chi hợp lệ");
    assert(Boolean(sample.SoPhieuChi), "Cột 3: Số phiếu chi hợp lệ");
    assert(sample.DoiTuongNhan !== undefined, "Cột 4: Đối tượng nhận tiền tồn tại");
    assert(sample.NoiDung !== undefined, "Cột 5: Nội dung chi tồn tại");
    assert(sample.ChungTuGoc !== undefined, "Cột 6: Chứng từ gốc kèm theo tồn tại");
    assert(sample.HinhThucChi === "Tiền mặt", "Cột 7: Hình thức chi là 'Tiền mặt'");
    assert(typeof sample.SoTien === "number" && sample.SoTien > 0, "Cột 8: Số tiền chi dương hợp lệ");

    const hasRawObjectId = /^[0-9a-fA-F]{24}$/.test(sample.SoPhieuChi);
    assert(!hasRawObjectId, "Mã phiếu chi chuẩn ký hiệu kế toán (PCxxx), không để lộ MongoDB ObjectId");

    const sumCalc = cashPayJson.data.reduce((s, p) => s + Number(p.SoTien || 0), 0);
    assert(sumCalc === cashPayJson.totalAmount, `Tổng tiền chi khớp chính xác: sum=${sumCalc} === totalAmount=${cashPayJson.totalAmount}`);

    let isSortedAsc = true;
    for (let i = 1; i < cashPayJson.data.length; i++) {
      if (cashPayJson.data[i].NgayChi < cashPayJson.data[i - 1].NgayChi) {
        isSortedAsc = false;
        break;
      }
    }
    assert(isSortedAsc, "Dữ liệu chi tiền mặt được sắp xếp tăng dần theo ngày phát sinh (NgayChi: 1)");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. BÁO CÁO NHẬP KHO (/api/reports/warehouse-receipts)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PHẦN 3] BÁO CÁO NHẬP KHO ĐỘC LẬP (MẪU 11 CỘT CHUẨN KẾ TOÁN)");
  const whRecRes = await fetch(`${baseUrl}/reports/warehouse-receipts`, { headers: authHeaders });
  assert(whRecRes.status === 200, "API GET /api/reports/warehouse-receipts trả về HTTP 200");
  const whRecJson = await whRecRes.json();

  assert(whRecJson.report === "warehouse-receipts", "Báo cáo xác định đúng type 'warehouse-receipts'");
  assert(Array.isArray(whRecJson.data), "Dữ liệu trả về mảng danh sách chi tiết hàng nhập");
  assert(typeof whRecJson.totalQuantity === "number", "Có trường tổng số lượng nhập (totalQuantity)");
  assert(typeof whRecJson.totalAmount === "number", "Có trường tổng thành tiền nhập (totalAmount)");
  assert(typeof whRecJson.totalCount === "number", "Có trường tổng số dòng nhập (totalCount)");

  if (whRecJson.data.length > 0) {
    const sample = whRecJson.data[0];
    assert(sample.stt !== undefined, "Cột 1: STT tồn tại");
    assert(Boolean(sample.NgayNhap), "Cột 2: Ngày nhập hợp lệ");
    assert(Boolean(sample.SoPhieuNhap), "Cột 3: Số phiếu nhập hợp lệ");
    assert(Boolean(sample.NhaCungCap), "Cột 4: Nhà cung cấp tồn tại");
    assert(Boolean(sample.MaSP), "Cột 5: Mã hàng tồn tại");
    assert(Boolean(sample.TenSP), "Cột 6: Tên hàng hóa tồn tại");
    assert(Boolean(sample.DonViTinh), "Cột 7: Đơn vị tính (ĐVT) tồn tại");
    assert(typeof sample.SoLuong === "number" && sample.SoLuong > 0, "Cột 8: Số lượng nhập > 0");
    assert(typeof sample.DonGia === "number" && sample.DonGia >= 0, "Cột 9: Đơn giá nhập >= 0");
    assert(typeof sample.ThanhTien === "number", "Cột 10: Thành tiền nhập hợp lệ");
    assert(sample.GhiChu !== undefined, "Cột 11: Ghi chú tồn tại");

    // Xác nhận không hiển thị ObjectId
    const hasRawObjectId = /^[0-9a-fA-F]{24}$/.test(sample.SoPhieuNhap) || /^[0-9a-fA-F]{24}$/.test(sample.MaSP);
    assert(!hasRawObjectId, "Mã phiếu nhập (PNxxx) và mã hàng (SPxxx) không để lộ ObjectId");

    // Xác nhận tổng cộng số lượng và thành tiền
    const sumQty = whRecJson.data.reduce((s, r) => s + Number(r.SoLuong || 0), 0);
    const sumAmt = whRecJson.data.reduce((s, r) => s + Number(r.ThanhTien || 0), 0);
    assert(sumQty === whRecJson.totalQuantity, `Tổng số lượng nhập khớp: sum=${sumQty} === totalQuantity=${whRecJson.totalQuantity}`);
    assert(sumAmt === whRecJson.totalAmount, `Tổng thành tiền nhập khớp: sum=${sumAmt} === totalAmount=${whRecJson.totalAmount}`);

    // Xác nhận sắp xếp tăng dần theo ngày
    let isSortedAsc = true;
    for (let i = 1; i < whRecJson.data.length; i++) {
      if (whRecJson.data[i].NgayNhap < whRecJson.data[i - 1].NgayNhap) {
        isSortedAsc = false;
        break;
      }
    }
    assert(isSortedAsc, "Dữ liệu nhập kho được sắp xếp tăng dần theo ngày nhập (NgayNhap: 1)");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. BÁO CÁO XUẤT KHO (/api/reports/warehouse-issues)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PHẦN 4] BÁO CÁO XUẤT KHO ĐỘC LẬP (MẪU 11 CỘT CHUẨN KẾ TOÁN)");
  const whIssRes = await fetch(`${baseUrl}/reports/warehouse-issues`, { headers: authHeaders });
  assert(whIssRes.status === 200, "API GET /api/reports/warehouse-issues trả về HTTP 200");
  const whIssJson = await whIssRes.json();

  assert(whIssJson.report === "warehouse-issues", "Báo cáo xác định đúng type 'warehouse-issues'");
  assert(Array.isArray(whIssJson.data), "Dữ liệu trả về mảng danh sách chi tiết hàng xuất");
  assert(typeof whIssJson.totalQuantity === "number", "Có trường tổng số lượng xuất (totalQuantity)");
  assert(typeof whIssJson.totalAmount === "number", "Có trường tổng thành tiền xuất theo giá vốn (totalAmount)");
  assert(typeof whIssJson.totalCount === "number", "Có trường tổng số dòng xuất (totalCount)");

  if (whIssJson.data.length > 0) {
    const sample = whIssJson.data[0];
    assert(sample.stt !== undefined, "Cột 1: STT tồn tại");
    assert(Boolean(sample.NgayXuat), "Cột 2: Ngày xuất hợp lệ");
    assert(Boolean(sample.SoPhieuXuat), "Cột 3: Số phiếu xuất hợp lệ");
    assert(Boolean(sample.DoiTuongNhan), "Cột 4: Đối tượng nhận hàng tồn tại");
    assert(Boolean(sample.MaSP), "Cột 5: Mã hàng tồn tại");
    assert(Boolean(sample.TenSP), "Cột 6: Tên hàng hóa tồn tại");
    assert(Boolean(sample.DonViTinh), "Cột 7: Đơn vị tính (ĐVT) tồn tại");
    assert(typeof sample.SoLuong === "number" && sample.SoLuong > 0, "Cột 8: Số lượng xuất > 0");
    assert(typeof sample.DonGia === "number" && sample.DonGia >= 0, "Cột 9: Đơn giá vốn xuất >= 0");
    assert(typeof sample.ThanhTien === "number", "Cột 10: Thành tiền xuất (giá vốn) hợp lệ");
    assert(sample.LyDoXuat !== undefined, "Cột 11: Lý do xuất tồn tại");

    // Xác nhận không hiển thị ObjectId
    const hasRawObjectId = /^[0-9a-fA-F]{24}$/.test(sample.SoPhieuXuat) || /^[0-9a-fA-F]{24}$/.test(sample.MaSP);
    assert(!hasRawObjectId, "Mã phiếu xuất (PXxxx) và mã hàng (SPxxx) không để lộ ObjectId");

    // Xác nhận tổng cộng số lượng và thành tiền
    const sumQty = whIssJson.data.reduce((s, i) => s + Number(i.SoLuong || 0), 0);
    const sumAmt = whIssJson.data.reduce((s, i) => s + Number(i.ThanhTien || 0), 0);
    assert(sumQty === whIssJson.totalQuantity, `Tổng số lượng xuất khớp: sum=${sumQty} === totalQuantity=${whIssJson.totalQuantity}`);
    assert(sumAmt === whIssJson.totalAmount, `Tổng thành tiền xuất khớp: sum=${sumAmt} === totalAmount=${whIssJson.totalAmount}`);

    // Xác nhận sắp xếp tăng dần theo ngày
    let isSortedAsc = true;
    for (let i = 1; i < whIssJson.data.length; i++) {
      if (whIssJson.data[i].NgayXuat < whIssJson.data[i - 1].NgayXuat) {
        isSortedAsc = false;
        break;
      }
    }
    assert(isSortedAsc, "Dữ liệu xuất kho được sắp xếp tăng dần theo ngày xuất (NgayXuat: 1)");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. KIỂM THỬ MẪU IN CHUẨN A4 CHO CẢ 4 BÁO CÁO
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PHẦN 5] KIỂM THỬ CẤU TRÚC HTML MẪU IN A4 CỦA 4 BÁO CÁO");

  // 5.1 In Thu tiền mặt
  const cashRecHtml = buildCashReceiptsHtml({
    receipts: cashRecJson.data.slice(0, 3),
    totalAmount: cashRecJson.totalAmount,
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
  });
  assert(cashRecHtml.includes("BÁO CÁO THU TIỀN MẶT"), "Mẫu in thu tiền mặt có tiêu đề 'BÁO CÁO THU TIỀN MẶT'");
  assert(cashRecHtml.includes("Người lập biểu") && cashRecHtml.includes("Kế toán trưởng") && cashRecHtml.includes("Giám đốc"), "Mẫu in thu tiền mặt có đủ 3 chữ ký: Người lập, KTT, Giám đốc");
  assert(cashRecHtml.includes("Số tiền viết bằng chữ:"), "Mẫu in thu tiền mặt có dòng số tiền viết bằng chữ");

  // 5.2 In Chi tiền mặt
  const cashPayHtml = buildCashPaymentsHtml({
    payments: cashPayJson.data.slice(0, 3),
    totalAmount: cashPayJson.totalAmount,
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
  });
  assert(cashPayHtml.includes("BÁO CÁO CHI TIỀN MẶT"), "Mẫu in chi tiền mặt có tiêu đề 'BÁO CÁO CHI TIỀN MẶT'");
  assert(cashPayHtml.includes("Người lập biểu") && cashPayHtml.includes("Kế toán trưởng") && cashPayHtml.includes("Giám đốc"), "Mẫu in chi tiền mặt có đủ 3 chữ ký: Người lập, KTT, Giám đốc");
  assert(cashPayHtml.includes("Số tiền viết bằng chữ:"), "Mẫu in chi tiền mặt có dòng số tiền viết bằng chữ");

  // 5.3 In Nhập kho (11 cột A4 Landscape)
  const whRecHtml = buildWarehouseReceiptsHtml({
    receipts: whRecJson.data.slice(0, 3),
    totalQuantity: whRecJson.totalQuantity,
    totalAmount: whRecJson.totalAmount,
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
  });
  assert(whRecHtml.includes("BÁO CÁO NHẬP KHO"), "Mẫu in nhập kho có tiêu đề 'BÁO CÁO NHẬP KHO'");
  assert(whRecHtml.includes("page-landscape"), "Mẫu in nhập kho 11 cột thiết lập khổ A4 Landscape");
  assert(whRecHtml.includes("Nhà cung cấp") && whRecHtml.includes("Đơn giá") && whRecHtml.includes("Thành tiền"), "Mẫu in nhập kho có đủ các cột chuẩn kế toán");
  assert(whRecHtml.includes("Người lập biểu") && whRecHtml.includes("Kế toán trưởng") && whRecHtml.includes("Giám đốc"), "Mẫu in nhập kho có đủ 3 chữ ký: Người lập, KTT, Giám đốc");
  assert(whRecHtml.includes("Số tiền viết bằng chữ:"), "Mẫu in nhập kho có dòng số tiền viết bằng chữ");

  // 5.4 In Xuất kho (11 cột A4 Landscape)
  const whIssHtml = buildWarehouseIssuesHtml({
    issues: whIssJson.data.slice(0, 3),
    totalQuantity: whIssJson.totalQuantity,
    totalAmount: whIssJson.totalAmount,
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
  });
  assert(whIssHtml.includes("BÁO CÁO XUẤT KHO"), "Mẫu in xuất kho có tiêu đề 'BÁO CÁO XUẤT KHO'");
  assert(whIssHtml.includes("page-landscape"), "Mẫu in xuất kho 11 cột thiết lập khổ A4 Landscape");
  assert(whIssHtml.includes("Đối tượng nhận hàng") && whIssHtml.includes("Đơn giá vốn") && whIssHtml.includes("Lý do xuất"), "Mẫu in xuất kho có đủ các cột chuẩn kế toán và giá vốn");
  assert(whIssHtml.includes("Người lập biểu") && whIssHtml.includes("Kế toán trưởng") && whIssHtml.includes("Giám đốc"), "Mẫu in xuất kho có đủ 3 chữ ký: Người lập, KTT, Giám đốc");
  assert(whIssHtml.includes("Số tiền viết bằng chữ:"), "Mẫu in xuất kho có dòng số tiền viết bằng chữ");

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. KIỂM THỬ HỒI QUY CÁC BÁO CÁO HIỆN HỮU (DOANH THU, TỒN KHO, CÔNG NỢ)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n[PHẦN 6] KIỂM THỬ HỒI QUY CÁC BÁO CÁO DOANH THU, TỒN KHO, CÔNG NỢ HIỆN CÓ");
  const [revRes, invRes, debtRes] = await Promise.all([
    fetch(`${baseUrl}/reports/revenue`, { headers: authHeaders }),
    fetch(`${baseUrl}/reports/inventory`, { headers: authHeaders }),
    fetch(`${baseUrl}/reports/debts`, { headers: authHeaders }),
  ]);
  assert(revRes.status === 200, "Báo cáo Doanh thu (/api/reports/revenue) hoạt động tốt (200)");
  assert(invRes.status === 200, "Báo cáo Tồn kho (/api/reports/inventory) hoạt động tốt (200)");
  assert(debtRes.status === 200, "Báo cáo Công nợ (/api/reports/debts) hoạt động tốt (200)");

  console.log("\n===============================================================================");
  console.log(`KẾT QUẢ KIỂM TOÁN: ${totalPassed} PASSED / ${totalFailed} FAILED`);
  console.log("===============================================================================\n");

  server.close();
  process.exit(totalFailed > 0 ? 1 : 0);
}

runFourReportsAudit().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
