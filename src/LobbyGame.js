// ================================
// FRONTEND: Button Game (React + Socket.IO)
// ================================
// Features:
// - Host can configure game (prizes, rules, etc.)
// - Real-time shared game board
// - Prize claiming with unique codes
// - Player pick limits and cooldowns
// - Host can opt out of gameplay
// - Host sees remaining picks per player
// - Red circular buttons in 9x11 grid
// - Leaderboard and post-game feedback

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// Replace with your Railway backend URL in production
const socket = io("https://button-game-production.up.railway.app");

export default function LobbyGame() {
  // ========== State Management ========== //
  const [isHost, setIsHost] = useState(false);
  const [keyphrase, setKeyphrase] = useState("");
  const [enteredKey, setEnteredKey] = useState("");
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState("");
  const [entryKey, setEntryKey] = useState("");
  const [players, setPlayers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [clickedButtons, setClickedButtons] = useState([]);
  const [message, setMessage] = useState("");
  const [leaderboard, setLeaderboard] = useState({});
  const [clickCount, setClickCount] = useState(0);
  const [coolingDown, setCoolingDown] = useState(false);
  const [hostIsPlayer, setHostIsPlayer] = useState(true);
  const cooldownRef = useRef(null);

  // Host-only config
  const [hostConfig, setHostConfig] = useState({
    picks: 1,
    grandPrizes: [],
    consolationPrizes: [],
    monetized: false,
    allowDuplicates: false,
    moveGrandPrize: false,
    moveInterval: 10
  });

  // ========== Socket Setup ========== //
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

    socket.on("boardUpdate", ({ buttonNumber }) => {
      setClickedButtons(prev => [...new Set([...prev, buttonNumber])]);
    });

    socket.on("prizeWon", ({ message, code }) => {
      setMessage(`${message}${code ? `\nPrize Code: ${code}` : ""}`);
    });

    socket.on("leaderboardUpdate", (lb) => {
      setLeaderboard(lb);
    });

    return () => socket.disconnect();
  }, []);

  // ========== Host: Create Lobby ========== //
  const createLobby = () => {
    const phrase = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKeyphrase(phrase);
    setIsHost(true);
    setJoined(true);
    socket.emit("createLobby", { keyphrase: phrase, nickname });
  };

  // ========== Player: Join Lobby ========== //
  const joinLobby = () => {
    if (enteredKey.length !== 6 || nickname.trim() === "") return;
    setJoined(true);
    setKeyphrase(enteredKey.toUpperCase());
    socket.emit("joinLobby", {
      keyphrase: enteredKey.toUpperCase(),
      nickname,
      entryKey: entryKey.trim()
    });
  };

  // ========== Host: Start Game ========== //
  const startGame = () => {
    socket.emit("startGame", {
      keyphrase,
      config: { ...hostConfig, hostIsPlayer }
    });
  };

  // ========== Handle Button Click ========== //
  const handleButtonClick = (buttonNumber) => {
    if (!hostIsPlayer && isHost) return;
    if (coolingDown || clickedButtons.includes(buttonNumber)) return;
    if (clickCount >= hostConfig.picks) return;

    setCoolingDown(true);
    cooldownRef.current = setTimeout(() => setCoolingDown(false), 500);
    setClickCount(prev => prev + 1);

    socket.emit("pickButton", { keyphrase, button: buttonNumber });
  };

  // ========== UI Rendering ========== //
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
          <button onClick={joinLobby} className="bg-blue-500 text-white px-4 py-2 rounded">Join Lobby</button>
        </div>
        <button onClick={createLobby} className="bg-green-500 text-white px-4 py-2 rounded">Create Lobby</button>
      </div>
    );
  }

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
            <label className="block">Can Host Play?</label>
            <input
              type="checkbox"
              checked={hostIsPlayer}
              onChange={(e) => setHostIsPlayer(e.target.checked)}
            />
            <button onClick={startGame} className="bg-purple-500 text-white px-4 py-2 rounded">Start Game</button>
          </div>
        )}

        {countdown !== null && <div className="text-3xl">Game starts in: {countdown}</div>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-xl font-bold mb-4">Game Board</div>
      {message && <div className="text-green-600 font-semibold">{message}</div>}

      <div className="grid grid-cols-11 gap-4 justify-center">
        {Array.from({ length: 99 }, (_, i) => (
          <button
            key={i}
            className={`w-16 h-16 rounded-full transition-all duration-300
              ${clickedButtons.includes(i + 1)
                ? hostConfig.allowDuplicates
                  ? "bg-red-900 animate-none"
                  : "scale-0 opacity-0"
                : "bg-red-600 hover:bg-red-700 animate-pulse"}`}
            onClick={() => handleButtonClick(i + 1)}
          />
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-bold text-lg">Leaderboard</h2>
        <ul>
          {Object.entries(leaderboard).map(([name, prize], idx) => (
            <li key={idx}>{name}: {prize}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
