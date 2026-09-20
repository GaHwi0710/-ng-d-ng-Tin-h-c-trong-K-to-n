export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  valueClass = "",
  deltaDown = false,
  badge,
  badgeType = "neutral",
  onClick,
}) {
  return (
    <article
      className={`stat-card erp-stat-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="stat-icon-wrapper" aria-hidden="true">
            <Icon className="stat-icon" />
          </div>
        )}
      </div>

      <div className="stat-card-main">
        <span className={`stat-value ${valueClass}`}>{value}</span>
        {badge && (
          <span className={`stat-badge badge-${badgeType}`}>{badge}</span>
        )}
      </div>

      {delta && (
        <div className={`stat-delta ${deltaDown ? "down" : ""}`}>
          <span>{delta}</span>
        </div>
      )}
    </article>
  );
}
