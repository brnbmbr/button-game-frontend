const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory store for active lobbies
const lobbies = {};

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("createLobby", ({ keyphrase }) => {
    lobbies[keyphrase] = {
      host: socket.id,
      players: [socket.id]
    };
    socket.join(keyphrase);
    io.to(keyphrase).emit("joined", { players: lobbies[keyphrase].players });
    console.log(`Lobby created: ${keyphrase} by ${socket.id}`);
  });

  socket.on("joinLobby", ({ keyphrase }) => {
    if (!lobbies[keyphrase]) return;
    lobbies[keyphrase].players.push(socket.id);
    socket.join(keyphrase);
    io.to(keyphrase).emit("joined", { players: lobbies[keyphrase].players });
    console.log(`Player ${socket.id} joined lobby ${keyphrase}`);
  });

  socket.on("startGame", ({ keyphrase }) => {
    if (lobbies[keyphrase]?.host === socket.id) {
      io.to(keyphrase).emit("startCountdown");
      console.log(`Game started in lobby: ${keyphrase}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    for (const key in lobbies) {
      const index = lobbies[key].players.indexOf(socket.id);
      if (index !== -1) {
        lobbies[key].players.splice(index, 1);
        if (lobbies[key].host === socket.id || lobbies[key].players.length === 0) {
          delete lobbies[key];
          console.log(`Lobby ${key} closed`);
        } else {
          io.to(key).emit("joined", { players: lobbies[key].players });
        }
      }
    }
  });
});

// Railway uses process.env.PORT in production
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
