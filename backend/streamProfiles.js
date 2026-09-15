import { buildStreamConfig } from './policy.js';

export const STREAM_PROFILES = {
  stable: {
    id: 'stable',
    label: 'Stable',
    description: 'Prioritizes reliability and lower server load.',
    quality: '720p',
    fps: 30,
    latency: 'normal'
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    description: 'Good quality with responsive interaction.',
    quality: '1080p',
    fps: 30,
    latency: 'low'
  },
  realtime: {
    id: 'realtime',
    label: 'Real-time',
    description: 'Designed for chat-controlled streams.',
    quality: '1080p60',
    fps: 60,
    latency: 'ultra'
  },
  quality: {
    id: 'quality',
    label: 'High quality',
    description: 'Higher resolution when interaction is less important.',
    quality: '1440p',
    fps: 30,
    latency: 'normal'
  }
};

export function resolveProfile(profile = 'balanced', overrides = {}) {
  const base = STREAM_PROFILES[profile] || STREAM_PROFILES.balanced;
  return buildStreamConfig({ ...base, ...overrides });
}
