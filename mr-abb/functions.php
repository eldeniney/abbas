<?php
/**
 * Mr. Abb theme bootstrap.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MRABB_VERSION', '1.2.1' );
define( 'MRABB_DIR', trailingslashit( get_template_directory() ) );
define( 'MRABB_URI', trailingslashit( get_template_directory_uri() ) );
define( 'MRABB_REST_NAMESPACE', 'mrabb/v1' );

require MRABB_DIR . 'inc/helpers.php';
require MRABB_DIR . 'inc/i18n.php';
require MRABB_DIR . 'inc/settings.php';
require MRABB_DIR . 'inc/security.php';
require MRABB_DIR . 'inc/logs.php';
require MRABB_DIR . 'inc/gateway/class-secrets.php';
require MRABB_DIR . 'inc/gateway/class-store.php';
require MRABB_DIR . 'inc/gateway/class-connectors.php';
require MRABB_DIR . 'inc/gateway/class-google.php';
require MRABB_DIR . 'inc/gateway/class-elevenlabs.php';
require MRABB_DIR . 'inc/gateway/class-brain.php';
require MRABB_DIR . 'inc/gateway/class-tools.php';
require MRABB_DIR . 'inc/gateway/tools-builtin.php';
require MRABB_DIR . 'inc/gateway/class-local-gateway.php';
require MRABB_DIR . 'inc/gateway/class-cron.php';
require MRABB_DIR . 'inc/gateway/hooks.php';
require MRABB_DIR . 'inc/api.php';
require MRABB_DIR . 'inc/rest-routes.php';
require MRABB_DIR . 'inc/setup.php';
require MRABB_DIR . 'inc/pages.php';

if ( is_admin() ) {
	require MRABB_DIR . 'inc/admin.php';
	require MRABB_DIR . 'inc/admin-connections.php';
}

add_action( 'init', array( 'MrAbb_Store', 'maybe_install' ), 5 );
