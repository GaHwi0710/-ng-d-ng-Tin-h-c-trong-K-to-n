import React, { useState } from "react";

const moneyCompact = (v) => {
  const num = Number(v) || 0;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}tỷ`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}tr`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(0)}k`;
  return String(num);
};

const moneyFmt = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/**
 * LineChart - SVG Line Chart with gradient area fill and hover tooltips
 * Designed to match Reference 2 (Doanh thu theo ngày, Biến động nhập - xuất kho)
 */
export function LineChart({
  data = [], // [{ label: "01/09", value: 1000000, value2?: 500000 }]
  series = [{ key: "value", label: "Doanh thu", color: "#3D7068" }],
  height = 200,
  unit = "đ",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state" style={{ height }}>
        <span>Chưa có dữ liệu biểu đồ</span>
      </div>
    );
  }

  // Calculate max value across all series
  let maxVal = 0;
  series.forEach((s) => {
    data.forEach((d) => {
      const v = Number(d[s.key] || 0);
      if (v > maxVal) maxVal = v;
    });
  });
  if (maxVal <= 0) maxVal = 100000;

  // Round maxVal up to nice grid ceiling
  const yTicksCount = 4;
  const ceiling = Math.ceil(maxVal * 1.15);

  const paddingLeft = 55;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 32;
  const chartWidth = 540;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const getX = (index) => {
    if (data.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val) => {
    const ratio = Math.max(0, Math.min(1, val / ceiling));
    return paddingTop + innerHeight - ratio * innerHeight;
  };

  // Generate grid Y lines
  const gridTicks = [];
  for (let i = 0; i <= yTicksCount; i++) {
    const val = (ceiling / yTicksCount) * i;
    const y = getY(val);
    gridTicks.push({ val, y });
  }

  return (
    <div className="erp-chart-container" style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={idx} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines & Y labels */}
        {gridTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={chartWidth - paddingRight}
              y2={tick.y}
              stroke="#E2E8F0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              fill="#94A3B8"
              fontSize="10"
              fontFamily="system-ui, sans-serif"
            >
              {moneyCompact(tick.val)}
            </text>
          </g>
        ))}

        {/* Series paths (Area + Line) */}
        {series.map((s) => {
          const points = data.map((d, i) => ({
            x: getX(i),
            y: getY(Number(d[s.key] || 0)),
            val: Number(d[s.key] || 0),
          }));

          const pathD = points.reduce((acc, pt, i) => {
            return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
          }, "");

          const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`;

          return (
            <g key={s.key}>
              <path d={areaD} fill={`url(#gradient-${s.key})`} />
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === i ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke={s.color}
                  strokeWidth={hoverIndex === i ? 3 : 2}
                  style={{ transition: "r 0.15s ease, stroke-width 0.15s ease" }}
                />
              ))}
            </g>
          );
        })}

        {/* X labels & hover hitboxes */}
        {data.map((d, i) => {
          const x = getX(i);
          return (
            <g key={i}>
              <text
                x={x}
                y={paddingTop + innerHeight + 18}
                textAnchor="middle"
                fill={hoverIndex === i ? "#0F172A" : "#94A3B8"}
                fontWeight={hoverIndex === i ? "600" : "400"}
                fontSize="10.5"
                fontFamily="system-ui, sans-serif"
              >
                {d.label}
              </text>
              <rect
                x={x - (innerWidth / (data.length || 1)) / 2}
                y={paddingTop}
                width={innerWidth / (data.length || 1)}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            </g>
          );
        })}

        {/* Hover vertical guide line & tooltip */}
        {hoverIndex !== null && data[hoverIndex] && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={paddingTop}
              x2={getX(hoverIndex)}
              y2={paddingTop + innerHeight}
              stroke="#94A3B8"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>

      {/* Floating tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="erp-chart-tooltip"
          style={{
            position: "absolute",
            left: `${(getX(hoverIndex) / chartWidth) * 100}%`,
            top: 6,
            transform: "translate(-50%, -100%)",
            background: "#0F172A",
            color: "#FFFFFF",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            lineHeight: 1.4,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 600, color: "#94A3B8", marginBottom: 2 }}>
            {data[hoverIndex].label}
          </div>
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: s.color,
                  display: "inline-block",
                }}
              />
              <span>{s.label}: </span>
              <strong>
                {unit === "đ"
                  ? moneyFmt.format(data[hoverIndex][s.key] || 0)
                  : `${(data[hoverIndex][s.key] || 0).toLocaleString("vi-VN")} ${unit}`}
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Series legend if multiple */}
      {series.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 6,
            fontSize: "12px",
            color: "#475569",
          }}
        >
          {series.map((s) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: s.color,
                  display: "inline-block",
                }}
              />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * DonutChart - SVG Donut Chart with center summary value and legend
 * Designed to match Reference 2 & 3 (Cơ cấu doanh thu, Tỷ trọng loại giao dịch, Cơ cấu công nợ)
 */
export function DonutChart({
  data = [], // [{ label: "Cửa hàng trực tiếp", value: 45000000, color: "#3D7068" }]
  centerValue = "",
  centerLabel = "Tổng",
  size = 220,
  unit = "đ",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const defaultColors = [
    "#3D7068", // Signature Teal Green
    "#2A4F49", // Deep Forest Teal
    "#10B981", // Emerald Green
    "#F59E0B", // Amber
    "#8B5CF6", // Violet
    "#14B8A6", // Teal
    "#EC4899", // Pink
  ];

  if (!data || data.length === 0 || total <= 0) {
    return (
      <div className="chart-empty-state" style={{ height: size }}>
        <div style={{ color: "#94A3B8", fontSize: "13px" }}>Chưa có dữ liệu phân bổ</div>
      </div>
    );
  }

  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div
      className="erp-donut-container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {/* SVG Donut Circle */}
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)", overflow: "visible" }}
        >
          {/* Base background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />

          {data.map((item, index) => {
            const val = Number(item.value) || 0;
            const percent = val / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;
            const color = item.color || defaultColors[index % defaultColors.length];
            const isHovered = hoverIndex === index;

            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: "stroke-width 0.2s ease, filter 0.2s ease",
                  cursor: "pointer",
                  filter: isHovered ? "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" : "none",
                }}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center label & total value */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 24px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#0F172A",
              lineHeight: 1.2,
            }}
          >
            {centerValue || moneyCompact(total)}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#64748B",
              marginTop: 2,
              fontWeight: 500,
            }}
          >
            {centerLabel}
          </span>
        </div>
      </div>

      {/* Legend List */}
      <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((item, index) => {
          const val = Number(item.value) || 0;
          const pct = Math.round((val / total) * 100);
          const color = item.color || defaultColors[index % defaultColors.length];
          const isHovered = hoverIndex === index;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                fontSize: "12px",
                padding: "3px 6px",
                borderRadius: "4px",
                background: isHovered ? "#F1F5F9" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "#334155",
                    fontWeight: isHovered ? 600 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={item.label}
                >
                  {item.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ color: "#0F172A", fontWeight: 600 }}>{pct}%</span>
                {val > 0 && unit === "đ" && (
                  <span style={{ color: "#94A3B8", fontSize: "11px" }}>
                    ({moneyCompact(val)})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * VerticalBarChart - SVG Bar chart with rounded bar caps
 * Designed to match Reference 3 (Giá trị tồn kho theo nhóm sản phẩm)
 */
export function VerticalBarChart({
  data = [], // [{ label: "Thời trang", value: 500000000 }]
  height = 200,
  barColor = "#10B981", // Emerald green like Ref 3
  unit = "đ",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty-state" style={{ height }}>
        <span>Chưa có dữ liệu thống kê cột</span>
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Number(d.value || 0)));
  const ceiling = Math.ceil(maxVal * 1.15);

  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 32;
  const chartWidth = 520;
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const yTicks = [0, ceiling * 0.33, ceiling * 0.66, ceiling];
  const barWidth = Math.min(36, Math.max(16, innerWidth / (data.length * 2)));

  return (
    <div className="erp-chart-container" style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        {/* Y Grid lines */}
        {yTicks.map((val, i) => {
          const y = paddingTop + innerHeight - (val / ceiling) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {moneyCompact(val)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = Number(d.value || 0);
          const barHeight = Math.max(2, (val / ceiling) * innerHeight);
          const x =
            paddingLeft +
            (i + 0.5) * (innerWidth / data.length) -
            barWidth / 2;
          const y = paddingTop + innerHeight - barHeight;
          const isHovered = hoverIndex === i;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="6"
                ry="6"
                fill={isHovered ? "#059669" : barColor}
                style={{
                  transition: "fill 0.15s ease, y 0.2s ease, height 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              <text
                x={x + barWidth / 2}
                y={paddingTop + innerHeight + 18}
                textAnchor="middle"
                fill={isHovered ? "#0F172A" : "#64748B"}
                fontWeight={isHovered ? 600 : 400}
                fontSize="11"
                fontFamily="system-ui, sans-serif"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          style={{
            position: "absolute",
            left: `${
              ((paddingLeft +
                (hoverIndex + 0.5) * (innerWidth / data.length)) /
                chartWidth) *
              100
            }%`,
            top: 8,
            transform: "translate(-50%, -100%)",
            background: "#0F172A",
            color: "#FFFFFF",
            padding: "5px 9px",
            borderRadius: "5px",
            fontSize: "11px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 600 }}>{data[hoverIndex].label}</div>
          <div style={{ color: "#34D399" }}>
            {unit === "đ"
              ? moneyFmt.format(data[hoverIndex].value || 0)
              : `${(data[hoverIndex].value || 0).toLocaleString("vi-VN")} ${unit}`}
          </div>
        </div>
      )}
    </div>
  );
}
