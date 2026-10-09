export default function ScoreboardPage({courtId, matchId}) {
  return (
    <main
      className="scoreboard-page"
      aria-label="Marcador del partido"
      data-court-id={courtId}
      data-match-id={matchId}
    />
  );
}
