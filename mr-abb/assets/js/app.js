/**
 * Mr. Abb — application controller. Wires the UI, the agent adapter and
 * the store together. Business logic lives in the backend; this file only
 * decides which adapter runs and how user intent reaches it.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb;
	if (!MrAbb || !document.getElementById('mrabb-app')) { return; }
	var bus = MrAbb.bus, store = MrAbb.store, ui = MrAbb.ui, util = MrAbb.util, config = MrAbb.config;
	var t = function (k, v) { return MrAbb.i18n.t(k, v); };

	var agent = null;

	function createAgent() {
		if (config.mockMode) { return new MrAbb.MockAgent(); }
		return new MrAbb.VoiceAgent();
	}

	/** Start or stop the voice session from the orb. */
	function toggleVoice() {
		var state = store.get('agentState');
		if (state === 'error') { store.setAgentState('idle'); }
		if (agent.isActive()) {
			if (agent.name === 'mock' && (state === 'idle' || state === 'error')) { agent.listen(); return; }
			agent.stop().then(function () { ui.toast(t('session_ended'), 'info', 1800); });
			return;
		}
		if (!config.voice.enabled && agent.name !== 'mock') {
			ui.toast(t('error_voice_unavailable'), 'info');
			focusComposer();
			return;
		}
		agent.start().catch(function (err) {
			if (err && err.code === 'mock_session') {
				// Backend told us it is in demo mode: switch adapters transparently.
				agent = new MrAbb.MockAgent();
				config.mockMode = true;
				agent.start();
				return;
			}
			ui.toast(err && err.message ? err.message : t('error_generic'), 'danger', 4200);
			util.log('error', 'voice start failed', { code: err && err.code, details: err && err.details });
		});
	}
	function focusComposer() { var i = ui.dom.composerInput; if (i) { i.focus(); } }

	function onComposer(p) {
		agent.sendText(p.text).catch(function (err) { ui.toast(err.message || t('error_generic'), 'danger'); });
		if (agent.name !== 'mock' && !config.mockMode && !agent.isActive()) { MrAbb.pages.loadContext(); }
	}

	function onApprovalDecision(p) {
		agent.respondApproval(p.id, p.decision === 'approved');
	}

	function onAgentError(evt) {
		if (!ui.dom.results) { ui.toast(evt.message || t('error_generic'), 'danger', 4200); return; }
		bus.emit('ui:error', { message: evt.message, hint: evt.hint, details: evt.details, retry: evt.retry || (evt.retryable && agent.name !== 'mock' ? function () { store.setAgentState('idle'); } : null) });
	}

	function newSession() {
		var p = agent.isActive() ? agent.stop() : Promise.resolve();
		p.then(function () {
			store.startSession();
			store.setAgentState('idle');
			ui.toast(t('new_session'), 'info', 1800);
			if (window.history && window.history.replaceState) { window.history.replaceState({}, '', config.pages.home); }
		});
	}

	function toggleLanguage() {
		var next = MrAbb.i18n.language === 'ar' ? 'en' : 'ar';
		util.writeLocal('mrabb_lang', next);
		var go = function () { var url = new URL(window.location.href); url.searchParams.set('lang', next); window.location.href = url.toString(); };
		if (config.user && config.user.loggedIn) { MrAbb.api.savePreferences({ language: next }).then(go, go); } else { go(); }
	}

	function openProfile() {
		var el = util.el;
		ui.openModal({
			title: t('profile'),
			body: el('div', {}, [
				el('div', { class: 'mrabb-service__head' }, [el('span', { class: 'mrabb-avatar-initials', text: MrAbb.cards.initials(config.user.name || config.ownerName) }), el('div', {}, [el('div', { class: 'mrabb-service__name', text: config.user.name || config.ownerName }), el('div', { class: 'mrabb-list__sub', text: config.mockMode ? t('mock_pill') : config.environment })])]),
				el('div', { style: 'margin-top:18px' }, [el('div', { class: 'mrabb-card__eyebrow', text: t('language') }), el('div', { class: 'mrabb-segments', style: 'margin-top:8px' }, [
					el('button', { type: 'button', class: 'mrabb-segments__item', role: 'tab', 'aria-selected': MrAbb.i18n.language === 'en' ? 'true' : 'false', text: t('english'), onClick: function () { if (MrAbb.i18n.language !== 'en') { toggleLanguage(); } } }),
					el('button', { type: 'button', class: 'mrabb-segments__item', role: 'tab', 'aria-selected': MrAbb.i18n.language === 'ar' ? 'true' : 'false', text: t('arabic'), onClick: function () { if (MrAbb.i18n.language !== 'ar') { toggleLanguage(); } } })
				])])
			]),
			actions: [
				config.adminUrl ? { label: t('settings'), variant: 'ghost', onClick: function () { window.location.href = config.adminUrl; } } : null,
				config.user.loggedIn ? { label: t('sign_out'), variant: 'danger', onClick: function () { window.location.href = config.logoutUrl; } } : null
			].filter(Boolean)
		});
	}

	function maybeWelcome() {
		if (config.view !== 'home') { return; }
		if (util.readLocal('mrabb_onboarded') === '1') { return; }
		ui.showWelcome(function () {
			util.writeLocal('mrabb_onboarded', '1');
			toggleVoice();
		});
	}

	function titleSessionFromFirstMessage(m) {
		var s = store.get('session');
		if (m.role === 'user' && s && !s.title) { s.title = m.text.length > 48 ? m.text.slice(0, 45) + '…' : m.text; }
	}

	function init() {
		ui.init();
		MrAbb.pages.init();
		agent = createAgent();
		document.documentElement.classList.add('mrabb-ready');

		bus.on('ui:orb', toggleVoice);
		bus.on('composer:submit', onComposer);
		bus.on('approval:decision', onApprovalDecision);
		bus.on('agent:error', onAgentError);
		bus.on('ui:new-session', newSession);
		bus.on('ui:toggle-language', toggleLanguage);
		bus.on('ui:profile', openProfile);
		bus.on('message:add', titleSessionFromFirstMessage);
		bus.on('voice:disconnected', function () { ui.toast(t('session_ended'), 'info', 1800); });

		if (config.view === 'home') {
			maybeWelcome();
			if (new URLSearchParams(window.location.search).get('new') === '1') { store.startSession(); if (window.history.replaceState) { window.history.replaceState({}, '', config.pages.home); } }
		}
		window.addEventListener('pagehide', function () { if (agent && agent.isActive()) { agent.stop(); } });
		bus.emit('app:ready', { mode: config.mockMode ? 'mock' : 'live' });
	}

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

	MrAbb.app = { getAgent: function () { return agent; }, toggleVoice: toggleVoice, newSession: newSession };
})(window);
