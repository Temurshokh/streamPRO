# streamPRO architecture

```text
Browser dashboard
      │
      │ HTTP + WebSocket
      ▼
Node.js control API
      ├── stream profiles / policy
      ├── game state
      ├── YouTube chat adapter
      └── FFmpeg process manager
                 │
                 ▼
              RTMPS
                 │
                 ▼
              YouTube
```

The design deliberately keeps control state in memory while the project is small. A database can be added later for accounts, history and durable schedules, but is not a prerequisite for the stream engine.

The latency setting is treated as an intent and compatibility policy, not as a fake promise of a particular end-to-end delay. Actual viewer latency remains controlled by YouTube playback behavior and the selected stream mode.
