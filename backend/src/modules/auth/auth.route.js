import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDatabase } from "../../config/mongodb.js";
import { passwordMatches } from "./password.js";
import { isLockedStatus } from "./accountEmployee.js";
import { getRolePermissions } from "../shared/permissions.js";

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
  const rawUsername = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  (async () => {
    let account = null;
    let employee = null;

    try {
      const db = getDatabase();
      account = await db.collection("Users").findOne({ username: rawUsername });
      employee = await db.collection("NhanVien").findOne({
        $or: [{ username: rawUsername }, { MaNV: rawUsername }],
      });
    } catch {
      // Database not connected
    }

    // 1. Kiểm tra trạng thái Khóa / Ngưng hoạt động
    const isLocked = isLockedStatus(account?.status) || isLockedStatus(employee?.TrangThai);
    if (isLocked) {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa hoặc ngưng hoạt động. Vui lòng liên hệ Quản trị viên!",
      });
    }

    // 2. Xác thực tài khoản và mật khẩu
    let validAccount = null;

    if (account) {
      if (passwordMatches(password, account.passwordHash)) {
        validAccount = {
          id: account._id?.toString() || account.id || rawUsername,
          username: account.username,
          fullName: account.fullName || employee?.HoTen || rawUsername,
          role: account.role || "NhanVienBanHang",
        };
      }
    } else if (defaultAccounts[rawUsername]) {
      const def = defaultAccounts[rawUsername];
      if (password === def.password) {
        validAccount = {
          id: def.id,
          username: def.username,
          fullName: def.fullName,
          role: def.role,
        };
      }
    }

    if (!validAccount) {
      return res.status(401).json({
        message: "Tên đăng nhập hoặc mật khẩu không chính xác",
      });
    }

    // Gửi kèm ma trận quyền chi tiết của vai trò để frontend lọc menu/chức năng
    let permissions = null;
    let roleName = null;
    try {
      const db = getDatabase();
      permissions = await getRolePermissions(db, validAccount.role);
      const roleDoc = await db.collection("VaiTro").findOne({ MaKey: validAccount.role });
      roleName = roleDoc?.TenVaiTro || null;
    } catch {
      permissions = null;
    }

    res.json({
      token: jwt.sign(
        {
          id: validAccount.id,
          username: validAccount.username,
          fullName: validAccount.fullName,
          role: validAccount.role,
        },
        secret,
        { expiresIn: "8h" }
      ),
      user: { ...validAccount, permissions, roleName },
    });
  })().catch((error) => res.status(500).json({ message: error.message }));
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Đăng xuất thành công" });
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const decoded = jwt.verify(token, secret);

    try {
      const db = getDatabase();
      const user = await db.collection("Users").findOne({ username: decoded.username });
      const emp = await db.collection("NhanVien").findOne({ username: decoded.username });
      if (isLockedStatus(user?.status) || isLockedStatus(emp?.TrangThai)) {
        return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa" });
      }
    } catch {
      // Ignored if db transient error
    }

    let payload = decoded;
    try {
      payload = { ...decoded, permissions: await getRolePermissions(getDatabase(), decoded.role) };
    } catch {
      // Giữ nguyên payload nếu không lấy được quyền
    }
    res.json(payload);
  } catch {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }
});

export default router;

