<?php
/**
 * Theme setup: supports, menus, image sizes.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'after_setup_theme',
	function () {
		load_theme_textdomain( 'operines', OPERINES_DIR . '/languages' );

		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
		add_theme_support( 'automatic-feed-links' );
		add_theme_support( 'responsive-embeds' );
		add_theme_support( 'custom-logo', array( 'height' => 64, 'width' => 240, 'flex-width' => true, 'flex-height' => true ) );

		register_nav_menus(
			array(
				'primary' => __( 'Primary (fallback — header is data-driven)', 'operines' ),
				'footer'  => __( 'Footer (fallback — footer is data-driven)', 'operines' ),
			)
		);

		add_image_size( 'operines-card', 720, 480, true );
		add_image_size( 'operines-wide', 1440, 760, true );
	}
);

/**
 * Clean head output: remove noise WordPress prints by default.
 */
add_action(
	'init',
	function () {
		remove_action( 'wp_head', 'wp_generator' );
		remove_action( 'wp_head', 'wlwmanifest_link' );
		remove_action( 'wp_head', 'rsd_link' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head' );
		remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head' );
		// This theme ships its own complete design system; core global styles
		// and block CSS only add unused bytes.
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
		remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
		remove_action( 'wp_head', 'wp_print_auto_sizes_contain_css_fix', 1 );
		// Emoji scripts are dead weight for this design system.
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
		remove_action( 'wp_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
	}
);

/**
 * Excerpt tuning for Insights cards.
 */
add_filter( 'excerpt_length', fn() => 28, 999 );

// No content on this site uses core block styles; load them bundled (and the
// bundle is dequeued in inc/assets.php) instead of per-block inline styles.
add_filter( 'should_load_separate_core_block_assets', '__return_false' );
add_filter( 'excerpt_more', fn() => '&hellip;' );
