<?php
/**
 * Encrypted secret storage. Secrets never reach the browser.
 *
 * Priority: constant MRABB_SECRET_<KEY> in wp-config.php, then the encrypted
 * option. Encryption uses AES-256-CBC keyed from the site's AUTH salts.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MrAbb_Secrets {

	const PREFIX = 'mrabb_secret_';

	/**
	 * Known secret keys and their labels (for the admin UI).
	 *
	 * @return array
	 */
	public static function keys() {
		return array(
			'anthropic_api_key'         => 'Anthropic API key',
			'elevenlabs_api_key'        => 'ElevenLabs API key',
			'elevenlabs_webhook_secret' => 'ElevenLabs post-call webhook secret',
			'google_client_secret'      => 'Google OAuth client secret',
			'hook_secret'               => 'Tool webhook secret (auto-generated)',
		);
	}

	private static function constant_name( $key ) {
		return 'MRABB_SECRET_' . strtoupper( preg_replace( '/[^a-z0-9]/', '_', strtolower( $key ) ) );
	}

	private static function cipher_key() {
		$salt = ( defined( 'AUTH_KEY' ) ? AUTH_KEY : '' ) . ( defined( 'SECURE_AUTH_KEY' ) ? SECURE_AUTH_KEY : '' ) . ( defined( 'LOGGED_IN_KEY' ) ? LOGGED_IN_KEY : '' );
		if ( '' === $salt ) {
			$salt = get_option( 'mrabb_fallback_salt' );
			if ( ! $salt ) {
				$salt = wp_generate_password( 64, true, true );
				update_option( 'mrabb_fallback_salt', $salt, false );
			}
		}
		return hash( 'sha256', 'mrabb|' . $salt, true );
	}

	public static function encrypt( $plain ) {
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			return 'b64:' . base64_encode( $plain );
		}
		$iv     = random_bytes( 16 );
		$cipher = openssl_encrypt( $plain, 'aes-256-cbc', self::cipher_key(), OPENSSL_RAW_DATA, $iv );
		return 'enc:' . base64_encode( $iv . $cipher );
	}

	public static function decrypt( $stored ) {
		if ( ! is_string( $stored ) || '' === $stored ) {
			return '';
		}
		if ( 0 === strpos( $stored, 'b64:' ) ) {
			return base64_decode( substr( $stored, 4 ) );
		}
		if ( 0 === strpos( $stored, 'enc:' ) && function_exists( 'openssl_decrypt' ) ) {
			$raw = base64_decode( substr( $stored, 4 ) );
			if ( strlen( $raw ) < 17 ) {
				return '';
			}
			$plain = openssl_decrypt( substr( $raw, 16 ), 'aes-256-cbc', self::cipher_key(), OPENSSL_RAW_DATA, substr( $raw, 0, 16 ) );
			return false === $plain ? '' : $plain;
		}
		return '';
	}

	public static function get( $key ) {
		$const = self::constant_name( $key );
		if ( defined( $const ) && constant( $const ) ) {
			return (string) constant( $const );
		}
		return self::decrypt( get_option( self::PREFIX . sanitize_key( $key ), '' ) );
	}

	public static function set( $key, $value ) {
		$value = (string) $value;
		if ( '' === $value ) {
			return self::delete( $key );
		}
		return update_option( self::PREFIX . sanitize_key( $key ), self::encrypt( $value ), false );
	}

	public static function delete( $key ) {
		return delete_option( self::PREFIX . sanitize_key( $key ) );
	}

	public static function has( $key ) {
		return '' !== self::get( $key );
	}

	public static function is_constant( $key ) {
		$const = self::constant_name( $key );
		return defined( $const ) && constant( $const );
	}

	/** JSON helpers for structured secrets (OAuth tokens). */
	public static function get_json( $key ) {
		$raw = self::get( $key );
		$dec = $raw ? json_decode( $raw, true ) : null;
		return is_array( $dec ) ? $dec : array();
	}

	public static function set_json( $key, $data ) {
		return self::set( $key, wp_json_encode( $data ) );
	}

	/** The tool webhook secret is created on demand. */
	public static function hook_secret() {
		$s = self::get( 'hook_secret' );
		if ( '' === $s ) {
			$s = wp_generate_password( 48, false, false );
			self::set( 'hook_secret', $s );
		}
		return $s;
	}

	/** Constant-time comparison. */
	public static function equals( $a, $b ) {
		return is_string( $a ) && is_string( $b ) && '' !== $a && hash_equals( $a, $b );
	}
}
