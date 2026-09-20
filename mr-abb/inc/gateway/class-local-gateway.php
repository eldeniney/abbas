<?php
/**
 * Built-in gateway: implements the backend contract inside WordPress.
 * Same routes, same shapes as docs/backend-api-contract.md, so an external
 * backend can replace it later without touching the frontend.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Local_Gateway {

	/**
	 * Dispatch a contract route.
	 *
	 * @return array|WP_Error
	 */
	public static function handle( $method, $path, $body, $query, $user_id ) {
		$method = strtoupper( $method );
		$path   = '/' . trim( $path, '/' );
		$body   = is_array( $body ) ? $body : array();
		$query  = is_array( $query ) ? $query : array();
		$lang   = mrabb_current_language();
		$m      = array();

		if ( 'GET /health' === "$method $path" ) {
			return array( 'ok' => true, 'version' => MRABB_VERSION, 'gateway' => 'builtin' );
		}
		if ( 'POST /voice/session' === "$method $path" || ( 'POST' === $method && $path === mrabb_get_setting( 'session_endpoint', '/voice/session' ) ) ) {
			return self::voice_session( $body, $user_id, $lang );
		}
		if ( 'POST /agent/message' === "$method $path" ) {
			return self::agent_message( $body, $user_id, $lang );
		}
		if ( 'POST /tools/execute' === "$method $path" ) {
			$session = self::session_for( $user_id, isset( $body['sessionId'] ) ? $body['sessionId'] : '', 'text' );
			$exec    = MrAbb_Tools::execute( isset( $body['tool'] ) ? $body['tool'] : '', isset( $body['params'] ) ? $body['params'] : array(), array( 'session_id' => $session, 'user_id' => $user_id, 'source' => 'text', 'language' => $lang ) );
			return array( 'status' => $exec['status'], 'summary' => $exec['summary'], 'events' => $exec['events'], 'session' => array( 'id' => $session ) );
		}
		if ( preg_match( '#^/approvals/([A-Za-z0-9_\-]+)/(approve|reject)$#', $path, $m ) && 'POST' === $method ) {
			return self::approval( $m[1], 'approve' === $m[2], $user_id, $lang );
		}
		if ( 'GET /activity' === "$method $path" ) {
			return self::activity( $query, $user_id );
		}
		if ( 'GET /connections' === "$method $path" ) {
			return array( 'data' => MrAbb_Connectors::all_with_status() );
		}
		if ( preg_match( '#^/connections/([A-Za-z0-9_\-]+)/(connect|disconnect)$#', $path, $m ) && 'POST' === $method ) {
			return self::connection_action( $m[1], $m[2], $user_id );
		}
		if ( 'GET /profile/context' === "$method $path" ) {
			return self::context( $user_id );
		}
		if ( 'GET /history' === "$method $path" ) {
			return self::history( $user_id );
		}
		if ( preg_match( '#^/history/([A-Za-z0-9_\-]+)$#', $path, $m ) && 'GET' === $method ) {
			return self::session_detail( $m[1], $user_id );
		}
		if ( 'GET /tasks' === "$method $path" ) {
			return self::tasks( $user_id );
		}
		if ( 'POST /tasks' === "$method $path" ) {
			$id = MrAbb_Store::add_task( $user_id, isset( $body['title'] ) ? $body['title'] : '', ! empty( $body['date'] ) ? gmdate( 'Y-m-d 00:00:00', strtotime( $body['date'] ) ) : null, isset( $body['time'] ) ? $body['time'] : '', 'manual', isset( $body['priority'] ) ? $body['priority'] : 'medium' );
			return array( 'ok' => true, 'id' => $id );
		}
		if ( preg_match( '#^/tasks/([A-Za-z0-9_\-]+)/complete$#', $path, $m ) && 'POST' === $method ) {
			return self::complete_task( $m[1], $user_id );
		}
		if ( 'GET /automations' === "$method $path" ) {
			return array( 'automations' => MrAbb_Cron::automations_for_ui() );
		}
		if ( 'POST /automations' === "$method $path" ) {
			$a = MrAbb_Cron::create( isset( $body['name'] ) ? $body['name'] : '', isset( $body['schedule'] ) ? $body['schedule'] : '', isset( $body['prompt'] ) ? $body['prompt'] : '' );
			return is_wp_error( $a ) ? $a : array( 'ok' => true, 'automation' => $a );
		}
		if ( preg_match( '#^/automations/([A-Za-z0-9_\-]+)/(toggle|run)$#', $path, $m ) && 'POST' === $method ) {
			if ( 'toggle' === $m[2] ) {
				return MrAbb_Cron::toggle( $m[1], ! empty( $body['enabled'] ) );
			}
			return MrAbb_Cron::run_now( $m[1] );
		}
		return new WP_Error( 'mrabb_not_found', __( 'Unknown gateway route.', 'mr-abb' ), array( 'status' => 404 ) );
	}

	private static function session_for( $user_id, $session_id, $mode ) {
		if ( $session_id && 0 === strpos( $session_id, 'ses_' ) ) {
			$s = MrAbb_Store::get_session( $session_id );
			if ( $s && (int) $s['user_id'] === (int) $user_id ) {
				return $session_id;
			}
		}
		// No known session id: this is a fresh conversation (page load or "New Session").
		return MrAbb_Store::create_session( $user_id, $mode );
	}

	private static function voice_session( $body, $user_id, $lang ) {
		if ( ! MrAbb_ElevenLabs::configured() ) {
			return new WP_Error( 'mrabb_voice_unconfigured', __( 'Voice is not set up yet: add the ElevenLabs API key and Agent ID in Mr. Abb → Connections. You can still type commands.', 'mr-abb' ), array( 'status' => 409 ) );
		}
		$url = MrAbb_ElevenLabs::signed_url();
		if ( is_wp_error( $url ) ) {
			return $url;
		}
		$user    = get_userdata( $user_id );
		$session = MrAbb_Store::create_session( $user_id, 'voice', '' );
		return array(
			'signedUrl'        => $url,
			'agentId'          => mrabb_get_setting( 'agent_id', '' ),
			'sessionId'        => $session,
			'expiresAt'        => gmdate( 'c', time() + 900 ),
			'dynamicVariables' => array(
				'mrabb_session_id' => $session,
				'user_name'        => $user ? ( $user->first_name ? $user->first_name : $user->display_name ) : mrabb_owner_first_name(),
				'language'         => $lang,
				'timezone'         => wp_timezone_string(),
				'today'            => wp_date( 'l j F Y' ),
			),
		);
	}

	private static function agent_message( $body, $user_id, $lang ) {
		if ( ! MrAbb_Brain::configured() ) {
			return new WP_Error( 'mrabb_brain_unconfigured', __( 'Typed commands need an Anthropic API key. Add it in Mr. Abb → Connections.', 'mr-abb' ), array( 'status' => 409 ) );
		}
		$text = isset( $body['text'] ) ? trim( (string) $body['text'] ) : '';
		if ( '' === $text ) {
			return new WP_Error( 'mrabb_empty', __( 'Say or type something first.', 'mr-abb' ), array( 'status' => 400 ) );
		}
		$session = self::session_for( $user_id, isset( $body['sessionId'] ) ? $body['sessionId'] : '', 'text' );
		$lang    = isset( $body['language'] ) && in_array( $body['language'], array( 'en', 'ar' ), true ) ? $body['language'] : $lang;
		$r       = MrAbb_Brain::run( $text, $session, array( 'user_id' => $user_id, 'language' => $lang, 'source' => 'text' ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$s = MrAbb_Store::get_session( $session );
		// The user transcript was recorded server-side; the browser already displayed it, so strip it from events.
		$events = array_values( array_filter( $r['events'], function ( $e ) { return ! ( 'transcript' === $e['type'] && 'agent' === $e['role'] ); } ) );
		return array( 'session' => array( 'id' => $session, 'title' => $s ? $s['title'] : '' ), 'reply' => array( 'text' => $r['reply'] ), 'events' => $events );
	}

	private static function approval( $id, $approve, $user_id, $lang ) {
		$a = MrAbb_Store::get_approval( $id );
		if ( ! $a || (int) $a['user_id'] !== (int) $user_id ) {
			return new WP_Error( 'mrabb_not_found', __( 'That approval no longer exists.', 'mr-abb' ), array( 'status' => 404 ) );
		}
		if ( 'pending' !== $a['status'] ) {
			return array( 'ok' => true, 'status' => $a['status'], 'events' => array() );
		}
		$events = array();
		$ctx    = array( 'session_id' => $a['session_id'], 'user_id' => $user_id, 'source' => 'approval', 'language' => $lang, 'approved' => true, 'approval_id' => $id );
		$tool_event_id = get_option( 'mrabb_apr_tool_' . $id, '' );
		if ( $approve ) {
			MrAbb_Store::resolve_approval( $id, 'approved' );
			$events[] = MrAbb_Store::add_event( $a['session_id'], $user_id, array( 'type' => 'approval_resolved', 'id' => $id, 'status' => 'approved' ) );
			$exec     = MrAbb_Tools::execute( $a['tool'], $a['params'], $ctx );
			$events   = array_merge( $events, $exec['events'] );
			MrAbb_Store::resolve_approval( $id, 'completed' === $exec['status'] ? 'executed' : 'failed', array( 'summary' => $exec['summary'] ) );
		} else {
			MrAbb_Store::resolve_approval( $id, 'rejected' );
			$events[] = MrAbb_Store::add_event( $a['session_id'], $user_id, array( 'type' => 'approval_resolved', 'id' => $id, 'status' => 'rejected' ) );
			if ( $tool_event_id ) {
				$events[] = MrAbb_Store::add_event( $a['session_id'], $user_id, array( 'type' => 'tool', 'id' => $tool_event_id, 'tool' => $a['tool'], 'title' => $a['title'], 'status' => 'failed', 'subtitle' => __( 'Cancelled by you', 'mr-abb' ) ) );
			}
			$exec = array( 'status' => 'rejected', 'summary' => 'cancelled' );
		}
		delete_option( 'mrabb_apr_tool_' . $id );
		$session = MrAbb_Store::get_session( $a['session_id'] );
		$spoken  = '';
		if ( $session && 'text' === $session['mode'] && MrAbb_Brain::configured() ) {
			$r = MrAbb_Brain::after_approval( $a, $approve ? 'approved' : 'rejected', $exec, array( 'user_id' => $user_id, 'language' => $lang, 'source' => 'approval' ) );
			if ( ! is_wp_error( $r ) ) {
				$events = array_merge( $events, $r['events'] );
				$spoken = $r['reply'];
			}
		} else {
			$spoken = $approve ? ( 'completed' === $exec['status'] ? $exec['summary'] : $exec['summary'] ) : __( 'Cancelled.', 'mr-abb' );
			$events[] = MrAbb_Store::add_event( $a['session_id'], $user_id, array( 'type' => 'transcript', 'role' => 'agent', 'text' => $spoken ) );
		}
		$events[] = array( 'type' => 'state', 'state' => 'idle' );
		return array( 'ok' => true, 'status' => $approve ? $exec['status'] : 'rejected', 'summary' => $exec['summary'], 'contextualUpdate' => $spoken, 'events' => $events );
	}

	private static function activity( $query, $user_id ) {
		$cursor  = isset( $query['cursor'] ) ? (int) $query['cursor'] : 0;
		$session = isset( $query['sessionId'] ) ? $query['sessionId'] : '';
		if ( ! $cursor && ! empty( $query['since'] ) ) {
			// First poll: start from "now" so old events are not replayed.
			$cursor = MrAbb_Store::latest_event_row( $user_id );
		}
		$r = MrAbb_Store::events_after( $user_id, $cursor, $session );
		return array( 'now' => gmdate( 'c' ), 'cursor' => $r['cursor'], 'events' => $r['events'] );
	}

	private static function connection_action( $id, $action, $user_id ) {
		$c = MrAbb_Connectors::get( $id );
		if ( ! $c ) {
			return new WP_Error( 'mrabb_not_found', 'Unknown connection', array( 'status' => 404 ) );
		}
		$admin = admin_url( 'admin.php?page=mrabb-connections' );
		if ( 'disconnect' === $action ) {
			if ( ! current_user_can( 'manage_options' ) ) {
				return new WP_Error( 'mrabb_forbidden', __( 'Administrators only.', 'mr-abb' ), array( 'status' => 403 ) );
			}
			if ( 'google' === $c['type'] ) {
				MrAbb_Google::disconnect();
			} elseif ( 'webhook' === $c['type'] ) {
				MrAbb_Connectors::clear_webhook( $id );
			}
			return array( 'ok' => true );
		}
		if ( 'google' === $c['type'] && MrAbb_Google::configured() && current_user_can( 'manage_options' ) ) {
			return array( 'url' => MrAbb_Google::auth_url( $user_id ) );
		}
		return array( 'url' => $admin . '#' . $id );
	}

	private static function context( $user_id ) {
		$schedule = array();
		if ( MrAbb_Google::is_connected() ) {
			$tz = wp_timezone();
			$ev = MrAbb_Google::calendar_events( ( new DateTime( 'today', $tz ) )->format( DATE_ATOM ), ( new DateTime( 'tomorrow', $tz ) )->format( DATE_ATOM ), 8 );
			if ( ! is_wp_error( $ev ) ) {
				$schedule = $ev;
			}
		}
		$tasks = array();
		foreach ( MrAbb_Store::list_tasks( $user_id, false ) as $t ) {
			$tasks[] = array( 'id' => (string) $t['id'], 'title' => $t['title'], 'time' => $t['due_time'], 'source' => $t['source'], 'priority' => $t['priority'], 'status' => 'open' );
		}
		if ( MrAbb_Google::is_connected() ) {
			$g = MrAbb_Google::tasks_list( false );
			if ( ! is_wp_error( $g ) ) {
				foreach ( array_slice( $g, 0, 6 ) as $t ) {
					$tasks[] = array( 'id' => $t['id'], 'title' => $t['title'], 'time' => $t['due'], 'source' => 'google', 'priority' => 'medium', 'status' => 'open' );
				}
			}
		}
		$activity = array();
		foreach ( MrAbb_Store::recent_tool_events( $user_id, 6 ) as $e ) {
			$activity[] = array( 'title' => $e['title'] . ( ! empty( $e['subtitle'] ) ? ' — ' . $e['subtitle'] : '' ), 'meta' => wp_date( 'H:i', strtotime( $e['timestamp'] ) ), 'tone' => 'completed' === $e['status'] ? 'success' : ( 'failed' === $e['status'] ? 'danger' : 'warning' ) );
		}
		return array( 'schedule' => $schedule, 'tasks' => array_slice( $tasks, 0, 6 ), 'activity' => $activity );
	}

	private static function history( $user_id ) {
		$out = array();
		foreach ( MrAbb_Store::list_sessions( $user_id, 60 ) as $s ) {
			$started = strtotime( $s['started_at'] . ' UTC' );
			$ended   = $s['ended_at'] ? strtotime( $s['ended_at'] . ' UTC' ) : $started;
			$out[]   = array( 'id' => $s['id'], 'title' => $s['title'] ? $s['title'] : ucfirst( $s['mode'] ) . ' session', 'startedAt' => gmdate( 'c', $started ), 'durationMin' => max( 1, (int) round( ( $ended - $started ) / 60 ) ), 'actions' => MrAbb_Store::count_session_tools( $s['id'] ), 'approvals' => 0, 'mode' => $s['mode'] );
		}
		return array( 'sessions' => $out );
	}

	private static function session_detail( $id, $user_id ) {
		$s = MrAbb_Store::get_session( $id );
		if ( ! $s || (int) $s['user_id'] !== (int) $user_id ) {
			return new WP_Error( 'mrabb_not_found', __( 'Session not found.', 'mr-abb' ), array( 'status' => 404 ) );
		}
		$messages = array();
		$tools    = array();
		$apps     = array();
		foreach ( MrAbb_Store::session_events( $id ) as $e ) {
			if ( 'transcript' === $e['type'] ) {
				$messages[] = array( 'role' => $e['role'], 'text' => $e['text'], 'time' => wp_date( 'H:i', strtotime( $e['timestamp'] ) ) );
			} elseif ( 'tool' === $e['type'] ) {
				$tools[ $e['id'] ] = array( 'tool' => $e['tool'], 'title' => $e['title'], 'status' => $e['status'] );
			} elseif ( 'approval' === $e['type'] ) {
				$apps[ $e['id'] ] = array( 'title' => $e['title'], 'status' => 'pending' );
			} elseif ( 'approval_resolved' === $e['type'] && isset( $apps[ $e['id'] ] ) ) {
				$apps[ $e['id'] ]['status'] = $e['status'];
			}
		}
		$started = strtotime( $s['started_at'] . ' UTC' );
		$ended   = $s['ended_at'] ? strtotime( $s['ended_at'] . ' UTC' ) : $started;
		return array( 'id' => $id, 'title' => $s['title'], 'startedAt' => gmdate( 'c', $started ), 'durationMin' => max( 1, (int) round( ( $ended - $started ) / 60 ) ), 'messages' => $messages, 'tools' => array_values( $tools ), 'approvals' => array_values( $apps ) );
	}

	private static function tasks( $user_id ) {
		$out = array();
		foreach ( MrAbb_Store::list_tasks( $user_id, true ) as $t ) {
			$out[] = array( 'id' => (string) $t['id'], 'title' => $t['title'], 'time' => $t['due_time'], 'date' => $t['due_at'] ? gmdate( 'c', strtotime( $t['due_at'] . ' UTC' ) ) : gmdate( 'c', strtotime( $t['created_at'] . ' UTC' ) ), 'source' => $t['source'], 'priority' => $t['priority'], 'status' => $t['status'] );
		}
		if ( MrAbb_Google::is_connected() ) {
			$g = MrAbb_Google::tasks_list( true );
			if ( ! is_wp_error( $g ) ) {
				foreach ( $g as $t ) {
					if ( MrAbb_Store::task_by_external( $user_id, $t['id'] ) ) {
						continue;
					}
					$out[] = array( 'id' => 'g:' . $t['id'], 'title' => $t['title'], 'time' => '', 'date' => $t['due'] ? $t['due'] . 'T00:00:00' : gmdate( 'c' ), 'source' => 'google', 'priority' => 'medium', 'status' => $t['status'] );
				}
			}
		}
		return array( 'tasks' => $out );
	}

	private static function complete_task( $id, $user_id ) {
		if ( 0 === strpos( $id, 'g:' ) ) {
			$r = MrAbb_Google::tasks_complete( substr( $id, 2 ) );
			return is_wp_error( $r ) ? $r : array( 'ok' => true );
		}
		$row = null;
		foreach ( MrAbb_Store::list_tasks( $user_id, false ) as $t ) {
			if ( (string) $t['id'] === (string) $id ) {
				$row = $t;
			}
		}
		MrAbb_Store::complete_task( $user_id, (int) $id );
		if ( $row && $row['external_id'] && MrAbb_Google::is_connected() ) {
			MrAbb_Google::tasks_complete( $row['external_id'] );
		}
		return array( 'ok' => true );
	}
}
