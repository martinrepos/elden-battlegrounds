import express from "express";
import http from "http";
import { Server } from "socket.io";
import registerBattleHandlers from "./battle";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

registerBattleHandlers(io);

server.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});

// creates express app and http server on port:3000
// single connection handler that sets up event listeners
