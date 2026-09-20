/**
 * Mr. Abb — secondary pages (History, Tasks, Connections, Automations)
 * and the home context panel. Data comes from the backend through the
 * REST proxy, or from mock data in demo mode. Both paths share renderers.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb, bus = MrAbb.bus, api = MrAbb.api, util = MrAbb.util, el = util.el, ui = MrAbb.ui, cards = MrAbb.cards, config = MrAbb.config;
	var t = function (k, v) { return MrAbb.i18n.t(k, v); };
	var CHEVRON = '<svg class="mrabb-icon mrabb-icon--chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

	/* ------------------------------------------------------- Data access */
	function mockData(kind) {
		var d = MrAbb.mock.data;
		var map = {
			history: function () { return { sessions: d.history }; },
			tasks: function () { return { tasks: d.tasks }; },
			connections: function () { return { connections: d.connections }; },
			automations: function () { return { automations: d.automations }; },
			context: function () { return { schedule: d.schedule, tasks: d.tasks.filter(function (x) { return x.status !== 'done'; }), activity: d.activity }; }
		};
		return util.delay(util.prefersReducedMotion() ? 0 : 350).then(function () { return MrAbb.mock.localize(map[kind]()); });
	}
	function load(kind) {
		if (config.mockMode) { return mockData(kind); }
		var calls = { history: api.history, tasks: api.tasks, connections: api.connections, automations: api.automations, context: api.context };
		return calls[kind]().then(function (res) { return res && res.data ? res.data : res; });
	}
	function sessionDetail(id) {
		if (config.mockMode) {
			return util.delay(250).then(function () {
				var s = MrAbb.mock.data.history.find(function (h) { return h.id === id; });
				return MrAbb.mock.localize(Object.assign({}, s, MrAbb.mock.data.sessionDetail[id] || { messages: [], tools: [], approvals: [] }));
			});
		}
		return api.session(id).then(function (res) { return res && res.data ? res.data : res; });
	}
	function errorBlock(container, err, retry) {
		container.innerHTML = '';
		container.appendChild(el('div', { class: 'mrabb-card mrabb-error' }, [
			el('div', { class: 'mrabb-error__title', text: err && err.message ? err.message : t('error_generic') }),
			el('div', { class: 'mrabb-error__actions' }, [el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--primary mrabb-btn--sm', text: t('try_again'), onClick: retry }), config.debug && err && err.details ? el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--ghost mrabb-btn--sm', text: t('view_details'), onClick: function () { ui.openModal({ title: t('details'), body: el('pre', { class: 'mrabb-result__pre', text: JSON.stringify(err.details, null, 2) }) }); } }) : null])
		]));
	}
	function groupByDay(items, key) {
		var groups = [];
		items.forEach(function (item) {
			var label = util.formatDay(item[key], MrAbb.i18n.language);
			var g = groups.find(function (x) { return x.label === label; });
			if (!g) { g = { label: label, items: [] }; groups.push(g); }
			g.items.push(item);
		});
		return groups;
	}

	/* ------------------------------------------------------------ History */
	function renderHistory(container, data) {
		var sessions = (data && data.sessions) || [];
		container.innerHTML = '';
		if (!sessions.length) { container.appendChild(ui.emptyState(t('empty_history_title'), t('empty_history_text'), { label: t('new_session').replace('.', ''), onClick: function () { window.location.href = config.pages.home; } })); return; }
		sessions.sort(function (a, b) { return new Date(b.startedAt) - new Date(a.startedAt); });
		groupByDay(sessions, 'startedAt').forEach(function (g) {
			container.appendChild(el('section', { class: 'mrabb-group' }, [
				el('h2', { class: 'mrabb-group__title', text: g.label }),
				el('div', { class: 'mrabb-rows' }, g.items.map(function (s) {
					return el('button', { type: 'button', class: 'mrabb-row mrabb-row--button', onClick: function () { openSession(s); } }, [
						el('span', { class: 'mrabb-row__time', text: util.formatTime(s.startedAt, MrAbb.i18n.language) }),
						el('span', { class: 'mrabb-row__main' }, [el('span', { class: 'mrabb-row__title', text: s.title || t('session_conversation') }), el('span', { class: 'mrabb-row__sub', text: t('actions_count', { n: s.actions || 0 }) + (s.approvals ? ' · ' + s.approvals + ' ' + t('session_approvals').toLowerCase() : '') })]),
						el('span', { class: 'mrabb-row__trail', html: (s.durationMin ? '<span>' + util.escapeHtml(t('minutes_short', { n: s.durationMin })) + '</span>' : '') + CHEVRON })
					]);
				}))
			]));
		});
	}
	function openSession(s) {
		var body = el('div', {}, [el('div', { class: 'mrabb-skeleton mrabb-skeleton--list' })]);
		ui.openDrawer({ title: s.title || t('session_conversation'), body: body });
		sessionDetail(s.id).then(function (d) {
			body.innerHTML = '';
			body.appendChild(el('section', {}, [el('h3', { class: 'mrabb-drawer__section-title', text: t('session_conversation') }), el('ol', { class: 'mrabb-transcript' }, (d.messages || []).map(function (m) { return el('li', { class: 'mrabb-msg mrabb-msg--' + (m.role === 'ai' ? 'agent' : m.role) }, [el('span', { class: 'mrabb-msg__who', text: m.role === 'user' ? t('you') : config.agentName }), el('div', {}, [el('p', { class: 'mrabb-msg__body', text: m.text }), m.time ? el('p', { class: 'mrabb-msg__meta', text: m.time }) : null])]); }))]));
			body.appendChild(el('section', {}, [el('h3', { class: 'mrabb-drawer__section-title', text: t('session_tools') }), el('ol', { class: 'mrabb-tools' }, (d.tools || []).map(function (c) { return el('li', { class: 'mrabb-tool', dataset: { status: c.status } }, [el('span', { class: 'mrabb-tool__mark', html: c.status === 'completed' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>' : '' }), el('div', { class: 'mrabb-tool__main' }, [el('div', { class: 'mrabb-tool__title', text: c.title }), el('div', { class: 'mrabb-tool__sub', text: c.tool })]), el('span', { class: 'mrabb-tool__status', text: t(c.status) })]); }))]));
			if (d.approvals && d.approvals.length) { body.appendChild(el('section', {}, [el('h3', { class: 'mrabb-drawer__section-title', text: t('session_approvals') }), cards.list(d.approvals.map(function (a) { return { lead: el('span'), title: a.title, trail: cards.badge(t(a.status), a.status === 'approved' ? 'success' : 'danger') }; }))])); }
			body.appendChild(el('section', {}, [el('h3', { class: 'mrabb-drawer__section-title', text: t('duration') }), el('p', { class: 'mrabb-result__text', text: (d.durationMin ? t('minutes_short', { n: d.durationMin }) : '—') + ' · ' + util.formatDay(d.startedAt, MrAbb.i18n.language) + ' ' + util.formatTime(d.startedAt, MrAbb.i18n.language) })]));
		}).catch(function (err) { errorBlock(body, err, function () { openSession(s); }); });
	}

	/* -------------------------------------------------------------- Tasks */
	function renderTasks(container, data) {
		var tasks = (data && data.tasks) || [];
		container.innerHTML = '';
		var today = new Date(); today.setHours(0, 0, 0, 0);
		var sections = [
			{ key: 'today', title: t('today'), items: tasks.filter(function (x) { var d = new Date(x.date); d.setHours(0, 0, 0, 0); return x.status !== 'done' && d <= today; }) },
			{ key: 'upcoming', title: t('upcoming'), items: tasks.filter(function (x) { var d = new Date(x.date); d.setHours(0, 0, 0, 0); return x.status !== 'done' && d > today; }) },
			{ key: 'completed', title: t('completed'), items: tasks.filter(function (x) { return x.status === 'done'; }) }
		];
		if (!tasks.length) { container.appendChild(ui.emptyState(t('empty_tasks_title'), t('empty_tasks_text'))); return; }
		sections.forEach(function (s) {
			container.appendChild(el('section', { class: 'mrabb-group' }, [
				el('h2', { class: 'mrabb-group__title', text: s.title }),
				s.items.length ? el('div', { class: 'mrabb-rows' }, s.items.map(taskRow)) : ui.emptyInline(s.key === 'today' ? t('empty_tasks_title') : '—', s.key === 'today' ? t('empty_tasks_text') : '')
			]));
		});
	}
	function taskRow(task) {
		var row = el('div', { class: 'mrabb-row mrabb-row--task' }, [
			cards.checkMark(task.status === 'done', function (done) { row.classList.toggle('is-done', done); bus.emit('task:toggle', { task: task, done: done }); }),
			el('div', { class: 'mrabb-row__main' }, [el('div', { class: 'mrabb-row__title', text: task.title }), el('div', { class: 'mrabb-row__sub' }, [el('span', { text: [task.time, util.formatDay(task.date, MrAbb.i18n.language)].filter(Boolean).join(' · ') }), el('span', { class: 'mrabb-badge mrabb-badge--plain', text: cards.sourceLabel(task.source) })])]),
			el('div', { class: 'mrabb-row__trail' }, [el('span', { class: 'mrabb-priority mrabb-priority--' + (task.priority || 'medium'), title: t('priority_' + (task.priority || 'medium')) }), el('span', { text: t('priority_' + (task.priority || 'medium')) })])
		]);
		return row;
	}

	/* -------------------------------------------------------- Connections */
	function renderConnections(container, data) {
		var items = (data && data.connections) || [];
		container.innerHTML = '';
		if (!items.length) { container.appendChild(ui.emptyState(t('empty_connections_title'), t('empty_connections_text'))); return; }
		container.appendChild(el('div', { class: 'mrabb-grid' }, items.map(function (c) {
			var connected = c.status === 'connected';
			return el('article', { class: 'mrabb-card mrabb-service' }, [
				el('div', { class: 'mrabb-service__head' }, [el('span', { class: 'mrabb-service__icon', text: c.icon || cards.initials(c.name) }), el('div', {}, [el('div', { class: 'mrabb-service__name', text: c.name }), cards.badge(connected ? t('connected') : c.status === 'attention' ? t('needs_attention') : t('not_connected'), connected ? 'success' : c.status === 'attention' ? 'warning' : null)])]),
				el('p', { class: 'mrabb-service__desc', text: c.description || '' }),
				el('div', { class: 'mrabb-service__foot' }, [
					el('span', { class: 'mrabb-list__sub', text: c.lastSync ? util.formatDay(c.lastSync, MrAbb.i18n.language) + ' ' + util.formatTime(c.lastSync, MrAbb.i18n.language) : '' }),
					el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--sm ' + (connected ? 'mrabb-btn--ghost' : 'mrabb-btn--primary'), text: connected ? t('manage') : t('connect'), onClick: function () { connectionAction(c); } })
				])
			]);
		})));
	}
	function connectionAction(c) {
		var connected = c.status === 'connected';
		ui.openModal({
			title: c.name,
			body: el('div', {}, [el('p', { text: c.description || '' }), el('p', { text: config.mockMode ? t('coming_soon') : t('connect_note', { name: c.name }) })]),
			actions: connected ? [{ label: t('disconnect'), variant: 'danger', onClick: function () { ui.closeModal(); if (!config.mockMode) { api.post('/connections/' + c.id + '/disconnect').then(function () { ui.toast(c.name + ' — ' + t('not_connected'), 'info'); initPage(); }).catch(function (e) { ui.toast(e.message, 'danger'); }); } else { ui.toast(t('demo_note'), 'info'); } } }, { label: t('close'), variant: 'ghost', onClick: ui.closeModal }]
				: [{ label: t('connect'), variant: 'primary', onClick: function () { ui.closeModal(); if (!config.mockMode) { api.post('/connections/' + c.id + '/connect').then(function (res) { if (res && res.url) { window.location.href = res.url; } else { ui.toast(c.name + ' — ' + t('connected')); initPage(); } }).catch(function (e) { ui.toast(e.message, 'danger'); }); } else { ui.toast(t('demo_note'), 'info'); } } }, { label: t('cancel'), variant: 'ghost', onClick: ui.closeModal }]
		});
	}

	/* -------------------------------------------------------- Automations */
	function renderAutomations(container, data) {
		var items = (data && data.automations) || [];
		container.innerHTML = '';
		if (!items.length) { container.appendChild(ui.emptyState(t('empty_automations_title'), t('empty_automations_text'), { label: t('new_automation'), onClick: newAutomation })); return; }
		container.appendChild(el('div', { class: 'mrabb-rows' }, items.map(function (a) {
			var sw = el('button', { type: 'button', class: 'mrabb-switch', role: 'switch', 'aria-checked': a.enabled ? 'true' : 'false', 'aria-label': a.name, onClick: function () {
				var next = sw.getAttribute('aria-checked') !== 'true';
				sw.setAttribute('aria-checked', next ? 'true' : 'false');
				if (config.mockMode) { ui.toast(a.name + ' — ' + (next ? t('enabled') : t('paused')), next ? 'success' : 'info'); } else { api.toggleAutomation(a.id, next).catch(function (e) { sw.setAttribute('aria-checked', next ? 'false' : 'true'); ui.toast(e.message, 'danger'); }); }
			} });
			return el('div', { class: 'mrabb-row' }, [
				sw,
				el('div', { class: 'mrabb-row__main' }, [el('div', { class: 'mrabb-row__title', text: a.name }), el('div', { class: 'mrabb-row__sub' }, [el('span', { text: a.schedule || '' }), a.lastRun ? el('span', { text: '· ' + t('last_run') + ' ' + util.formatDay(a.lastRun, MrAbb.i18n.language) + ' ' + util.formatTime(a.lastRun, MrAbb.i18n.language) }) : null, a.lastStatus ? cards.badge(t(a.lastStatus === 'completed' ? 'completed' : a.lastStatus), a.lastStatus === 'completed' ? 'success' : a.lastStatus === 'failed' ? 'danger' : null) : null])]),
				el('div', { class: 'mrabb-row__trail' }, [el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--sm mrabb-btn--ghost', text: t('run_now'), onClick: function () { if (config.mockMode) { ui.toast(a.name + ' — ' + t('running'), 'info'); } else { api.runAutomation(a.id).then(function () { ui.toast(a.name + ' — ' + t('running'), 'info'); }).catch(function (e) { ui.toast(e.message, 'danger'); }); } } })])
			]);
		})));
	}
	function newAutomation() {
		var name = el('input', { class: 'mrabb-input', type: 'text', placeholder: t('automation_name'), required: true });
		var schedule = el('input', { class: 'mrabb-input', type: 'text', placeholder: t('automation_schedule') });
		ui.openModal({
			title: t('new_automation'),
			body: el('form', { class: 'mrabb-form', onSubmit: function (e) { e.preventDefault(); } }, [el('label', { class: 'mrabb-field' }, [el('span', { class: 'mrabb-field__label', text: t('automation_name') }), name]), el('label', { class: 'mrabb-field' }, [el('span', { class: 'mrabb-field__label', text: t('automation_schedule') }), schedule])]),
			actions: [{ label: t('done'), variant: 'primary', onClick: function () { if (!name.value.trim()) { name.focus(); return; } ui.closeModal(); if (config.mockMode) { ui.toast(t('automation_saved')); } else { api.post('/automations', { name: name.value.trim(), schedule: schedule.value.trim() }).then(function () { ui.toast(t('done')); initPage(); }).catch(function (e) { ui.toast(e.message, 'danger'); }); } } }, { label: t('cancel'), variant: 'ghost', onClick: ui.closeModal }]
		});
		name.focus();
	}

	/* ------------------------------------------------------------- Home */
	function loadContext() {
		if (!document.getElementById('mrabb-context')) { return; }
		load('context').then(function (ctx) { bus.emit('context:data', ctx); }).catch(function () { bus.emit('context:data', { schedule: [], tasks: [], activity: [] }); });
	}

	var renderers = { history: renderHistory, tasks: renderTasks, connections: renderConnections, automations: renderAutomations };
	function initPage() {
		var main = document.querySelector('[data-page]');
		if (!main) { return; }
		var kind = main.dataset.page;
		var body = main.querySelector('[data-page-body]');
		if (!renderers[kind] || !body) { return; }
		load(kind).then(function (data) { renderers[kind](body, data); }).catch(function (err) { errorBlock(body, err, initPage); });
	}

	function init() {
		initPage();
		loadContext();
		bus.on('ui:new-automation', newAutomation);
		bus.on('task:toggle', function (p) {
			if (config.mockMode) { ui.toast(p.done ? t('done') + ' — ' + p.task.title : p.task.title, p.done ? 'success' : 'info'); return; }
			if (p.done) { api.completeTask(p.task.id).catch(function (e) { ui.toast(e.message, 'danger'); }); }
		});
	}

	MrAbb.pages = { init: init, reload: initPage, loadContext: loadContext, load: load };
})(window);
