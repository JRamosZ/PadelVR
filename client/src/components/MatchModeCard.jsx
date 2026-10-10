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

function getFeatureType(feature, configuredType) {
  if (configuredType) return configuredType;
  const normalizedFeature = feature.toLocaleLowerCase();
  if (normalizedFeature.includes("set")) return "sets";
  if (normalizedFeature.includes("juego") || normalizedFeature.includes("game")) return "games";
  if (
    normalizedFeature.includes("ventaja") ||
    normalizedFeature.includes("puntuación") ||
    normalizedFeature.includes("punto de oro") ||
    normalizedFeature.includes("punto decisivo")
  ) {
    return "advantages";
  }
  if (
    normalizedFeature.includes("tie-break") ||
    normalizedFeature.includes("diferencia") ||
    normalizedFeature.includes("llegar a")
  ) {
    return "ending";
  }
  return "games";
}

function FeatureIcon({type}) {
  return (
    <svg className="mode-feature-icon" viewBox="0 0 20 20" aria-hidden="true">
      {type === "sets" && (
        <>
          <rect x="3" y="3" width="12" height="14" rx="1" />
          <path d="M6 6h6M6 9h6M6 12h3M6 17h11V6" />
        </>
      )}
      {type === "games" && (
        <>
          <rect x="2.5" y="3" width="15" height="14" rx="1" />
          <path d="M10 3v14M2.5 10h15M6 6.5h1m6 7h1" />
        </>
      )}
      {type === "advantages" && (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 6v8M6 10h8" />
        </>
      )}
      {type === "ending" && (
        <>
          <path d="M5 18V3m0 1h10l-2 3 2 3H5" />
          <path d="M8 6h2v2H8z" />
        </>
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
            <FeatureIcon type={getFeatureType(feature, mode.featureTypes?.[index])} />
            <span>{feature}</span>
          </span>
        ))}
      </span>
    </button>
  );
}
