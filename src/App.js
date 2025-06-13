import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Replace this URL with your Railway backend URL
const socket = io("button-game-production.up.railway.app");

// Simple replacement for Tailwind Button component
const Button = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      backgroundColor: "#3b82f6",
      color: "white",
      padding: "10px 20px",
      borderRadius: "6px",
      border: "none",
      margin: "5px",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

function App() {
  const [isHost, setIsHost] = useState(false);
  const [keyphrase, setKeyphrase] = useState("");
  const [enteredKey, setEnteredKey] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    socket.on("joined", ({ players }) => setPlayers(players));

    socket.on("startCountdown", () => {
      let time = 10;
      setCountdown(time);
      const interval = setInterval(() => {
        time -= 1;
        setCountdown(time);
        if (time === 0) {
          clearInterval(interval);
          setGameStarted(true);
        }
      }, 1000);
    });

    return () => socket.disconnect();
  }, []);

  const createLobby = () => {
    const phrase = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKeyphrase(phrase);
    setIsHost(true);
    setJoined(true);
    socket.emit("createLobby", { keyphrase: phrase });
  };

  const joinLobby = () => {
    if (enteredKey.length !== 6) return;
    setJoined(true);
    socket.emit("joinLobby", { keyphrase: enteredKey.toUpperCase() });
  };

  const startGame = () => {
    socket.emit("startGame", { keyphrase });
  };

  if (!joined) {
    return (
      <div style={{ padding: "20px" }}>
        <Button onClick={createLobby}>Create Lobby</Button>
        <div style={{ marginTop: "10px" }}>
          <input
            placeholder="Enter Lobby Key"
            value={enteredKey}
            onChange={(e) => setEnteredKey(e.target.value)}
            style={{ padding: "8px", marginRight: "10px" }}
          />
          <Button onClick={joinLobby}>Join Lobby</Button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Lobby: {keyphrase || enteredKey}</h2>
        <p>Players in lobby: {players.length}</p>
        {isHost && <Button onClick={startGame}>Start Game</Button>}
        {countdown !== null && <h3>Game starts in: {countdown}</h3>}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Game Board</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(10, 1fr)",
          gap: "10px",
        }}
      >
        {Array.from({ length: 99 }, (_, i) => (
          <button
            key={i}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "10px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Button {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;

