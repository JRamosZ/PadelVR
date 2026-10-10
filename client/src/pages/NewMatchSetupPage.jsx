import {useMemo, useState} from "react";
import Brand from "../components/Brand.jsx";
import MatchModeCard from "../components/MatchModeCard.jsx";
import MatchSetupProgress from "../components/MatchSetupProgress.jsx";
import PlayerSetupCard from "../components/PlayerSetupCard.jsx";
import {useMatchModes} from "../hooks/useMatchModes.js";
import {createMatch} from "../services/courtsApi.js";

const createPlayers = (team) => [
  {id: `${team}-1`, name: "", photo: ""},
  {id: `${team}-2`, name: "", photo: ""},
];

const initialCustomSettings = {
  setsToWin: 2,
  gamesToWinSet: 6,
  scoringStrategy: "STAR_POINT",
  advantagesBeforeStarPoint: 2,
  setEndingStrategy: "TIE_BREAK",
};

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("No se pudo leer la foto. Inténtalo de nuevo."));
    reader.onload = () => {
      image.onerror = () => reject(new Error("No se pudo procesar la foto."));
      image.onload = () => {
        const maxDimension = 480;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("No se pudo procesar la foto."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function NewMatchSetupPage({courtId}) {
  const {status, modes, message} = useMatchModes();
  const [selectedModeId, setSelectedModeId] = useState("");
  const [stage, setStage] = useState("mode");
  const [notice, setNotice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [matchToFinish, setMatchToFinish] = useState(null);
  const [customSettingsCompleted, setCustomSettingsCompleted] = useState(false);
  const [customSettings, setCustomSettings] = useState(initialCustomSettings);
  const [players, setPlayers] = useState({
    A: createPlayers("A"),
    B: createPlayers("B"),
  });
  const [photoErrors, setPhotoErrors] = useState({});

  const selectedMode = modes.find((mode) => mode.id === selectedModeId);
  const isCustomMode = selectedModeId === "CUSTOM";
  const playersAreValid = Object.values(players)
    .flat()
    .every((player) => player.name.trim().length > 0);
  const orderedTeams = useMemo(
    () => [
      {id: "A", players: players.A},
      {id: "B", players: players.B},
    ],
    [players],
  );
  const completedStages = [
    ...(selectedMode ? ["mode"] : []),
    ...(isCustomMode && customSettingsCompleted ? ["customize"] : []),
    ...(playersAreValid ? ["players"] : []),
  ];
  const isSetupComplete =
    Boolean(selectedMode) &&
    (!isCustomMode || customSettingsCompleted) &&
    playersAreValid;

  function canNavigateTo(targetStage) {
    if (targetStage === "mode") return true;
    if (targetStage === "customize") return isCustomMode && completedStages.includes("mode");
    if (targetStage === "players") {
      return completedStages.includes("mode") &&
        (!isCustomMode || completedStages.includes("customize"));
    }
    return targetStage === "summary" &&
      completedStages.includes("mode") &&
      (!isCustomMode || completedStages.includes("customize")) &&
      completedStages.includes("players");
  }

  function navigateToStage(targetStage) {
    if (canNavigateTo(targetStage)) {
      setNotice("");
      setMatchToFinish(null);
      setStage(targetStage);
    }
  }

  function updatePlayer(playerId, update) {
    setPlayers((currentPlayers) => ({
      ...currentPlayers,
      A: currentPlayers.A.map((player) =>
        player.id === playerId ? {...player, ...update} : player,
      ),
      B: currentPlayers.B.map((player) =>
        player.id === playerId ? {...player, ...update} : player,
      ),
    }));
  }

  async function handlePhotoChange(playerId, event) {
    if (event === null) {
      updatePlayer(playerId, {photo: ""});
      setPhotoErrors((errors) => ({...errors, [playerId]: ""}));
      return;
    }

    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoErrors((errors) => ({
        ...errors,
        [playerId]: "Selecciona un archivo de imagen.",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoErrors((errors) => ({
        ...errors,
        [playerId]: "La foto original debe pesar menos de 5 MB.",
      }));
      return;
    }

    try {
      const photo = await compressPhoto(file);
      if (photo.length > 1_400_000) {
        throw new Error("La foto comprimida es demasiado grande.");
      }
      updatePlayer(playerId, {photo});
      setPhotoErrors((errors) => ({...errors, [playerId]: ""}));
    } catch (error) {
      setPhotoErrors((errors) => ({
        ...errors,
        [playerId]: error.message,
      }));
    }
  }

  async function handleCreateMatch(finishActiveMatchId = null) {
    setIsCreating(true);
    setNotice("");

    try {
      const payload = {
        modeId: selectedModeId,
        teams: orderedTeams.map((team) => ({
          id: team.id,
          players: team.players.map(({name, photo}) => ({name, photo})),
        })),
      };

      if (isCustomMode) {
        payload.customSettings = customSettings;
      }
      if (typeof finishActiveMatchId === "string" && finishActiveMatchId) {
        payload.finishActiveMatchId = finishActiveMatchId;
      }

      const {match} = await createMatch(courtId, payload);
      if (!match?.id) {
        throw new Error("El servidor no devolvió el partido creado.");
      }

      window.location.assign(
        `/${encodeURIComponent(courtId)}/matches/${encodeURIComponent(match.id)}`,
      );
    } catch (error) {
      if (
        error.code === "ACTIVE_MATCH_CONFIRMATION_REQUIRED" &&
        error.activeMatch?.id
      ) {
        setMatchToFinish(error.activeMatch);
      } else {
        setNotice(error.message || "No se pudo crear el partido. Inténtalo de nuevo.");
      }
      setIsCreating(false);
    }
  }

  function goToNextStage() {
    setNotice("");
    if (stage === "mode") {
      setStage(isCustomMode ? "customize" : "players");
    } else if (stage === "customize") {
      setCustomSettingsCompleted(true);
      setStage("players");
    } else if (stage === "players" && playersAreValid) {
      setStage("summary");
    }
  }

  const stageTitle = {
    mode: "Selecciona un modo de juego",
    customize: "Personaliza las reglas",
    players: "Jugadores",
    summary: "Resumen del partido",
  }[stage];

  return (
    <main className="match-setup-page">
      <div className="match-setup-background" aria-hidden="true" />
      <header className="match-setup-header">
        <span className="match-setup-header-spacer" aria-hidden="true" />
        <Brand />
        <span className="match-setup-header-spacer" aria-hidden="true" />
      </header>

      <div className="match-setup-body">
        <MatchSetupProgress
          customMode={isCustomMode}
          currentStage={stage}
          completedStages={completedStages}
          canNavigateTo={canNavigateTo}
          onNavigate={navigateToStage}
        />

        <section className={`match-setup-stage match-setup-stage-${stage}`}>
          <p className="setup-eyebrow">CONFIGURA TU PARTIDO</p>
          <h1>{stageTitle}</h1>

          {stage === "mode" && (
            <>
              <p className="match-mode-intro">
                Elige un modo predefinido o personaliza las reglas del partido.
              </p>
              {status === "loading" && (
                <div className="setup-feedback" role="status">
                  <span className="loading-spinner" />
                  Cargando modos de juego...
                </div>
              )}
              {status === "error" && (
                <div className="setup-feedback setup-feedback-error" role="alert">
                  <span className="feedback-icon" aria-hidden="true">!</span>
                  <div>
                    <strong>No se pudieron cargar los modos</strong>
                    <p>{message}</p>
                  </div>
                </div>
              )}
              {status === "ready" && (
                <div className="match-mode-grid" role="radiogroup" aria-label="Modo de juego">
                  {modes.map((mode) => (
                    <MatchModeCard
                      key={mode.id}
                      mode={mode}
                      selected={selectedModeId === mode.id}
                      onSelect={() => {
                        setSelectedModeId(mode.id);
                        setStage(mode.isCustomizable ? "customize" : "players");
                        setNotice("");
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {stage === "customize" && (
            <div className="custom-match-settings">
              <p className="match-mode-intro">
                Ajusta el formato y las reglas para este partido.
              </p>
              <label className="custom-setting">
                <span>Formato del partido</span>
                <select
                  value={customSettings.setsToWin}
                  onChange={(event) => {
                    setCustomSettingsCompleted(false);
                    setCustomSettings((settings) => ({
                      ...settings,
                      setsToWin: Number(event.target.value),
                    }));
                  }}
                >
                  <option value={1}>Un set</option>
                  <option value={2}>Mejor de tres sets</option>
                </select>
              </label>
              <label className="custom-setting">
                <span>Estrategia de puntuación</span>
                <select
                  value={customSettings.scoringStrategy}
                  onChange={(event) => {
                    const scoringStrategy = event.target.value;
                    setCustomSettingsCompleted(false);
                    setCustomSettings((settings) => ({
                      ...settings,
                      scoringStrategy,
                    }));
                  }}
                >
                  <option value="ADVANTAGE">Ventaja tradicional</option>
                  <option value="NO_AD">Punto decisivo (sin ventaja)</option>
                  <option value="STAR_POINT">Punto de oro tras ventajas</option>
                </select>
              </label>
              {customSettings.scoringStrategy === "STAR_POINT" && (
                <label className="custom-setting">
                  <span>Ventajas antes del punto de oro</span>
                  <select
                    value={customSettings.advantagesBeforeStarPoint}
                    onChange={(event) => {
                      setCustomSettingsCompleted(false);
                      setCustomSettings((settings) => ({
                        ...settings,
                        advantagesBeforeStarPoint: Number(event.target.value),
                      }));
                    }}
                  >
                    <option value={1}>Una ventaja</option>
                    <option value={2}>Dos ventajas</option>
                  </select>
                </label>
              )}
              <label className="custom-setting">
                <span>Cómo se gana el set</span>
                <select
                  value={customSettings.setEndingStrategy}
                  onChange={(event) => {
                    setCustomSettingsCompleted(false);
                    setCustomSettings((settings) => ({
                      ...settings,
                      setEndingStrategy: event.target.value,
                    }));
                  }}
                >
                  <option value="TIE_BREAK">Tie-break al llegar a 6-6</option>
                  <option value="FIRST_TO_SIX">
                    Primero en llegar a 6 juegos (sin tie-break)
                  </option>
                  <option value="TWO_GAME_LEAD">
                    Sin tie-break; gana con 2 juegos de diferencia
                  </option>
                </select>
              </label>
              <button className="match-setup-next" type="button" onClick={goToNextStage}>
                Siguiente <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {stage === "players" && (
            <>
              <p className="match-mode-intro">
                Ingresa los nombres de los cuatro jugadores y asigna las parejas. También puedes
                agregar fotos para el tablero y las estadísticas.
              </p>
              <div className="player-team-grid">
                {orderedTeams.map((team) => (
                  <PlayerSetupCard
                    key={team.id}
                    team={{id: team.id, label: team.id}}
                    players={team.players}
                    photoErrors={photoErrors}
                    onNameChange={(playerId, name) => updatePlayer(playerId, {name})}
                    onPhotoChange={handlePhotoChange}
                    onPhotoError={(playerId, error) =>
                      setPhotoErrors((errors) => ({...errors, [playerId]: error}))
                    }
                  />
                ))}
              </div>
              {!playersAreValid && (
                <p className="player-setup-hint">
                  Completa los nombres de los cuatro jugadores para continuar.
                </p>
              )}
              <button
                className="match-setup-next"
                type="button"
                disabled={!playersAreValid}
                onClick={goToNextStage}
              >
                Ver resumen <span aria-hidden="true">→</span>
              </button>
            </>
          )}

          {stage === "summary" && (
            <>
              <p className="match-mode-intro">
                Revisa los datos antes de iniciar el partido.
              </p>
              <section className="match-summary-card" aria-label="Resumen del partido">
                <div className="match-summary-mode">
                  <span>Modo de juego</span>
                  <strong>{isCustomMode ? "Personalizado" : selectedMode?.name}</strong>
                  <ul>
                    {(isCustomMode
                      ? [
                          customSettings.setsToWin === 1 ? "Un set" : "Mejor de tres sets",
                          "6 games por set",
                          customSettings.scoringStrategy === "NO_AD"
                            ? "Punto decisivo sin ventaja"
                            : customSettings.scoringStrategy === "ADVANTAGE"
                              ? "Ventaja tradicional"
                              : `Punto de oro tras ${customSettings.advantagesBeforeStarPoint} ${
                                  customSettings.advantagesBeforeStarPoint === 1 ? "ventaja" : "ventajas"
                                }`,
                          customSettings.setEndingStrategy === "TIE_BREAK"
                            ? "Tie-break al llegar a 6-6"
                            : customSettings.setEndingStrategy === "FIRST_TO_SIX"
                              ? "Primero en llegar a 6 juegos (sin tie-break)"
                              : "Sin tie-break; gana con 2 juegos de diferencia",
                        ]
                      : selectedMode?.features || []
                    ).map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                </div>
                <div className="match-summary-teams">
                  {orderedTeams.map((team) => (
                    <div className="match-summary-team" key={team.id}>
                      <h2>Pareja {team.id}</h2>
                      {team.players.map((player) => (
                        <div className="match-summary-player" key={player.id}>
                          {player.photo ? (
                            <img src={player.photo} alt="" />
                          ) : (
                            <span className="match-summary-avatar" aria-hidden="true">
                              {player.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span>{player.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
              {notice && (
                <p className="match-setup-notice match-setup-notice-error" role="alert">
                  {notice}
                </p>
              )}
              {matchToFinish && (
                <div className="finish-match-confirmation" role="alert"
                  aria-labelledby="finish-match-title"
                  aria-describedby="finish-match-description">
                  <h2 id="finish-match-title">Ya hay un partido vigente</h2>
                  <p id="finish-match-description">
                    Para iniciar este partido, primero se finalizará el partido actual. Se
                    conservará el marcador que tenga hasta ahora y no podrás reanudarlo.
                  </p>
                  <div className="finish-match-actions">
                    <button
                      className="finish-match-cancel"
                      type="button"
                      disabled={isCreating}
                      onClick={() => setMatchToFinish(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="match-setup-next"
                      type="button"
                      disabled={isCreating}
                      onClick={() => handleCreateMatch(matchToFinish.id)}
                    >
                      {isCreating ? "Finalizando y creando..." : "Finalizar y crear partido"}
                    </button>
                  </div>
                </div>
              )}
              {!matchToFinish && (
                <button
                  className="match-setup-next"
                  type="button"
                  disabled={isCreating || !isSetupComplete}
                  onClick={() => handleCreateMatch()}
                >
                  {isCreating ? "Creando partido..." : "Crear partido"}
                  {!isCreating && <span aria-hidden="true">→</span>}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
