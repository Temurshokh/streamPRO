import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { createGameState, applyChatMessage } from './game.js';
import { StreamManager } from './stream.js';
import { YouTubeChat } from './youtube.js';
import { createRuntimeConfig, mergeRuntimeConfig, publicConfig, hasConfiguredYoutube, studioAuthorized } from './config-store.js';

const app = express();
const port = Number(process.env.PORT || 10000);
const game = createGameState();
const runtime = createRuntimeConfig();
const defaultSample = path.resolve('media/sample.mp4');
const defaultFont = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

function outputUrl() {
  if (runtime.STREAM_OUTPUT) return runtime.STREAM_OUTPUT;
  if (!runtime.YOUTUBE_STREAM_KEY) return '';
  return `rtmps://a.rtmps.youtube.com:443/live2/${runtime.YOUTUBE_STREAM_KEY}`;
}

function overlayText() {
  const rows = game.leaderboard.length
    ? game.leaderboard.slice(0, 10).map((x, i) => `${i + 1}. ${x.flag || '🌐'} ${x.name}: ${x.count}`)
    : ['No countries yet', 'Write your country in chat!'];
  return ['STREAMPRO • WHERE ARE YOU FROM?', '', ...rows, '', `Messages: ${game.totalMessages}`, `Accepted: ${game.acceptedMessages}`].join('\n');
}

function validateVideoSettings() {
  const mode = String(runtime.STREAM_LATENCY_MODE || 'normal');
  const width = Number(runtime.STREAM_WIDTH || 1920);
  if (mode === 'ultra' && width > 1920) throw new Error('Ultra-low latency supports up to 1920px width in streamPRO.');
  if (mode === 'low' && width >= 3840) throw new Error('Low latency is disabled for 4K in streamPRO.');
}

function ensureDemoSource() {
  if (runtime.STREAM_INPUT || fs.existsSync(defaultSample)) return;
  const ffmpeg = runtime.FFMPEG_PATH || 'ffmpeg';
  fs.mkdirSync(path.dirname(defaultSample), { recursive: true });
  const result = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-t', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', defaultSample, '-y'
  ]);
  if (result.status !== 0) console.warn('Could not create demo source; configure STREAM_INPUT in Studio.');
}

let youtube;
const stream = new StreamManager({
  overlayPath: path.resolve('renderer/overlay.txt'),
  onUpdate: payload => broadcast({ type: 'stream:update', data: payload })
});

function rebuildYoutube() {
  if (youtube) youtube.stop();
  youtube = new YouTubeChat({
    apiKey: runtime.YOUTUBE_API_KEY,
    accessToken: runtime.YOUTUBE_OAUTH_ACCESS_TOKEN,
    videoId: runtime.YOUTUBE_VIDEO_ID,
    liveChatId: runtime.YOUTUBE_LIVE_CHAT_ID,
    intervalMs: runtime.CHAT_POLL_INTERVAL_MS,
    onMessage: async msg => {
      const result = applyChatMessage(game, msg.message, msg);
      stream.updateOverlay(overlayText());
      broadcast({ type: 'game:update', data: game });
      broadcast({ type: 'chat:message', data: msg });
      return result;
    },
    onStatus: data => broadcast({ type: 'youtube:update', data })
  });
  if (String(runtime.CHAT_POLL).toLowerCase() !== 'false' && hasConfiguredYoutube(runtime)) youtube.start();
}
rebuildYoutube();

app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(express.static(path.resolve('frontend')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'streamPRO', time: new Date().toISOString() }));
app.get('/api/state', (_req, res) => res.json({ game, stream: stream.status, youtube: youtube.status }));
app.get('/api/config/status', (_req, res) => res.json({
  youtube: youtube.status,
  stream: {
    outputConfigured: Boolean(outputUrl()),
    inputConfigured: Boolean(runtime.STREAM_INPUT || fs.existsSync(defaultSample)),
    ffmpegPath: runtime.FFMPEG_PATH || 'ffmpeg',
    demoSourceAvailable: fs.existsSync(defaultSample)
  },
  config: publicConfig(runtime)
}));

app.post('/api/config', (req, res) => {
  if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required. Set STUDIO_TOKEN on Render once.' });
  mergeRuntimeConfig(runtime, req.body?.config || {});
  rebuildYoutube();
  res.json({ ok: true, youtube: youtube.status, config: publicConfig(runtime) });
});

app.post('/api/config/clear', (req, res) => {
  if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required.' });
  for (const key of ['YOUTUBE_API_KEY', 'YOUTUBE_OAUTH_ACCESS_TOKEN', 'YOUTUBE_STREAM_KEY', 'STREAM_OUTPUT']) runtime[key] = '';
  rebuildYoutube();
  res.json({ ok: true, config: publicConfig(runtime) });
});

app.post('/api/config/test', async (req, res) => {
  if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required.' });
  try { res.json(await youtube.testConnection()); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/chat', (req, res) => res.json(applyChatMessage(game, req.body?.message, { author: 'local test' })));
app.post('/api/chat/start', (req, res) => { if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required.' }); youtube.start(); res.json(youtube.status); });
app.post('/api/chat/stop', (req, res) => { if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required.' }); youtube.stop(); res.json(youtube.status); });

app.post('/api/stream/start', (req, res) => {
  if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required.' });
  try {
    mergeRuntimeConfig(runtime, req.body?.config || {});
    validateVideoSettings();
    const input = runtime.STREAM_INPUT || defaultSample;
    const output = outputUrl();
    if (!output) throw new Error('Add a YouTube Stream Key or a complete RTMPS Stream URL in Studio.');
    if (!runtime.STREAM_INPUT) ensureDemoSource();
    if (!fs.existsSync(input)) throw new Error(`Input source not found: ${input}`);
    const result = stream.start({
      ffmpegPath: runtime.FFMPEG_PATH || 'ffmpeg',
      input,
      output,
      width: Number(runtime.STREAM_WIDTH || 1920),
      height: Number(runtime.STREAM_HEIGHT || 1080),
      fps: Number(runtime.STREAM_FPS || 30),
      bitrate: runtime.STREAM_BITRATE || '4500k',
      maxrate: runtime.STREAM_BITRATE || '4500k',
      bufsize: runtime.STREAM_BITRATE || '4500k',
      keyframe: Number(runtime.STREAM_KEYFRAME || 2),
      audioBitrate: runtime.STREAM_AUDIO_BITRATE || '128k',
      videoCodec: runtime.STREAM_CODEC || 'libx264',
      encoderPreset: runtime.STREAM_PRESET || 'veryfast',
      overlayEnabled: runtime.STREAM_OVERLAY_ENABLED !== false,
      fontFile: runtime.FFMPEG_FONT_FILE || defaultFont,
      overlayText: overlayText()
    });
    game.startedAt = result.startedAt;
    res.json(result);
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/stream/stop', (req, res) => {
  if (!studioAuthorized(req)) return res.status(401).json({ error: 'Studio authorization required.' });
  const result = stream.stop();
  if (!result.running) game.startedAt = null;
  res.json(result);
});

app.get('/overlay', (_req, res) => res.sendFile(path.resolve('frontend/overlay.html')));

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`streamPRO backend listening on port ${port}`);
  fs.mkdirSync(path.resolve('renderer'), { recursive: true });
  fs.mkdirSync(path.resolve('media'), { recursive: true });
  ensureDemoSource();
  stream.updateOverlay(overlayText());
});

const clients = new Set();
const wss = new WebSocketServer({ server });
wss.on('connection', socket => {
  clients.add(socket);
  socket.send(JSON.stringify({ type: 'state', data: { game, stream: stream.status, youtube: youtube.status } }));
  socket.on('close', () => clients.delete(socket));
});
function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const client of clients) if (client.readyState === 1) client.send(data);
}
