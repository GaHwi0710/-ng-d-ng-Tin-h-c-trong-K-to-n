export function StatCard({ icon: Icon, label, value, delta, valueClass = "", deltaDown = false }) {
  return (
    <article className="stat-card">
      <p className="stat-label">
        {Icon && <Icon className="stat-icon" aria-hidden="true" />}
        {label}
      </p>
      <p className={`stat-value ${valueClass}`}>{value}</p>
      {delta && <p className={`stat-delta ${deltaDown ? "down" : ""}`}>{delta}</p>}
    </article>
  );
}
