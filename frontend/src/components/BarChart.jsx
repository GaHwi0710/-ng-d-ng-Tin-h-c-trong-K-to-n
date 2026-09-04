export function BarChart({ data, labels }) {
  const max = Math.max(1, ...data);

  return (
    <figure className="bar-chart" role="img" aria-label="Biểu đồ doanh thu">
      {data.map((value, index) => (
        <div className="col" key={labels[index]}>
          <div
            className="bar"
            style={{ height: `${(value / max) * 100}%` }}
            title={`${labels[index]}: ${value}`}
            aria-label={`${labels[index]}: ${value}`}
          />
          <span className="lbl">{labels[index]}</span>
        </div>
      ))}
    </figure>
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
