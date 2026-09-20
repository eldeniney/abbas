/* Mr. Abb — admin helpers. */
(function () {
	'use strict';
	if (!window.MrAbbAdmin) { return; }
	var rest = window.MrAbbAdmin.restUrl.replace(/\/$/, '');
	function post(path) {
		return fetch(rest + path, { method: 'POST', credentials: 'same-origin', headers: { 'X-WP-Nonce': window.MrAbbAdmin.nonce, 'Content-Type': 'application/json' }, body: '{}' }).then(function (r) { return r.json(); });
	}
	function show(out, d) { out.textContent = (d.ok ? '✓ ' : '✕ ') + (d.message || ''); out.style.color = d.ok ? '#2E8B5B' : '#BF4A47'; }
	document.querySelectorAll('[data-mrabb-test]').forEach(function (b) {
		b.addEventListener('click', function () {
			var out = b.parentNode.querySelector('.mrabb-test-out'); b.disabled = true; out.textContent = '…';
			post('/admin/test/' + b.dataset.mrabbTest).then(function (d) { show(out, d); }).catch(function (e) { show(out, { ok: false, message: e.message }); }).then(function () { b.disabled = false; });
		});
	});
	document.querySelectorAll('[data-mrabb-sync]').forEach(function (b) {
		b.addEventListener('click', function () {
			var out = b.parentNode.querySelector('.mrabb-test-out'); b.disabled = true; out.textContent = 'Syncing…';
			post('/admin/elevenlabs/sync').then(function (d) { show(out, d); }).catch(function (e) { show(out, { ok: false, message: e.message }); }).then(function () { b.disabled = false; });
		});
	});
	document.querySelectorAll('[data-copy]').forEach(function (el) {
		el.title = 'Click to copy'; el.style.cursor = 'pointer';
		el.addEventListener('click', function () { var t = el.value != null && el.tagName === 'TEXTAREA' ? el.value : el.textContent; if (navigator.clipboard) { navigator.clipboard.writeText(t).then(function () { el.classList.add('is-copied'); setTimeout(function () { el.classList.remove('is-copied'); }, 900); }); } });
	});
	var btn = document.getElementById('mrabb-test-connection');
	var out = document.getElementById('mrabb-test-result');
	if (!btn) { return; }
	btn.addEventListener('click', function () {
		btn.disabled = true;
		out.textContent = '…';
		fetch(window.MrAbbAdmin.restUrl.replace(/\/$/, '') + '/status', { credentials: 'same-origin', headers: { 'X-WP-Nonce': window.MrAbbAdmin.nonce } })
			.then(function (r) { return r.json(); })
			.then(function (d) { out.textContent = (d.ok ? '✓ ' : '✕ ') + (d.message || ''); out.style.color = d.ok ? '#2E8B5B' : '#BF4A47'; })
			.catch(function (e) { out.textContent = '✕ ' + e.message; out.style.color = '#BF4A47'; })
			.then(function () { btn.disabled = false; });
	});
})();
