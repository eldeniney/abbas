<?php
/**
 * Internal leads dashboard (wp-admin).
 *
 * Turns the Leads screen into a working inbox: type/company/contact/status
 * columns with filtering, a status workflow + internal notes metabox, an
 * optional automated status email to the client, and an at-a-glance
 * summary widget on the WordPress dashboard.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

/* -------------------------------------------------- List table columns */

add_filter(
	'manage_operines_lead_posts_columns',
	function ( $columns ) {
		return array(
			'cb'           => $columns['cb'],
			'title'        => __( 'Inquiry', 'operines' ),
			'lead_type'    => __( 'Type', 'operines' ),
			'lead_company' => __( 'Company', 'operines' ),
			'lead_contact' => __( 'Contact', 'operines' ),
			'lead_status'  => __( 'Status', 'operines' ),
			'date'         => __( 'Received', 'operines' ),
		);
	}
);

add_action(
	'manage_operines_lead_posts_custom_column',
	function ( $column, $post_id ) {
		switch ( $column ) {
			case 'lead_type':
				echo esc_html( get_post_meta( $post_id, '_operines_lead_type', true ) );
				break;
			case 'lead_company':
				echo esc_html( get_post_meta( $post_id, '_operines_lead_company', true ) );
				break;
			case 'lead_contact':
				$email = get_post_meta( $post_id, '_operines_lead_email', true );
				$phone = get_post_meta( $post_id, '_operines_lead_phone', true );
				if ( $email ) {
					printf( '<a href="mailto:%1$s">%1$s</a><br>', esc_attr( $email ) );
				}
				echo esc_html( $phone );
				break;
			case 'lead_status':
				$status   = get_post_meta( $post_id, '_operines_lead_status', true );
				$statuses = operines_lead_statuses();
				$label    = $statuses[ $status ] ?? $statuses['new'];
				printf( '<span class="operines-status operines-status--%s">%s</span>', esc_attr( $status ? $status : 'new' ), esc_html( $label ) );
				break;
		}
	},
	10,
	2
);

// Status filter dropdown above the list.
add_action(
	'restrict_manage_posts',
	function ( $post_type ) {
		if ( 'operines_lead' !== $post_type ) {
			return;
		}
		$current = sanitize_key( wp_unslash( $_GET['lead_status'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		echo '<select name="lead_status"><option value="">' . esc_html__( 'All statuses', 'operines' ) . '</option>';
		foreach ( operines_lead_statuses() as $key => $label ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $current, $key, false ), esc_html( $label ) );
		}
		echo '</select>';
	}
);

add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( ! is_admin() || ! $query->is_main_query() || 'operines_lead' !== $query->get( 'post_type' ) ) {
			return;
		}
		$status = sanitize_key( wp_unslash( $_GET['lead_status'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( $status ) {
			$query->set( 'meta_key', '_operines_lead_status' ); // phpcs:ignore WordPress.DB.SlowDBQuery
			$query->set( 'meta_value', $status ); // phpcs:ignore WordPress.DB.SlowDBQuery
		}
	}
);

// Status badge styling in admin.
add_action(
	'admin_head',
	function () {
		echo '<style>
		.operines-status{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600}
		.operines-status--new{background:#ede4f4;color:#4f1964}
		.operines-status--review{background:#fdf0d5;color:#8a5b00}
		.operines-status--contacted{background:#dcf1e7;color:#1f7a55}
		.operines-status--closed{background:#e8e6ec;color:#5f5a68}
		</style>';
	}
);

/* -------------------------------------------------- Status + notes metabox */

add_action(
	'add_meta_boxes_operines_lead',
	function () {
		add_meta_box(
			'operines_lead_manage',
			__( 'Manage inquiry', 'operines' ),
			'operines_lead_metabox',
			'operines_lead',
			'side',
			'high'
		);
	}
);

/**
 * Status select, notify toggle and internal notes.
 *
 * @param WP_Post $post Lead post.
 */
function operines_lead_metabox( $post ): void {
	$status = get_post_meta( $post->ID, '_operines_lead_status', true );
	$notes  = get_post_meta( $post->ID, '_operines_lead_notes', true );
	wp_nonce_field( 'operines_lead_manage', '_operines_lead_nonce' );
	echo '<p><label><strong>' . esc_html__( 'Status', 'operines' ) . '</strong></label><br><select name="operines_lead_status" style="width:100%">';
	foreach ( operines_lead_statuses() as $key => $label ) {
		printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $status ? $status : 'new', $key, false ), esc_html( $label ) );
	}
	echo '</select></p>';
	echo '<p><label><input type="checkbox" name="operines_lead_notify" value="1"> ' . esc_html__( 'Email the client about this status change', 'operines' ) . '</label></p>';
	echo '<p><label><strong>' . esc_html__( 'Internal notes', 'operines' ) . '</strong></label><br><textarea name="operines_lead_notes" rows="5" style="width:100%">' . esc_textarea( $notes ) . '</textarea></p>';
}

add_action(
	'save_post_operines_lead',
	function ( $post_id ) {
		if ( ! isset( $_POST['_operines_lead_nonce'] )
			|| ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_operines_lead_nonce'] ) ), 'operines_lead_manage' )
			|| ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		$old_status = get_post_meta( $post_id, '_operines_lead_status', true );
		$new_status = sanitize_key( wp_unslash( $_POST['operines_lead_status'] ?? 'new' ) );
		if ( ! isset( operines_lead_statuses()[ $new_status ] ) ) {
			$new_status = 'new';
		}
		update_post_meta( $post_id, '_operines_lead_status', $new_status );
		update_post_meta( $post_id, '_operines_lead_notes', sanitize_textarea_field( wp_unslash( $_POST['operines_lead_notes'] ?? '' ) ) );

		// Optional automated status email to the client.
		$email = get_post_meta( $post_id, '_operines_lead_email', true );
		if ( ! empty( $_POST['operines_lead_notify'] ) && $email && $new_status !== $old_status ) {
			$labels = operines_lead_statuses();
			operines_send_email(
				$email,
				'Update on your Operines request',
				'A quick update on your request with Operines.',
				array(
					'Request' => get_post_meta( $post_id, '_operines_lead_type', true ),
					'Status'  => $labels[ $new_status ],
					'closed' === $new_status
						? 'This request is now closed. If anything else should run better in your business, we are one message away.'
						: 'We will keep you posted as it moves. You can also track it from your account.',
				),
				array( 'View my account', home_url( '/my-account/' ) )
			);
		}
	}
);

/* -------------------------------------------------- Dashboard widget */

add_action(
	'wp_dashboard_setup',
	function () {
		wp_add_dashboard_widget( 'operines_leads_summary', 'Operines — Inquiries', 'operines_leads_widget' );
	}
);

/**
 * Counts by status + latest five inquiries.
 */
function operines_leads_widget(): void {
	$counts = array();
	foreach ( array_keys( operines_lead_statuses() ) as $key ) {
		$q = new WP_Query(
			array(
				'post_type'      => 'operines_lead',
				'post_status'    => 'private',
				'meta_key'       => '_operines_lead_status', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_value'     => $key, // phpcs:ignore WordPress.DB.SlowDBQuery
				'posts_per_page' => 1,
				'fields'         => 'ids',
			)
		);
		$counts[ $key ] = (int) $q->found_posts;
	}

	echo '<p>';
	foreach ( operines_lead_statuses() as $key => $label ) {
		printf( '<span class="operines-status operines-status--%s" style="margin-right:6px">%s: %d</span>', esc_attr( $key ), esc_html( $label ), (int) $counts[ $key ] );
	}
	echo '</p>';

	$latest = get_posts(
		array(
			'post_type'   => 'operines_lead',
			'post_status' => 'private',
			'numberposts' => 5,
		)
	);
	if ( $latest ) {
		echo '<ul style="margin:0">';
		foreach ( $latest as $lead ) {
			printf(
				'<li><a href="%s">%s</a></li>',
				esc_url( get_edit_post_link( $lead->ID ) ),
				esc_html( $lead->post_title )
			);
		}
		echo '</ul>';
	}
	printf(
		'<p><a class="button" href="%s">%s</a></p>',
		esc_url( admin_url( 'edit.php?post_type=operines_lead' ) ),
		esc_html__( 'Open all inquiries', 'operines' )
	);
}
