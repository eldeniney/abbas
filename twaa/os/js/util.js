/* Twaa Business OS — shared helpers: icons, formatting, charts, DOM utilities. Global namespace: TW */
window.TW = window.TW || {};
(function () {
const TW = window.TW;
const I = {
  search: '<path d="M21 21l-4.3-4.3"/><circle cx="11" cy="11" r="7"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>', chevS: '<path d="m9 18 6-6-6-6"/>', chevE: '<path d="m15 18-6-6 6-6"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>', trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  tag: '<path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4L12 2Z"/><circle cx="7" cy="7" r="1.5"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  mobile: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>', sort: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  box: '<path d="m21 8-9-5-9 5v8l9 5 9-5V8z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  /* category glyphs */
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
  milk: '<path d="M8 2h8"/><path d="M9 2v2.8L6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9l-3-4.2V2"/><path d="M6 12h12"/>',
  bread: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4 3 3 0 0 1-2 2.8V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5.2A3 3 0 0 1 4 10z"/>',
  drop: '<path d="M12 2.7 6.6 9.3a7 7 0 1 0 10.8 0z"/>',
  cup: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  chips: '<path d="M6 3h12l-1 18H7z"/><path d="M8 8c2 1 6 1 8 0"/><path d="M8.5 13c2 1 5 1 7 0"/>',
  candy: '<circle cx="12" cy="12" r="5"/><path d="M17 12h4l-2-3M17 12l2 3"/><path d="M7 12H3l2-3M7 12l-2 3"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  snow: '<path d="M12 2v20M2 12h20"/><path d="m4.9 4.9 14.2 14.2M19.1 4.9 4.9 19.1"/>',
  spray: '<path d="M3 3h.01M7 5h.01M11 7h.01M3 7h.01M7 9h.01"/><path d="M15 5a2 2 0 0 1 2 2v2"/><path d="M14 9h6l1 12H13z"/>',
  soap: '<rect width="16" height="12" x="4" y="9" rx="4"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  baby: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15c1.5 1.3 4.5 1.3 6 0"/><path d="M12 3c0-1 1-2 2-1.5"/>',
  paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5c0 4-2 5-5 5s-5-1-5-5a5 5 0 0 1 5-5z"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/>',
  egg: '<path d="M12 22c-5 0-7-4-7-9 0-5 3-11 7-11s7 6 7 11c0 5-2 9-7 9z"/>',
  food: '<path d="M3 17h18"/><path d="M5 17a7 7 0 0 1 14 0"/><path d="M12 10V8"/><path d="M7 21h10"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 3-2 4-4 4 0-3-1-6-3-8-1 4-4 6-4 11 0 4 3 7 7 7z"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  arrowS: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/>',
  stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  rx: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h3a2 2 0 1 1 0 4H9v-4"/><path d="m12 17 3 3"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M14 12h.01"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.3 16.6a2 2 0 0 1 2.8-2.8L8 15.5"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  crown: '<path d="m2 8 4 10h12l4-10-5 4-5-7-5 7z"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10a6 6 0 1 1-8 8"/><path d="M7 6h1v4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  /* additional icons for the Business OS */
  store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14"/><path d="M15 6v14"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  bars: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
  route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H15"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  power: '<path d="M18.4 6.6a9 9 0 1 1-12.8 0"/><path d="M12 2v10"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
  scale: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0Z"/><path d="m19 7-3 7a3 3 0 0 0 6 0Z"/><path d="M8 21h8"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  thumb: '<path d="M7 10v12"/><path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 8a2 2 0 0 1-2 1.7H7V10l4.3-8a2.4 2.4 0 0 1 3.7 3.9Z"/>',
  play: '<path d="m6 3 14 9-14 9V3Z"/>',
  pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
  flag: '<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  arrowL: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 8.3-8.3"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/>',
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.4 1.6 1.4 2.7 2.5 2.7Z"/>',
  fragile: '<path d="M8 2h8l-1 7a3 3 0 0 1-6 0Z"/><path d="M12 12v8"/><path d="M8 22h8"/><path d="m11 4 1.5 2L11 7"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  wifiOff: '<path d="M2 2l20 20"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.8"/><path d="M19 12.9a10 10 0 0 0-2.2-1.6"/><path d="M12 20h.01"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
  car: '<path d="M5 17h14v-5l-2-5H7l-2 5Z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5 12h14"/>',
  school: '<path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  flower: '<circle cx="12" cy="9" r="3"/><path d="M12 12v10"/><path d="M12 6a3 3 0 1 1 3-3M12 6a3 3 0 1 0-3-3M15 9a3 3 0 1 1 3 3M9 9a3 3 0 1 0-3 3"/><path d="M12 18c-3 0-5-2-5-4 3 0 5 2 5 4Z"/>',
  meat: '<path d="M15.4 15.6A6.5 6.5 0 1 0 6.3 6.4c-2 2-2.5 6-.6 8.8l-2.7 2.7a1.5 1.5 0 0 0 2.1 2.1l2.7-2.7c2.8 1.9 6.7 1.4 8.6-.7Z"/><circle cx="12" cy="10" r="1.5"/>',
  beauty: '<path d="M9 2h6v5H9z"/><path d="M8 7h8l1 15H7Z"/>',
  kitchen: '<path d="M6 2v8a3 3 0 0 0 6 0V2"/><path d="M9 2v20"/><path d="M18 2c-2 0-3 3-3 7h3v13"/>',
  fish: '<path d="M6.5 12c3-5 9.5-6 14.5 0-5 6-11.5 5-14.5 0Z"/><path d="M6.5 12 2 8v8Z"/><circle cx="17" cy="11" r=".8" fill="currentColor"/>',
  carrot: '<path d="M2.3 21.7s9.9-3.5 12.9-6.5a4.2 4.2 0 0 0-6-6c-3 3-6.9 12.5-6.9 12.5Z"/><path d="M15 9s1-5 4-6M15 9s5-1 6-4"/>',
};
const ic = (name, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[name] || I.box}</svg>`;

/* ---------- formatting ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (n, d = 0) => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const money = (n, d = 0) => `${num(n, d)} ج.م`;
const kmoney = (n) => Math.abs(n) >= 1e6 ? `${num(n / 1e6, 2)} مليون ج.م` : Math.abs(n) >= 1e4 ? `${num(n / 1e3, 1)} ألف ج.م` : money(n);
const pct = (n, d = 0) => (n == null || isNaN(n) ? "—" : `${num(n * 100, d)}%`);
const pad = (n) => String(n).padStart(2, "0");
const clock = (ts) => { const d = new Date(ts); let h = d.getHours(); const m = pad(d.getMinutes()); const ap = h >= 12 ? "م" : "ص"; h = h % 12 || 12; return `${h}:${m} ${ap}`; };
const dateAr = (ts) => { const d = new Date(ts); const M = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]; return `${d.getDate()} ${M[d.getMonth()]}`; };
const ago = (ts) => { const s = Math.max(0, Math.round((Date.now() - ts) / 1000)); if (s < 60) return `منذ ${s} ث`; const m = Math.round(s / 60); if (m < 60) return `منذ ${m} د`; const h = Math.round(m / 60); if (h < 24) return `منذ ${h} س`; return `منذ ${Math.round(h / 24)} يوم`; };
const dur = (ms) => { const neg = ms < 0; let s = Math.round(Math.abs(ms) / 1000); const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60; return (neg ? "−" : "") + (h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`); };
const mins = (ms) => Math.max(0, Math.round(ms / 60000));
let _uid = 1000;
const uid = (p = "id") => `${p}-${(Date.now() % 1e6).toString(36)}${(_uid++).toString(36)}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const by = (f, dir = 1) => (a, b) => { const x = f(a), y = f(b); return x < y ? -dir : x > y ? dir : 0; };
const groupBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); (m[k] = m[k] || []).push(x); return m; }, {});
/* Arabic-aware normaliser for search: strips diacritics, unifies alef/yaa/taa marbuta, lowercases latin. */
const norm = (s) => String(s || "").toLowerCase().replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/\s+/g, " ").trim();
const lev = (a, b) => { if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length; let prev = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[b.length]; };

/* ---------- small seeded PRNG for repeatable demo data ---------- */
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ---------- UI atoms (string templates) ---------- */
/* tone: ok | warn | bad | info | neutral | brand | accent */
const chip = (text, tone = "neutral", icon) => `<span class="chip t-${tone}">${icon ? ic(icon, "ic xs") : ""}${esc(text)}</span>`;
const sev = (s) => chip({ critical: "حرج", high: "عالي", medium: "متوسط", low: "منخفض" }[s] || s, { critical: "bad", high: "warn", medium: "info", low: "neutral" }[s] || "neutral", s === "critical" ? "alert" : null);
const btn = (label, act, opts = {}) => `<button type="button" class="btn ${opts.cls || ""}" data-act="${act}"${Object.entries(opts.data || {}).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("")}${opts.disabled ? " disabled" : ""}${opts.title ? ` title="${esc(opts.title)}"` : ""}>${opts.icon ? ic(opts.icon, "ic sm") : ""}<span>${esc(label)}</span></button>`;
const dataAttrs = (o = {}) => Object.entries(o).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("");
const empty = (title, sub, icon = "inbox") => `<div class="empty">${ic(icon, "ic lg")}<b>${esc(title)}</b>${sub ? `<p>${esc(sub)}</p>` : ""}</div>`;
const kpi = (label, value, sub, opts = {}) => `<div class="kpi ${opts.tone ? "k-" + opts.tone : ""}"${opts.act ? ` data-act="${opts.act}" role="button" tabindex="0"` : ""}${dataAttrs(opts.data)}><div class="kpi-l">${esc(label)}</div><div class="kpi-v num">${value}</div>${sub ? `<div class="kpi-s">${sub}</div>` : ""}${opts.spark ? spark(opts.spark, { tone: opts.tone }) : ""}</div>`;
/* simple table: cols = [{k,label,num,render}] */
const table = (cols, rows, opts = {}) => `<div class="tw"><table class="tbl ${opts.cls || ""}"><thead><tr>${cols.map((c) => `<th class="${c.num ? "n" : ""}">${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r, i) => `<tr${opts.rowAct ? ` data-act="${opts.rowAct}" data-id="${esc(r.id)}" tabindex="0"` : ""}${opts.rowAct || opts.rowCls ? ` class="${[opts.rowAct ? "click" : "", opts.rowCls ? opts.rowCls(r) || "" : ""].join(" ").trim()}"` : ""}>${cols.map((c) => `<td class="${c.num ? "n num" : ""}">${c.render ? c.render(r, i) : esc(r[c.k])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${cols.length}" class="muted c">${esc(opts.empty || "لا توجد بيانات")}</td></tr>`}</tbody></table></div>`;
const meter = (v, max, tone) => { const p = clamp(max ? v / max : 0, 0, 1); const t = tone || (p >= 1 ? "bad" : p >= 0.8 ? "warn" : "ok"); return `<div class="meter m-${t}" role="meter" aria-valuenow="${num(v)}" aria-valuemax="${num(max)}"><i style="width:${(p * 100).toFixed(1)}%"></i></div>`; };
const tip = (t) => ` data-tip="${esc(t)}"`;

/* ---------- charts (inline SVG, colours from tokens, hover via data-tip) ---------- */
function spark(vals, o = {}) {
  if (!vals || vals.length < 2) return "";
  const W = 120, H = 30, mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * W, H - 3 - ((v - mn) / r) * (H - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  const last = pts[pts.length - 1];
  return `<svg class="spark s-${o.tone || "brand"}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="sa" d="${d}L${W},${H}L0,${H}Z"/><path class="sl" d="${d}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6"/></svg>`;
}
/* vertical bars; series = [{label, value, tone?}] */
function bars(series, o = {}) {
  const W = o.w || 560, H = o.h || 200, pl = 40, pr = 10, pt = 14, pb = 26;
  const mx = Math.max(1, ...series.map((s) => s.value)) * 1.12;
  const bw = (W - pl - pr) / series.length;
  const ticks = niceTicks(mx, 4);
  let g = ticks.map((t) => { const y = pt + (H - pt - pb) * (1 - t / mx); return `<line x1="${pl}" x2="${W - pr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="grid"/><text x="${pl - 6}" y="${(y + 4).toFixed(1)}" class="ax" text-anchor="end">${fmtTick(t)}</text>`; }).join("");
  series.forEach((s, i) => {
    const h = (H - pt - pb) * (s.value / mx), x = pl + i * bw + bw * 0.18, w = bw * 0.64, y = H - pb - h;
    g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" class="bar b-${s.tone || o.tone || "brand"}"${tip(`${s.label}: ${o.fmt ? o.fmt(s.value) : num(s.value)}`)} tabindex="0"/>`;
    if (series.length <= 14 || i % Math.ceil(series.length / 12) === 0) g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" class="ax" text-anchor="middle">${esc(s.label)}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "")}" style="direction:ltr">${g}</svg>`;
}
/* multi-line; lines = [{name, tone, values:[]}], labels=[] */
function lines(lineSet, labels, o = {}) {
  const W = o.w || 560, H = o.h || 200, pl = 40, pr = 12, pt = 12, pb = 24;
  const all = lineSet.flatMap((l) => l.values);
  const mx = Math.max(1, ...all) * 1.1, n = labels.length;
  const sx = (i) => pl + (W - pl - pr) * (n > 1 ? i / (n - 1) : 0), sy = (v) => pt + (H - pt - pb) * (1 - v / mx);
  let g = niceTicks(mx, 4).map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}" class="grid"/><text x="${pl - 6}" y="${(sy(t) + 4).toFixed(1)}" class="ax" text-anchor="end">${fmtTick(t)}</text>`).join("");
  const step = Math.ceil(n / 8);
  labels.forEach((l, i) => { if (i % step === 0 || i === n - 1) g += `<text x="${sx(i).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(l)}</text>`; });
  lineSet.forEach((l) => {
    const d = l.values.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
    if (o.area && lineSet.length === 1) g += `<path d="${d}L${sx(n - 1).toFixed(1)},${H - pb}L${sx(0).toFixed(1)},${H - pb}Z" class="area a-${l.tone || "brand"}"/>`;
    g += `<path d="${d}" class="ln l-${l.tone || "brand"}" ${l.dash ? 'stroke-dasharray="4 4"' : ""}/>`;
    const li = l.values.length - 1; g += `<circle cx="${sx(li).toFixed(1)}" cy="${sy(l.values[li]).toFixed(1)}" r="3.5" class="pt l-${l.tone || "brand"}"/>`;
  });
  labels.forEach((lab, i) => { g += `<rect x="${(sx(i) - (W - pl - pr) / n / 2).toFixed(1)}" y="${pt}" width="${((W - pl - pr) / n).toFixed(1)}" height="${H - pt - pb}" class="hit"${tip(`${lab} · ` + lineSet.map((l) => `${l.name}: ${o.fmt ? o.fmt(l.values[i]) : num(l.values[i])}`).join(" · "))}/>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "")}" style="direction:ltr">${g}</svg>`;
}
/* horizontal funnel / ranked bars; rows=[{label,value,sub?,tone?}] */
function hbars(rows, o = {}) {
  const mx = Math.max(1, ...rows.map((r) => r.value));
  return `<div class="hbars">${rows.map((r) => `<div class="hb"${tip(`${r.label}: ${o.fmt ? o.fmt(r.value) : num(r.value)}`)}><span class="hb-l">${esc(r.label)}</span><span class="hb-t"><i class="b-${r.tone || o.tone || "brand"}" style="width:${((r.value / mx) * 100).toFixed(1)}%"></i></span><span class="hb-v num">${o.fmt ? o.fmt(r.value) : num(r.value)}${r.sub ? ` <small>${esc(r.sub)}</small>` : ""}</span></div>`).join("")}</div>`;
}
function legend(items) { return `<div class="legend">${items.map(([name, tone]) => `<span><i class="b-${tone}"></i>${esc(name)}</span>`).join("")}</div>`; }
function niceTicks(mx, n) { const raw = mx / n; const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const st = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw; const out = []; for (let t = 0; t <= mx + 1e-9; t += st) out.push(t); return out; }
function fmtTick(t) { return t >= 1e6 ? `${num(t / 1e6, t % 1e6 ? 1 : 0)}M` : t >= 1e3 ? `${num(t / 1e3, t % 1e3 ? 1 : 0)}k` : num(t, t % 1 ? 1 : 0); }

/* ---------- storage that never throws ---------- */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

/* ---------- logo (vector trace of the official artwork) ---------- */
const logo = (ink = "currentColor", spark2 = "var(--logo-spark)", withName = false) => `<svg class="logo" viewBox="${withName ? "180 120 1200 800" : "180 120 1200 700"}" role="img" aria-label="توّا"><g fill="none" stroke="${ink}" stroke-width="172" stroke-linecap="round" stroke-linejoin="round"><path d="M322 332 V596 C322 690 372 738 470 738 L600 738"/><path d="M648 690 L568 806"/><circle cx="720" cy="568" r="138"/><path d="M846 598 C880 690 960 660 1110 660 L1248 660 V512"/></g><g fill="${ink}"><circle cx="1074" cy="334" r="74"/><circle cx="1232" cy="334" r="74"/></g><g fill="none" stroke="${spark2}" stroke-width="104" stroke-linecap="round"><path d="M545 322 L634 218"/><path d="M742 300 L846 168"/></g>${withName ? `<text x="1058" y="886" font-family="Baloo Bhaijaan 2, sans-serif" font-weight="800" font-size="112" fill="${ink}" text-anchor="middle" letter-spacing="34">TWAA</text>` : ""}</svg>`;

Object.assign(TW, { I, ic, esc, num, money, kmoney, pct, pad, clock, dateAr, ago, dur, mins, uid, clamp, sum, by, groupBy, norm, lev, prng, chip, sev, btn, dataAttrs, empty, kpi, table, meter, tip, spark, bars, lines, hbars, legend, niceTicks, fmtTick, store, logo });
})();
