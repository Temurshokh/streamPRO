# Backend architecture

streamPRO is intentionally database-free for the current stage. Runtime state is held in memory; secrets stay in `.env`; media can stay outside Git.

The backend exposes:
- `/api/options` for quality/FPS/latency/profile choices.
- `/api/state` for current game, YouTube and FFmpeg health state.
- `/api/stream/start` and `/api/stream/stop` for encoder control.
- `/api/chat/start` and `/api/chat/stop` for the YouTube chat adapter.

The stream engine uses FFmpeg and reconnects with exponential backoff when an unexpected process exit occurs.
