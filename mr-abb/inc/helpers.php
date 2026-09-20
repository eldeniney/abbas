<?php
/**
 * Small template helpers.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Current interface language (en|ar).
 *
 * Order: explicit query var (?lang=ar) > user meta > site default setting.
 *
 * @return string
 */
function mrabb_current_language() {
	$lang = mrabb_get_setting( 'default_language', 'en' );
	if ( is_user_logged_in() ) {
		$user_lang = get_user_meta( get_current_user_id(), 'mrabb_language', true );
		if ( in_array( $user_lang, array( 'en', 'ar' ), true ) ) {
			$lang = $user_lang;
		}
	}
	if ( isset( $_GET['lang'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display preference.
		$q = sanitize_key( wp_unslash( $_GET['lang'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( in_array( $q, array( 'en', 'ar' ), true ) ) {
			$lang = $q;
		}
	}
	return $lang;
}

/**
 * Text direction for the current language.
 *
 * @return string
 */
function mrabb_text_direction() {
	return 'ar' === mrabb_current_language() ? 'rtl' : 'ltr';
}

/**
 * The app pages the theme knows about, keyed by slug.
 *
 * @return array
 */
function mrabb_app_pages() {
	return array(
		'home'        => array(
			'title'    => __( 'Home', 'mr-abb' ),
			'template' => 'templates/dashboard.php',
			'icon'     => 'home',
		),
		'history'     => array(
			'title'    => __( 'History', 'mr-abb' ),
			'template' => 'templates/history.php',
			'icon'     => 'history',
		),
		'tasks'       => array(
			'title'    => __( 'Tasks', 'mr-abb' ),
			'template' => 'templates/tasks.php',
			'icon'     => 'tasks',
		),
		'connections' => array(
			'title'    => __( 'Connections', 'mr-abb' ),
			'template' => 'templates/connections.php',
			'icon'     => 'connections',
		),
		'automations' => array(
			'title'    => __( 'Automations', 'mr-abb' ),
			'template' => 'templates/automations.php',
			'icon'     => 'automations',
		),
	);
}

/**
 * URL for an app page. Falls back to a query fallback route if the page is missing.
 *
 * @param string $slug Page slug.
 * @return string
 */
function mrabb_page_url( $slug ) {
	if ( 'home' === $slug ) {
		return home_url( '/' );
	}
	$page_id = (int) get_option( 'mrabb_page_' . $slug, 0 );
	if ( $page_id && 'publish' === get_post_status( $page_id ) ) {
		return get_permalink( $page_id );
	}
	return add_query_arg( 'mrabb_view', $slug, home_url( '/' ) );
}

/**
 * Which app view is being rendered now.
 *
 * @return string
 */
function mrabb_current_view() {
	global $mrabb_current_view;
	if ( ! empty( $mrabb_current_view ) ) {
		return $mrabb_current_view;
	}
	if ( isset( $_GET['mrabb_view'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$view = sanitize_key( wp_unslash( $_GET['mrabb_view'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( array_key_exists( $view, mrabb_app_pages() ) ) {
			return $view;
		}
	}
	if ( is_front_page() ) {
		return 'home';
	}
	if ( is_page() ) {
		$id = get_queried_object_id();
		foreach ( array_keys( mrabb_app_pages() ) as $slug ) {
			if ( (int) get_option( 'mrabb_page_' . $slug, 0 ) === $id ) {
				return $slug;
			}
		}
	}
	return 'content';
}

/**
 * Inline SVG icon set. Deliberately small.
 *
 * @param string $name Icon name.
 * @param int    $size Pixel size.
 * @return string
 */
function mrabb_icon( $name, $size = 20 ) {
	$paths = array(
		'home'        => '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
		'history'     => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		'tasks'       => '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m4 6 1 1 2-2"/><path d="m4 12 1 1 2-2"/><path d="m4 18 1 1 2-2"/>',
		'connections' => '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6"/><path d="m8.2 13.2 7.6 3.6"/>',
		'automations' => '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
		'plus'        => '<path d="M12 5v14"/><path d="M5 12h14"/>',
		'settings'    => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
		'user'        => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
		'mic'         => '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
		'tools'       => '<path d="M14.7 6.3a4 4 0 0 0 5 5L13 18l-3-3 6.7-8.7z"/><path d="m5 21 5-5"/>',
		'chevron'     => '<path d="m9 6 6 6-6 6"/>',
		'close'       => '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
		'check'       => '<path d="m5 12 4.5 4.5L19 7"/>',
		'panel'       => '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>',
		'menu'        => '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
		'globe'       => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>',
		'send'        => '<path d="m4 12 16-8-5 16-3-6z"/>',
		'keyboard'    => '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
		'logout'      => '<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4"/><path d="M9 12h10"/>',
	);
	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}
	return sprintf(
		'<svg class="mrabb-icon mrabb-icon--%1$s" width="%2$d" height="%2$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%3$s</svg>',
		esc_attr( $name ),
		(int) $size,
		$paths[ $name ]
	);
}

/**
 * Echo an inline icon (already escaped SVG).
 *
 * @param string $name Icon name.
 * @param int    $size Size.
 */
function mrabb_the_icon( $name, $size = 20 ) {
	echo mrabb_icon( $name, $size ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup built above.
}

/**
 * Render an empty state block.
 *
 * @param string     $title  Title.
 * @param string     $text   Supporting text.
 * @param array|null $action Optional array with label + url.
 */
function mrabb_empty_state( $title, $text = '', $action = null ) {
	?>
	<div class="mrabb-empty">
		<div class="mrabb-empty__mark" aria-hidden="true"></div>
		<h2 class="mrabb-empty__title"><?php echo esc_html( $title ); ?></h2>
		<?php if ( $text ) : ?>
			<p class="mrabb-empty__text"><?php echo esc_html( $text ); ?></p>
		<?php endif; ?>
		<?php if ( $action && ! empty( $action['url'] ) ) : ?>
			<a class="mrabb-btn mrabb-btn--primary" href="<?php echo esc_url( $action['url'] ); ?>"><?php echo esc_html( $action['label'] ); ?></a>
		<?php endif; ?>
	</div>
	<?php
}

/**
 * Time-aware greeting.
 *
 * @param string $name Name to greet.
 * @return string
 */
function mrabb_greeting( $name ) {
	$hour = (int) current_time( 'G' );
	if ( $hour < 12 ) {
		/* translators: %s: first name */
		return sprintf( __( 'Good morning, %s.', 'mr-abb' ), $name );
	}
	if ( $hour < 18 ) {
		/* translators: %s: first name */
		return sprintf( __( 'Good afternoon, %s.', 'mr-abb' ), $name );
	}
	/* translators: %s: first name */
	return sprintf( __( 'Good evening, %s.', 'mr-abb' ), $name );
}

/**
 * First name of the configured owner.
 *
 * @return string
 */
function mrabb_owner_first_name() {
	$owner = mrabb_get_setting( 'owner_name', 'Abbas' );
	$parts = preg_split( '/\s+/', trim( $owner ) );
	return $parts ? $parts[0] : $owner;
}

/**
 * Is the Nova (dark, animated) style active?
 *
 * @return bool
 */
function mrabb_is_nova() {
	return 'nova' === mrabb_get_setting( 'theme_style', 'nova' );
}
