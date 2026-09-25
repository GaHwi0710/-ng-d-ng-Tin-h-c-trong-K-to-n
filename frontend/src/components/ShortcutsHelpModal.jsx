import { Modal } from "./Modal.jsx";
import { CommandLineIcon } from "@heroicons/react/24/outline";

export function ShortcutsHelpModal({ open, onClose }) {
  const shortcutGroups = [
    {
      category: "Điều hướng toàn hệ thống",
      shortcuts: [
        { keys: ["Ctrl", "K"], desc: "Mở thanh tìm kiếm nhanh (Command Palette)" },
        { keys: ["Ctrl", "B"], desc: "Thu gọn hoặc mở rộng thanh menu bên trái" },
        { keys: ["?"], desc: "Mở bảng trợ giúp phím tắt này" },
        { keys: ["Esc"], desc: "Đóng cửa sổ modal / hủy thao tác" },
      ],
    },
    {
      category: "Thao tác nghiệp vụ nhanh",
      shortcuts: [
        { keys: ["F2"], desc: "Truy cập nhanh màn hình Bán hàng (POS)" },
        { keys: ["F4"], desc: "Tra cứu khách hàng / điểm tích lũy" },
        { keys: ["F9"], desc: "Mở phân hệ Báo cáo kinh doanh & Quản trị" },
        { keys: ["Enter"], desc: "Xác nhận hành động trong hộp thoại" },
      ],
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Phím tắt hệ thống (Keyboard Shortcuts)"
      subtitle="Tối ưu tốc độ thao tác cho nhân viên bán hàng, thủ kho và kế toán"
      cancelLabel="Đóng"
    >
      <div className="shortcuts-modal-content">
        {shortcutGroups.map((group) => (
          <div key={group.category} className="shortcuts-group">
            <h4 className="shortcuts-group-title">{group.category}</h4>
            <div className="shortcuts-list">
              {group.shortcuts.map((sc, idx) => (
                <div key={idx} className="shortcuts-row">
                  <span className="shortcuts-desc">{sc.desc}</span>
                  <div className="shortcuts-keys">
                    {sc.keys.map((k, ki) => (
                      <kbd key={ki} className="erp-kbd">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="shortcuts-tip">
          <CommandLineIcon className="shortcuts-tip-icon" />
          <span>
            <strong>Mẹo chuyên nghiệp:</strong> Nhấn <code>Ctrl + K</code> bất kỳ lúc nào để chuyển nhanh giữa các phân hệ mà không cần rời tay khỏi bàn phím!
          </span>
        </div>
      </div>
    </Modal>
  );
}
