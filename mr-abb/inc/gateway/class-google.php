<?php
/**
 * Google OAuth 2.0 + Calendar, Gmail, Tasks and Drive helpers.
 *
 * Client ID lives in settings; the client secret and the tokens live in
 * MrAbb_Secrets (encrypted). One grant covers all four services.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Google {

	const SCOPES = 'openid email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.readonly';

	public static function client_id() {
		return (string) mrabb_get_setting( 'google_client_id', '' );
	}

	public static function configured() {
		return '' !== self::client_id() && MrAbb_Secrets::has( 'google_client_secret' );
	}

	public static function is_connected() {
		$t = MrAbb_Secrets::get_json( 'google_tokens' );
		return ! empty( $t['refresh_token'] );
	}

	public static function account_email() {
		$t = MrAbb_Secrets::get_json( 'google_tokens' );
		return isset( $t['email'] ) ? $t['email'] : '';
	}

	public static function last_sync() {
		$t = MrAbb_Secrets::get_json( 'google_tokens' );
		return isset( $t['last_used'] ) ? $t['last_used'] : null;
	}

	public static function redirect_uri() {
		return rest_url( MRABB_REST_NAMESPACE . '/oauth/google' );
	}

	/** Start the consent flow (called from the admin Connect button). */
	public static function auth_url( $user_id ) {
		$state = wp_generate_password( 32, false, false );
		set_transient( 'mrabb_oauth_' . $state, (int) $user_id, 15 * MINUTE_IN_SECONDS );
		return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query( array(
			'client_id'              => self::client_id(),
			'redirect_uri'           => self::redirect_uri(),
			'response_type'          => 'code',
			'scope'                  => self::SCOPES,
			'access_type'            => 'offline',
			'prompt'                 => 'consent',
			'include_granted_scopes' => 'true',
			'state'                  => $state,
		) );
	}

	/** Exchange the code from the callback. */
	public static function handle_callback( $code, $state ) {
		$user_id = (int) get_transient( 'mrabb_oauth_' . $state );
		if ( ! $user_id ) {
			return new WP_Error( 'mrabb_oauth_state', __( 'The sign-in link expired. Try connecting again.', 'mr-abb' ) );
		}
		delete_transient( 'mrabb_oauth_' . $state );
		$res = wp_remote_post( 'https://oauth2.googleapis.com/token', array(
			'timeout' => 20,
			'body'    => array(
				'code'          => $code,
				'client_id'     => self::client_id(),
				'client_secret' => MrAbb_Secrets::get( 'google_client_secret' ),
				'redirect_uri'  => self::redirect_uri(),
				'grant_type'    => 'authorization_code',
			),
		) );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( empty( $data['access_token'] ) ) {
			return new WP_Error( 'mrabb_oauth_exchange', isset( $data['error_description'] ) ? $data['error_description'] : __( 'Google did not return a token.', 'mr-abb' ) );
		}
		$existing = MrAbb_Secrets::get_json( 'google_tokens' );
		$tokens   = array(
			'access_token'  => $data['access_token'],
			'refresh_token' => ! empty( $data['refresh_token'] ) ? $data['refresh_token'] : ( isset( $existing['refresh_token'] ) ? $existing['refresh_token'] : '' ),
			'expires_at'    => time() + (int) ( isset( $data['expires_in'] ) ? $data['expires_in'] : 3600 ) - 60,
			'scope'         => isset( $data['scope'] ) ? $data['scope'] : '',
			'user_id'       => $user_id,
			'email'         => '',
			'connected_at'  => gmdate( 'c' ),
		);
		MrAbb_Secrets::set_json( 'google_tokens', $tokens );
		$me = self::request( 'GET', 'https://www.googleapis.com/oauth2/v3/userinfo' );
		if ( ! is_wp_error( $me ) && ! empty( $me['email'] ) ) {
			$tokens['email'] = sanitize_email( $me['email'] );
			MrAbb_Secrets::set_json( 'google_tokens', $tokens );
		}
		return true;
	}

	public static function disconnect() {
		$t = MrAbb_Secrets::get_json( 'google_tokens' );
		if ( ! empty( $t['refresh_token'] ) ) {
			wp_remote_post( 'https://oauth2.googleapis.com/revoke', array( 'timeout' => 10, 'body' => array( 'token' => $t['refresh_token'] ) ) );
		}
		MrAbb_Secrets::delete( 'google_tokens' );
	}

	private static function access_token() {
		$t = MrAbb_Secrets::get_json( 'google_tokens' );
		if ( empty( $t['refresh_token'] ) ) {
			return new WP_Error( 'mrabb_google_disconnected', __( 'Google is not connected.', 'mr-abb' ) );
		}
		if ( ! empty( $t['access_token'] ) && ! empty( $t['expires_at'] ) && $t['expires_at'] > time() ) {
			return $t['access_token'];
		}
		$res = wp_remote_post( 'https://oauth2.googleapis.com/token', array(
			'timeout' => 20,
			'body'    => array(
				'refresh_token' => $t['refresh_token'],
				'client_id'     => self::client_id(),
				'client_secret' => MrAbb_Secrets::get( 'google_client_secret' ),
				'grant_type'    => 'refresh_token',
			),
		) );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( empty( $data['access_token'] ) ) {
			mrabb_log( 'error', 'Google token refresh failed', array( 'error' => isset( $data['error'] ) ? $data['error'] : 'unknown' ) );
			return new WP_Error( 'mrabb_google_refresh', __( 'Google needs to be reconnected.', 'mr-abb' ) );
		}
		$t['access_token'] = $data['access_token'];
		$t['expires_at']   = time() + (int) $data['expires_in'] - 60;
		MrAbb_Secrets::set_json( 'google_tokens', $t );
		return $t['access_token'];
	}

	/** Authenticated request to any Google API. */
	public static function request( $method, $url, $body = null, $query = array() ) {
		$token = self::access_token();
		if ( is_wp_error( $token ) ) {
			return $token;
		}
		if ( $query ) {
			$url = add_query_arg( array_map( 'rawurlencode', $query ), $url );
		}
		$args = array( 'method' => $method, 'timeout' => 25, 'headers' => array( 'Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json', 'Content-Type' => 'application/json' ) );
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}
		$res = wp_remote_request( $url, $args );
		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'mrabb_google_unreachable', __( 'Could not reach Google.', 'mr-abb' ), array( 'details' => $res->get_error_message() ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( $code >= 400 ) {
			$msg = isset( $data['error']['message'] ) ? $data['error']['message'] : ( isset( $data['error'] ) && is_string( $data['error'] ) ? $data['error'] : 'Google error ' . $code );
			return new WP_Error( 'mrabb_google_error', sanitize_text_field( $msg ), array( 'status' => $code ) );
		}
		$t = MrAbb_Secrets::get_json( 'google_tokens' );
		if ( $t ) {
			$t['last_used'] = gmdate( 'c' );
			MrAbb_Secrets::set_json( 'google_tokens', $t );
		}
		return is_array( $data ) ? $data : array();
	}

	public static function test() {
		if ( ! self::is_connected() ) {
			return new WP_Error( 'mrabb_google_disconnected', __( 'Google is not connected.', 'mr-abb' ) );
		}
		$r = self::request( 'GET', 'https://www.googleapis.com/oauth2/v3/userinfo' );
		return is_wp_error( $r ) ? $r : array( 'summary' => 'Connected as ' . ( isset( $r['email'] ) ? $r['email'] : '?' ) );
	}

	/* ----------------------------------------------------------- Calendar */

	public static function calendar_events( $time_min, $time_max, $max = 20 ) {
		$r = self::request( 'GET', 'https://www.googleapis.com/calendar/v3/calendars/primary/events', null, array( 'timeMin' => $time_min, 'timeMax' => $time_max, 'singleEvents' => 'true', 'orderBy' => 'startTime', 'maxResults' => (int) $max ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$tz  = wp_timezone();
		$out = array();
		foreach ( (array) ( isset( $r['items'] ) ? $r['items'] : array() ) as $e ) {
			$start = isset( $e['start']['dateTime'] ) ? $e['start']['dateTime'] : ( isset( $e['start']['date'] ) ? $e['start']['date'] : '' );
			$end   = isset( $e['end']['dateTime'] ) ? $e['end']['dateTime'] : ( isset( $e['end']['date'] ) ? $e['end']['date'] : '' );
			$all   = ! isset( $e['start']['dateTime'] );
			$sd    = $start ? new DateTime( $start ) : null;
			$ed    = $end ? new DateTime( $end ) : null;
			if ( $sd ) { $sd->setTimezone( $tz ); }
			if ( $ed ) { $ed->setTimezone( $tz ); }
			$dur = ( $sd && $ed && ! $all ) ? max( 0, ( $ed->getTimestamp() - $sd->getTimestamp() ) / 60 ) : 0;
			$out[] = array(
				'id'       => isset( $e['id'] ) ? $e['id'] : '',
				'title'    => isset( $e['summary'] ) ? $e['summary'] : __( '(no title)', 'mr-abb' ),
				'time'     => $all ? __( 'All day', 'mr-abb' ) : ( $sd ? $sd->format( 'H:i' ) : '' ),
				'date'     => $sd ? $sd->format( 'Y-m-d' ) : '',
				'start'    => $start,
				'end'      => $end,
				'location' => isset( $e['location'] ) ? $e['location'] : ( isset( $e['hangoutLink'] ) ? 'Meet' : '' ),
				'duration' => $dur ? ( $dur >= 60 ? rtrim( rtrim( number_format( $dur / 60, 1 ), '0' ), '.' ) . 'h' : $dur . 'm' ) : '',
				'link'     => isset( $e['htmlLink'] ) ? $e['htmlLink'] : '',
				'with'     => isset( $e['attendees'] ) ? implode( ', ', array_slice( array_map( function ( $a ) { return isset( $a['displayName'] ) ? $a['displayName'] : $a['email']; }, $e['attendees'] ), 0, 3 ) ) : '',
			);
		}
		return $out;
	}

	public static function calendar_create( $title, $start, $end, $attendees = array(), $description = '', $location = '' ) {
		$tz   = wp_timezone_string();
		$body = array( 'summary' => $title, 'start' => array( 'dateTime' => $start, 'timeZone' => $tz ), 'end' => array( 'dateTime' => $end, 'timeZone' => $tz ) );
		if ( $description ) { $body['description'] = $description; }
		if ( $location ) { $body['location'] = $location; }
		if ( $attendees ) { $body['attendees'] = array_map( function ( $e ) { return array( 'email' => $e ); }, array_filter( array_map( 'sanitize_email', (array) $attendees ) ) ); }
		return self::request( 'POST', 'https://www.googleapis.com/calendar/v3/calendars/primary/events', $body, array( 'sendUpdates' => 'all' ) );
	}

	/* -------------------------------------------------------------- Tasks */

	public static function tasks_list( $show_completed = false ) {
		$r = self::request( 'GET', 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', null, array( 'showCompleted' => $show_completed ? 'true' : 'false', 'showHidden' => $show_completed ? 'true' : 'false', 'maxResults' => 50 ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$out = array();
		foreach ( (array) ( isset( $r['items'] ) ? $r['items'] : array() ) as $t ) {
			$out[] = array( 'id' => $t['id'], 'title' => isset( $t['title'] ) ? $t['title'] : '', 'due' => isset( $t['due'] ) ? substr( $t['due'], 0, 10 ) : '', 'notes' => isset( $t['notes'] ) ? $t['notes'] : '', 'status' => isset( $t['status'] ) && 'completed' === $t['status'] ? 'done' : 'open' );
		}
		return $out;
	}

	public static function tasks_create( $title, $due = '', $notes = '' ) {
		$body = array( 'title' => $title );
		if ( $due ) { $body['due'] = gmdate( 'Y-m-d', strtotime( $due ) ) . 'T00:00:00.000Z'; }
		if ( $notes ) { $body['notes'] = $notes; }
		return self::request( 'POST', 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', $body );
	}

	public static function tasks_complete( $id ) {
		return self::request( 'PATCH', 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/' . rawurlencode( $id ), array( 'status' => 'completed' ) );
	}

	/* -------------------------------------------------------------- Gmail */

	public static function gmail_search( $q, $max = 10 ) {
		$r = self::request( 'GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages', null, array( 'q' => $q, 'maxResults' => (int) $max ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$out = array();
		foreach ( (array) ( isset( $r['messages'] ) ? $r['messages'] : array() ) as $m ) {
			$d = self::request( 'GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . $m['id'], null, array( 'format' => 'metadata', 'metadataHeaders' => 'From' ) );
			if ( is_wp_error( $d ) ) {
				continue;
			}
			$h = self::headers( $d );
			// A second call for the remaining headers keeps the query simple and within URL rules.
			$d2 = self::request( 'GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . $m['id'], null, array( 'format' => 'metadata', 'metadataHeaders' => 'Subject' ) );
			$h  = array_merge( $h, is_wp_error( $d2 ) ? array() : self::headers( $d2 ) );
			$ts = isset( $d['internalDate'] ) ? (int) ( $d['internalDate'] / 1000 ) : 0;
			$out[] = array( 'id' => $m['id'], 'from' => isset( $h['from'] ) ? preg_replace( '/\s*<.*>$/', '', $h['from'] ) : '', 'fromEmail' => isset( $h['from'] ) ? $h['from'] : '', 'subject' => isset( $h['subject'] ) ? $h['subject'] : '', 'snippet' => isset( $d['snippet'] ) ? html_entity_decode( $d['snippet'] ) : '', 'time' => $ts ? wp_date( 'H:i', $ts ) : '', 'date' => $ts ? wp_date( 'Y-m-d', $ts ) : '', 'unread' => isset( $d['labelIds'] ) && in_array( 'UNREAD', $d['labelIds'], true ) );
		}
		return $out;
	}

	private static function headers( $msg ) {
		$out = array();
		foreach ( (array) ( isset( $msg['payload']['headers'] ) ? $msg['payload']['headers'] : array() ) as $h ) {
			$out[ strtolower( $h['name'] ) ] = $h['value'];
		}
		return $out;
	}

	public static function gmail_read( $id ) {
		$d = self::request( 'GET', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . rawurlencode( $id ), null, array( 'format' => 'full' ) );
		if ( is_wp_error( $d ) ) {
			return $d;
		}
		$h    = self::headers( $d );
		$text = self::extract_text( isset( $d['payload'] ) ? $d['payload'] : array() );
		return array( 'id' => $id, 'from' => isset( $h['from'] ) ? $h['from'] : '', 'to' => isset( $h['to'] ) ? $h['to'] : '', 'subject' => isset( $h['subject'] ) ? $h['subject'] : '', 'date' => isset( $h['date'] ) ? $h['date'] : '', 'body' => mb_substr( trim( $text ), 0, 6000 ) );
	}

	private static function extract_text( $part ) {
		$mime = isset( $part['mimeType'] ) ? $part['mimeType'] : '';
		if ( 'text/plain' === $mime && ! empty( $part['body']['data'] ) ) {
			return self::b64url_decode( $part['body']['data'] );
		}
		if ( ! empty( $part['parts'] ) ) {
			foreach ( $part['parts'] as $p ) {
				$t = self::extract_text( $p );
				if ( '' !== $t ) {
					return $t;
				}
			}
		}
		if ( 'text/html' === $mime && ! empty( $part['body']['data'] ) ) {
			return wp_strip_all_tags( self::b64url_decode( $part['body']['data'] ) );
		}
		return '';
	}

	private static function b64url_decode( $s ) {
		return base64_decode( strtr( $s, '-_', '+/' ) );
	}

	private static function b64url_encode( $s ) {
		return rtrim( strtr( base64_encode( $s ), '+/', '-_' ), '=' );
	}

	private static function raw_message( $to, $subject, $body, $cc = '' ) {
		$from = self::account_email();
		$raw  = '';
		if ( $from ) { $raw .= 'From: ' . $from . "\r\n"; }
		$raw .= 'To: ' . $to . "\r\n";
		if ( $cc ) { $raw .= 'Cc: ' . $cc . "\r\n"; }
		$raw .= 'Subject: =?UTF-8?B?' . base64_encode( $subject ) . "?=\r\n";
		$raw .= "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
		$raw .= chunk_split( base64_encode( $body ) );
		return self::b64url_encode( $raw );
	}

	public static function gmail_draft( $to, $subject, $body, $cc = '' ) {
		return self::request( 'POST', 'https://gmail.googleapis.com/gmail/v1/users/me/drafts', array( 'message' => array( 'raw' => self::raw_message( $to, $subject, $body, $cc ) ) ) );
	}

	public static function gmail_send( $to, $subject, $body, $cc = '' ) {
		return self::request( 'POST', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', array( 'raw' => self::raw_message( $to, $subject, $body, $cc ) ) );
	}

	/* -------------------------------------------------------------- Drive */

	public static function drive_search( $q, $max = 10 ) {
		$safe = str_replace( array( '\\', "'" ), array( '\\\\', "\\'" ), $q );
		$r    = self::request( 'GET', 'https://www.googleapis.com/drive/v3/files', null, array( 'q' => "name contains '" . $safe . "' and trashed = false", 'pageSize' => (int) $max, 'fields' => 'files(id,name,mimeType,modifiedTime,webViewLink)', 'orderBy' => 'modifiedTime desc' ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$out = array();
		foreach ( (array) ( isset( $r['files'] ) ? $r['files'] : array() ) as $f ) {
			$type  = isset( $f['mimeType'] ) ? $f['mimeType'] : '';
			$short = strpos( $type, 'spreadsheet' ) !== false ? 'xls' : ( strpos( $type, 'presentation' ) !== false ? 'ppt' : ( strpos( $type, 'pdf' ) !== false ? 'pdf' : ( strpos( $type, 'document' ) !== false ? 'doc' : 'file' ) ) );
			$out[] = array( 'id' => $f['id'], 'name' => $f['name'], 'type' => $short, 'modified' => isset( $f['modifiedTime'] ) ? wp_date( 'j M H:i', strtotime( $f['modifiedTime'] ) ) : '', 'url' => isset( $f['webViewLink'] ) ? $f['webViewLink'] : '' );
		}
		return $out;
	}
}
