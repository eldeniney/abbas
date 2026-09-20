/**
 * Mr. Abb — REST client. Talks only to this WordPress site (which proxies
 * to the secure backend). Sends the cookie nonce on every request.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb;
	var config = MrAbb.config;

	function ApiError(message, code, status, details) {
		this.name = 'ApiError';
		this.message = message;
		this.code = code || 'unknown';
		this.status = status || 0;
		this.details = details || null;
	}
	ApiError.prototype = Object.create(Error.prototype);

	function request(method, path, body, options) {
		options = options || {};
		var url = (config.restUrl || '/wp-json/mrabb/v1').replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');
		if (options.query) {
			var qs = Object.keys(options.query).filter(function (k) { return options.query[k] != null; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(options.query[k]); }).join('&');
			if (qs) { url += (url.indexOf('?') === -1 ? '?' : '&') + qs; }
		}
		var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
		var timer = controller ? setTimeout(function () { controller.abort(); }, options.timeout || 30000) : null;
		return fetch(url, {
			method: method,
			credentials: 'same-origin',
			headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-WP-Nonce': config.nonce || '' }, options.headers || {}),
			body: body != null ? JSON.stringify(body) : undefined,
			signal: controller ? controller.signal : undefined
		}).then(function (res) {
			if (timer) { clearTimeout(timer); }
			return res.text().then(function (text) {
				var data = null;
				try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
				if (!res.ok) {
					var msg = data && data.message ? data.message : MrAbb.i18n.t('error_backend');
					var code = data && data.code ? data.code : 'http_' + res.status;
					throw new ApiError(msg, code, res.status, data && data.data ? data.data.details : null);
				}
				return data;
			});
		}).catch(function (err) {
			if (timer) { clearTimeout(timer); }
			if (err instanceof ApiError) { throw err; }
			throw new ApiError(MrAbb.i18n.t('error_backend'), err.name === 'AbortError' ? 'timeout' : 'network', 0, err.message);
		});
	}

	MrAbb.api = {
		ApiError: ApiError,
		get: function (path, query, options) { return request('GET', path, null, Object.assign({ query: query }, options || {})); },
		post: function (path, body, options) { return request('POST', path, body || {}, options); },
		// Named helpers mirroring the backend contract (docs/backend-api-contract.md).
		voiceSession: function (language) { return request('POST', '/voice/session', { language: language }); },
		sendMessage: function (payload) { return request('POST', '/agent/message', payload); },
		executeTool: function (payload) { return request('POST', '/tools/execute', payload); },
		approve: function (id) { return request('POST', '/approvals/' + encodeURIComponent(id) + '/approve', {}); },
		reject: function (id) { return request('POST', '/approvals/' + encodeURIComponent(id) + '/reject', {}); },
		activity: function (query) { return request('GET', '/activity', null, { query: query }); },
		connections: function () { return request('GET', '/connections'); },
		context: function () { return request('GET', '/profile/context'); },
		history: function (query) { return request('GET', '/history', null, { query: query }); },
		session: function (id) { return request('GET', '/history/' + encodeURIComponent(id)); },
		tasks: function (query) { return request('GET', '/tasks', null, { query: query }); },
		completeTask: function (id) { return request('POST', '/tasks/' + encodeURIComponent(id) + '/complete', {}); },
		automations: function () { return request('GET', '/automations'); },
		toggleAutomation: function (id, enabled) { return request('POST', '/automations/' + encodeURIComponent(id) + '/toggle', { enabled: enabled }); },
		runAutomation: function (id) { return request('POST', '/automations/' + encodeURIComponent(id) + '/run', {}); },
		savePreferences: function (prefs) { return request('POST', '/preferences', prefs); }
	};
})(window);
