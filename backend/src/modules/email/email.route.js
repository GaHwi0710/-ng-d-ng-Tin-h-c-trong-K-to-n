import { Router } from "express";
import { sendInvoiceEmail } from "./email.service.js";

const router = Router();

/**
 * POST /api/email/invoice
 * Gửi hóa đơn bán hàng tới email của khách hàng
 */
router.post("/invoice", async (req, res) => {
  try {
    const { invoiceId, email } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ message: "Vui lòng cung cấp mã hóa đơn (invoiceId)" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập địa chỉ email nhận hóa đơn" });
    }

    const result = await sendInvoiceEmail({
      invoiceId,
      toEmail: email,
      user: req.user || {},
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || "Lỗi gửi email hóa đơn" });
  }
});

export default router;
