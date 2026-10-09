export default function Brand() {
  return (
    <a className="setup-brand" href="/" aria-label="Padel Match System">
      <svg
        className="setup-brand-mark"
        viewBox="0 0 40 40"
        role="img"
        aria-label="Padel Match System"
      >
        <path d="M20 2 12 10l8 8 8-8-8-8Zm-10 10-8 8 8 8 8-8-8-8Zm20 0-8 8 8 8 8-8-8-8ZM20 22l-8 8 8 8 8-8-8-8Z" />
        <circle cx="20" cy="20" r="3" fill="#171717" />
      </svg>
      <span className="setup-brand-copy">
        <span>PADEL</span>
        <small>MATCH SYSTEM</small>
      </span>
    </a>
  );
}
