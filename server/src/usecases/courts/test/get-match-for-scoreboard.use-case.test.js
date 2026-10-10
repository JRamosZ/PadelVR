import assert from "node:assert/strict";
import test from "node:test";
import {createGetMatchForScoreboardUseCase} from "../get-match-for-scoreboard.use-case.js";

const courtId = "507f1f77bcf86cd799439011";
const matchId = "507f1f77bcf86cd799439012";

test("returns match state and configured sensors for the scoreboard", async () => {
  const match = {
    id: matchId,
    status: "READY",
    teams: [{id: "A"}, {id: "B"}],
    state: {currentGame: {points: {A: "0", B: "0"}}},
    format: {},
    rules: {},
    history: {completedSets: []},
    revision: 0,
    startedAt: null,
    finishedAt: null,
  };
  const sensors = [{sensorId: "sensor-left", side: "LEFT"}];
  const getMatchForScoreboard = createGetMatchForScoreboardUseCase({
    courtRepository: {
      async findByIdWithSensors(id) {
        assert.equal(id, courtId);
        return {id, sensorModules: sensors};
      },
    },
    matchRepository: {
      async findByIdAndCourtId(id, requestedCourtId) {
        assert.equal(id, matchId);
        assert.equal(requestedCourtId, courtId);
        return match;
      },
    },
  });

  assert.deepEqual(await getMatchForScoreboard(courtId, matchId), {
    match,
    sensors,
  });
});

test("rejects invalid identifiers before reading repositories", async () => {
  let repositoryCalled = false;
  const getMatchForScoreboard = createGetMatchForScoreboardUseCase({
    courtRepository: {
      async findByIdWithSensors() {
        repositoryCalled = true;
      },
    },
    matchRepository: {
      async findByIdAndCourtId() {
        repositoryCalled = true;
      },
    },
  });

  await assert.rejects(getMatchForScoreboard(courtId, "invalid"), {
    message: "Invalid court or match ID.",
    statusCode: 400,
  });
  assert.equal(repositoryCalled, false);
});

test("returns not found if the match does not belong to the requested court", async () => {
  const getMatchForScoreboard = createGetMatchForScoreboardUseCase({
    courtRepository: {
      async findByIdWithSensors() {
        throw new Error("Should not load the court without a match.");
      },
    },
    matchRepository: {
      async findByIdAndCourtId() {
        return null;
      },
    },
  });

  await assert.rejects(getMatchForScoreboard(courtId, matchId), {
    message: "Match not found for this court.",
    statusCode: 404,
  });
});
