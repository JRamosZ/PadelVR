import {useEffect, useState} from "react";

export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then(() => setApiStatus("connected"))
      .catch(() => setApiStatus("offline"));
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
        <p className="intro">Your new home for the game is ready to take shape.</p>
        <div className="court" aria-hidden="true">
          <div className="court-lines">
            <span />
            <span />
            <span />
          </div>
          <div className="court-net" />
          <div className="court-ball" />
        </div>
      </section>
      <footer>
        PADELVR <span>·</span> 01 / 01
      </footer>
    </main>
  );
}
