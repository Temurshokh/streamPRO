import { isLatencyCompatible, resolvePreset } from './config.js';

export function buildStreamConfig({ quality = '1080p60', fps = null, latency = 'low' } = {}) {
  const preset = resolvePreset(quality, latency);
  const effectiveFps = Number.isFinite(Number(fps)) ? Number(fps) : preset.fps;
  if (![10, 15, 24, 30, 48, 60].includes(effectiveFps)) {
    throw new Error('FPS must be one of 10, 15, 24, 30, 48 or 60');
  }
  if (!isLatencyCompatible(quality, latency)) {
    throw new Error('This resolution requires Normal latency on YouTube');
  }
  return {
    ...preset,
    fps: effectiveFps,
    quality,
    latency
  };
}
