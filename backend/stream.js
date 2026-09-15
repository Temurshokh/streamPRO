import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { ReconnectController } from './reconnect.js';
import { StreamHealth } from './health.js';

export class StreamManager {
  constructor({ overlayPath = null, onUpdate = () => {} } = {}) {
    this.process = null;
    this.startedAt = null;
    this.lastExit = null;
    this.currentConfig = null;
    this.overlayPath = overlayPath;
    this.onUpdate = onUpdate;
    this.health = new StreamHealth();
    this.intentionalStop = false;
    this.lastLaunch = null;
    this.reconnect = new ReconnectController({
      onRetry: (data) => this.emit({ type: 'reconnect', data })
    });
  }

  get status() {
    return {
      running: Boolean(this.process),
      startedAt: this.startedAt,
      pid: this.process?.pid ?? null,
      lastExit: this.lastExit,
      config: this.currentConfig,
      health: this.health.snapshot,
      reconnectAttempt: this.reconnect.attempt
    };
  }

  start(config = {}) {
    if (this.process) throw new Error('Stream is already running');
    if (!config.input || !config.output) {
      throw new Error('Set STREAM_INPUT and STREAM_OUTPUT before starting FFmpeg');
    }

    this.intentionalStop = false;
    this.reconnect.reset();
    this.currentConfig = { ...config };
    this.lastLaunch = { ...config };
    this.startedAt = new Date().toISOString();
    this.writeOverlay(config.overlayText || '');
    return this.spawnProcess();
  }

  spawnProcess() {
    const c = this.currentConfig;
    const ffmpegPath = c.ffmpegPath || 'ffmpeg';
    const args = [
      '-hide_banner',
      '-nostats',
      '-loglevel', 'warning',
      '-progress', 'pipe:2',
      '-re',
      '-stream_loop', '-1',
      '-i', c.input,
      '-vf', 'format=yuv420p',
      '-r', String(c.fps),
      '-s', `${c.width}x${c.height}`,
      '-c:v', c.videoCodec || 'libx264',
      '-preset', c.encoderPreset || 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', c.bitrate,
      '-maxrate', c.maxrate || c.bitrate,
      '-bufsize', c.bufsize || c.bitrate,
      '-g', String(Math.max(2, Math.round(c.fps * (c.keyframe || 2)))),
      '-keyint_min', String(Math.max(2, Math.round(c.fps * (c.keyframe || 2)))),
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', c.audioBitrate || '128k',
      '-ar', '48000',
      '-f', 'flv',
      c.output
    ];

    this.process = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.health.start();
    this.emit({ type: 'started', data: this.status });

    let progress = {};
    let buffer = '';
    this.process.stderr.on('data', (chunk) => {
      buffer += String(chunk);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const index = line.indexOf('=');
        if (index === -1) continue;
        const key = line.slice(0, index);
        const value = line.slice(index + 1);
        progress[key] = value;
        if (key === 'progress') {
          this.health.ingestProgress({
            frame: progress.frame,
            fps: progress.fps,
            bitrate: progress.bitrate?.replace('kbits/s', ''),
            dropFrames: progress.drop_frames,
            speed: String(progress.speed || '').replace('x', '')
          });
          this.emit({ type: 'health', data: this.status });
          progress = {};
        }
      }
      if (buffer.length > 4000) buffer = buffer.slice(-4000);
    });

    this.process.on('error', (error) => {
      this.lastExit = { error: error.message, at: new Date().toISOString() };
      this.process = null;
      this.emit({ type: 'error', data: { message: error.message } });
      if (!this.intentionalStop) this.scheduleReconnect();
    });

    this.process.on('exit', (code, signal) => {
      this.lastExit = { code, signal, at: new Date().toISOString() };
      this.process = null;
      this.emit({ type: 'exit', data: this.lastExit });
      if (!this.intentionalStop) this.scheduleReconnect();
    });

    return this.status;
  }

  scheduleReconnect() {
    this.reconnect.schedule(() => {
      if (!this.intentionalStop && !this.process && this.lastLaunch) {
        this.currentConfig = { ...this.lastLaunch };
        this.spawnProcess();
      }
    });
  }

  updateOverlay(text) {
    this.writeOverlay(text);
  }

  writeOverlay(text = '') {
    if (!this.overlayPath) return;
    fs.mkdirSync(new URL('.', `file://${this.overlayPath}`).pathname, { recursive: true });
    fs.writeFileSync(this.overlayPath, String(text).slice(0, 4000), 'utf8');
  }

  stop() {
    this.intentionalStop = true;
    this.reconnect.cancel();
    this.lastLaunch = null;
    if (!this.process) {
      this.startedAt = null;
      return this.status;
    }
    this.process.kill('SIGTERM');
    this.startedAt = null;
    return this.status;
  }

  emit(payload) {
    this.onUpdate(payload);
  }
}
