import assert from "node:assert/strict";
import test from "node:test";
import {getScoreboardHighlights} from "./scoreboard-highlights.js";

function createMatch(overrides = {}) {
  return {
    status: "IN_PROGRESS",
    format: {setsToWin: 2, gamesToWinSet: 6},
    rules: {
      scoringStrategy: "ADVANTAGE",
      setEndingStrategy: "TIE_BREAK",
      tieBreak: {triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
    },
    state: {
      setsWon: {A: 0, B: 0},
      currentSet: {number: 1, games: {A: 0, B: 0}},
      currentGame: {
        type: "REGULAR",
        points: {A: "0", B: "0"},
        tieBreakPoints: null,
        advantagesPlayed: 0,
      },
      server: {team: "A", playerId: "A-1"},
    },
    ...overrides,
  };
}

test("identifies set point independent of which team is serving", () => {
  const match = createMatch({
    state: {
      ...createMatch().state,
      currentSet: {number: 1, games: {A: 5, B: 4}},
      currentGame: {
        type: "REGULAR",
        points: {A: "40", B: "0"},
        advantagesPlayed: 0,
      },
      server: {team: "A", playerId: "A-1"},
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), [
    {type: "SET_POINT", team: "A", label: "SET POINT"},
  ]);
});

test("treats reaching six with a one-game lead as set point in first-to-six mode", () => {
  const match = createMatch({
    rules: {
      ...createMatch().rules,
      setEndingStrategy: "FIRST_TO_SIX",
    },
    state: {
      ...createMatch().state,
      currentSet: {number: 1, games: {A: 5, B: 5}},
      currentGame: {
        type: "REGULAR",
        points: {A: "40", B: "0"},
        advantagesPlayed: 0,
      },
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), [
    {type: "SET_POINT", team: "A", label: "SET POINT"},
  ]);
});

test("does not show set point until a two-game lead in extended sets", () => {
  const match = createMatch({
    rules: {
      ...createMatch().rules,
      setEndingStrategy: "TWO_GAME_LEAD",
    },
    state: {
      ...createMatch().state,
      currentSet: {number: 1, games: {A: 6, B: 5}},
      currentGame: {
        type: "REGULAR",
        points: {A: "0", B: "40"},
        advantagesPlayed: 0,
      },
      server: {team: "B", playerId: "B-1"},
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), []);
});

test("identifies match point when the next point wins the match", () => {
  const match = createMatch({
    state: {
      ...createMatch().state,
      setsWon: {A: 1, B: 0},
      currentSet: {number: 2, games: {A: 5, B: 3}},
      currentGame: {
        type: "REGULAR",
        points: {A: "40", B: "0"},
        advantagesPlayed: 0,
      },
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), [
    {type: "MATCH_POINT", team: "A", label: "MATCH POINT"},
  ]);
});

test("identifies break point when the receiving team can win the current game", () => {
  const match = createMatch({
    state: {
      ...createMatch().state,
      currentGame: {
        type: "REGULAR",
        points: {A: "30", B: "40"},
        advantagesPlayed: 0,
      },
      server: {team: "A", playerId: "A-1"},
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), [
    {
      type: "BREAK_POINT",
      team: "B",
      label: "BREAK POINT",
      details: "Equipo A está sacando",
    },
  ]);
});

test("shows only match point when it coincides with break point", () => {
  const match = createMatch({
    state: {
      ...createMatch().state,
      setsWon: {A: 0, B: 1},
      currentSet: {number: 2, games: {A: 5, B: 6}},
      currentGame: {
        type: "REGULAR",
        points: {A: "30", B: "40"},
        advantagesPlayed: 0,
      },
      server: {team: "A", playerId: "A-1"},
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), [
    {type: "MATCH_POINT", team: "B", label: "MATCH POINT"},
  ]);
});

test("shows set point instead of break point when both apply", () => {
  const match = createMatch({
    state: {
      ...createMatch().state,
      currentSet: {number: 1, games: {A: 5, B: 6}},
      currentGame: {
        type: "REGULAR",
        points: {A: "30", B: "40"},
        advantagesPlayed: 0,
      },
      server: {team: "A", playerId: "A-1"},
    },
  });

  assert.deepEqual(getScoreboardHighlights(match), [
    {type: "SET_POINT", team: "B", label: "SET POINT"},
  ]);
});

test("does not report break point for the serving team or during a tie-break", () => {
  const match = createMatch({
    state: {
      ...createMatch().state,
      currentGame: {
        type: "REGULAR",
        points: {A: "40", B: "30"},
        advantagesPlayed: 0,
      },
    },
  });
  assert.deepEqual(getScoreboardHighlights(match), []);

  match.state.currentGame = {
    type: "TIEBREAK",
    tieBreakPoints: {A: 6, B: 6},
  };
  assert.deepEqual(getScoreboardHighlights(match), []);
});

test("does not display decision-point indicators after the match finishes", () => {
  const match = createMatch({
    status: "FINISHED",
    state: {
      ...createMatch().state,
      currentSet: {number: 1, games: {A: 5, B: 4}},
      currentGame: {
        type: "REGULAR",
        points: {A: "40", B: "0"},
        advantagesPlayed: 0,
      },
    },
  });
  assert.deepEqual(getScoreboardHighlights(match), []);
});
