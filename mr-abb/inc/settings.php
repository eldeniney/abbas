<?php
/**
 * Settings storage, defaults and sanitization.
 *
 * Non-secret settings live in a single option (mrabb_settings).
 * The backend secret is read from the MRABB_BACKEND_SECRET constant
 * (wp-config.php) first; a separately stored option is the fallback.
 * Neither is ever passed to the browser.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Option key for public (non-secret) settings.
 */
define( 'MRABB_OPTION', 'mrabb_settings' );

/**
 * Option key for the backend secret when it is not defined as a constant.
 */
define( 'MRABB_SECRET_OPTION', 'mrabb_backend_secret' );

/**
 * Default settings.
 *
 * @return array
 */
function mrabb_default_settings() {
	return array(
		// General.
		'agent_name'       => 'Mr. Abb',
		'owner_name'       => 'Abbas ElDeniney',
		'default_language' => 'en',
		'welcome_message'  => "I'm Mr. Abb. Connect your tools and I'll help you run your day from one place.",
		// Voice.
		'voice_enabled'    => 1,
		'agent_id'         => '',
		'session_endpoint' => '/voice/session',
		'sdk_url'          => 'https://cdn.jsdelivr.net/npm/@elevenlabs/client@0.4.5/+esm',
		// API.
		'backend_url'      => '',
		'environment'      => 'development',
		'mock_mode'        => 1,
		// Security.
		'require_auth'     => 1,
		'allowed_roles'    => array( 'administrator' ),
		'debug_logging'    => 0,
		// Appearance.
		'accent_color'     => '#4F1964',
		'density'          => 'comfortable',
	);
}

/**
 * Get all settings merged with defaults.
 *
 * @return array
 */
function mrabb_get_settings() {
	static $cache = null;
	if ( null !== $cache ) {
		return $cache;
	}
	$stored = get_option( MRABB_OPTION, array() );
	if ( ! is_array( $stored ) ) {
		$stored = array();
	}
	$cache = wp_parse_args( $stored, mrabb_default_settings() );
	return $cache;
}

/**
 * Get a single setting.
 *
 * @param string $key     Setting key.
 * @param mixed  $default Fallback value.
 * @return mixed
 */
function mrabb_get_setting( $key, $default = null ) {
	$settings = mrabb_get_settings();
	if ( array_key_exists( $key, $settings ) ) {
		return $settings[ $key ];
	}
	return $default;
}

/**
 * Sanitize the settings array before saving.
 *
 * @param array $input Raw input.
 * @return array
 */
function mrabb_sanitize_settings( $input ) {
	$defaults = mrabb_default_settings();
	$current  = mrabb_get_settings();
	$out      = array();
	$input    = is_array( $input ) ? $input : array();

	$out['agent_name']       = sanitize_text_field( $input['agent_name'] ?? $defaults['agent_name'] );
	$out['owner_name']       = sanitize_text_field( $input['owner_name'] ?? $defaults['owner_name'] );
	$out['default_language'] = in_array( $input['default_language'] ?? 'en', array( 'en', 'ar' ), true ) ? $input['default_language'] : 'en';
	$out['welcome_message']  = sanitize_textarea_field( $input['welcome_message'] ?? $defaults['welcome_message'] );

	$out['voice_enabled']    = empty( $input['voice_enabled'] ) ? 0 : 1;
	$out['agent_id']         = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) ( $input['agent_id'] ?? '' ) );
	$session_endpoint        = trim( (string) ( $input['session_endpoint'] ?? $defaults['session_endpoint'] ) );
	$out['session_endpoint'] = '/' . ltrim( preg_replace( '/[^A-Za-z0-9_\-\/]/', '', $session_endpoint ), '/' );
	$sdk_url                 = esc_url_raw( trim( (string) ( $input['sdk_url'] ?? $defaults['sdk_url'] ) ), array( 'https' ) );
	$out['sdk_url']          = $sdk_url ? $sdk_url : $defaults['sdk_url'];

	$backend_url        = esc_url_raw( trim( (string) ( $input['backend_url'] ?? '' ) ), array( 'https', 'http' ) );
	$out['backend_url'] = $backend_url ? untrailingslashit( $backend_url ) : '';
	$out['environment'] = in_array( $input['environment'] ?? 'development', array( 'development', 'staging', 'production' ), true ) ? $input['environment'] : 'development';
	$out['mock_mode']   = empty( $input['mock_mode'] ) ? 0 : 1;

	$out['require_auth']  = empty( $input['require_auth'] ) ? 0 : 1;
	$roles                = isset( $input['allowed_roles'] ) && is_array( $input['allowed_roles'] ) ? $input['allowed_roles'] : array( 'administrator' );
	$valid_roles          = array_keys( wp_roles()->roles );
	$roles                = array_values( array_intersect( array_map( 'sanitize_key', $roles ), $valid_roles ) );
	$out['allowed_roles'] = empty( $roles ) ? array( 'administrator' ) : $roles;
	$out['debug_logging'] = empty( $input['debug_logging'] ) ? 0 : 1;

	$color               = sanitize_hex_color( $input['accent_color'] ?? $defaults['accent_color'] );
	$out['accent_color'] = $color ? $color : $defaults['accent_color'];
	$out['density']      = in_array( $input['density'] ?? 'comfortable', array( 'comfortable', 'compact' ), true ) ? $input['density'] : 'comfortable';

	// The secret is stored separately so it never travels with the public settings array.
	if ( isset( $input['backend_secret'] ) && ! defined( 'MRABB_BACKEND_SECRET' ) ) {
		$secret = trim( (string) $input['backend_secret'] );
		if ( '' !== $secret && '••••••••' !== $secret ) {
			update_option( MRABB_SECRET_OPTION, $secret, false );
		} elseif ( '' === $secret && ! empty( $input['clear_backend_secret'] ) ) {
			delete_option( MRABB_SECRET_OPTION );
		}
	}

	// Production without HTTPS backend is refused.
	if ( 'production' === $out['environment'] && $out['backend_url'] && 0 !== strpos( $out['backend_url'], 'https://' ) ) {
		add_settings_error( MRABB_OPTION, 'mrabb_https', __( 'Production backends must use HTTPS. The backend URL was not saved.', 'mr-abb' ) );
		$out['backend_url'] = $current['backend_url'];
	}

	return $out;
}

/**
 * Server-side only: the backend secret. Never localize this.
 *
 * @return string
 */
function mrabb_get_backend_secret() {
	if ( defined( 'MRABB_BACKEND_SECRET' ) && MRABB_BACKEND_SECRET ) {
		return (string) MRABB_BACKEND_SECRET;
	}
	return (string) get_option( MRABB_SECRET_OPTION, '' );
}

/**
 * Whether a backend gateway is configured at all.
 *
 * @return bool
 */
function mrabb_backend_configured() {
	return '' !== mrabb_get_setting( 'backend_url', '' );
}

/**
 * Whether the interface runs in mock/demo mode.
 * Mock mode is forced on when no backend is configured so the UI is always usable.
 *
 * @return bool
 */
function mrabb_is_mock_mode() {
	if ( ! mrabb_backend_configured() ) {
		return true;
	}
	return (bool) mrabb_get_setting( 'mock_mode', 1 );
}
