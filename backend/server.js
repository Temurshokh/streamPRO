import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { createGameState, applyChatMessage } from './game.js';
import { StreamManager } from './stream.js';
import { YouTubeChat } from './youtube.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const game = createGameState();

function overlayText() {
  const rows = game.leaderboard.length
    ? game.leaderboard.slice(0, 10).map((item, index) => `${index + 1}. ${item.name}: ${item.count}`)
    : ['No countries yet', 'Write your country in chat!'];
  return ['STREAMPRO - WHERE ARE YOU FROM?', '', ...rows, '', `Messages: ${game.totalMessages}`, `Accepted: ${game.acceptedMessages}`].join('\n');
}

const stream = new StreamManager({
  overlayPath: path.resolve('renderer/overlay.txt'),
  onUpdate: (data) => broadcast({ type: 'stream:update', data })
});

const youtube = new YouTubeChat({
  apiKey: process.env.YOUTUBE_API_KEY,
  videoId: process.env.YOUTUBE_VIDEO_ID,
  liveChatId: process.env.YOUTUBE_LIVE_CHAT_ID,
  intervalMs: process.env.CHAT_POLL_INTERVAL_MS,
  onMessage: async (message) => {
    handleChatMessage(message.message, message);
    broadcast({ type: 'chat:message', data: message });
  },
  onStatus: (data) => broadcast({ type: 'youtube:update', data })
});

app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.resolve('frontend')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'streamPRO', time: new Date().toISOString() });
});

app.get('/api/state', (_req, res) => {
  res.json({ game, stream: stream.status, youtube: youtube.status });
});

app.post('/api/chat', (req, res) => {
  const result = handleChatMessage(req.body?.message, { author: 'local test' });
  res.json(result);
});

app.post('/api/stream/start', (_req, res) => {
  try {
    const result = stream.start({
      ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
      input: process.env.STREAM_INPUT || null,
      output: process.env.STREAM_OUTPUT,
      width: Number(process.env.STREAM_WIDTH || 1920),
      height: Number(process.env.STREAM_HEIGHT || 1080),
      fps: Number(process.env.STREAM_FPS || 30),
      bitrate: process.env.STREAM_BITRATE || '4500k',
      fontFile: process.env.FFMPEG_FONT_FILE || '',
      overlayText: overlayText()
    });
    game.startedAt = result.startedAt;
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/stream/stop', (_req, res) => {
  const result = stream.stop();
  if (!result.running) game.startedAt = null;
  res.json(result);
});

app.post('/api/chat/start', (_req, res) => {
  youtube.start();
  res.json(youtube.status);
});

app.post('/api/chat/stop', (_req, res) => {
  youtube.stop();
  res.json(youtube.status);
});

app.get('/overlay', (_req, res) => {
  res.sendFile(path.resolve('frontend/overlay.html'));
});

function handleChatMessage(message, meta = {}) {
  const result = applyChatMessage(game, message, meta);
  stream.updateOverlay(overlayText());
  broadcast({ type: 'game:update', data: game });
  return result;
}

const server = app.listen(port, () => {
  console.log(`streamPRO backend listening on http://localhost:${port}`);
  fs.mkdirSync(path.resolve('renderer'), { recursive: true });
  stream.updateOverlay(overlayText());
  if (String(process.env.CHAT_POLL || 'true').toLowerCase() !== 'false') youtube.start();
});

const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (socket) => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'state', data: { game, stream: stream.status, youtube: youtube.status } }));
  socket.on('close', () => clients.delete(socket));
});

function broadcast(payload) {
  const encoded = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === 1) client.send(encoded);
  }
}
