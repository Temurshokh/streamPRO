export class ReconnectController {
  constructor({ maxAttempts = 0, baseDelayMs = 2000, maxDelayMs = 30000, onRetry = () => {} } = {}) {
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
    this.onRetry = onRetry;
    this.attempt = 0;
    this.timer = null;
  }

  schedule(fn) {
    this.cancel();
    this.attempt += 1;
    if (this.maxAttempts > 0 && this.attempt > this.maxAttempts) return false;
    const delay = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** Math.max(0, this.attempt - 1));
    this.onRetry({ attempt: this.attempt, delayMs: delay });
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, delay);
    return true;
  }

  reset() {
    this.attempt = 0;
    this.cancel();
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
