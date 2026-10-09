function ModeIcon({type}) {
  if (type === "trophy") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10 5h12v5c0 5-2 8-6 9-4-1-6-4-6-9V5Zm6 14v6m-5 2h10m-12-17H5v2c0 4 2 6 6 6m10-8h6v2c0 4-2 6-6 6" />
        <path d="m16 8 1.2 2.3 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4L16 8Z" />
      </svg>
    );
  }

  if (type === "lightning") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M18 3 7 17h8l-1 12 11-16h-8l1-10Z" />
      </svg>
    );
  }

  if (type === "players") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="10" r="4" />
        <circle cx="7" cy="13" r="3" />
        <circle cx="25" cy="13" r="3" />
        <path d="M8 27v-3c0-4 3-7 8-7s8 3 8 7v3H8Zm-6 0v-3c0-3 2-5 5-5m23 8v-3c0-3-2-5-5-5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m19 3 1 3a11 11 0 0 1 2 1l3-1 3 5-2 2v3l2 2-3 5-3-1-2 1-1 3h-6l-1-3-2-1-3 1-3-5 2-2v-3l-2-2 3-5 3 1 2-1 1-3h6Z" />
      <circle cx="16" cy="15" r="4" />
    </svg>
  );
}

function FeatureIcon({index, customizable}) {
  if (index === 2 && !customizable) {
    return <span className="mode-feature-icon mode-feature-star">★</span>;
  }

  if (customizable && index === 1) {
    return <span className="mode-feature-icon mode-feature-outline">☆</span>;
  }

  if (customizable && index === 2) {
    return <span className="mode-feature-icon mode-feature-ban">⊘</span>;
  }

  return (
    <svg className="mode-feature-icon" viewBox="0 0 20 20" aria-hidden="true">
      {index === 0 ? (
        <path d="m3 7 7-4 7 4-7 4-7-4Zm0 4 7 4 7-4M3 15l7 4 7-4" />
      ) : (
        <path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" />
      )}
    </svg>
  );
}

export default function MatchModeCard({mode, selected, onSelect}) {
  return (
    <button
      className={`mode-card ${selected ? "is-selected" : ""}`}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
    >
      <span className="mode-card-icon">
        <ModeIcon type={mode.icon} />
      </span>
      {selected && (
        <span className="mode-card-selected" aria-label="Seleccionado">
          ✓
        </span>
      )}
      <span className="mode-card-name">{mode.name}</span>
      <span className="mode-card-description">{mode.description}</span>
      <span className="mode-card-features">
        {mode.features.map((feature, index) => (
          <span className="mode-card-feature" key={feature}>
            <FeatureIcon index={index} customizable={mode.isCustomizable} />
            <span>{feature}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
