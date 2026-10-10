import {useState} from "react";
import Brand from "../components/Brand.jsx";
import MatchOptionCard from "../components/MatchOptionCard.jsx";
import SetupFeedback from "../components/SetupFeedback.jsx";
import SetupFooter from "../components/SetupFooter.jsx";
import {useCourtSetup} from "../hooks/useCourtSetup.js";

export default function CourtSetupPage({courtId}) {
  const result = useCourtSetup(courtId);
  const [notice, setNotice] = useState("");
  const isReady = result.status === "ready";
  const hasActiveMatch = isReady && Boolean(result.match);

  return (
    <main className="setup-page">
      <div className="setup-background" aria-hidden="true" />
      <header className="setup-header">
        <Brand />
        <div className="court-indicator" aria-live="polite">
          <span
            className={`court-indicator-dot ${result.status === "ready" ? "is-available" : ""}`}
          />
          {result.status === "loading" && "Verificando cancha"}
          {result.status === "ready" && result.court.name}
          {result.status === "unavailable" && "Cancha no disponible"}
          {(result.status === "error" || result.status === "not-found") &&
            "Sin conexión"}
        </div>
      </header>

      <section className="setup-content">
        <p className="setup-eyebrow">PADEL MATCH SYSTEM</p>
        <h1>Bienvenido</h1>
        <p className="setup-intro">
          Selecciona una opción para continuar
          <br className="desktop-break" /> con el sistema de marcador.
        </p>

        {result.status === "loading" && (
          <SetupFeedback loading>Comprobando el estado de la cancha...</SetupFeedback>
        )}

        {result.status === "unavailable" && (
          <SetupFeedback error title="Cancha no disponible">
            {result.court.name} no se encuentra disponible, por lo que no se
            puede iniciar un partido.
          </SetupFeedback>
        )}

        {(result.status === "error" || result.status === "not-found") && (
          <SetupFeedback error title="No se pudo cargar la cancha">
            {result.message}
          </SetupFeedback>
        )}

        {isReady && (
          <>
            <div className="setup-cards">
              <MatchOptionCard
                variant="new"
                title="Empezar nuevo partido"
                description="Configura los jugadores, reglas y condiciones del partido."
                descriptionId="new-match-description"
                onClick={() =>
                  window.location.assign(`/${encodeURIComponent(courtId)}/matches/new`)
                }
              />
              {hasActiveMatch && (
                <MatchOptionCard
                  variant="current"
                  title="Ver partido actual"
                  description="Consulta el marcador y el estado del partido actual."
                  descriptionId="current-match-description"
                  onClick={() =>
                    window.location.assign(
                      `/${encodeURIComponent(courtId)}/matches/${encodeURIComponent(result.match.id)}`,
                    )
                  }
                />
              )}
              {result.lastFinishedMatch && (
                <MatchOptionCard
                  variant="last"
                  title="Ver último partido"
                  description="Consulta los resultados y las estadísticas del último partido terminado."
                  descriptionId="last-match-description"
                  onClick={() =>
                    window.location.assign(
                      `/${encodeURIComponent(courtId)}/matches/${encodeURIComponent(result.lastFinishedMatch.id)}`,
                    )
                  }
                />
              )}
            </div>
            {notice && (
              <p className="setup-notice" role="status">
                {notice}
              </p>
            )}
          </>
        )}
      </section>

      <SetupFooter />
    </main>
  );
}
