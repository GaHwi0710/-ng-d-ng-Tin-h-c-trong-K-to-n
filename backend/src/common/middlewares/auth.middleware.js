import jwt from "jsonwebtoken";
import { getDatabase } from "../../config/mongodb.js";
import { isLockedStatus } from "../../modules/auth/accountEmployee.js";

const secret = process.env.JWT_SECRET || "baby-shop-development-secret";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing access token" });
  }

  try {
    req.user = jwt.verify(header.slice(7), secret);
    
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

