// ================================
// FRONTEND: Button Game (React + Socket.IO)
// ================================
// - React frontend UI for multiplayer game
// - Host can configure prize settings
// - Lobby system with unique key
// - Players click buttons to win prizes
// - Grid of animated red circular buttons

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// ===== Connect to backend Socket.IO server ===== //
const socket = io("https://button-game-production.up.railway.app");

export default function LobbyGame() {
  // ===== Application State ===== //
  const [isHost, setIsHost] = useState(false);
  const [keyphrase, setKeyphrase] = useState("");
  const [enteredKey, setEnteredKey] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [nickname, setNickname] = useState("");
  const [entryKey, setEntryKey] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [clickedButtons, setClickedButtons] = useState([]);

  // ===== Host Game Config ===== //
  const [hostConfig, setHostConfig] = useState({
    picks: 1,
    grandPrizes: [],
    consolationPrizes: [],
    monetized: false,
    allowDuplicates: false,
    moveGrandPrize: false,
    moveInterval: 10,
  });

  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState({});

  // ===== Socket.IO Event Listeners ===== //
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

    socket.on("pickResult", ({ message }) => alert(message));

    return () => socket.disconnect();
  }, []);

  // ===== Host: Create Lobby ===== //
  const createLobby = () => {
    const phrase = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKeyphrase(phrase);
    setIsHost(true);
    setJoined(true);
    socket.emit("createLobby", { keyphrase: phrase, nickname });
  };

  // ===== Player: Join Lobby ===== //
  const joinLobby = () => {
    if (enteredKey.length !== 6 || nickname.trim() === "") return;
    setJoined(true);
    socket.emit("joinLobby", {
      keyphrase: enteredKey.toUpperCase(),
      nickname,
      entryKey: entryKey.trim()
    });
  };

  // ===== Host: Start Game ===== //
  const startGame = () => {
    socket.emit("startGame", {
      keyphrase,
      config: hostConfig,
    });
  };

  // ===== Player: Click Button ===== //
  const handleButtonClick = (buttonNumber) => {
    if (!hostConfig.allowDuplicates && clickedButtons.includes(buttonNumber)) return;
    setClickedButtons((prev) => [...prev, buttonNumber]);
    socket.emit("pickButton", { keyphrase, button: buttonNumber });
  };

  // ===== Pre-Join View ===== //
  if (!joined) {
    return (
      <div className="p-6 space-y-4">
        <input
          placeholder="Enter Nickname"
          className="border p-2"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <div>
          <input
            placeholder="Enter Lobby Key"
            className="border p-2"
            value={enteredKey}
            onChange={(e) => setEnteredKey(e.target.value)}
          />
          <input
            placeholder="Entry Key (if required)"
            className="border p-2"
            value={entryKey}
            onChange={(e) => setEntryKey(e.target.value)}
          />
          <button
            onClick={joinLobby}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2"
          >
            Join Lobby
          </button>
        </div>
        <button
          onClick={createLobby}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Create Lobby
        </button>
      </div>
    );
  }

  // ===== Lobby Phase ===== //
  if (!gameStarted) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-xl font-bold">Lobby: {keyphrase || enteredKey}</div>
        <div className="my-2">Players:</div>
        <ul>
          {players.map((p, idx) => (
            <li key={idx}>{p.nickname || `Player ${idx + 1}`}</li>
          ))}
        </ul>

        {isHost && (
          <div className="space-y-2">
            <label className="block">Number of Picks</label>
            <input
              type="number"
              value={hostConfig.picks}
              onChange={(e) => setHostConfig({ ...hostConfig, picks: +e.target.value })}
              className="border p-2"
            />
            <label className="block">Grand Prizes (one per line)</label>
            <textarea
              value={hostConfig.grandPrizes.join("\n")}
              onChange={(e) =>
                setHostConfig({ ...hostConfig, grandPrizes: e.target.value.split("\n") })
              }
              className="w-full border p-2"
            />
            <label className="block">Consolation Prizes (one per line)</label>
            <textarea
              value={hostConfig.consolationPrizes.join("\n")}
              onChange={(e) =>
                setHostConfig({ ...hostConfig, consolationPrizes: e.target.value.split("\n") })
              }
              className="w-full border p-2"
            />
            <label className="block">Monetized Game?</label>
            <input
              type="checkbox"
              checked={hostConfig.monetized}
              onChange={(e) => setHostConfig({ ...hostConfig, monetized: e.target.checked })}
            />
            <label className="block">Keep buttons after pick?</label>
            <input
              type="checkbox"
              checked={hostConfig.allowDuplicates}
              onChange={(e) => setHostConfig({ ...hostConfig, allowDuplicates: e.target.checked })}
            />
            <label className="block">Move Grand Prize?</label>
            <input
              type="checkbox"
              checked={hostConfig.moveGrandPrize}
              onChange={(e) => setHostConfig({ ...hostConfig, moveGrandPrize: e.target.checked })}
            />
            {hostConfig.moveGrandPrize && (
              <input
                type="number"
                placeholder="Seconds before move"
                value={hostConfig.moveInterval}
                onChange={(e) => setHostConfig({ ...hostConfig, moveInterval: +e.target.value })}
                className="border p-2"
              />
            )}
            <button
              onClick={startGame}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              Start Game
            </button>
          </div>
        )}

        {countdown !== null && <div className="text-3xl">Game starts in: {countdown}</div>}
      </div>
    );
  }

  // ===== Game Board Phase ===== //
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      <div className="text-xl font-bold mb-4">Game Board</div>
      <div className="grid grid-cols-11 gap-4">
        {Array.from({ length: 99 }, (_, i) => (
          <button
            key={i}
            className={`w-20 h-20 rounded-full transition-all duration-300
              ${clickedButtons.includes(i + 1)
                ? hostConfig.allowDuplicates
                  ? "bg-red-900 animate-none"
                  : "scale-0 opacity-0"
                : "bg-red-600 hover:bg-red-700 animate-pulse"}`}
            onClick={() => handleButtonClick(i + 1)}
          />
        ))}
      </div>
    </div>
  );
}
