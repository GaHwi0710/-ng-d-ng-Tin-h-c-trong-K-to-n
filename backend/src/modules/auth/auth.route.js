import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDatabase } from "../../config/mongodb.js";
import { passwordMatches } from "./password.js";

const router = Router();
const secret = process.env.JWT_SECRET || "baby-shop-development-secret";

const defaultAccounts = {
  [process.env.ADMIN_USERNAME || "admin"]: {
    id: "admin",
    username: process.env.ADMIN_USERNAME || "admin",
    fullName: process.env.ADMIN_FULL_NAME || "Quản trị viên",
    role: "QuanLy",
    password: process.env.ADMIN_PASSWORD || "admin123",
  },
  maianh: { id: "maianh", username: "maianh", fullName: "Nguyễn Mai Anh", role: "NhanVienBanHang", password: "maianh123" },
  vanhung: { id: "vanhung", username: "vanhung", fullName: "Trần Văn Hùng", role: "NhanVienKho", password: "vanhung123" },
  ketoan: { id: "ketoan", username: "ketoan", fullName: "Lê Thị Kế Toán", role: "KeToan", password: "ketoan123" },
  muahang: { id: "muahang", username: "muahang", fullName: "Phạm Văn Mua Hàng", role: "NhanVienMuaHang", password: "muahang123" },
};

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  (async () => {
    let account = null;
    try {
      account = await getDatabase().collection("Users").findOne({ username });
    } catch {
      // Database not connected
    }

    if (!account && defaultAccounts[username]) {
      const def = defaultAccounts[username];
      if (password === def.password) {
        account = { id: def.id, username: def.username, fullName: def.fullName, role: def.role, status: "active" };
      }
    } else if (account) {
      if (account.status === "disabled" || !passwordMatches(password, account.passwordHash)) {
        account = null;
      }
    }

    if (!account) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa" });
    }
    res.json({
      token: jwt.sign({ id: account.id || account._id?.toString() || username, username, role: account.role }, secret, { expiresIn: "8h" }),
      user: { id: account.id || account._id?.toString() || username, username, fullName: account.fullName || username, role: account.role },
    });
  })().catch((error) => res.status(500).json({ message: error.message }));
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Dang xuat thanh cong" });
});

router.get("/me", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    res.json(jwt.verify(token, secret));
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }
});

export default router;
