"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [gameId, setGameId] = useState("demo");
  const [playerId, setPlayerId] = useState(null);
  const [ws, setWs] = useState(null);
  const [game, setGame] = useState(null);
  const inputRef = useRef(null);
  const [bid, setBid] = useState(1);
  const [item, setItem] = useState("");

  const connected = !!ws && ws.readyState === 1;

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  function connect() {
    const url = `ws://localhost:8001/ws/${encodeURIComponent(gameId)}?name=${encodeURIComponent(name || "Player")}`;
    const socket = new WebSocket(url);
    socket.onopen = () => console.log("WS connected");
    socket.onclose = () => console.log("WS closed");
    socket.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "joined") {
        setPlayerId(msg.playerId);
        setGame(msg.game);
      } else if (msg.type === "state_update") {
        setGame(msg.game);
      } else if (msg.type === "bid_update") {
        setGame(msg.game);
      } else if (msg.type === "listing_update") {
        setGame(msg.game);
      } else if (msg.type === "round_result") {
        setGame(msg.game);
      }
    };
    setWs(socket);
  }

  function placeBid() {
    if (!ws) return;
    ws.send(JSON.stringify({ type: "place_bid", n: Number(bid) || 1 }));
  }
  function passBid() {
    if (!ws) return;
    ws.send(JSON.stringify({ type: "pass" }));
  }
  function submitItem() {
    if (!ws) return;
    const text = item.trim();
    if (!text) return;
    ws.send(JSON.stringify({ type: "submit_item", text }));
    setItem("");
    inputRef.current?.focus();
  }

  const me = useMemo(() => (playerId && game ? game.players[playerId] : null), [playerId, game]);
  const others = useMemo(() => {
    if (!game || !playerId) return [];
    return Object.values(game.players).filter((p) => p.id !== playerId);
  }, [game, playerId]);

  const remainingMs = Math.max(0, Math.floor(((game?.phaseEndsAt ?? 0) * 1000) - Date.now()));
  const remaining = `${Math.ceil(remainingMs / 1000)}s`;

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>⚡ Realtime Categories (MVP)</h1>

      {!connected && (
        <section style={{ margin: "16px 0", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Game ID" value={gameId} onChange={(e) => setGameId(e.target.value)} />
            <button onClick={connect} disabled={!name || !gameId}>Join</button>
          </div>
          <p style={{ marginTop: 8, color: "#666" }}>
            Open this page in a second tab, use a different name, same Game ID.
          </p>
        </section>
      )}

      {connected && game && (
        <section style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>Game:</strong> {game.id} • <strong>Round:</strong> {game.round}/{game.bestOf} •{" "}
              <strong>Phase:</strong> {game.phase} • <strong>Timer:</strong> {remaining}
            </div>
            <div>
              <strong>Category:</strong> {game.category ?? "—"}
            </div>
          </div>

          <hr style={{ margin: "12px 0" }} />

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <h3>Me</h3>
              <div>{me?.name ?? "—"}</div>
              <div>Score: {game.scores?.[playerId] ?? 0}</div>
            </div>
            <div style={{ flex: 1 }}>
              <h3>Opponent</h3>
              <div>{others[0]?.name ?? "—"}</div>
              <div>Score: {others[0] ? (game.scores?.[others[0].id] ?? 0) : 0}</div>
            </div>
          </div>

          {game.phase === "bidding" && (
            <div style={{ marginTop: 12 }}>
              <p>
                High Bid: <strong>{game.highBid}</strong> {game.highBidderId === playerId ? "(You)" : ""}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" min={1} value={bid} onChange={(e) => setBid(e.target.value)} />
                <button onClick={placeBid}>Place / Raise</button>
                <button onClick={passBid}>Pass</button>
              </div>
            </div>
          )}

          {game.phase === "listing" && (
            <div style={{ marginTop: 12 }}>
              <p>
                Lister: <strong>{game.listerId === playerId ? "You" : others[0]?.name}</strong> • Bid:{" "}
                <strong>{game.highBid}</strong> • Count: <strong>{game.listCount}</strong>
              </p>
              {game.listerId === playerId ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={inputRef}
                    placeholder={`Type a ${game.category?.slice(0, -1) ?? "item"} and press Enter`}
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitItem()}
                  />
                  <button onClick={submitItem}>Submit</button>
                </div>
              ) : (
                <p>Waiting for lister…</p>
              )}
            </div>
          )}

          {game.phase === "summary" && <p style={{ marginTop: 12 }}>Round over. Next round starting…</p>}
          {game.phase === "ended" && <p style={{ marginTop: 12 }}><strong>Match ended.</strong></p>}
        </section>
      )}
    </main>
  );
}