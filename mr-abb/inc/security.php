<?php
/**
 * Access control and hardening.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Can the current user use the command center?
 *
 * @param int|null $user_id User id (defaults to current).
 * @return bool
 */
function mrabb_user_can_access( $user_id = null ) {
	$user_id = $user_id ? (int) $user_id : get_current_user_id();
	if ( ! $user_id ) {
		return ! mrabb_get_setting( 'require_auth', 1 );
	}
	$user = get_userdata( $user_id );
	if ( ! $user ) {
		return false;
	}
	if ( user_can( $user, 'manage_options' ) ) {
		return true;
	}
	$allowed = (array) mrabb_get_setting( 'allowed_roles', array( 'administrator' ) );
	return (bool) array_intersect( $allowed, (array) $user->roles );
}

/**
 * REST permission callback: logged in, allowed role, and a valid cookie nonce
 * (WordPress validates X-WP-Nonce before the callback runs; an invalid nonce
 * leaves the request unauthenticated so this check fails safely).
 *
 * @return bool|WP_Error
 */
function mrabb_rest_permission() {
	if ( ! is_user_logged_in() ) {
		return new WP_Error( 'mrabb_unauthenticated', __( 'Please sign in to talk to Mr. Abb.', 'mr-abb' ), array( 'status' => 401 ) );
	}
	if ( ! mrabb_user_can_access() ) {
		return new WP_Error( 'mrabb_forbidden', __( 'Your account is not allowed to use this interface.', 'mr-abb' ), array( 'status' => 403 ) );
	}
	return true;
}

/**
 * REST permission callback for admin-only routes.
 *
 * @return bool|WP_Error
 */
function mrabb_rest_admin_permission() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return new WP_Error( 'mrabb_forbidden', __( 'Administrators only.', 'mr-abb' ), array( 'status' => 403 ) );
	}
	return true;
}

/**
 * Private pages must not be cached by page caches / CDNs.
 */
function mrabb_send_private_headers() {
	if ( headers_sent() || is_admin() ) {
		return;
	}
	if ( is_user_logged_in() || mrabb_get_setting( 'require_auth', 1 ) ) {
		nocache_headers();
		header( 'Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0' );
	}
	header( 'X-Content-Type-Options: nosniff' );
	header( 'Referrer-Policy: strict-origin-when-cross-origin' );
	header( 'Permissions-Policy: microphone=(self), camera=(), geolocation=()' );
}
add_action( 'send_headers', 'mrabb_send_private_headers' );

/**
 * Tell caching plugins the front-end is dynamic.
 */
function mrabb_disable_page_cache_constants() {
	if ( is_admin() ) {
		return;
	}
	if ( mrabb_get_setting( 'require_auth', 1 ) && ! defined( 'DONOTCACHEPAGE' ) ) {
		define( 'DONOTCACHEPAGE', true );
	}
}
add_action( 'template_redirect', 'mrabb_disable_page_cache_constants', 1 );

/**
 * Keep the login flow inside the theme: failed logins return to the app.
 *
 * @param string $username Username.
 */
function mrabb_login_failed_redirect( $username ) {
	unset( $username );
	$referrer = wp_get_referer();
	if ( $referrer && false === strpos( $referrer, 'wp-login' ) && false === strpos( $referrer, 'wp-admin' ) ) {
		wp_safe_redirect( add_query_arg( 'login', 'failed', remove_query_arg( 'login', $referrer ) ) );
		exit;
	}
}
add_action( 'wp_login_failed', 'mrabb_login_failed_redirect' );

/**
 * Empty username/password submitted from the in-theme form.
 *
 * @param WP_User|WP_Error|null $user     User.
 * @param string                $username Username.
 * @param string                $password Password.
 * @return WP_User|WP_Error|null
 */
function mrabb_authenticate_empty( $user, $username, $password ) {
	if ( ! empty( $_POST['mrabb_login'] ) && ( '' === $username || '' === $password ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing -- wp-login.php handles its own flow.
		$referrer = wp_get_referer();
		if ( $referrer ) {
			wp_safe_redirect( add_query_arg( 'login', 'empty', remove_query_arg( 'login', $referrer ) ) );
			exit;
		}
	}
	return $user;
}
add_filter( 'authenticate', 'mrabb_authenticate_empty', 30, 3 );

/**
 * Remove version leaks and unneeded discovery for a private app.
 */
remove_action( 'wp_head', 'wp_generator' );
remove_action( 'wp_head', 'wlwmanifest_link' );
remove_action( 'wp_head', 'rsd_link' );

/**
 * REST index: hide user enumeration for non-authenticated requests.
 *
 * @param array $endpoints Endpoints.
 * @return array
 */
function mrabb_restrict_user_endpoints( $endpoints ) {
	if ( ! is_user_logged_in() ) {
		unset( $endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
	}
	return $endpoints;
}
add_filter( 'rest_endpoints', 'mrabb_restrict_user_endpoints' );
