import assert from "node:assert/strict";
import {createServer} from "node:http";
import test from "node:test";
import {WebSocket} from "ws";
import {createMatchUpdateHub} from "../match-update-hub.js";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function nextMessage(client) {
  return new Promise((resolve, reject) => {
    client.once("message", (message) => resolve(JSON.parse(message.toString())));
    client.once("error", reject);
  });
}

test("sends match updates only to clients subscribed to that match", async (context) => {
  const server = createServer();
  const hub = createMatchUpdateHub();
  hub.attachToServer(server);
  const port = await listen(server);
  const matchA = "507f1f77bcf86cd799439011";
  const matchB = "507f1f77bcf86cd799439012";
  const clientA = new WebSocket(`ws://127.0.0.1:${port}/ws?matchId=${matchA}`);
  const clientB = new WebSocket(`ws://127.0.0.1:${port}/ws?matchId=${matchB}`);
  const subscriptionA = nextMessage(clientA);
  const subscriptionB = nextMessage(clientB);
  const receivedA = [];
  const receivedB = [];
  clientA.on("message", (message) => receivedA.push(JSON.parse(message.toString())));
  clientB.on("message", (message) => receivedB.push(JSON.parse(message.toString())));

  context.after(async () => {
    const clients = [clientA, clientB];
    const closed = clients
      .filter((client) => client.readyState !== WebSocket.CLOSED)
      .map((client) => new Promise((resolve) => client.once("close", resolve)));
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.close();
    }
    await Promise.all(closed);
    hub.close();
    await new Promise((resolve) => server.close(resolve));
  });

  await Promise.all([
    new Promise((resolve, reject) => {
      clientA.once("open", resolve);
      clientA.once("error", reject);
    }),
    new Promise((resolve, reject) => {
      clientB.once("open", resolve);
      clientB.once("error", reject);
    }),
  ]);
  assert.deepEqual(await Promise.all([subscriptionA, subscriptionB]), [
    {type: "match.subscribed", matchId: matchA},
    {type: "match.subscribed", matchId: matchB},
  ]);

  hub.publish(matchA, {type: "match.updated", matchId: matchA, revision: 3});
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(receivedA.length, 2);
  assert.deepEqual(receivedA[1], {
    type: "match.updated",
    matchId: matchA,
    revision: 3,
  });
  assert.equal(receivedB.length, 1);
});
