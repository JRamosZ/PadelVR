import assert from "node:assert/strict";
import test from "node:test";
import {MatchEngineError, transitionMatch} from "../match-engine.js";

function createMatch(overrides = {}) {
  const state = {
    setsWon: {A: 0, B: 0},
    currentSet: {number: 1, games: {A: 0, B: 0}},
    currentGame: {
      type: "REGULAR",
      points: {A: "0", B: "0"},
      tieBreakPoints: null,
      advantagesPlayed: 0,
      tieBreakFirstServer: null,
    },
    server: {team: "A", playerId: "A-1"},
    serviceOrder: {A: "A-1", B: "B-1"},
    sideChange: {
      enabled: true,
      currentSides: {A: "LEFT", B: "RIGHT"},
      pending: false,
    },
    undoHistory: [],
  };
  const history = {completedSets: []};
  const format = {type: "SINGLE_SET", setsToWin: 1, gamesToWinSet: 6};
  const rules = {
    gameScoring: "PREMIER",
    starPoint: {enabled: true, advantagesBeforeStarPoint: 2},
    tieBreak: {enabled: true, triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
    sideChange: {enabled: true, policy: "STANDARD"},
  };

  return {
    status: overrides.status ?? "IN_PROGRESS",
    state: {...state, ...overrides.state},
    history: overrides.history ?? history,
    format: {...format, ...overrides.format},
    rules: {...rules, ...overrides.rules},
  };
}

function command(match, type, team) {
  return transitionMatch({
    ...match,
    command: {type, ...(team ? {team} : {})},
  });
}

test("advances regular points without mutating the input state", () => {
  const match = createMatch();
  const result = command(match, "ADD_POINT", "A");

  assert.equal(result.state.currentGame.points.A, "15");
  assert.deepEqual(match.state.currentGame.points, {A: "0", B: "0"});
  assert.deepEqual(result.events, [{type: "POINT_WON", team: "A"}]);
});

test("awards a game after the configured two failed advantages and star point", () => {
  let match = createMatch({
    state: {currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "40"}}},
  });

  match = {...match, ...command(match, "ADD_POINT", "A")};
  assert.deepEqual(match.state.currentGame.points, {A: "AD1", B: "40"});

  match = {...match, ...command(match, "ADD_POINT", "B")};
  assert.deepEqual(match.state.currentGame.points, {A: "40", B: "40"});
  assert.equal(match.state.currentGame.advantagesPlayed, 1);

  match = {...match, ...command(match, "ADD_POINT", "B")};
  assert.deepEqual(match.state.currentGame.points, {A: "40", B: "AD2"});
  match = {...match, ...command(match, "ADD_POINT", "A")};

  assert.deepEqual(match.state.currentGame.points, {A: "SP", B: "SP"});
  assert.equal(match.state.currentGame.advantagesPlayed, 2);

  const result = command(match, "ADD_POINT", "B");
  assert.equal(result.state.currentSet.games.B, 1);
  assert.equal(result.state.server.team, "B");
  assert.deepEqual(result.events.map(({type}) => type), [
    "POINT_WON",
    "GAME_WON",
    "SIDE_CHANGED",
  ]);
});

test("uses the deciding point for no-ad scoring", () => {
  const match = createMatch({
    state: {currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "40"}}},
    rules: {gameScoring: "NO_AD", starPoint: {enabled: false, advantagesBeforeStarPoint: 0}},
  });

  const decidingPoint = command(match, "ADD_POINT", "B");
  assert.deepEqual(decidingPoint.state.currentGame.points, {A: "SP", B: "SP"});
  const wonGame = command({...match, ...decidingPoint}, "ADD_POINT", "B");
  assert.equal(wonGame.state.currentSet.games.B, 1);
});

test("emits point, game, set, and match events when a point wins a match", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 5, B: 4}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
  });

  const result = command(match, "ADD_POINT", "A");

  assert.equal(result.status, "FINISHED");
  assert.deepEqual(result.events.map(({type}) => type), [
    "POINT_WON",
    "GAME_WON",
    "SET_WON",
    "MATCH_WON",
  ]);
  assert.deepEqual(result.history.completedSets[0].games, {A: 6, B: 4});
  assert.deepEqual(result.state.sideChange.currentSides, {A: "LEFT", B: "RIGHT"});
});

test("starts the next set with the next team's server after a set win", () => {
  const match = createMatch({
    format: {setsToWin: 2},
    state: {
      currentSet: {number: 1, games: {A: 5, B: 4}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
  });

  const result = command(match, "ADD_POINT", "A");

  assert.equal(result.status, "IN_PROGRESS");
  assert.deepEqual(result.state.setsWon, {A: 1, B: 0});
  assert.deepEqual(result.state.currentSet, {number: 2, games: {A: 0, B: 0}});
  assert.deepEqual(result.state.server, {team: "B", playerId: "B-1"});
  assert.equal(result.history.completedSets.length, 1);
});

test("enters a tie-break with the next server and changes sides", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 5, B: 6}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
  });

  const result = command(match, "ADD_POINT", "A");

  assert.equal(result.state.currentGame.type, "TIEBREAK");
  assert.deepEqual(result.state.currentGame.tieBreakPoints, {A: 0, B: 0});
  assert.equal(result.state.currentGame.tieBreakFirstServer, "B");
  assert.deepEqual(result.state.server, {team: "B", playerId: "B-1"});
  assert.deepEqual(result.state.sideChange.currentSides, {A: "RIGHT", B: "LEFT"});
  assert.equal(result.events.at(-1).details.reason, "TIEBREAK_START");
});

test("rotates tie-break service and switches sides after six points", () => {
  const match = createMatch({
    state: {
      currentGame: {
        type: "TIEBREAK",
        points: {A: "0", B: "0"},
        tieBreakPoints: {A: 0, B: 0},
        advantagesPlayed: 0,
        tieBreakFirstServer: "A",
      },
    },
  });

  let result = match;
  for (let index = 0; index < 6; index += 1) {
    result = {...result, ...command(result, "ADD_POINT", "A")};
  }

  assert.deepEqual(result.state.currentGame.tieBreakPoints, {A: 6, B: 0});
  assert.deepEqual(result.state.sideChange.currentSides, {A: "RIGHT", B: "LEFT"});
  assert.equal(result.state.server.team, "B");
  assert.ok(result.events.some((event) => event.type === "SIDE_CHANGED"));
});

test("closes a tie-break set only after the required lead", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 6, B: 6}},
      currentGame: {
        type: "TIEBREAK",
        points: {A: "0", B: "0"},
        tieBreakPoints: {A: 6, B: 6},
        advantagesPlayed: 0,
        tieBreakFirstServer: "A",
      },
      server: {team: "A", playerId: "A-2"},
      serviceOrder: {A: "A-2", B: "B-1"},
    },
  });

  const onePointLead = command(match, "ADD_POINT", "A");
  assert.equal(onePointLead.state.currentGame.type, "TIEBREAK");

  const setWon = command({...match, ...onePointLead}, "ADD_POINT", "A");
  assert.equal(setWon.status, "FINISHED");
  assert.deepEqual(setWon.history.completedSets[0], {
    number: 1,
    games: {A: 7, B: 6},
    tieBreakPoints: {A: 8, B: 6},
    winner: "A",
  });
  assert.deepEqual(setWon.events.map(({type}) => type), [
    "POINT_WON",
    "GAME_WON",
    "SET_WON",
    "MATCH_WON",
  ]);
});

test("undo restores a finished match to the exact pre-point state", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 5, B: 4}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
  });
  const finalPoint = command(match, "ADD_POINT", "A");
  assert.equal(finalPoint.status, "FINISHED");

  const corrected = command({...match, ...finalPoint}, "UNDO_POINT");

  assert.equal(corrected.status, "IN_PROGRESS");
  assert.deepEqual(corrected.state.currentSet.games, {A: 5, B: 4});
  assert.deepEqual(corrected.state.currentGame.points, {A: "40", B: "0"});
  assert.equal(corrected.history.completedSets.length, 0);
  assert.deepEqual(corrected.events, [
    {type: "POINT_UNDONE", team: "A", details: {revertedEvents: [
      "POINT_WON",
      "GAME_WON",
      "SET_WON",
      "MATCH_WON",
    ]}},
  ]);
});

test("rejects commands outside the allowed match status and empty undo history", () => {
  const match = createMatch({status: "PAUSED"});

  assert.throws(() => command(match, "ADD_POINT", "A"), MatchEngineError);
  assert.throws(
    () => command(createMatch(), "UNDO_POINT"),
    (error) => error instanceof MatchEngineError && error.code === "NO_POINT_TO_UNDO",
  );
});
