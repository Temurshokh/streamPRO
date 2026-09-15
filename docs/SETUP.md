# streamPRO setup

## Architecture

- Vercel: static frontend (`frontend/`)
- Render: Node.js backend + FFmpeg via `Dockerfile`
- Studio: `frontend/studio.html`
- Public page: `frontend/view.html`
- Stream scene: `/overlay`
- No database is required for the MVP; runtime state is held in memory.

## Render

Deploy the root repository as a Docker web service. `render.yaml` points to `Dockerfile`, which installs FFmpeg and DejaVu fonts.

Set one secret manually in Render Environment Variables:

`STUDIO_TOKEN=<long-random-secret>`

Do not put YouTube API keys or stream keys into Git. They can be entered from Studio for runtime use, or stored permanently as Render environment variables.

## Studio

Open `https://YOUR-VERCEL-DOMAIN/studio.html`.

Enter the same `STUDIO_TOKEN` first. Then provide either:

- YouTube API key + Video ID, with Live Chat ID optional; or
- a YouTube OAuth access token for authenticated YouTube operations.

For the stream output, enter a complete RTMPS URL, or enter only the YouTube stream key and streamPRO will construct the standard YouTube RTMPS endpoint. YouTube recommends RTMPS for secure encoder connections. See the Live Control Room for the exact server URL and stream key. 

## Output profiles

The Studio exposes resolution, FPS, bitrate, preset and latency controls. streamPRO validates latency/resolution combinations before starting FFmpeg.

YouTube currently documents H.264/HEVC/AV1 ingestion, up to 60 fps, CBR bitrate encoding and a recommended 2-second keyframe interval. Recommended H.264 bitrates are higher for higher resolutions, e.g. about 12 Mbps for 1080p60 and 35 Mbps for 2160p60.

## Notes

Runtime-entered secrets are deliberately not returned from `/api/config/status`; only configured/not-configured state is exposed. Render restarts can reset runtime-entered values because the MVP does not persist secrets in a database.
