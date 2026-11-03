import React from "react";

// Secondary view switcher shown under a primary destination.
// Items marked `secondary` collapse into a native <details> "More" menu so the
// bar stays short on phones and remains keyboard accessible.
export function SectionNav({ label, items, active, onSelect }) {
  const primary = items.filter((item) => !item.secondary);
  const secondary = items.filter((item) => item.secondary);
  const secondaryActive = secondary.some((item) => item.key === active);
  return (
    <nav className="sectionNav" aria-label={label}>
      {primary.map((item) => (
        <button
          key={item.key}
          type="button"
          className={active === item.key ? "active" : ""}
          aria-current={active === item.key ? "page" : undefined}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
          {typeof item.count === "number" && item.count > 0 && <span className="sectionNavCount">{item.count}</span>}
        </button>
      ))}
      {secondary.length > 0 && (
        <details className={secondaryActive ? "sectionNavMore active" : "sectionNavMore"}>
          <summary>{secondaryActive ? secondary.find((item) => item.key === active).label : "More"}</summary>
          <div className="sectionNavMoreList">
            {secondary.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={active === item.key ? "page" : undefined}
                onClick={(event) => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  onSelect(item.key);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </nav>
  );
}
