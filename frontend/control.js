const $ = (id) => document.getElementById(id);
let options = {};
let selectedProfile = 'balanced';

const esc = (s) => String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\\': '&#92;', '"': '&quot;' }[c]));
const toast = (t) => { const el = $('toast'); if (!el) return; el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); };

async function api(url, init = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }, ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function renderOptions() {
  $('quality').innerHTML = Object.keys(options.qualities || {}).map((key) => `<option value="${key}">${key}</option>`).join('');
  $('fps').innerHTML = (options.fps || [10, 15, 24, 30, 48, 60]).map((value) => `<option>${value}</option>`).join('');
  $('latency').innerHTML = Object.entries(options.latencies || {}).map(([key, value]) => `<option value="${key}">${value.label}</option>`).join('');
  $('profiles').innerHTML = Object.entries(options.profiles || {}).map(([key, value]) => `<button class="profile ${key === selectedProfile ? 'active' : ''}" data-p="${key}"><strong>${esc(value.label)}</strong><span>${esc(value.quality)} · ${value.fps} FPS · ${esc(value.latency)}</span></button>`).join('');
  document.querySelectorAll('.profile').forEach((button) => button.addEventListener('click', () => applyProfile(button.dataset.p)));
  applyProfile(selectedProfile);
}

function applyProfile(key) {
  const profile = options.profiles?.[key];
  if (!profile) return;
  selectedProfile = key;
  document.querySelectorAll('.profile').forEach((button) => button.classList.toggle('active', button.dataset.p === key));
  $('quality').value = profile.quality;
  $('fps').value = profile.fps;
  $('latency').value = profile.latency;
  checkCompatibility();
}

function checkCompatibility() {
  const is4k = String($('quality').value).startsWith('2160');
  if (is4k && $('latency').value !== 'normal') $('latency').value = 'normal';
  $('compat').textContent = is4k ? '4K mode: Normal latency only.' : 'Configuration accepted by streamPRO.';
}

function render(state) {
  const stream = state.stream || {};
  $('live').classList.toggle('on', !!stream.running);
  $('liveText').textContent = stream.running ? 'LIVE' : 'OFFLINE';
  const health = stream.health || {};
  $('mFps').textContent = health.fps ? Number(health.fps).toFixed(1) : '—';
  $('mBitrate').textContent = health.bitrateKbps ? `${Math.round(health.bitrateKbps)} kbps` : '—';
  $('mSpeed').textContent = health.speed ? `${Number(health.speed).toFixed(2)}x` : '—';
  $('mDrop').textContent = health.droppedFrames ?? '—';
  $('last').textContent = state.game?.lastMessage || '—';
  const countries = state.game?.leaderboard || [];
  $('countries').innerHTML = countries.length
    ? countries.map((item) => `<div class="country"><span>${esc(item.flag || '🌐')} ${esc(item.name)}</span><b>${item.count}</b></div>`).join('')
    : '<span class="muted">No messages yet</span>';
  $('log').textContent = JSON.stringify(state, null, 2);
}

async function refresh() { try { render(await api('/api/state')); } catch (error) { $('log').textContent = error.message; } }

$('start').onclick = async () => { try { await api('/api/stream/start', { method: 'POST', body: JSON.stringify({ quality: $('quality').value, fps: Number($('fps').value), latency: $('latency').value }) }); toast('Stream start requested'); refresh(); } catch (error) { toast(error.message); } };
$('stop').onclick = async () => { await api('/api/stream/stop', { method: 'POST' }); toast('Stream stopped'); refresh(); };
$('chatStart').onclick = async () => { await api('/api/chat/start', { method: 'POST' }); toast('YouTube chat connected'); refresh(); };
$('chatStop').onclick = async () => { await api('/api/chat/stop', { method: 'POST' }); toast('YouTube chat disconnected'); refresh(); };
$('chatForm').onsubmit = async (event) => { event.preventDefault(); const message = $('chat').value.trim(); if (!message) return; await api('/api/chat', { method: 'POST', body: JSON.stringify({ message }) }); $('chat').value = ''; toast(`${message} +1`); };
$('quality').onchange = checkCompatibility;
$('latency').onchange = checkCompatibility;

(async function boot() {
  options = await api('/api/options');
  renderOptions();
  await refresh();
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onmessage = (event) => { const payload = JSON.parse(event.data); if (payload.type === 'state') render(payload.data); else refresh(); };
  ws.onclose = () => { $('log').textContent = 'WebSocket disconnected; HTTP refresh is active.'; setInterval(refresh, 3000); };
})().catch((error) => { $('log').textContent = error.message; });
