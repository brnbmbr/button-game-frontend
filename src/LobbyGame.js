// ================================
// FRONTEND: Button Game (React + Socket.IO)
// ================================
// Features:
// - Host config & opt-in play mode
// - Real-time board & leaderboard
// - Click cooldowns, shared state, and live sync
// - Remaining picks per player (host can view)

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://button-game-production.up.railway.app"); // ✅ Replace with your backend URL

export default function LobbyGame() {
  // ==================== STATE ====================
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
  const [hostConfig, setHostConfig] = useState({
    picks: 1,
    grandPrizes: [],
    consolationPrizes: [],
    monetized: false,
    allowDuplicates: false,
    moveGrandPrize: false,
    moveInterval: 10,
    hostIsPlayer: true
  });
  const [messages, setMessages] = useState([]);
  const [leaderboard, setLeaderboard] = useState({});
  const [picksLeft, setPicksLeft] = useState(0);
  const [remainingPicksMap, setRemainingPicksMap] = useState({});
  const cooldownRef = useRef(false);

  // ==================== SOCKET LISTENERS ====================
  useEffect(() => {
    socket.on("joined", ({ players }) => setPlayers(players));

    socket.on("startCountdown", () => {
      let time = 3;
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

    socket.on("prizeWon", ({ message, code }) => {
      alert(message + (code ? `\nYour prize code: ${code}` : ""));
    });

    socket.on("leaderboardUpdate", (data) => setLeaderboard(data));

    socket.on("updateRemainingPicks", (map) => {
      setRemainingPicksMap(map);
      if (nickname && map[nickname] !== undefined) {
        setPicksLeft(map[nickname]);
      }
    });

    socket.on("boardUpdate", ({ buttonNumber }) => {
      setClickedButtons(prev => [...prev, buttonNumber]);
    });

    return () => socket.disconnect();
  }, [nickname]);

  // ==================== JOIN & CREATE ====================
  const createLobby = () => {
    const phrase = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKeyphrase(phrase);
    setIsHost(true);
    setJoined(true);
    socket.emit("createLobby", { keyphrase: phrase, nickname });
  };

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

  const startGame = () => {
    socket.emit("startGame", {
      keyphrase,
      config: hostConfig
    });
  };

  // ==================== BUTTON CLICK ====================
  const handleButtonClick = (buttonNumber) => {
    if (cooldownRef.current || picksLeft <= 0 || clickedButtons.includes(buttonNumber)) return;
    cooldownRef.current = true;
    setTimeout(() => (cooldownRef.current = false), 500);
    socket.emit("pickButton", { keyphrase, button: buttonNumber, nickname });
  };

  // ==================== UI PHASES ====================
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
          <button className="bg-blue-500 text-white px-4 py-2" onClick={joinLobby}>Join Lobby</button>
        </div>
        <button className="bg-green-500 text-white px-4 py-2" onClick={createLobby}>Create Lobby</button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-xl font-bold">Lobby: {keyphrase}</div>
        <div className="my-2">Players:</div>
        <ul>
          {players.map((p, idx) => (
            <li key={idx}>{p.nickname}</li>
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
              checked={hostConfig.hostIsPlayer}
              onChange={(e) => setHostConfig({ ...hostConfig, hostIsPlayer: e.target.checked })}
            />
            <button className="bg-purple-600 text-white px-4 py-2" onClick={startGame}>Start Game</button>
          </div>
        )}

        {countdown !== null && <div className="text-3xl">Game starts in: {countdown}</div>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-xl font-bold mb-2">Game Board</div>
      <div className="text-sm text-gray-600 mb-4">You have {picksLeft} picks remaining.</div>

      {isHost && (
        <div className="mb-4">
          <div className="text-md font-semibold mb-1">Picks Remaining per Player:</div>
          <ul>
            {Object.entries(remainingPicksMap).map(([name, picks]) => (
              <li key={name}>{name}: {picks}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-11 gap-2">
        {Array.from({ length: 99 }, (_, i) => (
          <button
            key={i}
            className={`w-12 h-12 rounded-full transition-all duration-300
              ${clickedButtons.includes(i + 1)
                ? hostConfig.allowDuplicates
                  ? "bg-red-900"
                  : "scale-0 opacity-0"
                : "bg-red-600 hover:bg-red-700 animate-pulse"}`}
            onClick={() => handleButtonClick(i + 1)}
          />
        ))}
      </div>

      <div className="mt-6">
        <div className="font-bold">Leaderboard</div>
        <ul>
          {Object.entries(leaderboard).map(([player, prize]) => (
            <li key={player}>{player}: {prize}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
