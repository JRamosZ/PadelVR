const POINT_LABELS = {
  0: "0",
  15: "15",
  30: "30",
  40: "40",
  SP: "SP",
};

export function getPointScore(match, teamId) {
  if (match.status === "FINISHED") return "—";

  const {currentGame} = match.state;
  if (currentGame.type === "TIEBREAK") {
    return String(currentGame.tieBreakPoints[teamId]);
  }
  const point = currentGame.points[teamId];
  if (point === "AD1" || point === "AD2") return point;
  return POINT_LABELS[point] ?? point;
}
