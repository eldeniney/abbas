/**
 * Mr. Abb — core: event bus, central state store, data models, utilities.
 *
 * Everything else in the app talks through `MrAbb.bus` (events) and
 * `MrAbb.store` (state). Nothing here touches the DOM.
 */
(function (window) {
	'use strict';

	var config = window.MrAbbConfig || {};

	/* ---------------------------------------------------------------------
	 * Event bus
	 * ------------------------------------------------------------------ */
	function EventBus() {
		this.listeners = {};
	}
	EventBus.prototype.on = function (event, handler) {
		(this.listeners[event] = this.listeners[event] || []).push(handler);
		var self = this;
		return function () { self.off(event, handler); };
	};
	EventBus.prototype.once = function (event, handler) {
		var off = this.on(event, function (payload) { off(); handler(payload); });
		return off;
	};
	EventBus.prototype.off = function (event, handler) {
		var list = this.listeners[event];
		if (!list) { return; }
		this.listeners[event] = list.filter(function (h) { return h !== handler; });
	};
	EventBus.prototype.emit = function (event, payload) {
		var list = this.listeners[event];
		if (config.debug && event !== 'agent:amplitude') {
			try { console.debug('[MrAbb]', event, payload); } catch (e) { /* noop */ }
		}
		if (!list) { return; }
		list.slice().forEach(function (handler) {
			try { handler(payload); } catch (err) { console.error('[MrAbb] listener error for ' + event, err); }
		});
	};

	/* ---------------------------------------------------------------------
	 * Agent states (single source of truth)
	 * ------------------------------------------------------------------ */
	var AGENT_STATES = ['idle', 'connecting', 'listening', 'thinking', 'executing', 'speaking', 'approval_required', 'error'];
	var TOOL_STATUSES = ['queued', 'running', 'completed', 'failed', 'requires_approval'];
	var PERMISSION_LEVELS = { read: 'read', action: 'action', approval: 'approval' };

	/* ---------------------------------------------------------------------
	 * Store
	 * ------------------------------------------------------------------ */
	function Store(bus) {
		this.bus = bus;
		this.state = {
			agentState: 'idle',
			connection: 'offline',       // offline | connecting | connected | error
			mode: config.mockMode ? 'mock' : 'live',
			language: config.language || 'en',
			session: null,
			activeApproval: null,
			ui: {
				sidebarCollapsed: readLocal('mrabb_sidebar_collapsed') === '1',
				contextCollapsed: readLocal('mrabb_context_collapsed') === '1',
				contextOpen: false,
				sidebarOpen: false
			}
		};
	}
	Store.prototype.get = function (key) { return key ? this.state[key] : this.state; };
	Store.prototype.set = function (patch) {
		var prev = this.state;
		this.state = Object.assign({}, prev, patch);
		this.bus.emit('state:change', { state: this.state, prev: prev, patch: patch });
	};
	Store.prototype.setUi = function (patch) {
		this.set({ ui: Object.assign({}, this.state.ui, patch) });
		if ('sidebarCollapsed' in patch) { writeLocal('mrabb_sidebar_collapsed', patch.sidebarCollapsed ? '1' : '0'); }
		if ('contextCollapsed' in patch) { writeLocal('mrabb_context_collapsed', patch.contextCollapsed ? '1' : '0'); }
	};
	Store.prototype.setAgentState = function (next, meta) {
		if (AGENT_STATES.indexOf(next) === -1) { console.warn('[MrAbb] unknown agent state', next); return; }
		var prev = this.state.agentState;
		if (prev === next) { return; }
		this.set({ agentState: next });
		this.bus.emit('agent:state', { state: next, prev: prev, meta: meta || {} });
	};
	Store.prototype.setConnection = function (status) {
		if (this.state.connection === status) { return; }
		this.set({ connection: status });
		this.bus.emit('agent:connection', { status: status });
	};
	Store.prototype.startSession = function () {
		var session = Models.session();
		this.set({ session: session, activeApproval: null });
		this.bus.emit('session:start', session);
		return session;
	};
	Store.prototype.endSession = function () {
		var s = this.state.session;
		if (s) { s.endedAt = new Date().toISOString(); this.bus.emit('session:end', s); }
	};
	Store.prototype.ensureSession = function () { return this.state.session || this.startSession(); };
	Store.prototype.addMessage = function (message) {
		var s = this.ensureSession();
		var existing = message.id && s.messages.find(function (m) { return m.id === message.id; });
		if (existing) { Object.assign(existing, message); this.bus.emit('message:update', existing); return existing; }
		s.messages.push(message);
		this.bus.emit('message:add', message);
		return message;
	};
	Store.prototype.upsertToolCall = function (call) {
		var s = this.ensureSession();
		var existing = s.toolCalls.find(function (t) { return t.id === call.id; });
		if (existing) { Object.assign(existing, call); this.bus.emit('tool:update', existing); return existing; }
		s.toolCalls.push(call);
		this.bus.emit('tool:add', call);
		return call;
	};
	Store.prototype.addResult = function (result) {
		var s = this.ensureSession();
		s.results.push(result);
		this.bus.emit('result:add', result);
		return result;
	};
	Store.prototype.addApproval = function (approval) {
		var s = this.ensureSession();
		s.approvals.push(approval);
		this.set({ activeApproval: approval });
		this.bus.emit('approval:add', approval);
		return approval;
	};
	Store.prototype.resolveApproval = function (id, decision) {
		var s = this.ensureSession();
		var a = s.approvals.find(function (x) { return x.id === id; });
		if (!a) { return null; }
		a.status = decision;
		a.resolvedAt = new Date().toISOString();
		if (this.state.activeApproval && this.state.activeApproval.id === id) { this.set({ activeApproval: null }); }
		this.bus.emit('approval:update', a);
		return a;
	};

	/* ---------------------------------------------------------------------
	 * Models — plain objects with documented shapes (see docs/events.md)
	 * ------------------------------------------------------------------ */
	var Models = {
		user: function (u) {
			return { id: u.id || 0, name: u.name || '', firstName: u.firstName || '', avatar: u.avatar || '', language: u.language || 'en' };
		},
		session: function (extra) {
			return Object.assign({ id: uid('ses'), title: '', startedAt: new Date().toISOString(), endedAt: null, messages: [], toolCalls: [], results: [], approvals: [], mode: config.mockMode ? 'mock' : 'live' }, extra || {});
		},
		message: function (role, text, extra) {
			return Object.assign({ id: uid('msg'), role: role, text: text || '', final: true, timestamp: new Date().toISOString() }, extra || {});
		},
		toolCall: function (evt) {
			return Object.assign({ id: evt.id || uid('tool'), tool: evt.tool || 'generic', title: evt.title || evt.tool || '', subtitle: evt.subtitle || '', status: evt.status || 'queued', level: evt.level || levelForTool(evt.tool), timestamp: evt.timestamp || new Date().toISOString(), data: evt.data || {}, error: evt.error || null }, {});
		},
		toolResult: function (evt) {
			return { id: evt.id || uid('res'), tool: evt.tool || 'generic', type: evt.type || cardTypeForTool(evt.tool), title: evt.title || '', data: evt.data || {}, timestamp: evt.timestamp || new Date().toISOString(), wide: !!evt.wide };
		},
		approval: function (evt) {
			return { id: evt.id || uid('apr'), tool: evt.tool || '', title: evt.title || '', summary: evt.summary || '', details: evt.details || {}, preview: evt.preview || '', status: 'pending', level: 'approval', timestamp: evt.timestamp || new Date().toISOString(), resolvedAt: null };
		},
		connection: function (c) {
			return { id: c.id, name: c.name, description: c.description || '', status: c.status || 'not_connected', icon: c.icon || '', lastSync: c.lastSync || null, category: c.category || '' };
		},
		task: function (t) {
			return { id: t.id || uid('task'), title: t.title, time: t.time || null, date: t.date || null, source: t.source || 'manual', priority: t.priority || 'medium', status: t.status || 'open' };
		},
		automation: function (a) {
			return { id: a.id || uid('auto'), name: a.name, schedule: a.schedule || '', enabled: a.enabled !== false, lastRun: a.lastRun || null, lastStatus: a.lastStatus || null, description: a.description || '' };
		},
		notification: function (n) {
			return { id: n.id || uid('ntf'), title: n.title, text: n.text || '', tone: n.tone || 'info', timestamp: n.timestamp || new Date().toISOString() };
		}
	};

	/* ---------------------------------------------------------------------
	 * Tool registry helpers
	 * ------------------------------------------------------------------ */
	var TOOL_LEVELS = {
		'calendar.search': 'read', 'calendar.create': 'action', 'calendar.update': 'action',
		'email.search': 'read', 'email.read': 'read', 'email.draft': 'action', 'email.send': 'approval',
		'tasks.list': 'read', 'tasks.create': 'action', 'tasks.complete': 'action',
		'drive.search': 'read', 'drive.read': 'read',
		'crm.searchCustomer': 'read', 'crm.listOpportunities': 'read', 'crm.updateOpportunity': 'approval',
		'whatsapp.send': 'approval', 'odoo.query': 'read', 'powerbi.query': 'read', 'operines.query': 'read',
		'n8n.executeWorkflow': 'action', 'uipath.executeProcess': 'action', 'web.search': 'read'
	};
	function levelForTool(tool) {
		if (!tool) { return 'read'; }
		if (TOOL_LEVELS[tool]) { return TOOL_LEVELS[tool]; }
		if (/\.(send|delete|pay|remove|update)/.test(tool)) { return 'approval'; }
		if (/\.(create|draft|execute|complete|run)/.test(tool)) { return 'action'; }
		return 'read';
	}
	var CARD_TYPES = { calendar: 'calendar', tasks: 'tasks', email: 'email', crm: 'crm', drive: 'documents', whatsapp: 'whatsapp', odoo: 'odoo', powerbi: 'analytics', operines: 'report', web: 'web', n8n: 'automation', uipath: 'automation', contacts: 'contacts', customers: 'customers', notifications: 'notification' };
	function cardTypeForTool(tool) {
		if (!tool) { return 'generic'; }
		var prefix = String(tool).split('.')[0];
		return CARD_TYPES[prefix] || 'generic';
	}

	/* ---------------------------------------------------------------------
	 * Utilities
	 * ------------------------------------------------------------------ */
	var counter = 0;
	function uid(prefix) {
		counter += 1;
		return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + (counter).toString(36) + Math.random().toString(36).slice(2, 6);
	}
	function readLocal(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
	function writeLocal(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ } }
	function escapeHtml(str) {
		return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}
	function el(tag, attrs, children) {
		var node = document.createElement(tag);
		if (attrs) {
			Object.keys(attrs).forEach(function (k) {
				var v = attrs[k];
				if (v == null || v === false) { return; }
				if (k === 'class') { node.className = v; }
				else if (k === 'text') { node.textContent = v; }
				else if (k === 'html') { node.innerHTML = v; }
				else if (k.indexOf('on') === 0 && typeof v === 'function') { node.addEventListener(k.slice(2).toLowerCase(), v); }
				else if (k === 'dataset') { Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; }); }
				else { node.setAttribute(k, v === true ? '' : v); }
			});
		}
		(children || []).forEach(function (child) {
			if (child == null || child === false) { return; }
			node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
		});
		return node;
	}
	function formatTime(iso, lang) {
		var d = iso instanceof Date ? iso : new Date(iso);
		if (isNaN(d.getTime())) { return ''; }
		try { return d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return d.toTimeString().slice(0, 5); }
	}
	function formatDay(iso, lang) {
		var d = new Date(iso);
		if (isNaN(d.getTime())) { return ''; }
		var today = new Date(); today.setHours(0, 0, 0, 0);
		var that = new Date(d); that.setHours(0, 0, 0, 0);
		var diff = Math.round((today - that) / 86400000);
		var t = window.MrAbb && window.MrAbb.i18n ? window.MrAbb.i18n.t : function (k) { return k; };
		if (diff === 0) { return t('today'); }
		if (diff === 1) { return t('yesterday'); }
		if (diff === -1) { return t('tomorrow'); }
		try { return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' }); } catch (e) { return d.toDateString(); }
	}
	function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
	function prefersReducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
	function log(level, message, context) {
		if (config.debug) { try { console[level === 'error' ? 'error' : 'log']('[MrAbb] ' + message, context || ''); } catch (e) { /* noop */ } }
		if (config.debug && window.MrAbb && window.MrAbb.api) {
			window.MrAbb.api.post('/logs', { level: level, message: message, context: context || {} }).catch(function () { /* silent */ });
		}
	}

	var bus = new EventBus();
	var store = new Store(bus);

	window.MrAbb = Object.assign(window.MrAbb || {}, {
		config: config,
		bus: bus,
		store: store,
		Models: Models,
		AGENT_STATES: AGENT_STATES,
		TOOL_STATUSES: TOOL_STATUSES,
		PERMISSION_LEVELS: PERMISSION_LEVELS,
		levelForTool: levelForTool,
		cardTypeForTool: cardTypeForTool,
		util: { uid: uid, el: el, escapeHtml: escapeHtml, formatTime: formatTime, formatDay: formatDay, delay: delay, readLocal: readLocal, writeLocal: writeLocal, prefersReducedMotion: prefersReducedMotion, log: log }
	});
})(window);

/**
 * Event ingestion: one normalised event format for everything that can
 * change the interface, whether it arrives from the mock agent, from
 * ElevenLabs client tools, or from the backend activity feed.
 * See docs/events.md for the schema.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb, store = MrAbb.store, bus = MrAbb.bus, Models = MrAbb.Models;

	function handle(evt) {
		if (!evt || typeof evt !== 'object') { return; }
		switch (evt.type) {
			case 'state':
				store.setAgentState(evt.state, evt);
				break;
			case 'transcript':
				store.addMessage(Models.message(evt.role === 'ai' ? 'agent' : (evt.role || 'agent'), evt.text, { id: evt.id, final: evt.final !== false, timestamp: evt.timestamp }));
				break;
			case 'tool':
				store.upsertToolCall(Models.toolCall(evt));
				if (evt.status === 'requires_approval' && evt.approval) { handle(Object.assign({ type: 'approval' }, evt.approval)); }
				break;
			case 'result':
				store.addResult(Models.toolResult({ id: evt.id, tool: evt.tool, type: evt.cardType || evt.type_hint, title: evt.title, data: evt.data, wide: evt.wide, timestamp: evt.timestamp }));
				break;
			case 'approval':
				store.addApproval(Models.approval(evt));
				store.setAgentState('approval_required', evt);
				break;
			case 'approval_resolved':
				store.resolveApproval(evt.id, evt.status || (evt.approved ? 'approved' : 'rejected'));
				if (store.get('agentState') === 'approval_required') { store.setAgentState('executing'); }
				break;
			case 'error':
				bus.emit('agent:error', evt);
				break;
			case 'session':
				var s = store.ensureSession();
				if (evt.id) { s.remoteId = evt.id; }
				if (evt.title) { s.title = evt.title; }
				break;
			default:
				bus.emit('event:unknown', evt);
		}
	}
	function handleMany(events) { (events || []).forEach(handle); }

	MrAbb.events = { handle: handle, handleMany: handleMany };
})(window);
