<?php
/**
 * Operines theme bootstrap.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

define( 'OPERINES_VERSION', '1.0.0' );
define( 'OPERINES_DIR', get_template_directory() );
define( 'OPERINES_URI', get_template_directory_uri() );

require OPERINES_DIR . '/inc/setup.php';
require OPERINES_DIR . '/inc/assets.php';
require OPERINES_DIR . '/inc/data.php';
require OPERINES_DIR . '/inc/cpt.php';
require OPERINES_DIR . '/inc/seo.php';
require OPERINES_DIR . '/inc/forms.php';
require OPERINES_DIR . '/inc/template-tags.php';
require OPERINES_DIR . '/inc/seed-functions.php';

/**
 * Self-provision on activation: create the page tree, set front/posts
 * pages and permalinks so no menu link ever lands on a 404. Idempotent —
 * re-activating never duplicates content.
 */
// after_switch_theme fires from check_theme_switched() at init:99, i.e.
// after the CPTs register at init:10 — safe to provision immediately.
add_action( 'after_switch_theme', 'operines_seed_site' );
