import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { hashPassword } from "../auth/password.js";
import { syncEmployee, isLockedStatus } from "../auth/accountEmployee.js";

const router = Router();
const builtinRoles = ["QuanLy", "KeToan", "NhanVienBanHang", "NhanVienKho", "NhanVienMuaHang"];

// Vai trò hợp lệ: 5 vai trò hệ thống hoặc vai trò tùy chỉnh có MaKey trong VaiTro
async function isValidRole(db, roleKey) {
  if (!roleKey) return false;
  if (builtinRoles.includes(roleKey)) return true;
  try {
    return !!(await db.collection("VaiTro").findOne({ MaKey: roleKey }));
  } catch {
    return false;
  }
}

function parseId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

function publicAccount(account) {
  if (!account) return account;
  const { _id, passwordHash, ...data } = account;
  return { id: _id.toString(), ...data };
}

function validateAccount(body, requirePassword = true) {
  if (!body.username?.trim() || !body.fullName?.trim()) return "Họ tên và tên đăng nhập là bắt buộc";
  if (requirePassword && (!body.password || body.password.length < 6)) return "Mật khẩu phải có ít nhất 6 ký tự";
  if (body.CCCD && !/^[0-9]{12}$/.test(String(body.CCCD).trim())) return "Số CCCD phải gồm đúng 12 chữ số hợp lệ";
  return null;
}

router.get("/", async (_req, res, next) => {
  try {
    const db = getDatabase();
    const usersData = await db.collection("Users").find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
    const employees = await db.collection("NhanVien").find().toArray();
    const empMap = new Map();
    for (const emp of employees) {
      if (emp.username) empMap.set(emp.username, emp);
    }

    const list = usersData.map((u) => {
      const emp = empMap.get(u.username);
      const pub = publicAccount(u);
      const locked = isLockedStatus(u.status) || isLockedStatus(emp?.TrangThai);
      return {
        ...pub,
        status: locked ? "Đã khóa" : "Hoạt động",
        MaNV: emp?.MaNV || "",
        CCCD: u.CCCD || emp?.CCCD || "",
        SDT: u.SDT || emp?.SDT || "",
        DiaChi: u.DiaChi || emp?.DiaChi || "",
        employeeId: emp?._id?.toString() || "",
      };
    });
    res.json({ data: list });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const validation = validateAccount(req.body);
    if (validation) return res.status(400).json({ message: validation });
    if (!(await isValidRole(getDatabase(), req.body.role))) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    const users = getDatabase().collection("Users");
    const cleanUsername = req.body.username.trim();
    if (await users.findOne({ username: cleanUsername })) {
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });
    }

    const isLocked = isLockedStatus(req.body.status);
    const account = {
      username: cleanUsername,
      fullName: req.body.fullName.trim(),
      role: req.body.role || "NhanVienBanHang",
      status: isLocked ? "Đã khóa" : "Hoạt động",
      CCCD: req.body.CCCD ? String(req.body.CCCD).trim() : "",
      SDT: req.body.SDT ? String(req.body.SDT).trim() : "",
      DiaChi: req.body.DiaChi ? String(req.body.DiaChi).trim() : "",
      passwordHash: hashPassword(req.body.password),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(account);
    await syncEmployee(getDatabase(), account);

    res.status(201).json({
      data: publicAccount({ _id: result.insertedId, ...account }),
      message: "Đã tạo nhân viên & tài khoản thành công",
    });
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) return res.status(400).json({ message: "ID tài khoản không hợp lệ" });
    const validation = validateAccount(req.body, false);
    if (validation) return res.status(400).json({ message: validation });
    if (req.body.role && !(await isValidRole(getDatabase(), req.body.role))) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    const existing = await getDatabase().collection("Users").findOne({ _id: accountId });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    const isSelf = req.user?.id === req.params.id || req.user?.id === accountId.toString() || req.user?.username === existing.username;
    const isLocked = isLockedStatus(req.body.status);

    if (isSelf && isLocked) {
      return res.status(400).json({ message: "Không thể tự khóa tài khoản của chính mình" });
    }

    if (existing.role === "QuanLy" && (isLocked || (req.body.role && req.body.role !== "QuanLy"))) {
      const activeAdminCount = await getDatabase().collection("Users").countDocuments({
        role: "QuanLy",
        status: { $nin: ["Đã khóa", "inactive", "locked"] },
        _id: { $ne: accountId },
      });
      if (activeAdminCount < 1) {
        return res.status(400).json({ message: "Không thể khóa hoặc hạ quyền quản trị viên duy nhất của hệ thống" });
      }
    }

    const update = {
      username: req.body.username.trim(),
      fullName: req.body.fullName.trim(),
      role: req.body.role,
      status: isLocked ? "Đã khóa" : "Hoạt động",
      CCCD: req.body.CCCD ? String(req.body.CCCD).trim() : (existing.CCCD || ""),
      SDT: req.body.SDT ? String(req.body.SDT).trim() : (existing.SDT || ""),
      DiaChi: req.body.DiaChi ? String(req.body.DiaChi).trim() : (existing.DiaChi || ""),
      updatedAt: new Date(),
    };

    if (req.body.password) {
      if (req.body.password.length < 6) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
      update.passwordHash = hashPassword(req.body.password);
    }

    const users = getDatabase().collection("Users");
    const duplicate = await users.findOne({ username: update.username, _id: { $ne: accountId } });
    if (duplicate) return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });

    const result = await users.findOneAndUpdate(
      { _id: accountId },
      { $set: update },
      { returnDocument: "after", projection: { passwordHash: 0 } }
    );
    if (!result) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    await syncEmployee(getDatabase(), { ...existing, ...update }, existing.username);
    res.json({ data: publicAccount(result), message: "Đã cập nhật thông tin thành công" });
  } catch (error) { next(error); }
});

router.patch("/:id/toggle-lock", async (req, res, next) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) return res.status(400).json({ message: "ID tài khoản không hợp lệ" });

    const users = getDatabase().collection("Users");
    const existing = await users.findOne({ _id: accountId });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    const isSelf = req.user?.id === req.params.id || req.user?.id === accountId.toString() || req.user?.username === existing.username;
    if (isSelf) {
      return res.status(400).json({ message: "Không thể tự khóa tài khoản của chính mình" });
    }

    const isCurrentlyLocked = isLockedStatus(existing.status);
    const newStatus = isCurrentlyLocked ? "Hoạt động" : "Đã khóa";

    if (newStatus === "Đã khóa" && existing.role === "QuanLy") {
      const activeAdminCount = await users.countDocuments({
        role: "QuanLy",
        status: { $nin: ["Đã khóa", "inactive", "locked"] },
        _id: { $ne: accountId },
      });
      if (activeAdminCount < 1) {
        return res.status(400).json({ message: "Không thể khóa quản trị viên duy nhất của hệ thống" });
      }
    }

    await users.updateOne({ _id: accountId }, { $set: { status: newStatus, updatedAt: new Date() } });
    await syncEmployee(getDatabase(), { ...existing, status: newStatus }, existing.username);

    res.json({
      success: true,
      status: newStatus,
      message: isCurrentlyLocked ? `Đã mở khóa tài khoản ${existing.username}` : `Đã khóa tài khoản ${existing.username}`,
    });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) return res.status(400).json({ message: "ID tài khoản không hợp lệ" });

    const existing = await getDatabase().collection("Users").findOne({ _id: accountId });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy tài khoản" });

    const isSelf = req.user?.id === req.params.id || req.user?.id === accountId.toString() || req.user?.username === existing.username;
    if (isSelf) return res.status(400).json({ message: "Không thể xóa tài khoản của chính mình" });

    if (existing.role === "QuanLy") {
      const activeAdminCount = await getDatabase().collection("Users").countDocuments({
        role: "QuanLy",
        status: { $nin: ["Đã khóa", "inactive", "locked"] },
        _id: { $ne: accountId },
      });
      if (activeAdminCount < 1) {
        return res.status(400).json({ message: "Không thể xóa quản trị viên duy nhất của hệ thống" });
      }
    }

    await getDatabase().collection("Users").deleteOne({ _id: accountId });
    await getDatabase().collection("NhanVien").updateOne(
      { username: existing.username },
      { $set: { TrangThai: "Đã nghỉ việc", updatedAt: new Date() } }
    );

    res.json({ message: "Đã xóa tài khoản" });
  } catch (error) { next(error); }
});

export default router;

