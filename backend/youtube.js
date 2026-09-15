const API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeChat {
  constructor({ apiKey, videoId, liveChatId, intervalMs = 5000, onMessage, onStatus }) {
    this.apiKey = apiKey;
    this.videoId = videoId;
    this.liveChatId = liveChatId;
    this.intervalMs = Math.max(1000, Number(intervalMs) || 5000);
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.timer = null;
    this.nextPageToken = null;
    this.running = false;
    this.lastError = null;
  }

  get status() {
    return {
      configured: Boolean(this.apiKey && (this.liveChatId || this.videoId)),
      running: this.running,
      liveChatId: this.liveChatId || null,
      lastError: this.lastError
    };
  }

  async resolveLiveChatId() {
    if (this.liveChatId) return this.liveChatId;
    if (!this.apiKey || !this.videoId) throw new Error('Set YOUTUBE_API_KEY plus YOUTUBE_LIVE_CHAT_ID or YOUTUBE_VIDEO_ID');

    const url = new URL(`${API_BASE}/videos`);
    url.searchParams.set('part', 'liveStreamingDetails');
    url.searchParams.set('id', this.videoId);
    url.searchParams.set('key', this.apiKey);
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `YouTube API error ${response.status}`);
    const id = data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!id) throw new Error('No active live chat found for YOUTUBE_VIDEO_ID');
    this.liveChatId = id;
    return id;
  }

  async poll() {
    if (!this.apiKey) return;
    const liveChatId = await this.resolveLiveChatId();
    const url = new URL(`${API_BASE}/liveChat/messages`);
    url.searchParams.set('liveChatId', liveChatId);
    url.searchParams.set('part', 'snippet,authorDetails');
    url.searchParams.set('maxResults', '200');
    url.searchParams.set('key', this.apiKey);
    if (this.nextPageToken) url.searchParams.set('pageToken', this.nextPageToken);

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `YouTube API error ${response.status}`);

    this.nextPageToken = data.nextPageToken || this.nextPageToken;
    for (const item of data.items || []) {
      const message = item?.snippet?.displayMessage || item?.snippet?.textMessageDetails?.messageText;
      if (!message) continue;
      await this.onMessage({
        id: item.id,
        message,
        author: item?.authorDetails?.displayName || 'YouTube user',
        authorChannelId: item?.authorDetails?.channelId || null,
        publishedAt: item?.snippet?.publishedAt || null
      });
    }

    if (Number.isFinite(data.pollingIntervalMillis)) {
      this.intervalMs = Math.max(1000, data.pollingIntervalMillis);
    }
    this.lastError = null;
    this.onStatus?.(this.status);
  }

  start() {
    if (this.running || !this.apiKey) return;
    this.running = true;
    const tick = async () => {
      if (!this.running) return;
      try {
        await this.poll();
      } catch (error) {
        this.lastError = error.message;
        this.onStatus?.(this.status);
      } finally {
        if (this.running) this.timer = setTimeout(tick, this.intervalMs);
      }
    };
    void tick();
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.onStatus?.(this.status);
  }
}
