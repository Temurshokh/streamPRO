import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createGameState, applyChatMessage } from './game.js';
import { StreamManager } from './stream.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const game = createGameState();
const stream = new StreamManager();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'streamPRO', time: new Date().toISOString() });
});

app.get('/api/state', (_req, res) => {
  res.json({ game, stream: stream.status });
});

app.post('/api/chat', (req, res) => {
  applyChatMessage(game, req.body?.message);
  broadcast({ type: 'game:update', data: game });
  res.json(game);
});

app.post('/api/stream/start', (_req, res) => {
  try {
    const result = stream.start({
      ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
      input: process.env.STREAM_INPUT,
      output: process.env.STREAM_OUTPUT
    });
    game.startedAt = result.startedAt;
    broadcast({ type: 'stream:update', data: stream.status });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/stream/stop', (_req, res) => {
  const result = stream.stop();
  if (!result.running) game.startedAt = null;
  broadcast({ type: 'stream:update', data: result });
  res.json(result);
});

const server = app.listen(port, () => {
  console.log(`streamPRO backend listening on http://localhost:${port}`);
});

const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (socket) => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'state', data: { game, stream: stream.status } }));
  socket.on('close', () => clients.delete(socket));
});

function broadcast(payload) {
  const encoded = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === 1) client.send(encoded);
  }
}
