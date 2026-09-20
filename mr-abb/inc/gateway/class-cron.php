<?php
/**
 * Automations: scheduled prompts run by the brain through WP-Cron.
 *
 * Schedule format (stored): { type: daily|weekdays|weekly|hourly, time: "07:45", day: 0-6 }
 * The UI accepts free text like "weekdays 07:45", "daily 18:00", "weekly sunday 08:00", "hourly".
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Cron {

	const OPTION = 'mrabb_automations';
	const HOOK   = 'mrabb_cron_tick';

	public static function init() {
		add_filter( 'cron_schedules', array( __CLASS__, 'schedules' ) );
		add_action( self::HOOK, array( __CLASS__, 'tick' ) );
		add_action( 'mrabb_run_automation', array( __CLASS__, 'run' ) );
		add_action( 'init', array( __CLASS__, 'ensure_scheduled' ) );
	}

	public static function schedules( $s ) {
		$s['mrabb_15min'] = array( 'interval' => 15 * MINUTE_IN_SECONDS, 'display' => 'Every 15 minutes (Mr. Abb)' );
		return $s;
	}

	public static function ensure_scheduled() {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + 60, 'mrabb_15min', self::HOOK );
		}
	}

	public static function all() {
		$a = get_option( self::OPTION, array() );
		return is_array( $a ) ? $a : array();
	}

	private static function save( $list ) {
		update_option( self::OPTION, array_values( $list ), false );
	}

	public static function parse_schedule( $text ) {
		$t = mb_strtolower( trim( (string) $text ) );
		if ( is_array( $text ) ) {
			return wp_parse_args( $text, array( 'type' => 'daily', 'time' => '08:00', 'day' => 1 ) );
		}
		$time = '08:00';
		if ( preg_match( '/(\d{1,2})[:.](\d{2})\s*(am|pm)?/', $t, $m ) ) {
			$h = (int) $m[1];
			if ( isset( $m[3] ) && 'pm' === $m[3] && $h < 12 ) { $h += 12; }
			if ( isset( $m[3] ) && 'am' === $m[3] && 12 === $h ) { $h = 0; }
			$time = sprintf( '%02d:%s', $h, $m[2] );
		}
		$days = array( 'sunday' => 0, 'monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4, 'friday' => 5, 'saturday' => 6, 'الأحد' => 0, 'الاثنين' => 1, 'الثلاثاء' => 2, 'الأربعاء' => 3, 'الخميس' => 4, 'الجمعة' => 5, 'السبت' => 6 );
		if ( false !== strpos( $t, 'hour' ) || false !== strpos( $t, 'ساعة' ) ) {
			return array( 'type' => 'hourly', 'time' => '', 'day' => 0 );
		}
		if ( false !== strpos( $t, 'weekday' ) || false !== strpos( $t, 'أيام العمل' ) ) {
			return array( 'type' => 'weekdays', 'time' => $time, 'day' => 0 );
		}
		foreach ( $days as $name => $n ) {
			if ( false !== strpos( $t, $name ) ) {
				return array( 'type' => 'weekly', 'time' => $time, 'day' => $n );
			}
		}
		return array( 'type' => 'daily', 'time' => $time, 'day' => 0 );
	}

	public static function describe( $s ) {
		$days = array( __( 'Sunday', 'mr-abb' ), __( 'Monday', 'mr-abb' ), __( 'Tuesday', 'mr-abb' ), __( 'Wednesday', 'mr-abb' ), __( 'Thursday', 'mr-abb' ), __( 'Friday', 'mr-abb' ), __( 'Saturday', 'mr-abb' ) );
		switch ( $s['type'] ) {
			case 'hourly':   return __( 'Every hour', 'mr-abb' );
			case 'weekdays': return sprintf( __( 'Every weekday — %s', 'mr-abb' ), $s['time'] );
			case 'weekly':   return sprintf( __( 'Every %1$s — %2$s', 'mr-abb' ), $days[ (int) $s['day'] % 7 ], $s['time'] );
			default:         return sprintf( __( 'Daily — %s', 'mr-abb' ), $s['time'] );
		}
	}

	/** Next run timestamp (UTC) after $from. */
	public static function next_run( $s, $from = null ) {
		$tz   = wp_timezone();
		$from = $from ? $from : time();
		$now  = ( new DateTime( '@' . $from ) )->setTimezone( $tz );
		if ( 'hourly' === $s['type'] ) {
			return $from + HOUR_IN_SECONDS;
		}
		list( $h, $mi ) = array_map( 'intval', explode( ':', $s['time'] ? $s['time'] : '08:00' ) );
		$candidate = ( clone $now )->setTime( $h, $mi, 0 );
		for ( $i = 0; $i < 8; $i++ ) {
			if ( $i > 0 ) { $candidate->modify( '+1 day' ); }
			if ( $candidate->getTimestamp() <= $from ) { continue; }
			$dow = (int) $candidate->format( 'w' );
			if ( 'weekdays' === $s['type'] && in_array( $dow, (array) apply_filters( 'mrabb_weekend_days', array( 0, 6 ) ), true ) ) { continue; } // Weekend defaults to Sat/Sun (UAE); filter to change.
			if ( 'weekly' === $s['type'] && $dow !== (int) $s['day'] ) { continue; }
			return $candidate->getTimestamp();
		}
		return $from + DAY_IN_SECONDS;
	}

	public static function create( $name, $schedule, $prompt, $description = '' ) {
		$name = sanitize_text_field( $name );
		if ( '' === $name ) {
			return new WP_Error( 'mrabb_invalid', __( 'Give the automation a name.', 'mr-abb' ), array( 'status' => 400 ) );
		}
		$s    = self::parse_schedule( $schedule );
		$list = self::all();
		$a    = array( 'id' => 'auto_' . wp_generate_password( 10, false, false ), 'name' => $name, 'prompt' => sanitize_textarea_field( $prompt ? $prompt : $name ), 'schedule' => $s, 'enabled' => true, 'description' => sanitize_text_field( $description ), 'last_run' => null, 'last_status' => null, 'next_run' => self::next_run( $s ) );
		$list[] = $a;
		self::save( $list );
		return $a;
	}

	public static function update( $id, $fields ) {
		$list = self::all();
		foreach ( $list as &$a ) {
			if ( $a['id'] === $id ) {
				$a = array_merge( $a, $fields );
				if ( isset( $fields['schedule'] ) ) {
					$a['schedule'] = self::parse_schedule( $fields['schedule'] );
					$a['next_run'] = self::next_run( $a['schedule'] );
				}
			}
		}
		self::save( $list );
	}

	public static function delete( $id ) {
		self::save( array_filter( self::all(), function ( $a ) use ( $id ) { return $a['id'] !== $id; } ) );
	}

	public static function toggle( $id, $enabled ) {
		self::update( $id, array( 'enabled' => (bool) $enabled, 'next_run' => self::next_run( self::get( $id )['schedule'] ) ) );
		return array( 'ok' => true, 'enabled' => (bool) $enabled );
	}

	public static function get( $id ) {
		foreach ( self::all() as $a ) {
			if ( $a['id'] === $id ) {
				return $a;
			}
		}
		return null;
	}

	public static function run_now( $id ) {
		if ( ! self::get( $id ) ) {
			return new WP_Error( 'mrabb_not_found', 'Unknown automation', array( 'status' => 404 ) );
		}
		wp_schedule_single_event( time(), 'mrabb_run_automation', array( $id ) );
		spawn_cron();
		return array( 'ok' => true, 'queued' => true );
	}

	public static function tick() {
		$now = time();
		foreach ( self::all() as $a ) {
			if ( empty( $a['enabled'] ) ) {
				continue;
			}
			if ( empty( $a['next_run'] ) || $a['next_run'] <= $now ) {
				self::update( $a['id'], array( 'next_run' => self::next_run( $a['schedule'], $now ) ) );
				self::run( $a['id'] );
			}
		}
	}

	public static function run( $id ) {
		$a = self::get( $id );
		if ( ! $a || ! MrAbb_Brain::configured() ) {
			return;
		}
		$user_id = mrabb_owner_user_id();
		wp_set_current_user( $user_id );
		$session = MrAbb_Store::create_session( $user_id, 'automation', $a['name'] );
		$r       = MrAbb_Brain::run( $a['prompt'], $session, array( 'user_id' => $user_id, 'language' => mrabb_get_setting( 'default_language', 'en' ), 'source' => 'automation' ) );
		MrAbb_Store::end_session( $session );
		self::update( $id, array( 'last_run' => gmdate( 'c' ), 'last_status' => is_wp_error( $r ) ? 'failed' : 'completed', 'last_session' => $session ) );
		mrabb_log( 'info', 'Automation ran: ' . $a['name'], array( 'status' => is_wp_error( $r ) ? 'failed' : 'completed' ) );
	}

	public static function automations_for_ui() {
		$out = array();
		foreach ( self::all() as $a ) {
			$out[] = array( 'id' => $a['id'], 'name' => $a['name'], 'schedule' => self::describe( $a['schedule'] ), 'enabled' => ! empty( $a['enabled'] ), 'lastRun' => $a['last_run'], 'lastStatus' => $a['last_status'], 'description' => isset( $a['description'] ) && $a['description'] ? $a['description'] : $a['prompt'], 'prompt' => $a['prompt'] );
		}
		return $out;
	}

	/** Seed a sensible default set the first time. */
	public static function seed_defaults() {
		if ( self::all() || get_option( 'mrabb_automations_seeded' ) ) {
			return;
		}
		self::create( 'Morning Briefing', 'weekdays 07:45', "Give me my morning briefing: today's calendar, open tasks, and anything that needs my attention. Keep it short.", 'Calendar, tasks and priorities in one summary.' );
		self::create( 'Email Follow-up Check', 'weekdays 16:00', 'Search my email for threads from the last 3 days that are waiting on my reply and list them.', 'Finds threads waiting on you.' );
		update_option( 'mrabb_automations_seeded', 1, false );
		self::update( self::all()[1]['id'], array( 'enabled' => false ) );
	}
}
MrAbb_Cron::init();
