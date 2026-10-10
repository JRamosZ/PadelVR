import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {recordSensorCommand, getMatchForScoreboard} from "../services/courtsApi.js";
import {getScoreboardHighlights} from "./scoreboard-highlights.js";
import {getPointScore} from "./scoreboard-score.js";
import "./ScoreboardPage.css";

function getPlayerNames(team) {
  return team.players.map((player) => player.name).join(" / ");
}

function getConnectionUrl(matchId) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws?matchId=${encodeURIComponent(matchId)}`;
}

function nextSensorSequence(sensorId) {
  const key = `padelvr:sensor-sequence:${sensorId}`;
  const lastSequence = Number(window.localStorage.getItem(key) ?? 0);
  const sequence = Math.max(Date.now(), Number.isSafeInteger(lastSequence) ? lastSequence + 1 : 0);
  window.localStorage.setItem(key, String(sequence));
  return sequence;
}

function makeCommandId() {
  return `sim_${window.crypto.randomUUID()}`;
}

export default function ScoreboardPage({courtId, matchId}) {
  const [match, setMatch] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [connection, setConnection] = useState("loading");
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [recentEvents, setRecentEvents] = useState([]);
  const [courtChangeAlert, setCourtChangeAlert] = useState(null);
  const matchRef = useRef(null);
  const revisionRef = useRef(-1);
  const courtChangeAlertRef = useRef(null);
  const courtChangeTimeoutRef = useRef(null);

  const applyUpdate = useCallback((update) => {
    if (!matchRef.current || (update.revision ?? 0) <= revisionRef.current) return;
    revisionRef.current = update.revision ?? 0;
    const nextMatch = {
      ...matchRef.current,
      status: update.status,
      revision: update.revision,
      state: update.state,
      history: update.history,
    };
    matchRef.current = nextMatch;
    setMatch(nextMatch);

    if (Array.isArray(update.events) && update.events.length) {
      setRecentEvents((events) => [...update.events, ...events].slice(0, 6));
      for (const event of update.events) {
        if (event.type === "POINT_WON" && courtChangeAlertRef.current) {
          window.clearTimeout(courtChangeTimeoutRef.current);
          courtChangeAlertRef.current = null;
          setCourtChangeAlert(null);
        }
        if (event.type === "SIDE_CHANGED") {
          window.clearTimeout(courtChangeTimeoutRef.current);
          const alert = {
            sides: event.details.currentSides,
            reason: event.details.reason,
          };
          courtChangeAlertRef.current = alert;
          setCourtChangeAlert(alert);
          courtChangeTimeoutRef.current = window.setTimeout(() => {
            courtChangeAlertRef.current = null;
            setCourtChangeAlert(null);
          }, 15_000);
        }
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    getMatchForScoreboard(courtId, matchId, controller.signal)
      .then(({match: loadedMatch, sensors: loadedSensors}) => {
        matchRef.current = loadedMatch;
        revisionRef.current = loadedMatch.revision ?? 0;
        setMatch(loadedMatch);
        setSensors(loadedSensors);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setNotice(error.message || "No se pudo cargar el partido.");
          setConnection("error");
        }
      });

    return () => controller.abort();
  }, [courtId, matchId]);

  useEffect(() => () => {
    window.clearTimeout(courtChangeTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!match) return undefined;

    const socket = new WebSocket(getConnectionUrl(matchId));
    setConnection("connecting");
    socket.addEventListener("open", () => setConnection("connected"));
    socket.addEventListener("close", () => setConnection("disconnected"));
    socket.addEventListener("error", () => setConnection("error"));
    socket.addEventListener("message", (message) => {
      try {
        const update = JSON.parse(message.data);
        if (update.type === "match.updated" && update.matchId === matchId) {
          applyUpdate(update);
        }
      } catch {
        setNotice("El servidor envió una actualización del marcador inválida.");
      }
    });

    return () => socket.close();
  }, [applyUpdate, matchId, Boolean(match)]);

  const eventLabels = useMemo(() => ({
    POINT_WON: "Punto",
    POINT_UNDONE: "Punto deshecho",
    GAME_WON: "Juego",
    SET_WON: "Set",
    MATCH_WON: "Partido",
    SIDE_CHANGED: "Cambio de lado",
  }), []);

  async function sendSimulationCommand(teamId, command) {
    const currentMatch = matchRef.current;
    if (!currentMatch || isSending) return;

    const teamSide = currentMatch.state.sideChange.currentSides[teamId];
    const sensor = sensors.find((candidate) => candidate.side === teamSide);
    if (!sensor) {
      setNotice(`No hay un sensor configurado en el lado ${teamSide}.`);
      return;
    }

    setNotice("");
    setIsSending(true);
    try {
      const response = await recordSensorCommand({
        commandId: makeCommandId(),
        sensorId: sensor.sensorId,
        command,
        sequence: nextSensorSequence(sensor.sensorId),
        timestamp: new Date().toISOString(),
      });
      if (response.duplicate) {
        setNotice("El comando ya había sido procesado.");
      } else {
        applyUpdate(response);
      }
    } catch (error) {
      setNotice(error.message || "No se pudo enviar el comando de prueba.");
    } finally {
      setIsSending(false);
    }
  }

  if (!match && !notice) {
    return (
      <main className="scoreboard-page">
        <p className="scoreboard-loading">Cargando el partido…</p>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="scoreboard-page">
        <p className="scoreboard-error" role="alert">{notice}</p>
        <a className="scoreboard-back-link" href={`/${encodeURIComponent(courtId)}`}>
          Volver a la cancha
        </a>
      </main>
    );
  }

  const {state} = match;
  const isTieBreak = state.currentGame.type === "TIEBREAK";
  const highlights = getScoreboardHighlights(match);
  const statusLabels = {
    READY: "Listo para comenzar",
    IN_PROGRESS: "En juego",
    PAUSED: "Pausado",
    FINISHED: "Partido finalizado",
    CANCELLED: "Cancelado",
  };

  return (
    <main className="scoreboard-page" data-court-id={courtId} data-match-id={matchId}>
      <header className="scoreboard-header">
        <a className="scoreboard-brand" href="/">
          <span className="scoreboard-brand-mark">P</span>
          <span>PADEL<span>VR</span></span>
        </a>
        <div className={`scoreboard-connection is-${connection}`} aria-live="polite">
          <span className="scoreboard-connection-dot" />
          {connection === "connected" ? "WebSocket conectado" : `WebSocket ${connection}`}
        </div>
      </header>

      <section className="scoreboard-content">
        <div className="scoreboard-heading">
          <div>
            <p className="scoreboard-eyebrow">MARCADOR EN VIVO · CANCHA</p>
            <h1>Partido <span>#{matchId.slice(-5)}</span></h1>
          </div>
          <div className={`scoreboard-status is-${match.status.toLowerCase()}`}>
            <span />
            {statusLabels[match.status]}
          </div>
        </div>

        {courtChangeAlert && (
          <div className="scoreboard-court-change" role="status" aria-live="polite">
            <strong>CAMBIO DE CANCHA</strong>
            <span>
              Equipo A: {courtChangeAlert.sides.A === "LEFT" ? "izquierda" : "derecha"}
              {" · "}
              Equipo B: {courtChangeAlert.sides.B === "LEFT" ? "izquierda" : "derecha"}
            </span>
            <small>El aviso desaparecerá al registrar el siguiente punto o en 15 segundos.</small>
          </div>
        )}

        {highlights.length > 0 && (
          <div className="scoreboard-highlights" role="status" aria-live="polite">
            {highlights.map((highlight) => (
              <div
                className={`scoreboard-highlight is-${highlight.type.toLowerCase().replaceAll("_", "-")}`}
                key={`${highlight.type}-${highlight.team}`}
              >
                <strong>{highlight.label}</strong>
                <span>
                  {highlight.type === "BREAK_POINT"
                    ? `Equipo ${highlight.team} puede quebrar el saque del equipo ${state.server.team}`
                    : `Equipo ${highlight.team}`}
                </span>
              </div>
            ))}
          </div>
        )}

        <section className="scoreboard-card" aria-label="Marcador actual">
          <div className="scoreboard-card-topline">
            <span>{match.format.type === "SINGLE_SET" ? "PARTIDO A UN SET" : "AL MEJOR DE TRES SETS"}</span>
            <span>{isTieBreak ? "TIE-BREAK" : `SET ${state.currentSet.number}`}</span>
          </div>
          <div className="scoreboard-set-results" aria-label="Resultados por set">
            {Array.from({length: match.format.setsToWin === 1 ? 1 : 3}, (_, index) => {
              const completedSet = match.history.completedSets.find((set) => set.number === index + 1);
              const isCurrentSet = state.currentSet.number === index + 1 && match.status !== "FINISHED";
              return (
                <div className={`scoreboard-set-result ${isCurrentSet ? "is-current" : ""}`} key={index + 1}>
                  <span>SET {index + 1}</span>
                  {completedSet ? (
                    <strong>
                      {completedSet.games.A}–{completedSet.games.B}
                      {completedSet.tieBreakPoints &&
                        ` (${completedSet.tieBreakPoints.A}–${completedSet.tieBreakPoints.B})`}
                    </strong>
                  ) : isCurrentSet ? (
                    <strong>{state.currentSet.games.A}–{state.currentSet.games.B}</strong>
                  ) : (
                    <strong className="scoreboard-set-pending">—</strong>
                  )}
                </div>
              );
            })}
          </div>
          <div className="scoreboard-columns" aria-hidden="true">
            <span>JUGADORES</span>
            <span>SETS</span>
            <span>JUEGOS</span>
            <span>{isTieBreak ? "TIE-BREAK" : "PUNTOS"}</span>
          </div>
          {match.teams.map((team) => {
            const teamId = team.id;
            const server = state.server.playerId.startsWith(`${teamId}-`);
            const currentSide = state.sideChange.currentSides[teamId];
            return (
              <div className={`scoreboard-team-row ${server ? "is-serving" : ""}`} key={teamId}>
                <div className="scoreboard-team-name">
                  <span className={`scoreboard-team-marker team-${teamId.toLowerCase()}`}>{teamId}</span>
                  <div>
                    <strong>{getPlayerNames(team)}</strong>
                    <small>{currentSide === "LEFT" ? "LADO IZQUIERDO" : "LADO DERECHO"}</small>
                  </div>
                  {server && <span className="scoreboard-serve-indicator" title="Saca este jugador">●</span>}
                </div>
                <strong className="scoreboard-number">{state.setsWon[teamId]}</strong>
                <strong className="scoreboard-number">{state.currentSet.games[teamId]}</strong>
                <strong className="scoreboard-point">{getPointScore(match, teamId)}</strong>
              </div>
            );
          })}
          <div className="scoreboard-card-footer">
            <span>{state.server.playerId} al saque</span>
            {match.startedAt && (
              <time dateTime={match.startedAt}>
                Inicio {new Date(match.startedAt).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
              </time>
            )}
          </div>
        </section>

        <section className="simulation-panel" aria-labelledby="simulation-heading">
          <div className="simulation-panel-heading">
            <div>
              <p className="scoreboard-eyebrow">MODO DE PRUEBA</p>
              <h2 id="simulation-heading">Simular sensores</h2>
            </div>
            <span className="simulation-badge">Comandos reales · WebSocket</span>
          </div>
          <p className="simulation-description">
            Cada botón envía un comando al backend como si lo reportara el sensor del lado actual del equipo.
          </p>
          <div className="simulation-teams">
            {match.teams.map((team) => (
              <section className="simulation-team" key={team.id}>
                <div className="simulation-team-heading">
                  <span className={`scoreboard-team-marker team-${team.id.toLowerCase()}`}>{team.id}</span>
                  <div>
                    <strong>Equipo {team.id}</strong>
                    <small>{getPlayerNames(team)}</small>
                  </div>
                </div>
                <div className="simulation-actions">
                  <button
                    className="simulation-add-button"
                    type="button"
                    disabled={isSending || match.status === "FINISHED"}
                    onClick={() => sendSimulationCommand(team.id, "ADD_POINT")}
                  >
                    + Agregar punto
                  </button>
                  <button
                    className="simulation-undo-button"
                    type="button"
                    disabled={isSending || !state.undoHistory?.length}
                    onClick={() => sendSimulationCommand(team.id, "UNDO_POINT")}
                  >
                    ↶ Deshacer
                  </button>
                </div>
              </section>
            ))}
          </div>
          {notice && <p className="simulation-notice" role="alert">{notice}</p>}
        </section>

        <section className="scoreboard-events" aria-live="polite">
          <div className="simulation-panel-heading">
            <div>
              <p className="scoreboard-eyebrow">ACTUALIZACIONES</p>
              <h2>Eventos recientes</h2>
            </div>
            <span className="scoreboard-revision">REV. {match.revision ?? 0}</span>
          </div>
          {recentEvents.length ? (
            <ul>
              {recentEvents.map((event, index) => (
                <li key={`${event.type}-${event.team ?? "match"}-${index}`}>
                  <span>{eventLabels[event.type] ?? event.type}</span>
                  <strong>{event.team ? `Equipo ${event.team}` : event.details?.reason ?? "Marcador actualizado"}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="scoreboard-no-events">Los eventos del partido aparecerán aquí.</p>
          )}
        </section>
      </section>
    </main>
  );
}
