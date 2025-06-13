// ================================
// FRONTEND: Button Game (React + Socket.IO)
// ================================
// Updated version includes:
// - Host pre-game lobby settings
// - Monetized entry with key validation
// - Prize config & pick rules
// - Optional button disappearance
// - Grand prize move timer
// - Winner key generation (structure only for now)
// - Pulse + pop animation on buttons

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
const Button = (props) => (
  <button
    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
    {...props}
  />
); // Tailwind UI button

const socket = io("http://localhost:3000"); // Replace with Railway URL

export default function LobbyGame() {
  // ========== State ========== //
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

  // Host-only config
  const [hostConfig, setHostConfig] = useState({
    picks: 1,
    grandPrizes: [],
    consolationPrizes: [],
    monetized: false,
    allowDuplicates: false,
    moveGrandPrize: false,
    moveInterval: 10, // seconds
  });

  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState({});

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
      config: hostConfig,
    });
  };

  // ========== Handle Button Click ========== //
  const handleButtonClick = (buttonNumber) => {
    if (!hostConfig.allowDuplicates && clickedButtons.includes(buttonNumber)) return;
    setClickedButtons((prev) => [...prev, buttonNumber]);
    socket.emit("pickButton", { keyphrase, button: buttonNumber });
  };

  // ========== UI Phases ========== //
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
          <Button onClick={joinLobby}>Join Lobby</Button>
        </div>
        <Button onClick={createLobby}>Create Lobby</Button>
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
            <Button onClick={startGame}>Start Game</Button>
          </div>
        )}

        {countdown !== null && <div className="text-3xl">Game starts in: {countdown}</div>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-xl font-bold mb-4">Game Board</div>
      <div className="grid grid-cols-11 gap-3">
        {Array.from({ length: 99 }, (_, i) => (
          <button
            key={i}
            className={`w-12 h-12 rounded-full transition-all duration-300
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
