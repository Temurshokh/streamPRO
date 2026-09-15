export class StreamHealth {
  constructor() {
    this.reset();
  }

  reset() {
    this.startedAt = null;
    this.frames = 0;
    this.droppedFrames = 0;
    this.lastFps = 0;
    this.lastBitrateKbps = 0;
    this.speed = 1;
    this.lastProgressAt = null;
  }

  start() {
    this.reset();
    this.startedAt = new Date().toISOString();
  }

  ingestProgress({ frame, fps, bitrate, dropFrames, speed }) {
    this.frames = Number(frame) || this.frames;
    this.lastFps = Number(fps) || this.lastFps;
    this.lastBitrateKbps = Number(bitrate) || this.lastBitrateKbps;
    this.droppedFrames = Number(dropFrames) || this.droppedFrames;
    this.speed = Number(speed) || this.speed;
    this.lastProgressAt = new Date().toISOString();
  }

  get snapshot() {
    return {
      startedAt: this.startedAt,
      frames: this.frames,
      fps: this.lastFps,
      bitrateKbps: this.lastBitrateKbps,
      droppedFrames: this.droppedFrames,
      speed: this.speed,
      lastProgressAt: this.lastProgressAt
    };
  }
}
