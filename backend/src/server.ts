import http from "http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { db } from "./config/database.js";
import { migrate } from "./database/schema.js";
import { seed } from "./database/seed.js";
import { setupChatSocket } from "./sockets/chat.socket.js";

migrate(db);
seed(db);

const app = createApp();
const httpServer = http.createServer(app);
setupChatSocket(httpServer, db);

httpServer.listen(env.port, "0.0.0.0", () => {
  console.log(`WorkOps Hub backend running on http://localhost:${env.port}`);
});

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
