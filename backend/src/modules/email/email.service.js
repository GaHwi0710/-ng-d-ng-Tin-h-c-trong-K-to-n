import nodemailer from "nodemailer";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { recordAudit } from "../audit/audit.service.js";

/**
 * Khởi tạo transporter cho nodemailer từ biến môi trường
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Nếu chưa cấu hình SMTP trong env, trả về null (chế độ mô phỏng an toàn)
  return null;
}

/**
 * Định dạng tiền tệ VND
 */
function fmtMoney(amount) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
}

/**
 * Tạo nội dung HTML chuyên nghiệp cho email hóa đơn
 */
export function generateInvoiceHtml({ invoice, customer, items, storeName = "Cửa hàng Mẹ & Bé" }) {
  const invCode = invoice.MaHD || invoice.id || "HD-000";
  const invDate = invoice.NgayLap || new Date().toLocaleDateString("vi-VN");
  const custName = customer?.HoTen || invoice.TenKH || "Quý khách hàng";
  const totalAmount = invoice.TongTien || 0;
  const status = invoice.TrangThai || "Đã xuất";

  const rowsHtml = (items || []).map((it, idx) => `
    <tr style="border-bottom: 1px solid #E2E8F0;">
      <td style="padding: 10px 8px; text-align: center; color: #64748B;">${idx + 1}</td>
      <td style="padding: 10px 8px; font-weight: 600; color: #1E293B;">${it.TenSP || it.name || "Sản phẩm"}</td>
      <td style="padding: 10px 8px; text-align: center; color: #1E293B;">${it.SoLuong || it.quantity || 1}</td>
      <td style="padding: 10px 8px; text-align: right; color: #475569;">${fmtMoney(it.DonGia || it.price || 0)}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #2A4F49;">${fmtMoney(it.ThanhTien || (Number(it.SoLuong || 1) * Number(it.DonGia || 0)))}</td>
    </tr>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #334155; margin: 0; padding: 0; background: #F8FAFC; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
        .header { background: #2A4F49; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 24px; }
        .meta-box { background: #F1F5F9; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; }
        th { background: #E2E8F0; color: #334155; text-align: left; padding: 8px; font-size: 12px; font-weight: 700; }
        .total-box { margin-top: 16px; padding: 14px; background: #E6F4F1; border-radius: 6px; text-align: right; font-size: 15px; color: #1F433E; font-weight: 700; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${storeName}</h1>
          <p>Hóa đơn bán hàng điện tử #${invCode}</p>
        </div>
        <div class="body">
          <p>Xin chào <strong>${custName}</strong>,</p>
          <p>Cảm ơn bạn đã tin tưởng và mua sắm tại <strong>${storeName}</strong>. Dưới đây là thông tin chi tiết đơn hàng của bạn:</p>

          <div class="meta-box">
            <div class="meta-row"><span>Mã hóa đơn:</span> <strong>${invCode}</strong></div>
            <div class="meta-row"><span>Ngày lập:</span> <span>${invDate}</span></div>
            <div class="meta-row"><span>Trạng thái:</span> <span style="color: #059669; font-weight: 600;">${status}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">STT</th>
                <th>Sản phẩm</th>
                <th style="width: 45px; text-align: center;">SL</th>
                <th style="width: 90px; text-align: right;">Đơn giá</th>
                <th style="width: 100px; text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total-box">
            Tổng thanh toán: ${fmtMoney(totalAmount)}
          </div>

          <p style="margin-top: 24px; font-size: 13px;">Nếu bạn có bất kỳ câu hỏi nào về hóa đơn, vui lòng liên hệ hotline: <strong>0987 654 321</strong> | Email: <strong>contact@cuahangmebe.vn</strong>.</p>
        </div>
        <div class="footer">
          <p>Trân trọng cảm ơn quý khách!</p>
          <p><strong>${storeName}</strong> — Hệ thống quản lý Cửa hàng Mẹ và Bé</p>
          <p style="margin-top: 4px; font-size: 11px; color: #94A3B8;">Địa chỉ: 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội | Website: www.cuahangmebe.vn</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Gửi email hóa đơn điện tử cho khách hàng
 */
export async function sendInvoiceEmail({ invoiceId, toEmail, user = {} }) {
  if (!toEmail || !/^\S+@\S+\.\S+$/.test(toEmail.trim())) {
    throw new Error("Địa chỉ email không hợp lệ");
  }

  const db = getDatabase();
  let query = { MaHD: invoiceId };
  if (ObjectId.isValid(invoiceId)) {
    query = { $or: [{ _id: new ObjectId(invoiceId) }, { MaHD: invoiceId }] };
  }

  const invoice = await db.collection("HoaDon").findOne(query);
  if (!invoice) {
    throw new Error(`Không tìm thấy hóa đơn: ${invoiceId}`);
  }

  // Lấy chi tiết hóa đơn
  const details = await db.collection("CT_HoaDon").find({
    $or: [
      { MaHD: invoice._id },
      { MaHD: invoice.MaHD },
      { MaHD: String(invoice._id) },
    ],
  }).toArray();

  // Lấy thông tin khách hàng nếu có
  let customer = null;
  if (invoice.MaKH) {
    customer = await db.collection("KhachHang").findOne({
      $or: [
        ...(ObjectId.isValid(invoice.MaKH) ? [{ _id: new ObjectId(invoice.MaKH) }] : []),
        { MaKH: invoice.MaKH },
      ],
    });
  }

  const htmlContent = generateInvoiceHtml({
    invoice,
    customer,
    items: details.length ? details : (invoice.details || invoice.items || []),
  });

  const transporter = createTransporter();
  let messageId = null;
  let simulated = false;

  const mailOptions = {
    from: process.env.MAIL_FROM || `"Cửa hàng Mẹ & Bé" <${process.env.SMTP_USER || "no-reply@cuahangmebe.vn"}>`,
    to: toEmail.trim(),
    subject: `Hóa đơn bán hàng #${invoice.MaHD || invoice._id}`,
    html: htmlContent,
  };

  if (transporter) {
    const info = await transporter.sendMail(mailOptions);
    messageId = info.messageId;
  } else {
    // Chế độ mô phỏng an toàn khi môi trường chưa cấu hình SMTP
    simulated = true;
    messageId = `simulated-${Date.now()}@cuahangmebe.local`;
  }

  // Ghi nhật ký kiểm toán non-blocking
  recordAudit({
    userId: user.id,
    username: user.username || "system",
    role: user.role || "System",
    action: "EMAIL_INVOICE",
    module: "invoices",
    entity: "HoaDon",
    entityId: String(invoice._id),
    description: `Gửi email hóa đơn ${invoice.MaHD || invoice._id} tới ${toEmail.trim()}`,
    metadata: {
      toEmail: toEmail.trim(),
      invoiceId: invoice.MaHD || invoice._id,
      simulated,
      messageId,
    },
  });

  return {
    success: true,
    messageId,
    simulated,
    toEmail: toEmail.trim(),
    recipient: toEmail.trim(),
    previewHtml: htmlContent,
    invoiceCode: invoice.MaHD || invoice._id,
    message: simulated
      ? `Đã gửi thành công (Chế độ mô phỏng an toàn: ${toEmail.trim()})`
      : `Đã gửi hóa đơn điện tử tới ${toEmail.trim()} thành công!`,
  };
}
