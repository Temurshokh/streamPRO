const API_BASE = 'https://www.googleapis.com/youtube/v3';

function normalizeVideoId(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[A-Za-z0-9_-]{6,}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
    if (url.hostname.endsWith('youtube.com')) {
      const byQuery = url.searchParams.get('v');
      if (byQuery) return byQuery;
      const parts = url.pathname.split('/').filter(Boolean);
      const index = parts.findIndex(x => ['live', 'embed', 'shorts'].includes(x));
      if (index >= 0 && parts[index + 1]) return parts[index + 1];
    }
  } catch {
    // Treat unknown input as an ID; the API will provide the useful error.
  }
  return text;
}

export class YouTubeChat {
  constructor({ apiKey = '', accessToken = '', videoId = '', liveChatId = '', intervalMs = 3000, onMessage = () => {}, onStatus = () => {} } = {}) {
    this.configure({ apiKey, accessToken, videoId, liveChatId, intervalMs }, false);
    this.onMessage = onMessage;
    this.onStatus = onStatus;
    this.timer = null;
    this.nextPageToken = null;
    this.running = false;
    this.lastError = null;
  }

  configure({ apiKey = '', accessToken = '', videoId = '', liveChatId = '', intervalMs = 3000 } = {}, restart = true) {
    const wasRunning = this.running;
    if (restart) this.stop();
    this.apiKey = String(apiKey || '').trim();
    this.accessToken = String(accessToken || '').trim();
    this.videoId = normalizeVideoId(videoId);
    this.liveChatId = String(liveChatId || '').trim();
    this.intervalMs = Math.max(1000, Number(intervalMs) || 3000);
    this.nextPageToken = null;
    this.lastError = null;
    if (restart && wasRunning && this.configured) this.start();
  }

  get configured() { return Boolean((this.apiKey || this.accessToken) && (this.liveChatId || this.videoId)); }

  get status() {
    return {
      configured: this.configured,
      running: this.running,
      liveChatId: this.liveChatId || null,
      videoId: this.videoId || null,
      authMode: this.accessToken ? 'oauth' : (this.apiKey ? 'api-key' : 'none'),
      lastError: this.lastError
    };
  }

  request(url) {
    const headers = this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {};
    if (!this.accessToken && this.apiKey) url.searchParams.set('key', this.apiKey);
    return fetch(url, { headers });
  }

  async resolveLiveChatId() {
    if (this.liveChatId) return this.liveChatId;
    if (!this.videoId || (!this.apiKey && !this.accessToken)) throw new Error('Добавь YouTube API Key (или OAuth) и ссылку на Live-трансляцию.');
    const url = new URL(`${API_BASE}/videos`);
    url.searchParams.set('part', 'liveStreamingDetails');
    url.searchParams.set('id', this.videoId);
    const response = await this.request(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `YouTube API error ${response.status}`);
    const id = data?.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
    if (!id) throw new Error('Для указанной ссылки нет активного Live Chat. Проверь, что трансляция сейчас активна.');
    this.liveChatId = id;
    return id;
  }

  async testConnection() {
    if (!this.configured) throw new Error('YouTube ещё не настроен: нужен API Key/OAuth и Video ID.');
    const liveChatId = await this.resolveLiveChatId();
    const url = new URL(`${API_BASE}/liveChat/messages`);
    url.searchParams.set('liveChatId', liveChatId);
    url.searchParams.set('part', 'id,snippet,authorDetails');
    url.searchParams.set('maxResults', '200');
    const response = await this.request(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `YouTube API error ${response.status}`);
    return { message: `YouTube подключён · доступно ${data?.items?.length || 0} последних сообщений.`, youtube: this.status };
  }

  async poll() {
    const liveChatId = await this.resolveLiveChatId();
    const url = new URL(`${API_BASE}/liveChat/messages`);
    url.searchParams.set('liveChatId', liveChatId);
    url.searchParams.set('part', 'snippet,authorDetails');
    url.searchParams.set('maxResults', '200');
    if (this.nextPageToken) url.searchParams.set('pageToken', this.nextPageToken);
    const response = await this.request(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `YouTube API error ${response.status}`);
    this.nextPageToken = data.nextPageToken || this.nextPageToken;
    for (const item of data.items || []) {
      const message = item?.snippet?.displayMessage || item?.snippet?.textMessageDetails?.messageText;
      if (!message) continue;
      await this.onMessage({id:item.id,message,author:item?.authorDetails?.displayName||'YouTube user',authorChannelId:item?.authorDetails?.channelId||null,publishedAt:item?.snippet?.publishedAt||null});
    }
    if (Number.isFinite(data.pollingIntervalMillis)) this.intervalMs = Math.max(1000, data.pollingIntervalMillis);
    this.lastError = null;
    this.onStatus(this.status);
  }

  start() {
    if (this.running || !this.configured) return;
    this.running = true;
    const tick = async () => { if (!this.running) return; try { await this.poll(); } catch(error) { this.lastError=error.message; this.onStatus(this.status); } finally { if(this.running) this.timer=setTimeout(tick,this.intervalMs); } };
    void tick();
    this.onStatus(this.status);
  }

  stop() { this.running=false;if(this.timer)clearTimeout(this.timer);this.timer=null;this.onStatus?.(this.status); }
}
