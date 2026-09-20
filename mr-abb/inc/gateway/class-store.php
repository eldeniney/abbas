<?php
/**
 * Persistence for sessions, events, approvals and tasks (built-in gateway).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Store {

	const DB_VERSION = '1';

	public static function table( $name ) {
		global $wpdb;
		return $wpdb->prefix . 'mrabb_' . $name;
	}

	/** Create / upgrade tables. */
	public static function install() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset  = $wpdb->get_charset_collate();
		$sessions = self::table( 'sessions' );
		$events   = self::table( 'events' );
		$appr     = self::table( 'approvals' );
		$tasks    = self::table( 'tasks' );

		dbDelta( "CREATE TABLE $sessions (
			id varchar(48) NOT NULL,
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			title varchar(200) NOT NULL DEFAULT '',
			mode varchar(20) NOT NULL DEFAULT 'text',
			status varchar(20) NOT NULL DEFAULT 'active',
			conversation_id varchar(120) NOT NULL DEFAULT '',
			started_at datetime NOT NULL,
			ended_at datetime NULL,
			meta longtext NULL,
			PRIMARY KEY  (id),
			KEY user_started (user_id, started_at),
			KEY conversation_id (conversation_id)
		) $charset;" );

		dbDelta( "CREATE TABLE $events (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			session_id varchar(48) NOT NULL,
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			type varchar(30) NOT NULL,
			tool varchar(80) NOT NULL DEFAULT '',
			status varchar(30) NOT NULL DEFAULT '',
			event_id varchar(64) NOT NULL DEFAULT '',
			payload longtext NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY session_created (session_id, created_at),
			KEY user_created (user_id, created_at)
		) $charset;" );

		dbDelta( "CREATE TABLE $appr (
			id varchar(48) NOT NULL,
			session_id varchar(48) NOT NULL DEFAULT '',
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			tool varchar(80) NOT NULL,
			title varchar(200) NOT NULL DEFAULT '',
			params longtext NULL,
			details longtext NULL,
			preview longtext NULL,
			status varchar(20) NOT NULL DEFAULT 'pending',
			result longtext NULL,
			created_at datetime NOT NULL,
			resolved_at datetime NULL,
			PRIMARY KEY  (id),
			KEY user_status (user_id, status)
		) $charset;" );

		dbDelta( "CREATE TABLE $tasks (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			title varchar(255) NOT NULL,
			due_at datetime NULL,
			due_time varchar(10) NOT NULL DEFAULT '',
			source varchar(20) NOT NULL DEFAULT 'manual',
			priority varchar(10) NOT NULL DEFAULT 'medium',
			status varchar(10) NOT NULL DEFAULT 'open',
			external_id varchar(120) NOT NULL DEFAULT '',
			created_at datetime NOT NULL,
			completed_at datetime NULL,
			PRIMARY KEY  (id),
			KEY user_status (user_id, status)
		) $charset;" );

		update_option( 'mrabb_db_version', self::DB_VERSION, false );
	}

	public static function maybe_install() {
		if ( get_option( 'mrabb_db_version' ) !== self::DB_VERSION ) {
			self::install();
		}
	}

	private static function now() {
		return current_time( 'mysql', true );
	}

	/* ----------------------------------------------------------- Sessions */

	public static function create_session( $user_id, $mode = 'text', $title = '', $conversation_id = '' ) {
		global $wpdb;
		$id = 'ses_' . wp_generate_password( 20, false, false );
		$wpdb->insert(
			self::table( 'sessions' ),
			array(
				'id'              => $id,
				'user_id'         => (int) $user_id,
				'title'           => mb_substr( (string) $title, 0, 200 ),
				'mode'            => $mode,
				'status'          => 'active',
				'conversation_id' => (string) $conversation_id,
				'started_at'      => self::now(),
				'meta'            => wp_json_encode( array() ),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
		return $id;
	}

	public static function get_session( $id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table( 'sessions' ) . ' WHERE id = %s', $id ), ARRAY_A );
		return $row ? $row : null;
	}

	public static function update_session( $id, $fields ) {
		global $wpdb;
		return $wpdb->update( self::table( 'sessions' ), $fields, array( 'id' => $id ) );
	}

	public static function end_session( $id ) {
		return self::update_session( $id, array( 'status' => 'ended', 'ended_at' => self::now() ) );
	}

	/** Latest active session for a user (optionally by mode). */
	public static function active_session( $user_id, $mode = '' ) {
		global $wpdb;
		$sql = 'SELECT * FROM ' . self::table( 'sessions' ) . ' WHERE user_id = %d AND status = %s';
		$args = array( (int) $user_id, 'active' );
		if ( $mode ) {
			$sql   .= ' AND mode = %s';
			$args[] = $mode;
		}
		$sql .= ' ORDER BY started_at DESC LIMIT 1';
		$row  = $wpdb->get_row( $wpdb->prepare( $sql, $args ), ARRAY_A );
		return $row ? $row : null;
	}

	public static function session_by_conversation( $conversation_id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table( 'sessions' ) . ' WHERE conversation_id = %s ORDER BY started_at DESC LIMIT 1', $conversation_id ), ARRAY_A );
		return $row ? $row : null;
	}

	public static function list_sessions( $user_id, $limit = 50 ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . self::table( 'sessions' ) . ' WHERE user_id = %d ORDER BY started_at DESC LIMIT %d', (int) $user_id, (int) $limit ), ARRAY_A );
		return $rows ? $rows : array();
	}

	public static function ensure_session_title( $session_id, $text ) {
		$s = self::get_session( $session_id );
		if ( $s && '' === $s['title'] && $text ) {
			self::update_session( $session_id, array( 'title' => mb_substr( $text, 0, 60 ) ) );
		}
	}

	/* ------------------------------------------------------------- Events */

	/**
	 * Record a normalised event (see docs/events.md).
	 *
	 * @return array The event with an id.
	 */
	public static function add_event( $session_id, $user_id, $event ) {
		global $wpdb;
		$event['timestamp'] = isset( $event['timestamp'] ) ? $event['timestamp'] : gmdate( 'c' );
		if ( empty( $event['id'] ) ) {
			$event['id'] = ( isset( $event['type'] ) ? $event['type'] : 'evt' ) . '_' . wp_generate_password( 12, false, false );
		}
		$wpdb->insert(
			self::table( 'events' ),
			array(
				'session_id' => (string) $session_id,
				'user_id'    => (int) $user_id,
				'type'       => isset( $event['type'] ) ? (string) $event['type'] : '',
				'tool'       => isset( $event['tool'] ) ? (string) $event['tool'] : '',
				'status'     => isset( $event['status'] ) ? (string) $event['status'] : '',
				'event_id'   => (string) $event['id'],
				'payload'    => wp_json_encode( $event ),
				'created_at' => self::now(),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
		$event['_row'] = (int) $wpdb->insert_id;
		return $event;
	}

	public static function session_events( $session_id, $limit = 500 ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT payload FROM ' . self::table( 'events' ) . ' WHERE session_id = %s ORDER BY id ASC LIMIT %d', $session_id, (int) $limit ), ARRAY_A );
		return self::decode_rows( $rows );
	}

	/** Events after a row id (used by the activity feed). */
	public static function events_after( $user_id, $after_row, $session_id = '', $limit = 200 ) {
		global $wpdb;
		$sql  = 'SELECT id, payload FROM ' . self::table( 'events' ) . ' WHERE user_id = %d AND id > %d';
		$args = array( (int) $user_id, (int) $after_row );
		if ( $session_id ) {
			$sql   .= ' AND session_id = %s';
			$args[] = $session_id;
		}
		$sql   .= ' ORDER BY id ASC LIMIT %d';
		$args[] = (int) $limit;
		$rows   = $wpdb->get_results( $wpdb->prepare( $sql, $args ), ARRAY_A );
		$out    = array();
		$last   = (int) $after_row;
		foreach ( (array) $rows as $r ) {
			$e = json_decode( $r['payload'], true );
			if ( is_array( $e ) ) {
				$out[] = $e;
			}
			$last = max( $last, (int) $r['id'] );
		}
		return array( 'events' => $out, 'cursor' => $last );
	}

	public static function latest_event_row( $user_id ) {
		global $wpdb;
		return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT MAX(id) FROM ' . self::table( 'events' ) . ' WHERE user_id = %d', (int) $user_id ) );
	}

	public static function recent_tool_events( $user_id, $limit = 8 ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT payload FROM ' . self::table( 'events' ) . " WHERE user_id = %d AND type = 'tool' AND status IN ('completed','failed','requires_approval') ORDER BY id DESC LIMIT %d", (int) $user_id, (int) $limit ), ARRAY_A );
		return self::decode_rows( $rows );
	}

	public static function count_session_tools( $session_id ) {
		global $wpdb;
		return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(DISTINCT event_id) FROM ' . self::table( 'events' ) . " WHERE session_id = %s AND type = 'tool'", $session_id ) );
	}

	private static function decode_rows( $rows ) {
		$out = array();
		foreach ( (array) $rows as $r ) {
			$e = json_decode( $r['payload'], true );
			if ( is_array( $e ) ) {
				$out[] = $e;
			}
		}
		return $out;
	}

	/* ---------------------------------------------------------- Approvals */

	public static function create_approval( $session_id, $user_id, $tool, $params, $title, $details, $preview ) {
		global $wpdb;
		$id = 'apr_' . wp_generate_password( 16, false, false );
		$wpdb->insert(
			self::table( 'approvals' ),
			array(
				'id'         => $id,
				'session_id' => (string) $session_id,
				'user_id'    => (int) $user_id,
				'tool'       => (string) $tool,
				'title'      => mb_substr( (string) $title, 0, 200 ),
				'params'     => wp_json_encode( $params ),
				'details'    => wp_json_encode( $details ),
				'preview'    => (string) $preview,
				'status'     => 'pending',
				'created_at' => self::now(),
			)
		);
		return $id;
	}

	public static function get_approval( $id ) {
		global $wpdb;
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table( 'approvals' ) . ' WHERE id = %s', $id ), ARRAY_A );
		if ( ! $row ) {
			return null;
		}
		$row['params']  = json_decode( $row['params'], true );
		$row['details'] = json_decode( $row['details'], true );
		$row['result']  = $row['result'] ? json_decode( $row['result'], true ) : null;
		return $row;
	}

	public static function resolve_approval( $id, $status, $result = null ) {
		global $wpdb;
		return $wpdb->update(
			self::table( 'approvals' ),
			array( 'status' => $status, 'resolved_at' => self::now(), 'result' => null === $result ? null : wp_json_encode( $result ) ),
			array( 'id' => $id )
		);
	}

	public static function pending_approvals( $user_id ) {
		global $wpdb;
		$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . self::table( 'approvals' ) . " WHERE user_id = %d AND status = 'pending' ORDER BY created_at DESC LIMIT 20", (int) $user_id ), ARRAY_A );
		return $rows ? $rows : array();
	}

	/* -------------------------------------------------------------- Tasks */

	public static function add_task( $user_id, $title, $due_at = null, $due_time = '', $source = 'manual', $priority = 'medium', $external_id = '' ) {
		global $wpdb;
		$wpdb->insert(
			self::table( 'tasks' ),
			array(
				'user_id'     => (int) $user_id,
				'title'       => mb_substr( (string) $title, 0, 255 ),
				'due_at'      => $due_at ? $due_at : null,
				'due_time'    => (string) $due_time,
				'source'      => $source,
				'priority'    => in_array( $priority, array( 'high', 'medium', 'low' ), true ) ? $priority : 'medium',
				'status'      => 'open',
				'external_id' => (string) $external_id,
				'created_at'  => self::now(),
			)
		);
		return (int) $wpdb->insert_id;
	}

	public static function list_tasks( $user_id, $include_done = true ) {
		global $wpdb;
		$sql = 'SELECT * FROM ' . self::table( 'tasks' ) . ' WHERE user_id = %d' . ( $include_done ? '' : " AND status = 'open'" ) . ' ORDER BY (due_at IS NULL), due_at ASC, id DESC LIMIT 200';
		$rows = $wpdb->get_results( $wpdb->prepare( $sql, (int) $user_id ), ARRAY_A );
		return $rows ? $rows : array();
	}

	public static function complete_task( $user_id, $id ) {
		global $wpdb;
		return $wpdb->update( self::table( 'tasks' ), array( 'status' => 'done', 'completed_at' => self::now() ), array( 'id' => (int) $id, 'user_id' => (int) $user_id ) );
	}

	public static function task_by_external( $user_id, $external_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table( 'tasks' ) . ' WHERE user_id = %d AND external_id = %s', (int) $user_id, $external_id ), ARRAY_A );
	}
}
