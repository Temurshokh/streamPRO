# streamPRO streaming policy

The control panel exposes only settings that can be translated safely to an encoder configuration.

## Latency
- Normal: stability-first mode.
- Low: balanced interactive mode.
- Ultra low: interaction-first mode.

YouTube currently does not allow low/ultra-low latency for 4K ingestion, so streamPRO rejects that combination instead of silently changing the user's selection.

## Quality
Preset resolutions: 360p, 480p, 720p, 720p60, 1080p, 1080p60, 1440p, 1440p60, 2160p and 2160p60.

The UI may expose 4K as a target, but the backend treats it as Normal-latency-only and validates bitrate against the selected preset.

## FPS
The control panel can request 10, 15, 24, 30, 48 or 60 fps. The encoder should still be tested against the actual renderer workload before 24/7 deployment.
