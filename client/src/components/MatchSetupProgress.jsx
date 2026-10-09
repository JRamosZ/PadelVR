const defaultSteps = ["Modo de juego", "Jugadores", "Resumen"];
const customSteps = ["Modo de juego", "Personalizar", "Jugadores", "Resumen"];

export default function MatchSetupProgress({
  customMode,
  currentStage = "mode",
  completedStages,
  canNavigateTo,
  onNavigate,
}) {
  const steps = customMode ? customSteps : defaultSteps;
  const stageIds = customMode
    ? ["mode", "customize", "players", "summary"]
    : ["mode", "players", "summary"];

  return (
    <nav className="match-setup-progress" aria-label="Etapas de configuración">
      {steps.map((step, index) => {
        const stageId = stageIds[index];
        const isCurrent = stageId === currentStage;
        const isComplete = completedStages.includes(stageId);

        return (
          <button
            className={`match-setup-step ${isCurrent ? "is-active" : ""} ${isComplete ? "is-complete" : ""}`}
            key={stageId}
            type="button"
            aria-current={isCurrent ? "step" : undefined}
            aria-label={`${step}${isComplete ? ", completado" : ""}`}
            disabled={!canNavigateTo(stageId) || isCurrent}
            onClick={() => onNavigate(stageId)}
          >
            <span className="match-setup-step-number">{index + 1}</span>
            <span className="match-setup-step-label">{step}</span>
          </button>
        );
      })}
    </nav>
  );
}
