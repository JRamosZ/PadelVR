import assert from "node:assert/strict";
import test from "node:test";
import {createGetCourtSetupUseCase} from "./get-court-setup.use-case.js";

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
      async findLatestByCourtId() {
        matchQueryCount += 1;
        return null;
      },
    },
  );

  const result = await getCourtSetup(courtId);

  assert.deepEqual(result, {
    court: {id: courtId, name: "Cancha 1", status: "MAINTENANCE"},
    match: null,
  });
  assert.equal(matchQueryCount, 0);
});

test("returns the latest match when the court is available", async () => {
  const startedAt = new Date("2026-10-06T12:00:00.000Z");
  let queriedCourtId;
  const getCourtSetup = createGetCourtSetupUseCase(
    {
      async findById() {
        return {id: courtId, name: "Cancha 1", status: "AVAILABLE"};
      },
    },
    {
      async findLatestByCourtId(id) {
        queriedCourtId = id;
        return {id: "match-1", status: "ACTIVE", startedAt};
      },
    },
  );

  const result = await getCourtSetup(courtId);

  assert.equal(queriedCourtId, courtId);
  assert.deepEqual(result.match, {
    id: "match-1",
    status: "ACTIVE",
    startedAt,
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
      async findLatestByCourtId() {
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
