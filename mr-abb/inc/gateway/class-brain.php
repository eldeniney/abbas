<?php
/**
 * The brain: Claude (Anthropic Messages API) with tool use.
 *
 * Used for typed commands, approvals follow-up, automations and web research.
 * Raw HTTP through the WordPress HTTP layer (the theme ships without Composer).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Brain {

	const ENDPOINT    = 'https://api.anthropic.com/v1/messages';
	const API_VERSION = '2023-06-01';
	const MAX_TURNS   = 8;

	public static function configured() {
		return MrAbb_Secrets::has( 'anthropic_api_key' );
	}

	public static function model() {
		return (string) mrabb_get_setting( 'claude_model', 'claude-opus-5' );
	}

	/** Raw Messages API call. */
	public static function call( $body ) {
		$key = MrAbb_Secrets::get( 'anthropic_api_key' );
		if ( '' === $key ) {
			return new WP_Error( 'mrabb_brain_key', __( 'Add your Anthropic API key in Mr. Abb → Connections to enable typed commands.', 'mr-abb' ) );
		}
		$headers = array( 'Content-Type' => 'application/json', 'x-api-key' => $key, 'anthropic-version' => self::API_VERSION );
		if ( 0 === strpos( $body['model'], 'claude-fable' ) || 0 === strpos( $body['model'], 'claude-opus-5' ) ) {
			// Server-side refusal fallbacks (opt-in): re-run on a fallback model if a safety classifier declines.
			$headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
			$body['fallbacks']         = 'default';
		}
		$res = wp_remote_post( self::ENDPOINT, array( 'timeout' => 120, 'headers' => $headers, 'body' => wp_json_encode( $body ) ) );
		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'mrabb_brain_unreachable', __( 'Mr. Abb could not reach Claude.', 'mr-abb' ), array( 'details' => $res->get_error_message() ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$raw  = wp_remote_retrieve_body( $res );
		$data = json_decode( $raw, true );
		if ( $code >= 400 || ! is_array( $data ) ) {
			$msg = isset( $data['error']['message'] ) ? $data['error']['message'] : 'Claude API error ' . $code;
			mrabb_log( 'error', 'Claude API error', array( 'code' => $code, 'msg' => $msg ) );
			if ( 401 === $code ) {
				$msg = __( 'The Anthropic API key was rejected.', 'mr-abb' );
			} elseif ( 429 === $code ) {
				$msg = __( 'Claude is rate limited right now. Try again in a moment.', 'mr-abb' );
			}
			return new WP_Error( 'mrabb_brain_error', sanitize_text_field( $msg ), array( 'status' => $code, 'details' => mb_substr( $raw, 0, 800 ) ) );
		}
		return $data;
	}

	public static function test() {
		$r = self::call( array( 'model' => self::model(), 'max_tokens' => 64, 'messages' => array( array( 'role' => 'user', 'content' => 'Reply with the single word OK.' ) ) ) );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		return array( 'summary' => sprintf( 'Claude reachable (%s).', isset( $r['model'] ) ? $r['model'] : self::model() ) );
	}

	private static function system_prompt( $user_id, $language ) {
		$owner = mrabb_get_setting( 'owner_name', 'Abbas ElDeniney' );
		$agent = mrabb_get_setting( 'agent_name', 'Mr. Abb' );
		$tz    = wp_timezone_string();
		$now   = wp_date( 'l, j F Y H:i' );
		$conn  = array();
		foreach ( MrAbb_Connectors::all_with_status() as $c ) {
			$conn[] = $c['name'] . ': ' . ( 'connected' === $c['status'] ? 'connected' : 'not connected' );
		}
		$extra = trim( (string) mrabb_get_setting( 'assistant_instructions', '' ) );
		$lang  = 'ar' === $language ? 'The owner is using the Arabic interface: reply in natural Egyptian Arabic unless they write in English.' : 'Reply in the language the owner writes in (English or Egyptian Arabic).';
		return "You are {$agent}, the personal AI command center of {$owner}. One person, one AI, all tools.\n"
			. "Now: {$now} ({$tz}). {$lang}\n"
			. "Style: short, calm, executive. Two or three sentences. Results appear on screen as cards, so summarise rather than repeat every field. No markdown headings or bullet lists.\n"
			. "Use tools to do real work; never invent calendar, email, task or CRM data. Batch independent tool calls in one turn. When a tool needs the owner's approval it returns requires_approval: say what you prepared and that it is waiting for approval, then stop; never say it was sent. If a tool fails or a service is not connected, say so plainly and suggest the Connections page.\n"
			. "Connections: " . implode( '; ', $conn ) . ".\n"
			. ( $extra ? "Owner instructions: {$extra}\n" : '' );
	}

	/** Conversation history for a session, as Claude messages (transcripts only). */
	private static function history( $session_id, $limit = 16 ) {
		$msgs = array();
		foreach ( MrAbb_Store::session_events( $session_id ) as $e ) {
			if ( 'transcript' !== $e['type'] || empty( $e['text'] ) ) {
				continue;
			}
			$role = 'user' === $e['role'] ? 'user' : 'assistant';
			if ( $msgs && $msgs[ count( $msgs ) - 1 ]['role'] === $role ) {
				$msgs[ count( $msgs ) - 1 ]['content'] .= "\n" . $e['text'];
			} else {
				$msgs[] = array( 'role' => $role, 'content' => $e['text'] );
			}
		}
		$msgs = array_slice( $msgs, -$limit );
		if ( $msgs && 'assistant' === $msgs[0]['role'] ) {
			array_shift( $msgs );
		}
		return $msgs;
	}

	/**
	 * Run one owner turn.
	 *
	 * @param string $text       The command.
	 * @param string $session_id Session.
	 * @param array  $ctx        user_id, language, source.
	 * @return array|WP_Error { reply, events }
	 */
	public static function run( $text, $session_id, $ctx ) {
		$ctx = wp_parse_args( $ctx, array( 'user_id' => 0, 'language' => 'en', 'source' => 'text', 'record_user' => true ) );
		$events = array();
		if ( $ctx['record_user'] ) {
			MrAbb_Store::add_event( $session_id, $ctx['user_id'], array( 'type' => 'transcript', 'role' => 'user', 'text' => $text ) );
			MrAbb_Store::ensure_session_title( $session_id, $text );
		}
		$messages = self::history( $session_id );
		if ( ! $ctx['record_user'] ) {
			$messages[] = array( 'role' => 'user', 'content' => $text );
		} elseif ( ! $messages || 'user' !== $messages[ count( $messages ) - 1 ]['role'] ) {
			$messages[] = array( 'role' => 'user', 'content' => $text );
		}
		$tools = MrAbb_Tools::definitions_for_claude();
		$body  = array(
			'model'         => self::model(),
			'max_tokens'    => 4096,
			'system'        => array( array( 'type' => 'text', 'text' => self::system_prompt( $ctx['user_id'], $ctx['language'] ), 'cache_control' => array( 'type' => 'ephemeral' ) ) ),
			'messages'      => $messages,
			'output_config' => array( 'effort' => mrabb_get_setting( 'claude_effort', 'medium' ) ),
		);
		if ( $tools ) {
			$body['tools'] = $tools;
		}
		if ( 0 === strpos( $body['model'], 'claude-haiku' ) ) {
			unset( $body['output_config'] );
		}

		MrAbb_Store::add_event( $session_id, $ctx['user_id'], array( 'type' => 'state', 'state' => 'thinking' ) );
		$reply  = '';
		$turns  = 0;
		$pauses = 0;
		while ( $turns < self::MAX_TURNS ) {
			$turns++;
			$res = self::call( $body );
			if ( is_wp_error( $res ) ) {
				$events[] = MrAbb_Store::add_event( $session_id, $ctx['user_id'], array( 'type' => 'error', 'message' => $res->get_error_message(), 'details' => $res->get_error_data(), 'retryable' => true ) );
				return $res;
			}
			$content = isset( $res['content'] ) && is_array( $res['content'] ) ? $res['content'] : array();
			$stop    = isset( $res['stop_reason'] ) ? $res['stop_reason'] : 'end_turn';
			$texts   = array();
			$uses    = array();
			foreach ( $content as $block ) {
				if ( 'text' === $block['type'] && ! empty( $block['text'] ) ) {
					$texts[] = $block['text'];
				} elseif ( 'tool_use' === $block['type'] ) {
					$uses[] = $block;
				}
			}
			if ( 'refusal' === $stop ) {
				$reply = 'ar' === $ctx['language'] ? 'مش هقدر أساعد في الطلب ده.' : "I can't help with that request.";
				break;
			}
			if ( 'pause_turn' === $stop && $pauses < 3 ) {
				$pauses++;
				$body['messages'][] = array( 'role' => 'assistant', 'content' => $content );
				continue;
			}
			if ( 'tool_use' !== $stop || ! $uses ) {
				$reply = trim( implode( "\n", $texts ) );
				break;
			}
			// Execute every requested tool, then send all results back in one user message.
			$body['messages'][] = array( 'role' => 'assistant', 'content' => $content );
			MrAbb_Store::add_event( $session_id, $ctx['user_id'], array( 'type' => 'state', 'state' => 'executing' ) );
			$results = array();
			foreach ( $uses as $use ) {
				$exec = MrAbb_Tools::execute( $use['name'], isset( $use['input'] ) ? $use['input'] : array(), array( 'session_id' => $session_id, 'user_id' => $ctx['user_id'], 'source' => $ctx['source'] ) );
				$events = array_merge( $events, $exec['events'] );
				$payload = array( 'status' => $exec['status'], 'summary' => $exec['summary'] );
				if ( isset( $exec['data'] ) && null !== $exec['data'] ) {
					$payload['data'] = $exec['data'];
				}
				if ( ! empty( $exec['approvalId'] ) ) {
					$payload['approvalId'] = $exec['approvalId'];
				}
				$results[] = array( 'type' => 'tool_result', 'tool_use_id' => $use['id'], 'content' => mb_substr( wp_json_encode( $payload, JSON_UNESCAPED_UNICODE ), 0, 12000 ), 'is_error' => 'failed' === $exec['status'] );
			}
			$body['messages'][] = array( 'role' => 'user', 'content' => $results );
		}
		if ( '' === $reply ) {
			$reply = 'ar' === $ctx['language'] ? 'تم.' : 'Done.';
		}
		$events[] = MrAbb_Store::add_event( $session_id, $ctx['user_id'], array( 'type' => 'transcript', 'role' => 'agent', 'text' => $reply ) );
		return array( 'reply' => $reply, 'events' => $events );
	}

	/** After the owner approved/rejected: let the assistant confirm in one line. */
	public static function after_approval( $approval, $decision, $exec_result, $ctx ) {
		$note = 'approved' === $decision
			? sprintf( '[Note from the system: the owner approved "%s". Result: %s. Confirm to the owner in one short sentence.]', $approval['title'], isset( $exec_result['summary'] ) ? $exec_result['summary'] : 'done' )
			: sprintf( '[Note from the system: the owner cancelled "%s". Acknowledge in one short sentence and mention any saved draft.]', $approval['title'] );
		return self::run( $note, $approval['session_id'], array_merge( $ctx, array( 'record_user' => false ) ) );
	}

	/** Web research through Claude's server-side web search tool. */
	public static function web_search( $query, $language = 'en' ) {
		$body = array(
			'model'      => self::model(),
			'max_tokens' => 2048,
			'system'     => 'You are a research assistant. Search the web and answer in 3-5 sentences, then nothing else. ' . ( 'ar' === $language ? 'Answer in Arabic.' : 'Answer in English.' ),
			'tools'      => array( array( 'type' => 'web_search_20260209', 'name' => 'web_search', 'max_uses' => 4 ) ),
			'messages'   => array( array( 'role' => 'user', 'content' => $query ) ),
			'output_config' => array( 'effort' => 'low' ),
		);
		$res  = self::call( $body );
		$loop = 0;
		while ( ! is_wp_error( $res ) && isset( $res['stop_reason'] ) && 'pause_turn' === $res['stop_reason'] && $loop < 3 ) {
			$loop++;
			$body['messages'][] = array( 'role' => 'assistant', 'content' => $res['content'] );
			$res = self::call( $body );
		}
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$summary = array();
		$sources = array();
		foreach ( (array) $res['content'] as $block ) {
			if ( 'text' === $block['type'] ) {
				$summary[] = $block['text'];
				foreach ( (array) ( isset( $block['citations'] ) ? $block['citations'] : array() ) as $c ) {
					if ( ! empty( $c['url'] ) ) {
						$sources[ $c['url'] ] = array( 'title' => isset( $c['title'] ) ? $c['title'] : $c['url'], 'url' => $c['url'], 'domain' => wp_parse_url( $c['url'], PHP_URL_HOST ) );
					}
				}
			} elseif ( 'web_search_tool_result' === $block['type'] && isset( $block['content'] ) && is_array( $block['content'] ) && ! isset( $block['content']['error_code'] ) ) {
				foreach ( $block['content'] as $r ) {
					if ( isset( $r['url'] ) && count( $sources ) < 6 ) {
						$sources[ $r['url'] ] = array( 'title' => isset( $r['title'] ) ? $r['title'] : $r['url'], 'url' => $r['url'], 'domain' => wp_parse_url( $r['url'], PHP_URL_HOST ) );
					}
				}
			}
		}
		return array( 'summary' => trim( implode( "\n", $summary ) ), 'sources' => array_values( $sources ) );
	}
}
