# streamPRO v0.2 direction

## Control Center
- One-click profiles: Stable, Balanced, Real-time, High quality.
- Resolution presets from 360p to 2160p.
- FPS presets from 10 to 60.
- Normal / Low / Ultra-low latency policy.
- Server-side validation prevents unsupported 4K + low/ultra combinations.

## Reliability
- FFmpeg health metrics.
- Unexpected-exit detection.
- Exponential reconnect backoff.
- Infinite source looping for 24/7 media streams.
- In-memory runtime state; no database dependency.

## Next engineering targets
1. Replace chat polling with YouTube `liveChatMessages.streamList` where available.
2. Add OAuth flow so the user can connect a channel without putting long-lived credentials in source.
3. Build a real Canvas/WebGL scene renderer instead of a text-only overlay.
4. Add bitrate presets tied to YouTube's current encoder guidance.
5. Add adaptive modes that lower output load when encoder health degrades.
6. Add multi-source playlists and scheduled scene transitions.
