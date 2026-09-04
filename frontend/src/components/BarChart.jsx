const CHART_H = 160; // px chiều cao vùng cột

export function BarChart({ data, labels }) {
  const max = Math.max(1, ...data);
  const hasData = data.some((v) => v > 0);

  return (
    <div style={{ display: "flex", gap: 8, padding: "0 4px" }}>
      {data.map((value, index) => {
        const barPx = hasData
          ? Math.max((value / max) * CHART_H, value > 0 ? 6 : 0)
          : 0;
        const labelVal =
          value >= 10
            ? `${(value / 10).toFixed(1)}tr`
            : value > 0
            ? `${value.toFixed(1)}`
            : "";
        return (
          <div
            key={labels[index]}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Vùng cột cố định, cột mọc từ dưới lên */}
            <div
              style={{
                width: "100%",
                height: CHART_H,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {labelVal && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-faint)",
                    marginBottom: 3,
                    lineHeight: 1,
                  }}
                >
                  {labelVal}
                </span>
              )}
              <div
                style={{
                  width: "100%",
                  height: barPx,
                  background: "var(--primary)",
                  borderRadius: "5px 5px 0 0",
                  transition: "height 0.4s ease",
                  cursor: "default",
                }}
                title={
                  value > 0
                    ? `${labels[index]}: ${(value * 100000).toLocaleString("vi-VN")}đ`
                    : undefined
                }
              />
            </div>
            {/* Nhãn ngày bên dưới */}
            <span
              style={{
                fontSize: "10.5px",
                color: "var(--text-faint)",
                marginTop: 6,
                whiteSpace: "nowrap",
              }}
            >
              {labels[index]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value, max, label, amount }) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: 5 }}>
        <span>{label}</span>
        <strong>{amount}</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} />
      </div>
    </div>
  );
}
