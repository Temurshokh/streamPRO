const COUNTRIES = {
  uzbekistan: { name: 'Uzbekistan', flag: '🇺🇿' },
  russia: { name: 'Russia', flag: '🇷🇺' },
  kazakhstan: { name: 'Kazakhstan', flag: '🇰🇿' },
  kyrgyzstan: { name: 'Kyrgyzstan', flag: '🇰🇬' },
  tajikistan: { name: 'Tajikistan', flag: '🇹🇯' },
  turkmenistan: { name: 'Turkmenistan', flag: '🇹🇲' },
  usa: { name: 'United States', flag: '🇺🇸' },
  'united states': { name: 'United States', flag: '🇺🇸' },
  america: { name: 'United States', flag: '🇺🇸' },
  uk: { name: 'United Kingdom', flag: '🇬🇧' },
  'united kingdom': { name: 'United Kingdom', flag: '🇬🇧' },
  england: { name: 'United Kingdom', flag: '🇬🇧' },
  germany: { name: 'Germany', flag: '🇩🇪' },
  france: { name: 'France', flag: '🇫🇷' },
  italy: { name: 'Italy', flag: '🇮🇹' },
  spain: { name: 'Spain', flag: '🇪🇸' },
  turkey: { name: 'Turkey', flag: '🇹🇷' },
  japan: { name: 'Japan', flag: '🇯🇵' },
  china: { name: 'China', flag: '🇨🇳' },
  korea: { name: 'South Korea', flag: '🇰🇷' },
  'south korea': { name: 'South Korea', flag: '🇰🇷' },
  india: { name: 'India', flag: '🇮🇳' },
  brazil: { name: 'Brazil', flag: '🇧🇷' },
  canada: { name: 'Canada', flag: '🇨🇦' },
  australia: { name: 'Australia', flag: '🇦🇺' },
  mexico: { name: 'Mexico', flag: '🇲🇽' },
  ukraine: { name: 'Ukraine', flag: '🇺🇦' },
  poland: { name: 'Poland', flag: '🇵🇱' },
  netherlands: { name: 'Netherlands', flag: '🇳🇱' },
  vietnam: { name: 'Vietnam', flag: '🇻🇳' },
  indonesia: { name: 'Indonesia', flag: '🇮🇩' }
};

export function createGameState() {
  return {
    round: 1,
    totalMessages: 0,
    acceptedMessages: 0,
    countries: {},
    leaderboard: [],
    lastMessage: null,
    lastAccepted: null,
    startedAt: null
  };
}

export function resolveCountry(message) {
  const text = String(message || '').trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, ' ');
  return COUNTRIES[text] || null;
}

export function applyChatMessage(state, message, meta = {}) {
  const text = String(message || '').trim();
  if (!text) return { accepted: false, state };

  state.totalMessages += 1;
  state.lastMessage = {
    text,
    author: meta.author || null,
    at: meta.publishedAt || new Date().toISOString()
  };

  const country = resolveCountry(text);
  if (!country) return { accepted: false, state };

  const key = country.name;
  const current = state.countries[key] || { name: country.name, flag: country.flag, count: 0 };
  current.count += 1;
  state.countries[key] = current;
  state.acceptedMessages += 1;
  state.lastAccepted = {
    country: country.name,
    flag: country.flag,
    author: meta.author || null,
    message: text,
    at: meta.publishedAt || new Date().toISOString()
  };
  state.leaderboard = Object.values(state.countries)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { accepted: true, country, state };
}
