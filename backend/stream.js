import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export class StreamManager {
  constructor({ overlayPath = path.resolve('renderer/overlay.txt'), onUpdate } = {}) {
    this.process = null;
    this.startedAt = null;
    this.lastExit = null;
    this.progress = {};
    this.overlayPath = overlayPath;
    this.onUpdate = onUpdate;
    this.shouldRestart = false;
    this.config = null;
  }

  get status() {
    return {
      running: Boolean(this.process),
      startedAt: this.startedAt,
      pid: this.process?.pid ?? null,
      lastExit: this.lastExit,
      fps: this.progress.fps ?? null,
      bitrate: this.progress.bitrate ?? null,
      speed: this.progress.speed ?? null,
      frames: this.progress.frame ?? null
    };
  }

  writeOverlay(text) {
    fs.mkdirSync(path.dirname(this.overlayPath), { recursive: true });
    fs.writeFileSync(this.overlayPath, text, 'utf8');
  }

  start({ ffmpegPath = 'ffmpeg', input = null, output = null, width = 1920, height = 1080, fps = 30, bitrate = '4500k', fontFile = '', overlayText = 'streamPRO\\nWaiting for chat...' } = {}) {
    if (this.process) throw new Error('Stream is already running');
    if (!output) throw new Error('Set STREAM_OUTPUT to your YouTube RTMPS stream URL/key');

    this.writeOverlay(overlayText);
    this.config = { ffmpegPath, input, output, width, height, fps, bitrate, fontFile };
    this.shouldRestart = true;
    this.spawnProcess();
    return this.status;
  }

  spawnProcess() {
    const { ffmpegPath, input, output, width, height, fps, bitrate, fontFile } = this.config;
    const overlay = this.overlayPath.replaceAll('\\', '/');
    const drawtext = [
      'drawtext',
      fontFile ? `fontfile='${fontFile.replaceAll('\\', '/')}'` : '',
      `textfile='${overlay}'`,
      'reload=1',
      'x=70',
      'y=70',
      'fontsize=42',
      'fontcolor=white',
      'box=1',
      'boxcolor=black@0.55',
      'boxborderw=24'
    ].filter(Boolean).join(':');

    const args = [
      '-hide_banner', '-loglevel', 'warning',
      ...(input
        ? ['-re', '-stream_loop', '-1', '-i', input]
        : ['-f', 'lavfi', '-i', `testsrc2=size=${width}x${height}:rate=${fps}`]),
      ...(input ? [] : ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100']),
      '-vf', drawtext,
      '-map', '0:v:0',
      ...(input ? ['-map', '0:a:0?'] : ['-map', '1:a:0']),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      '-r', String(fps),
      '-g', String(fps * 2),
      '-keyint_min', String(fps * 2),
      '-b:v', bitrate,
      '-maxrate', bitrate,
      '-bufsize', bitrate,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      '-progress', 'pipe:2',
      output
    ];

    this.process = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.startedAt ||= new Date().toISOString();
    this.progress = {};
    this.emit();

    let stderrBuffer = '';
    this.process.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || '';
      for (const line of lines) {
        const separator = line.indexOf('=');
        if (separator <= 0) continue;
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        if (['frame', 'fps', 'bitrate', 'speed'].includes(key)) this.progress[key] = value;
      }
      this.emit();
    });

    this.process.on('error', (error) => {
      this.lastExit = { error: error.message, at: new Date().toISOString() };
      this.process = null;
      this.emit();
    });

    this.process.on('exit', (code, signal) => {
      this.lastExit = { code, signal, at: new Date().toISOString() };
      this.process = null;
      this.emit();
      if (this.shouldRestart) {
        setTimeout(() => {
          if (this.shouldRestart && !this.process) this.spawnProcess();
        }, 2500);
      } else {
        this.startedAt = null;
      }
    });
  }

  updateOverlay(text) {
    this.writeOverlay(text);
  }

  stop() {
    this.shouldRestart = false;
    if (!this.process) return this.status;
    this.process.kill('SIGTERM');
    return this.status;
  }

  emit() {
    this.onUpdate?.(this.status);
  }
}
