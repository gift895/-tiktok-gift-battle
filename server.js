import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { TikTokLiveConnection } from "tiktok-live-connector";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.static("public"));

let state = {
  girls: 0,
  boys: 0,
  girlsGift: "rose",
  boysGift: "football",
  girlsGiftLabel: "🌹 Роза",
  boysGiftLabel: "⚽ Мяч",
  connected: false,
  username: "",
  lastGift: null,
  winner: null
};

let connection = null;

function clean(s) {
  return String(s ?? "").trim().toLowerCase();
}

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(message);
  }
}

function sendState() {
  broadcast({ type: "state", state });
}

function score(team, points, giftName, userName) {
  if (!points || points < 1) return;
  state[team] += points;
  state.lastGift = {
    team,
    points,
    giftName,
    userName: userName || "Зритель",
    at: Date.now()
  };
  if (state.girls > state.boys) state.winner = "girls";
  else if (state.boys > state.girls) state.winner = "boys";
  else state.winner = null;

  broadcast({ type: "gift", gift: state.lastGift, state });
  sendState();
}

async function disconnectTikTok() {
  if (!connection) return;
  try { await connection.disconnect(); } catch {}
  connection = null;
  state.connected = false;
  sendState();
}

async function connectTikTok(username) {
  await disconnectTikTok();
  username = clean(username).replace(/^@/, "");
  if (!username) throw new Error("Укажи TikTok username.");

  const girlsGift = clean(state.girlsGift);
  const boysGift = clean(state.boysGift);

  connection = new TikTokLiveConnection(username);

  connection.on("gift", (data) => {
    const giftName = clean(data.giftName);
    const repeatEnd = data.repeatEnd;
    const repeatCount = Number(data.repeatCount || 1);

    // Для streak-подарков считаем только финальное событие,
    // чтобы один и тот же подарок не начислился несколько раз.
    if (data.giftType === 1 && !repeatEnd) return;

    if (giftName === girlsGift) {
      score("girls", Math.max(1, repeatCount), data.giftName, data.user?.nickname || data.user?.uniqueId);
    } else if (giftName === boysGift) {
      score("boys", Math.max(1, repeatCount), data.giftName, data.user?.nickname || data.user?.uniqueId);
    }
  });

  connection.on("connected", () => {
    state.connected = true;
    state.username = username;
    sendState();
  });

  connection.on("disconnected", () => {
    state.connected = false;
    sendState();
  });

  connection.on("error", (err) => {
    broadcast({ type: "error", message: err?.message || "Ошибка подключения к TikTok LIVE" });
  });

  await connection.connect();
  state.connected = true;
  state.username = username;
  sendState();
}

app.get("/api/state", (_, res) => res.json(state));

app.post("/api/connect", async (req, res) => {
  try {
    state.girlsGift = clean(req.body.girlsGift) || "rose";
    state.boysGift = clean(req.body.boysGift) || "football";
    state.girlsGiftLabel = req.body.girlsGiftLabel || "🌹 Роза";
    state.boysGiftLabel = req.body.boysGiftLabel || "⚽ Мяч";
    await connectTikTok(req.body.username);
    res.json({ ok: true, state });
  } catch (e) {
    res.status(400).json({ ok: false, error: e?.message || String(e) });
  }
});

app.post("/api/disconnect", async (_, res) => {
  await disconnectTikTok();
  res.json({ ok: true, state });
});

app.post("/api/reset", async (_, res) => {
  state.girls = 0;
  state.boys = 0;
  state.winner = null;
  state.lastGift = null;
  sendState();
  res.json({ ok: true, state });
});

// Ручной тест: POST /api/test {team:"girls", points:1, giftName:"Rose"}
app.post("/api/test", (req, res) => {
  const team = req.body.team === "boys" ? "boys" : "girls";
  const points = Math.max(1, Number(req.body.points || 1));
  score(team, points, req.body.giftName || (team === "girls" ? "Rose" : "Football"), "Тест");
  res.json({ ok: true, state });
});

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "state", state }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`TikTok Gift Battle: http://localhost:${PORT}`);
});