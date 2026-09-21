<<<<<<< HEAD
import React from "react";

=======
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
<<<<<<< HEAD
  deltaType = "up", // "up" | "down" | "neutral"
  theme = "teal", // "teal" | "blue" | "gold" | "green" | "amber" | "red" | "purple"
  valueClass = "",
=======
  valueClass = "",
  deltaDown = false,
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
  badge,
  badgeType = "neutral",
  onClick,
}) {
<<<<<<< HEAD
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
=======
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
>>>>>>> b09e6a4054903e1171bf23c060638f846ef913de
    </article>
  );
}
