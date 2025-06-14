// ================================
// FRONTEND: Button Game (React + Socket.IO)
// ================================
// Includes:
// - Host pre-game lobby with settings
// - Secure prize distribution
// - Prize + player click sync across all clients
// - Click cooldown enforcement
// - Real-time leaderboard (lightweight updates)
// - Winner confirmation codes
// - Game lock after start

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://button-game-production.up.railway.app"); // Backend URL

export default function LobbyGame() {
  // ===== State Setup =====
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
  const [maxPicks, setMaxPicks] = useState(1);
  const [playerClicks, setPlayerClicks] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [leaderboard, setLeaderboard] = useState({});
  const [prizesWon, setPrizesWon] = useState([]);
  const [winnerCode, setWinnerCode] = useState(null);

  const cooldownRef = useRef(null);

  // ===== Host Config =====
  const [hostConfig, setHostConfig] = useState({
    picks: 1,
    grandPrizes: [],
    consolationPrizes: [],
    monetized: false,
    allowDuplicates: false,
    moveGrandPrize: false,
    moveInterval: 10
  });

  // ===== Effects =====
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
      alert(message);
      if (code) setWinnerCode(code);
    });

    socket.on("leaderboardUpdate", (data) => setLeaderboard(data));

    return () => socket.disconnect();
  }, []);

  // ===== Host Lobby Creation =====
  const createLobby = () => {
    const phrase = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKeyphrase(phrase);
    setIsHost(true);
    setJoined(true);
    socket.emit("createLobby", { keyphrase: phrase, nickname });
  };

  // ===== Player Lobby Join =====
  const joinLobby = () => {
    if (enteredKey.length !== 6 || nickname.trim() === "") return;
    setJoined(true);
    socket.emit("joinLobby", {
      keyphrase: enteredKey.toUpperCase(),
      nickname,
      entryKey: entryKey.trim()
    });
  };

  // ===== Host Starts Game =====
  const startGame = () => {
    setMaxPicks(hostConfig.picks);
    socket.emit("startGame", {
      keyphrase,
      config: hostConfig,
    });
  };

  // ===== Button Click Logic =====
  const handleButtonClick = (buttonNumber) => {
    if (cooldown || clickedButtons.includes(buttonNumber)) return;
    if (playerClicks >= maxPicks) {
      alert("You're out of picks!");
      return;
    }

    setCooldown(true);
    setTimeout(() => setCooldown(false), 500);

    setPlayerClicks(prev => prev + 1);
    setClickedButtons(prev => [...prev, buttonNumber]);
    socket.emit("pickButton", { keyphrase, button: buttonNumber });
  };

  // ===== Pre-Game UI =====
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
          <button className="bg-blue-600 text-white p-2" onClick={joinLobby}>Join Lobby</button>
        </div>
        <button className="bg-green-600 text-white p-2" onClick={createLobby}>Create Lobby</button>
      </div>
    );
  }

  // ===== Lobby Phase =====
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
            <button className="bg-purple-600 text-white p-2" onClick={startGame}>Start Game</button>
          </div>
        )}

        {countdown !== null && <div className="text-3xl">Game starts in: {countdown}</div>}
      </div>
    );
  }

  // ===== Game UI =====
  return (
    <div className="p-6 space-y-6">
      <div className="text-xl font-bold mb-4">Game Board</div>
      <div className="grid grid-cols-11 gap-4">
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

      {winnerCode && (
        <div className="text-green-600 font-bold mt-4">
          You’ve won a prize! Save this code: {winnerCode}
        </div>
      )}
    </div>
  );
}
