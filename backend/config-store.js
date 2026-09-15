const SECRET_KEYS = new Set([
  'YOUTUBE_API_KEY',
  'YOUTUBE_OAUTH_ACCESS_TOKEN',
  'YOUTUBE_STREAM_KEY',
  'STREAM_OUTPUT'
]);

const DEFAULTS = {
  YOUTUBE_API_KEY: '',
  YOUTUBE_OAUTH_ACCESS_TOKEN: '',
  YOUTUBE_VIDEO_ID: '',
  YOUTUBE_LIVE_CHAT_ID: '',
  YOUTUBE_STREAM_KEY: '',
  STREAM_OUTPUT: '',
  STREAM_INPUT: '',
  FFMPEG_PATH: 'ffmpeg',
  FFMPEG_FONT_FILE: '',
  STREAM_WIDTH: 1920,
  STREAM_HEIGHT: 1080,
  STREAM_FPS: 30,
  STREAM_BITRATE: '4500k',
  STREAM_PRESET: 'veryfast',
  STREAM_KEYFRAME: 2,
  STREAM_AUDIO_BITRATE: '128k',
  STREAM_CODEC: 'libx264',
  STREAM_OVERLAY_ENABLED: true,
  STREAM_LATENCY_MODE: 'normal',
  CHAT_POLL: true,
  CHAT_POLL_INTERVAL_MS: 5000
};

function envValue(key) {
  return process.env[key] ?? DEFAULTS[key];
}

export function createRuntimeConfig() {
  const config = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) config[key] = envValue(key);
  return config;
}

export function publicConfig(config) {
  const out = {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_KEYS.has(key)) {
      out[key] = Boolean(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function mergeRuntimeConfig(target, patch = {}) {
  for (const key of Object.keys(DEFAULTS)) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.length > 10000) continue;
    target[key] = value;
  }
  return target;
}

export function hasConfiguredYoutube(config) {
  return Boolean(config.YOUTUBE_API_KEY && (config.YOUTUBE_LIVE_CHAT_ID || config.YOUTUBE_VIDEO_ID));
}

export function studioAuthorized(req) {
  const expected = process.env.STUDIO_TOKEN;
  if (!expected) return false;
  return req.get('x-studio-token') === expected;
}
