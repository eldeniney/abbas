/**
 * Mr. Abb — mock agent. Implements the same adapter interface as the
 * ElevenLabs agent (see voice-agent.js) but plays scripted scenarios.
 * Clearly separated from any real integration.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb, bus = MrAbb.bus, store = MrAbb.store, util = MrAbb.util, mock = MrAbb.mock;

	function MockAgent() {
		this.name = 'mock';
		this.active = false;
		this.running = null;      // current run token
		this.pendingApproval = null;
		this.utteranceIndex = 0;
		this.ampTimer = null;
		this.listenTimer = null;
	}

	MockAgent.prototype.isActive = function () { return this.active; };

	MockAgent.prototype.start = function () {
		var self = this;
		this.active = true;
		store.setConnection('connecting');
		store.setAgentState('connecting');
		return util.delay(600).then(function () {
			store.setConnection('connected');
			self.listen();
		});
	};

	/** Simulate the microphone: listen, then "hear" a demo utterance. */
	MockAgent.prototype.listen = function () {
		var self = this;
		this.cancelRun();
		store.setAgentState('listening');
		this.startAmplitude(0.35);
		this.listenTimer = setTimeout(function () {
			var u = mock.localize(mock.demoUtterances[self.utteranceIndex % mock.demoUtterances.length]);
			self.utteranceIndex += 1;
			self.stopAmplitude();
			self.handleUserText(u);
		}, 1900);
	};

	MockAgent.prototype.stop = function () {
		this.active = false;
		this.cancelRun();
		this.stopAmplitude();
		if (this.listenTimer) { clearTimeout(this.listenTimer); this.listenTimer = null; }
		store.setAgentState('idle');
		store.setConnection('offline');
		return Promise.resolve();
	};

	MockAgent.prototype.sendText = function (text) {
		if (this.listenTimer) { clearTimeout(this.listenTimer); this.listenTimer = null; }
		this.stopAmplitude();
		if (!this.active) { this.active = true; store.setConnection('connected'); }
		return this.handleUserText(text);
	};

	MockAgent.prototype.handleUserText = function (text) {
		this.cancelRun();
		MrAbb.events.handle({ type: 'transcript', role: 'user', text: text });
		var intent = mock.detectIntent(text);
		var steps = mock.scenarios[intent] || mock.scenarios.fallback;
		return this.run(steps);
	};

	MockAgent.prototype.respondApproval = function (id, approved) {
		var pending = this.pendingApproval;
		MrAbb.events.handle({ type: 'approval_resolved', id: id, approved: approved });
		if (!pending || pending.id !== id) { return Promise.resolve(); }
		this.pendingApproval = null;
		return this.run(approved ? pending.onApprove : pending.onReject);
	};

	MockAgent.prototype.setLanguage = function () { /* strings are resolved at play time */ };

	/* ------------------------------------------------------------ Runner */
	MockAgent.prototype.cancelRun = function () { this.running = null; };

	MockAgent.prototype.run = function (steps) {
		var self = this;
		var token = {};
		this.running = token;
		var i = 0;
		function next() {
			if (self.running !== token) { return Promise.resolve(); }
			if (i >= steps.length) { return Promise.resolve(); }
			var step = mock.localize(steps[i]); i += 1;
			return self.play(step, token).then(next);
		}
		return next();
	};

	MockAgent.prototype.play = function (step, token) {
		var self = this;
		switch (step.type) {
			case 'wait':
				return util.delay(util.prefersReducedMotion() ? Math.min(step.ms, 300) : step.ms);
			case 'state':
				MrAbb.events.handle({ type: 'state', state: step.state });
				return Promise.resolve();
			case 'agent': {
				var id = util.uid('msg');
				store.setAgentState('speaking');
				// Progressive reveal of the spoken text, like a live transcript.
				var words = String(step.text).split(' ');
				var total = Math.max(600, step.speakMs || words.length * 260);
				var perWord = total / words.length;
				self.startAmplitude(0.6);
				MrAbb.events.handle({ type: 'transcript', role: 'agent', text: '', final: false, id: id });
				var shown = 0;
				return new Promise(function (resolve) {
					var tick = function () {
						if (self.running !== token) { self.stopAmplitude(); return resolve(); }
						shown += 1;
						MrAbb.events.handle({ type: 'transcript', role: 'agent', text: words.slice(0, shown).join(' '), final: shown >= words.length, id: id });
						if (shown >= words.length) { self.stopAmplitude(); resolve(); } else { setTimeout(tick, util.prefersReducedMotion() ? 20 : perWord); }
					};
					setTimeout(tick, 120);
				});
			}
			case 'tool':
				MrAbb.events.handle({ type: 'tool', id: 'mock-' + step.id, tool: step.tool, title: step.title, subtitle: step.subtitle, status: step.status, timestamp: new Date().toISOString() });
				return Promise.resolve();
			case 'result':
				MrAbb.events.handle({ type: 'result', tool: step.tool, cardType: step.cardType, title: step.title, data: step.data, wide: step.wide });
				return Promise.resolve();
			case 'approval':
				this.pendingApproval = { id: step.id, onApprove: step.onApprove || [], onReject: step.onReject || [] };
				MrAbb.events.handle({ type: 'approval', id: step.id, tool: step.tool, title: step.title, summary: step.summary, details: step.details, preview: step.preview });
				return Promise.resolve(); // The run ends here; respondApproval continues it.
			case 'error':
				MrAbb.events.handle({ type: 'error', message: step.message, hint: step.hint, details: step.details, retryable: step.retryable, retry: step.retryable ? function () { self.run(mock.scenarios.day_brief); } : null });
				return Promise.resolve();
			default:
				return Promise.resolve();
		}
	};

	/* Simulated audio level for the orb. */
	MockAgent.prototype.startAmplitude = function (base) {
		var self = this;
		this.stopAmplitude();
		if (util.prefersReducedMotion()) { return; }
		var phase = 0;
		this.ampTimer = setInterval(function () {
			phase += 0.35;
			var v = base * (0.55 + 0.45 * Math.abs(Math.sin(phase)) * (0.6 + Math.random() * 0.4));
			bus.emit('agent:amplitude', { value: v });
		}, 90);
	};
	MockAgent.prototype.stopAmplitude = function () {
		if (this.ampTimer) { clearInterval(this.ampTimer); this.ampTimer = null; }
		bus.emit('agent:amplitude', { value: 0 });
	};

	MrAbb.MockAgent = MockAgent;
})(window);
