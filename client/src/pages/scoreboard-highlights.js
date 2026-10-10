const TEAMS = ["A", "B"];

function opposite(team) {
  return team === "A" ? "B" : "A";
}

function winsTieBreakOnNextPoint(match, team) {
  const {currentGame} = match.state;
  const points = {...currentGame.tieBreakPoints, [team]: currentGame.tieBreakPoints[team] + 1};
  const difference = points.A - points.B;
  return (
    (points.A >= match.rules.tieBreak.pointsToWin ||
      points.B >= match.rules.tieBreak.pointsToWin) &&
    Math.abs(difference) >= match.rules.tieBreak.winByPoints
  );
}

function winsRegularGameOnNextPoint(match, team) {
  const {currentGame} = match.state;
  const other = opposite(team);
  const score = currentGame.points;

  if (score[team] === "SP") return true;
  if (score[other] === "SP") return false;
  if (score[team] === "AD1" || score[team] === "AD2") return true;
  if (score[other] === "AD1" || score[other] === "AD2") return false;

  if (score.A === "40" && score.B === "40") {
    return (
      match.rules.scoringStrategy === "NO_AD" ||
      (match.rules.scoringStrategy === "STAR_POINT" &&
        currentGame.advantagesPlayed >= match.rules.advantagesBeforeStarPoint)
    );
  }
  return score[team] === "40";
}

function winsSetOnNextPoint(match, team) {
  const {state} = match;
  const {currentGame, currentSet} = state;
  if (currentGame.type === "TIEBREAK") {
    return winsTieBreakOnNextPoint(match, team);
  }
  if (!winsRegularGameOnNextPoint(match, team)) {
    return false;
  }

  const games = {...currentSet.games, [team]: currentSet.games[team] + 1};
  if (
    match.rules.setEndingStrategy === "TIE_BREAK" &&
    games.A === match.rules.tieBreak.triggerAtGames &&
    games.B === match.rules.tieBreak.triggerAtGames
  ) {
    return false;
  }

  const difference = games.A - games.B;
  const requiredLead = match.rules.setEndingStrategy === "FIRST_TO_SIX" ? 1 : 2;
  return (
    (games.A >= match.format.gamesToWinSet || games.B >= match.format.gamesToWinSet) &&
    Math.abs(difference) >= requiredLead
  );
}

export function getScoreboardHighlights(match) {
  if (match.status !== "IN_PROGRESS") return [];

  const highlights = [];
  for (const team of TEAMS) {
    if (!winsSetOnNextPoint(match, team)) continue;

    const isMatchPoint = match.state.setsWon[team] + 1 >= match.format.setsToWin;
    highlights.push({
      type: isMatchPoint ? "MATCH_POINT" : "SET_POINT",
      team,
      label: isMatchPoint ? "MATCH POINT" : "SET POINT",
    });
  }

  if (match.state.currentGame.type === "REGULAR") {
    const servingTeam = match.state.server.team;
    const receivingTeam = opposite(servingTeam);
    if (winsRegularGameOnNextPoint(match, receivingTeam)) {
      highlights.push({
        type: "BREAK_POINT",
        team: receivingTeam,
        label: "BREAK POINT",
        details: `Equipo ${servingTeam} está sacando`,
      });
    }
  }

  if (highlights.some((highlight) => highlight.type === "MATCH_POINT")) {
    return [highlights.find((highlight) => highlight.type === "MATCH_POINT")];
  }
  if (highlights.some((highlight) => highlight.type === "SET_POINT")) {
    return [highlights.find((highlight) => highlight.type === "SET_POINT")];
  }
  if (highlights.some((highlight) => highlight.type === "BREAK_POINT")) {
    return [highlights.find((highlight) => highlight.type === "BREAK_POINT")];
  }
  return [];
}
