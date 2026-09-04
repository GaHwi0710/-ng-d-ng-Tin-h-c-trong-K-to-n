import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { hashPassword } from "../auth/password.js";
import { syncEmployee } from "../auth/accountEmployee.js";

const router = Router();
const roles = ["QuanLy", "KeToan", "NhanVienBanHang", "NhanVienKho", "NhanVienMuaHang"];

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
  if (body.role && !roles.includes(body.role)) return "Vai trò không hợp lệ";
  return null;
}

router.get("/", async (_req, res, next) => {
  try {
    const data = await getDatabase().collection("Users").find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
    res.json({ data: data.map(publicAccount) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const validation = validateAccount(req.body);
    if (validation) return res.status(400).json({ message: validation });
    const users = getDatabase().collection("Users");
    if (await users.findOne({ username: req.body.username.trim() })) return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });
    const account = { username: req.body.username.trim(), fullName: req.body.fullName.trim(), role: req.body.role || "NhanVienBanHang", status: req.body.status || "active", passwordHash: hashPassword(req.body.password), createdAt: new Date(), updatedAt: new Date() };
    const result = await users.insertOne(account);
    await syncEmployee(getDatabase(), account);
    res.status(201).json({ data: publicAccount({ _id: result.insertedId, ...account }), message: "Đã tạo tài khoản" });
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) return res.status(400).json({ message: "ID tài khoản không hợp lệ" });
    const validation = validateAccount(req.body, false);
    if (validation) return res.status(400).json({ message: validation });
    const existing = await getDatabase().collection("Users").findOne({ _id: accountId });
    if (!existing) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    const update = { username: req.body.username.trim(), fullName: req.body.fullName.trim(), role: req.body.role, status: req.body.status, updatedAt: new Date() };
    if (req.body.password) {
      if (req.body.password.length < 6) return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
      update.passwordHash = hashPassword(req.body.password);
    }
    const users = getDatabase().collection("Users");
    const duplicate = await users.findOne({ username: update.username, _id: { $ne: accountId } });
    if (duplicate) return res.status(409).json({ message: "Tên đăng nhập đã tồn tại" });
    const result = await users.findOneAndUpdate({ _id: accountId }, { $set: update }, { returnDocument: "after", projection: { passwordHash: 0 } });
    if (!result) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    await syncEmployee(getDatabase(), { ...existing, ...update }, existing.username);
    res.json({ data: publicAccount(result), message: "Đã cập nhật tài khoản" });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) return res.status(400).json({ message: "ID tài khoản không hợp lệ" });
    if (req.user.id === req.params.id) return res.status(400).json({ message: "Không thể xóa tài khoản đang đăng nhập" });
    const result = await getDatabase().collection("Users").deleteOne({ _id: accountId });
    if (!result.deletedCount) return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    res.json({ message: "Đã xóa tài khoản" });
  } catch (error) { next(error); }
});

export default router;
