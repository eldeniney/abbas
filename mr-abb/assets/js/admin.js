/* Mr. Abb — admin helpers. */
(function () {
	'use strict';
	var btn = document.getElementById('mrabb-test-connection');
	var out = document.getElementById('mrabb-test-result');
	if (!btn || !window.MrAbbAdmin) { return; }
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
