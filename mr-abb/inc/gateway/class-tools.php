<?php
/**
 * Tool registry and executor.
 *
 * Every capability Mr. Abb has is a tool: a name, a permission level, a
 * JSON schema for its parameters and a handler. Tools are exposed to
 * Claude (typed commands, automations) and to the ElevenLabs agent
 * (voice, via webhook). Approval-level tools never run without the owner
 * pressing Approve.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Tools {

	private static $tools = array();

	/**
	 * Register a tool.
	 *
	 * @param string $name Dotted name, e.g. calendar.search.
	 * @param array  $def  title, description, level (read|action|approval), connection (connector id or ''),
	 *                     params (JSON schema properties), required (array), handler (callable), card (card type).
	 */
	public static function register( $name, $def ) {
		$def['name']       = $name;
		$def['level']      = isset( $def['level'] ) ? $def['level'] : mrabb_level_for_tool( $name );
		$def['params']     = isset( $def['params'] ) ? $def['params'] : array();
		$def['required']   = isset( $def['required'] ) ? $def['required'] : array();
		$def['connection'] = isset( $def['connection'] ) ? $def['connection'] : '';
		self::$tools[ $name ] = $def;
	}

	public static function all() {
		do_action( 'mrabb_register_tools' );
		return self::$tools;
	}

	public static function get( $name ) {
		self::all();
		return isset( self::$tools[ $name ] ) ? self::$tools[ $name ] : null;
	}

	/** A tool is available when its connection is connected (or it needs none). */
	public static function is_available( $name ) {
		$t = self::get( $name );
		if ( ! $t ) {
			return false;
		}
		if ( '' === $t['connection'] ) {
			return true;
		}
		return MrAbb_Connectors::is_connected( $t['connection'] );
	}

	public static function available() {
		$out = array();
		foreach ( self::all() as $name => $t ) {
			if ( self::is_available( $name ) ) {
				$out[ $name ] = $t;
			}
		}
		return $out;
	}

	/** Claude tool definitions (only available tools). */
	public static function definitions_for_claude() {
		$defs = array();
		foreach ( self::available() as $name => $t ) {
			$defs[] = array(
				'name'         => str_replace( '.', '__', $name ),
				'description'  => $t['description'] . ( 'approval' === $t['level'] ? ' Requires the owner to approve on screen before it runs; after calling it, tell the owner briefly what you prepared and that it is waiting for approval.' : '' ),
				'input_schema' => array(
					'type'                 => 'object',
					'properties'           => empty( $t['params'] ) ? new stdClass() : $t['params'],
					'required'             => array_values( $t['required'] ),
					'additionalProperties' => false,
				),
			);
		}
		return $defs;
	}

	/** Claude uses "__" because tool names cannot contain dots. */
	public static function from_claude_name( $name ) {
		return str_replace( '__', '.', $name );
	}

	/** ElevenLabs webhook tool definitions (paste or sync into the agent). */
	public static function definitions_for_elevenlabs() {
		$hook = rest_url( MRABB_REST_NAMESPACE . '/hooks/tool/' );
		$defs = array();
		foreach ( self::available() as $name => $t ) {
			$props = $t['params'];
			$props['session_id'] = array( 'type' => 'string', 'description' => 'Always pass the value of the mrabb_session_id dynamic variable.' );
			$defs[] = array(
				'type'        => 'webhook',
				'name'        => str_replace( '.', '_', $name ),
				'description' => $t['description'] . ( 'approval' === $t['level'] ? ' This action requires the owner to approve on screen. After calling it, say that it is waiting for approval.' : '' ),
				'api_schema'  => array(
					'url'                 => $hook . str_replace( '.', '_', $name ),
					'method'              => 'POST',
					'request_headers'     => array( 'X-MrAbb-Hook-Secret' => MrAbb_Secrets::hook_secret() ),
					'request_body_schema' => array(
						'type'        => 'object',
						'description' => 'Parameters for ' . $name,
						'properties'  => $props,
						'required'    => array_values( $t['required'] ),
					),
				),
			);
		}
		return $defs;
	}

	/**
	 * Execute a tool with full lifecycle logging.
	 *
	 * @param string $name   Tool name.
	 * @param array  $params Params.
	 * @param array  $ctx    session_id, user_id, source, approved (bool), approval_id.
	 * @return array {status: completed|failed|requires_approval, summary, data, card, approvalId?, events: []}
	 */
	public static function execute( $name, $params, $ctx ) {
		$name   = self::from_claude_name( $name );
		$tool   = self::get( $name );
		$params = is_array( $params ) ? $params : array();
		$ctx    = wp_parse_args( $ctx, array( 'session_id' => '', 'user_id' => 0, 'source' => 'text', 'approved' => false, 'approval_id' => '' ) );
		$events = array();
		$log    = function ( $event ) use ( &$events, $ctx ) {
			$e        = $ctx['session_id'] ? MrAbb_Store::add_event( $ctx['session_id'], $ctx['user_id'], $event ) : $event;
			$events[] = $e;
			return $e;
		};

		if ( ! $tool ) {
			$log( array( 'type' => 'tool', 'id' => 'tool_' . wp_generate_password( 8, false ), 'tool' => $name, 'title' => $name, 'status' => 'failed', 'subtitle' => __( 'Unknown tool', 'mr-abb' ) ) );
			return array( 'status' => 'failed', 'summary' => 'Unknown tool ' . $name, 'events' => $events );
		}
		$tool_event_id = 'tool_' . wp_generate_password( 10, false, false );
		$title         = isset( $tool['title'] ) ? $tool['title'] : $name;
		if ( is_callable( $title ) ) {
			$title = call_user_func( $title, $params );
		}

		if ( ! self::is_available( $name ) ) {
			$conn = MrAbb_Connectors::get( $tool['connection'] );
			$msg  = sprintf( __( '%s is not connected yet.', 'mr-abb' ), $conn ? $conn['name'] : $tool['connection'] );
			$log( array( 'type' => 'tool', 'id' => $tool_event_id, 'tool' => $name, 'title' => $title, 'level' => $tool['level'], 'status' => 'failed', 'subtitle' => $msg ) );
			$log( array( 'type' => 'error', 'message' => sprintf( __( 'Something went wrong while %s.', 'mr-abb' ), mb_strtolower( $title ) ), 'hint' => $msg . ' ' . __( 'Connect it from the Connections page.', 'mr-abb' ), 'details' => array( 'code' => 'connection_missing', 'connection' => $tool['connection'] ), 'retryable' => false ) );
			return array( 'status' => 'failed', 'summary' => $msg, 'events' => $events );
		}

		// Approval gate.
		if ( 'approval' === $tool['level'] && ! $ctx['approved'] ) {
			$details = isset( $tool['details'] ) && is_callable( $tool['details'] ) ? call_user_func( $tool['details'], $params ) : self::default_details( $params );
			$preview = isset( $tool['preview'] ) && is_callable( $tool['preview'] ) ? call_user_func( $tool['preview'], $params ) : '';
			$apr_id  = MrAbb_Store::create_approval( $ctx['session_id'], $ctx['user_id'], $name, $params, $title, $details, $preview );
			$log( array( 'type' => 'tool', 'id' => $tool_event_id, 'tool' => $name, 'title' => $title, 'level' => 'approval', 'status' => 'requires_approval', 'approvalId' => $apr_id ) );
			$log( array( 'type' => 'approval', 'id' => $apr_id, 'tool' => $name, 'title' => $title, 'details' => $details, 'preview' => $preview, 'toolEventId' => $tool_event_id ) );
			update_option( 'mrabb_apr_tool_' . $apr_id, $tool_event_id, false );
			return array( 'status' => 'requires_approval', 'approvalId' => $apr_id, 'summary' => 'Waiting for the owner to approve "' . $title . '" on screen. Do not assume it happened.', 'events' => $events );
		}

		$running_id = $ctx['approval_id'] ? get_option( 'mrabb_apr_tool_' . $ctx['approval_id'], $tool_event_id ) : $tool_event_id;
		$log( array( 'type' => 'tool', 'id' => $running_id, 'tool' => $name, 'title' => $title, 'level' => $tool['level'], 'status' => 'running' ) );

		$result = null;
		try {
			$result = call_user_func( $tool['handler'], $params, $ctx );
		} catch ( Throwable $e ) {
			$result = new WP_Error( 'mrabb_tool_exception', $e->getMessage() );
		}

		if ( is_wp_error( $result ) ) {
			$msg = $result->get_error_message();
			mrabb_log( 'error', 'Tool failed: ' . $name, array( 'error' => $msg ) );
			$log( array( 'type' => 'tool', 'id' => $running_id, 'tool' => $name, 'title' => $title, 'level' => $tool['level'], 'status' => 'failed', 'subtitle' => mb_substr( $msg, 0, 80 ) ) );
			$log( array( 'type' => 'error', 'message' => sprintf( __( 'Something went wrong while %s.', 'mr-abb' ), mb_strtolower( $title ) ), 'hint' => $msg, 'details' => $result->get_error_data(), 'retryable' => true ) );
			return array( 'status' => 'failed', 'summary' => $msg, 'events' => $events );
		}

		$result  = is_array( $result ) ? $result : array( 'summary' => (string) $result );
		$summary = isset( $result['summary'] ) ? $result['summary'] : __( 'Done.', 'mr-abb' );
		$log( array( 'type' => 'tool', 'id' => $running_id, 'tool' => $name, 'title' => $title, 'level' => $tool['level'], 'status' => 'completed', 'subtitle' => isset( $result['subtitle'] ) ? $result['subtitle'] : '' ) );
		if ( ! empty( $result['card'] ) ) {
			$card = $result['card'];
			$log( array( 'type' => 'result', 'tool' => $name, 'cardType' => isset( $card['type'] ) ? $card['type'] : mrabb_card_type_for_tool( $name ), 'title' => isset( $card['title'] ) ? $card['title'] : '', 'data' => isset( $card['data'] ) ? $card['data'] : array(), 'wide' => ! empty( $card['wide'] ) ) );
		}
		return array( 'status' => 'completed', 'summary' => $summary, 'data' => isset( $result['data'] ) ? $result['data'] : null, 'events' => $events );
	}

	private static function default_details( $params ) {
		$out = array();
		foreach ( (array) $params as $k => $v ) {
			if ( is_scalar( $v ) && 'body' !== $k && 'message' !== $k ) {
				$out[ ucfirst( str_replace( '_', ' ', $k ) ) ] = (string) $v;
			}
		}
		return $out;
	}
}

/** Permission level inference mirrored from core.js. */
function mrabb_level_for_tool( $name ) {
	if ( preg_match( '/\.(send|delete|pay|remove|update)/', $name ) ) {
		return 'approval';
	}
	if ( preg_match( '/\.(create|draft|execute|complete|run)/', $name ) ) {
		return 'action';
	}
	return 'read';
}

function mrabb_card_type_for_tool( $name ) {
	$map    = array( 'calendar' => 'calendar', 'tasks' => 'tasks', 'email' => 'email', 'crm' => 'crm', 'drive' => 'documents', 'whatsapp' => 'whatsapp', 'odoo' => 'odoo', 'powerbi' => 'analytics', 'operines' => 'report', 'web' => 'web', 'n8n' => 'automation', 'uipath' => 'automation', 'powerplatform' => 'automation' );
	$prefix = explode( '.', $name )[0];
	return isset( $map[ $prefix ] ) ? $map[ $prefix ] : 'generic';
}
