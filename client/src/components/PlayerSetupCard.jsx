function PersonIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="11" r="5" />
      <path d="M6 28c0-6 4-10 10-10s10 4 10 10" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 6h3l1.5-2h5L14 6h3v10H3z" />
      <circle cx="10" cy="11" r="3" />
    </svg>
  );
}

export default function PlayerSetupCard({
  team,
  players,
  photoErrors,
  onNameChange,
  onPhotoChange,
  onPhotoError,
}) {
  return (
    <section className={`player-team-card player-team-card-${team.id}`}>
      <h2 className="player-team-heading">
        <span className="player-team-marker" />
        Pareja {team.label}
      </h2>

      <div className="player-team-list">
        {players.map((player, index) => {
          const inputId = `player-${team.id}-${index + 1}-name`;
          const cameraId = `player-${team.id}-${index + 1}-photo`;
          const playerLabel = `Jugador ${index + 1} de la pareja ${team.label}`;

          return (
            <div className="player-entry" key={player.id}>
              <label
                className={`player-avatar ${player.photo ? "has-photo" : ""}`}
                htmlFor={cameraId}
                aria-label={`Tomar o elegir una foto de ${player.name || playerLabel}`}
                title="Tomar o elegir una foto"
              >
                {player.photo ? (
                  <img src={player.photo} alt="" />
                ) : (
                  <PersonIcon />
                )}
                <span className="player-avatar-camera">
                  <CameraIcon />
                </span>
              </label>
              <input
                id={cameraId}
                className="player-photo-input"
                type="file"
                accept="image/*"
                capture="user"
                aria-label={`Tomar foto de ${player.name || playerLabel}`}
                onChange={(event) => onPhotoChange(player.id, event)}
                onClick={() => onPhotoError(player.id, "")}
              />
              <label className="visually-hidden" htmlFor={inputId}>
                Nombre del {playerLabel.toLowerCase()}
              </label>
              <input
                id={inputId}
                className="player-name-input"
                type="text"
                value={player.name}
                onChange={(event) => onNameChange(player.id, event.target.value)}
                placeholder={playerLabel}
                autoComplete="off"
                maxLength={40}
                required
              />
              {player.photo && (
                <button
                  className="player-photo-remove"
                  type="button"
                  aria-label={`Quitar foto de ${player.name || playerLabel}`}
                  onClick={() => onPhotoChange(player.id, null)}
                >
                  ×
                </button>
              )}
              {photoErrors[player.id] && (
                <span className="player-photo-error" role="alert">
                  {photoErrors[player.id]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
