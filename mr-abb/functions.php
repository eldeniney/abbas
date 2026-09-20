<?php
/**
 * Mr. Abb theme bootstrap.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MRABB_VERSION', '1.0.0' );
define( 'MRABB_DIR', trailingslashit( get_template_directory() ) );
define( 'MRABB_URI', trailingslashit( get_template_directory_uri() ) );
define( 'MRABB_REST_NAMESPACE', 'mrabb/v1' );

require MRABB_DIR . 'inc/helpers.php';
require MRABB_DIR . 'inc/i18n.php';
require MRABB_DIR . 'inc/settings.php';
require MRABB_DIR . 'inc/security.php';
require MRABB_DIR . 'inc/logs.php';
require MRABB_DIR . 'inc/api.php';
require MRABB_DIR . 'inc/rest-routes.php';
require MRABB_DIR . 'inc/setup.php';
require MRABB_DIR . 'inc/pages.php';

if ( is_admin() ) {
	require MRABB_DIR . 'inc/admin.php';
}
