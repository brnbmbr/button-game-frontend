const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // update to Vercel frontend URL in production
    methods: ["GET", "POST"]
  }
});

let lobbies = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("createLobby", ({ keyphrase }) => {
    lobbies[keyphrase] = {
      host: socket.id,
      players: [socket.id]
    };
    socket.join(keyphrase);
    io.to(keyphrase).emit("joined", { players: lobbies[keyphrase].players });
  });

  socket.on("joinLobby", ({ keyphrase }) => {
    if (lobbies[keyphrase]) {
      lobbies[keyphrase].players.push(socket.id);
      socket.join(keyphrase);
      io.to(keyphrase).emit("joined", { players: lobbies[keyphrase].players });
    }
  });

  socket.on("startGame", ({ keyphrase }) => {
    io.to(keyphrase).emit("startCountdown");
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    // Cleanup logic can go here
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

  console.log("Server running on http://localhost:3000");
});
