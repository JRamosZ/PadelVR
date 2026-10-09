import {useEffect, useState} from "react";
import {getApiHealth, getCourts} from "../services/courtsApi.js";

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [courtState, setCourtState] = useState({status: "loading", courts: []});

  useEffect(() => {
    const controller = new AbortController();

    getApiHealth(controller.signal)
      .then(() => setApiStatus("connected"))
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus("offline");
      });

    getCourts(controller.signal)
      .then(({courts}) => {
        if (!Array.isArray(courts)) {
          throw new Error("The server returned an invalid courts list.");
        }

        setCourtState({status: "ready", courts});
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setCourtState({status: "error", courts: [], message: error.message});
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="PadelVR home">
          <span className="wordmark-mark" aria-hidden="true">
            P
          </span>
          PADEL<span>VR</span>
        </a>
        <div className="connection" aria-live="polite">
          <span className={`connection-dot ${apiStatus}`} />
          API {apiStatus}
        </div>
      </header>
      <section className="welcome">
        <p className="eyebrow">YOUR COURT, REIMAGINED</p>
        <h1>
          Padel starts
          <br />
          here.
        </h1>
        <p className="intro">Select a court to see its availability and start a match.</p>
        <div className="court" aria-hidden="true">
          <div className="court-lines">
            <span />
            <span />
            <span />
          </div>
          <div className="court-net" />
          <div className="court-ball" />
        </div>
        <section className="home-courts" aria-labelledby="home-courts-title">
          <div className="home-courts-heading">
            <p className="eyebrow">CHOOSE YOUR COURT</p>
            <h2 id="home-courts-title">Courts</h2>
          </div>
          {courtState.status === "loading" && (
            <p className="home-courts-message" role="status">Loading courts...</p>
          )}
          {courtState.status === "error" && (
            <p className="home-courts-message home-courts-error" role="alert">
              Could not load courts. {courtState.message}
            </p>
          )}
          {courtState.status === "ready" && courtState.courts.length === 0 && (
            <p className="home-courts-message">No courts are available yet.</p>
          )}
          {courtState.status === "ready" && courtState.courts.length > 0 && (
            <div className="home-courts-grid">
              {courtState.courts.map((court) => (
                <a
                  className="home-court-card"
                  href={`/${encodeURIComponent(court.id)}`}
                  key={court.id}
                >
                  <span className="home-court-card-icon" aria-hidden="true">P</span>
                  <span className="home-court-card-content">
                    <strong>{court.name}</strong>
                    <span className={`home-court-status ${court.status === "AVAILABLE" ? "is-available" : ""}`}>
                      {court.status === "AVAILABLE" ? "Available" : court.status.replaceAll("_", " ")}
                    </span>
                  </span>
                  <span className="home-court-card-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </div>
          )}
        </section>
      </section>
      <footer className="home-footer">
        PADELVR <span>·</span> {courtState.status === "ready" ? `01 / ${String(courtState.courts.length).padStart(2, "0")}` : "01"}
      </footer>
    </main>
  );
}
