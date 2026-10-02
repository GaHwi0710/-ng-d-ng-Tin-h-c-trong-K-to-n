import "../backend/node_modules/dotenv/config.js";
import { ObjectId } from "../backend/node_modules/mongodb/lib/index.js";
import app from "../backend/src/app.js";
import { connectToMongoDB, getDatabase } from "../backend/src/config/mongodb.js";

async function runMasterAccountingAudit() {
  await connectToMongoDB();
  const db = getDatabase();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  console.log("\n=======================================================");
  console.log("MASTER ACCOUNTING AUDIT: SCENARIOS A THROUGH G");
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

  // 1. Authenticate Actors
  const login = async (u, p) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json();
    return data.token || data.data?.token;
  };

  const adminToken = await login("admin", "admin123");
  const muahangToken = await login("muahang", "muahang123");
  const thukhoToken = await login("vanhung", "vanhung123");
  const ketoanToken = await login("ketoan", "ketoan123");

  const adminHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` };
  const muahangHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${muahangToken}` };
  const thukhoHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${thukhoToken}` };
  const ketoanHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${ketoanToken}` };

  const testSuffix = Date.now();

  // Create isolated test supplier and product
  const suppRes = await fetch(`${baseUrl}/suppliers`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      TenNCC: `NCC Kiểm Toán Kế Toán ${testSuffix}`,
      SDT: "0912345678",
      DiaChi: "Hà Nội",
      TrangThai: "Đang hoạt động",
    }),
  });
  const suppData = await suppRes.json();
  const testSuppId = suppData.data?.id || suppData.data?._id;

  const cat = await db.collection("LoaiHang").findOne({});
  const catId = cat?._id?.toString() || cat?.id;

  // Sản phẩm 1: Đơn giá nhập 100,000 đ
  const prodRes = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      TenSP: `Sản Phẩm Kiểm Toán ${testSuffix}`,
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: 100000,
      GiaBan: 150000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  const prodData = await prodRes.json();
  const testProdId = prodData.data?.id || prodData.data?._id;

  // Check initial stock
  const initStockDoc = await db.collection("TonKho").findOne({ MaSP: new ObjectId(testProdId) });
  const initStock = Number(initStockDoc?.SoLuongTon || 0);
  assert(initStock === 0, "Tồn kho ban đầu của sản phẩm kiểm toán bằng 0");

  // -------------------------------------------------------------------------
  // KỊCH BẢN A: MUA HÀNG TRẢ SAU (PO 10.000.000 -> NHẬP ĐỦ -> CHƯA THANH TOÁN)
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO A] MUA HÀNG TRẢ SAU: PO 10.000.000 Đ -> NHẬP ĐỦ -> CHƯA THANH TOÁN ---");
  // 1. Tạo đơn đặt hàng 100 sản phẩm x 100.000 đ = 10.000.000 đ
  const po1Res = await fetch(`${baseUrl}/purchase-orders`, {
    method: "POST",
    headers: muahangHeaders,
    body: JSON.stringify({
      supplierId: testSuppId,
      MaNCC: testSuppId,
      NgayDat: "2026-10-01",
      items: [{ productId: testProdId, quantity: 100, price: 100000 }],
    }),
  });
  const po1Text = await po1Res.text();
  let po1Data = {};
  try { po1Data = JSON.parse(po1Text); } catch { console.error("PO1 Parse err:", po1Text); }
  if (po1Res.status !== 201) console.error("  ❌ PO1 FAIL BODY:", po1Text);
  assert(po1Res.status === 201, "Tạo đơn đặt hàng PO1 10.000.000 đ thành công (HTTP 201)");
  const po1Id = po1Data.data?.id || po1Data.data?._id;

  // Kiểm tra tồn kho chưa đổi sau khi tạo PO
  const stockAfterPO1 = await db.collection("TonKho").findOne({ MaSP: new ObjectId(testProdId) });
  assert(Number(stockAfterPO1?.SoLuongTon || 0) === 0, "Tạo đơn đặt hàng KHÔNG tự động tăng tồn kho (Vẫn là 0)");

  // 2. Nhập kho đủ 100 sản phẩm (Chưa trả tiền: paidAmount = 0)
  const countPCTruocA = await db.collection("PhieuChi").countDocuments();
  const gr1Res = await fetch(`${baseUrl}/goods-receipts`, {
    method: "POST",
    headers: thukhoHeaders,
    body: JSON.stringify({
      purchaseOrderId: po1Id,
      supplierId: testSuppId,
      NgayNhap: "2026-10-01",
      paidAmount: 0,
      Kho: "Kho chính",
      items: [{ productId: testProdId, quantity: 100, price: 100000 }],
    }),
  });
  const gr1Text = await gr1Res.text();
  let gr1Data = {};
  try { gr1Data = JSON.parse(gr1Text); } catch { console.error("GR1 Parse err:", gr1Text); }
  if (gr1Res.status !== 201) console.error("  ❌ GR1 FAIL BODY:", gr1Text);
  assert(gr1Res.status === 201, "Nhập kho đủ 100 sản phẩm thành công (HTTP 201)");
  const pn1Id = gr1Data.data?.id || gr1Data.data?._id;

  // Kiểm tra Tồn kho tăng chính xác lên 100
  const stockAfterGR1 = await db.collection("TonKho").findOne({ MaSP: new ObjectId(testProdId) });
  assert(Number(stockAfterGR1?.SoLuongTon || 0) === 100, "Tồn kho tăng chính xác từ 0 lên 100 sản phẩm");

  // Kiểm tra Công nợ NCC tăng đúng 10.000.000 đ
  const debtA = await db.collection("CongNo").findOne({ MaPN: new ObjectId(pn1Id) });
  assert(debtA !== null, "Đã ghi nhận bản ghi Công nợ NCC");
  assert(debtA?.LoaiCongNo === "Nhà cung cấp", "Loại công nợ là 'Nhà cung cấp'");
  assert(debtA?.SoTien === 10000000, "Tổng giá trị công nợ là 10.000.000 đ");
  assert(debtA?.SoTienDaTra === 0, "Số tiền đã trả là 0 đ");
  assert(debtA?.SoTienConLai === 10000000, "Số tiền còn nợ là 10.000.000 đ");
  assert(debtA?.TrangThai === "Còn nợ", "Trạng thái công nợ: 'Còn nợ'");

  // Kiểm tra Quỹ tiền mặt và ngân hàng KHÔNG bị ảnh hưởng (Chưa xuất tiền)
  const countPCSauA = await db.collection("PhieuChi").countDocuments();
  assert(countPCSauA === countPCTruocA, "Không có Phiếu chi nào được tạo khi mua hàng trả sau");

  // -------------------------------------------------------------------------
  // KỊCH BẢN B: THANH TOÁN MỘT PHẦN 4.000.000 Đ BẰNG TIỀN MẶT
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO B] THANH TOÁN MỘT PHẦN 4.000.000 Đ BẰNG TIỀN MẶT ---");
  const payBRes = await fetch(`${baseUrl}/debts/${debtA._id}/pay`, {
    method: "POST",
    headers: ketoanHeaders,
    body: JSON.stringify({
      amount: 4000000,
      method: "Tiền mặt",
      requestId: `REQ-B-${testSuffix}`,
      note: "Thanh toán đợt 1 tiền mặt 4 triệu",
    }),
  });
  assert(payBRes.status === 200, "Thanh toán đợt 1 thành công (HTTP 200)");
  const payBData = await payBRes.json();
  const maPCB = payBData.MaPC;
  assert(maPCB !== null && maPCB.startsWith("PC"), `Hệ thống tự động sinh Phiếu chi tiền mặt: ${maPCB}`);

  // Kiểm tra PhieuChi trong DB
  const pcDocB = await db.collection("PhieuChi").findOne({ MaPC: maPCB });
  assert(pcDocB !== null, "Bản ghi Phiếu chi tiền mặt tồn tại trong DB");
  assert(pcDocB?.SoTien === 4000000, "Phiếu chi ghi nhận đúng số tiền 4.000.000 đ");
  assert(pcDocB?.PhuongThuc === "Tiền mặt", "Phương thức chi: Tiền mặt");
  assert(pcDocB?.ChungTuGoc === gr1Data.data?.MaPN, "Phiếu chi tham chiếu đúng mã Phiếu nhập gốc");

  // Kiểm tra Công nợ còn 6.000.000 đ
  const debtB = await db.collection("CongNo").findOne({ _id: debtA._id });
  assert(debtB?.SoTienDaTra === 4000000, "Số tiền đã trả cập nhật thành 4.000.000 đ");
  assert(debtB?.SoTienConLai === 6000000, "Số tiền còn nợ cập nhật thành 6.000.000 đ");
  assert(debtB?.TrangThai === "Còn nợ", "Trạng thái công nợ vẫn là 'Còn nợ'");

  // Kiểm tra Phiếu nhập gốc giữ nguyên giá trị 10.000.000 đ
  const pnAfterB = await db.collection("PhieuNhap").findOne({ _id: new ObjectId(pn1Id) });
  assert(pnAfterB?.TongTien === 10000000, "Phiếu nhập gốc giữ nguyên tổng tiền 10.000.000 đ");
  assert(pnAfterB?.SoTienDaTra === 4000000, "Phiếu nhập cập nhật số tiền đã trả 4.000.000 đ");
  assert(pnAfterB?.SoTienConLai === 6000000, "Phiếu nhập cập nhật số tiền còn lại 6.000.000 đ");

  // -------------------------------------------------------------------------
  // KỊCH BẢN C: THANH TOÁN TIẾP 2.000.000 Đ BẰNG CHUYỂN KHOẢN NGÂN HÀNG
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO C] THANH TOÁN TIẾP 2.000.000 Đ BẰNG CHUYỂN KHOẢN ---");
  const payCRes = await fetch(`${baseUrl}/debts/${debtA._id}/pay`, {
    method: "POST",
    headers: ketoanHeaders,
    body: JSON.stringify({
      amount: 2000000,
      method: "Chuyển khoản",
      requestId: `REQ-C-${testSuffix}`,
      note: "Thanh toán đợt 2 chuyển khoản 2 triệu",
    }),
  });
  assert(payCRes.status === 200, "Thanh toán đợt 2 chuyển khoản thành công (HTTP 200)");
  const payCData = await payCRes.json();
  const maPCC = payCData.MaPC;
  assert(maPCC !== null && maPCC.startsWith("PC"), `Chuyển khoản tự động sinh chứng từ chi: ${maPCC}`);

  // Kiểm tra PhieuChi chuyển khoản trong DB
  const pcDocC = await db.collection("PhieuChi").findOne({ MaPC: maPCC });
  assert(pcDocC !== null, "Bản ghi Phiếu chi chuyển khoản ngân hàng tồn tại trong DB");
  assert(pcDocC?.SoTien === 2000000, "Phiếu chi ghi nhận đúng số tiền 2.000.000 đ");
  assert(pcDocC?.PhuongThuc === "Chuyển khoản", "Phương thức chi ghi nhận đúng: Chuyển khoản");

  // Kiểm tra nhật ký ThanhToan ghi nhận đúng
  const ttDocC = await db.collection("ThanhToan").findOne({ MaTT: payCData.payment?.MaTT });
  assert(ttDocC !== null, "Nhật ký thanh toán ThanhToan được ghi nhận");
  assert(ttDocC?.PhuongThuc === "Chuyển khoản", "Phương thức thanh toán trong sổ: Chuyển khoản");
  assert(ttDocC?.SoTien === 2000000, "Số tiền thanh toán: 2.000.000 đ");

  // Kiểm tra Công nợ còn 4.000.000 đ
  const debtC = await db.collection("CongNo").findOne({ _id: debtA._id });
  assert(debtC?.SoTienDaTra === 6000000, "Số tiền đã trả lũy kế: 6.000.000 đ");
  assert(debtC?.SoTienConLai === 4000000, "Số tiền còn nợ: 4.000.000 đ");

  // -------------------------------------------------------------------------
  // KỊCH BẢN D: THANH TOÁN HẾT 4.000.000 Đ CÒN LẠI & CHỐNG DUPLICATE
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO D] THANH TOÁN HẾT 4.000.000 Đ & CHỐNG TRÙNG LẶP ---");
  const reqIdD = `REQ-D-${testSuffix}`;
  const payDRes = await fetch(`${baseUrl}/debts/${debtA._id}/pay`, {
    method: "POST",
    headers: ketoanHeaders,
    body: JSON.stringify({
      amount: 4000000,
      method: "Chuyển khoản",
      requestId: reqIdD,
      note: "Thanh toán tất toán nợ 4 triệu",
    }),
  });
  assert(payDRes.status === 200, "Thanh toán đợt cuối thành công (HTTP 200)");

  // Kiểm tra công nợ về 0 và chuyển trạng thái 'Đã thanh toán'
  const debtD = await db.collection("CongNo").findOne({ _id: debtA._id });
  assert(debtD?.SoTienDaTra === 10000000, "Tổng tiền đã trả: 10.000.000 đ");
  assert(debtD?.SoTienConLai === 0, "Số tiền còn nợ bằng 0 đ");
  assert(debtD?.TrangThai === "Đã thanh toán", "Công nợ chuyển trạng thái 'Đã thanh toán'");

  // Phiếu nhập kho liên kết tự động chuyển 'Đã thanh toán'
  const pnAfterD = await db.collection("PhieuNhap").findOne({ _id: new ObjectId(pn1Id) });
  assert(pnAfterD?.TrangThai === "Đã thanh toán", "Phiếu nhập kho chuyển trạng thái 'Đã thanh toán'");
  assert(pnAfterD?.SoTienConLai === 0, "Phiếu nhập kho số tiền còn lại bằng 0 đ");

  // Kiểm tra cơ chế chống duplicate: Gửi lại cùng request thanh toán
  const payDRepeatRes = await fetch(`${baseUrl}/debts/${debtA._id}/pay`, {
    method: "POST",
    headers: ketoanHeaders,
    body: JSON.stringify({
      amount: 4000000,
      method: "Chuyển khoản",
      requestId: reqIdD,
      note: "Thanh toán tất toán nợ 4 triệu (Gửi lại)",
    }),
  });
  assert(payDRepeatRes.status === 200, "Gửi lại request thanh toán được xử lý an toàn (HTTP 200)");
  const repeatJson = await payDRepeatRes.json();
  assert(repeatJson.isDuplicate === true || repeatJson.message?.includes("đã được ghi nhận"), "Hệ thống phát hiện giao dịch trùng lặp");

  // Đếm số lượng phiếu chi gắn với REQ-D: Đúng 1 bản ghi duy nhất
  const countPCD = await db.collection("PhieuChi").countDocuments({ requestId: reqIdD });
  assert(countPCD === 1, "Tuyệt đối không bị tạo trùng Phiếu chi (Số lượng: 1)");

  // Cố tình thanh toán tiếp khi nợ đã bằng 0 -> Phải bị từ chối
  const overpayRes = await fetch(`${baseUrl}/debts/${debtA._id}/pay`, {
    method: "POST",
    headers: ketoanHeaders,
    body: JSON.stringify({
      amount: 500000,
      method: "Tiền mặt",
    }),
  });
  assert(overpayRes.status === 400, "Thanh toán khi nợ đã hết bị từ chối với HTTP 400");

  // -------------------------------------------------------------------------
  // KỊCH BẢN E: HỦY CHỨNG TỪ & BẢO VỆ CHỨNG TỪ KẾ TOÁN ĐÃ XÁC NHẬN
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO E] BẢO VỆ CHỨNG TỪ KẾ TOÁN & KIỂM TRA LỊCH SỬ THAO TÁC ---");
  // 1. Chặn xóa vật lý Phiếu nhập kho đã xác nhận
  const delPNRes = await fetch(`${baseUrl}/goods-receipts/${pn1Id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert(delPNRes.status === 403, "Chặn xóa vật lý Phiếu nhập kho đã lưu với HTTP 403 Forbidden");

  // 2. Chặn xóa vật lý Công nợ
  const delDebtRes = await fetch(`${baseUrl}/debts/${debtA._id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert(delDebtRes.status === 403, "Chặn xóa vật lý Công nợ với HTTP 403 Forbidden");

  // 3. Kiểm tra AuditLog ghi nhận các thao tác
  const auditLogs = await db.collection("AuditLogs").find({
    entityId: { $in: [String(debtA._id), String(pn1Id), gr1Data.data?.MaPN] }
  }).toArray();
  assert(auditLogs.length > 0, `AuditLog đã lưu vết các thao tác kế toán (Số bản ghi: ${auditLogs.length})`);

  // -------------------------------------------------------------------------
  // KỊCH BẢN F: NHẬP HÀNG MỘT PHẦN (PO 100 SP -> ĐỢT 1 60 SP -> ĐỢT 2 40 SP)
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO F] NHẬP HÀNG MỘT PHẦN: ĐỢT 1 60 SP -> ĐỢT 2 40 SP ---");
  const prod2Res = await fetch(`${baseUrl}/products`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      TenSP: `Sản Phẩm Nhập Một Phần ${testSuffix}`,
      MaLoai: catId,
      DonViTinh: "Hộp",
      GiaNhap: 50000,
      GiaBan: 80000,
      HanSuDung: "2027-12-31",
      TrangThai: "Đang bán",
    }),
  });
  const prod2Data = await prod2Res.json();
  const testProd2Id = prod2Data.data?.id || prod2Data.data?._id;

  // Tạo PO2: 100 sản phẩm
  const po2Res = await fetch(`${baseUrl}/purchase-orders`, {
    method: "POST",
    headers: muahangHeaders,
    body: JSON.stringify({
      supplierId: testSuppId,
      MaNCC: testSuppId,
      NgayDat: "2026-10-01",
      items: [{ productId: testProd2Id, quantity: 100, price: 50000 }],
    }),
  });
  assert(po2Res.status === 201, "Tạo đơn đặt hàng PO2 (100 SP) thành công");
  const po2Data = await po2Res.json();
  const po2Id = po2Data.data?.id || po2Data.data?._id;

  // Nhập kho Đợt 1: 60 sản phẩm
  const grPart1Res = await fetch(`${baseUrl}/goods-receipts`, {
    method: "POST",
    headers: thukhoHeaders,
    body: JSON.stringify({
      purchaseOrderId: po2Id,
      supplierId: testSuppId,
      NgayNhap: "2026-10-01",
      paidAmount: 0,
      items: [{ productId: testProd2Id, quantity: 60, price: 50000 }],
    }),
  });
  assert(grPart1Res.status === 201, "Nhập kho đợt 1 (60 SP) thành công (HTTP 201)");
  const poAfterPart1 = await db.collection("DonDatHang").findOne({ _id: new ObjectId(po2Id) });
  assert(poAfterPart1?.TrangThai === "Nhập một phần", "Trạng thái PO2 cập nhật thành 'Nhập một phần'");
  const poItem1 = (poAfterPart1?.items || [])[0];
  assert(Number(poItem1?.quantityReceived) === 60, "PO2 theo dõi số lượng đã nhận: 60/100");

  const stockPart1 = await db.collection("TonKho").findOne({ MaSP: new ObjectId(testProd2Id) });
  assert(Number(stockPart1?.SoLuongTon || 0) === 60, "Tồn kho tăng đúng 60 sản phẩm");

  // Cố tình nhập vượt số lượng còn thiếu (Ví dụ nhập 50 SP khi chỉ còn thiếu 40)
  const overReceiveRes = await fetch(`${baseUrl}/goods-receipts`, {
    method: "POST",
    headers: thukhoHeaders,
    body: JSON.stringify({
      purchaseOrderId: po2Id,
      supplierId: testSuppId,
      NgayNhap: "2026-10-01",
      paidAmount: 0,
      items: [{ productId: testProd2Id, quantity: 50, price: 50000 }],
    }),
  });
  assert(overReceiveRes.status === 400, "Cố tình nhập vượt số còn thiếu (50 > 40) bị từ chối với HTTP 400");

  // Nhập kho Đợt 2: 40 sản phẩm (Hoàn thành)
  const grPart2Res = await fetch(`${baseUrl}/goods-receipts`, {
    method: "POST",
    headers: thukhoHeaders,
    body: JSON.stringify({
      purchaseOrderId: po2Id,
      supplierId: testSuppId,
      NgayNhap: "2026-10-01",
      paidAmount: 0,
      items: [{ productId: testProd2Id, quantity: 40, price: 50000 }],
    }),
  });
  assert(grPart2Res.status === 201, "Nhập kho đợt 2 (40 SP) thành công (HTTP 201)");
  const poAfterPart2 = await db.collection("DonDatHang").findOne({ _id: new ObjectId(po2Id) });
  assert(poAfterPart2?.TrangThai === "Hoàn thành", "Trạng thái PO2 cập nhật thành 'Hoàn thành'");
  const poItem2 = (poAfterPart2?.items || [])[0];
  assert(Number(poItem2?.quantityReceived) === 100, "PO2 theo dõi số lượng đã nhận đủ: 100/100");

  const stockPart2 = await db.collection("TonKho").findOne({ MaSP: new ObjectId(testProd2Id) });
  assert(Number(stockPart2?.SoLuongTon || 0) === 100, "Tồn kho tăng đủ 100 sản phẩm");

  // -------------------------------------------------------------------------
  // KỊCH BẢN G: TRẢ HÀNG / ĐIỀU CHỈNH KHO & CÔNG NỢ ĐỐI ỨNG
  // -------------------------------------------------------------------------
  console.log("\n--- [SCENARIO G] TRẢ HÀNG / ĐIỀU CHỈNH KHO & CÔNG NỢ ---");
  // Xuất trả nhà cung cấp 10 sản phẩm kiểm toán (Kho từ 100 giảm xuống 90)
  const adjRes = await fetch(`${baseUrl}/inventory/adjust`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      reason: "Xuất trả hàng lỗi cho nhà cung cấp",
      items: [{ productId: testProdId, newStock: 90 }],
    }),
  });
  assert(adjRes.status === 200, "Thực hiện điều chỉnh xuất trả hàng kho thành công (HTTP 200)");
  const stockAfterReturn = await db.collection("TonKho").findOne({ MaSP: new ObjectId(testProdId) });
  assert(Number(stockAfterReturn?.SoLuongTon) === 90, "Tồn kho giảm chính xác từ 100 xuống 90 sản phẩm");

  // Kiểm tra các chứng từ thanh toán cũ không bị thay đổi
  const oldPayB = await db.collection("PhieuChi").findOne({ MaPC: maPCB });
  assert(oldPayB?.SoTien === 4000000, "Chứng từ Phiếu chi cũ (PC đợt 1) được bảo toàn nguyên vẹn 4.000.000 đ");
  const oldPayC = await db.collection("PhieuChi").findOne({ MaPC: maPCC });
  assert(oldPayC?.SoTien === 2000000, "Chứng từ Phiếu chi cũ (PC đợt 2) được bảo toàn nguyên vẹn 2.000.000 đ");

  // -------------------------------------------------------------------------
  // ĐỐI CHIẾU BÁO CÁO NHẬP - XUẤT - TỒN & BÁO CÁO CÔNG NỢ
  // -------------------------------------------------------------------------
  console.log("\n--- [KIỂM TOÁN BÁO CÁO] ĐỐI CHIẾU N-X-T VÀ DOANH THU/QUỸ ---");
  const invRepRes = await fetch(`${baseUrl}/reports/inventory`, { headers: adminHeaders });
  assert(invRepRes.status === 200, "Báo cáo Tồn kho (GET /reports/inventory) trả về HTTP 200");
  const invRepData = await invRepRes.json();
  const prodRow1 = (invRepData.data || []).find((r) => r.id === testProdId || r._id === testProdId);
  assert(prodRow1 !== undefined, "Sản phẩm kiểm toán xuất hiện trong Báo cáo Nhập-Xuất-Tồn");
  assert(Number(prodRow1?.TonCuoi) === 90, `Báo cáo phản ánh đúng tồn cuối: ${prodRow1?.TonCuoi} == 90`);

  // Dọn dẹp dữ liệu thử nghiệm an toàn
  console.log("\n--- DỌN DẸP DỮ LIỆU KIỂM TOÁN AN TOÀN ---");
  await db.collection("SanPham").deleteMany({ _id: { $in: [new ObjectId(testProdId), new ObjectId(testProd2Id)] } });
  await db.collection("TonKho").deleteMany({ MaSP: { $in: [new ObjectId(testProdId), new ObjectId(testProd2Id)] } });
  await db.collection("DonDatHang").deleteMany({ _id: { $in: [new ObjectId(po1Id), new ObjectId(po2Id)] } });
  await db.collection("CT_DonDatHang").deleteMany({ MaDDH: { $in: [new ObjectId(po1Id), new ObjectId(po2Id)] } });
  await db.collection("PhieuNhap").deleteMany({ MaNCC: new ObjectId(testSuppId) });
  await db.collection("CT_PhieuNhap").deleteMany({ MaNCC: new ObjectId(testSuppId) });
  await db.collection("CongNo").deleteMany({ MaNCC: new ObjectId(testSuppId) });
  await db.collection("PhieuChi").deleteMany({ MaNCC: new ObjectId(testSuppId) });
  await db.collection("ThanhToan").deleteMany({ MaNCC: new ObjectId(testSuppId) });
  await db.collection("NhaCungCap").deleteOne({ _id: new ObjectId(testSuppId) });
  console.log("  -> Toàn bộ dữ liệu kiểm toán cô lập đã được dọn dẹp sạch sẽ.");

  console.log("\n=======================================================");
  console.log(`MASTER ACCOUNTING AUDIT FINISHED: ${totalPassed} PASSED, ${totalFailed} FAILED`);
  console.log("=======================================================\n");

  server.close();
  process.exit(totalFailed > 0 ? 1 : 0);
}

runMasterAccountingAudit().catch((err) => {
  console.error("Master Accounting Audit failed with exception:", err);
  process.exit(1);
});
