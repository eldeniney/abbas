<?php
/**
 * Theme setup: supports, assets, frontend config and template routing.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Theme supports.
 */
function mrabb_setup() {
	load_theme_textdomain( 'mr-abb', MRABB_DIR . 'languages' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'html5', array( 'search-form', 'script', 'style' ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'automatic-feed-links' );
	register_nav_menus( array( 'mrabb_secondary' => __( 'Secondary links (footer of sidebar)', 'mr-abb' ) ) );
}
add_action( 'after_setup_theme', 'mrabb_setup' );

/**
 * The browser title is always the product name.
 *
 * @param array $parts Title parts.
 * @return array
 */
function mrabb_document_title( $parts ) {
	$agent = mrabb_get_setting( 'agent_name', 'Mr. Abb' );
	$view  = mrabb_current_view();
	$pages = mrabb_app_pages();
	if ( 'home' === $view ) {
		$parts['title'] = $agent . ' — ' . __( 'AI Command Center', 'mr-abb' );
	} elseif ( isset( $pages[ $view ] ) ) {
		$parts['title'] = $pages[ $view ]['title'] . ' — ' . $agent;
	} else {
		$parts['title'] = ( isset( $parts['title'] ) ? $parts['title'] . ' — ' : '' ) . $agent;
	}
	unset( $parts['site'], $parts['tagline'] );
	return $parts;
}
add_filter( 'document_title_parts', 'mrabb_document_title' );
add_filter( 'document_title_separator', function () { return '—'; } );

/**
 * The app has its own chrome; the admin bar would break the layout.
 *
 * @param bool $show Show.
 * @return bool
 */
function mrabb_hide_admin_bar( $show ) {
	if ( is_admin() ) {
		return $show;
	}
	return false;
}
add_filter( 'show_admin_bar', 'mrabb_hide_admin_bar' );

/**
 * Language + direction attributes on <html>.
 *
 * @param string $output Attributes.
 * @return string
 */
function mrabb_language_attributes( $output ) {
	$lang = mrabb_current_language();
	$dir  = 'ar' === $lang ? 'rtl' : 'ltr';
	$code = 'ar' === $lang ? 'ar' : ( get_bloginfo( 'language' ) ? get_bloginfo( 'language' ) : 'en' );
	return sprintf( 'lang="%s" dir="%s"', esc_attr( $code ), esc_attr( $dir ) );
}
add_filter( 'language_attributes', 'mrabb_language_attributes' );

/**
 * Body classes.
 *
 * @param array $classes Classes.
 * @return array
 */
function mrabb_body_class( $classes ) {
	$classes[] = 'mrabb';
	$classes[] = 'mrabb-view-' . mrabb_current_view();
	$classes[] = 'mrabb-density-' . mrabb_get_setting( 'density', 'comfortable' );
	$classes[] = 'mrabb-lang-' . mrabb_current_language();
	$classes[] = 'mrabb-style-' . ( mrabb_is_nova() ? 'nova' : 'classic' );
	if ( mrabb_is_mock_mode() ) {
		$classes[] = 'mrabb-mock';
	}
	return $classes;
}
add_filter( 'body_class', 'mrabb_body_class' );

/**
 * Public, non-secret configuration passed to the browser.
 *
 * @return array
 */
function mrabb_frontend_config() {
	$user  = wp_get_current_user();
	$pages = array();
	foreach ( array_keys( mrabb_app_pages() ) as $slug ) {
		$pages[ $slug ] = mrabb_page_url( $slug );
	}
	$first = $user->ID ? ( $user->first_name ? $user->first_name : $user->display_name ) : mrabb_owner_first_name();
	return array(
		'version'           => MRABB_VERSION,
		'restUrl'           => esc_url_raw( rest_url( MRABB_REST_NAMESPACE ) ),
		'nonce'             => wp_create_nonce( 'wp_rest' ),
		'homeUrl'           => home_url( '/' ),
		'themeUrl'          => MRABB_URI,
		'logoutUrl'         => wp_logout_url( home_url( '/' ) ),
		'adminUrl'          => current_user_can( 'manage_options' ) ? admin_url( 'admin.php?page=mrabb-settings' ) : '',
		'pages'             => $pages,
		'view'              => mrabb_current_view(),
		'agentName'         => mrabb_get_setting( 'agent_name', 'Mr. Abb' ),
		'ownerName'         => mrabb_get_setting( 'owner_name', 'Abbas ElDeniney' ),
		'ownerFirstName'    => mrabb_owner_first_name(),
		'language'          => mrabb_current_language(),
		'dir'               => mrabb_text_direction(),
		'welcomeMessage'    => mrabb_get_setting( 'welcome_message', '' ),
		'voice'             => array(
			'enabled' => (bool) mrabb_get_setting( 'voice_enabled', 1 ),
			'agentId' => mrabb_get_setting( 'agent_id', '' ),
			'sdkUrl'  => mrabb_get_setting( 'sdk_url', '' ),
		),
		'mockMode'          => mrabb_is_mock_mode(),
		'debug'             => (bool) mrabb_get_setting( 'debug_logging', 0 ),
		'environment'       => mrabb_get_setting( 'environment', 'development' ),
		'backendConfigured' => mrabb_backend_configured(),
		'user'              => array(
			'id'        => $user->ID,
			'name'      => $user->ID ? $user->display_name : mrabb_get_setting( 'owner_name', '' ),
			'firstName' => $first,
			'avatar'    => $user->ID ? get_avatar_url( $user->ID, array( 'size' => 64 ) ) : '',
			'loggedIn'  => (bool) $user->ID,
			'isAdmin'   => current_user_can( 'manage_options' ),
		),
		'appearance'        => array(
			'accent'  => mrabb_get_setting( 'accent_color', '#4F1964' ),
			'density' => mrabb_get_setting( 'density', 'comfortable' ),
		),
		'timezone'          => wp_timezone_string(),
		'serverTime'        => current_time( 'c' ),
	);
}

/**
 * Enqueue styles and scripts.
 */
function mrabb_enqueue_assets() {
	$v = MRABB_VERSION;

	wp_enqueue_style( 'mrabb-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap', array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
	wp_enqueue_style( 'mrabb-app', MRABB_URI . 'assets/css/app.css', array( 'mrabb-fonts' ), $v );
	wp_enqueue_style( 'mrabb-components', MRABB_URI . 'assets/css/components.css', array( 'mrabb-app' ), $v );
	wp_enqueue_style( 'mrabb-animations', MRABB_URI . 'assets/css/animations.css', array( 'mrabb-components' ), $v );
	wp_enqueue_style( 'mrabb-responsive', MRABB_URI . 'assets/css/responsive.css', array( 'mrabb-animations' ), $v );
	if ( mrabb_is_nova() ) {
		wp_enqueue_style( 'mrabb-nova', MRABB_URI . 'assets/css/nova.css', array( 'mrabb-responsive' ), $v );
	} else {
		wp_add_inline_style( 'mrabb-app', mrabb_accent_css() );
	}

	if ( ! mrabb_user_can_access() ) {
		return; // The login screen needs no application JavaScript.
	}

	$scripts = array(
		'core'        => array(),
		'i18n'        => array( 'mrabb-core' ),
		'api'         => array( 'mrabb-core' ),
		'ui'          => array( 'mrabb-core', 'mrabb-i18n' ),
		'cards'       => array( 'mrabb-ui' ),
		'mock-data'   => array( 'mrabb-core' ),
		'mock-agent'  => array( 'mrabb-core', 'mrabb-mock-data' ),
		'voice-agent' => array( 'mrabb-core', 'mrabb-api' ),
		'pages'       => array( 'mrabb-ui', 'mrabb-api', 'mrabb-mock-data' ),
		'app'         => array( 'mrabb-ui', 'mrabb-cards', 'mrabb-voice-agent', 'mrabb-mock-agent', 'mrabb-pages' ),
	);
	if ( mrabb_is_nova() ) {
		$scripts['nova'] = array( 'mrabb-app' );
	}
	foreach ( $scripts as $name => $deps ) {
		wp_enqueue_script( 'mrabb-' . $name, MRABB_URI . 'assets/js/' . $name . '.js', $deps, $v, array( 'strategy' => 'defer', 'in_footer' => true ) );
	}
	wp_add_inline_script( 'mrabb-core', 'window.MrAbbConfig = ' . wp_json_encode( mrabb_frontend_config() ) . ';', 'before' );
}
add_action( 'wp_enqueue_scripts', 'mrabb_enqueue_assets' );

/**
 * Preconnect for fonts.
 *
 * @param array  $urls          URLs.
 * @param string $relation_type Relation.
 * @return array
 */
function mrabb_resource_hints( $urls, $relation_type ) {
	if ( 'preconnect' === $relation_type ) {
		$urls[] = array( 'href' => 'https://fonts.googleapis.com', 'crossorigin' => '' );
		$urls[] = array( 'href' => 'https://fonts.gstatic.com', 'crossorigin' => '' );
	}
	return $urls;
}
add_filter( 'wp_resource_hints', 'mrabb_resource_hints', 10, 2 );

/**
 * Accent colour from settings as CSS custom properties.
 *
 * @return string
 */
function mrabb_accent_css() {
	$accent = mrabb_get_setting( 'accent_color', '#4F1964' );
	$rgb    = mrabb_hex_to_rgb( $accent );
	return sprintf(
		':root{--mrabb-primary:%1$s;--mrabb-primary-rgb:%2$s;}',
		esc_attr( $accent ),
		esc_attr( $rgb )
	);
}

/**
 * Hex to "r, g, b".
 *
 * @param string $hex Hex colour.
 * @return string
 */
function mrabb_hex_to_rgb( $hex ) {
	$hex = ltrim( (string) $hex, '#' );
	if ( 3 === strlen( $hex ) ) {
		$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
	}
	if ( 6 !== strlen( $hex ) ) {
		return '79, 25, 100';
	}
	return hexdec( substr( $hex, 0, 2 ) ) . ', ' . hexdec( substr( $hex, 2, 2 ) ) . ', ' . hexdec( substr( $hex, 4, 2 ) );
}

/**
 * Head extras: theme-color, manifest, viewport for PWA.
 */
function mrabb_head_meta() {
	$accent = mrabb_is_nova() ? '#060A1F' : mrabb_get_setting( 'accent_color', '#4F1964' );
	echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' . "\n";
	echo '<meta name="theme-color" content="' . esc_attr( $accent ) . '">' . "\n";
	echo '<meta name="color-scheme" content="' . ( mrabb_is_nova() ? 'dark' : 'light' ) . '">' . "\n";
	echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
	echo '<meta name="apple-mobile-web-app-status-bar-style" content="default">' . "\n";
	echo '<meta name="apple-mobile-web-app-title" content="' . esc_attr( mrabb_get_setting( 'agent_name', 'Mr. Abb' ) ) . '">' . "\n";
	echo '<meta name="robots" content="noindex, nofollow">' . "\n";
	echo '<link rel="manifest" href="' . esc_url( rest_url( MRABB_REST_NAMESPACE . '/manifest' ) ) . '">' . "\n";
	echo '<link rel="icon" href="' . esc_url( MRABB_URI . 'assets/images/icon.svg' ) . '" type="image/svg+xml">' . "\n";
	echo '<link rel="apple-touch-icon" href="' . esc_url( MRABB_URI . 'assets/images/icon-512.png' ) . '">' . "\n";
}
add_action( 'wp_head', 'mrabb_head_meta', 1 );

/**
 * Register the query var used for fallback routing.
 *
 * @param array $vars Vars.
 * @return array
 */
function mrabb_query_vars( $vars ) {
	$vars[] = 'mrabb_view';
	return $vars;
}
add_filter( 'query_vars', 'mrabb_query_vars' );

/**
 * Route app views and gate access.
 *
 * @param string $template Template path.
 * @return string
 */
function mrabb_template_include( $template ) {
	global $mrabb_current_view;

	if ( ! mrabb_user_can_access() ) {
		$mrabb_current_view = 'login';
		return MRABB_DIR . 'templates/login.php';
	}

	$pages = mrabb_app_pages();

	// Fallback query routing: /?mrabb_view=history.
	$query_view = get_query_var( 'mrabb_view' );
	if ( $query_view && isset( $pages[ $query_view ] ) ) {
		$mrabb_current_view = $query_view;
		return MRABB_DIR . $pages[ $query_view ]['template'];
	}

	// Pages created by the theme, or pages whose slug matches an app view.
	if ( is_page() && ! is_front_page() ) {
		$id       = get_queried_object_id();
		$post     = get_post( $id );
		$assigned = get_page_template_slug( $id );
		foreach ( $pages as $slug => $page ) {
			$is_theme_page = (int) get_option( 'mrabb_page_' . $slug, 0 ) === $id;
			$slug_match    = $post && $post->post_name === $slug && ( ! $assigned || 'default' === $assigned );
			if ( $is_theme_page || $slug_match || $assigned === $page['template'] ) {
				$mrabb_current_view = $slug;
				return MRABB_DIR . $page['template'];
			}
		}
	}

	if ( is_front_page() ) {
		$mrabb_current_view = 'home';
	}

	return $template;
}
add_filter( 'template_include', 'mrabb_template_include', 99 );

/**
 * Keep static-front-page reads consistent: if the home page is a page with
 * our dashboard template, is_front_page() is true and front-page.php wins.
 */
