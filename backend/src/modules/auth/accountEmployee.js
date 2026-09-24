import { nextBusinessCode } from "../shared/businessCode.js";

const roleNames = {
  QuanTriHeThong: "Quản trị hệ thống",
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "Nhân viên bán hàng",
  ThuKho: "Thủ kho",
  NhanVienKho: "Thủ kho",
  NhanVienMuaHang: "Nhân viên mua hàng",
};
const roleCodes = {
  QuanTriHeThong: 1,
  QuanLy: 2,
  NhanVienBanHang: 3,
  ThuKho: 4,
  NhanVienKho: 4,
  KeToan: 5,
  NhanVienMuaHang: 6,
};

export function isLockedStatus(status) {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return (
    s === "đã khóa" ||
    s === "đã khoá" ||
    s === "khóa" ||
    s === "khoá" ||
    s === "disabled" ||
    s === "inactive" ||
    s === "locked" ||
    s === "nghỉ việc" ||
    s === "đã nghỉ việc" ||
    s === "ngưng hoạt động"
  );
}

export function employeeFromAccount(account, existing = null) {
  const isLocked = isLockedStatus(account.status) || isLockedStatus(account.TrangThai);
  return {
    username: account.username,
    HoTen: account.fullName || account.HoTen || existing?.HoTen || "",
    SDT: account.SDT || account.phone || existing?.SDT || "",
    DiaChi: account.DiaChi || account.address || existing?.DiaChi || "",
    CCCD: account.CCCD || account.citizenId || existing?.CCCD || "",
    MaVaiTro: roleCodes[account.role] || (existing?.MaVaiTro ?? roleCodes.NhanVienBanHang),
    VaiTro: roleNames[account.role] || account.VaiTro || existing?.VaiTro || roleNames.NhanVienBanHang,
    TrangThai: isLocked ? "Đã khóa" : "Đang làm việc",
    createdAt: account.createdAt || existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

export async function syncEmployee(database, account, previousUsername = account.username) {
  const existing = await database.collection("NhanVien").findOne({ username: previousUsername });

  // Vai trò hệ thống dùng bảng tra cứu; vai trò tùy chỉnh tra cứu từ collection VaiTro
  let maVaiTro = roleCodes[account.role];
  let vaiTroName = roleNames[account.role];
  if (!maVaiTro && account.role) {
    try {
      const roleDoc = await database.collection("VaiTro").findOne({ MaKey: account.role });
      if (roleDoc) {
        maVaiTro = roleDoc.MaVaiTro;
        vaiTroName = roleDoc.TenVaiTro;
      }
    } catch {
      // Giữ mặc định bên dưới nếu tra cứu lỗi
    }
  }

  const isLocked = isLockedStatus(account.status) || isLockedStatus(account.TrangThai);
  const empData = {
    username: account.username,
    HoTen: account.fullName || account.HoTen || existing?.HoTen || "",
    SDT: account.SDT || account.phone || existing?.SDT || "",
    DiaChi: account.DiaChi || account.address || existing?.DiaChi || "",
    CCCD: account.CCCD || account.citizenId || existing?.CCCD || "",
    MaVaiTro: maVaiTro || existing?.MaVaiTro || roleCodes.NhanVienBanHang,
    VaiTro: vaiTroName || account.VaiTro || existing?.VaiTro || roleNames.NhanVienBanHang,
    TrangThai: isLocked ? "Đã khóa" : "Đang làm việc",
    createdAt: account.createdAt || existing?.createdAt || new Date(),
    updatedAt: new Date(),
  };  const update = { $set: empData };
  if (existing?.MaNV) {
    update.$set.MaNV = existing.MaNV;
  } else {
    update.$setOnInsert = { MaNV: await nextBusinessCode(database.collection("NhanVien"), "NhanVien") };
  }
  await database.collection("NhanVien").updateOne(
    { username: previousUsername },
    update,
    { upsert: true },
  );
}

export { roleNames, roleCodes };

