<?php
/**
 * Backend gateway client.
 *
 * Every call to the secure backend (api.eldeniney.me or whatever is configured)
 * goes through this class. The browser never talks to the backend directly and
 * never sees the backend secret: it calls the theme's REST routes, which
 * validate the WordPress session, then forward the request from the server.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class MrAbb_Gateway
 */
class MrAbb_Gateway {

	/**
	 * Allowlisted backend routes. Anything else is refused before leaving WordPress.
	 * A trailing "*" segment matches one path segment (ids).
	 *
	 * @var array
	 */
	private static $allowed = array(
		'GET /health',
		'POST /voice/session',
		'POST /agent/message',
		'POST /tools/execute',
		'POST /approvals/*/approve',
		'POST /approvals/*/reject',
		'GET /activity',
		'GET /connections',
		'POST /connections/*/connect',
		'POST /connections/*/disconnect',
		'GET /profile/context',
		'GET /history',
		'GET /history/*',
		'GET /tasks',
		'POST /tasks',
		'POST /tasks/*/complete',
		'GET /automations',
		'POST /automations/*/toggle',
		'POST /automations/*/run',
	);

	/**
	 * Is this method + path allowed?
	 *
	 * @param string $method HTTP method.
	 * @param string $path   Path starting with "/".
	 * @return bool
	 */
	public static function is_allowed( $method, $path ) {
		$method = strtoupper( $method );
		$path   = '/' . ltrim( $path, '/' );
		if ( false !== strpos( $path, '..' ) || false !== strpos( $path, '?' ) ) {
			return false;
		}
		foreach ( self::$allowed as $rule ) {
			list( $rule_method, $rule_path ) = explode( ' ', $rule, 2 );
			if ( $rule_method !== $method ) {
				continue;
			}
			$regex = '#^' . str_replace( '\*', '[A-Za-z0-9_\-]+', preg_quote( $rule_path, '#' ) ) . '/?$#';
			if ( preg_match( $regex, $path ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Perform a request against the backend.
	 *
	 * @param string     $method HTTP method.
	 * @param string     $path   Backend path (e.g. /voice/session).
	 * @param array|null $body   JSON body for POST.
	 * @param array      $query  Query string params for GET.
	 * @return array|WP_Error Decoded JSON on success.
	 */
	public static function request( $method, $path, $body = null, $query = array() ) {
		if ( ! mrabb_backend_configured() ) {
			return new WP_Error( 'mrabb_no_backend', __( 'The backend is not configured yet. Mr. Abb is running in demo mode.', 'mr-abb' ), array( 'status' => 503 ) );
		}
		if ( ! self::is_allowed( $method, $path ) ) {
			mrabb_log( 'warn', 'Refused non-allowlisted backend path', array( 'method' => $method, 'path' => $path ) );
			return new WP_Error( 'mrabb_path_not_allowed', __( 'That request is not permitted.', 'mr-abb' ), array( 'status' => 400 ) );
		}

		$base = mrabb_get_setting( 'backend_url', '' );
		$url  = $base . '/' . ltrim( $path, '/' );
		if ( ! empty( $query ) ) {
			$url = add_query_arg( array_map( 'rawurlencode', array_map( 'strval', $query ) ), $url );
		}

		$user    = wp_get_current_user();
		$headers = array(
			'Accept'            => 'application/json',
			'Content-Type'      => 'application/json',
			'X-MrAbb-Site'      => home_url( '/' ),
			'X-MrAbb-User-Id'   => (string) $user->ID,
			'X-MrAbb-User'      => $user->user_email,
			'X-MrAbb-Language'  => mrabb_current_language(),
			'X-Request-Id'      => wp_generate_uuid4(),
			'X-MrAbb-Version'   => MRABB_VERSION,
		);
		$secret = mrabb_get_backend_secret();
		if ( $secret ) {
			$headers['Authorization'] = 'Bearer ' . $secret;
		}

		$args = array(
			'method'      => strtoupper( $method ),
			'timeout'     => 25,
			'redirection' => 0,
			'headers'     => $headers,
			'sslverify'   => 'production' === mrabb_get_setting( 'environment' ) ? true : apply_filters( 'mrabb_sslverify', true ),
		);
		if ( null !== $body && 'GET' !== $args['method'] ) {
			$args['body'] = wp_json_encode( $body );
		}

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			mrabb_log( 'error', 'Backend transport error', array( 'path' => $path, 'error' => $response->get_error_message() ) );
			return new WP_Error( 'mrabb_backend_unreachable', __( 'Mr. Abb could not reach the backend.', 'mr-abb' ), array( 'status' => 502, 'details' => $response->get_error_message() ) );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		$raw  = wp_remote_retrieve_body( $response );
		$data = json_decode( $raw, true );

		if ( $code < 200 || $code >= 300 ) {
			mrabb_log( 'error', 'Backend returned an error', array( 'path' => $path, 'code' => $code ) );
			$message = is_array( $data ) && ! empty( $data['message'] ) ? sanitize_text_field( $data['message'] ) : __( 'The backend returned an error.', 'mr-abb' );
			return new WP_Error( 'mrabb_backend_error', $message, array( 'status' => $code >= 400 && $code < 600 ? $code : 502, 'details' => is_array( $data ) ? $data : mb_substr( $raw, 0, 500 ) ) );
		}

		if ( null === $data && '' !== trim( $raw ) ) {
			return new WP_Error( 'mrabb_backend_invalid', __( 'The backend sent a response Mr. Abb could not read.', 'mr-abb' ), array( 'status' => 502 ) );
		}

		mrabb_log( 'info', 'Backend call', array( 'path' => $path, 'code' => $code ) );
		return is_array( $data ) ? $data : array();
	}

	/**
	 * Health check used by the admin screen.
	 *
	 * @return array
	 */
	public static function health() {
		if ( ! mrabb_backend_configured() ) {
			return array(
				'ok'      => false,
				'state'   => 'unconfigured',
				'message' => __( 'No backend URL configured. Demo mode is active.', 'mr-abb' ),
			);
		}
		$result = self::request( 'GET', '/health' );
		if ( is_wp_error( $result ) ) {
			return array(
				'ok'      => false,
				'state'   => 'error',
				'message' => $result->get_error_message(),
			);
		}
		return array(
			'ok'      => true,
			'state'   => 'connected',
			'message' => __( 'Backend reachable.', 'mr-abb' ),
			'data'    => $result,
		);
	}
}
