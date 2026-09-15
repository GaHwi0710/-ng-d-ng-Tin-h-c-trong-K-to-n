import { nextBusinessCode } from "../shared/businessCode.js";

const roleNames = {
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "Nhân viên bán hàng",
  NhanVienKho: "Nhân viên kho",
  NhanVienMuaHang: "Nhân viên mua hàng",
};
const roleCodes = {
  QuanLy: 1,
  NhanVienBanHang: 2,
  NhanVienKho: 3,
  KeToan: 4,
  NhanVienMuaHang: 5,
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
  const empData = employeeFromAccount(account, existing);
  const update = { $set: empData };
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

