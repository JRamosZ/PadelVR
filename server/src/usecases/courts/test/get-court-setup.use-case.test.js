import assert from "node:assert/strict";
import test from "node:test";
import {createGetCourtSetupUseCase} from "../get-court-setup.use-case.js";

const courtId = "507f1f77bcf86cd799439011";

test("does not query matches when the court is unavailable", async () => {
  let matchQueryCount = 0;
  const getCourtSetup = createGetCourtSetupUseCase(
    {
      async findById() {
        return {id: courtId, name: "Cancha 1", status: "MAINTENANCE"};
      },
    },
    {
      async findLatestActiveByCourtId() {
        matchQueryCount += 1;
        return null;
      },
      async findLatestFinishedByCourtId() {
        matchQueryCount += 1;
        return null;
      },
    },
  );

  const result = await getCourtSetup(courtId);

  assert.deepEqual(result, {
    court: {id: courtId, name: "Cancha 1", status: "MAINTENANCE"},
    match: null,
    lastFinishedMatch: null,
  });
  assert.equal(matchQueryCount, 0);
});

test("returns the active match and the latest finished match when the court is available", async () => {
  const startedAt = new Date("2026-10-06T12:00:00.000Z");
  const finishedAt = new Date("2026-10-06T13:00:00.000Z");
  const queriedCourtIds = [];
  const getCourtSetup = createGetCourtSetupUseCase(
    {
      async findById() {
        return {id: courtId, name: "Cancha 1", status: "AVAILABLE"};
      },
    },
    {
      async findLatestActiveByCourtId(id) {
        queriedCourtIds.push(id);
        return {id: "match-1", status: "ACTIVE", startedAt};
      },
      async findLatestFinishedByCourtId(id) {
        queriedCourtIds.push(id);
        return {id: "match-2", status: "FINISHED", finishedAt};
      },
    },
  );

  const result = await getCourtSetup(courtId);

  assert.deepEqual(queriedCourtIds, [courtId, courtId]);
  assert.deepEqual(result.match, {
    id: "match-1",
    status: "ACTIVE",
    startedAt,
  });
  assert.deepEqual(result.lastFinishedMatch, {
    id: "match-2",
    status: "FINISHED",
    finishedAt,
  });
});

test("rejects invalid court IDs before accessing repositories", async () => {
  let repositoryCalled = false;
  const getCourtSetup = createGetCourtSetupUseCase(
    {
      async findById() {
        repositoryCalled = true;
      },
    },
    {
      async findLatestActiveByCourtId() {
        repositoryCalled = true;
      },
      async findLatestFinishedByCourtId() {
        repositoryCalled = true;
      },
    },
  );

  await assert.rejects(getCourtSetup("invalid"), {
    message: "Invalid court ID.",
    statusCode: 400,
  });
  assert.equal(repositoryCalled, false);
});
