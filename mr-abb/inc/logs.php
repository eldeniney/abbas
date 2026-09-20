<?php
/**
 * Lightweight debug log ring buffer (option based, admin visible only).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MRABB_LOG_OPTION', 'mrabb_logs' );
define( 'MRABB_LOG_LIMIT', 200 );

/**
 * Append a log entry when debug logging is enabled.
 *
 * @param string $level   info|warn|error.
 * @param string $message Short message.
 * @param array  $context Extra data (secrets must never be passed here).
 */
function mrabb_log( $level, $message, $context = array() ) {
	if ( ! mrabb_get_setting( 'debug_logging', 0 ) && 'error' !== $level ) {
		return;
	}
	$logs = get_option( MRABB_LOG_OPTION, array() );
	if ( ! is_array( $logs ) ) {
		$logs = array();
	}
	$logs[] = array(
		'time'    => current_time( 'mysql' ),
		'level'   => in_array( $level, array( 'info', 'warn', 'error' ), true ) ? $level : 'info',
		'message' => sanitize_text_field( mb_substr( (string) $message, 0, 500 ) ),
		'context' => mrabb_sanitize_log_context( $context ),
		'user'    => get_current_user_id(),
	);
	if ( count( $logs ) > MRABB_LOG_LIMIT ) {
		$logs = array_slice( $logs, -MRABB_LOG_LIMIT );
	}
	update_option( MRABB_LOG_OPTION, $logs, false );
}

/**
 * Sanitize context recursively; strip anything that looks like a secret.
 *
 * @param mixed $context Context.
 * @param int   $depth   Depth guard.
 * @return mixed
 */
function mrabb_sanitize_log_context( $context, $depth = 0 ) {
	if ( $depth > 3 ) {
		return '[…]';
	}
	if ( is_array( $context ) ) {
		$out = array();
		foreach ( $context as $k => $v ) {
			$key = sanitize_key( (string) $k );
			if ( preg_match( '/(secret|token|password|authorization|key)/i', $key ) ) {
				$out[ $key ] = '[redacted]';
				continue;
			}
			$out[ $key ] = mrabb_sanitize_log_context( $v, $depth + 1 );
		}
		return $out;
	}
	if ( is_scalar( $context ) ) {
		return sanitize_text_field( mb_substr( (string) $context, 0, 300 ) );
	}
	return null;
}

/**
 * Read logs (newest first).
 *
 * @return array
 */
function mrabb_get_logs() {
	$logs = get_option( MRABB_LOG_OPTION, array() );
	return is_array( $logs ) ? array_reverse( $logs ) : array();
}

/**
 * Clear logs.
 */
function mrabb_clear_logs() {
	delete_option( MRABB_LOG_OPTION );
}
