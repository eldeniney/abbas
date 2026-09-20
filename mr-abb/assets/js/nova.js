/**
 * Mr. Abb — Nova style behaviours: starfield, waveform, hologram state,
 * quick commands, weather (Open-Meteo, no key), insights, recent sessions.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb;
	if (!MrAbb || !document.body.classList.contains('mrabb-style-nova')) { return; }
	var bus = MrAbb.bus, store = MrAbb.store, util = MrAbb.util, el = util.el, config = MrAbb.config;
	var t = function (k, v) { return MrAbb.i18n.t(k, v); };
	var reduced = util.prefersReducedMotion();
	var q = function (s, r) { return (r || document).querySelector(s); };

	/* Starfield */
	function starfield() {
		if (reduced) { return; }
		var c = el('canvas', { class: 'mrabb-stars', 'aria-hidden': 'true' });
		document.body.appendChild(c);
		var ctx = c.getContext('2d'), stars = [], w, h, dpr = Math.min(2, window.devicePixelRatio || 1);
		function size() { w = c.width = window.innerWidth * dpr; h = c.height = window.innerHeight * dpr; c.style.width = '100%'; c.style.height = '100%'; stars = []; for (var i = 0; i < Math.min(160, (w * h) / 22000); i++) { stars.push({ x: Math.random() * w, y: Math.random() * h, r: (Math.random() * 1.2 + 0.3) * dpr, s: Math.random() * 0.25 + 0.05, p: Math.random() * Math.PI * 2, c: Math.random() < 0.15 ? '124,108,255' : (Math.random() < 0.3 ? '79,195,255' : '220,228,255') }); } }
		size(); window.addEventListener('resize', size, { passive: true });
		var last = 0;
		function frame(ts) {
			if (ts - last > 40) { last = ts; ctx.clearRect(0, 0, w, h); for (var i = 0; i < stars.length; i++) { var s = stars[i]; s.y -= s.s * dpr; if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; } var a = 0.35 + 0.65 * Math.abs(Math.sin(ts / 1400 + s.p)); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(2) + ')'; ctx.fill(); } }
			requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
	}

	/* Waveform + mic bars follow amplitude / state */
	var amp = 0, wave = q('[data-nova-wave]'), bars = document.querySelectorAll('[data-nova-bars]'), holo = q('[data-nova-holo]'), micBtn = q('#mrabb-orb.nova-mic__btn'), micLabel = q('[data-nova-mic-label]'), micSub = q('[data-nova-mic-sub]');
	bus.on('agent:amplitude', function (p) { amp = p.value || 0; });
	function animateBars() {
		if (reduced) { return; }
		var state = store.get('agentState'), active = state === 'listening' || state === 'speaking', tick = Date.now() / 1000;
		if (wave) { var ws = wave.children; for (var i = 0; i < ws.length; i++) { var base = 0.18 + 0.18 * Math.abs(Math.sin(tick * 1.3 + i * 0.35)); var v = active ? base + amp * (0.5 + 0.5 * Math.abs(Math.sin(tick * 9 + i * 0.8))) : base; ws[i].style.height = Math.min(100, v * 100) + '%'; } }
		bars.forEach(function (b) { var bs = b.children; for (var j = 0; j < bs.length; j++) { var k = b.classList.contains('nova-mic__bars--r') ? j : bs.length - 1 - j; var base2 = 0.15 + 0.12 * Math.abs(Math.sin(tick * 1.1 + k)); var v2 = active ? base2 + amp * Math.abs(Math.sin(tick * 10 + k * 0.9)) * 0.9 : base2; bs[j].style.height = Math.min(100, v2 * 100) + '%'; } });
		if (holo) { holo.style.setProperty('--amp', amp.toFixed(3)); }
		requestAnimationFrame(animateBars);
	}
	bus.on('agent:state', function (p) {
		if (holo) { holo.dataset.state = p.state; }
		if (micLabel) { micLabel.textContent = p.state === 'idle' ? t('state_idle') : t('state_' + p.state); }
		if (micSub) { micSub.textContent = p.state === 'listening' ? t('state_active') : (config.mockMode ? t('mock_pill') : (store.get('connection') === 'connected' ? t('conn_connected') : t('conn_ready'))); }
	});

	/* Quick commands */
	document.addEventListener('click', function (e) {
		var b = e.target.closest('[data-command]');
		if (!b) { return; }
		e.preventDefault();
		var input = q('[data-composer-input]');
		if (input) { input.value = b.dataset.command; }
		bus.emit('composer:submit', { text: b.dataset.command });
		if (input) { input.value = ''; }
		var s = q('[data-session]'); if (s && s.scrollIntoView) { setTimeout(function () { s.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, 250); }
	});
	document.addEventListener('click', function (e) {
		var d = e.target.closest('[data-action="dock-ai"]');
		if (!d) { return; }
		if (q('#mrabb-orb')) { e.preventDefault(); bus.emit('ui:orb'); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }
	});
	var params = new URLSearchParams(window.location.search);
	if (params.get('talk') === '1' && q('#mrabb-orb')) { setTimeout(function () { bus.emit('ui:orb'); }, 600); if (window.history.replaceState) { window.history.replaceState({}, '', config.pages.home); } }
	if (params.get('cmd') && q('[data-composer-input]')) { setTimeout(function () { bus.emit('composer:submit', { text: params.get('cmd') }); }, 400); if (window.history.replaceState) { window.history.replaceState({}, '', config.pages.home); } }

	/* Clock */
	var clock = q('[data-nova-clock]');
	if (clock) { setInterval(function () { clock.textContent = t('today') + ' ' + util.formatTime(new Date(), MrAbb.i18n.language); }, 30000); }

	/* Weather (Open-Meteo, no key, fetched from the browser) */
	var ICONS = {
		sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
		cloud: '<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5-1.5A3.5 3.5 0 0 1 18 18z"/>',
		rain: '<path d="M7 15a4 4 0 0 1-.5-8 6 6 0 0 1 11.5-1.5A3.5 3.5 0 0 1 18 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
		storm: '<path d="M7 14a4 4 0 0 1-.5-8 6 6 0 0 1 11.5-1.5A3.5 3.5 0 0 1 18 14z"/><path d="M13 13l-2 4h3l-2 4"/>'
	};
	function wcode(code) { if (code === 0 || code === 1) { return ['sun', t('wx_clear')]; } if (code <= 3) { return ['cloud', t('wx_cloudy')]; } if (code >= 95) { return ['storm', t('wx_storm')]; } if (code >= 51) { return ['rain', t('wx_rain')]; } return ['cloud', t('wx_fog')]; }
	function weather() {
		var card = q('[data-nova-weather]');
		if (!card || !window.fetch) { return; }
		var city = card.dataset.city || 'Dubai';
		var cached = null; try { cached = JSON.parse(localStorage.getItem('mrabb_wx_' + city) || 'null'); } catch (e) { cached = null; }
		if (cached && Date.now() - cached.at < 30 * 60000) { renderWeather(cached.data); return; }
		fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=' + MrAbb.i18n.language + '&name=' + encodeURIComponent(city)).then(function (r) { return r.json(); }).then(function (g) {
			var loc = g && g.results && g.results[0]; if (!loc) { throw new Error('no location'); }
			return fetch('https://api.open-meteo.com/v1/forecast?latitude=' + loc.latitude + '&longitude=' + loc.longitude + '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=6').then(function (r) { return r.json(); }).then(function (d) { d._city = loc.name; return d; });
		}).then(function (d) { try { localStorage.setItem('mrabb_wx_' + city, JSON.stringify({ at: Date.now(), data: d })); } catch (e) { /* ignore */ } renderWeather(d); }).catch(function () { var desc = q('[data-nova-weather-desc]'); if (desc) { desc.textContent = t('wx_unavailable'); } });
	}
	function renderWeather(d) {
		var temp = q('[data-nova-weather-temp]'), desc = q('[data-nova-weather-desc]'), days = q('[data-nova-weather-days]'), cityEl = q('[data-nova-weather-city]');
		if (!d || !d.current) { return; }
		if (cityEl && d._city) { cityEl.textContent = d._city; }
		if (temp) { temp.textContent = Math.round(d.current.temperature_2m) + '°'; }
		var wc = wcode(d.current.weather_code); if (desc) { desc.textContent = wc[1]; }
		if (days && d.daily) {
			days.innerHTML = '';
			for (var i = 1; i < Math.min(6, d.daily.time.length); i++) {
				var dt = new Date(d.daily.time[i] + 'T12:00:00'); var ic = wcode(d.daily.weather_code[i])[0];
				days.appendChild(el('div', {}, [el('span', { text: dt.toLocaleDateString(MrAbb.i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short' }) }), el('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: ICONS[ic] }), el('b', { text: Math.round(d.daily.temperature_2m_max[i]) + '°' })]));
			}
			// SVG elements created via createElement need the namespace; rebuild them properly.
			days.querySelectorAll('svg').forEach(function (s) { var n = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); n.setAttribute('viewBox', '0 0 24 24'); n.setAttribute('fill', 'none'); n.setAttribute('stroke', 'currentColor'); n.setAttribute('stroke-width', '1.6'); n.setAttribute('stroke-linecap', 'round'); n.setAttribute('stroke-linejoin', 'round'); n.innerHTML = s.innerHTML; s.replaceWith(n); });
		}
	}

	/* Insights + recent sessions + connected tools from the gateway (or mock) */
	function insights(sessions) {
		var now = Date.now(), week = 7 * 86400000, cur = 0, prev = 0, byDay = [0, 0, 0, 0, 0, 0, 0];
		sessions.forEach(function (s) { var age = now - new Date(s.startedAt).getTime(); if (age < week) { cur += s.actions || 0; byDay[6 - Math.min(6, Math.floor(age / 86400000))] += s.actions || 0; } else if (age < 2 * week) { prev += s.actions || 0; } });
		var delta = prev ? Math.round((cur - prev) / prev * 100) : (cur ? 100 : 0);
		var score = Math.min(100, Math.round(40 + Math.min(60, cur * 6)));
		var d = q('[data-nova-delta]'); if (d) { d.textContent = (delta >= 0 ? '↑ ' : '↓ ') + Math.abs(delta) + '%'; d.style.color = delta >= 0 ? 'var(--mrabb-success)' : 'var(--mrabb-danger)'; }
		var sc = q('[data-nova-score]'); if (sc) { sc.textContent = String(score); }
		var ring = q('[data-nova-ring]'); if (ring) { setTimeout(function () { ring.style.strokeDashoffset = String(251 - 251 * score / 100); }, 100); }
		var max = Math.max.apply(null, byDay.concat([1])), pts = byDay.map(function (v, i) { return [i * 50, 60 - (v / max) * 50]; });
		var line = 'M' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' L');
		var lp = q('[data-nova-spark-line]'), fp = q('[data-nova-spark-fill]');
		if (lp) { lp.setAttribute('d', line); if (!reduced) { var len = lp.getTotalLength ? lp.getTotalLength() : 400; lp.style.strokeDasharray = len; lp.style.strokeDashoffset = len; lp.style.transition = 'stroke-dashoffset 1.4s ease-out'; setTimeout(function () { lp.style.strokeDashoffset = '0'; }, 120); } }
		if (fp) { fp.setAttribute('d', line + ' L300,70 L0,70 Z'); }
	}
	function recent(sessions) {
		var box = q('[data-nova-recent]'); if (!box) { return; }
		box.innerHTML = '';
		if (!sessions.length) { box.appendChild(MrAbb.ui.emptyInline(t('empty_history_title'), t('empty_history_text'))); return; }
		sessions.slice(0, 3).forEach(function (s) {
			box.appendChild(el('button', { type: 'button', class: 'nova-recent__item', onClick: function () { window.location.href = config.pages.history; } }, [
				el('span', { class: 'nova-recent__thumb', text: MrAbb.cards.initials(s.title || 'S') }),
				el('span', {}, [el('span', { class: 'nova-recent__title', text: s.title || t('session_conversation') }), el('br'), el('span', { class: 'nova-recent__meta', text: util.formatDay(s.startedAt, MrAbb.i18n.language) + ' · ' + t('actions_count', { n: s.actions || 0 }) })])
			]));
		});
	}
	function devices(items) {
		var box = q('[data-nova-devices]'); if (!box) { return; }
		box.innerHTML = '';
		items.filter(function (c) { return c.type !== 'engine' || c.id === 'elevenlabs' || c.id === 'claude'; }).slice(0, 5).forEach(function (c) {
			var on = c.status === 'connected', warn = c.status === 'attention';
			box.appendChild(el('div', { class: 'nova-device' }, [el('span', { class: 'nova-device__dot' + (on ? '' : warn ? ' nova-device__dot--warn' : ' nova-device__dot--off') }), el('span', { text: c.name }), el('span', { class: 'nova-device__status', text: on ? t('connected') : warn ? t('needs_attention') : t('not_connected') })]));
		});
	}
	function loadAll() {
		if (config.view !== 'home') { return; }
		MrAbb.pages.load('history').then(function (d) { var s = Array.isArray(d) ? d : (d.sessions || []); insights(s); recent(s); }).catch(function () { insights([]); recent([]); });
		MrAbb.pages.load('connections').then(function (d) { devices(Array.isArray(d) ? d : (d.connections || [])); }).catch(function () { devices([]); });
	}

	/* Context panel in Nova uses its own schedule rows */
	bus.on('context:data', function (ctx) {
		var s = q('[data-context-body="schedule"]'); if (!s || !s.classList.contains('nova-sched')) { return; }
		s.innerHTML = '';
		var ev = (ctx && ctx.schedule) || [];
		if (!ev.length) { s.appendChild(MrAbb.ui.emptyInline(t('empty_context'))); return; }
		ev.slice(0, 5).forEach(function (e) { s.appendChild(el('div', { class: 'nova-sched__item' }, [el('span', { class: 'nova-sched__time', text: e.time || '' }), el('span', { class: 'nova-sched__title', text: e.title }), el('span', { class: 'nova-sched__dur', text: e.duration || e.location || '' }), el('span', { class: 'nova-sched__bar' })])); });
	});

	function init() { starfield(); requestAnimationFrame(animateBars); weather(); loadAll(); }
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})(window);
