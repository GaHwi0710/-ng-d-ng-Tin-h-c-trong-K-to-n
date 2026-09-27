import { Router } from "express";
import { getAuditLogs } from "./audit.service.js";
import { requirePermission } from "../shared/permissions.js";

const router = Router();

router.get("/audit-logs", requirePermission("audit-logs", "xem"), async (req, res) => {
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

// Chặn tuyệt đối hành vi xóa nhật ký kiểm toán (Audit Log là append-only)
router.delete("/audit-logs*", (_req, res) => {
  return res.status(403).json({ message: "Nhật ký kiểm toán không được phép xóa (append-only)." });
});

export default router;
