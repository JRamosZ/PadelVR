const TEAMS = ["A", "B"];
const POINTS = ["0", "15", "30", "40"];
const POINT_VALUES = new Map(POINTS.map((point, index) => [point, index]));
const VALID_POINT_VALUES = new Set([...POINTS, "AD1", "AD2", "SP"]);

export class MatchEngineError extends Error {
  constructor(message, code = "INVALID_MATCH_TRANSITION") {
    super(message);
    this.name = "MatchEngineError";
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function opposite(team) {
  return team === "A" ? "B" : "A";
}

function createEmptyStatistics() {
  return {
    pointsWon: {A: 0, B: 0},
    breakPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
    starPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
  };
}

function canWinRegularGameOnNextPoint(state, team) {
  const other = opposite(team);
  const points = state.currentGame.points;
  if (points[team] === "SP" || points[team] === "AD1" || points[team] === "AD2") {
    return true;
  }
  if (points[other] === "SP" || points[other] === "AD1" || points[other] === "AD2") {
    return false;
  }
  return points[team] === "40" && points[other] !== "40";
}

function recordPointStatistics(state, team) {
  const statistics = state.statistics;
  statistics.pointsWon[team] += 1;

  if (state.currentGame.type !== "REGULAR") return;

  const receivingTeam = opposite(state.server.team);
  if (canWinRegularGameOnNextPoint(state, receivingTeam)) {
    statistics.breakPoints.played[receivingTeam] += 1;
    if (team === receivingTeam) {
      statistics.breakPoints.won[receivingTeam] += 1;
    }
  }

  if (
    state.currentGame.points.A === "SP" &&
    state.currentGame.points.B === "SP"
  ) {
    for (const side of TEAMS) {
      statistics.starPoints.played[side] += 1;
    }
    statistics.starPoints.won[team] += 1;
  }
}

export function getMatchStatistics(state) {
  if (state.statistics) return state.statistics;

  const statistics = createEmptyStatistics();
  for (const transition of state.undoHistory ?? []) {
    const previousState = transition.before?.state;
    if (!previousState || !TEAMS.includes(transition.pointTeam)) continue;
    recordPointStatistics(
      {...previousState, statistics},
      transition.pointTeam,
    );
  }
  return statistics;
}

function teamForPlayer(playerId) {
  return playerId?.startsWith("A-") ? "A" : playerId?.startsWith("B-") ? "B" : null;
}

function normalizeServiceOrder(state) {
  return Array.isArray(state.serviceOrder) ? [...state.serviceOrder] : [];
}

function nextServerPlayer(serviceOrder, playerId) {
  const currentIndex = serviceOrder.indexOf(playerId);
  if (currentIndex < 0) {
    throw new MatchEngineError("The current server is missing from the service rotation.");
  }
  return serviceOrder[(currentIndex + 1) % serviceOrder.length];
}

function coreState(state) {
  const {undoHistory: _undoHistory, ...snapshot} = state;
  return snapshot;
}

function validateInput({status, state, format, rules, command}) {
  if (!["IN_PROGRESS", "FINISHED"].includes(status)) {
    throw new MatchEngineError("A match must be in progress to process commands.", "MATCH_NOT_IN_PROGRESS");
  }
  if (!state || !format || !rules || !command) {
    throw new MatchEngineError("Match state, format, rules, and command are required.");
  }
  if (!TEAMS.includes(command.team) && command.type === "ADD_POINT") {
    throw new MatchEngineError("ADD_POINT requires a valid team: A or B.");
  }
  if (!["ADD_POINT", "UNDO_POINT"].includes(command.type)) {
    throw new MatchEngineError("Unsupported match command.");
  }
  if (command.type === "ADD_POINT" && status !== "IN_PROGRESS") {
    throw new MatchEngineError("Cannot add points to a finished match.", "MATCH_FINISHED");
  }
  if (!state.currentGame || !state.currentSet || !state.setsWon || !state.server) {
    throw new MatchEngineError("The match state is incomplete.");
  }
  if (!["TIE_BREAK", "FIRST_TO_SIX", "TWO_GAME_LEAD"].includes(rules.setEndingStrategy)) {
    throw new MatchEngineError("Unsupported set-ending strategy.");
  }
  if (!["ADVANTAGE", "NO_AD", "STAR_POINT"].includes(rules.scoringStrategy)) {
    throw new MatchEngineError("Unsupported scoring strategy.");
  }
  if (![1, 2].includes(format.setsToWin) || !Number.isInteger(format.gamesToWinSet)) {
    throw new MatchEngineError("The match format is invalid.");
  }
  if (
    rules.setEndingStrategy === "TIE_BREAK" &&
    (!Number.isInteger(rules.tieBreak?.triggerAtGames) ||
      !Number.isInteger(rules.tieBreak?.pointsToWin) ||
      !Number.isInteger(rules.tieBreak?.winByPoints))
  ) {
    throw new MatchEngineError("The tie-break configuration is invalid.");
  }
  if (
    rules.scoringStrategy === "STAR_POINT" &&
    ![1, 2].includes(rules.advantagesBeforeStarPoint)
  ) {
    throw new MatchEngineError("The star-point configuration is invalid.");
  }
  if (
    !TEAMS.includes(state.server.team) ||
    teamForPlayer(state.server.playerId) !== state.server.team ||
    !["A-1", "A-2", "B-1", "B-2"].includes(state.server.playerId)
  ) {
    throw new MatchEngineError("The current server is invalid.");
  }
  const serviceOrder = normalizeServiceOrder(state);
  if (
    serviceOrder.length !== 4 ||
    new Set(serviceOrder).size !== 4 ||
    serviceOrder.some((playerId) => !["A-1", "A-2", "B-1", "B-2"].includes(playerId)) ||
    !serviceOrder.includes(state.server.playerId)
  ) {
    throw new MatchEngineError("The player service rotation is invalid.");
  }
  if (
    TEAMS.some(
      (team) =>
        !Number.isInteger(state.currentSet.games?.[team]) ||
        state.currentSet.games[team] < 0 ||
        !Number.isInteger(state.setsWon[team]) ||
        state.setsWon[team] < 0,
    )
  ) {
    throw new MatchEngineError("The match score is invalid.");
  }
  if (
    state.currentGame.type === "REGULAR" &&
    TEAMS.some((team) => !VALID_POINT_VALUES.has(state.currentGame.points?.[team]))
  ) {
    throw new MatchEngineError("The current game score is invalid.");
  }
  if (
    state.currentGame.type === "TIEBREAK" &&
    (rules.setEndingStrategy !== "TIE_BREAK" ||
      !["A-1", "A-2", "B-1", "B-2"].includes(state.currentGame.tieBreakFirstServer) ||
      TEAMS.some(
        (team) =>
          !Number.isInteger(state.currentGame.tieBreakPoints?.[team]) ||
          state.currentGame.tieBreakPoints[team] < 0,
      ))
  ) {
    throw new MatchEngineError("The current tie-break state is invalid.");
  }
  if (
    state.sideChange?.enabled &&
    (!["LEFT", "RIGHT"].includes(state.sideChange.currentSides?.A) ||
      !["LEFT", "RIGHT"].includes(state.sideChange.currentSides?.B) ||
      state.sideChange.currentSides.A === state.sideChange.currentSides.B)
  ) {
    throw new MatchEngineError("The current side assignment is invalid.");
  }
  if (!["REGULAR", "TIEBREAK"].includes(state.currentGame.type)) {
    throw new MatchEngineError("The current game type is invalid.");
  }
}

function swapSides(state, reason, events) {
  if (!state.sideChange?.enabled) {
    return;
  }
  const {A, B} = state.sideChange.currentSides;
  state.sideChange.currentSides = {A: B, B: A};
  state.sideChange.pending = false;
  events.push({
    type: "SIDE_CHANGED",
    details: {
      currentSides: clone(state.sideChange.currentSides),
      reason,
    },
  });
}

function currentSideScore(state) {
  return clone(state.currentSet.games);
}

function hasSetWinner(games, target, strategy) {
  const difference = games.A - games.B;
  const requiredLead = strategy === "FIRST_TO_SIX" ? 1 : 2;
  return (games.A >= target || games.B >= target) && Math.abs(difference) >= requiredLead
    ? difference > 0 ? "A" : "B"
    : null;
}

function rotateTieBreakServer(state, pointsPlayed) {
  const serviceBlock = Math.ceil(pointsPlayed / 2);
  const firstServerIndex = state.serviceOrder.indexOf(
    state.currentGame.tieBreakFirstServer,
  );
  const playerIndex = (firstServerIndex + serviceBlock) % state.serviceOrder.length;
  const playerId = state.serviceOrder[playerIndex];
  state.server = {team: teamForPlayer(playerId), playerId};
}

function updateAfterSetWon(state, history, status, winner, tieBreakPoints) {
  const completedSet = {
    number: state.currentSet.number,
    games: currentSideScore(state),
    tieBreakPoints: tieBreakPoints ? clone(tieBreakPoints) : null,
    winner,
  };
  history.completedSets.push(completedSet);
  state.setsWon[winner] += 1;

  if (state.setsWon[winner] >= status.setsToWin) {
    return "FINISHED";
  }

  state.currentSet = {
    number: completedSet.number + 1,
    games: {A: 0, B: 0},
  };
  state.currentGame = {
    type: "REGULAR",
    points: {A: "0", B: "0"},
    tieBreakPoints: null,
    advantagesPlayed: 0,
    tieBreakFirstServer: null,
  };
  return "IN_PROGRESS";
}

function closeGame(state, history, format, rules, events, gameWinner, tieBreakPoints = null) {
  if (!tieBreakPoints) {
    state.currentSet.games[gameWinner] += 1;
    const gamesPlayed = state.currentSet.games.A + state.currentSet.games.B;
    events.push({
      type: "GAME_WON",
      team: gameWinner,
      details: {games: currentSideScore(state), tieBreak: false},
    });

    const tieBreakStarts =
      rules.setEndingStrategy === "TIE_BREAK" &&
      state.currentSet.games.A === rules.tieBreak.triggerAtGames &&
      state.currentSet.games.B === rules.tieBreak.triggerAtGames;

    if (tieBreakStarts) {
      state.currentGame = {
        type: "TIEBREAK",
        points: {A: "0", B: "0"},
        tieBreakPoints: {A: 0, B: 0},
        advantagesPlayed: 0,
        tieBreakFirstServer: state.server.playerId,
      };
      swapSides(state, "TIEBREAK_START", events);
      return "IN_PROGRESS";
    }

    const setWinner = hasSetWinner(
      state.currentSet.games,
      format.gamesToWinSet,
      rules.setEndingStrategy,
    );
    if (!setWinner) {
      state.currentGame = {
        type: "REGULAR",
        points: {A: "0", B: "0"},
        tieBreakPoints: null,
        advantagesPlayed: 0,
        tieBreakFirstServer: null,
      };
      if (gamesPlayed % 2 === 1) {
        swapSides(state, "ODD_GAME", events);
      }
      return "IN_PROGRESS";
    }

    events.push({
      type: "SET_WON",
      team: setWinner,
      details: {games: currentSideScore(state), setNumber: state.currentSet.number},
    });
    const nextStatus = updateAfterSetWon(
      state,
      history,
      {setsToWin: format.setsToWin},
      setWinner,
      null,
    );
    if (nextStatus === "FINISHED") {
      events.push({
        type: "MATCH_WON",
        team: setWinner,
        details: {setsWon: clone(state.setsWon)},
      });
    }
    if (gamesPlayed % 2 === 1) {
      swapSides(state, "ODD_GAME", events);
    }
    return nextStatus;
  }

  state.currentSet.games[gameWinner] += 1;
  const nextServerId = nextServerPlayer(state.serviceOrder, state.currentGame.tieBreakFirstServer);
  state.server = {
    team: teamForPlayer(nextServerId),
    playerId: nextServerId,
  };
  events.push({
    type: "GAME_WON",
    team: gameWinner,
    details: {games: currentSideScore(state), tieBreak: true},
  });
  events.push({
    type: "SET_WON",
    team: gameWinner,
    details: {
      games: currentSideScore(state),
      setNumber: state.currentSet.number,
      tieBreakPoints: clone(tieBreakPoints),
    },
  });
  const nextStatus = updateAfterSetWon(
    state,
    history,
    {setsToWin: format.setsToWin},
    gameWinner,
    tieBreakPoints,
  );
  if (nextStatus === "FINISHED") {
    events.push({
      type: "MATCH_WON",
      team: gameWinner,
      details: {setsWon: clone(state.setsWon)},
    });
  }
  return nextStatus;
}

function awardRegularPoint(state, team, rules) {
  const other = opposite(team);
  const points = state.currentGame.points;
  const scored = points[team];
  const otherScore = points[other];

  if (scored === "SP" || otherScore === "SP") {
    return true;
  }
  if (scored === "AD1" || scored === "AD2") {
    return true;
  }
  if (otherScore === "AD1" || otherScore === "AD2") {
    const advantagesPlayed = (state.currentGame.advantagesPlayed ?? 0) + 1;
    state.currentGame.advantagesPlayed = advantagesPlayed;
    if (
      rules.scoringStrategy === "STAR_POINT" &&
      advantagesPlayed >= rules.advantagesBeforeStarPoint
    ) {
      points.A = "SP";
      points.B = "SP";
    } else {
      points.A = "40";
      points.B = "40";
    }
    return false;
  }
  if (scored === "40" && otherScore === "40") {
    const decidingPointReady =
      rules.scoringStrategy === "NO_AD" ||
      (rules.scoringStrategy === "STAR_POINT" &&
        (state.currentGame.advantagesPlayed ?? 0) >= rules.advantagesBeforeStarPoint);
    if (decidingPointReady) {
      points.A = "SP";
      points.B = "SP";
    } else {
      points[team] = team === "A" ? "AD1" : "AD2";
    }
    return false;
  }

  const pointValue = POINT_VALUES.get(scored);
  if (pointValue === undefined) {
    throw new MatchEngineError("The point score cannot be advanced.");
  }
  if (pointValue === 3) {
    return true;
  }
  points[team] = POINTS[pointValue + 1];
  if (
    rules.scoringStrategy === "NO_AD" &&
    points.A === "40" &&
    points.B === "40"
  ) {
    points.A = "SP";
    points.B = "SP";
  }
  return false;
}

function addPoint({status, state, history, format, rules, team}) {
  const events = [];
  const before = {
    status,
    state: coreState(state),
    history: clone(history),
  };
  const nextStatus = status;
  const nextState = clone(state);
  const nextHistory = clone(history);
  nextState.undoHistory = [...(state.undoHistory ?? [])];
  nextState.serviceOrder = normalizeServiceOrder(nextState);
  recordPointStatistics(nextState, team);

  events.push({type: "POINT_WON", team});
  let finishedGame = false;

  if (nextState.currentGame.type === "TIEBREAK") {
    nextState.currentGame.tieBreakPoints[team] += 1;
    const tieBreakPoints = clone(nextState.currentGame.tieBreakPoints);
    const totalPoints = tieBreakPoints.A + tieBreakPoints.B;
    const difference = tieBreakPoints.A - tieBreakPoints.B;
    const tieBreakWinner =
      (tieBreakPoints.A >= rules.tieBreak.pointsToWin ||
        tieBreakPoints.B >= rules.tieBreak.pointsToWin) &&
      Math.abs(difference) >= rules.tieBreak.winByPoints
        ? difference > 0 ? "A" : "B"
        : null;

    rotateTieBreakServer(nextState, totalPoints);
    finishedGame = Boolean(tieBreakWinner);
    if (tieBreakWinner) {
      const resultingStatus = closeGame(
        nextState,
        nextHistory,
        format,
        rules,
        events,
        tieBreakWinner,
        tieBreakPoints,
      );
      if (totalPoints % 6 === 0) {
        swapSides(nextState, "TIEBREAK_INTERVAL", events);
      }
      const undoHistory = [
        ...(state.undoHistory ?? []),
        {before, pointTeam: team, eventTypes: events.map((event) => event.type)},
      ];
      nextState.undoHistory = undoHistory;
      return {status: resultingStatus, state: nextState, history: nextHistory, events};
    }
    if (totalPoints % 6 === 0) {
      swapSides(nextState, "TIEBREAK_INTERVAL", events);
    }
  } else {
    finishedGame = awardRegularPoint(nextState, team, rules);
    if (finishedGame) {
      const nextServerId = nextServerPlayer(
        nextState.serviceOrder,
        nextState.server.playerId,
      );
      nextState.server = {
        team: teamForPlayer(nextServerId),
        playerId: nextServerId,
      };
      const resultingStatus = closeGame(
        nextState,
        nextHistory,
        format,
        rules,
        events,
        team,
      );
      nextState.undoHistory = [
        ...(state.undoHistory ?? []),
        {before, pointTeam: team, eventTypes: events.map((event) => event.type)},
      ];
      return {status: resultingStatus, state: nextState, history: nextHistory, events};
    }
  }

  nextState.undoHistory = [
    ...(state.undoHistory ?? []),
    {before, pointTeam: team, eventTypes: events.map((event) => event.type)},
  ];
  return {status: nextStatus, state: nextState, history: nextHistory, events};
}

function undoPoint({status, state, history}) {
  const undoHistory = state.undoHistory ?? [];
  const lastTransition = undoHistory.at(-1);
  if (!lastTransition) {
    throw new MatchEngineError("There is no point to undo.", "NO_POINT_TO_UNDO");
  }

  const restored = clone(lastTransition.before);
  restored.state.undoHistory = undoHistory.slice(0, -1);
  return {
    ...restored,
    history: clone(restored.history ?? history),
    events: [
      {
        type: "POINT_UNDONE",
        team: lastTransition.pointTeam,
        details: {revertedEvents: lastTransition.eventTypes},
      },
    ],
  };
}

export function transitionMatch({status, state, history = {completedSets: []}, format, rules, command}) {
  validateInput({status, state, format, rules, command});

  if (command.type === "UNDO_POINT") {
    return undoPoint({status, state, history});
  }

  const normalizedState = clone(state);
  normalizedState.undoHistory ??= [];
  normalizedState.statistics ??= getMatchStatistics(normalizedState);
  normalizedState.serviceOrder = normalizeServiceOrder(normalizedState);
  normalizedState.currentGame.advantagesPlayed ??= 0;

  return addPoint({
    status,
    state: normalizedState,
    history: clone(history),
    format,
    rules,
    team: command.team,
  });
}
