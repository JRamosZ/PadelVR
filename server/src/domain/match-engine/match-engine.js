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

function nextPlayer(playerId, team) {
  const playerNumber = Number(playerId?.split("-").at(-1));
  return `${team}-${playerNumber === 1 ? 2 : 1}`;
}

function normalizeServiceOrder(state) {
  const order = state.serviceOrder ?? {};
  return {
    A: order.A ?? (state.server.team === "A" ? state.server.playerId : "A-1"),
    B: order.B ?? (state.server.team === "B" ? state.server.playerId : "B-1"),
  };
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
  if (!rules.tieBreak || typeof rules.tieBreak.enabled !== "boolean") {
    throw new MatchEngineError("The tie-break configuration is incomplete.");
  }
  if (!["PREMIER", "NO_AD"].includes(rules.gameScoring)) {
    throw new MatchEngineError("Unsupported game scoring rule.");
  }
  if (![1, 2].includes(format.setsToWin) || !Number.isInteger(format.gamesToWinSet)) {
    throw new MatchEngineError("The match format is invalid.");
  }
  if (
    rules.tieBreak?.enabled &&
    (!Number.isInteger(rules.tieBreak.triggerAtGames) ||
      !Number.isInteger(rules.tieBreak.pointsToWin) ||
      !Number.isInteger(rules.tieBreak.winByPoints))
  ) {
    throw new MatchEngineError("The tie-break configuration is invalid.");
  }
  if (
    rules.starPoint?.enabled &&
    !Number.isInteger(rules.starPoint.advantagesBeforeStarPoint)
  ) {
    throw new MatchEngineError("The star-point configuration is invalid.");
  }
  if (!TEAMS.includes(state.server.team) || typeof state.server.playerId !== "string") {
    throw new MatchEngineError("The current server is invalid.");
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
    (!rules.tieBreak.enabled ||
      !TEAMS.includes(state.currentGame.tieBreakFirstServer) ||
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

function hasSetWinner(games, target) {
  const difference = games.A - games.B;
  return (games.A >= target || games.B >= target) && Math.abs(difference) >= 2
    ? difference > 0 ? "A" : "B"
    : null;
}

function getTieBreakServer(firstServer, pointsServed) {
  if (pointsServed === 0) {
    return firstServer;
  }
  const block = Math.floor((pointsServed + 1) / 2);
  return block % 2 === 0 ? firstServer : opposite(firstServer);
}

function rotateTieBreakServer(state, pointsScored, previousServerTeam) {
  const nextTeam = getTieBreakServer(state.currentGame.tieBreakFirstServer, pointsScored);
  if (nextTeam !== previousServerTeam) {
    state.serviceOrder[previousServerTeam] = nextPlayer(
      state.server.playerId,
      previousServerTeam,
    );
  }
  state.server = {team: nextTeam, playerId: state.serviceOrder[nextTeam]};
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
      rules.tieBreak.enabled &&
      state.currentSet.games.A === rules.tieBreak.triggerAtGames &&
      state.currentSet.games.B === rules.tieBreak.triggerAtGames;

    if (tieBreakStarts) {
      state.currentGame = {
        type: "TIEBREAK",
        points: {A: "0", B: "0"},
        tieBreakPoints: {A: 0, B: 0},
        advantagesPlayed: 0,
        tieBreakFirstServer: state.server.team,
      };
      swapSides(state, "TIEBREAK_START", events);
      return "IN_PROGRESS";
    }

    const setWinner = hasSetWinner(state.currentSet.games, format.gamesToWinSet);
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
  const firstServer = state.currentGame.tieBreakFirstServer;
  const nextServingTeam = opposite(firstServer);
  state.server = {
    team: nextServingTeam,
    playerId: state.serviceOrder[nextServingTeam],
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
    const maxAdvantages = rules.starPoint?.enabled
      ? rules.starPoint.advantagesBeforeStarPoint
      : null;
    if (maxAdvantages !== null && advantagesPlayed >= maxAdvantages) {
      points.A = "SP";
      points.B = "SP";
    } else {
      points.A = "40";
      points.B = "40";
    }
    return false;
  }
  if (scored === "40" && otherScore === "40") {
    const starPointReady =
      rules.gameScoring === "NO_AD" ||
      (rules.starPoint?.enabled &&
        (state.currentGame.advantagesPlayed ?? 0) >=
          rules.starPoint.advantagesBeforeStarPoint);
    if (starPointReady) {
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

  events.push({type: "POINT_WON", team});
  let finishedGame = false;

  if (nextState.currentGame.type === "TIEBREAK") {
    const previousServerTeam = nextState.server.team;
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

    rotateTieBreakServer(nextState, totalPoints, previousServerTeam);
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
      const servingTeam = nextState.server.team;
      nextState.serviceOrder[servingTeam] = nextPlayer(
        nextState.server.playerId,
        servingTeam,
      );
      const nextServingTeam = opposite(servingTeam);
      nextState.server = {
        team: nextServingTeam,
        playerId: nextState.serviceOrder[nextServingTeam],
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
