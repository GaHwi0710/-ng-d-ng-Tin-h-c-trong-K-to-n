import "../backend/node_modules/dotenv/config.js";
import { ObjectId } from "../backend/node_modules/mongodb/lib/index.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

async function runTestThreeIssues() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log("\n=======================================================");
  console.log("TESTING 3 FIXES: PRODUCT VALIDATION, DEBT RECEIPT CODE, AUTO PHIEU CHI");
  console.log(`Server running at ${baseUrl}`);
  console.log("=======================================================\n");

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

  // 1. Login as Admin
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.data?.token;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // -------------------------------------------------------------------------
  // ISSUE 1: Bắt buộc nhập GiaNhap và GiaBan > 0
  // -------------------------------------------------------------------------
  console.log("\n[TEST ISSUE 1] THÊM SẢN PHẨM - BẮT BUỘC GIÁ NHẬP & GIÁ BÁN > 0");

  const sampleCat = await db.collection("LoaiHang").findOne({});
  const catId = sampleCat?._id?.toString() || sampleCat?.id;

  // 1.1 Thiếu GiaNhap
  const noGiaNhapRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenSP: "Test Sữa Thiếu Giá Nhập",
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaBan: 250000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  assert(noGiaNhapRes.status === 400, "Tạo SP thiếu GiaNhap bị từ chối với HTTP 400");
  const noGiaNhapJson = await noGiaNhapRes.json();
  assert(noGiaNhapJson.message && noGiaNhapJson.message.includes("Giá nhập là bắt buộc"), `Thông báo lỗi rõ ràng: "${noGiaNhapJson.message}"`);

  // 1.2 Thiếu GiaBan
  const noGiaBanRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenSP: "Test Sữa Thiếu Giá Bán",
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: 200000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  assert(noGiaBanRes.status === 400, "Tạo SP thiếu GiaBan bị từ chối với HTTP 400");
  const noGiaBanJson = await noGiaBanRes.json();
  assert(noGiaBanJson.message && noGiaBanJson.message.includes("Giá bán là bắt buộc"), `Thông báo lỗi rõ ràng: "${noGiaBanJson.message}"`);

  // 1.3 GiaNhap = 0
  const zeroGiaNhapRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenSP: "Test Sữa Giá Nhập Bằng 0",
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: 0,
      GiaBan: 250000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  assert(zeroGiaNhapRes.status === 400, "Tạo SP với GiaNhap = 0 bị từ chối với HTTP 400");
  const zeroGiaNhapJson = await zeroGiaNhapRes.json();
  assert(zeroGiaNhapJson.message && zeroGiaNhapJson.message.includes("lớn hơn 0"), `Thông báo lỗi GiaNhap > 0: "${zeroGiaNhapJson.message}"`);

  // 1.4 GiaBan = 0
  const zeroGiaBanRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenSP: "Test Sữa Giá Bán Bằng 0",
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: 200000,
      GiaBan: 0,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  assert(zeroGiaBanRes.status === 400, "Tạo SP với GiaBan = 0 bị từ chối với HTTP 400");
  const zeroGiaBanJson = await zeroGiaBanRes.json();
  assert(zeroGiaBanJson.message && zeroGiaBanJson.message.includes("lớn hơn 0"), `Thông báo lỗi GiaBan > 0: "${zeroGiaBanJson.message}"`);

  // 1.5 Giá âm
  const negPriceRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenSP: "Test Sữa Giá Âm",
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: -50000,
      GiaBan: 100000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  assert(negPriceRes.status === 400, "Tạo SP với giá âm bị từ chối với HTTP 400");

  // 1.6 Giá hợp lệ (> 0) -> Tạo thành công và lưu chính xác vào MongoDB
  const validProdRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenSP: "Sữa Bột Friso Gold Test Hợp Lệ",
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: 450000,
      GiaBan: 560000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  assert(validProdRes.status === 201, "Tạo SP với giá hợp lệ thành công với HTTP 201");
  const validProdData = await validProdRes.json();
  const createdProdId = validProdData.data?.id || validProdData.data?._id;

  const dbProd = await db.collection("SanPham").findOne({ _id: new ObjectId(createdProdId) });
  assert(dbProd !== null, "Sản phẩm mới đã được lưu vào MongoDB");
  assert(dbProd?.GiaNhap === 450000, `GiaNhap lưu chính xác trong MongoDB (450,000 đ)`);
  assert(dbProd?.GiaBan === 560000, `GiaBan lưu chính xác trong MongoDB (560,000 đ)`);

  // Dọn dẹp SP test
  await db.collection("SanPham").deleteOne({ _id: new ObjectId(createdProdId) });
  await db.collection("TonKho").deleteOne({ MaSP: new ObjectId(createdProdId) });

  // -------------------------------------------------------------------------
  // ISSUE 2: HIỂN THỊ MÃ PHIẾU NHẬP THAY VÌ MONGODB OBJECTID
  // -------------------------------------------------------------------------
  console.log("\n[TEST ISSUE 2] CÔNG NỢ NCC - HIỂN THỊ MÃ PHIẾU NHẬP THAY VÌ OBJECTID");

  const debtsRes = await fetch(`${baseUrl}/debts`, { headers: authHeaders });
  assert(debtsRes.status === 200, "GET /api/debts trả về HTTP 200");
  const debtsJson = await debtsRes.json();
  const debtList = debtsJson.data || [];

  const supplierDebts = debtList.filter(d => d.LoaiCongNo === "Nhà cung cấp");
  assert(supplierDebts.length > 0, `Tìm thấy ${supplierDebts.length} khoản công nợ nhà cung cấp`);

  let checkedWithPN = 0;
  let checkedWithoutPN = 0;
  let objectIdFoundInReceipt = 0;

  for (const d of supplierDebts) {
    const code = d.MaPhieuNhap || d.MaPNCode;
    if (d.MaPN) {
      // Có liên kết MaPN
      if (/^[0-9a-fA-F]{24}$/.test(String(code))) {
        objectIdFoundInReceipt++;
      }
      if (code && code.startsWith("PN")) {
        checkedWithPN++;
      } else if (code === "Không xác định") {
        checkedWithoutPN++;
      }
    }
  }

  assert(objectIdFoundInReceipt === 0, "Không còn bất kỳ MongoDB ObjectId thô nào hiển thị tại cột Phiếu nhập kho!");
  assert(checkedWithPN > 0, `Có ít nhất ${checkedWithPN} công nợ hiển thị mã phiếu nhập chuẩn (ví dụ PN008)`);

  // Kiểm tra chi tiết 1 công nợ có liên kết phiếu nhập
  const sampleDebtWithPN = supplierDebts.find(d => d.MaPN && d.MaPhieuNhap?.startsWith("PN"));
  if (sampleDebtWithPN) {
    const detailRes = await fetch(`${baseUrl}/debts/${sampleDebtWithPN.id}`, { headers: authHeaders });
    assert(detailRes.status === 200, "GET /api/debts/:id trả về HTTP 200");
    const detailJson = await detailRes.json();
    assert(detailJson.data?.MaPhieuNhap === sampleDebtWithPN.MaPhieuNhap, `Chi tiết công nợ hiển thị đúng MaPhieuNhap: ${detailJson.data?.MaPhieuNhap}`);
    assert(detailJson.data?.MaPN !== detailJson.data?.MaPhieuNhap, `Khóa ngoại MaPN gốc (${detailJson.data?.MaPN}) vẫn được bảo toàn nguyên vẹn`);
  }

  // -------------------------------------------------------------------------
  // ISSUE 3: TỰ ĐỘNG TẠO PHIẾU CHI KHI TRẢ NỢ (TIỀN MẶT & CHUYỂN KHOẢN)
  // -------------------------------------------------------------------------
  console.log("\n[TEST ISSUE 3] CÔNG NỢ NCC - TỰ ĐỘNG LẬP PHIẾU CHI (TIỀN MẶT & CHUYỂN KHOẢN)");

  // 3.1 Tạo NCC test và đơn công nợ test
  const testSuppRes = await fetch(`${baseUrl}/suppliers`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      TenNCC: "NCC Thử Nghiệm Thanh Toán Độc Lập",
      SDT: "0987654321",
      DiaChi: "Hà Nội",
      TrangThai: "Đang hoạt động",
    }),
  });
  const testSuppData = await testSuppRes.json();
  const testSuppId = testSuppData.data?.id;

  // Giả lập 1 phiếu nhập kho và công nợ 3,000,000 đ
  await db.collection("PhieuNhap").deleteMany({ MaPN: "PN-TEST-999" });
  await db.collection("CongNo").deleteMany({ MaCN: "CN-TEST-999" });
  await db.collection("PhieuChi").deleteMany({ ChungTuGoc: "PN-TEST-999" });
  await db.collection("ThanhToan").deleteMany({ ChungTuGoc: "PN-TEST-999" });

  const testPNId = new ObjectId();
  await db.collection("PhieuNhap").insertOne({
    _id: testPNId,
    MaPN: "PN-TEST-999",
    MaNCC: new ObjectId(testSuppId),
    TongTien: 3000000,
    SoTienDaTra: 0,
    SoTienConLai: 3000000,
    TrangThai: "Còn nợ",
    createdAt: new Date(),
  });

  const testDebtId = new ObjectId();
  await db.collection("CongNo").insertOne({
    _id: testDebtId,
    MaCN: "CN-TEST-999",
    MaNCC: new ObjectId(testSuppId),
    MaPN: testPNId,
    LoaiCongNo: "Nhà cung cấp",
    partnerName: "NCC Thử Nghiệm Thanh Toán Độc Lập",
    TenNCC: "NCC Thử Nghiệm Thanh Toán Độc Lập",
    SoTien: 3000000,
    SoTienDaTra: 0,
    SoTienConLai: 3000000,
    TrangThai: "Còn nợ",
    createdAt: new Date(),
  });

  // 3.2 Thanh toán đợt 1: 1,000,000 đ bằng TIỀN MẶT
  const reqId1 = `REQ-PAY-CASH-${Date.now()}`;
  const payCashRes = await fetch(`${baseUrl}/debts/${testDebtId}/pay`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      amount: 1000000,
      method: "Tiền mặt",
      requestId: reqId1,
      note: "Trả nợ NCC đợt 1 bằng Tiền mặt",
    }),
  });
  assert(payCashRes.status === 200, "Thanh toán công nợ bằng TIỀN MẶT thành công với HTTP 200");
  const payCashJson = await payCashRes.json();
  assert(payCashJson.MaPC !== null && payCashJson.MaPC.startsWith("PC"), `API trả về mã phiếu chi tự động: ${payCashJson.MaPC}`);
  assert(payCashJson.data?.SoTienDaTra === 1000000, "Số tiền đã trả cập nhật: 1,000,000 đ");
  assert(payCashJson.data?.SoTienConLai === 2000000, "Số tiền còn lại cập nhật: 2,000,000 đ");
  assert(payCashJson.data?.TrangThai === "Còn nợ", "Trạng thái công nợ: Còn nợ");

  // Kiểm tra PhieuChi trong MongoDB
  const pcCash = await db.collection("PhieuChi").findOne({ MaPC: payCashJson.MaPC });
  assert(pcCash !== null, "Bản ghi PhieuChi tiền mặt tồn tại trong MongoDB");
  assert(Number(pcCash?.SoTien) === 1000000, "PhieuChi tiền mặt ghi nhận đúng số tiền 1,000,000 đ");
  assert(pcCash?.PhuongThuc === "Tiền mặt", "PhieuChi ghi nhận phương thức Tiền mặt");
  assert(pcCash?.ChungTuGoc === "PN-TEST-999", "PhieuChi tham chiếu đúng chứng từ gốc PN-TEST-999");
  assert(pcCash?.NguoiNhanTien === "NCC Thử Nghiệm Thanh Toán Độc Lập", "PhieuChi ghi nhận đúng đối tượng nhận tiền");

  // 3.3 Gửi lại request lặp lại (idempotency check) với cùng requestId
  const repeatRes = await fetch(`${baseUrl}/debts/${testDebtId}/pay`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      amount: 1000000,
      method: "Tiền mặt",
      requestId: reqId1,
      note: "Trả nợ NCC đợt 1 bằng Tiền mặt (repeat)",
    }),
  });
  assert(repeatRes.status === 200, "Gửi lại request thanh toán trả về HTTP 200");
  const repeatJson = await repeatRes.json();
  assert(repeatJson.duplicate === true, "Hệ thống phát hiện duplicate request");
  assert(repeatJson.MaPC === payCashJson.MaPC, "Không tạo thêm phiếu chi mới, trả về phiếu chi cũ");

  // Đếm số lượng PhieuChi cho debt này
  const pcCountAfterRepeat = await db.collection("PhieuChi").countDocuments({ MaCN: testDebtId });
  assert(pcCountAfterRepeat === 1, `Không bị tạo trùng PhieuChi trong DB (số lượng: ${pcCountAfterRepeat})`);

  // 3.4 Thanh toán đợt 2: 2,000,000 đ bằng CHUYỂN KHOẢN (Tất toán)
  const reqId2 = `REQ-PAY-TRANSFER-${Date.now()}`;
  const payTransferRes = await fetch(`${baseUrl}/debts/${testDebtId}/pay`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      amount: 2000000,
      method: "Chuyển khoản",
      requestId: reqId2,
      note: "Trả nợ NCC đợt 2 bằng Chuyển khoản tất toán",
    }),
  });
  assert(payTransferRes.status === 200, "Thanh toán công nợ bằng CHUYỂN KHOẢN thành công với HTTP 200");
  const payTransferJson = await payTransferRes.json();
  assert(payTransferJson.MaPC !== null && payTransferJson.MaPC.startsWith("PC"), `Chuyển khoản TỰ ĐỘNG LẬP PHIẾU CHI: ${payTransferJson.MaPC}`);
  assert(payTransferJson.data?.SoTienDaTra === 3000000, "Số tiền đã trả cập nhật: 3,000,000 đ");
  assert(payTransferJson.data?.SoTienConLai === 0, "Số tiền còn lại cập nhật: 0 đ");
  assert(payTransferJson.data?.TrangThai === "Đã thanh toán", "Công nợ chuyển trạng thái 'Đã thanh toán'");

  // Kiểm tra PhieuChi chuyển khoản trong MongoDB
  const pcTransfer = await db.collection("PhieuChi").findOne({ MaPC: payTransferJson.MaPC });
  assert(pcTransfer !== null, "Bản ghi PhieuChi chuyển khoản tồn tại trong MongoDB");
  assert(Number(pcTransfer?.SoTien) === 2000000, "PhieuChi chuyển khoản ghi nhận đúng số tiền 2,000,000 đ");
  assert(pcTransfer?.PhuongThuc === "Chuyển khoản", "PhieuChi ghi nhận phương thức Chuyển khoản");
  assert(pcTransfer?.MaCN.toString() === testDebtId.toString(), "PhieuChi liên kết chính xác mã công nợ");

  // Kiểm tra PhieuNhap liên kết đã chuyển trạng thái
  const updatedPN = await db.collection("PhieuNhap").findOne({ _id: testPNId });
  assert(updatedPN?.TrangThai === "Đã thanh toán", "Phiếu nhập kho liên kết tự động chuyển trạng thái 'Đã thanh toán'");
  assert(updatedPN?.SoTienConLai === 0, "Phiếu nhập kho liên kết số tiền còn lại là 0");

  // 3.5 Cố tình thanh toán vượt quá số nợ còn lại
  const overpayRes = await fetch(`${baseUrl}/debts/${testDebtId}/pay`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      amount: 500000,
      method: "Tiền mặt",
    }),
  });
  assert(overpayRes.status === 400, "Thanh toán vượt nợ bị từ chối với HTTP 400");
  const overpayJson = await overpayRes.json();
  assert(overpayJson.message && overpayJson.message.includes("vượt số còn nợ"), `Thông báo từ chối vượt nợ: "${overpayJson.message}"`);

  // 3.6 Dọn dẹp dữ liệu thử nghiệm an toàn
  await db.collection("CongNo").deleteOne({ _id: testDebtId });
  await db.collection("PhieuNhap").deleteOne({ _id: testPNId });
  await db.collection("PhieuChi").deleteMany({ MaCN: testDebtId });
  await db.collection("ThanhToan").deleteMany({ MaCN: testDebtId });
  await db.collection("NhaCungCap").deleteOne({ _id: new ObjectId(testSuppId) });
  console.log("  -> Dọn dẹp dữ liệu kiểm thử an toàn hoàn tất.");

  console.log("\n=======================================================");
  console.log(`TEST KẾT THÚC: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("=======================================================\n");

  server.close();
  process.exit(totalFailed > 0 ? 1 : 0);
}

runTestThreeIssues().catch(err => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
