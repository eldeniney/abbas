<?php
/**
 * Front page: the command center itself.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require MRABB_DIR . ( mrabb_is_nova() ? 'templates/dashboard-nova.php' : 'templates/dashboard.php' );
