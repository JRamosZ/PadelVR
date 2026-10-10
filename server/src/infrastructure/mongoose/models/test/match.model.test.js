import assert from "node:assert/strict";
import test from "node:test";
import Match from "../match.model.js";

test("defaults the star-point advantage threshold only for that strategy", () => {
  const starPointMatch = new Match({rules: {scoringStrategy: "STAR_POINT"}});
  const advantageMatch = new Match({rules: {scoringStrategy: "ADVANTAGE"}});

  assert.equal(starPointMatch.rules.advantagesBeforeStarPoint, 2);
  assert.equal(advantageMatch.rules.advantagesBeforeStarPoint, undefined);
  assert.equal(
    starPointMatch.validateSync()?.errors?.["rules.advantagesBeforeStarPoint"],
    undefined,
  );
  assert.equal(
    advantageMatch.validateSync()?.errors?.["rules.advantagesBeforeStarPoint"],
    undefined,
  );
});

test("requires a valid threshold for star-point scoring", () => {
  const match = new Match({
    rules: {scoringStrategy: "STAR_POINT", advantagesBeforeStarPoint: 3},
  });

  assert.ok(match.validateSync()?.errors?.["rules.advantagesBeforeStarPoint"]);
});

test("maps persisted legacy scoring configurations to the equivalent strategy", () => {
  const advantageMatch = Match.hydrate({
    rules: {
      gameScoring: "PREMIER",
      starPoint: {enabled: false, advantagesBeforeStarPoint: 0},
      tieBreak: {enabled: false, triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
    },
  });
  const noAdMatch = Match.hydrate({
    rules: {
      gameScoring: "NO_AD",
      starPoint: {enabled: false, advantagesBeforeStarPoint: 0},
      tieBreak: {enabled: true, triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
    },
  });
  const starPointMatch = Match.hydrate({
    rules: {
      gameScoring: "PREMIER",
      starPoint: {enabled: true, advantagesBeforeStarPoint: 1},
      tieBreak: {enabled: true, triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
    },
  });

  assert.equal(advantageMatch.rules.scoringStrategy, "ADVANTAGE");
  assert.equal(noAdMatch.rules.scoringStrategy, "NO_AD");
  assert.equal(starPointMatch.rules.scoringStrategy, "STAR_POINT");
  assert.equal(starPointMatch.rules.advantagesBeforeStarPoint, 1);
  assert.equal(advantageMatch.rules.setEndingStrategy, "TWO_GAME_LEAD");
  assert.equal(noAdMatch.rules.setEndingStrategy, "TIE_BREAK");
  assert.equal(starPointMatch.rules.setEndingStrategy, "TIE_BREAK");
});
