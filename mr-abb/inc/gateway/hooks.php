<?php
/**
 * Inbound endpoints for external services:
 *  - ElevenLabs server tools  → POST /wp-json/mrabb/v1/hooks/tool/{tool}
 *  - ElevenLabs post-call     → POST /wp-json/mrabb/v1/hooks/elevenlabs
 *  - Google OAuth callback    → GET  /wp-json/mrabb/v1/oauth/google
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** The WordPress user the voice agent acts for. */
function mrabb_owner_user_id() {
	$id = (int) mrabb_get_setting( 'owner_user_id', 0 );
	if ( $id && get_userdata( $id ) ) {
		return $id;
	}
	$admins = get_users( array( 'role' => 'administrator', 'number' => 1, 'orderby' => 'ID', 'order' => 'ASC', 'fields' => 'ID' ) );
	return $admins ? (int) $admins[0] : 0;
}

function mrabb_register_hook_routes() {
	$ns = MRABB_REST_NAMESPACE;

	register_rest_route( $ns, '/hooks/tool/(?P<tool>[A-Za-z0-9_]+)', array(
		'methods'             => WP_REST_Server::CREATABLE,
		'callback'            => 'mrabb_hook_tool',
		'permission_callback' => 'mrabb_hook_permission',
	) );

	register_rest_route( $ns, '/hooks/elevenlabs', array(
		'methods'             => WP_REST_Server::CREATABLE,
		'callback'            => 'mrabb_hook_elevenlabs',
		'permission_callback' => '__return_true', // Signature verified inside.
	) );

	register_rest_route( $ns, '/oauth/google', array(
		'methods'             => WP_REST_Server::READABLE,
		'callback'            => 'mrabb_oauth_google_callback',
		'permission_callback' => '__return_true', // State token verified inside.
	) );
}
add_action( 'rest_api_init', 'mrabb_register_hook_routes' );

/** Shared-secret check for tool webhooks (constant-time). */
function mrabb_hook_permission( WP_REST_Request $request ) {
	$given = (string) $request->get_header( 'x-mrabb-hook-secret' );
	if ( '' === $given ) {
		$auth = (string) $request->get_header( 'authorization' );
		if ( 0 === stripos( $auth, 'Bearer ' ) ) {
			$given = trim( substr( $auth, 7 ) );
		}
	}
	if ( ! MrAbb_Secrets::equals( MrAbb_Secrets::hook_secret(), $given ) ) {
		mrabb_log( 'warn', 'Tool webhook rejected: bad secret' );
		return new WP_Error( 'mrabb_hook_forbidden', 'Invalid webhook secret.', array( 'status' => 403 ) );
	}
	if ( mrabb_is_mock_mode() ) {
		return new WP_Error( 'mrabb_mock', 'Mr. Abb is in demo mode. Turn demo mode off in Settings.', array( 'status' => 409 ) );
	}
	return true;
}

/** Execute a tool on behalf of the voice agent. */
function mrabb_hook_tool( WP_REST_Request $request ) {
	$raw    = $request->get_param( 'tool' );
	$name   = preg_replace( '/_/', '.', $raw, 1 );
	$params = mrabb_clean_json( $request->get_json_params() );
	$params = is_array( $params ) ? $params : array();
	$sid    = isset( $params['session_id'] ) ? (string) $params['session_id'] : '';
	unset( $params['session_id'], $params['conversation_id'] );
	$user_id = mrabb_owner_user_id();
	if ( ! $user_id ) {
		return new WP_Error( 'mrabb_no_owner', 'No owner user configured.', array( 'status' => 500 ) );
	}
	wp_set_current_user( $user_id );

	$session = '';
	if ( 0 === strpos( $sid, 'ses_' ) ) {
		$s = MrAbb_Store::get_session( $sid );
		if ( $s && (int) $s['user_id'] === $user_id ) {
			$session = $sid;
		}
	}
	if ( ! $session ) {
		$active  = MrAbb_Store::active_session( $user_id, 'voice' );
		$session = $active ? $active['id'] : MrAbb_Store::create_session( $user_id, 'voice', __( 'Voice session', 'mr-abb' ) );
	}
	$exec = MrAbb_Tools::execute( $name, $params, array( 'session_id' => $session, 'user_id' => $user_id, 'source' => 'voice', 'language' => mrabb_current_language() ) );
	$out  = array( 'status' => $exec['status'], 'summary' => $exec['summary'] );
	if ( isset( $exec['data'] ) && null !== $exec['data'] ) {
		$out['data'] = $exec['data'];
	}
	if ( ! empty( $exec['approvalId'] ) ) {
		$out['approvalId'] = $exec['approvalId'];
		$out['instruction'] = 'Tell the owner this is waiting for approval on screen. Do not claim it was done.';
	}
	return rest_ensure_response( $out );
}

/** ElevenLabs post-call webhook: store the transcript, close the session. */
function mrabb_hook_elevenlabs( WP_REST_Request $request ) {
	$raw = $request->get_body();
	$sig = (string) $request->get_header( 'elevenlabs-signature' );
	if ( ! MrAbb_ElevenLabs::verify_webhook( $raw, $sig ) ) {
		return new WP_Error( 'mrabb_bad_signature', 'Invalid signature.', array( 'status' => 401 ) );
	}
	$data = json_decode( $raw, true );
	if ( ! is_array( $data ) || empty( $data['type'] ) || 'post_call_transcription' !== $data['type'] ) {
		return rest_ensure_response( array( 'ok' => true, 'ignored' => true ) );
	}
	$d       = isset( $data['data'] ) ? $data['data'] : array();
	$conv    = isset( $d['conversation_id'] ) ? sanitize_text_field( $d['conversation_id'] ) : '';
	$sid     = isset( $d['conversation_initiation_client_data']['dynamic_variables']['mrabb_session_id'] ) ? sanitize_text_field( $d['conversation_initiation_client_data']['dynamic_variables']['mrabb_session_id'] ) : '';
	$user_id = mrabb_owner_user_id();
	$session = $sid ? MrAbb_Store::get_session( $sid ) : null;
	if ( ! $session && $conv ) {
		$session = MrAbb_Store::session_by_conversation( $conv );
	}
	if ( ! $session ) {
		$session = MrAbb_Store::get_session( MrAbb_Store::create_session( $user_id, 'voice', __( 'Voice session', 'mr-abb' ) ) );
	}
	$existing = array();
	foreach ( MrAbb_Store::session_events( $session['id'] ) as $e ) {
		if ( 'transcript' === $e['type'] ) {
			$existing[ $e['role'] . '|' . mb_substr( $e['text'], 0, 60 ) ] = true;
		}
	}
	$first = '';
	foreach ( (array) ( isset( $d['transcript'] ) ? $d['transcript'] : array() ) as $turn ) {
		$text = isset( $turn['message'] ) ? trim( (string) $turn['message'] ) : '';
		if ( '' === $text ) {
			continue;
		}
		$role = isset( $turn['role'] ) && 'user' === $turn['role'] ? 'user' : 'agent';
		if ( 'user' === $role && '' === $first ) {
			$first = $text;
		}
		if ( isset( $existing[ $role . '|' . mb_substr( $text, 0, 60 ) ] ) ) {
			continue;
		}
		MrAbb_Store::add_event( $session['id'], $user_id, array( 'type' => 'transcript', 'role' => $role, 'text' => sanitize_textarea_field( $text ) ) );
	}
	if ( $first ) {
		MrAbb_Store::ensure_session_title( $session['id'], $first );
	}
	MrAbb_Store::update_session( $session['id'], array( 'conversation_id' => $conv, 'status' => 'ended', 'ended_at' => current_time( 'mysql', true ) ) );
	return rest_ensure_response( array( 'ok' => true ) );
}

/** Google OAuth redirect target. */
function mrabb_oauth_google_callback( WP_REST_Request $request ) {
	$code  = (string) $request->get_param( 'code' );
	$state = sanitize_text_field( (string) $request->get_param( 'state' ) );
	$error = (string) $request->get_param( 'error' );
	$back  = admin_url( 'admin.php?page=mrabb-connections' );
	if ( $error || '' === $code ) {
		wp_safe_redirect( add_query_arg( 'mrabb_notice', rawurlencode( $error ? 'Google: ' . $error : 'No code returned' ), $back ) );
		exit;
	}
	$r = MrAbb_Google::handle_callback( $code, $state );
	if ( is_wp_error( $r ) ) {
		wp_safe_redirect( add_query_arg( 'mrabb_notice', rawurlencode( $r->get_error_message() ), $back ) );
		exit;
	}
	wp_safe_redirect( add_query_arg( 'mrabb_notice', rawurlencode( 'Google connected as ' . MrAbb_Google::account_email() ), $back ) );
	exit;
}
