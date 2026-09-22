import React from "react";

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaType = "up", // "up" | "down" | "neutral"
  theme = "teal", // "teal" | "blue" | "gold" | "green" | "amber" | "red" | "purple"
  valueClass = "",
  badge,
  badgeType = "neutral",
  onClick,
}) {
  const themeColors = {
    teal: {
      bg: "#E7F0EE",
      color: "#3D7068",
      border: "#B5D2CB",
    },
    blue: {
      bg: "#E7F0EE",
      color: "#3D7068",
      border: "#B5D2CB",
    },
    green: {
      bg: "#ECFDF5",
      color: "#059669",
      border: "#A7F3D0",
    },
    amber: {
      bg: "#FFFBEB",
      color: "#D97706",
      border: "#FDE68A",
    },
    red: {
      bg: "#FEF2F2",
      color: "#DC2626",
      border: "#FECACA",
    },
    purple: {
      bg: "#F5F3FF",
      color: "#7C3AED",
      border: "#DDD6FE",
    },
  };

  const currentTheme = themeColors[theme] || themeColors.blue;

  return (
    <article
      className={`erp-kpi-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="erp-kpi-inner">
        {Icon && (
          <div
            className="erp-kpi-icon-box"
            style={{
              backgroundColor: currentTheme.bg,
              color: currentTheme.color,
            }}
            aria-hidden="true"
          >
            <Icon className="erp-kpi-icon" />
          </div>
        )}

        <div className="erp-kpi-content">
          <span className="erp-kpi-label">{label}</span>
          <div className="erp-kpi-value-row">
            <span className={`erp-kpi-value ${valueClass}`}>{value}</span>
            {badge && (
              <span className={`stat-badge badge-${badgeType}`}>{badge}</span>
            )}
          </div>

          {delta && (
            <div className={`erp-kpi-trend ${deltaType}`}>
              {deltaType === "up" && (
                <span className="trend-arrow" aria-hidden="true">↑</span>
              )}
              {deltaType === "down" && (
                <span className="trend-arrow" aria-hidden="true">↓</span>
              )}
              <span>{delta}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
