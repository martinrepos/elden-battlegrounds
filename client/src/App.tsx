import { useEffect, useRef, useState, useCallback } from "react"; // react hooks for lifecycle, state and memorization
import { useSocket, subscribeToResetApproved } from "./hooks/useSocket"; // custom hook for reset conformation
import BattleView from "./components/BattleView"; // main game area
import "./App.css"; // styling

function App() {
  const socket = useSocket(); // Holds connection instance for socket.io (see hooks/useSocket.ts)
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [chat, setChat] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null); //  used to scroll to the bottom of chat log

  const handleResetApproved = useCallback(() => {
    setResetRequested(false);
    setLog((prev) => [
      ...prev,
      " [💬] Game has been reset. Choose your character again.",
    ]);
    setResetKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const off = subscribeToResetApproved(handleResetApproved);
    return () => off();
  }, [handleResetApproved]); // subscribes to reset-approved, when unmounted unsubscribes

  useEffect(() => {
    const handleLog = (msg: string) =>
      setLog((prev) => [...prev, `[💬] ${msg}`]);
    const handleBattleLog = (msg: string) =>
      setLog((prev) => [...prev, `[⚔️] ${msg}`]);

    socket.on("log", handleLog); // listens for log and battle log
    socket.on("battle-log", handleBattleLog);

    return () => {
      socket.off("log", handleLog); // removes listeners when unmounted
      socket.off("battle-log", handleBattleLog);
    };
  }, [socket]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" }); // whenever log changes, scrolls to the latest msg
  }, [log]);

  const joinRoom = () => {
    if (!name || !roomId) return;
    socket.emit("join", { name, roomId });
    setHasJoined(true);
    setLog([]);
  };

  const leaveRoom = () => {
    socket.emit("leave", { name, roomId });
    setHasJoined(false);
    setLog([]);
    setResetRequested(false);
  };

  const sendChat = () => {
    if (!chat.trim()) return;
    socket.emit("chat", { roomId, message: chat });
    setChat("");
  };

  const requestReset = () => {
    if (resetRequested) return;
    setResetRequested(true);
    socket.emit("request-reset", { roomId, name });
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2 className="cinzelTitle">ELDEN BATTLEGROUNDS</h2>
        {!hasJoined ? ( // render input fields to join games
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Room ID"
            />
            <button onClick={joinRoom}>Join</button>
          </>
        ) : (
          <>
            <p>
              <strong>Room:</strong> {roomId}
            </p>
            <button onClick={leaveRoom}>Leave Room</button>
          </>
        )}
        {hasJoined && (
          <>
            <div className="log">
              <h3>Log</h3>
              {log.map((entry, i) => (
                <div key={i}>{entry}</div>
              ))}
              <div ref={logEndRef} />
            </div>
            <div className="controls">
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                placeholder="Type a message..."
              />
              <button onClick={sendChat}>Send</button>
              <button
                onClick={requestReset}
                style={{
                  marginTop: "8px",
                  backgroundColor: resetRequested ? "green" : "",
                  color: resetRequested ? "white" : "",
                }}
              >
                {resetRequested ? "Waiting..." : "Reset Game"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="main">
        {hasJoined ? ( // if joined render BattleView, else render welcome message
          <BattleView key={resetKey} name={name} roomId={roomId} />
        ) : (
          // future plans would be authentication, more characters, further logic in game, user and db work, perhaps rating system
          <div className="welcome-scale">
            <div className="welcome-message">
              <h2>Welcome to Elden Battlegrounds</h2>
              <p>
                A real-time turn-based PvP combat demo. Join a room, select a
                character, and battle with strategic abilities and status
                effects.
              </p>

              <div className="features-container">
                <div className="feature-column">
                  <h3>Gameplay Features</h3>
                  <ul>
                    <li>1v1 turn-based combat</li>
                    <li>Cooldown-based ability usage</li>
                    <li>Status effects: stun, silence, fear, doom, etc.</li>
                    <li>Healing, buffs, evasion & revival mechanics</li>
                    <li>Combat log and in-room messaging</li>
                  </ul>
                </div>
                <div className="feature-column">
                  <h3>Tech Stack</h3>
                  <ul>
                    <li>TypeScript - strict type safety & maintainability</li>
                    <li> React - modular, reactive UI</li>
                    <li> Socket.IO - real-time multiplayer comms</li>
                    <li> Custom hooks - abstraction for socket logic</li>
                    <li> Scalable component architecture</li>
                  </ul>
                </div>
              </div>

              <div className="footer-note">
                <h3>Disclaimer</h3>
                <p style={{ fontSize: "0.9rem", color: "#666" }}>
                  <em>
                    This project is built solely for educational purposes. All
                    characters and visual assets inspired by Elden Ring and
                    Pokémon remain the property of their original owners.
                  </em>
                </p>

                <h4>Credits</h4>
                <p>
                  Character art by{" "}
                  <a
                    href="https://www.reddit.com/user/Leyrune/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Leyrune
                  </a>
                  .
                </p>
                <h4>Source Code</h4>
                <p>
                  View the project on{" "}
                  <a
                    href="https://github.com/martinrepos"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
