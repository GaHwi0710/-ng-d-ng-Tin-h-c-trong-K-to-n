import { nextBusinessCode } from "../shared/businessCode.js";

const roleNames = {
  QuanLy: "Quản lý",
  KeToan: "Kế toán",
  NhanVienBanHang: "Nhân viên bán hàng",
  NhanVienKho: "Nhân viên kho",
  NhanVienMuaHang: "Nhân viên mua hàng",
};

export function employeeFromAccount(account) {
  return {
    username: account.username,
    HoTen: account.fullName,
    VaiTro: roleNames[account.role] || roleNames.NhanVienBanHang,
    TrangThai: account.status === "disabled" ? "Đã nghỉ việc" : "Đang làm việc",
    createdAt: account.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

export async function syncEmployee(database, account, previousUsername = account.username) {
  const existing = await database.collection("NhanVien").findOne({ username: previousUsername });
  const update = { $set: employeeFromAccount(account) };
  if (existing?.MaNV) update.$set.MaNV = existing.MaNV;
  else update.$setOnInsert = { MaNV: await nextBusinessCode(database.collection("NhanVien"), "NhanVien") };
  await database.collection("NhanVien").updateOne(
    { username: previousUsername },
    update,
    { upsert: true },
  );
}

export { roleNames };
