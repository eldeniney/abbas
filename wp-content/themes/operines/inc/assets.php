<?php
/**
 * Asset loading. Fonts are self-hosted; JS is a single deferred vanilla file.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'wp_enqueue_scripts',
	function () {
		$css_ver = (string) filemtime( OPERINES_DIR . '/assets/css/main.css' );
		$js_ver  = (string) filemtime( OPERINES_DIR . '/assets/js/main.js' );

		wp_enqueue_style( 'operines-fonts', OPERINES_URI . '/assets/css/fonts.css', array(), OPERINES_VERSION );
		// main.css is written with CSS logical properties + [dir="rtl"] overrides,
		// so the same stylesheet serves LTR and RTL locales.
		wp_enqueue_style( 'operines-main', OPERINES_URI . '/assets/css/main.css', array( 'operines-fonts' ), $css_ver );

		wp_enqueue_script( 'operines-main', OPERINES_URI . '/assets/js/main.js', array(), $js_ver, array( 'in_footer' => true, 'strategy' => 'defer' ) );

		// Comment styles/scripts are not part of this site experience.
		wp_dequeue_style( 'wp-block-library' );
		wp_dequeue_style( 'classic-theme-styles' );
		wp_dequeue_style( 'global-styles' );
	},
	20
);

/**
 * Preload the two fonts used above the fold.
 */
add_action(
	'wp_head',
	function () {
		$fonts = array(
			'/assets/fonts/poppins-700-normal-latin.woff2',
			'/assets/fonts/inter-100-900-normal-latin.woff2',
		);
		foreach ( $fonts as $font ) {
			printf(
				'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
				esc_url( OPERINES_URI . $font )
			);
		}
	},
	2
);
