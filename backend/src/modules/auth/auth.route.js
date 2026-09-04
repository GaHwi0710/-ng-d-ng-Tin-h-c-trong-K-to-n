import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDatabase } from "../../config/mongodb.js";
import { passwordMatches } from "./password.js";

const router = Router();
const secret = process.env.JWT_SECRET || "baby-shop-development-secret";

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const validUsername = process.env.ADMIN_USERNAME || "admin";
  const validPassword = process.env.ADMIN_PASSWORD || "admin123";

  (async () => {
    const account = username === validUsername
      ? { id: "admin", username, role: "QuanLy", passwordHash: validPassword }
      : await getDatabase().collection("Users").findOne({ username });
    if (!account || account.status === "disabled" || !passwordMatches(password, account.passwordHash)) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa" });
    }
    res.json({
      token: jwt.sign({ id: account.id || account._id.toString(), username, role: account.role }, secret, { expiresIn: "8h" }),
      user: { id: account.id || account._id.toString(), username, fullName: account.fullName || username, role: account.role },
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
