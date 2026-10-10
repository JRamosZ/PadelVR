const DEFAULT_PLAYER_PHOTO = "/images/player-default.svg";
const SIDES = ["A", "B"];

function getStatistics(match) {
  return match.state.statistics ?? {
    pointsWon: {A: 0, B: 0},
    breakPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
    starPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
  };
}

function getEffectiveness(pointsWon, totalPointsPlayed) {
  if (totalPointsPlayed === 0) return "0%";
  return `${Math.round((pointsWon / totalPointsPlayed) * 100)}%`;
}

export default function MatchSummary({match}) {
  const statistics = getStatistics(match);
  const totalPointsPlayed = SIDES.reduce(
    (total, side) => total + statistics.pointsWon[side],
    0,
  );
  const completedSets = match.history.completedSets;

  return (
    <section className="match-result-summary" aria-labelledby="match-result-heading">
      <h2 id="match-result-heading">Resumen del partido</h2>

      <div className="match-result-players">
        {match.teams.map((team) => (
          <section
            className={`match-result-team match-result-team-${team.id.toLowerCase()}`}
            key={team.id}
            aria-label={`Equipo ${team.id}`}
          >
            <h3>Equipo {team.id}</h3>
            <div className="match-result-player-list">
              {team.players.map((player) => (
                <div className="match-result-player" key={player.id}>
                  <img
                    src={player.photo || DEFAULT_PLAYER_PHOTO}
                    alt=""
                    width="64"
                    height="64"
                  />
                  <strong>{player.name}</strong>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="match-result-sets" aria-labelledby="match-result-sets-heading">
        <h3 id="match-result-sets-heading">Resultado de los sets</h3>
        {completedSets.length ? (
          <ol>
            {completedSets.map((set) => (
              <li key={set.number}>
                <span>Set {set.number}</span>
                <strong>{set.games.A}–{set.games.B}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>No hay sets completados.</p>
        )}
      </section>

      <section className="match-result-stats" aria-labelledby="match-result-stats-heading">
        <h3 id="match-result-stats-heading">Estadísticas</h3>
        <div className="match-result-stat-headings" aria-hidden="true">
          <span>Estadística</span>
          <span>Equipo A</span>
          <span>Equipo B</span>
        </div>
        <div className="match-result-stat-row">
          <strong>Puntos ganados</strong>
          {SIDES.map((side) => (
            <span key={side}>{statistics.pointsWon[side]}</span>
          ))}
        </div>
        <div className="match-result-stat-row">
          <strong>Break points ganados / jugados</strong>
          {SIDES.map((side) => (
            <span key={side}>
              {statistics.breakPoints.won[side]}/{statistics.breakPoints.played[side]}
            </span>
          ))}
        </div>
        <div className="match-result-stat-row">
          <strong>Star points ganados / jugados</strong>
          {SIDES.map((side) => (
            <span key={side}>
              {statistics.starPoints.won[side]}/{statistics.starPoints.played[side]}
            </span>
          ))}
        </div>
        <div className="match-result-stat-row">
          <strong>Efectividad (puntos ganados / jugados)</strong>
          {SIDES.map((side) => (
            <span key={side}>
              {getEffectiveness(statistics.pointsWon[side], totalPointsPlayed)}
            </span>
          ))}
        </div>
        <p className="match-result-total-points">
          Total de puntos jugados: {totalPointsPlayed}
        </p>
      </section>
    </section>
  );
}
