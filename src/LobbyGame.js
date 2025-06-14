// ================================
// FRONTEND: Button Game (React + Socket.IO)
// ================================
// Features:
// - Host pre-game lobby settings
// - Real-time game state and leaderboard
// - Prize config, per-player pick tracking
// - Cooldown between picks
// - Host view options and pick visibility
// - Synchronized gameboard updates

import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://button-game-production.up.railway.app"); // Update for deployment

export default function LobbyGame() {
  // ========== State ========== //
  const [isHost, setIsHost] = useState(false);
  const [keyphrase, setKeyphrase] = useState("");
  const [enteredKey, setEnteredKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [message, setMessage] = useState("");
  const [buttonsClicked, setButtonsClicked] = useState([]);
  const [remainingPicks, setRemainingPicks] = useState({});
  const [leaderboard, setLeaderboard] = useState({});
  const [hostConfig, setHostConfig] = useState({
    picks: 1,
    grandPrizes: [],
    consolationPrizes: [],
    allowDuplicates: false,
    hostIsPlayer: true
  });
  const [cooldown, setCooldown] = useState(false);
  const cooldownRef = useRef(null);

  // ========== Socket Events ========== //
  useEffect(() => {
    socket.on("joined", ({ players }) => setPlayers(players));
    socket.on("startCountdown", () => {
      let time = 5;
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
      setButtonsClicked(prev => [...prev, buttonNumber]);
    });
    socket.on("updateRemainingPicks", (data) => setRemainingPicks(data));
    socket.on("leaderboardUpdate", (data) => setLeaderboard(data));
    socket.on("prizeWon", ({ message }) => setMessage(message));
    return () => socket.disconnect();
  }, []);

  // ========== Host & Join ========== //
  const createLobby = () => {
    const phrase = Math.random().toString(36).substring(2, 8).toUpperCase();
    setKeyphrase(phrase);
    setIsHost(true);
    setJoined(true);
    socket.emit("createLobby", { keyphrase: phrase, nickname });
  };

  const joinLobby = () => {
    if (enteredKey.length !== 6 || !nickname) return;
    setJoined(true);
    setKeyphrase(enteredKey);
    socket.emit("joinLobby", { keyphrase: enteredKey, nickname });
  };

  const startGame = () => {
    const config = {
      ...hostConfig,
      grandPrizes: hostConfig.grandPrizes.filter(p => p.trim() !== ""),
      consolationPrizes: hostConfig.consolationPrizes.filter(p => p.trim() !== "")
    };
    socket.emit("startGame", { keyphrase, config });
  };

  // ========== Button Click Handling ========== //
  const handleButtonClick = (num) => {
    if (cooldown) return;
    if (buttonsClicked.includes(num)) return;
    setCooldown(true);
    socket.emit("pickButton", { keyphrase, button: num });
    cooldownRef.current = setTimeout(() => setCooldown(false), 500);
  };

  // ========== UI ========== //
  if (!joined) {
    return (
      <div className="p-4 space-y-2">
        <input placeholder="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} className="border p-2" />
        <div>
          <input placeholder="Lobby Key" value={enteredKey} onChange={e => setEnteredKey(e.target.value)} className="border p-2" />
          <button onClick={joinLobby} className="ml-2 px-4 py-2 bg-blue-500 text-white">Join</button>
        </div>
        <button onClick={createLobby} className="px-4 py-2 bg-green-500 text-white">Create Lobby</button>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Lobby: {keyphrase}</h2>
        <ul>
          {players.map(p => <li key={p.id}>{p.nickname}</li>)}
        </ul>
        {isHost && (
          <div className="space-y-2">
            <label>Picks Per Player</label>
            <input type="number" value={hostConfig.picks} onChange={e => setHostConfig({ ...hostConfig, picks: +e.target.value })} className="border p-2" />
            <label>Grand Prizes (1 per line)</label>
            <textarea value={hostConfig.grandPrizes.join("\n")} onChange={e => setHostConfig({ ...hostConfig, grandPrizes: e.target.value.split("\n") })} className="border w-full p-2" />
            <label>Consolation Prizes (1 per line)</label>
            <textarea value={hostConfig.consolationPrizes.join("\n")} onChange={e => setHostConfig({ ...hostConfig, consolationPrizes: e.target.value.split("\n") })} className="border w-full p-2" />
            <label className="block">Allow Duplicate Picks?</label>
            <input type="checkbox" checked={hostConfig.allowDuplicates} onChange={e => setHostConfig({ ...hostConfig, allowDuplicates: e.target.checked })} />
            <label className="block">Can Host Play?</label>
            <input type="checkbox" checked={hostConfig.hostIsPlayer} onChange={e => setHostConfig({ ...hostConfig, hostIsPlayer: e.target.checked })} />
            <button onClick={startGame} className="mt-2 px-4 py-2 bg-purple-600 text-white">Start Game</button>
          </div>
        )}
        {countdown !== null && <div>Starting in: {countdown}</div>}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-center font-bold text-lg mb-2">Gameboard ({keyphrase})</div>
      {message && <div className="mb-4 text-green-700 font-semibold">{message}</div>}
      <div className="grid grid-cols-11 gap-3 justify-center">
        {Array.from({ length: 99 }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => handleButtonClick(i + 1)}
            className={`w-12 h-12 rounded-full border-2 transition-all duration-300
              ${buttonsClicked.includes(i + 1) ? "bg-gray-300" : "bg-red-600 hover:bg-red-700"}`}
            disabled={buttonsClicked.includes(i + 1) || cooldown}
          />
        ))}
      </div>
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Remaining Picks:</h3>
        <ul>
          {Object.entries(remainingPicks).map(([name, count]) => (
            <li key={name}>{name}: {count} pick(s) left</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Leaderboard:</h3>
        <ul>
          {Object.entries(leaderboard).map(([name, prize]) => (
            <li key={name}>{name} → {prize}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
