# streamPRO

Server-driven YouTube live streaming control panel.

## v0.2 goals
- Node.js API + WebSocket
- In-memory game state (no database)
- YouTube Live Chat polling adapter
- FFmpeg stream controller with reconnect support
- Dynamic text overlay state for country counters
- Simple web dashboard

> Never commit `.env` or a real YouTube stream key/API key.

## Local
```bash
npm install
copy .env.example .env
npm start
```
Open `http://localhost:3000`.

FFmpeg must be installed and available as `ffmpeg` in PATH, or set `FFMPEG_PATH`.
