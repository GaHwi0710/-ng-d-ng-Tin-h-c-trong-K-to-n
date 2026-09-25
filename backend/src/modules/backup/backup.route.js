import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../config/mongodb.js";
import { recordAudit } from "../audit/audit.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, "../../../backups");

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const router = Router();

const BACKUP_COLLECTIONS = [
  "Users",
  "VaiTro",
  "KhachHang",
  "NhaCungCap",
  "LoaiHang",
  "SanPham",
  "DonDatHang",
  "CT_DonDatHang",
  "HoaDon",
  "CT_HoaDon",
  "PhieuThu",
  "ThanhToan",
  "TonKho",
  "NhanVien",
  "PhieuNhap",
  "CT_PhieuNhap",
  "PhieuXuat",
  "CT_PhieuXuat",
  "PhieuChi",
  "CongNo",
  "KiemKe",
  "CT_KiemKe",
  "DieuChinhKho",
  "KhuyenMai",
  "AuditLogs",
];

/**
 * Lập bản sao lưu (Backup) cơ sở dữ liệu
 */
router.post("/backup", async (req, res) => {
  try {
    const db = getDatabase();
    const backupData = {};
    let totalRecords = 0;

    for (const collName of BACKUP_COLLECTIONS) {
      try {
        const records = await db.collection(collName).find().toArray();
        backupData[collName] = records;
        totalRecords += records.length;
      } catch {
        backupData[collName] = [];
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `baby-shop-backup-${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, filename);

    const snapshot = {
      system: "Hệ thống Quản lý Cửa hàng Mẹ & Bé (Baby Shop)",
      schemaVersion: "1.0",
      createdAt: now.toISOString(),
      createdBy: req.user?.username || "admin",
      totalCollections: BACKUP_COLLECTIONS.length,
      totalRecords,
      collections: backupData,
    };

    const jsonString = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(filePath, jsonString, "utf8");
    const stats = fs.statSync(filePath);

    // Ghi nhật ký kiểm toán
    recordAudit({
      userId: req.user?.id,
      username: req.user?.username,
      role: req.user?.role,
      action: "BACKUP",
      module: "admin",
      entity: "Database",
      description: `Tạo bản sao lưu dữ liệu (${BACKUP_COLLECTIONS.length} collections, ${totalRecords} bản ghi)`,
      metadata: { filename, size: stats.size, totalRecords },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Tạo bản sao lưu thành công",
      filename,
      size: stats.size,
      totalCollections: BACKUP_COLLECTIONS.length,
      totalRecords,
      createdAt: now.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi tạo bản sao lưu: " + err.message });
  }
});

/**
 * Danh sách các bản sao lưu hiện có
 */
router.get("/backup/list", (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".json"));
    const backups = files.map((filename) => {
      const filePath = path.join(BACKUPS_DIR, filename);
      const stat = fs.statSync(filePath);
      return {
        filename,
        size: stat.size,
        createdAt: stat.birthtime || stat.mtime,
      };
    });

    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ message: "Lỗi lấy danh sách sao lưu: " + err.message });
  }
});

/**
 * Tải file sao lưu về máy
 */
router.get("/backup/download/:filename", (req, res) => {
  try {
    const rawFilename = path.basename(req.params.filename);
    if (!rawFilename.endsWith(".json")) {
      return res.status(400).json({ message: "File không hợp lệ" });
    }

    const filePath = path.join(BACKUPS_DIR, rawFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Không tìm thấy file sao lưu" });
    }

    res.download(filePath, rawFilename);
  } catch (err) {
    res.status(500).json({ message: "Lỗi tải file sao lưu: " + err.message });
  }
});

/**
 * Xem trước thông tin bản sao lưu trước khi xác nhận phục hồi
 */
router.post("/backup/restore/preview", async (req, res) => {
  try {
    let snapshot = req.body.snapshot;
    if (!snapshot && req.body.filename) {
      const rawFilename = path.basename(req.body.filename);
      const filePath = path.join(BACKUPS_DIR, rawFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Không tìm thấy file sao lưu" });
      }
      snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    if (!snapshot || typeof snapshot !== "object" || !snapshot.collections) {
      return res.status(400).json({ message: "Cấu trúc file sao lưu không hợp lệ. Thiếu trường 'collections'." });
    }

    const summaryCollections = Object.entries(snapshot.collections).map(([name, records]) => ({
      name,
      count: Array.isArray(records) ? records.length : 0,
    }));

    res.json({
      success: true,
      preview: {
        system: snapshot.system || "Hệ thống Quản lý Cửa hàng Mẹ & Bé",
        schemaVersion: snapshot.schemaVersion || "1.0",
        createdAt: snapshot.createdAt || "Không rõ",
        createdBy: snapshot.createdBy || "Không rõ",
        totalCollections: summaryCollections.length,
        totalRecords: summaryCollections.reduce((sum, c) => sum + c.count, 0),
        collections: summaryCollections,
      },
    });
  } catch (err) {
    res.status(400).json({ message: "Lỗi đọc file sao lưu: " + err.message });
  }
});

/**
 * Phục hồi cơ sở dữ liệu từ bản sao lưu an toàn
 */
router.post("/backup/restore", async (req, res) => {
  try {
    // 1. Kiểm tra xác nhận
    if (!req.body.confirm) {
      return res.status(400).json({
        message: "Thao tác phục hồi yêu cầu xác nhận rõ ràng (confirm: true). Dữ liệu hiện tại sẽ được thay đổi.",
      });
    }

    // 2. Lấy dữ liệu snapshot
    let snapshot = req.body.snapshot;
    let sourceFilename = req.body.filename || "uploaded-snapshot.json";

    if (!snapshot && req.body.filename) {
      const rawFilename = path.basename(req.body.filename);
      const filePath = path.join(BACKUPS_DIR, rawFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Không tìm thấy file sao lưu: " + req.body.filename });
      }
      snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
      sourceFilename = rawFilename;
    }

    if (!snapshot || typeof snapshot !== "object" || !snapshot.collections) {
      return res.status(400).json({ message: "File sao lưu không hợp lệ hoặc thiếu trường 'collections'." });
    }

    const db = getDatabase();

    // 3. TẠO BẢN SAO LƯU AN TOÀN TRƯỚC KHI PHỤC HỒI (Safety Pre-Restore Backup)
    const safetyData = {};
    let safetyRecords = 0;
    for (const collName of BACKUP_COLLECTIONS) {
      try {
        const records = await db.collection(collName).find().toArray();
        safetyData[collName] = records;
        safetyRecords += records.length;
      } catch {
        safetyData[collName] = [];
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const safetyFilename = `pre-restore-safety-backup-${dateStr}.json`;
    const safetyFilePath = path.join(BACKUPS_DIR, safetyFilename);

    const safetySnapshot = {
      system: "Hệ thống Quản lý Cửa hàng Mẹ & Bé (Tự động sao lưu an toàn trước khi phục hồi)",
      schemaVersion: "1.0",
      createdAt: now.toISOString(),
      createdBy: req.user?.username || "admin",
      purpose: "pre_restore_safety_backup",
      restoringFrom: sourceFilename,
      totalCollections: BACKUP_COLLECTIONS.length,
      totalRecords: safetyRecords,
      collections: safetyData,
    };

    fs.writeFileSync(safetyFilePath, JSON.stringify(safetySnapshot, null, 2), "utf8");

    // 4. TIẾN HÀNH PHỤC HỒI TỪNG COLLECTION
    let restoredCount = 0;
    const restoredColls = [];

    const objectIdKeys = new Set(["_id", "MaSP", "MaLoai", "MaNCC", "MaKH", "MaNV", "productId", "supplierId", "customerId"]);

    const deserializeDoc = (doc) => {
      if (!doc || typeof doc !== "object") return doc;
      const clone = { ...doc };
      for (const [key, val] of Object.entries(clone)) {
        if (objectIdKeys.has(key) && typeof val === "string" && ObjectId.isValid(val)) {
          clone[key] = new ObjectId(val);
        } else if (key === "createdAt" || key === "updatedAt") {
          if (typeof val === "string") {
            const d = new Date(val);
            if (!isNaN(d.getTime())) clone[key] = d;
          }
        } else if (Array.isArray(val)) {
          clone[key] = val.map((item) => (item && typeof item === "object" ? deserializeDoc(item) : item));
        }
      }
      return clone;
    };

    for (const [collName, records] of Object.entries(snapshot.collections)) {
      if (!Array.isArray(records) || !records.length) continue;

      await db.collection(collName).deleteMany({});
      const formattedRecords = records.map(deserializeDoc);
      await db.collection(collName).insertMany(formattedRecords);

      restoredCount += formattedRecords.length;
      restoredColls.push(collName);
    }

    // 5. GHI NHẬT KÝ KIỂM TOÁN (AUDIT LOG)
    recordAudit({
      userId: req.user?.id,
      username: req.user?.username || "admin",
      role: req.user?.role || "QuanLy",
      action: "RESTORE",
      module: "admin",
      entity: "Database",
      description: `Phục hồi cơ sở dữ liệu từ ${sourceFilename} (${restoredColls.length} collections, ${restoredCount} bản ghi). Bản lưu an toàn: ${safetyFilename}`,
      metadata: {
        sourceFilename,
        safetyFilename,
        restoredCollections: restoredColls,
        totalRecords: restoredCount,
      },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Phục hồi cơ sở dữ liệu thành công!",
      sourceFilename,
      safetyBackup: safetyFilename,
      totalRestoredCollections: restoredColls.length,
      totalRestoredRecords: restoredCount,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi phục hồi dữ liệu: " + err.message });
  }
});

export default router;
