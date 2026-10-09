import "dotenv/config";
import {createServer} from "node:http";
import {createApplication} from "./app.js";

const port = process.env.PORT || 5001;
const {app, initialize, matchUpdateHub} = createApplication();
const server = createServer(app);
matchUpdateHub.attachToServer(server);

try {
  await initialize();
  server.listen(port, () => console.info(`API listening on http://localhost:${port}`));
} catch (error) {
  console.error("Failed to initialize the application:", error.message);
  process.exit(1);
}
