<?php
/**
 * REST routes under /wp-json/mrabb/v1.
 *
 * All routes except /manifest require an authenticated, allowed user.
 * Cookie authentication needs the X-WP-Nonce header, which the frontend sends.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register routes.
 */
function mrabb_register_rest_routes() {
	$ns = MRABB_REST_NAMESPACE;

	register_rest_route(
		$ns,
		'/manifest',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => 'mrabb_rest_manifest',
			'permission_callback' => '__return_true',
		)
	);

	register_rest_route(
		$ns,
		'/config',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => function () {
				return rest_ensure_response( mrabb_frontend_config() );
			},
			'permission_callback' => 'mrabb_rest_permission',
		)
	);

	register_rest_route(
		$ns,
		'/preferences',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mrabb_rest_preferences',
			'permission_callback' => 'mrabb_rest_permission',
			'args'                => array(
				'language' => array(
					'type'              => 'string',
					'enum'              => array( 'en', 'ar' ),
					'sanitize_callback' => 'sanitize_key',
				),
			),
		)
	);

	register_rest_route(
		$ns,
		'/status',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => function () {
				return rest_ensure_response( MrAbb_Gateway::health() );
			},
			'permission_callback' => 'mrabb_rest_admin_permission',
		)
	);

	register_rest_route(
		$ns,
		'/logs',
		array(
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => 'mrabb_rest_client_log',
				'permission_callback' => 'mrabb_rest_permission',
			),
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function () {
					return rest_ensure_response( mrabb_get_logs() );
				},
				'permission_callback' => 'mrabb_rest_admin_permission',
			),
		)
	);

	// Voice session: the browser asks WordPress, WordPress asks the backend
	// for a short-lived signed ElevenLabs URL / conversation token.
	register_rest_route(
		$ns,
		'/voice/session',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'mrabb_rest_voice_session',
			'permission_callback' => 'mrabb_rest_permission',
		)
	);

	// Generic proxied routes. Each maps 1:1 to an allowlisted backend path.
	$proxied = array(
		array( 'POST', '/agent/message', '/agent/message' ),
		array( 'POST', '/tools/execute', '/tools/execute' ),
		array( 'POST', '/approvals/(?P<id>[A-Za-z0-9_\-]+)/approve', '/approvals/{id}/approve' ),
		array( 'POST', '/approvals/(?P<id>[A-Za-z0-9_\-]+)/reject', '/approvals/{id}/reject' ),
		array( 'GET', '/activity', '/activity' ),
		array( 'GET', '/connections', '/connections' ),
		array( 'POST', '/connections/(?P<id>[A-Za-z0-9_\-]+)/connect', '/connections/{id}/connect' ),
		array( 'POST', '/connections/(?P<id>[A-Za-z0-9_\-]+)/disconnect', '/connections/{id}/disconnect' ),
		array( 'GET', '/profile/context', '/profile/context' ),
		array( 'GET', '/history', '/history' ),
		array( 'GET', '/history/(?P<id>[A-Za-z0-9_\-]+)', '/history/{id}' ),
		array( 'GET', '/tasks', '/tasks' ),
		array( 'POST', '/tasks', '/tasks' ),
		array( 'POST', '/tasks/(?P<id>[A-Za-z0-9_\-]+)/complete', '/tasks/{id}/complete' ),
		array( 'GET', '/automations', '/automations' ),
		array( 'POST', '/automations/(?P<id>[A-Za-z0-9_\-]+)/toggle', '/automations/{id}/toggle' ),
		array( 'POST', '/automations/(?P<id>[A-Za-z0-9_\-]+)/run', '/automations/{id}/run' ),
	);

	foreach ( $proxied as $route ) {
		list( $method, $pattern, $backend_path ) = $route;
		register_rest_route(
			$ns,
			$pattern,
			array(
				'methods'             => $method,
				'callback'            => function ( WP_REST_Request $request ) use ( $method, $backend_path ) {
					return mrabb_rest_proxy( $request, $method, $backend_path );
				},
				'permission_callback' => 'mrabb_rest_permission',
			)
		);
	}
}
add_action( 'rest_api_init', 'mrabb_register_rest_routes' );

/**
 * Forward a REST request to the backend.
 *
 * @param WP_REST_Request $request      Request.
 * @param string          $method       Method.
 * @param string          $backend_path Path template with {id}.
 * @return WP_REST_Response|WP_Error
 */
function mrabb_rest_proxy( WP_REST_Request $request, $method, $backend_path ) {
	$id = $request->get_param( 'id' );
	if ( null !== $id ) {
		$backend_path = str_replace( '{id}', rawurlencode( sanitize_text_field( $id ) ), $backend_path );
	}
	$body  = 'GET' === $method ? null : mrabb_clean_json( $request->get_json_params() );
	$query = 'GET' === $method ? mrabb_clean_query( $request->get_query_params() ) : array();

	$result = MrAbb_Gateway::request( $method, $backend_path, $body, $query );
	if ( is_wp_error( $result ) ) {
		return mrabb_rest_error( $result );
	}
	return rest_ensure_response( $result );
}

/**
 * Turn a WP_Error into a REST error, hiding details unless debug mode is on.
 *
 * @param WP_Error $error Error.
 * @return WP_Error
 */
function mrabb_rest_error( WP_Error $error ) {
	$data   = $error->get_error_data();
	$status = is_array( $data ) && isset( $data['status'] ) ? (int) $data['status'] : 500;
	$out    = array( 'status' => $status );
	if ( mrabb_get_setting( 'debug_logging', 0 ) && is_array( $data ) && isset( $data['details'] ) ) {
		$out['details'] = $data['details'];
	}
	return new WP_Error( $error->get_error_code(), $error->get_error_message(), $out );
}

/**
 * Recursively sanitize a JSON body (strings only; structure preserved).
 *
 * @param mixed $value Value.
 * @param int   $depth Depth guard.
 * @return mixed
 */
function mrabb_clean_json( $value, $depth = 0 ) {
	if ( $depth > 8 ) {
		return null;
	}
	if ( is_array( $value ) ) {
		$out = array();
		foreach ( $value as $k => $v ) {
			$out[ is_int( $k ) ? $k : sanitize_text_field( (string) $k ) ] = mrabb_clean_json( $v, $depth + 1 );
		}
		return $out;
	}
	if ( is_string( $value ) ) {
		return wp_kses_post( wp_unslash( $value ) ) === $value ? $value : sanitize_textarea_field( $value );
	}
	return $value;
}

/**
 * Sanitize query params for GET proxies.
 *
 * @param array $params Params.
 * @return array
 */
function mrabb_clean_query( $params ) {
	$out = array();
	foreach ( (array) $params as $k => $v ) {
		if ( in_array( $k, array( '_wpnonce', '_locale', 'rest_route' ), true ) ) {
			continue;
		}
		if ( is_scalar( $v ) ) {
			$out[ sanitize_key( $k ) ] = sanitize_text_field( (string) $v );
		}
	}
	return $out;
}

/**
 * Voice session handshake.
 *
 * Mock mode: returns { mode: "mock" } so the browser starts the demo agent.
 * Live mode: asks the backend for a signed ElevenLabs URL or conversation token.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function mrabb_rest_voice_session( WP_REST_Request $request ) {
	if ( ! mrabb_get_setting( 'voice_enabled', 1 ) ) {
		return new WP_Error( 'mrabb_voice_disabled', __( 'Voice is turned off in settings.', 'mr-abb' ), array( 'status' => 409 ) );
	}
	if ( mrabb_is_mock_mode() ) {
		return rest_ensure_response(
			array(
				'mode'      => 'mock',
				'agentId'   => mrabb_get_setting( 'agent_id', '' ),
				'expiresAt' => gmdate( 'c', time() + 600 ),
			)
		);
	}
	$params = mrabb_clean_json( $request->get_json_params() );
	$body   = array(
		'agentId'  => mrabb_get_setting( 'agent_id', '' ),
		'language' => isset( $params['language'] ) && in_array( $params['language'], array( 'en', 'ar' ), true ) ? $params['language'] : mrabb_current_language(),
		'user'     => array(
			'id'    => get_current_user_id(),
			'name'  => wp_get_current_user()->display_name,
			'email' => wp_get_current_user()->user_email,
		),
		'timezone' => wp_timezone_string(),
	);
	$result = MrAbb_Gateway::request( 'POST', mrabb_get_setting( 'session_endpoint', '/voice/session' ), $body );
	if ( is_wp_error( $result ) ) {
		return mrabb_rest_error( $result );
	}
	// Only pass through the fields the browser needs.
	$out = array(
		'mode'      => 'live',
		'agentId'   => isset( $result['agentId'] ) ? sanitize_text_field( $result['agentId'] ) : mrabb_get_setting( 'agent_id', '' ),
		'expiresAt' => isset( $result['expiresAt'] ) ? sanitize_text_field( $result['expiresAt'] ) : null,
	);
	if ( ! empty( $result['signedUrl'] ) ) {
		$out['signedUrl'] = esc_url_raw( $result['signedUrl'], array( 'wss', 'https' ) );
	}
	if ( ! empty( $result['conversationToken'] ) ) {
		$out['conversationToken'] = sanitize_text_field( $result['conversationToken'] );
	}
	if ( ! empty( $result['sessionId'] ) ) {
		$out['sessionId'] = sanitize_text_field( $result['sessionId'] );
	}
	if ( isset( $result['dynamicVariables'] ) && is_array( $result['dynamicVariables'] ) ) {
		$out['dynamicVariables'] = mrabb_clean_json( $result['dynamicVariables'] );
	}
	return rest_ensure_response( $out );
}

/**
 * Save per-user preferences (language).
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function mrabb_rest_preferences( WP_REST_Request $request ) {
	$language = $request->get_param( 'language' );
	if ( in_array( $language, array( 'en', 'ar' ), true ) ) {
		update_user_meta( get_current_user_id(), 'mrabb_language', $language );
	}
	return rest_ensure_response( array( 'ok' => true, 'language' => $language ) );
}

/**
 * Client-side log sink (debug mode only).
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function mrabb_rest_client_log( WP_REST_Request $request ) {
	if ( ! mrabb_get_setting( 'debug_logging', 0 ) ) {
		return rest_ensure_response( array( 'ok' => false, 'reason' => 'debug_off' ) );
	}
	$params  = mrabb_clean_json( $request->get_json_params() );
	$level   = isset( $params['level'] ) ? sanitize_key( $params['level'] ) : 'info';
	$message = isset( $params['message'] ) ? sanitize_text_field( $params['message'] ) : '';
	$context = isset( $params['context'] ) && is_array( $params['context'] ) ? $params['context'] : array();
	mrabb_log( $level, '[client] ' . $message, $context );
	return rest_ensure_response( array( 'ok' => true ) );
}

/**
 * Minimal web app manifest so the site can become a PWA later.
 *
 * @return WP_REST_Response
 */
function mrabb_rest_manifest() {
	$accent   = mrabb_get_setting( 'accent_color', '#4F1964' );
	$manifest = array(
		'name'             => mrabb_get_setting( 'agent_name', 'Mr. Abb' ) . ' — AI Command Center',
		'short_name'       => mrabb_get_setting( 'agent_name', 'Mr. Abb' ),
		'start_url'        => home_url( '/' ),
		'scope'            => home_url( '/' ),
		'display'          => 'standalone',
		'background_color' => '#FAF9F7',
		'theme_color'      => $accent,
		'lang'             => mrabb_get_setting( 'default_language', 'en' ),
		'dir'              => 'ar' === mrabb_get_setting( 'default_language', 'en' ) ? 'rtl' : 'ltr',
		'icons'            => array(
			array(
				'src'     => MRABB_URI . 'assets/images/icon.svg',
				'sizes'   => 'any',
				'type'    => 'image/svg+xml',
				'purpose' => 'any',
			),
			array(
				'src'     => MRABB_URI . 'assets/images/icon-512.png',
				'sizes'   => '512x512',
				'type'    => 'image/png',
				'purpose' => 'any maskable',
			),
		),
	);
	$response = rest_ensure_response( $manifest );
	$response->header( 'Content-Type', 'application/manifest+json; charset=utf-8' );
	return $response;
}
