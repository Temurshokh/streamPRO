# streamPRO roadmap

## v0.2 — Control Center
- [x] Quality presets: 360p to 2160p
- [x] FPS presets: 10 / 15 / 24 / 30 / 48 / 60
- [x] Latency modes: Normal / Low / Ultra-low
- [x] One-click profiles
- [x] Backend validation for unsupported combinations
- [x] FFmpeg health metrics and reconnect backoff
- [x] Infinite media looping for 24/7 sources

## v0.3 — Real stream engine
- [ ] Real Canvas/WebGL renderer
- [ ] Scene graph and animated transitions
- [ ] Source playlists and scheduling
- [ ] Hardware encoder detection (NVENC / QSV / AMF / VAAPI)
- [ ] Adaptive bitrate and encoder load protection

## v0.4 — YouTube integration
- [ ] OAuth channel connection
- [ ] `liveChatMessages.streamList` transport
- [ ] Chat rate limiting and duplicate suppression
- [ ] Moderation hooks
- [ ] Stream lifecycle detection

## v0.5 — Reliability
- [ ] Worker process isolation
- [ ] Health watchdog
- [ ] Persistent logs
- [ ] Crash recovery across server restarts
- [ ] Optional lightweight persistence (still no DB required by default)
