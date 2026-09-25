import { getDatabase } from "../../config/mongodb.js";

/**
 * Danh sách từ khóa nhạy cảm không được lưu vào audit log
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "jwt",
  "secret",
  "oldPassword",
  "newPassword",
  "confirmPassword",
  "currentPassword",
]);

/**
 * Loại bỏ thông tin nhạy cảm khỏi metadata
 */
function sanitizeMetadata(data) {
  if (!data || typeof data !== "object") return {};
  if (Array.isArray(data)) return data.map(sanitizeMetadata);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue; // Bỏ qua hoàn toàn
    }
    if (value && typeof value === "object") {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Ghi nhận một sự kiện nhật ký kiểm toán (Audit Log)
 * Hàm này hoàn toàn non-blocking, lỗi ghi log sẽ không làm hỏng giao dịch chính.
 */
export async function recordAudit({
  userId,
  username = "system",
  role = "Hệ thống",
  action,
  module = "general",
  entity = "",
  entityId = "",
  description = "",
  metadata = {},
  ip = "",
}) {
  try {
    const db = getDatabase();
    const logDoc = {
      userId: userId ? String(userId) : undefined,
      username: String(username),
      role: String(role),
      action: String(action),
      module: String(module),
      entity: String(entity),
      entityId: entityId ? String(entityId) : undefined,
      description: String(description),
      metadata: sanitizeMetadata(metadata),
      ip: String(ip || ""),
      timestamp: new Date(),
    };

    await db.collection("AuditLogs").insertOne(logDoc);
  } catch (err) {
    // Không làm sập ứng dụng nếu có lỗi ghi log
    console.error("Audit log error:", err?.message);
  }
}

/**
 * Truy vấn danh sách nhật ký kiểm toán có phân trang và bộ lọc
 */
export async function getAuditLogs({
  page = 1,
  limit = 20,
  search = "",
  action = "",
  module = "",
  role = "",
  from = "",
  to = "",
}) {
  const db = getDatabase();
  const query = {};

  if (action && action !== "all") {
    query.action = action;
  }

  if (module && module !== "all") {
    query.module = module;
  }

  if (role && role !== "all") {
    query.role = role;
  }

  if (from || to) {
    query.timestamp = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      query.timestamp.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      query.timestamp.$lte = toDate;
    }
  }

  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    const regex = new RegExp(trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [
      { username: regex },
      { description: regex },
      { entity: regex },
      { entityId: regex },
      { action: regex },
    ];
  }

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [total, items] = await Promise.all([
    db.collection("AuditLogs").countDocuments(query),
    db.collection("AuditLogs")
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(safeLimit)
      .toArray(),
  ]);

  return {
    data: items,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}
