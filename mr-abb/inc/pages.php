<?php
/**
 * Creates the application pages on activation and keeps them discoverable.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Create app pages if missing. Safe to call repeatedly.
 *
 * @return array Map of slug => page id.
 */
function mrabb_ensure_pages() {
	$created = array();
	$pages   = mrabb_app_pages();

	foreach ( $pages as $slug => $page ) {
		$existing = (int) get_option( 'mrabb_page_' . $slug, 0 );
		if ( $existing && get_post( $existing ) && 'trash' !== get_post_status( $existing ) ) {
			$created[ $slug ] = $existing;
			continue;
		}
		$by_slug = get_page_by_path( 'home' === $slug ? 'command-center' : $slug );
		if ( $by_slug ) {
			$page_id = $by_slug->ID;
		} else {
			$page_id = wp_insert_post(
				array(
					'post_title'   => 'home' === $slug ? mrabb_get_setting( 'agent_name', 'Mr. Abb' ) : $page['title'],
					'post_name'    => 'home' === $slug ? 'command-center' : $slug,
					'post_status'  => 'publish',
					'post_type'    => 'page',
					'post_content' => '',
					'comment_status' => 'closed',
					'ping_status'  => 'closed',
				)
			);
		}
		if ( $page_id && ! is_wp_error( $page_id ) ) {
			update_post_meta( $page_id, '_wp_page_template', $page['template'] );
			update_option( 'mrabb_page_' . $slug, (int) $page_id, false );
			$created[ $slug ] = (int) $page_id;
		}
	}

	if ( ! empty( $created['home'] ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $created['home'] );
	}

	return $created;
}

/**
 * On activation: pages + a sensible permalink structure.
 */
function mrabb_on_activation() {
	mrabb_ensure_pages();
	MrAbb_Store::install();
	MrAbb_Cron::seed_defaults();
	MrAbb_Secrets::hook_secret();
	if ( ! get_option( 'permalink_structure' ) ) {
		update_option( 'permalink_structure', '/%postname%/' );
	}
	flush_rewrite_rules();
	if ( false === get_option( MRABB_OPTION, false ) ) {
		add_option( MRABB_OPTION, mrabb_default_settings(), '', false );
	}
}
add_action( 'after_switch_theme', 'mrabb_on_activation' );

/**
 * Admin notice + repair action if pages went missing.
 */
function mrabb_pages_notice() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$missing = false;
	foreach ( array_keys( mrabb_app_pages() ) as $slug ) {
		$id = (int) get_option( 'mrabb_page_' . $slug, 0 );
		if ( ! $id || 'publish' !== get_post_status( $id ) ) {
			$missing = true;
			break;
		}
	}
	if ( ! $missing ) {
		return;
	}
	$url = wp_nonce_url( admin_url( 'admin-post.php?action=mrabb_create_pages' ), 'mrabb_create_pages' );
	echo '<div class="notice notice-warning"><p>' . esc_html__( 'Some Mr. Abb pages are missing (History, Tasks, Connections, Automations).', 'mr-abb' ) . ' <a class="button button-small" href="' . esc_url( $url ) . '">' . esc_html__( 'Create pages', 'mr-abb' ) . '</a></p></div>';
}
add_action( 'admin_notices', 'mrabb_pages_notice' );

/**
 * Handle the repair action.
 */
function mrabb_handle_create_pages() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Not allowed.', 'mr-abb' ) );
	}
	check_admin_referer( 'mrabb_create_pages' );
	mrabb_ensure_pages();
	flush_rewrite_rules();
	wp_safe_redirect( admin_url( 'admin.php?page=mrabb&pages=created' ) );
	exit;
}
add_action( 'admin_post_mrabb_create_pages', 'mrabb_handle_create_pages' );

/**
 * Show the "Mr. Abb" templates in the page editor template dropdown.
 *
 * @param array $templates Templates.
 * @return array
 */
function mrabb_theme_page_templates( $templates ) {
	foreach ( mrabb_app_pages() as $slug => $page ) {
		$templates[ $page['template'] ] = 'Mr. Abb — ' . $page['title'];
	}
	return $templates;
}
add_filter( 'theme_page_templates', 'mrabb_theme_page_templates' );
