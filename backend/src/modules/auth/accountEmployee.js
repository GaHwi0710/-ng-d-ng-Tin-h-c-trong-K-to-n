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
  await database.collection("NhanVien").updateOne(
    { username: previousUsername },
    { $set: employeeFromAccount(account) },
    { upsert: true },
  );
}

export { roleNames };
