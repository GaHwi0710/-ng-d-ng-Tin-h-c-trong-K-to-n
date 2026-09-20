export function SkeletonRow({ columns = 5 }) {
  return (
    <tr className="erp-skeleton-row">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <div
            className="erp-skeleton-bar"
            style={{
              width: i === 0 ? "35%" : i === 1 ? "75%" : "55%",
            }}
          />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="stat-card erp-skeleton-card">
      <div className="erp-skeleton-bar" style={{ width: "40%", height: 14, marginBottom: 12 }} />
      <div className="erp-skeleton-bar" style={{ width: "65%", height: 26, marginBottom: 8 }} />
      <div className="erp-skeleton-bar" style={{ width: "50%", height: 12 }} />
    </div>
  );
}
