import { spawn } from 'node:child_process';

export class StreamManager {
  constructor() {
    this.process = null;
    this.startedAt = null;
    this.lastExit = null;
  }

  get status() {
    return {
      running: Boolean(this.process),
      startedAt: this.startedAt,
      pid: this.process?.pid ?? null,
      lastExit: this.lastExit
    };
  }

  start({ ffmpegPath = 'ffmpeg', input = null, output = null } = {}) {
    if (this.process) throw new Error('Stream is already running');
    if (!input || !output) {
      throw new Error('Set STREAM_INPUT and STREAM_OUTPUT before starting FFmpeg');
    }

    const args = [
      '-re',
      '-i', input,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-f', 'flv',
      output
    ];

    this.process = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.startedAt = new Date().toISOString();

    this.process.on('exit', (code, signal) => {
      this.lastExit = { code, signal, at: new Date().toISOString() };
      this.process = null;
      this.startedAt = null;
    });

    return this.status;
  }

  stop() {
    if (!this.process) return this.status;
    this.process.kill('SIGTERM');
    return this.status;
  }
}
