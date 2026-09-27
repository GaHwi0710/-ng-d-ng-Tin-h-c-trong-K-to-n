import { Router } from "express";
import jwt from "jsonwebtoken";
import { getDatabase } from "../../config/mongodb.js";
import { passwordMatches, hashPassword } from "./password.js";
import { isLockedStatus } from "./accountEmployee.js";
import { getRolePermissions } from "../shared/permissions.js";
import { requireAuth } from "../../common/middlewares/auth.middleware.js";
import { recordAudit } from "../audit/audit.service.js";

const router = Router();
const secret = process.env.JWT_SECRET || "baby-shop-development-secret";

router.post("/login", (req, res) => {
  const rawUsername = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!rawUsername || !password) {
    return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
  }

  (async () => {
    let account = null;
    let employee = null;

    try {
      const db = getDatabase();
      account = await db.collection("Users").findOne({ username: rawUsername });
      employee = await db.collection("NhanVien").findOne({
        $or: [{ username: rawUsername }, { MaNV: rawUsername }],
      });
    } catch (dbError) {
      console.error("Database error during login:", dbError?.message);
      return res.status(503).json({ message: "Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau." });
    }

    // 1. Kiểm tra tài khoản có tồn tại trong DB không
    if (!account) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
    }

    // 2. Kiểm tra trạng thái Khóa / Ngưng hoạt động
    const isLocked = isLockedStatus(account?.status) || isLockedStatus(employee?.TrangThai);
    if (isLocked) {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa hoặc ngưng hoạt động. Vui lòng liên hệ Quản trị viên!",
      });
    }

    // 3. Xác thực mật khẩu với bản ghi DB
    if (!passwordMatches(password, account.passwordHash)) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác" });
    }

    const validAccount = {
      id: account._id?.toString() || account.id || rawUsername,
      username: account.username,
      fullName: account.fullName || employee?.HoTen || rawUsername,
      role: account.role || "NhanVienBanHang",
    };

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

    recordAudit({
      userId: validAccount.id,
      username: validAccount.username,
      role: validAccount.role,
      action: "LOGIN",
      module: "auth",
      description: `Đăng nhập thành công với vai trò ${roleName || validAccount.role}`,
      ip: req.ip,
    });

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

router.post("/logout", (req, res) => {
  recordAudit({
    username: req.user?.username || "user",
    role: req.user?.role || "user",
    action: "LOGOUT",
    module: "auth",
    description: "Đăng xuất khỏi hệ thống",
    ip: req.ip,
  });
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

const handleChangePassword = async (req, res) => {
  try {
    const currentPassword = req.body?.currentPassword || req.body?.oldPassword;
    const newPassword = req.body?.newPassword;
    const confirmPassword = req.body?.confirmPassword !== undefined ? req.body?.confirmPassword : newPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới",
      });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
      });
    }

    const db = getDatabase();
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ message: "Không xác định được phiên người dùng" });
    }

    const user = await db.collection("Users").findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy thông tin tài khoản người dùng" });
    }

    if (!passwordMatches(currentPassword, user.passwordHash)) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không chính xác" });
    }

    const newHash = hashPassword(newPassword);
    await db.collection("Users").updateOne(
      { _id: user._id },
      { $set: { passwordHash: newHash, updatedAt: new Date() } }
    );

    recordAudit({
      userId: req.user?.id || user._id?.toString(),
      username: req.user?.username || user.username,
      role: req.user?.role || user.role,
      action: "CHANGE_PASSWORD",
      module: "auth",
      description: `Đổi mật khẩu tài khoản ${req.user?.username || user.username} thành công`,
      ip: req.ip,
    });

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Lỗi máy chủ khi đổi mật khẩu" });
  }
};

router.put("/change-password", requireAuth, handleChangePassword);
router.post("/change-password", requireAuth, handleChangePassword);

export default router;


