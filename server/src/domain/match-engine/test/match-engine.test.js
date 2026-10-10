import assert from "node:assert/strict";
import test from "node:test";
import {getMatchStatistics, MatchEngineError, transitionMatch} from "../match-engine.js";

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
    serviceOrder: ["A-1", "B-1", "A-2", "B-2"],
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
    scoringStrategy: "STAR_POINT",
    advantagesBeforeStarPoint: 2,
    setEndingStrategy: "TIE_BREAK",
    tieBreak: {triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
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
    rules: {scoringStrategy: "NO_AD"},
  });

  const decidingPoint = command(match, "ADD_POINT", "B");
  assert.deepEqual(decidingPoint.state.currentGame.points, {A: "SP", B: "SP"});
  const wonGame = command({...match, ...decidingPoint}, "ADD_POINT", "B");
  assert.equal(wonGame.state.currentSet.games.B, 1);
});

test("keeps regular advantage scoring without converting deuce to a deciding point", () => {
  const match = createMatch({
    state: {currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "40"}}},
    rules: {scoringStrategy: "ADVANTAGE"},
  });

  const result = command(match, "ADD_POINT", "A");
  assert.deepEqual(result.state.currentGame.points, {A: "AD1", B: "40"});
});

test("uses the configured threshold for star-point scoring", () => {
  const match = createMatch({
    state: {
      currentGame: {
        ...createMatch().state.currentGame,
        points: {A: "AD1", B: "40"},
        advantagesPlayed: 0,
      },
    },
    rules: {scoringStrategy: "STAR_POINT", advantagesBeforeStarPoint: 1},
  });

  const result = command(match, "ADD_POINT", "B");
  assert.deepEqual(result.state.currentGame.points, {A: "SP", B: "SP"});
  assert.equal(result.state.currentGame.advantagesPlayed, 1);
});

test("records points won and break points only for the receiving team", () => {
  const match = createMatch({
    state: {
      server: {team: "A", playerId: "A-1"},
      currentGame: {...createMatch().state.currentGame, points: {A: "0", B: "40"}},
      statistics: {
        pointsWon: {A: 0, B: 0},
        breakPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
        starPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
      },
    },
  });

  const receiverWins = command(match, "ADD_POINT", "B");

  assert.deepEqual(receiverWins.state.statistics, {
    pointsWon: {A: 0, B: 1},
    breakPoints: {played: {A: 0, B: 1}, won: {A: 0, B: 1}},
    starPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
  });

  const undone = command({...match, ...receiverWins}, "UNDO_POINT");
  assert.deepEqual(undone.state.statistics, match.state.statistics);
});

test("reconstructs statistics for saved matches that predate statistics tracking", () => {
  const statistics = getMatchStatistics({
    undoHistory: [
      {
        pointTeam: "B",
        before: {
          state: {
            server: {team: "A"},
            currentGame: {type: "REGULAR", points: {A: "0", B: "40"}},
          },
        },
      },
    ],
  });

  assert.deepEqual(statistics, {
    pointsWon: {A: 0, B: 1},
    breakPoints: {played: {A: 0, B: 1}, won: {A: 0, B: 1}},
    starPoints: {played: {A: 0, B: 0}, won: {A: 0, B: 0}},
  });
});

test("records star points played by both teams and the winner", () => {
  const match = createMatch({
    state: {
      server: {team: "A", playerId: "A-1"},
      currentGame: {...createMatch().state.currentGame, points: {A: "SP", B: "SP"}},
    },
  });

  const result = command(match, "ADD_POINT", "B");

  assert.deepEqual(result.state.statistics, {
    pointsWon: {A: 0, B: 1},
    breakPoints: {played: {A: 0, B: 1}, won: {A: 0, B: 1}},
    starPoints: {played: {A: 1, B: 1}, won: {A: 0, B: 1}},
  });
});

test("counts a no-ad deciding point as a played star point for both teams", () => {
  const match = createMatch({
    rules: {scoringStrategy: "NO_AD"},
    state: {
      server: {team: "A", playerId: "A-1"},
      currentGame: {...createMatch().state.currentGame, points: {A: "SP", B: "SP"}},
    },
  });

  const result = command(match, "ADD_POINT", "A");

  assert.deepEqual(result.state.statistics, {
    pointsWon: {A: 1, B: 0},
    breakPoints: {played: {A: 0, B: 1}, won: {A: 0, B: 0}},
    starPoints: {
      played: {A: 1, B: 1},
      won: {A: 1, B: 0},
    },
  });
});

test("counts a no-ad point as both a break point and a star point for the receiver", () => {
  const match = createMatch({
    rules: {scoringStrategy: "NO_AD"},
    state: {
      server: {team: "A", playerId: "A-1"},
      currentGame: {...createMatch().state.currentGame, points: {A: "SP", B: "SP"}},
    },
  });

  const result = command(match, "ADD_POINT", "B");

  assert.deepEqual(result.state.statistics, {
    pointsWon: {A: 0, B: 1},
    breakPoints: {played: {A: 0, B: 1}, won: {A: 0, B: 1}},
    starPoints: {
      played: {A: 1, B: 1},
      won: {A: 0, B: 1},
    },
  });
});

test("does not count an ordinary deuce point as a star point", () => {
  const match = createMatch({
    rules: {scoringStrategy: "ADVANTAGE"},
    state: {
      server: {team: "A", playerId: "A-1"},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "40"}},
    },
  });

  const result = command(match, "ADD_POINT", "A");

  assert.deepEqual(result.state.statistics.starPoints, {
    played: {A: 0, B: 0},
    won: {A: 0, B: 0},
  });
});

test("moves directly from 30-40 to the no-ad deciding point at 40-40", () => {
  const match = createMatch({
    rules: {scoringStrategy: "NO_AD"},
  });
  let result = match;
  for (const team of ["A", "B", "A", "B", "A", "B"]) {
    result = {...result, ...command(result, "ADD_POINT", team)};
  }

  assert.deepEqual(result.state.currentGame.points, {A: "SP", B: "SP"});
  assert.equal(result.state.currentSet.games.A, 0);
  assert.equal(result.state.currentSet.games.B, 0);

  const decidingPoint = command(result, "ADD_POINT", "B");
  assert.deepEqual(decidingPoint.state.currentGame.points, {A: "0", B: "0"});
  assert.equal(decidingPoint.state.currentSet.games.B, 1);
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
  assert.deepEqual(result.state.currentSet.games, {A: 6, B: 4});
  assert.deepEqual(result.state.currentGame.points, {A: "40", B: "0"});
  assert.deepEqual(result.state.sideChange.currentSides, {A: "LEFT", B: "RIGHT"});
});

test("starts the next set with the next player's turn after a set win", () => {
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

test("rotates the serve through the four individual players game by game", () => {
  let match = createMatch();
  const expectedServers = ["B-1", "A-2", "B-2", "A-1"];

  for (const expectedServer of expectedServers) {
    match.state.currentGame.points = {A: "40", B: "0"};
    const result = command(match, "ADD_POINT", "A");
    assert.equal(result.state.server.playerId, expectedServer);
    match = {...match, ...result};
  }
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
  assert.equal(result.state.currentGame.tieBreakFirstServer, "B-1");
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
        tieBreakFirstServer: "A-1",
      },
    },
  });

  let result = match;
  const expectedServers = ["B-1", "B-1", "A-2", "A-2", "B-2", "B-2"];
  for (let index = 0; index < 6; index += 1) {
    result = {...result, ...command(result, "ADD_POINT", "A")};
    assert.equal(result.state.server.playerId, expectedServers[index]);
  }

  assert.deepEqual(result.state.currentGame.tieBreakPoints, {A: 6, B: 0});
  assert.deepEqual(result.state.sideChange.currentSides, {A: "RIGHT", B: "LEFT"});
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
        tieBreakFirstServer: "A-1",
      },
      server: {team: "A", playerId: "A-2"},
      serviceOrder: ["A-1", "B-1", "A-2", "B-2"],
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
  assert.deepEqual(setWon.state.currentGame.tieBreakPoints, {A: 8, B: 6});
  assert.deepEqual(setWon.events.map(({type}) => type), [
    "POINT_WON",
    "GAME_WON",
    "SET_WON",
    "MATCH_WON",
  ]);
});

test("first-to-six sets end at a one-game lead without a tie-break", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 5, B: 5}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
    rules: {setEndingStrategy: "FIRST_TO_SIX"},
  });

  const result = command(match, "ADD_POINT", "A");

  assert.equal(result.status, "FINISHED");
  assert.deepEqual(result.history.completedSets[0].games, {A: 6, B: 5});
  assert.equal(result.history.completedSets[0].tieBreakPoints, null);
  assert.equal(result.state.currentGame.type, "REGULAR");
});

test("two-game-lead sets continue beyond six until the two-game margin", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 5, B: 5}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
    rules: {setEndingStrategy: "TWO_GAME_LEAD"},
  });

  const atSixToFive = command(match, "ADD_POINT", "A");
  assert.equal(atSixToFive.status, "IN_PROGRESS");
  assert.deepEqual(atSixToFive.state.currentSet.games, {A: 6, B: 5});

  const setWon = command({...match, ...atSixToFive, state: {
    ...atSixToFive.state,
    currentGame: {...atSixToFive.state.currentGame, points: {A: "40", B: "0"}},
  }}, "ADD_POINT", "A");
  assert.equal(setWon.status, "FINISHED");
  assert.deepEqual(setWon.history.completedSets[0].games, {A: 7, B: 5});
});

test("two-game-lead sets continue past 6-6 without starting a tie-break", () => {
  const match = createMatch({
    state: {
      currentSet: {number: 1, games: {A: 6, B: 6}},
      currentGame: {...createMatch().state.currentGame, points: {A: "40", B: "0"}},
    },
    rules: {setEndingStrategy: "TWO_GAME_LEAD"},
  });

  const atSevenSix = command(match, "ADD_POINT", "A");
  assert.equal(atSevenSix.status, "IN_PROGRESS");
  assert.equal(atSevenSix.state.currentGame.type, "REGULAR");
  assert.deepEqual(atSevenSix.state.currentSet.games, {A: 7, B: 6});

  const setWon = command(
    {
      ...match,
      ...atSevenSix,
      state: {
        ...atSevenSix.state,
        currentGame: {...atSevenSix.state.currentGame, points: {A: "40", B: "0"}},
      },
    },
    "ADD_POINT",
    "A",
  );
  assert.equal(setWon.status, "FINISHED");
  assert.deepEqual(setWon.history.completedSets[0].games, {A: 8, B: 6});
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
