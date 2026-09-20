import { InboxIcon } from "@heroicons/react/24/outline";

export function EmptyState({
  icon: Icon = InboxIcon,
  title = "Không có dữ liệu",
  description = "Hiện tại chưa có bản ghi nào phù hợp với bộ lọc hoặc tìm kiếm.",
  actionLabel,
  actionText,
  onAction,
}) {
  const label = actionLabel || actionText;
  return (
    <div className="erp-empty-state">
      <div className="erp-empty-icon-wrap">
        <Icon className="erp-empty-icon" aria-hidden="true" />
      </div>
      <h3 className="erp-empty-title">{title}</h3>
      <p className="erp-empty-desc">{description}</p>
      {label && onAction && (
        <button
          type="button"
          className="btn btn-primary btn-sm erp-empty-action"
          onClick={onAction}
        >
          {label}
        </button>
      )}
    </div>
  );
}
