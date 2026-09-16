import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import {
  ACTIONS,
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  invalidateRoleCache,
} from "../shared/permissions.js";

const router = Router();
const SYSTEM_ROLE_KEYS = Object.keys(DEFAULT_ROLE_PERMISSIONS);

function parseId(value) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

// Lọc và chuẩn hóa ma trận quyền gửi từ client
function cleanPermissions(input) {
  const out = {};
  if (!input || typeof input !== "object") return out;
  const validKeys = new Set(PERMISSION_MODULES.map((m) => m.key));
  for (const [moduleKey, actions] of Object.entries(input)) {
    if (!validKeys.has(moduleKey)) continue;
    const list = Array.isArray(actions) ? actions.filter((a) => ACTIONS.includes(a)) : [];
    if (list.length) out[moduleKey] = [...new Set(list)];
  }
  return out;
}

function serialize(role) {
  const { _id, ...data } = role;
  return { id: _id.toString(), ...data };
}

router.get("/", async (_req, res, next) => {
  try {
    const db = getDatabase();
    const [roles, usersByRole] = await Promise.all([
      db.collection("VaiTro").find().sort({ MaVaiTro: 1 }).toArray(),
      db.collection("Users").aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]).toArray(),
    ]);
    const counts = new Map(usersByRole.map((u) => [u._id, u.count]));
    res.json({
      data: roles.map((role) => ({
        ...serialize(role),
        LaVaiTroHeThong: role.LaVaiTroHeThong ?? SYSTEM_ROLE_KEYS.includes(role.MaKey),
        SoNguoiDung: counts.get(role.MaKey) || 0,
      })),
    });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const db = getDatabase();
    const TenVaiTro = String(req.body.TenVaiTro || "").trim();
    if (!TenVaiTro) return res.status(400).json({ message: "Tên vai trò là bắt buộc" });
    if (await db.collection("VaiTro").findOne({ TenVaiTro })) {
      return res.status(409).json({ message: "Tên vai trò đã tồn tại" });
    }
    const maxDoc = await db.collection("VaiTro").find().sort({ MaVaiTro: -1 }).limit(1).next();
    const MaVaiTro = (Number(maxDoc?.MaVaiTro) || 0) + 1;
    const document = {
      MaVaiTro,
      MaKey: `VT_${MaVaiTro}`,
      TenVaiTro,
      MoTa: String(req.body.MoTa || "").trim(),
      QuyenHan: cleanPermissions(req.body.QuyenHan),
      LaVaiTroHeThong: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection("VaiTro").insertOne(document);
    invalidateRoleCache(document.MaKey);
    res.status(201).json({ data: serialize({ _id: result.insertedId, ...document }), message: "Đã tạo vai trò mới" });
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const db = getDatabase();
    const _id = parseId(req.params.id);
    if (!_id) return res.status(400).json({ message: "ID vai trò không hợp lệ" });
    const role = await db.collection("VaiTro").findOne({ _id });
    if (!role) return res.status(404).json({ message: "Không tìm thấy vai trò" });

    const update = { updatedAt: new Date() };
    const newName = String(req.body.TenVaiTro || "").trim();
    if (newName && newName !== role.TenVaiTro) {
      const dup = await db.collection("VaiTro").findOne({ TenVaiTro: newName, _id: { $ne: _id } });
      if (dup) return res.status(409).json({ message: "Tên vai trò đã tồn tại" });
      update.TenVaiTro = newName;
    }
    if (req.body.MoTa !== undefined) update.MoTa = String(req.body.MoTa).trim();
    if (req.body.QuyenHan !== undefined) update.QuyenHan = cleanPermissions(req.body.QuyenHan);

    await db.collection("VaiTro").updateOne({ _id }, { $set: update });
    invalidateRoleCache(role.MaKey);
    const fresh = await db.collection("VaiTro").findOne({ _id });
    res.json({ data: serialize(fresh), message: "Đã cập nhật vai trò và quyền hạn" });
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const db = getDatabase();
    const _id = parseId(req.params.id);
    const role = _id && (await db.collection("VaiTro").findOne({ _id }));
    if (!role) return res.status(404).json({ message: "Không tìm thấy vai trò" });
    if (role.LaVaiTroHeThong || SYSTEM_ROLE_KEYS.includes(role.MaKey)) {
      return res.status(400).json({ message: "Vai trò hệ thống không thể xóa" });
    }
    const inUse = await db.collection("Users").countDocuments({ role: role.MaKey });
    if (inUse) {
      return res.status(400).json({ message: `Không thể xóa: đang có ${inUse} tài khoản sử dụng vai trò này` });
    }
    await db.collection("VaiTro").deleteOne({ _id });
    invalidateRoleCache(role.MaKey);
    res.json({ message: "Đã xóa vai trò" });
  } catch (error) { next(error); }
});

export default router;
