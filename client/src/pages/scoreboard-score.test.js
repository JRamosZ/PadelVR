import assert from "node:assert/strict";
import test from "node:test";
import {getPointScore} from "./scoreboard-score.js";

function createMatch(overrides = {}) {
  return {
    status: "IN_PROGRESS",
    state: {
      currentGame: {
        type: "REGULAR",
        points: {A: "40", B: "AD2"},
        tieBreakPoints: null,
      },
    },
    ...overrides,
  };
}

test("displays the active regular-game points", () => {
  const match = createMatch();

  assert.equal(getPointScore(match, "A"), "40");
  assert.equal(getPointScore(match, "B"), "AD2");
});

test("displays tie-break points while a tie-break is active", () => {
  const match = createMatch({
    state: {
      currentGame: {
        type: "TIEBREAK",
        points: null,
        tieBreakPoints: {A: 8, B: 6},
      },
    },
  });

  assert.equal(getPointScore(match, "A"), "8");
  assert.equal(getPointScore(match, "B"), "6");
});

test("does not show reset point zeros after the match finishes", () => {
  const match = createMatch({
    status: "FINISHED",
    state: {
      currentGame: {
        type: "REGULAR",
        points: {A: "0", B: "0"},
        tieBreakPoints: null,
      },
    },
  });

  assert.equal(getPointScore(match, "A"), "—");
  assert.equal(getPointScore(match, "B"), "—");
});
