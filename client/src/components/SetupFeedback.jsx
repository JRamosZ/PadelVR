export default function SetupFeedback({loading = false, error = false, title, children}) {
  if (loading) {
    return (
      <div className="setup-feedback" role="status">
        <span className="loading-spinner" />
        {children}
      </div>
    );
  }

  return (
    <div className={`setup-feedback ${error ? "setup-feedback-error" : ""}`} role="alert">
      <span className="feedback-icon" aria-hidden="true">
        !
      </span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
