export function FilterChips({ items, activeId, onSelect }) {
  return (
    <nav className="filter-chips" aria-label="Bộ lọc danh mục">
      {items.map((item) => (
        <button
          key={item.id}
          className={`filter-chip ${activeId === item.id ? "active" : ""}`}
          type="button"
          onClick={() => onSelect(item.id)}
          aria-pressed={activeId === item.id}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
