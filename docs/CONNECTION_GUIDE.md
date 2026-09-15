# streamPRO connection guide

## Quick Stream mode
Required:
- `STUDIO_TOKEN`: a private password you create as a Render environment variable.
- YouTube Stream Key: copied from YouTube Studio's live stream settings.

Optional:
- YouTube Live URL / Video ID. This is only metadata for the dashboard. The encoder can publish using the stream key alone.

No Google Cloud API key is required to send the media stream to YouTube.

## Interactive Chat mode
Required:
- YouTube API access credential configured on the backend.
- A live Video ID or Live Chat ID so streamPRO can attach to the active chat.

This mode powers chat-driven game events such as `Uzbekistan` -> `+1`.

## Important
- Never put YouTube Stream Keys or API credentials in GitHub.
- Vercel hosts the frontend; Render hosts the backend and FFmpeg.
- `STUDIO_TOKEN` is only the password that protects the streamPRO control endpoints.
