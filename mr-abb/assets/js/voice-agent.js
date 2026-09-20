/**
 * Mr. Abb — ElevenLabs voice agent adapter.
 *
 * Interface (shared with MockAgent):
 *   start()                      → getVoiceSession() + startConversation()
 *   stop()                       → endConversation()
 *   sendText(text)               → typed command (voice session or /agent/message)
 *   respondApproval(id, approved)→ resolves a pending approval
 *   setLanguage(lang)
 *   isActive()
 *
 * Callbacks (all forwarded to MrAbb.events / the bus):
 *   onUserTranscript, onAgentResponse, onAgentStateChange,
 *   onToolStarted, onToolCompleted, onApprovalRequired, onError
 *
 * The ElevenLabs API key never reaches this file. The browser asks
 * WordPress (POST /wp-json/mrabb/v1/voice/session), WordPress asks the
 * backend, and the backend returns a short-lived signed URL or
 * conversation token. The SDK (@elevenlabs/client) is loaded on demand
 * from the configured ES-module URL only when a live session starts.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb, bus = MrAbb.bus, store = MrAbb.store, api = MrAbb.api, util = MrAbb.util, config = MrAbb.config;
	var t = function (k, v) { return MrAbb.i18n.t(k, v); };

	var sdkPromise = null;
	function loadSdk() {
		if (sdkPromise) { return sdkPromise; }
		var url = config.voice && config.voice.sdkUrl;
		if (!url) { return Promise.reject(new Error('sdk_url_missing')); }
		// Dynamic import keeps the SDK out of the critical path and out of the page until needed.
		sdkPromise = new Function('u', 'return import(u)')(url).then(function (mod) {
			var Conversation = mod.Conversation || (mod.default && mod.default.Conversation);
			if (!Conversation) { throw new Error('sdk_invalid'); }
			return Conversation;
		}).catch(function (err) { sdkPromise = null; throw err; });
		return sdkPromise;
	}

	function VoiceAgent() {
		this.name = 'elevenlabs';
		this.conversation = null;
		this.session = null;
		this.active = false;
		this.language = MrAbb.i18n.language;
		this.pendingApprovals = {};
		this.ampRaf = null;
		this.poller = null;
		this.lastActivityAt = null;
		this.partialAgentId = null;
	}

	VoiceAgent.prototype.isActive = function () { return this.active; };
	VoiceAgent.prototype.setLanguage = function (lang) { this.language = lang; };

	/** Ask WordPress → backend for a signed session. */
	VoiceAgent.prototype.getVoiceSession = function () {
		return api.voiceSession(this.language);
	};

	VoiceAgent.prototype.start = function () {
		var self = this;
		if (this.active) { return Promise.resolve(); }
		store.setConnection('connecting');
		store.setAgentState('connecting');
		return this.getVoiceSession().then(function (session) {
			if (!session || session.mode === 'mock') {
				var e = new Error('mock_session'); e.code = 'mock_session'; throw e;
			}
			self.session = session;
			return loadSdk().catch(function (err) { var e2 = new Error(t('error_sdk')); e2.code = 'sdk'; e2.details = err && err.message; throw e2; });
		}).then(function (Conversation) {
			return self.startConversation(Conversation);
		}).catch(function (err) {
			self.active = false;
			store.setConnection(err.code === 'mock_session' ? 'offline' : 'error');
			store.setAgentState(err.code === 'mock_session' ? 'idle' : 'error');
			throw err;
		});
	};

	VoiceAgent.prototype.startConversation = function (Conversation) {
		var self = this;
		var s = this.session;
		var options = {
			onConnect: function (info) { self.onConnect(info); },
			onDisconnect: function (info) { self.onDisconnect(info); },
			onError: function (message, context) { self.onError(message, context); },
			onMessage: function (msg) { self.onMessage(msg); },
			onModeChange: function (mode) { self.onModeChange(mode); },
			onStatusChange: function (status) { self.onStatusChange(status); },
			clientTools: this.clientTools(),
			dynamicVariables: Object.assign({ user_name: config.user && config.user.firstName, language: this.language, timezone: config.timezone }, s.dynamicVariables || {}),
			overrides: { agent: { language: this.language } }
		};
		if (s.signedUrl) { options.signedUrl = s.signedUrl; options.connectionType = 'websocket'; }
		else if (s.conversationToken) { options.conversationToken = s.conversationToken; options.connectionType = 'webrtc'; }
		else if (s.agentId) { options.agentId = s.agentId; options.connectionType = 'websocket'; }
		else { var e = new Error(t('error_voice_unavailable')); e.code = 'no_session'; return Promise.reject(e); }

		return Conversation.startSession(options).then(function (conversation) {
			self.conversation = conversation;
			self.active = true;
			self.startAmplitude();
			self.startActivityPolling();
			return conversation;
		}).catch(function (err) {
			var e2 = new Error(/permission|NotAllowed|microphone/i.test(String(err && err.message)) ? t('error_mic') : t('error_voice_unavailable'));
			e2.code = 'start_failed'; e2.details = err && err.message;
			throw e2;
		});
	};

	VoiceAgent.prototype.stop = function () {
		var self = this;
		this.stopAmplitude();
		this.stopActivityPolling();
		var c = this.conversation;
		this.conversation = null;
		this.active = false;
		var done = c ? Promise.resolve(c.endSession()).catch(function () { /* already closed */ }) : Promise.resolve();
		return done.then(function () { store.setConnection('offline'); store.setAgentState('idle'); self.session = null; });
	};

	/** Typed command: through the live session if open, else via the backend message endpoint. */
	VoiceAgent.prototype.sendText = function (text) {
		var self = this;
		MrAbb.events.handle({ type: 'transcript', role: 'user', text: text });
		if (this.conversation && typeof this.conversation.sendUserMessage === 'function') {
			try { this.conversation.sendUserMessage(text); return Promise.resolve(); } catch (e) { /* fall through */ }
		}
		store.setAgentState('thinking');
		var session = store.ensureSession();
		return api.sendMessage({ text: text, sessionId: session.remoteId || session.id, language: this.language }).then(function (res) {
			if (res && res.session && res.session.id) { MrAbb.events.handle({ type: 'session', id: res.session.id, title: res.session.title }); }
			if (res && Array.isArray(res.events)) { MrAbb.events.handleMany(res.events); }
			if (res && res.reply && res.reply.text) { MrAbb.events.handle({ type: 'transcript', role: 'agent', text: res.reply.text }); }
			if (store.get('agentState') !== 'approval_required' && store.get('agentState') !== 'error') { store.setAgentState('idle'); }
		}).catch(function (err) {
			self.onError(err.message, err);
		});
	};

	VoiceAgent.prototype.respondApproval = function (id, approved) {
		var self = this;
		var pending = this.pendingApprovals[id];
		var call = approved ? api.approve(id) : api.reject(id);
		return call.then(function (res) {
			MrAbb.events.handle({ type: 'approval_resolved', id: id, approved: approved });
			if (res && Array.isArray(res.events)) { MrAbb.events.handleMany(res.events); }
			if (pending) { pending.resolve(approved ? 'approved' : 'rejected'); delete self.pendingApprovals[id]; }
			if (store.get('agentState') === 'approval_required') { store.setAgentState(self.conversation ? 'listening' : 'idle'); }
		}).catch(function (err) { self.onError(err.message, err); });
	};

	/* ------------------------------------------------- SDK callbacks */
	VoiceAgent.prototype.onConnect = function () { store.setConnection('connected'); store.setAgentState('listening'); };
	VoiceAgent.prototype.onDisconnect = function (info) {
		this.active = false; this.conversation = null; this.stopAmplitude(); this.stopActivityPolling();
		store.setConnection('offline');
		if (info && info.reason === 'error') { store.setAgentState('error'); } else { store.setAgentState('idle'); }
		bus.emit('voice:disconnected', info || {});
	};
	VoiceAgent.prototype.onError = function (message, context) {
		util.log('error', 'voice error', { message: message });
		MrAbb.events.handle({ type: 'error', message: typeof message === 'string' && message ? message : t('error_generic'), details: context, retryable: false });
		store.setAgentState('error');
	};
	VoiceAgent.prototype.onMessage = function (msg) {
		if (!msg) { return; }
		var role = msg.source === 'user' ? 'user' : 'agent';
		MrAbb.events.handle({ type: 'transcript', role: role, text: msg.message, final: true });
	};
	VoiceAgent.prototype.onModeChange = function (mode) {
		var m = mode && mode.mode ? mode.mode : mode;
		if (store.get('agentState') === 'approval_required') { return; }
		if (m === 'speaking') { store.setAgentState('speaking'); }
		else if (m === 'listening') { store.setAgentState('listening'); }
	};
	VoiceAgent.prototype.onStatusChange = function (status) {
		var s = status && status.status ? status.status : status;
		if (s === 'connecting') { store.setConnection('connecting'); }
		if (s === 'connected') { store.setConnection('connected'); }
		if (s === 'disconnected') { store.setConnection('offline'); }
	};

	/**
	 * Client tools the ElevenLabs agent can call to drive the interface.
	 * Register these names on the agent in the ElevenLabs dashboard
	 * (see docs/elevenlabs-integration.md).
	 */
	VoiceAgent.prototype.clientTools = function () {
		var self = this;
		return {
			mrabb_set_state: function (params) { MrAbb.events.handle({ type: 'state', state: params.state }); return 'ok'; },
			mrabb_tool_event: function (params) { MrAbb.events.handle(Object.assign({ type: 'tool' }, params)); return 'ok'; },
			mrabb_show_result: function (params) { MrAbb.events.handle(Object.assign({ type: 'result' }, params)); return 'ok'; },
			mrabb_request_approval: function (params) {
				return new Promise(function (resolve) {
					var id = params.id || util.uid('apr');
					self.pendingApprovals[id] = { resolve: resolve };
					MrAbb.events.handle(Object.assign({ type: 'approval' }, params, { id: id }));
				});
			},
			mrabb_show_error: function (params) { MrAbb.events.handle(Object.assign({ type: 'error' }, params)); return 'ok'; }
		};
	};

	/* --------------------------------------------- Amplitude → orb */
	VoiceAgent.prototype.startAmplitude = function () {
		var self = this;
		if (util.prefersReducedMotion()) { return; }
		var tick = function () {
			if (!self.conversation) { return; }
			var v = 0;
			try {
				var state = store.get('agentState');
				v = state === 'speaking' && self.conversation.getOutputVolume ? self.conversation.getOutputVolume() : (self.conversation.getInputVolume ? self.conversation.getInputVolume() : 0);
			} catch (e) { v = 0; }
			bus.emit('agent:amplitude', { value: Math.min(1, v * 1.4) });
			self.ampRaf = requestAnimationFrame(tick);
		};
		this.ampRaf = requestAnimationFrame(tick);
	};
	VoiceAgent.prototype.stopAmplitude = function () {
		if (this.ampRaf) { cancelAnimationFrame(this.ampRaf); this.ampRaf = null; }
		bus.emit('agent:amplitude', { value: 0 });
	};

	/* ----------------------------------- Backend activity feed (optional)
	 * Tools executed server-side are reported through GET /activity so the
	 * interface can show them even when the agent does not call a client tool.
	 */
	VoiceAgent.prototype.startActivityPolling = function () {
		var self = this;
		if (!config.backendConfigured || this.poller) { return; }
		this.lastActivityAt = new Date().toISOString();
		var poll = function () {
			if (!self.active) { return; }
			var session = store.get('session');
			api.activity({ since: self.lastActivityAt, sessionId: session ? (session.remoteId || session.id) : undefined }).then(function (res) {
				var events = res && Array.isArray(res.events) ? res.events : (Array.isArray(res) ? res : []);
				if (events.length) { self.lastActivityAt = res.now || new Date().toISOString(); MrAbb.events.handleMany(events); }
			}).catch(function () { /* transient */ });
		};
		this.poller = setInterval(poll, 2500);
	};
	VoiceAgent.prototype.stopActivityPolling = function () { if (this.poller) { clearInterval(this.poller); this.poller = null; } };

	MrAbb.VoiceAgent = VoiceAgent;
})(window);
