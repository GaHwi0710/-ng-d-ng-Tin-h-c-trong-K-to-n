const STATUS_MAP = {
  "Đang bán": "green",
  "Đã xác nhận": "green",
  "Hoàn tất": "green",
  "Hoàn thành": "green",
  "Đã thanh toán": "green",
  "Đã thanh toán đủ": "green",
  "Đã trả": "green",
  "Đã đối soát": "green",
  "Đã xử lý": "green",
  "Đã lưu": "green",
  "Hoạt động": "green",
  "Khớp hoàn toàn": "green",
  "Thừa kiểm kê": "green",
  "Đã điều chỉnh": "green",
  "Tiền mặt": "green",

  "Đang chờ": "amber",
  "Đang chờ nhập": "amber",
  "Chờ xuất kho": "amber",
  "Chờ điều chỉnh": "amber",
  "Chờ thanh toán": "amber",
  "Đang xử lý": "amber",
  "Nhập một phần": "amber",
  "Thanh toán một phần": "amber",
  "Còn nợ": "amber",

  "Chưa thanh toán": "red",
  "Nợ quá hạn": "red",
  "Hao hụt / thất thoát": "red",
  "Đã hủy": "red",
  "Ngưng hoạt động": "red",

  "Chuyển khoản": "blue",
  "Ngân hàng": "blue",

  "Ngừng bán": "gray",
  "Tạm tính": "gray",
  "Đã khóa sổ": "gray",
};

export function Badge({ children, variant = "gray" }) {
  return (
    <mark className={`badge badge-${variant}`}>
      <span className="badge-dot" aria-hidden="true" />
      {children}
    </mark>
  );
}

export function StatusBadge({ status }) {
  const variant = STATUS_MAP[status] || "gray";
  return <Badge variant={variant}>{status}</Badge>;
}
