<?php
/**
 * Client accounts: registration, login, profile, access rules.
 *
 * Built on WordPress core users (hashed passwords, sessions, native
 * password-reset emails) with a minimal "operines_client" role. Clients
 * never see wp-admin; their surface is /my-account/.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

const OPERINES_CLIENT_ROLE = 'operines_client';

/** Profile meta fields editable by the client. */
function operines_profile_fields(): array {
	return array(
		'operines_phone'    => 'Phone / WhatsApp',
		'operines_company'  => 'Company',
		'operines_industry' => 'Industry',
		'operines_size'     => 'Company size',
	);
}

add_action(
	'init',
	function () {
		if ( ! get_role( OPERINES_CLIENT_ROLE ) ) {
			add_role( OPERINES_CLIENT_ROLE, 'Operines Client', array( 'read' => true ) );
		}
	}
);

/* -------------------------------------------------- Registration */

add_action( 'admin_post_nopriv_operines_register', 'operines_handle_register' );

/**
 * Create the client account, log them in, send onboarding emails.
 */
function operines_handle_register(): void {
	if ( ! operines_form_guard( 'operines_register' ) ) {
		operines_form_redirect( '/register/', 'error' );
	}

	$name     = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$email    = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	$password = (string) wp_unslash( $_POST['password'] ?? '' ); // Hashed by core; never stored raw.
	$company  = sanitize_text_field( wp_unslash( $_POST['company'] ?? '' ) );
	$phone    = sanitize_text_field( wp_unslash( $_POST['phone'] ?? '' ) );
	$industry = sanitize_text_field( wp_unslash( $_POST['industry'] ?? '' ) );
	$size     = sanitize_text_field( wp_unslash( $_POST['size'] ?? '' ) );
	$goal     = sanitize_textarea_field( wp_unslash( $_POST['goal'] ?? '' ) );

	if ( '' === $name || ! is_email( $email ) || strlen( $password ) < 8 ) {
		operines_form_redirect( '/register/', 'error' );
	}
	if ( email_exists( $email ) ) {
		operines_form_redirect( '/register/', 'exists' );
	}

	$user_id = wp_insert_user(
		array(
			'user_login'   => $email,
			'user_email'   => $email,
			'user_pass'    => $password,
			'display_name' => $name,
			'first_name'   => $name,
			'role'         => OPERINES_CLIENT_ROLE,
		)
	);
	if ( is_wp_error( $user_id ) ) {
		operines_form_redirect( '/register/', 'error' );
	}

	update_user_meta( $user_id, 'operines_phone', $phone );
	update_user_meta( $user_id, 'operines_company', $company );
	update_user_meta( $user_id, 'operines_industry', $industry );
	update_user_meta( $user_id, 'operines_size', $size );
	if ( $goal ) {
		update_user_meta( $user_id, 'operines_goal', $goal );
	}

	// Adopt any earlier inquiries sent from this email address.
	operines_link_leads_to_user( $user_id, $email );

	// The goal itself is an inquiry — capture it in the pipeline too.
	if ( $goal ) {
		operines_store_lead(
			'Onboarding goal',
			array(
				'Name'     => $name,
				'Email'    => $email,
				'Phone'    => $phone,
				'Company'  => $company,
				'Industry' => $industry,
				'Size'     => $size,
				'Goal'     => $goal,
			)
		);
	}

	// Welcome email to the client.
	operines_send_email(
		$email,
		'Welcome to Operines',
		sprintf( 'Welcome, %s — your Operines account is ready.', $name ),
		array(
			'Here is what happens next: a consultant reviews your profile and goal, and comes back within one business day with the most useful next step for your operation.',
			'You can follow your requests, update your details, and book an AI Automation Audit from your account at any time.',
		),
		array( 'Open my account', home_url( '/my-account/' ) )
	);

	// Notify the team.
	operines_send_email(
		get_option( 'admin_email' ),
		sprintf( 'New client registered: %s (%s)', $name, $company ? $company : $email ),
		'A new client completed onboarding on the website.',
		array(
			'Name'     => $name,
			'Email'    => $email,
			'Phone'    => $phone,
			'Company'  => $company,
			'Industry' => $industry,
			'Size'     => $size,
			'Goal'     => $goal ? $goal : '—',
		),
		array( 'Open leads dashboard', admin_url( 'edit.php?post_type=operines_lead' ) )
	);

	// Log them straight in.
	wp_set_current_user( $user_id );
	wp_set_auth_cookie( $user_id, true );

	wp_safe_redirect( home_url( '/my-account/?welcome=1' ) );
	exit;
}

/**
 * Attach unowned leads matching this email to the user.
 */
function operines_link_leads_to_user( int $user_id, string $email ): void {
	$leads = get_posts(
		array(
			'post_type'   => 'operines_lead',
			'post_status' => 'private',
			'numberposts' => 50,
			'meta_query'  => array( // phpcs:ignore WordPress.DB.SlowDBQuery
				array(
					'key'   => '_operines_lead_email',
					'value' => $email,
				),
			),
		)
	);
	foreach ( $leads as $lead ) {
		if ( ! get_post_meta( $lead->ID, '_operines_lead_user', true ) ) {
			update_post_meta( $lead->ID, '_operines_lead_user', $user_id );
		}
	}
}

/* -------------------------------------------------- Login / logout */

add_action( 'admin_post_nopriv_operines_login', 'operines_handle_login' );
add_action( 'admin_post_operines_login', 'operines_handle_login' );

/**
 * Front-end sign-in.
 */
function operines_handle_login(): void {
	if ( ! isset( $_POST['_opnonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_opnonce'] ) ), 'operines_login' ) ) {
		operines_form_redirect( '/login/', 'error' );
	}

	$creds = array(
		'user_login'    => sanitize_email( wp_unslash( $_POST['email'] ?? '' ) ),
		'user_password' => (string) wp_unslash( $_POST['password'] ?? '' ),
		'remember'      => ! empty( $_POST['remember'] ),
	);

	$user = wp_signon( $creds, is_ssl() );
	if ( is_wp_error( $user ) ) {
		operines_form_redirect( '/login/', 'error' );
	}

	wp_safe_redirect( home_url( '/my-account/' ) );
	exit;
}

/* -------------------------------------------------- Profile update */

add_action( 'admin_post_operines_profile', 'operines_handle_profile' );

/**
 * Client updates their own details from /my-account/.
 */
function operines_handle_profile(): void {
	if ( ! is_user_logged_in()
		|| ! isset( $_POST['_opnonce'] )
		|| ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_opnonce'] ) ), 'operines_profile' ) ) {
		operines_form_redirect( '/my-account/', 'error' );
	}

	$user_id = get_current_user_id();

	$name = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	if ( $name ) {
		wp_update_user(
			array(
				'ID'           => $user_id,
				'display_name' => $name,
				'first_name'   => $name,
			)
		);
	}
	foreach ( array_keys( operines_profile_fields() ) as $meta_key ) {
		$field = str_replace( 'operines_', '', $meta_key );
		if ( isset( $_POST[ $field ] ) ) {
			update_user_meta( $user_id, $meta_key, sanitize_text_field( wp_unslash( $_POST[ $field ] ) ) );
		}
	}

	operines_form_redirect( '/my-account/', 'sent' );
}

/* -------------------------------------------------- Access rules */

add_action(
	'template_redirect',
	function () {
		// The account area requires sign-in.
		if ( is_page( 'my-account' ) && ! is_user_logged_in() ) {
			wp_safe_redirect( home_url( '/login/' ) );
			exit;
		}
		// Signed-in clients skip the auth pages.
		if ( is_user_logged_in() && ( is_page( 'login' ) || is_page( 'register' ) ) ) {
			wp_safe_redirect( home_url( '/my-account/' ) );
			exit;
		}
	}
);

// Clients live on the front-end: no admin bar, no wp-admin.
add_filter(
	'show_admin_bar',
	fn( $show ) => current_user_can( 'edit_posts' ) ? $show : false
);
add_action(
	'admin_init',
	function () {
		global $pagenow;
		// admin-post.php and admin-ajax.php are form/API endpoints used by
		// the front-end for everyone — only admin SCREENS are locked down.
		if ( in_array( $pagenow, array( 'admin-post.php', 'admin-ajax.php' ), true ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_safe_redirect( home_url( '/my-account/' ) );
			exit;
		}
	}
);

/**
 * The signed-in client's leads, most recent first.
 */
function operines_user_leads( int $user_id ): array {
	return get_posts(
		array(
			'post_type'   => 'operines_lead',
			'post_status' => 'private',
			'numberposts' => 20,
			'meta_query'  => array( // phpcs:ignore WordPress.DB.SlowDBQuery
				array(
					'key'   => '_operines_lead_user',
					'value' => $user_id,
				),
			),
		)
	);
}

/** Lead status vocabulary shared by admin + client views. */
function operines_lead_statuses(): array {
	return array(
		'new'       => 'New',
		'review'    => 'In review',
		'contacted' => 'Contacted',
		'closed'    => 'Closed',
	);
}
