const STATUS_MAP = {
  "Đang bán": "green",
  "Đã xác nhận": "green",
  "Hoàn tất": "green",
  "Hoàn thành": "green",
  "Đã thanh toán": "green",
  "Đã xử lý": "green",
  "Đã lưu": "green",
  "Hoạt động": "green",
  "Khớp hoàn toàn": "green",
  "Thừa kiểm kê": "green",
  "Đã điều chỉnh": "green",
  "Đang chờ": "amber",
  "Đang chờ nhập": "amber",
  "Chờ xuất kho": "amber",
  "Chờ điều chỉnh": "amber",
  "Đang xử lý": "amber",
  "Nhập một phần": "amber",
  "Còn nợ": "amber",
  "Chưa thanh toán": "red",
  "Hao hụt / thất thoát": "red",
  "Đã hủy": "red",
  "Ngừng bán": "gray",
  "Ngưng hoạt động": "gray",
};

export function Badge({ children, variant = "gray" }) {
  return <mark className={`badge badge-${variant}`}>{children}</mark>;
}

export function StatusBadge({ status }) {
  const variant = STATUS_MAP[status] || "gray";
  return <Badge variant={variant}>{status}</Badge>;
}
