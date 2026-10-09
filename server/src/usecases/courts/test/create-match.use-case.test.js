import assert from "node:assert/strict";
import test from "node:test";
import {ApplicationError} from "../../../domain/errors/application.error.js";
import {createCreateMatchUseCase} from "../create-match.use-case.js";

const courtId = "507f1f77bcf86cd799439011";
const teams = [
  {
    id: "A",
    players: [
      {name: " Jorge "},
      {name: "Carlos"},
    ],
  },
  {
    id: "B",
    players: [{name: "Luis"}, {name: "Miguel"}],
  },
];

function createDependencies({courtStatus = "AVAILABLE", latestMatch = null} = {}) {
  let savedMatch;
  const operations = [];
  const useCase = createCreateMatchUseCase({
    courtRepository: {
      async findById() {
        return {id: courtId, name: "Cancha 1", status: courtStatus};
      },
    },
    matchRepository: {
      async findLatestByCourtId() {
        return latestMatch;
      },
      async finishActiveMatch(_courtId, matchId) {
        operations.push({type: "finish", matchId});
        return latestMatch?.id === matchId;
      },
      async create(match) {
        operations.push({type: "create"});
        savedMatch = match;
        return {id: "match-1", status: match.status};
      },
    },
    matchModes: {
      TRADITIONAL: {
        format: {type: "BEST_OF_THREE", setsToWin: 2, gamesToWinSet: 6},
        rules: {
          gameScoring: "PREMIER",
          starPoint: {enabled: true, advantagesBeforeStarPoint: 2},
          tieBreak: {enabled: true, triggerAtGames: 6, pointsToWin: 7, winByPoints: 2},
          sideChange: {enabled: true, policy: "STANDARD"},
        },
      },
    },
  });

  return {useCase, getSavedMatch: () => savedMatch, operations};
}

test("creates a ready match with normalized team names and initial score", async () => {
  const {useCase, getSavedMatch} = createDependencies();

  const result = await useCase(courtId, {modeId: "TRADITIONAL", teams});
  const savedMatch = getSavedMatch();

  assert.deepEqual(result, {id: "match-1", status: "READY"});
  assert.equal(savedMatch.teams[0].players[0].name, "Jorge");
  assert.deepEqual(savedMatch.state.currentGame.points, {A: "0", B: "0"});
  assert.equal(savedMatch.state.server.playerId, "A-1");
});

test("uses validated custom settings for the match configuration", async () => {
  const {useCase, getSavedMatch} = createDependencies();

  await useCase(courtId, {
    modeId: "CUSTOM",
    customSettings: {
      setsToWin: 1,
      gamesToWinSet: 6,
      gameScoring: "NO_AD",
      tieBreakEnabled: true,
      starPointEnabled: false,
    },
    teams,
  });

  assert.deepEqual(getSavedMatch().format, {
    type: "SINGLE_SET",
    setsToWin: 1,
    gamesToWinSet: 6,
  });
  assert.equal(getSavedMatch().rules.gameScoring, "NO_AD");
});

test("does not create a match if the court is unavailable", async () => {
  const {useCase} = createDependencies({courtStatus: "MAINTENANCE"});

  await assert.rejects(
    useCase(courtId, {modeId: "TRADITIONAL", teams}),
    (error) => error instanceof ApplicationError && error.statusCode === 409,
  );
});

test("requires confirmation before finishing the current match", async () => {
  const {useCase, operations} = createDependencies({
    latestMatch: {id: "previous", status: "IN_PROGRESS"},
  });

  await assert.rejects(
    useCase(courtId, {modeId: "TRADITIONAL", teams}),
    (error) =>
      error instanceof ApplicationError &&
      error.statusCode === 409 &&
      error.details.code === "ACTIVE_MATCH_CONFIRMATION_REQUIRED" &&
      error.details.activeMatch.id === "previous",
  );
  assert.deepEqual(operations, []);
});

test("finishes the confirmed current match before creating the new one", async () => {
  const {useCase, operations} = createDependencies({
    latestMatch: {id: "previous", status: "PAUSED"},
  });

  const result = await useCase(courtId, {
    modeId: "TRADITIONAL",
    teams,
    finishActiveMatchId: "previous",
  });

  assert.deepEqual(result, {id: "match-1", status: "READY"});
  assert.deepEqual(operations, [
    {type: "finish", matchId: "previous"},
    {type: "create"},
  ]);
});

test("rejects a confirmation for a match that is no longer current", async () => {
  const {useCase, operations} = createDependencies({
    latestMatch: {id: "current", status: "READY"},
  });

  await assert.rejects(
    useCase(courtId, {
      modeId: "TRADITIONAL",
      teams,
      finishActiveMatchId: "stale",
    }),
    (error) =>
      error instanceof ApplicationError &&
      error.statusCode === 409 &&
      error.details.code === "ACTIVE_MATCH_CONFIRMATION_REQUIRED",
  );
  assert.deepEqual(operations, []);
});
