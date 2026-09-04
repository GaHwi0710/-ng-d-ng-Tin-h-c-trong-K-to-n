const STATUS_MAP = {
  "Đang bán": "green",
  "Đã xác nhận": "green",
  "Hoàn tất": "green",
  "Đã thanh toán": "green",
  "Đã xử lý": "green",
  "Đã lưu": "green",
  "Đang chờ": "amber",
  "Chờ xuất kho": "amber",
  "Đang xử lý": "amber",
  "Chưa thanh toán": "red",
  "Ngừng bán": "gray",
};

export function Badge({ children, variant = "gray" }) {
  return <mark className={`badge badge-${variant}`}>{children}</mark>;
}

export function StatusBadge({ status }) {
  const variant = STATUS_MAP[status] || "gray";
  return <Badge variant={variant}>{status}</Badge>;
}
