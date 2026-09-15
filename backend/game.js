export function createGameState() {
  return {
    round: 1,
    totalMessages: 0,
    countries: {},
    lastMessage: null,
    startedAt: null
  };
}

export function applyChatMessage(state, message) {
  const text = String(message || '').trim();
  if (!text) return state;

  state.totalMessages += 1;
  state.lastMessage = text;

  // v0.1: treat the whole message as a country key.
  // Later we can add country aliases, flags and validation.
  const country = text.replace(/\s+/g, ' ');
  state.countries[country] = (state.countries[country] || 0) + 1;

  return state;
}
