import {WebSocket, WebSocketServer} from "ws";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function createMatchUpdateHub() {
  const webSocketServer = new WebSocketServer({noServer: true});

  function handleUpgrade(request, socket, head) {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname !== "/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const matchId = url.searchParams.get("matchId");
    if (!matchId || !OBJECT_ID_PATTERN.test(matchId)) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    webSocketServer.handleUpgrade(request, socket, head, (client) => {
      client.matchId = matchId.toLowerCase();
      webSocketServer.emit("connection", client, request);
      client.send(JSON.stringify({type: "match.subscribed", matchId: client.matchId}));
    });
  }

  return {
    attachToServer(server) {
      server.on("upgrade", handleUpgrade);
    },

    publish(matchId, payload) {
      const targetMatchId = matchId.toLowerCase();
      const message = JSON.stringify(payload);
      for (const client of webSocketServer.clients) {
        if (client.matchId === targetMatchId && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    },

    close() {
      webSocketServer.close();
    },
  };
}
