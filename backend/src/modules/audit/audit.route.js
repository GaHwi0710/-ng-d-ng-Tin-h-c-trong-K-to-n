import { Router } from "express";
import { getAuditLogs } from "./audit.service.js";

const router = Router();

router.get("/audit-logs", async (req, res) => {
  try {
    const { page, limit, search, action, module, role, from, to } = req.query;
    const result = await getAuditLogs({
      page,
      limit,
      search,
      action,
      module,
      role,
      from,
      to,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi truy vấn nhật ký kiểm toán: " + err.message });
  }
});

export default router;
