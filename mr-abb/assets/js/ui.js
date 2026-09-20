/**
 * Mr. Abb — UI controller. Owns the DOM; reacts to bus events; never
 * decides business logic. Every method is safe to call when an element
 * is absent (secondary pages share the shell).
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb;
	var bus = MrAbb.bus, store = MrAbb.store, util = MrAbb.util, el = util.el;
	var t = function (k, v) { return MrAbb.i18n.t(k, v); };

	var dom = {};
	var hintTimer = null, hintIndex = 0;
	var modalState = { open: false, restoreFocus: null, onClose: null };

	function q(sel, root) { return (root || document).querySelector(sel); }

	function cacheDom() {
		dom.app = q('#mrabb-app');
		dom.orb = q('#mrabb-orb');
		dom.orbLabel = q('[data-orb-label]');
		dom.prompt = q('[data-prompt]');
		dom.hint = q('[data-hint]');
		dom.stage = q('.mrabb-stage');
		dom.session = q('[data-session]');
		dom.transcript = q('[data-transcript]');
		dom.tools = q('[data-tools]');
		dom.approvals = q('[data-approvals]');
		dom.results = q('[data-results]');
		dom.composer = q('[data-composer]');
		dom.composerInput = q('[data-composer-input]');
		dom.status = q('[data-connection-status]');
		dom.statusLabel = q('[data-connection-label]');
		dom.scrim = q('[data-scrim]');
		dom.modal = q('#mrabb-modal');
		dom.modalTitle = q('#mrabb-modal-title');
		dom.modalBody = q('[data-modal-body]');
		dom.modalFoot = q('[data-modal-foot]');
		dom.drawer = q('#mrabb-drawer');
		dom.drawerTitle = q('[data-drawer-title]');
		dom.drawerBody = q('[data-drawer-body]');
		dom.toasts = q('[data-toasts]');
		dom.welcome = q('#mrabb-welcome');
		dom.context = q('#mrabb-context');
		dom.contextToggle = q('[data-action="toggle-context"]');
		dom.sidebarToggle = q('[data-action="toggle-sidebar"]');
	}

	/* ---------------------------------------------------------------- Orb */
	var STATE_TONES = { approval_required: 'warning', error: 'danger', listening: 'primary', speaking: 'primary' };
	function renderAgentState(state) {
		if (!dom.orb) { return; }
		dom.orb.dataset.state = state;
		var active = state !== 'idle' && state !== 'error';
		dom.orb.setAttribute('aria-pressed', active ? 'true' : 'false');
		dom.orb.setAttribute('aria-label', active ? t('state_active') : t('state_idle'));
		if (dom.orbLabel) {
			dom.orbLabel.textContent = t('state_' + state);
			if (STATE_TONES[state]) { dom.orbLabel.dataset.tone = STATE_TONES[state]; } else { delete dom.orbLabel.dataset.tone; }
		}
		if (dom.prompt) {
			var key = 'prompt_' + (state === 'approval_required' ? 'approval' : state);
			var text = t(key);
			if (text && text !== key) { swapText(dom.prompt, text); }
		}
		if (state === 'idle') { startHints(); } else { stopHints(); }
	}
	function setAmplitude(value) {
		if (!dom.orb) { return; }
		dom.orb.style.setProperty('--amp', Math.max(0, Math.min(1, value || 0)).toFixed(3));
	}
	function swapText(node, text) {
		if (node.textContent === text) { return; }
		node.classList.add('is-swapping');
		setTimeout(function () { node.textContent = text; node.classList.remove('is-swapping'); }, util.prefersReducedMotion() ? 0 : 160);
	}
	function startHints() {
		if (!dom.hint || hintTimer) { return; }
		var examples = t('hint_examples');
		if (!Array.isArray(examples) || !examples.length) { return; }
		var show = function () {
			dom.hint.classList.add('is-fading');
			setTimeout(function () {
				dom.hint.textContent = examples[hintIndex % examples.length];
				hintIndex += 1;
				dom.hint.classList.remove('is-fading');
			}, util.prefersReducedMotion() ? 0 : 400);
		};
		show();
		hintTimer = setInterval(show, 5200);
	}
	function stopHints() {
		if (hintTimer) { clearInterval(hintTimer); hintTimer = null; }
		if (dom.hint) { dom.hint.classList.add('is-fading'); }
	}

	/* ------------------------------------------------------- Connection */
	function renderConnection(status) {
		if (!dom.status) { return; }
		dom.status.dataset.connectionStatus = status;
		var key = status === 'connected' ? 'conn_connected' : status === 'connecting' ? 'conn_connecting' : status === 'error' ? 'conn_error' : (MrAbb.config.mockMode ? 'conn_demo' : 'conn_ready');
		if (dom.statusLabel) { dom.statusLabel.textContent = t(key); }
	}

	/* ------------------------------------------------------- Transcript */
	function revealSession() {
		if (dom.session && dom.session.hidden) {
			dom.session.hidden = false;
			dom.session.classList.add('is-revealed');
			if (dom.stage) { dom.stage.classList.add('is-session'); }
		}
	}
	function messageNode(m) {
		var who = m.role === 'user' ? t('you') : m.role === 'agent' ? MrAbb.config.agentName : t('system');
		var node = el('li', { class: 'mrabb-msg mrabb-msg--' + m.role + (m.final ? '' : ' is-partial'), id: 'msg-' + m.id }, [
			el('span', { class: 'mrabb-msg__who', text: who }),
			el('div', { class: 'mrabb-msg__main' }, [
				el('p', { class: 'mrabb-msg__body', text: m.text }),
				m.showTime ? el('p', { class: 'mrabb-msg__meta', text: util.formatTime(m.timestamp, MrAbb.i18n.language) }) : null
			])
		]);
		return node;
	}
	function addMessage(m) {
		if (!dom.transcript) { return; }
		revealSession();
		dom.transcript.appendChild(messageNode(m));
		scrollIntoViewSoft(dom.transcript.lastElementChild);
	}
	function updateMessage(m) {
		var node = dom.transcript && q('#msg-' + m.id, dom.transcript);
		if (!node) { return addMessage(m); }
		node.classList.toggle('is-partial', !m.final);
		q('.mrabb-msg__body', node).textContent = m.text;
	}
	function scrollIntoViewSoft(node) {
		if (!node || !node.scrollIntoView) { return; }
		try { node.scrollIntoView({ block: 'nearest', behavior: util.prefersReducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* noop */ }
	}

	/* ------------------------------------------------------------ Tools */
	var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>';
	var CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
	function toolNode(call) {
		var node = el('li', { class: 'mrabb-tool', id: 'tool-' + call.id, dataset: { status: call.status, tool: call.tool } }, [
			el('span', { class: 'mrabb-tool__mark', html: call.status === 'completed' ? CHECK : call.status === 'failed' ? CROSS : '' }),
			el('div', { class: 'mrabb-tool__main' }, [
				el('div', { class: 'mrabb-tool__title', text: call.title }, [el('span', { class: 'mrabb-tool__level mrabb-tool__level--' + call.level, title: call.level })]),
				call.subtitle ? el('div', { class: 'mrabb-tool__sub', text: call.subtitle }) : null
			]),
			el('span', { class: 'mrabb-tool__status', text: statusLabel(call.status) })
		]);
		return node;
	}
	function statusLabel(status) { return t(status === 'completed' ? 'completed' : status); }
	function addTool(call) {
		if (!dom.tools) { return; }
		revealSession();
		dom.tools.appendChild(toolNode(call));
	}
	function updateTool(call) {
		var node = dom.tools && q('#tool-' + call.id, dom.tools);
		if (!node) { return addTool(call); }
		node.dataset.status = call.status;
		q('.mrabb-tool__mark', node).innerHTML = call.status === 'completed' ? CHECK : call.status === 'failed' ? CROSS : '';
		q('.mrabb-tool__status', node).textContent = statusLabel(call.status);
		if (call.subtitle) { var sub = q('.mrabb-tool__sub', node); if (sub) { sub.textContent = call.subtitle; } else { q('.mrabb-tool__main', node).appendChild(el('div', { class: 'mrabb-tool__sub', text: call.subtitle })); } }
	}

	/* -------------------------------------------------------- Approvals */
	function approvalNode(a) {
		var details = el('dl', { class: 'mrabb-approval__details' });
		Object.keys(a.details || {}).forEach(function (k) {
			details.appendChild(el('dt', { text: k }));
			details.appendChild(el('dd', { text: String(a.details[k]) }));
		});
		var node = el('div', { class: 'mrabb-approval', id: 'approval-' + a.id, role: 'group', 'aria-label': t('approval_eyebrow') }, [
			el('div', { class: 'mrabb-approval__eyebrow', text: t('approval_eyebrow') }),
			el('div', { class: 'mrabb-card__eyebrow', text: t('wants_to') }),
			el('div', { class: 'mrabb-approval__title', text: a.title }),
			details.childNodes.length ? details : null,
			el('div', { class: 'mrabb-approval__actions' }, [
				a.preview ? el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--ghost', text: t('review'), onClick: function () { openModal({ title: a.title, body: el('pre', { class: 'mrabb-approval__preview', text: a.preview }), actions: [{ label: t('approve'), variant: 'success', onClick: function () { closeModal(); decide(a, 'approved'); } }, { label: t('cancel'), variant: 'ghost', onClick: closeModal }] }); } }) : null,
				el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--success', text: t('approve'), onClick: function () { decide(a, 'approved'); } }),
				el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--danger', text: t('cancel'), onClick: function () { decide(a, 'rejected'); } })
			])
		]);
		return node;
	}
	function decide(a, decision) {
		bus.emit('approval:decision', { id: a.id, decision: decision, approval: a });
	}
	function addApproval(a) {
		if (!dom.approvals) { return; }
		revealSession();
		var node = approvalNode(a);
		dom.approvals.appendChild(node);
		var first = q('.mrabb-btn--success', node);
		if (first) { first.focus({ preventScroll: true }); }
		scrollIntoViewSoft(node);
	}
	function updateApproval(a) {
		var node = dom.approvals && q('#approval-' + a.id, dom.approvals);
		if (!node) { return; }
		node.classList.add('is-resolved');
		var actions = q('.mrabb-approval__actions', node);
		actions.innerHTML = '';
		actions.appendChild(el('span', { class: 'mrabb-badge ' + (a.status === 'approved' ? 'mrabb-badge--success' : 'mrabb-badge--danger'), text: t(a.status) }));
		setTimeout(function () { if (node.parentNode) { node.remove(); } }, 4000);
	}

	/* ---------------------------------------------------------- Results */
	function addResult(result) {
		if (!dom.results) { return; }
		revealSession();
		var card = MrAbb.cards.render(result);
		if (!card) { return; }
		card.id = 'result-' + result.id;
		dom.results.appendChild(card);
		scrollIntoViewSoft(card);
	}
	function addError(err) {
		if (!dom.results) { return; }
		revealSession();
		var card = el('div', { class: 'mrabb-card mrabb-result mrabb-error mrabb-result--wide' }, [
			el('div', { class: 'mrabb-error__title', text: err.message || t('error_generic') }),
			err.hint ? el('div', { class: 'mrabb-error__text', text: err.hint }) : null,
			el('div', { class: 'mrabb-error__actions' }, [
				err.retry ? el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--primary mrabb-btn--sm', text: t('try_again'), onClick: function () { card.remove(); err.retry(); } }) : null,
				MrAbb.config.debug && err.details ? el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--ghost mrabb-btn--sm', text: t('view_details'), onClick: function () { openModal({ title: t('details'), body: el('pre', { class: 'mrabb-result__pre', text: typeof err.details === 'string' ? err.details : JSON.stringify(err.details, null, 2) }) }); } }) : null
			])
		]);
		dom.results.appendChild(card);
		scrollIntoViewSoft(card);
	}
	function clearSession() {
		[dom.transcript, dom.tools, dom.approvals, dom.results].forEach(function (n) { if (n) { n.innerHTML = ''; } });
		if (dom.session) { dom.session.hidden = true; dom.session.classList.remove('is-revealed'); }
		if (dom.stage) { dom.stage.classList.remove('is-session'); }
	}

	/* ------------------------------------------------- Modal / drawer */
	function openModal(opts) {
		if (!dom.modal) { return; }
		modalState.restoreFocus = document.activeElement;
		modalState.onClose = opts.onClose || null;
		dom.modalTitle.textContent = opts.title || '';
		dom.modalBody.innerHTML = '';
		if (opts.body) { dom.modalBody.appendChild(typeof opts.body === 'string' ? el('p', { text: opts.body }) : opts.body); }
		dom.modalFoot.innerHTML = '';
		(opts.actions || []).forEach(function (a) {
			dom.modalFoot.appendChild(el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--' + (a.variant || 'ghost'), text: a.label, onClick: a.onClick }));
		});
		dom.modal.hidden = false;
		showScrim(true);
		modalState.open = true;
		var focusable = dom.modal.querySelector('input, button.mrabb-btn--primary, button.mrabb-btn--success, button');
		if (focusable) { focusable.focus(); }
	}
	function closeModal() {
		if (!dom.modal || !modalState.open) { return; }
		dom.modal.hidden = true;
		modalState.open = false;
		if (!(dom.drawer && !dom.drawer.hidden)) { showScrim(false); }
		if (modalState.onClose) { modalState.onClose(); }
		if (modalState.restoreFocus && modalState.restoreFocus.focus) { modalState.restoreFocus.focus({ preventScroll: true }); }
	}
	function openDrawer(opts) {
		if (!dom.drawer) { return; }
		dom.drawerTitle.textContent = opts.title || '';
		dom.drawerBody.innerHTML = '';
		if (opts.body) { dom.drawerBody.appendChild(opts.body); }
		dom.drawer.hidden = false;
		showScrim(true);
		var btn = q('[data-action="close-drawer"]', dom.drawer);
		if (btn) { btn.focus(); }
	}
	function closeDrawer() {
		if (!dom.drawer || dom.drawer.hidden) { return; }
		dom.drawer.hidden = true;
		if (!modalState.open) { showScrim(false); }
	}
	function showScrim(show) {
		if (!dom.scrim) { return; }
		dom.scrim.hidden = !show;
		document.body.style.overflow = show ? 'hidden' : '';
	}
	function closeOverlays() {
		closeModal(); closeDrawer();
		if (dom.app) { dom.app.classList.remove('is-sidebar-open', 'is-context-open'); }
		showScrim(false);
	}

	/* ----------------------------------------------------------- Toasts */
	function toast(text, tone, ms) {
		if (!dom.toasts) { return; }
		var node = el('div', { class: 'mrabb-toast mrabb-toast--' + (tone || 'success'), role: 'status' }, [el('span', { class: 'mrabb-toast__dot' }), el('span', { text: text })]);
		dom.toasts.appendChild(node);
		setTimeout(function () { node.classList.add('is-leaving'); setTimeout(function () { node.remove(); }, 300); }, ms || 3200);
	}

	/* -------------------------------------------------------- Welcome */
	function showWelcome(onStart) {
		if (!dom.welcome) { return; }
		dom.welcome.hidden = false;
		var btn = q('[data-action="start-talking"]', dom.welcome);
		if (btn) {
			btn.focus();
			btn.addEventListener('click', function () {
				dom.welcome.classList.add('is-leaving');
				setTimeout(function () { dom.welcome.hidden = true; dom.welcome.classList.remove('is-leaving'); if (onStart) { onStart(); } }, util.prefersReducedMotion() ? 0 : 450);
			}, { once: true });
		}
	}

	/* ---------------------------------------------------- Layout chrome */
	function applyLayout() {
		if (!dom.app) { return; }
		var ui = store.get('ui');
		dom.app.classList.toggle('is-sidebar-collapsed', !!ui.sidebarCollapsed);
		dom.app.classList.toggle('is-context-collapsed', !!ui.contextCollapsed);
		dom.app.classList.toggle('is-context-open', !!ui.contextOpen);
		dom.app.classList.toggle('is-sidebar-open', !!ui.sidebarOpen);
		if (dom.sidebarToggle) { dom.sidebarToggle.setAttribute('aria-expanded', ui.sidebarCollapsed ? 'false' : 'true'); }
		if (dom.contextToggle) { dom.contextToggle.setAttribute('aria-expanded', (window.innerWidth < 1280 ? ui.contextOpen : !ui.contextCollapsed) ? 'true' : 'false'); }
		if (dom.scrim && !modalState.open && (!dom.drawer || dom.drawer.hidden)) {
			var mobileOverlay = (ui.sidebarOpen && window.innerWidth < 768) || (ui.contextOpen && window.innerWidth < 1280);
			dom.scrim.hidden = !mobileOverlay;
		}
	}
	function mockPill() {
		if (!MrAbb.config.mockMode || q('.mrabb-mockpill')) { return; }
		document.body.appendChild(el('div', { class: 'mrabb-mockpill', text: t('mock_pill'), title: t('demo_note') }));
	}

	/* ------------------------------------------------ Context panel */
	function renderContext(ctx) {
		if (!dom.context) { return; }
		var lang = MrAbb.i18n.language;
		var schedule = q('[data-context-body="schedule"]', dom.context);
		var tasks = q('[data-context-body="tasks"]', dom.context);
		var activity = q('[data-context-body="activity"]', dom.context);
		if (schedule) {
			schedule.innerHTML = '';
			var events = (ctx && ctx.schedule) || [];
			schedule.appendChild(events.length ? MrAbb.cards.list(events.map(function (e) { return { time: e.time, title: e.title, sub: e.location || '' }; })) : emptyInline(t('empty_context')));
		}
		if (tasks) {
			tasks.innerHTML = '';
			var items = (ctx && ctx.tasks) || [];
			tasks.appendChild(items.length ? MrAbb.cards.taskList(items.slice(0, 4)) : emptyInline(t('empty_tasks_title')));
		}
		if (activity) {
			activity.innerHTML = '';
			var acts = (ctx && ctx.activity) || [];
			activity.appendChild(acts.length ? MrAbb.cards.timeline(acts.slice(0, 5)) : emptyInline(t('empty_activity')));
		}
		void lang;
	}
	function emptyInline(title, text) {
		return el('div', { class: 'mrabb-empty mrabb-empty--inline' }, [el('div', { class: 'mrabb-empty__mark' }), el('p', { class: 'mrabb-empty__title', text: title }), text ? el('p', { class: 'mrabb-empty__text', text: text }) : null]);
	}
	function emptyState(title, text, action) {
		return el('div', { class: 'mrabb-empty' }, [el('div', { class: 'mrabb-empty__mark' }), el('h2', { class: 'mrabb-empty__title', text: title }), text ? el('p', { class: 'mrabb-empty__text', text: text }) : null, action ? el('button', { type: 'button', class: 'mrabb-btn mrabb-btn--primary', text: action.label, onClick: action.onClick }) : null]);
	}

	/* ------------------------------------------------- Global wiring */
	function bindGlobalActions() {
		document.addEventListener('click', function (e) {
			var target = e.target.closest('[data-action]');
			if (!target) { return; }
			var action = target.dataset.action;
			switch (action) {
				case 'toggle-sidebar':
					if (window.innerWidth < 768) { store.setUi({ sidebarOpen: false }); } else { store.setUi({ sidebarCollapsed: !store.get('ui').sidebarCollapsed }); }
					break;
				case 'open-sidebar': store.setUi({ sidebarOpen: true }); break;
				case 'toggle-context':
					if (window.innerWidth < 1280) { store.setUi({ contextOpen: !store.get('ui').contextOpen }); } else { store.setUi({ contextCollapsed: !store.get('ui').contextCollapsed }); }
					break;
				case 'close-modal': closeModal(); break;
				case 'close-drawer': closeDrawer(); break;
				case 'orb': e.preventDefault(); bus.emit('ui:orb'); break;
				case 'new-session': e.preventDefault(); bus.emit('ui:new-session'); break;
				case 'toggle-language': bus.emit('ui:toggle-language'); break;
				case 'open-profile': bus.emit('ui:profile'); break;
				case 'new-automation': bus.emit('ui:new-automation'); break;
				default: bus.emit('ui:action', { action: action, target: target });
			}
		});
		if (dom.scrim) { dom.scrim.addEventListener('click', function () { store.setUi({ sidebarOpen: false, contextOpen: false }); closeModal(); closeDrawer(); }); }
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { closeOverlays(); store.setUi({ sidebarOpen: false, contextOpen: false }); }
			if (e.key === ' ' && e.target === document.body && dom.orb) { e.preventDefault(); bus.emit('ui:orb'); }
		});
		if (dom.composer) {
			dom.composer.addEventListener('submit', function (e) {
				e.preventDefault();
				var text = (dom.composerInput.value || '').trim();
				if (!text) { return; }
				dom.composerInput.value = '';
				bus.emit('composer:submit', { text: text });
			});
		}
		window.addEventListener('resize', applyLayout, { passive: true });
	}

	function init() {
		cacheDom();
		bindGlobalActions();
		applyLayout();
		mockPill();
		renderAgentState(store.get('agentState'));
		renderConnection(store.get('connection'));

		bus.on('state:change', function (p) { if (p.patch && p.patch.ui) { applyLayout(); } });
		bus.on('agent:state', function (p) { renderAgentState(p.state); });
		bus.on('agent:connection', function (p) { renderConnection(p.status); });
		bus.on('agent:amplitude', function (p) { setAmplitude(p.value); });
		bus.on('message:add', addMessage);
		bus.on('message:update', updateMessage);
		bus.on('tool:add', addTool);
		bus.on('tool:update', updateTool);
		bus.on('approval:add', addApproval);
		bus.on('approval:update', updateApproval);
		bus.on('result:add', addResult);
		bus.on('ui:error', addError);
		bus.on('session:start', clearSession);
		bus.on('context:data', renderContext);
	}

	MrAbb.ui = {
		init: init,
		dom: dom,
		openModal: openModal, closeModal: closeModal,
		openDrawer: openDrawer, closeDrawer: closeDrawer,
		toast: toast, showWelcome: showWelcome, emptyState: emptyState, emptyInline: emptyInline,
		renderAgentState: renderAgentState, setAmplitude: setAmplitude, revealSession: revealSession, clearSession: clearSession
	};
})(window);
