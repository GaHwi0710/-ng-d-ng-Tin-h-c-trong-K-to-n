import jwt from "jsonwebtoken";
import { getDatabase } from "../../config/mongodb.js";
import { isLockedStatus } from "../../modules/auth/accountEmployee.js";

const DEFAULT_SECRET = "baby-shop-development-secret";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  if (secret === DEFAULT_SECRET && process.env.NODE_ENV === "production") {
    console.error("⛔ CRITICAL: JWT_SECRET đang sử dụng giá trị mặc định! Server từ chối khởi động trong production.");
    console.error("   Hãy tạo file backend/.env với JWT_SECRET=<random-secret>");
    process.exit(1);
  }
  return secret;
}

export async function requireAuth(req, res, next) {
  let tokenStr = "";
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    tokenStr = header.slice(7);
  }
  // SEC-02: Đã loại bỏ hỗ trợ token qua query parameter (req.query.token)
  // để tránh token bị lộ qua URL / access logs / referer headers

  if (!tokenStr) {
    return res.status(401).json({ message: "Missing access token" });
  }

  try {
    req.user = jwt.verify(tokenStr, getJwtSecret());
    
    // Kiểm tra ngay xem tài khoản có bị khóa trong CSDL hay không
    if (req.user?.username) {
      try {
        const db = getDatabase();
        const [userDoc, empDoc] = await Promise.all([
          db.collection("Users").findOne({ username: req.user.username }),
          db.collection("NhanVien").findOne({ username: req.user.username }),
        ]);
        if (isLockedStatus(userDoc?.status) || isLockedStatus(empDoc?.TrangThai)) {
          return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa. Vui lòng đăng nhập lại." });
        }
      } catch {
        // Fallback gracefully if database command fails transiently
      }
    }
  } catch {
    return res.status(401).json({ message: "Invalid access token" });
  }

  next();
}
