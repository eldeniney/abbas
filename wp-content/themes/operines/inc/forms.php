<?php
/**
 * Form handling: contact form and the AI Automation Audit request.
 *
 * Submissions are validated server-side, protected by nonce + honeypot +
 * time-trap, stored privately as `operines_lead` posts, and emailed to the
 * site admin. No data leaves the site. When a CRM/webhook endpoint exists,
 * hook `operines_lead_created` to forward it.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_post_nopriv_operines_contact', 'operines_handle_contact' );
add_action( 'admin_post_operines_contact', 'operines_handle_contact' );
add_action( 'admin_post_nopriv_operines_audit', 'operines_handle_audit' );
add_action( 'admin_post_operines_audit', 'operines_handle_audit' );

/**
 * Shared guards: nonce, honeypot, minimum fill time.
 */
function operines_form_guard( string $action ): bool {
	if ( ! isset( $_POST['_opnonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_opnonce'] ) ), $action ) ) {
		return false;
	}
	// Honeypot: hidden "website" field must stay empty.
	if ( ! empty( $_POST['website'] ) ) {
		return false;
	}
	// Time trap: form must be open at least 2 seconds (bots submit instantly;
	// humans, even with autofill, do not).
	$ts = isset( $_POST['_opts'] ) ? absint( $_POST['_opts'] ) : 0;
	if ( ! $ts || ( time() - $ts ) < 2 ) {
		return false;
	}
	return true;
}

/**
 * Redirect back with a status flag.
 */
function operines_form_redirect( string $fallback, string $status ): void {
	$back = wp_get_referer() ? wp_get_referer() : home_url( $fallback );
	$back = remove_query_arg( array( 'sent', 'error' ), $back );
	wp_safe_redirect( add_query_arg( $status, '1', $back ) . '#form-status' );
	exit;
}

/**
 * Store a lead, link it to a client account, and run the automated
 * notifications: branded auto-reply to the inquirer + team alert.
 *
 * @param string $type   Lead type label.
 * @param array  $fields Sanitized field => value pairs (Name/Email/Phone/Company + specifics).
 */
function operines_store_lead( string $type, array $fields ): void {
	$lines = '';
	foreach ( $fields as $k => $v ) {
		$lines .= sprintf( "%s: %s\n", $k, $v );
	}

	$email = strtolower( trim( $fields['Email'] ?? '' ) );

	// Attach to a client account: the signed-in user, or a match by email.
	$user_id = get_current_user_id();
	if ( ! $user_id && $email ) {
		$user    = get_user_by( 'email', $email );
		$user_id = $user ? (int) $user->ID : 0;
	}

	$lead_id = wp_insert_post(
		array(
			'post_type'    => 'operines_lead',
			'post_status'  => 'private',
			'post_title'   => sprintf( '[%s] %s — %s', $type, $fields['Name'] ?? 'Unknown', gmdate( 'Y-m-d H:i' ) ),
			'post_content' => $lines,
			'meta_input'   => array(
				'_operines_lead_type'    => $type,
				'_operines_lead_status'  => 'new',
				'_operines_lead_email'   => $email,
				'_operines_lead_phone'   => $fields['Phone'] ?? '',
				'_operines_lead_company' => $fields['Company'] ?? '',
				'_operines_lead_user'    => $user_id ? $user_id : '',
			),
		)
	);

	// Automated confirmation to the inquirer.
	if ( $email && 'Onboarding goal' !== $type ) {
		$is_audit = ( 'Audit request' === $type );
		operines_send_email(
			$email,
			$is_audit ? 'Your AI Automation Audit request — Operines' : 'We received your message — Operines',
			sprintf( 'Thank you, %s — your %s is with us.', $fields['Name'] ?? '', $is_audit ? 'audit request' : 'message' ),
			array(
				$is_audit
					? 'A consultant is reviewing your answers and will come back within one business day with your automation opportunity map and the recommended first step.'
					: 'A consultant will reply within one business day. If it is urgent, just reply to this email.',
				$user_id
					? 'You can follow the status of this request from your account at any time.'
					: 'Tip: create a free account to follow the status of your requests and keep your details in one place.',
			),
			$user_id
				? array( 'Track my request', home_url( '/my-account/' ) )
				: array( 'Create my account', home_url( '/register/' ) )
		);
	}

	// Team alert with a direct link into the leads dashboard.
	operines_send_email(
		get_option( 'admin_email' ),
		sprintf( 'New %s — %s', strtolower( $type ), $fields['Name'] ?? 'Unknown' ),
		sprintf( 'A new %s arrived from the website.', strtolower( $type ) ),
		$fields,
		array( 'Open leads dashboard', admin_url( 'edit.php?post_type=operines_lead' ) )
	);

	/**
	 * Integration point: forward the lead to a CRM or webhook.
	 *
	 * @param int    $lead_id Stored lead post ID.
	 * @param string $type    Lead type.
	 * @param array  $fields  Field => value pairs.
	 */
	do_action( 'operines_lead_created', $lead_id, $type, $fields );
}

/**
 * Contact form.
 */
function operines_handle_contact(): void {
	if ( ! operines_form_guard( 'operines_contact' ) ) {
		operines_form_redirect( '/contact/', 'error' );
	}

	$name    = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$email   = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	$phone   = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
	$company = sanitize_text_field( wp_unslash( $_POST['company'] ?? '' ) );
	$topic   = sanitize_text_field( wp_unslash( $_POST['topic'] ?? '' ) );
	$message = sanitize_textarea_field( wp_unslash( $_POST['message'] ?? '' ) );

	if ( '' === $name || ! is_email( $email ) || '' === $message ) {
		operines_form_redirect( '/contact/', 'error' );
	}

	operines_store_lead(
		'Contact',
		array(
			'Name'    => $name,
			'Email'   => $email,
			'Phone'   => $phone,
			'Company' => $company,
			'Topic'   => $topic,
			'Message' => $message,
		)
	);

	operines_form_redirect( '/contact/', 'sent' );
}

/**
 * AI Automation Audit request (multi-step assessment).
 */
function operines_handle_audit(): void {
	if ( ! operines_form_guard( 'operines_audit' ) ) {
		operines_form_redirect( '/book-audit/', 'error' );
	}

	$name    = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$email   = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	$phone   = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
	$company = sanitize_text_field( wp_unslash( $_POST['company'] ?? '' ) );

	if ( '' === $name || ! is_email( $email ) ) {
		operines_form_redirect( '/book-audit/', 'error' );
	}

	$fields = array(
		'Name'                   => $name,
		'Email'                  => $email,
		'Phone'                  => $phone,
		'Company'                => $company,
		'Industry'               => sanitize_text_field( wp_unslash( $_POST['industry'] ?? '' ) ),
		'Company size'           => sanitize_text_field( wp_unslash( $_POST['size'] ?? '' ) ),
		'Department focus'       => sanitize_text_field( wp_unslash( $_POST['department'] ?? '' ) ),
		'Current systems'        => sanitize_text_field( wp_unslash( $_POST['systems'] ?? '' ) ),
		'Most time-consuming'    => sanitize_textarea_field( wp_unslash( $_POST['process'] ?? '' ) ),
		'Main challenge'         => sanitize_text_field( wp_unslash( $_POST['challenge'] ?? '' ) ),
	);

	operines_store_lead( 'Audit request', $fields );

	operines_form_redirect( '/book-audit/', 'sent' );
}
