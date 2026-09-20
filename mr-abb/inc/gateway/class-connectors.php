<?php
/**
 * Connector catalogue and webhook connectors.
 *
 * Three connector kinds:
 *  - google   : one OAuth grant covers Calendar, Gmail, Tasks, Drive.
 *  - webhook  : a URL + secret you control (n8n, Make, Power Automate, a
 *               custom API). Mr. Abb POSTs {action, payload} and shows the
 *               JSON you return. WhatsApp, CRM, Odoo, Power BI, UiPath,
 *               Operines and Power Platform all use this kind.
 *  - engine   : Claude (brain + web research) and ElevenLabs (voice).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Connectors {

	const OPTION = 'mrabb_connectors';

	public static function catalog() {
		return array(
			'claude'          => array( 'name' => 'Claude (Anthropic)', 'type' => 'engine', 'icon' => 'AI', 'category' => 'engine', 'description' => __( 'The brain for typed commands, automations and web research.', 'mr-abb' ) ),
			'elevenlabs'      => array( 'name' => 'ElevenLabs Voice', 'type' => 'engine', 'icon' => '11', 'category' => 'engine', 'description' => __( 'Real-time voice conversations with Mr. Abb.', 'mr-abb' ) ),
			'google-calendar' => array( 'name' => 'Google Calendar', 'type' => 'google', 'icon' => 'G', 'category' => 'google', 'description' => __( 'Read and create events, plan your day.', 'mr-abb' ) ),
			'gmail'           => array( 'name' => 'Gmail', 'type' => 'google', 'icon' => 'M', 'category' => 'google', 'description' => __( 'Summaries, drafts and sending with approval.', 'mr-abb' ) ),
			'google-tasks'    => array( 'name' => 'Google Tasks', 'type' => 'google', 'icon' => 'T', 'category' => 'google', 'description' => __( 'Your task list, kept in sync.', 'mr-abb' ) ),
			'google-drive'    => array( 'name' => 'Google Drive', 'type' => 'google', 'icon' => 'D', 'category' => 'google', 'description' => __( 'Find and open documents.', 'mr-abb' ) ),
			'n8n'             => array( 'name' => 'n8n', 'type' => 'webhook', 'icon' => 'n8', 'category' => 'automation', 'description' => __( 'Run workflows on demand. Also the easiest bridge to any other system.', 'mr-abb' ) ),
			'whatsapp'        => array( 'name' => 'WhatsApp', 'type' => 'webhook', 'icon' => 'W', 'category' => 'messaging', 'description' => __( 'Send messages, always with your approval.', 'mr-abb' ) ),
			'crm'             => array( 'name' => 'CRM', 'type' => 'webhook', 'icon' => 'C', 'category' => 'business', 'description' => __( 'Customers, opportunities, pipeline.', 'mr-abb' ) ),
			'operines'        => array( 'name' => 'Operines', 'type' => 'webhook', 'icon' => 'O', 'category' => 'business', 'description' => __( 'Operational data and queries.', 'mr-abb' ) ),
			'odoo'            => array( 'name' => 'Odoo', 'type' => 'webhook', 'icon' => 'Od', 'category' => 'business', 'description' => __( 'ERP records and reports.', 'mr-abb' ) ),
			'power-bi'        => array( 'name' => 'Power BI', 'type' => 'webhook', 'icon' => 'BI', 'category' => 'microsoft', 'description' => __( 'Dashboards and KPIs by voice.', 'mr-abb' ) ),
			'power-platform'  => array( 'name' => 'Microsoft Power Platform', 'type' => 'webhook', 'icon' => 'PP', 'category' => 'microsoft', 'description' => __( 'Trigger Power Automate flows.', 'mr-abb' ) ),
			'uipath'          => array( 'name' => 'UiPath', 'type' => 'webhook', 'icon' => 'Ui', 'category' => 'automation', 'description' => __( 'Trigger RPA processes.', 'mr-abb' ) ),
			'web'             => array( 'name' => 'Web Research', 'type' => 'engine', 'icon' => '⌕', 'category' => 'tools', 'description' => __( 'Search and summarise the web (through Claude).', 'mr-abb' ) ),
		);
	}

	public static function get( $id ) {
		$c = self::catalog();
		return isset( $c[ $id ] ) ? array_merge( array( 'id' => $id ), $c[ $id ] ) : null;
	}

	/** Saved webhook configs (URLs + header names; secrets live in MrAbb_Secrets). */
	public static function configs() {
		$c = get_option( self::OPTION, array() );
		return is_array( $c ) ? $c : array();
	}

	public static function webhook_config( $id ) {
		$all = self::configs();
		$cfg = isset( $all[ $id ] ) && is_array( $all[ $id ] ) ? $all[ $id ] : array();
		return wp_parse_args( $cfg, array( 'url' => '', 'header' => 'Authorization', 'enabled' => 1, 'last_test' => '', 'last_ok' => null ) );
	}

	public static function save_webhook( $id, $url, $secret, $header = 'Authorization' ) {
		$all        = self::configs();
		$all[ $id ] = array_merge( self::webhook_config( $id ), array(
			'url'    => esc_url_raw( trim( $url ), array( 'https', 'http' ) ),
			'header' => preg_replace( '/[^A-Za-z0-9\-]/', '', $header ) ?: 'Authorization',
		) );
		update_option( self::OPTION, $all, false );
		if ( null !== $secret && '••••••••' !== $secret ) {
			MrAbb_Secrets::set( 'connector_' . $id, $secret );
		}
	}

	public static function clear_webhook( $id ) {
		$all = self::configs();
		unset( $all[ $id ] );
		update_option( self::OPTION, $all, false );
		MrAbb_Secrets::delete( 'connector_' . $id );
	}

	public static function status( $id ) {
		$c = self::get( $id );
		if ( ! $c ) {
			return 'not_connected';
		}
		switch ( $c['type'] ) {
			case 'google':
				return MrAbb_Google::is_connected() ? 'connected' : ( MrAbb_Google::configured() ? 'attention' : 'not_connected' );
			case 'webhook':
				$cfg = self::webhook_config( $id );
				if ( '' === $cfg['url'] ) {
					return 'not_connected';
				}
				return false === $cfg['last_ok'] ? 'attention' : 'connected';
			case 'engine':
				if ( 'claude' === $id || 'web' === $id ) {
					return MrAbb_Secrets::has( 'anthropic_api_key' ) ? 'connected' : 'not_connected';
				}
				if ( 'elevenlabs' === $id ) {
					return ( MrAbb_Secrets::has( 'elevenlabs_api_key' ) && mrabb_get_setting( 'agent_id' ) ) ? 'connected' : 'not_connected';
				}
		}
		return 'not_connected';
	}

	public static function is_connected( $id ) {
		return 'connected' === self::status( $id ) || 'attention' === self::status( $id ) && 'webhook' === self::get( $id )['type'];
	}

	/** Shape used by GET /connections. */
	public static function all_with_status() {
		$out = array();
		foreach ( self::catalog() as $id => $c ) {
			$cfg   = 'webhook' === $c['type'] ? self::webhook_config( $id ) : array();
			$out[] = array(
				'id'          => $id,
				'name'        => $c['name'],
				'description' => $c['description'],
				'status'      => self::status( $id ),
				'icon'        => $c['icon'],
				'category'    => $c['category'],
				'type'        => $c['type'],
				'lastSync'    => 'google' === $c['type'] ? MrAbb_Google::last_sync() : ( isset( $cfg['last_test'] ) && $cfg['last_test'] ? $cfg['last_test'] : null ),
			);
		}
		return $out;
	}

	/**
	 * Call a webhook connector.
	 *
	 * POST {url} with JSON { "action": "...", "payload": {...}, "user": {...}, "request_id": "..." }
	 * Auth: header "{header}: Bearer {secret}" (or the raw secret when header is not Authorization).
	 * Expect JSON back. Recognised keys: summary (string), card {type,title,data}, data (any), error (string).
	 *
	 * @return array|WP_Error
	 */
	public static function call( $id, $action, $payload = array(), $user_id = 0 ) {
		$c   = self::get( $id );
		$cfg = self::webhook_config( $id );
		if ( ! $c || 'webhook' !== $c['type'] || '' === $cfg['url'] ) {
			return new WP_Error( 'mrabb_connector_missing', sprintf( __( '%s is not connected.', 'mr-abb' ), $c ? $c['name'] : $id ) );
		}
		$secret  = MrAbb_Secrets::get( 'connector_' . $id );
		$headers = array( 'Content-Type' => 'application/json', 'Accept' => 'application/json', 'X-MrAbb-Site' => home_url( '/' ) );
		if ( $secret ) {
			$headers[ $cfg['header'] ] = 'Authorization' === $cfg['header'] ? 'Bearer ' . $secret : $secret;
		}
		$user = $user_id ? get_userdata( $user_id ) : null;
		$body = array(
			'action'     => $action,
			'service'    => $id,
			'payload'    => $payload,
			'user'       => $user ? array( 'id' => $user->ID, 'name' => $user->display_name, 'email' => $user->user_email ) : null,
			'request_id' => wp_generate_uuid4(),
			'timezone'   => wp_timezone_string(),
		);
		$res = wp_remote_post( $cfg['url'], array( 'timeout' => 40, 'headers' => $headers, 'body' => wp_json_encode( $body ) ) );
		if ( is_wp_error( $res ) ) {
			self::mark( $id, false );
			return new WP_Error( 'mrabb_connector_unreachable', sprintf( __( 'Could not reach %s.', 'mr-abb' ), $c['name'] ), array( 'details' => $res->get_error_message() ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$raw  = wp_remote_retrieve_body( $res );
		$data = json_decode( $raw, true );
		if ( $code < 200 || $code >= 300 ) {
			self::mark( $id, false );
			$msg = is_array( $data ) && ! empty( $data['error'] ) ? $data['error'] : sprintf( __( '%s returned an error (%d).', 'mr-abb' ), $c['name'], $code );
			return new WP_Error( 'mrabb_connector_error', sanitize_text_field( $msg ), array( 'details' => mb_substr( $raw, 0, 500 ) ) );
		}
		self::mark( $id, true );
		if ( is_array( $data ) && ! empty( $data['error'] ) ) {
			return new WP_Error( 'mrabb_connector_error', sanitize_text_field( $data['error'] ) );
		}
		return is_array( $data ) ? $data : array( 'summary' => mb_substr( trim( $raw ), 0, 1000 ) );
	}

	private static function mark( $id, $ok ) {
		$all              = self::configs();
		$all[ $id ]       = isset( $all[ $id ] ) ? $all[ $id ] : array();
		$all[ $id ]['last_test'] = gmdate( 'c' );
		$all[ $id ]['last_ok']   = (bool) $ok;
		update_option( self::OPTION, $all, false );
	}

	public static function test( $id ) {
		$c = self::get( $id );
		if ( ! $c ) {
			return new WP_Error( 'mrabb_unknown', 'Unknown connector' );
		}
		switch ( $c['type'] ) {
			case 'webhook':
				return self::call( $id, 'ping', array(), get_current_user_id() );
			case 'google':
				return MrAbb_Google::test();
			case 'engine':
				if ( 'elevenlabs' === $id ) {
					return MrAbb_ElevenLabs::test();
				}
				return MrAbb_Brain::test();
		}
		return new WP_Error( 'mrabb_unknown', 'Nothing to test' );
	}
}
