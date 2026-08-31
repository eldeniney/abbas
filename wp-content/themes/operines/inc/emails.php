<?php
/**
 * Branded transactional emails.
 *
 * All automated mail goes through operines_send_email(), which wraps the
 * message in a simple, robust HTML shell (logo header, purple accent,
 * footer). Uses wp_mail(); on production install an SMTP plugin
 * (e.g. WP Mail SMTP) for reliable delivery — no code change needed.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

/**
 * Send a branded HTML email.
 *
 * @param string $to      Recipient email.
 * @param string $subject Subject line.
 * @param string $intro   Greeting/intro line (plain text).
 * @param array  $lines   Body paragraphs (plain text) or ['label' => 'value'] rows.
 * @param array  $cta     Optional [label, url] button.
 */
function operines_send_email( string $to, string $subject, string $intro, array $lines = array(), array $cta = array() ): bool {
	$purple = '#4f1964';

	$body_html = '';
	foreach ( $lines as $key => $line ) {
		if ( is_string( $key ) ) {
			$body_html .= sprintf(
				'<tr><td style="padding:4px 12px 4px 0;color:#6f6779;font-size:13px;white-space:nowrap;vertical-align:top">%s</td><td style="padding:4px 0;color:#1b1523;font-size:14px">%s</td></tr>',
				esc_html( $key ),
				nl2br( esc_html( $line ) )
			);
		} else {
			$body_html .= sprintf(
				'<tr><td colspan="2" style="padding:6px 0;color:#4a4353;font-size:15px;line-height:1.6">%s</td></tr>',
				nl2br( esc_html( $line ) )
			);
		}
	}

	$cta_html = '';
	if ( $cta ) {
		$cta_html = sprintf(
			'<p style="margin:26px 0 6px"><a href="%s" style="background:%s;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;display:inline-block">%s</a></p>',
			esc_url( $cta[1] ),
			$purple,
			esc_html( $cta[0] )
		);
	}

	$html = sprintf(
		'<!DOCTYPE html><html><body style="margin:0;padding:0;background:#faf7f1">
		<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
			<p style="font-size:22px;font-weight:700;color:%1$s;margin:0 0 22px;letter-spacing:-0.5px">Operines</p>
			<div style="background:#ffffff;border:1px solid #e7dfe6;border-radius:14px;padding:26px 28px">
				<p style="color:#1b1523;font-size:16px;line-height:1.6;margin:0 0 14px">%2$s</p>
				<table style="border-collapse:collapse;width:100%%">%3$s</table>
				%4$s
			</div>
			<p style="color:#8d8598;font-size:12px;line-height:1.6;margin:18px 4px 0">Operines — AI &amp; Business Automation, UAE<br>Your business. Operating intelligently.</p>
		</div></body></html>',
		$purple,
		nl2br( esc_html( $intro ) ),
		$body_html,
		$cta_html
	);

	return wp_mail(
		$to,
		$subject,
		$html,
		array( 'Content-Type: text/html; charset=UTF-8' )
	);
}
