# streamPRO

Server-driven YouTube Live streaming control panel and chat-powered game engine.

## Architecture

```text
Browser dashboard
      ↕ WebSocket / HTTP
Node.js backend
      ├── Game state (RAM; no DB)
      ├── YouTube Live Chat poller
      └── FFmpeg process manager
                ↓
             YouTube RTMPS
```

## Local setup

1. Install Node.js 20+ and FFmpeg.
2. Copy `.env.example` to `.env`.
3. Fill `STREAM_OUTPUT` with the YouTube RTMPS ingest URL + your stream key, and optionally configure `STREAM_INPUT` with a local media file.
4. For real YouTube chat, create a YouTube Data API v3 key and set `YOUTUBE_API_KEY` plus either `YOUTUBE_LIVE_CHAT_ID` or `YOUTUBE_VIDEO_ID`.
5. Run:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Chat game

Messages matching a supported country name are counted. For example:

```text
Uzbekistan  → 🇺🇿 Uzbekistan +1
Japan       → 🇯🇵 Japan +1
Brazil      → 🇧🇷 Brazil +1
```

The state is kept in memory and streamed to connected dashboards over WebSocket. The FFmpeg overlay reads a generated text file and reloads it while running.

## Safety / secrets

Never commit `.env`, a YouTube API key, or a real YouTube stream key.

## Deployment

`render.yaml` is a starting point for the API/dashboard service. A true 24/7 FFmpeg worker should run on an always-on VPS/VM rather than a sleeping free web service.
