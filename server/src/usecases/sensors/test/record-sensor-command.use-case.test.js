import assert from "node:assert/strict";
import test from "node:test";
import {createRecordSensorCommandUseCase} from "../record-sensor-command.use-case.js";

const matchId = "507f1f77bcf86cd799439011";
const courtId = "507f1f77bcf86cd799439012";
const initialMatch = () => ({
  _id: matchId,
  id: matchId,
  courtId,
  status: "READY",
  revision: 0,
  startedAt: null,
  format: {type: "SINGLE_SET", setsToWin: 1, gamesToWinSet: 6},
  rules: {
    scoringStrategy: "ADVANTAGE",
    setEndingStrategy: "TWO_GAME_LEAD",
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
  },
  history: {completedSets: []},
});

function setup({side = "RIGHT", match = initialMatch()} = {}) {
  const sensorEvents = [];
  const matchEvents = [];
  const notifications = [];
  const dependencies = {
    courtRepository: {
      async findBySensorId(sensorId) {
        return [{
          id: courtId,
          sensorModules: [{sensorId, side, esp32Id: "esp32-left"}],
        }];
      },
    },
    matchRepository: {
      async findLatestByCourtId() {
        return match;
      },
      async persistSensorTransition({transition, startedAt, finishedAt}) {
        match.status = transition.status;
        match.state = transition.state;
        match.history = transition.history;
        match.startedAt = startedAt;
        match.finishedAt = finishedAt;
        match.revision += 1;
        return match;
      },
    },
    sensorEventRepository: {
      async findByCommandOrSequence({commandId, sensorId, sequence}) {
        return sensorEvents.find(
          (event) => event.commandId === commandId ||
            (event.sensorId === sensorId && event.sequence === sequence),
        ) ?? null;
      },
      async findLatestSequence(sensorId) {
        const events = sensorEvents.filter((event) => event.sensorId === sensorId);
        return events.length ? Math.max(...events.map((event) => event.sequence)) : null;
      },
      async create(event) {
        sensorEvents.push(event);
      },
    },
    matchEventRepository: {
      async createMany(events) {
        matchEvents.push(...events);
      },
    },
    async runTransaction(operation) {
      return operation({});
    },
    publishMatchUpdate(id, update) {
      notifications.push({id, update});
    },
    now: () => new Date("2026-10-09T20:00:00.000Z"),
  };

  return {
    record: createRecordSensorCommandUseCase(dependencies),
    match,
    sensorEvents,
    matchEvents,
    notifications,
  };
}

function payload(overrides = {}) {
  return {
    commandId: "cmd_000124",
    sensorId: "sensor_left",
    command: "ADD_POINT",
    sequence: 124,
    timestamp: "2026-10-09T19:59:59.000Z",
    ...overrides,
  };
}

test("starts a ready match and maps the sensor's physical side to the current team", async () => {
  const context = setup({side: "RIGHT"});

  const result = await context.record(payload());

  assert.equal(context.match.status, "IN_PROGRESS");
  assert.equal(context.match.startedAt.toISOString(), "2026-10-09T20:00:00.000Z");
  assert.deepEqual(context.match.state.currentGame.points, {A: "0", B: "15"});
  assert.equal(context.sensorEvents.length, 1);
  assert.equal(context.sensorEvents[0].timestamp.toISOString(), "2026-10-09T19:59:59.000Z");
  assert.deepEqual(context.matchEvents.map((event) => event.type), ["POINT_WON"]);
  assert.equal(result.revision, 1);
  assert.equal(context.notifications[0].id, matchId);
});

test("resolves the team again after a side change", async () => {
  const match = initialMatch();
  match.status = "IN_PROGRESS";
  match.state.sideChange.currentSides = {A: "RIGHT", B: "LEFT"};
  const context = setup({side: "LEFT", match});

  await context.record(payload());

  assert.deepEqual(context.match.state.currentGame.points, {A: "0", B: "15"});
});

test("returns an idempotent acknowledgement without persisting or notifying twice", async () => {
  const context = setup();
  const request = payload();

  const original = await context.record(request);
  const duplicate = await context.record(request);

  assert.equal(original.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(context.match.revision, 1);
  assert.equal(context.sensorEvents.length, 1);
  assert.equal(context.matchEvents.length, 1);
  assert.equal(context.notifications.length, 1);
});

test("undoing the first accepted point returns a ready match to READY", async () => {
  const context = setup();

  await context.record(payload());
  const undone = await context.record(payload({
    commandId: "cmd_000125",
    command: "UNDO_POINT",
    sequence: 125,
  }));

  assert.equal(undone.status, "READY");
  assert.equal(context.match.status, "READY");
  assert.equal(context.match.startedAt, null);
  assert.deepEqual(context.match.state.currentGame.points, {A: "0", B: "0"});
});

test("rejects stale sequences and does not mutate the match", async () => {
  const context = setup();
  await context.record(payload());

  await assert.rejects(
    context.record(payload({commandId: "cmd_old", sequence: 123})),
    (error) => error.statusCode === 409 && error.details.code === "STALE_SENSOR_SEQUENCE",
  );
  assert.equal(context.match.revision, 1);
});

test("records an undo command without assigning a team to its sensor", async () => {
  const match = initialMatch();
  match.status = "IN_PROGRESS";
  match.state.currentGame.points.A = "15";
  match.state.undoHistory = [{
    before: {
      status: "IN_PROGRESS",
      state: {
        ...match.state,
        currentGame: {...match.state.currentGame, points: {A: "0", B: "0"}},
      },
      history: {completedSets: []},
    },
    pointTeam: "A",
    eventTypes: ["POINT_WON"],
  }];
  const context = setup({match});

  const result = await context.record(payload({command: "UNDO_POINT"}));

  assert.deepEqual(context.match.state.currentGame.points, {A: "0", B: "0"});
  assert.equal(context.sensorEvents[0].command, "UNDO_POINT");
  assert.deepEqual(result.events.map((event) => event.type), ["POINT_UNDONE"]);
});
