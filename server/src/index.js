import "dotenv/config";
import {createApplication} from "./app.js";

const port = process.env.PORT || 5001;
const {app, initialize} = createApplication();

try {
  await initialize();
  app.listen(port, () => console.info(`API listening on http://localhost:${port}`));
} catch (error) {
  console.error("Failed to initialize the application:", error.message);
  process.exit(1);
}
