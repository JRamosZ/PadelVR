import assert from "node:assert/strict";
import test from "node:test";
import {createSeedInitialCourtUseCase} from "../seed-initial-court.use-case.js";

test("seeds the initial court with its configured ID", async () => {
  let createdCourt;
  const seedInitialCourt = createSeedInitialCourtUseCase({
    async existsAny() {
      return false;
    },
    async create(court) {
      createdCourt = court;
    },
  });

  await seedInitialCourt();

  assert.equal(createdCourt._id, "6ac972ff5813587ea2796fe0");
  assert.equal(createdCourt.name, "Cancha 1");
});

test("does not create the initial court when another court already exists", async () => {
  let createCalled = false;
  const seedInitialCourt = createSeedInitialCourtUseCase({
    async existsAny() {
      return true;
    },
    async create() {
      createCalled = true;
    },
  });

  await seedInitialCourt();

  assert.equal(createCalled, false);
});
