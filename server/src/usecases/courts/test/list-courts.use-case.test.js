import assert from "node:assert/strict";
import test from "node:test";
import {createListCourtsUseCase} from "../list-courts.use-case.js";

test("returns the courts from the repository for the home page", async () => {
  const courts = [
    {id: "court-1", name: "Court 1", status: "AVAILABLE", sensorModules: []},
    {id: "court-2", name: "Court 2", status: "MAINTENANCE", sensorModules: []},
  ];
  let repositoryCalls = 0;
  const listCourts = createListCourtsUseCase({
    async findAll() {
      repositoryCalls += 1;
      return courts;
    },
  });

  assert.deepEqual(await listCourts(), [
    {id: "court-1", name: "Court 1", status: "AVAILABLE"},
    {id: "court-2", name: "Court 2", status: "MAINTENANCE"},
  ]);
  assert.equal(repositoryCalls, 1);
});
