import assert from "node:assert/strict";
import {createServer} from "node:http";
import test from "node:test";
import express from "express";
import {createSensorCommandsController} from "../sensor-commands.controller.js";
import {createSensorCommandsRouter} from "../../../../routes/sensor-commands.js";

test("POST /api/v1/sensor-commands accepts a command and acknowledges a replay", async (context) => {
  let duplicate = false;
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/sensor-commands",
    createSensorCommandsRouter(
      createSensorCommandsController(async (body) => ({
        duplicate,
        commandId: body.commandId,
      })),
    ),
  );
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(async () => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const endpoint = `http://127.0.0.1:${address.port}/api/v1/sensor-commands`;
  const request = {
    commandId: "cmd_000124",
    sensorId: "sensor_left",
    command: "ADD_POINT",
    sequence: 124,
    timestamp: "2026-10-09T19:59:59.000Z",
  };

  const accepted = await fetch(endpoint, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(request),
  });
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), {
    accepted: true,
    duplicate: false,
    commandId: "cmd_000124",
  });

  duplicate = true;
  const replay = await fetch(endpoint, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(request),
  });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).duplicate, true);
});
