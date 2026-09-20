<?php
/**
 * ElevenLabs Conversational AI client (server side only).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_ElevenLabs {

	const BASE = 'https://api.elevenlabs.io';

	public static function configured() {
		return MrAbb_Secrets::has( 'elevenlabs_api_key' ) && '' !== mrabb_get_setting( 'agent_id', '' );
	}

	public static function request( $method, $path, $body = null, $query = array() ) {
		$key = MrAbb_Secrets::get( 'elevenlabs_api_key' );
		if ( '' === $key ) {
			return new WP_Error( 'mrabb_elevenlabs_key', __( 'Add your ElevenLabs API key in Mr. Abb → Connections.', 'mr-abb' ) );
		}
		$url = self::BASE . $path;
		if ( $query ) {
			$url = add_query_arg( array_map( 'rawurlencode', $query ), $url );
		}
		$args = array( 'method' => $method, 'timeout' => 30, 'headers' => array( 'xi-api-key' => $key, 'Accept' => 'application/json', 'Content-Type' => 'application/json' ) );
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}
		$res = wp_remote_request( $url, $args );
		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'mrabb_elevenlabs_unreachable', __( 'Could not reach ElevenLabs.', 'mr-abb' ), array( 'details' => $res->get_error_message() ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$raw  = wp_remote_retrieve_body( $res );
		$data = json_decode( $raw, true );
		if ( $code >= 400 ) {
			$msg = isset( $data['detail']['message'] ) ? $data['detail']['message'] : ( isset( $data['detail'] ) && is_string( $data['detail'] ) ? $data['detail'] : 'ElevenLabs error ' . $code );
			mrabb_log( 'error', 'ElevenLabs error', array( 'path' => $path, 'code' => $code, 'msg' => $msg ) );
			return new WP_Error( 'mrabb_elevenlabs_error', sanitize_text_field( $msg ), array( 'status' => $code, 'details' => mb_substr( $raw, 0, 500 ) ) );
		}
		return is_array( $data ) ? $data : array();
	}

	/** Short-lived signed WebSocket URL for the configured agent. */
	public static function signed_url() {
		$agent = mrabb_get_setting( 'agent_id', '' );
		if ( '' === $agent ) {
			return new WP_Error( 'mrabb_voice_unconfigured', __( 'Add your ElevenLabs Agent ID in Mr. Abb → Settings → Voice.', 'mr-abb' ) );
		}
		$r = self::request( 'GET', '/v1/convai/conversation/get-signed-url', null, array( 'agent_id' => $agent ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		if ( empty( $r['signed_url'] ) ) {
			return new WP_Error( 'mrabb_elevenlabs_error', __( 'ElevenLabs did not return a signed URL.', 'mr-abb' ) );
		}
		return $r['signed_url'];
	}

	public static function get_agent() {
		$agent = mrabb_get_setting( 'agent_id', '' );
		return $agent ? self::request( 'GET', '/v1/convai/agents/' . rawurlencode( $agent ) ) : new WP_Error( 'mrabb_voice_unconfigured', __( 'No Agent ID set.', 'mr-abb' ) );
	}

	public static function test() {
		$a = self::get_agent();
		if ( is_wp_error( $a ) ) {
			return $a;
		}
		return array( 'summary' => sprintf( 'Agent "%s" reachable.', isset( $a['name'] ) ? $a['name'] : mrabb_get_setting( 'agent_id' ) ) );
	}

	/**
	 * Create/update webhook tools on ElevenLabs and attach them to the agent.
	 * Best effort: returns a report; on API shape changes it explains what to paste manually.
	 */
	public static function sync_tools() {
		$agent_id = mrabb_get_setting( 'agent_id', '' );
		if ( '' === $agent_id ) {
			return new WP_Error( 'mrabb_voice_unconfigured', __( 'Set the Agent ID first.', 'mr-abb' ) );
		}
		$existing = self::request( 'GET', '/v1/convai/tools' );
		if ( is_wp_error( $existing ) ) {
			return $existing;
		}
		$by_name = array();
		foreach ( (array) ( isset( $existing['tools'] ) ? $existing['tools'] : array() ) as $t ) {
			$n = isset( $t['tool_config']['name'] ) ? $t['tool_config']['name'] : '';
			if ( $n && isset( $t['id'] ) ) {
				$by_name[ $n ] = $t['id'];
			}
		}
		$ids    = array();
		$report = array( 'created' => 0, 'updated' => 0, 'errors' => array() );
		foreach ( MrAbb_Tools::definitions_for_elevenlabs() as $def ) {
			if ( isset( $by_name[ $def['name'] ] ) ) {
				$r = self::request( 'PATCH', '/v1/convai/tools/' . rawurlencode( $by_name[ $def['name'] ] ), array( 'tool_config' => $def ) );
				if ( is_wp_error( $r ) ) {
					$report['errors'][] = $def['name'] . ': ' . $r->get_error_message();
					$ids[] = $by_name[ $def['name'] ];
					continue;
				}
				$ids[] = $by_name[ $def['name'] ];
				$report['updated']++;
			} else {
				$r = self::request( 'POST', '/v1/convai/tools', array( 'tool_config' => $def ) );
				if ( is_wp_error( $r ) || empty( $r['id'] ) ) {
					$report['errors'][] = $def['name'] . ': ' . ( is_wp_error( $r ) ? $r->get_error_message() : 'no id returned' );
					continue;
				}
				$ids[] = $r['id'];
				$report['created']++;
			}
		}
		$agent = self::get_agent();
		if ( is_wp_error( $agent ) ) {
			return $agent;
		}
		$current = isset( $agent['conversation_config']['agent']['prompt']['tool_ids'] ) ? (array) $agent['conversation_config']['agent']['prompt']['tool_ids'] : array();
		$merged  = array_values( array_unique( array_merge( $current, $ids ) ) );
		$patch   = self::request( 'PATCH', '/v1/convai/agents/' . rawurlencode( $agent_id ), array( 'conversation_config' => array( 'agent' => array( 'prompt' => array( 'tool_ids' => $merged ) ) ) ) );
		if ( is_wp_error( $patch ) ) {
			$report['errors'][] = 'attach: ' . $patch->get_error_message();
		} else {
			update_option( 'mrabb_elevenlabs_synced', array( 'at' => gmdate( 'c' ), 'tools' => count( $ids ) ), false );
		}
		$report['attached'] = count( $ids );
		return $report;
	}

	/** Verify the post-call webhook signature (ElevenLabs-Signature: t=...,v0=...). */
	public static function verify_webhook( $raw_body, $signature_header ) {
		$secret = MrAbb_Secrets::get( 'elevenlabs_webhook_secret' );
		if ( '' === $secret ) {
			return false;
		}
		$parts = array();
		foreach ( explode( ',', (string) $signature_header ) as $kv ) {
			$p = explode( '=', $kv, 2 );
			if ( 2 === count( $p ) ) {
				$parts[ trim( $p[0] ) ] = trim( $p[1] );
			}
		}
		if ( empty( $parts['t'] ) || empty( $parts['v0'] ) ) {
			return false;
		}
		if ( abs( time() - (int) $parts['t'] ) > 30 * MINUTE_IN_SECONDS ) {
			return false;
		}
		$expected = hash_hmac( 'sha256', $parts['t'] . '.' . $raw_body, $secret );
		return hash_equals( $expected, $parts['v0'] );
	}

	/** Suggested agent system prompt (shown in the admin for copy/paste). */
	public static function suggested_prompt() {
		$owner = mrabb_get_setting( 'owner_name', 'Abbas ElDeniney' );
		$agent = mrabb_get_setting( 'agent_name', 'Mr. Abb' );
		$tz    = wp_timezone_string();
		return "You are {$agent}, the personal AI command center of {$owner}. You speak naturally in English and Egyptian Arabic; reply in the language the user speaks. Be concise and executive: short spoken sentences, no lists read aloud. Timezone: {$tz}. Use the tools to actually do things instead of guessing; results are shown on screen as cards, so summarise them instead of reading every detail. Always pass session_id = {{mrabb_session_id}} to every tool. Some tools require the owner's approval: when a tool returns requires_approval, say what you prepared and that it is waiting for approval on screen, then wait; never claim something was sent unless the tool confirmed it. If a tool fails or a service is not connected, say so plainly and suggest connecting it on the Connections page.";
	}
}
