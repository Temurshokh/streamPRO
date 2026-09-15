export const QUALITY_PRESETS = {
  '360p':  { width: 640,  height: 360,  fps: 30, bitrate: '1.2M', maxrate: '1.5M', bufsize: '2.4M' },
  '480p':  { width: 854,  height: 480,  fps: 30, bitrate: '2.5M', maxrate: '3M',   bufsize: '5M' },
  '720p':  { width: 1280, height: 720,  fps: 30, bitrate: '4M',   maxrate: '5M',   bufsize: '8M' },
  '720p60':{ width: 1280, height: 720,  fps: 60, bitrate: '6M',   maxrate: '7M',   bufsize: '12M' },
  '1080p': { width: 1920, height: 1080, fps: 30, bitrate: '10M',  maxrate: '11M',  bufsize: '20M' },
  '1080p60':{width: 1920, height: 1080, fps: 60, bitrate: '10M',  maxrate: '11M',  bufsize: '20M' },
  '1440p': { width: 2560, height: 1440, fps: 30, bitrate: '15M', maxrate: '16M', bufsize: '30M' },
  '1440p60':{width: 2560, height: 1440, fps: 60, bitrate: '24M', maxrate: '26M', bufsize: '48M' },
  '2160p': { width: 3840, height: 2160, fps: 30, bitrate: '30M', maxrate: '32M', bufsize: '60M' },
  '2160p60':{width: 3840, height: 2160, fps: 60, bitrate: '35M', maxrate: '38M', bufsize: '70M' }
};

export const LATENCY_PRESETS = {
  normal: {
    label: 'Normal',
    description: 'Maximum playback stability. Best for passive viewing.',
    keyframe: 4
  },
  low: {
    label: 'Low',
    description: 'Balanced interaction and stability.',
    keyframe: 2
  },
  ultra: {
    label: 'Ultra low',
    description: 'Best for chat-driven real-time interaction.',
    keyframe: 2
  }
};

export function resolvePreset(quality = '1080p30', latency = 'low') {
  const normalizedQuality = quality === '1080p30' ? '1080p' : quality;
  const video = QUALITY_PRESETS[normalizedQuality] || QUALITY_PRESETS['1080p'];
  const latencyPreset = LATENCY_PRESETS[latency] || LATENCY_PRESETS.low;
  return { ...video, latency: latencyPreset.label, latencyKey: latency };
}

export function isLatencyCompatible(quality, latency) {
  const p = resolvePreset(quality, latency);
  if (p.width >= 3840 && latency !== 'normal') return false;
  return true;
}
