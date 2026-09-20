/**
 * Mr. Abb — result card registry.
 *
 * `MrAbb.cards.register(type, renderer)` adds a renderer; unknown tool
 * types fall back to a clean generic card. Renderers receive the result
 * object ({ tool, type, title, data }) and return a DOM element.
 */
(function (window) {
	'use strict';
	var MrAbb = window.MrAbb;
	var el = MrAbb.util.el;
	var t = function (k, v) { return MrAbb.i18n.t(k, v); };
	var registry = {};

	function card(opts) {
		var node = el('article', { class: 'mrabb-card mrabb-result' + (opts.wide ? ' mrabb-result--wide' : '') + (opts.className ? ' ' + opts.className : '') }, [
			(opts.title || opts.eyebrow || opts.badge) ? el('header', { class: 'mrabb-card__head' }, [
				el('div', {}, [opts.eyebrow ? el('div', { class: 'mrabb-card__eyebrow', text: opts.eyebrow }) : null, opts.title ? el('h3', { class: 'mrabb-card__title', text: opts.title }) : null]),
				opts.badge ? badge(opts.badge.text, opts.badge.tone) : null
			]) : null,
			opts.body,
			opts.foot ? el('footer', { class: 'mrabb-card__foot' }, Array.isArray(opts.foot) ? opts.foot : [opts.foot]) : null
		]);
		return node;
	}
	function badge(text, tone) { return el('span', { class: 'mrabb-badge' + (tone ? ' mrabb-badge--' + tone : ''), text: text }); }
	function list(items) {
		return el('div', { class: 'mrabb-list' }, items.map(function (i) {
			return el('div', { class: 'mrabb-list__item' + (i.done ? ' is-done' : '') }, [
				i.lead || el('span', { class: 'mrabb-list__time', text: i.time || '' }),
				el('div', { class: 'mrabb-list__main' }, [el('div', { class: 'mrabb-list__title', text: i.title }), i.sub ? el('div', { class: 'mrabb-list__sub', text: i.sub }) : null]),
				i.trail != null ? (typeof i.trail === 'string' ? el('span', { class: 'mrabb-list__trail', text: i.trail }) : i.trail) : el('span')
			]);
		}));
	}
	function checkMark(done, onToggle) {
		var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>';
		var b = el('button', { type: 'button', class: 'mrabb-check-mark' + (done ? ' is-checked' : ''), html: CHECK, 'aria-pressed': done ? 'true' : 'false', 'aria-label': t('done') });
		if (onToggle) { b.addEventListener('click', function () { b.classList.toggle('is-checked'); var now = b.classList.contains('is-checked'); b.setAttribute('aria-pressed', now ? 'true' : 'false'); onToggle(now); }); }
		return b;
	}
	function taskList(tasks, onToggle) {
		return list(tasks.map(function (task) {
			return { lead: checkMark(task.status === 'done', onToggle ? function (done) { onToggle(task, done); } : null), title: task.title, sub: [task.time, sourceLabel(task.source)].filter(Boolean).join(' · '), done: task.status === 'done', trail: task.priority === 'high' ? el('span', { class: 'mrabb-priority mrabb-priority--high', title: t('priority_high') }) : el('span') };
		}));
	}
	function sourceLabel(source) { return source ? t('source_' + source) : ''; }
	function metrics(items) {
		return el('div', { class: 'mrabb-metrics' }, items.map(function (m) {
			return el('div', { class: 'mrabb-metric' + (m.tone ? ' mrabb-metric--' + m.tone : '') }, [el('div', { class: 'mrabb-metric__value', text: m.value }), el('div', { class: 'mrabb-metric__label', text: m.label })]);
		}));
	}
	function kv(obj) {
		var node = el('dl', { class: 'mrabb-kv' });
		Object.keys(obj || {}).forEach(function (k) { node.appendChild(el('dt', { text: k })); node.appendChild(el('dd', { text: String(obj[k]) })); });
		return node;
	}
	function table(columns, rows) {
		return el('div', { class: 'mrabb-table--wrap' }, [el('table', { class: 'mrabb-table' }, [
			el('thead', {}, [el('tr', {}, columns.map(function (c) { return el('th', { text: c }); }))]),
			el('tbody', {}, rows.map(function (r) { return el('tr', {}, r.map(function (cell) { return el('td', { text: cell == null ? '' : String(cell) }); })); }))
		])]);
	}
	function bars(items) {
		var max = Math.max.apply(null, items.map(function (i) { return Number(i.value) || 0; }).concat([1]));
		return el('div', { class: 'mrabb-bars' }, items.map(function (i) {
			return el('div', { class: 'mrabb-bars__row' }, [el('span', { class: 'mrabb-bars__label', text: i.label }), el('div', { class: 'mrabb-bar' }, [el('span', { style: 'width:' + Math.round((Number(i.value) || 0) / max * 100) + '%' })]), el('span', { class: 'mrabb-bars__value', text: i.display || String(i.value) })]);
		}));
	}
	function timeline(items) {
		return el('div', { class: 'mrabb-timeline' }, items.map(function (i) {
			return el('div', { class: 'mrabb-timeline__item' }, [
				el('span', { class: 'mrabb-timeline__dot' + (i.tone ? ' mrabb-timeline__dot--' + i.tone : '') }),
				el('div', {}, [el('div', { class: 'mrabb-timeline__title', text: i.title }), el('div', { class: 'mrabb-timeline__meta', text: i.meta || '' })])
			]);
		}));
	}
	function initials(name) { return String(name || '?').split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join(''); }
	function textBlock(text) { return el('p', { class: 'mrabb-result__text', text: text }); }

	/* ---------------------------------------------------------- Renderers */
	registry.calendar = function (r) {
		var d = r.data || {};
		var events = d.events || [];
		return card({ eyebrow: d.label || t('today'), title: r.title || (events.length + ' ' + t('meetings')), body: events.length ? list(events.map(function (e) { return { time: e.time, title: e.title, sub: e.location || e.with || '', trail: e.duration || '' }; })) : textBlock(t('empty_context')), badge: d.created ? { text: t('done'), tone: 'success' } : null });
	};
	registry.tasks = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || t('priority_tasks'), title: r.title || '', body: taskList(d.tasks || [], function (task, done) { MrAbb.bus.emit('task:toggle', { task: task, done: done }); }) });
	};
	registry.email = function (r) {
		var d = r.data || {};
		if (d.messages) {
			return card({ eyebrow: d.label || 'Inbox', title: r.title || '', body: list(d.messages.map(function (m) { return { lead: el('span', { class: 'mrabb-avatar-initials', text: initials(m.from) }), title: m.subject, sub: m.from + (m.snippet ? ' — ' + m.snippet : ''), trail: m.time || '' }; })) });
		}
		return card({ eyebrow: d.status === 'sent' ? t('sent') : t('draft'), title: d.subject || r.title || '', badge: d.status === 'sent' ? { text: t('sent'), tone: 'success' } : { text: t('draft'), tone: 'warning' }, body: el('div', {}, [kv(objectFrom([[t('email_to'), d.to], [t('email_subject'), d.subject]])), d.body ? el('pre', { class: 'mrabb-approval__preview', text: d.body }) : null]) });
	};
	registry.crm = function (r) {
		var d = r.data || {};
		var body = el('div', {}, [
			metrics([{ value: d.count != null ? String(d.count) : '—', label: t('opportunities') }, { value: d.pipeline || '—', label: t('pipeline'), tone: 'primary' }, { value: d.attention != null ? String(d.attention) : '—', label: t('need_attention'), tone: d.attention ? 'warning' : null }]),
			d.opportunities && d.opportunities.length ? el('div', { style: 'margin-top:16px' }, [list(d.opportunities.map(function (o) { return { lead: el('span', { class: 'mrabb-priority mrabb-priority--' + (o.risk || 'low') }), title: o.name, sub: o.customer || '', trail: o.value || '' }; }))]) : null
		]);
		return card({ eyebrow: d.label || t('closing_this_month'), title: r.title || '', body: body });
	};
	registry.contacts = function (r) {
		var d = r.data || {};
		return card({ eyebrow: r.title || 'Contacts', body: list((d.contacts || []).map(function (c) { return { lead: el('span', { class: 'mrabb-avatar-initials', text: initials(c.name) }), title: c.name, sub: [c.company, c.role].filter(Boolean).join(' · '), trail: c.phone || c.email || '' }; })) });
	};
	registry.customers = function (r) {
		var d = r.data || {};
		return card({ eyebrow: r.title || 'Customers', body: list((d.customers || []).map(function (c) { return { lead: el('span', { class: 'mrabb-avatar-initials', text: initials(c.name) }), title: c.name, sub: c.segment || '', trail: c.value || '' }; })) });
	};
	registry.documents = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || 'Drive', title: r.title || '', body: list((d.documents || []).map(function (doc) { return { lead: el('span', { class: 'mrabb-doc-icon', text: (doc.type || 'doc').slice(0, 4) }), title: doc.name, sub: doc.modified || '', trail: doc.url ? el('a', { class: 'mrabb-btn mrabb-btn--sm mrabb-btn--ghost', href: doc.url, target: '_blank', rel: 'noopener', text: t('open') }) : '' }; })) });
	};
	registry.report = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || 'Report', title: r.title || '', body: el('div', {}, [d.metrics ? metrics(d.metrics) : null, d.summary ? el('div', { style: 'margin-top:14px' }, [textBlock(d.summary)]) : null, d.rows && d.columns ? el('div', { style: 'margin-top:14px' }, [table(d.columns, d.rows)]) : null]), wide: !!(d.rows && d.rows.length > 3) });
	};
	registry.analytics = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || 'Power BI', title: r.title || '', body: el('div', {}, [d.metrics ? metrics(d.metrics) : null, d.series ? el('div', { style: 'margin-top:16px' }, [bars(d.series)]) : null]) });
	};
	registry.whatsapp = function (r) {
		var d = r.data || {};
		return card({ eyebrow: 'WhatsApp', title: d.to ? t('whatsapp_to') + ': ' + d.to : r.title, badge: d.status === 'sent' ? { text: t('sent'), tone: 'success' } : null, body: el('pre', { class: 'mrabb-approval__preview', text: d.message || '' }) });
	};
	registry.odoo = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || 'Odoo', title: r.title || d.model || '', body: d.columns && d.rows ? table(d.columns, d.rows) : kv(d.record || d), wide: !!(d.rows && d.rows.length) });
	};
	registry.web = function (r) {
		var d = r.data || {};
		return card({ eyebrow: 'Web', title: r.title || d.query || '', body: el('div', {}, [d.summary ? textBlock(d.summary) : null, d.sources && d.sources.length ? el('div', { style: 'margin-top:14px' }, [el('div', { class: 'mrabb-card__eyebrow', text: t('web_sources') }), list(d.sources.map(function (s) { return { lead: el('span', { class: 'mrabb-doc-icon', text: 'web' }), title: s.title, sub: s.domain || s.url || '', trail: s.url ? el('a', { class: 'mrabb-btn mrabb-btn--sm mrabb-btn--ghost', href: s.url, target: '_blank', rel: 'noopener', text: t('open') }) : '' }; }))]) : null]), wide: true });
	};
	registry.notification = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || 'Notification', title: r.title || d.title || '', body: textBlock(d.text || ''), badge: d.tone ? { text: d.badge || '', tone: d.tone } : null });
	};
	registry.automation = function (r) {
		var d = r.data || {};
		return card({ eyebrow: d.label || 'Workflow', title: r.title || d.name || '', badge: d.status ? { text: d.status, tone: d.status === 'completed' ? 'success' : d.status === 'failed' ? 'danger' : 'info' } : null, body: d.steps ? timeline(d.steps.map(function (s) { return { title: s.title, meta: s.meta || '', tone: s.status === 'completed' ? 'success' : s.status === 'failed' ? 'danger' : s.status === 'running' ? 'warning' : null }; })) : kv(d) });
	};
	registry.approval = function (r) {
		var d = r.data || {};
		return card({ eyebrow: t('approval_eyebrow'), title: r.title, badge: { text: t(d.status || 'approved'), tone: d.status === 'rejected' ? 'danger' : 'success' }, body: kv(d.details || {}) });
	};
	registry.generic = function (r) {
		var d = r.data;
		var body;
		if (d == null) { body = textBlock(t('done')); }
		else if (typeof d === 'string') { body = textBlock(d); }
		else if (Array.isArray(d) && d.length && typeof d[0] === 'object') { var cols = Object.keys(d[0]).slice(0, 5); body = table(cols, d.slice(0, 20).map(function (row) { return cols.map(function (c) { return row[c]; }); })); }
		else if (typeof d === 'object' && d.summary) { body = el('div', {}, [textBlock(d.summary), d.fields ? el('div', { style: 'margin-top:12px' }, [kv(d.fields)]) : null]); }
		else if (typeof d === 'object' && Object.keys(d).every(function (k) { return typeof d[k] !== 'object'; })) { body = kv(d); }
		else { body = el('pre', { class: 'mrabb-result__pre', text: JSON.stringify(d, null, 2) }); }
		return card({ eyebrow: r.tool || t('generic_result'), title: r.title || '', body: body });
	};

	function objectFrom(pairs) { var o = {}; pairs.forEach(function (p) { if (p[1] != null && p[1] !== '') { o[p[0]] = p[1]; } }); return o; }

	function render(result) {
		var type = result.type || MrAbb.cardTypeForTool(result.tool);
		var renderer = registry[type] || registry.generic;
		try { return renderer(result); } catch (e) { console.error('[MrAbb] card render failed', type, e); return registry.generic(result); }
	}

	MrAbb.cards = { register: function (type, fn) { registry[type] = fn; }, render: render, card: card, list: list, taskList: taskList, metrics: metrics, kv: kv, table: table, bars: bars, timeline: timeline, badge: badge, checkMark: checkMark, initials: initials, sourceLabel: sourceLabel };
})(window);
