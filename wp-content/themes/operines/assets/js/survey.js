/**
 * Standalone Arabic survey — step wizard, branch logic, inline
 * validation, AJAX submit to WordPress (admin-post.php).
 *
 * Branch rules (identical to the source questionnaire):
 *  - travel step skipped when the last purchase was ordered remotely
 *    (source contains "طلبت")
 *  - delivery-details step skipped when delivery30 === "ولا مرة"
 *  - missing-product block revealed unless couldnt_find === "no"
 *  - pains capped at 3 selections
 */
( function () {
	'use strict';

	var form = document.getElementById( 'survey' );
	if ( ! form ) {
		return;
	}

	var screens = [].slice.call( document.querySelectorAll( '.sv-screen[data-step]' ) );
	var top = document.getElementById( 'svTop' );
	var backBtn = document.getElementById( 'svBack' );
	var stepLabel = document.getElementById( 'svStepLabel' );
	var progressBar = document.getElementById( 'svProgressBar' );
	var progressFill = document.getElementById( 'svProgressFill' );
	var travelBlock = document.getElementById( 'travelBlock' );
	var deliveryDetails = document.getElementById( 'deliveryDetails' );
	var missingBlock = document.getElementById( 'missingBlock' );
	var current = 0;
	var reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	// Bot time-trap: record when a human actually started.
	var opts = form.querySelector( '[name="_opts"]' );
	if ( opts ) {
		opts.value = String( Math.floor( Date.now() / 1000 ) );
	}

	/* ------------------------------------------------ branch logic */
	function value( name ) {
		var el = form.querySelector( '[name="' + name + '"]:checked' );
		return el ? el.value : '';
	}

	function isSkipped( screen ) {
		if ( screen === travelBlock ) {
			return value( 'source' ).indexOf( 'طلبت' ) !== -1;
		}
		if ( screen === deliveryDetails ) {
			return value( 'delivery30' ) === 'ولا مرة';
		}
		return false;
	}

	function applyLogic() {
		if ( missingBlock ) {
			var miss = value( 'couldnt_find' );
			missingBlock.hidden = ( miss === 'no' || ! miss );
		}
	}

	/* ------------------------------------------------ progress */
	function visibleScreens() {
		return screens.filter( function ( s ) {
			return ! isSkipped( s );
		} );
	}

	function updateChrome() {
		var vis = visibleScreens();
		var idx = vis.indexOf( screens[ current ] );
		var total = vis.length - 1; // hero is step 0, not counted
		if ( current === 0 ) {
			top.hidden = true;
			return;
		}
		top.hidden = false;
		stepLabel.textContent = 'خطوة ' + Math.max( idx, 1 ) + ' من ' + total;
		var pct = Math.round( ( Math.max( idx, 1 ) - 1 ) / total * 100 );
		progressFill.style.inlineSize = pct + '%';
		progressBar.setAttribute( 'aria-valuenow', String( pct ) );
	}

	function show( n ) {
		screens.forEach( function ( s, i ) {
			s.classList.toggle( 'is-active', i === n );
		} );
		current = n;
		applyLogic();
		updateChrome();
		window.scrollTo( { top: 0, behavior: reduced ? 'auto' : 'smooth' } );
		// Focus the step heading for screen readers.
		var h = screens[ n ].querySelector( 'h1, h2' );
		if ( h && current > 0 ) {
			h.setAttribute( 'tabindex', '-1' );
			h.focus( { preventScroll: true } );
		}
	}

	/* ------------------------------------------------ validation */
	var EG_MOBILE = /^01[0125][0-9]{8}$/;

	function normalizeMobile( raw ) {
		var d = String( raw ).replace( /\D/g, '' );
		if ( d.indexOf( '0020' ) === 0 ) {
			d = '0' + d.slice( 4 );
		} else if ( d.indexOf( '20' ) === 0 && d.length === 12 ) {
			d = '0' + d.slice( 2 );
		}
		return d;
	}

	function fieldWrap( input ) {
		var w = input.closest( '.sv-field' );
		return w || input.closest( '.sv-card' ) || input.parentElement;
	}

	function setFieldError( input, on ) {
		var w = fieldWrap( input );
		if ( w ) {
			w.classList.toggle( 'has-error', on );
			if ( on && ! reduced ) {
				w.classList.remove( 'sv-shake' );
				void w.offsetWidth;
				w.classList.add( 'sv-shake' );
			}
		}
	}

	function validateScreen( screen ) {
		var ok = true;
		var firstBad = null;

		// Clear previous state.
		screen.querySelectorAll( '.has-error' ).forEach( function ( el ) {
			el.classList.remove( 'has-error' );
		} );
		screen.querySelectorAll( '[data-error-group], [data-error-consent]' ).forEach( function ( el ) {
			el.classList.remove( 'is-on' );
		} );

		screen.querySelectorAll( '[required]' ).forEach( function ( el ) {
			var bad = false;
			if ( el.type === 'radio' ) {
				if ( ! screen.querySelector( '[name="' + el.name + '"]:checked' ) ) {
					bad = true;
					var g = screen.querySelector( '[data-error-group]' );
					if ( g ) {
						g.classList.add( 'is-on' );
					}
				}
			} else if ( el.type === 'checkbox' ) {
				if ( ! el.checked ) {
					bad = true;
					var c = screen.querySelector( '[data-error-consent]' );
					if ( c ) {
						c.classList.add( 'is-on' );
					}
				}
			} else if ( el.name === 'mobile' ) {
				if ( ! EG_MOBILE.test( normalizeMobile( el.value ) ) ) {
					bad = true;
					setFieldError( el, true );
				}
			} else if ( ! el.value.trim() ) {
				bad = true;
				setFieldError( el, true );
			}
			if ( bad ) {
				ok = false;
				if ( ! firstBad ) {
					firstBad = el;
				}
			}
		} );

		// Optional email: validate only when filled.
		var email = screen.querySelector( '[name="email"]' );
		if ( email && email.value.trim() && ! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email.value.trim() ) ) {
			ok = false;
			setFieldError( email, true );
			if ( ! firstBad ) {
				firstBad = email;
			}
		}

		if ( firstBad && firstBad.type !== 'radio' && firstBad.type !== 'checkbox' ) {
			firstBad.focus();
		}
		return ok;
	}

	// Live error clearing.
	form.addEventListener( 'input', function ( e ) {
		var w = e.target.closest( '.sv-field' );
		if ( w ) {
			w.classList.remove( 'has-error' );
		}
	} );

	/* ------------------------------------------------ navigation */
	function goNext() {
		if ( ! validateScreen( screens[ current ] ) ) {
			return;
		}
		var n = current + 1;
		while ( n < screens.length && isSkipped( screens[ n ] ) ) {
			n++;
		}
		if ( n < screens.length ) {
			show( n );
		}
	}

	function goBack() {
		var n = current - 1;
		while ( n >= 0 && isSkipped( screens[ n ] ) ) {
			n--;
		}
		show( Math.max( 0, n ) );
	}

	form.addEventListener( 'click', function ( e ) {
		var next = e.target.closest( '.sv-next' );
		if ( next ) {
			goNext();
		}
	} );
	backBtn.addEventListener( 'click', goBack );

	// Auto-advance on single-question radio screens.
	form.addEventListener( 'change', function ( e ) {
		var screen = e.target.closest( '.sv-screen' );
		if (
			screen &&
			screen.hasAttribute( 'data-auto' ) &&
			e.target.type === 'radio' &&
			screen === screens[ current ]
		) {
			window.setTimeout( goNext, reduced ? 80 : 300 );
		}
	} );

	/* ------------------------------------------------ pains max 3 */
	var painCount = document.getElementById( 'painCount' );
	var toastTimer = null;

	function toast( msg ) {
		var t = document.querySelector( '.sv-toast' );
		if ( t ) {
			t.remove();
		}
		t = document.createElement( 'div' );
		t.className = 'sv-toast';
		t.setAttribute( 'role', 'status' );
		t.textContent = msg;
		document.body.appendChild( t );
		window.clearTimeout( toastTimer );
		toastTimer = window.setTimeout( function () {
			t.remove();
		}, 2200 );
	}

	form.addEventListener( 'change', function ( e ) {
		if ( e.target.classList.contains( 'max3' ) ) {
			var checked = form.querySelectorAll( '.max3:checked' );
			if ( checked.length > 3 ) {
				e.target.checked = false;
				toast( 'اختار بحد أقصى 3' );
			}
			var n = form.querySelectorAll( '.max3:checked' ).length;
			if ( painCount ) {
				painCount.textContent = n + '/3';
			}
			form.querySelectorAll( '.max3' ).forEach( function ( cb ) {
				cb.closest( '.sv-opt' ).classList.toggle( 'is-capped', n >= 3 && ! cb.checked );
			} );
		}
		applyLogic();
	} );

	/* ------------------------------------------------ submit */
	form.addEventListener( 'submit', function ( e ) {
		e.preventDefault();
		if ( ! validateScreen( screens[ current ] ) ) {
			return;
		}

		var btn = document.getElementById( 'svSubmit' );
		var errBox = form.querySelector( '[data-error-submit]' );
		btn.disabled = true;
		btn.textContent = 'ثانية واحدة…';
		errBox.classList.remove( 'is-on' );

		var data = new FormData( form );
		data.set( 'mobile', normalizeMobile( data.get( 'mobile' ) ) );

		fetch( window.opSurvey.endpoint, {
			method: 'POST',
			body: data,
			credentials: 'same-origin',
			headers: { 'X-Requested-With': 'fetch' },
		} )
			.then( function ( res ) {
				return res.json();
			} )
			.then( function ( json ) {
				if ( ! json || ! json.success ) {
					throw new Error( ( json && json.data && json.data.message ) || 'server' );
				}
				document.getElementById( 'promo' ).textContent = json.data.code;
				document.getElementById( 'personName' ).textContent =
					( data.get( 'name' ) || '' ).trim().split( /\s+/ )[ 0 ];
				screens.forEach( function ( s ) {
					s.classList.remove( 'is-active' );
				} );
				document.getElementById( 'thanks' ).classList.add( 'is-active' );
				progressFill.style.inlineSize = '100%';
				progressBar.setAttribute( 'aria-valuenow', '100' );
				stepLabel.textContent = 'تم ✓';
				backBtn.hidden = true;
				window.scrollTo( { top: 0, behavior: reduced ? 'auto' : 'smooth' } );
			} )
			.catch( function ( err ) {
				btn.disabled = false;
				btn.textContent = 'إنهاء واستلام الكود';
				errBox.textContent =
					err && err.message && err.message !== 'server' && err.message.length < 120
						? err.message
						: 'حصلت مشكلة في الإرسال — جرّب تاني بعد لحظات.';
				errBox.classList.add( 'is-on' );
			} );
	} );

	/* ------------------------------------------------ copy code */
	var copyBtn = document.getElementById( 'copyCode' );
	if ( copyBtn ) {
		copyBtn.addEventListener( 'click', function () {
			var code = document.getElementById( 'promo' ).textContent.trim();
			var label = copyBtn.querySelector( '[data-copy-label]' );
			function done() {
				label.textContent = 'تم النسخ ✓';
				window.setTimeout( function () {
					label.textContent = 'انسخ الكود';
				}, 1800 );
			}
			if ( navigator.clipboard && navigator.clipboard.writeText ) {
				navigator.clipboard.writeText( code ).then( done, done );
			} else {
				done();
			}
		} );
	}

	show( 0 );
} )();
