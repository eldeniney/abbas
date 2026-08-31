/**
 * Operines front-end behavior. Vanilla JS, no dependencies.
 * Everything degrades gracefully without JS; motion respects
 * prefers-reduced-motion.
 */
(function () {
	'use strict';

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ------------------------------------------------ Header */
	var header = document.getElementById('site-header');
	if (header) {
		var onScroll = function () {
			header.classList.toggle('is-stuck', window.scrollY > 8);
		};
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
	}

	// Solutions mega panel (click + keyboard; closes on outside click / Esc).
	document.querySelectorAll('.nav-item.has-panel').forEach(function (item) {
		var trigger = item.querySelector('.nav-trigger');
		if (!trigger) return;
		var setOpen = function (open) {
			item.classList.toggle('is-open', open);
			trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
		};
		trigger.addEventListener('click', function () {
			setOpen(!item.classList.contains('is-open'));
		});
		document.addEventListener('click', function (e) {
			if (!item.contains(e.target)) setOpen(false);
		});
		item.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') { setOpen(false); trigger.focus(); }
		});
	});

	// Mobile nav.
	var navToggle = document.querySelector('.nav-toggle');
	var mobileNav = document.getElementById('mobile-nav');
	if (navToggle && mobileNav) {
		navToggle.addEventListener('click', function () {
			var open = navToggle.getAttribute('aria-expanded') === 'true';
			navToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
			navToggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
			if (open) {
				mobileNav.removeAttribute('data-open');
				mobileNav.hidden = true;
			} else {
				mobileNav.hidden = false;
				mobileNav.setAttribute('data-open', '');
			}
		});
	}

	// Mark current page in nav.
	var here = window.location.pathname.replace(/\/$/, '');
	document.querySelectorAll('.nav-link[href], .mobile-nav a[href]').forEach(function (a) {
		try {
			var path = new URL(a.href).pathname.replace(/\/$/, '');
			if (path && path === here) a.setAttribute('aria-current', 'page');
		} catch (e) { /* ignore */ }
	});

	/* ------------------------------------------------ Reveal on scroll */
	var revealables = document.querySelectorAll('[data-reveal]');
	if (revealables.length) {
		if (reduceMotion || !('IntersectionObserver' in window)) {
			revealables.forEach(function (el) { el.classList.add('is-revealed'); });
		} else {
			var io = new IntersectionObserver(function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-revealed');
						io.unobserve(entry.target);
					}
				});
			}, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
			revealables.forEach(function (el) { io.observe(el); });
		}
	}

	/* ------------------------------------------------ Hero orchestration */
	var heroMap = document.querySelector('.hero-map');
	var ticker = document.querySelector('.hero-ticker-rows');
	if (ticker) {
		var sequence = [
			{ node: 'website', time: '09:31:02', text: 'New lead received from website' },
			{ node: 'core', time: '09:31:03', text: 'AI sales agent qualifies the lead' },
			{ node: 'crm', time: '09:31:04', text: 'Opportunity created in CRM' },
			{ node: 'whatsapp', time: '09:31:05', text: 'Personalized WhatsApp reply sent' },
			{ node: 'email', time: '09:31:05', text: 'Follow-up scheduled by email' },
			{ node: 'analytics', time: '09:31:07', text: 'Management dashboard updated' },
			{ node: 'erp', time: '09:31:09', text: 'Quotation drafted from ERP pricing' },
			{ node: 'docs', time: '09:31:10', text: 'Documents attached to the record' },
			{ node: 'finance', time: '09:31:12', text: 'Finance notified of expected deal' },
			{ node: 'core', time: '09:31:12', text: 'Humans approve the final offer' }
		];
		var maxRows = 4;
		var idx = 0;
		var setActive = function (key) {
			if (!heroMap) return;
			heroMap.querySelectorAll('.is-active').forEach(function (el) { el.classList.remove('is-active'); });
			if (!key || key === 'core') return;
			var node = heroMap.querySelector('[data-node="' + key + '"]');
			var line = heroMap.querySelector('[data-line="' + key + '"]');
			if (node) node.classList.add('is-active');
			if (line) line.classList.add('is-active');
		};
		var pushRow = function (step) {
			var row = document.createElement('div');
			row.className = 'hero-ticker-row';
			row.innerHTML = '<span class="hero-ticker-time">' + step.time + '</span><span>' + step.text + '</span>';
			ticker.appendChild(row);
			requestAnimationFrame(function () {
				requestAnimationFrame(function () { row.classList.add('is-in'); });
			});
			var rows = ticker.querySelectorAll('.hero-ticker-row');
			if (rows.length > maxRows) rows[0].remove();
			rows = ticker.querySelectorAll('.hero-ticker-row');
			for (var i = 0; i < rows.length - 1; i++) rows[i].classList.add('is-old');
		};
		if (reduceMotion) {
			// Static: show the first rows, no cycling.
			sequence.slice(0, maxRows).forEach(function (s) { pushRow(s); });
		} else {
			var tick = function () {
				var step = sequence[idx % sequence.length];
				setActive(step.node);
				pushRow(step);
				idx++;
			};
			tick();
			window.setInterval(tick, 2200);
		}
	}

	/* ------------------------------------------------ Department explorer */
	var explorer = document.querySelector('[data-explorer]');
	if (explorer) {
		var tabs = explorer.querySelectorAll('.explorer-tab');
		var panels = explorer.querySelectorAll('.explorer-panel');
		var select = function (id, focus) {
			tabs.forEach(function (t) {
				var on = t.getAttribute('data-tab') === id;
				t.setAttribute('aria-selected', on ? 'true' : 'false');
				t.setAttribute('tabindex', on ? '0' : '-1');
				if (on && focus) t.focus();
			});
			panels.forEach(function (p) {
				var on = p.getAttribute('data-panel') === id;
				p.hidden = !on;
				if (on) {
					var flow = p.querySelector('[data-reveal="flow"]');
					if (flow) {
						flow.classList.remove('is-revealed');
						requestAnimationFrame(function () {
							requestAnimationFrame(function () { flow.classList.add('is-revealed'); });
						});
					}
				}
			});
		};
		tabs.forEach(function (tab, i) {
			tab.addEventListener('click', function () { select(tab.getAttribute('data-tab')); });
			tab.addEventListener('keydown', function (e) {
				var dir = 0;
				if (e.key === 'ArrowRight') dir = 1;
				if (e.key === 'ArrowLeft') dir = -1;
				if (!dir) return;
				e.preventDefault();
				var next = (i + dir + tabs.length) % tabs.length;
				select(tabs[next].getAttribute('data-tab'), true);
			});
		});
	}

	/* ------------------------------------------------ Use-case filters */
	var ucFilters = document.querySelector('.uc-filters');
	if (ucFilters) {
		var items = document.querySelectorAll('.uc-item');
		ucFilters.addEventListener('click', function (e) {
			var btn = e.target.closest('[data-filter]');
			if (!btn) return;
			var f = btn.getAttribute('data-filter');
			ucFilters.querySelectorAll('[data-filter]').forEach(function (b) {
				b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
				b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
			});
			items.forEach(function (item) {
				item.classList.toggle('is-hidden', f !== 'all' && item.getAttribute('data-dept') !== f);
			});
		});
	}

	/* ------------------------------------------------ Contact form validation */
	document.querySelectorAll('form[data-validate]').forEach(function (form) {
		form.addEventListener('submit', function (e) {
			var ok = true;
			form.querySelectorAll('[required]').forEach(function (input) {
				var field = input.closest('.field');
				var valid = input.checkValidity();
				if (field) field.classList.toggle('has-error', !valid);
				input.setAttribute('aria-invalid', valid ? 'false' : 'true');
				if (!valid) ok = false;
			});
			if (!ok) {
				e.preventDefault();
				var first = form.querySelector('[aria-invalid="true"]');
				if (first) first.focus();
			}
		});
	});

	/* ------------------------------------------------ Audit stepper */
	var audit = document.querySelector('[data-audit]');
	if (audit) {
		var steps = Array.prototype.slice.call(audit.querySelectorAll('.audit-step'));
		var fill = audit.querySelector('.audit-bar-fill');
		var counter = audit.querySelector('[data-audit-count]');
		var prevBtn = audit.querySelector('[data-audit-prev]');
		var nextBtn = audit.querySelector('[data-audit-next]');
		var submitBtn = audit.querySelector('[data-audit-submit]');
		var current = 0;

		var show = function (i) {
			current = i;
			steps.forEach(function (s, j) { s.hidden = j !== i; });
			if (fill) fill.style.width = (((i + 1) / steps.length) * 100) + '%';
			if (counter) counter.textContent = (i + 1) + ' / ' + steps.length;
			if (prevBtn) prevBtn.disabled = i === 0;
			var last = i === steps.length - 1;
			if (nextBtn) nextBtn.hidden = last;
			if (submitBtn) submitBtn.hidden = !last;
			var focusable = steps[i].querySelector('input, select, textarea, label');
			if (focusable && !reduceMotion) focusable.focus({ preventScroll: true });
		};

		var validStep = function () {
			var ok = true;
			steps[current].querySelectorAll('[required]').forEach(function (input) {
				var field = input.closest('.field');
				var valid = input.checkValidity();
				if (field) field.classList.toggle('has-error', !valid);
				input.setAttribute('aria-invalid', valid ? 'false' : 'true');
				if (!valid) ok = false;
			});
			return ok;
		};

		if (nextBtn) nextBtn.addEventListener('click', function () {
			if (validStep() && current < steps.length - 1) show(current + 1);
		});
		if (prevBtn) prevBtn.addEventListener('click', function () {
			if (current > 0) show(current - 1);
		});

		var form = audit.querySelector('form');
		if (form && submitBtn) {
			form.addEventListener('submit', function (e) {
				if (!validStep()) { e.preventDefault(); return; }
				// Brief "preparing" state, honestly labeled in the markup.
				var prep = audit.querySelector('.audit-preparing');
				if (prep && !form.dataset.submitting) {
					e.preventDefault();
					form.dataset.submitting = '1';
					steps[current].hidden = true;
					audit.querySelector('.audit-nav').hidden = true;
					prep.hidden = false;
					window.setTimeout(function () { form.submit(); }, reduceMotion ? 0 : 1200);
				}
			});
		}
		show(0);
	}

	/* ------------------------------------------------ Hero data packets */
	// Small dots continuously travel the connector lines into the core,
	// so the orchestration map reads as a live system, not a diagram.
	if (heroMap && !reduceMotion) {
		var nodeEls = heroMap.querySelectorAll('.hero-node');
		var routes = [];
		nodeEls.forEach(function (el) {
			routes.push({
				x: parseFloat(el.style.left),
				y: parseFloat(el.style.top)
			});
		});
		var packets = [];
		var PACKETS = 7;
		for (var pi = 0; pi < PACKETS; pi++) {
			var dot = document.createElement('span');
			dot.className = 'hero-packet';
			heroMap.appendChild(dot);
			packets.push({
				el: dot,
				route: routes[pi % routes.length],
				t: Math.random(),
				speed: 0.0035 + Math.random() * 0.003,
				inbound: Math.random() > 0.4
			});
		}
		var mapVisible = true;
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				mapVisible = entries[0].isIntersecting;
			}).observe(heroMap);
		}
		var animatePackets = function () {
			if (mapVisible && !document.hidden) {
				packets.forEach(function (pk) {
					pk.t += pk.speed;
					if (pk.t >= 1) {
						pk.t = 0;
						pk.route = routes[Math.floor(Math.random() * routes.length)];
						pk.inbound = Math.random() > 0.35;
					}
					var p = pk.inbound ? pk.t : 1 - pk.t;
					var x = pk.route.x + (50 - pk.route.x) * p;
					var y = pk.route.y + (50 - pk.route.y) * p;
					// Fade near the ends so packets appear to enter/leave systems.
					var fade = Math.min(1, Math.min(pk.t, 1 - pk.t) * 6);
					pk.el.style.opacity = (0.85 * fade).toFixed(2);
					pk.el.style.left = x + '%';
					pk.el.style.top = y + '%';
				});
			}
			requestAnimationFrame(animatePackets);
		};
		requestAnimationFrame(animatePackets);
	}

	/* ------------------------------------------------ Live ledger feed */
	// After its reveal, the signature ledger keeps flowing like a live log.
	document.querySelectorAll('[data-ledger-live]').forEach(function (ledger) {
		if (reduceMotion) return;
		var rows = Array.prototype.slice.call(ledger.querySelectorAll('.ledger-row'));
		if (rows.length < 3) return;
		ledger.classList.add('ledger--live');
		var events = rows.map(function (r) {
			return {
				time: r.querySelector('.ledger-time').textContent,
				text: r.querySelector('.ledger-event').textContent
			};
		});
		var idx = 0;
		var started = false;
		var tickLedger = function () {
			var ev = events[idx % events.length];
			idx++;
			var row = document.createElement('div');
			row.className = 'ledger-row is-new';
			row.innerHTML = '<span class="ledger-time">' + ev.time + '</span><span class="ledger-event">' + ev.text + '</span>';
			var note = ledger.querySelector('.ledger-note');
			ledger.insertBefore(row, note);
			requestAnimationFrame(function () {
				requestAnimationFrame(function () { row.classList.remove('is-new'); });
			});
			var current = ledger.querySelectorAll('.ledger-row');
			if (current.length > rows.length) current[0].remove();
		};
		var start = function () {
			if (started) return;
			started = true;
			// Let the initial staggered reveal finish first.
			window.setTimeout(function () { window.setInterval(tickLedger, 2400); }, rows.length * 300 + 1200);
		};
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries, obs) {
				if (entries[0].isIntersecting) { start(); obs.disconnect(); }
			}, { threshold: 0.3 }).observe(ledger);
		} else {
			start();
		}
	});

	/* ------------------------------------------------ Animated product conversation */
	document.querySelectorAll('[data-chat]').forEach(function (chat) {
		var bubbles = Array.prototype.slice.call(chat.querySelectorAll('.bubble'));
		if (!bubbles.length) return;
		if (reduceMotion || !('IntersectionObserver' in window)) return; // Show static.
		chat.classList.add('chat-armed');
		var played = false;
		var typing = document.createElement('span');
		typing.className = 'bubble bubble--typing bubble--out';
		typing.innerHTML = '<i></i><i></i><i></i>';
		var play = function () {
			if (played) return;
			played = true;
			var i = 0;
			var step = function () {
				if (i >= bubbles.length) return;
				var b = bubbles[i];
				var isReply = b.classList.contains('bubble--out');
				var show = function () {
					if (typing.parentNode) typing.remove();
					b.classList.add('is-in');
					i++;
					window.setTimeout(step, b.classList.contains('bubble--sys') ? 500 : 850);
				};
				if (isReply) {
					// The agent "types" briefly before replying.
					chat.insertBefore(typing, b);
					window.setTimeout(show, 900);
				} else {
					show();
				}
			};
			window.setTimeout(step, 300);
		};
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) { play(); io.disconnect(); }
			});
		}, { threshold: 0.4 });
		io.observe(chat);
	});

	/* ------------------------------------------------ Reading progress (articles) */
	if (document.querySelector('.article-body')) {
		var bar = document.createElement('div');
		bar.className = 'scroll-progress';
		bar.setAttribute('aria-hidden', 'true');
		document.body.appendChild(bar);
		var progressTick = false;
		var updateProgress = function () {
			progressTick = false;
			var doc = document.documentElement;
			var max = doc.scrollHeight - doc.clientHeight;
			bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
		};
		window.addEventListener('scroll', function () {
			if (!progressTick) { progressTick = true; requestAnimationFrame(updateProgress); }
		}, { passive: true });
		updateProgress();
	}

	/* ------------------------------------------------ Timestamp for spam time-trap */
	document.querySelectorAll('input[name="_opts"]').forEach(function (i) {
		i.value = Math.floor(Date.now() / 1000);
	});
})();
