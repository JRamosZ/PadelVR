function ScoreIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="7" y="11" width="34" height="26" rx="3" />
      <path d="M24 14v20M15 18v4m18-4v4" />
      <text x="14" y="30">
        0
      </text>
      <text x="28" y="30">
        0
      </text>
    </svg>
  );
}

function NewMatchIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="18" />
      <path d="M24 15v18M15 24h18" />
    </svg>
  );
}

function LastMatchIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M13 8h22v32H13zM18 16h12M18 22h12M18 28h7" />
      <path d="m28 33 3 3 6-7" />
    </svg>
  );
}

export default function MatchOptionCard({
  variant,
  title,
  description,
  disabled = false,
  onClick,
  descriptionId,
}) {
  const Icon = variant === "new"
    ? NewMatchIcon
    : variant === "last"
      ? LastMatchIcon
      : ScoreIcon;

  return (
    <button
      className={`setup-card setup-card-${variant} ${disabled ? "is-disabled" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-describedby={descriptionId}
    >
      <span className="setup-card-icon">
        <Icon />
      </span>
      <span className="setup-card-content">
        <strong>{title}</strong>
        <span id={descriptionId}>{description}</span>
      </span>
      <span className="setup-card-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
