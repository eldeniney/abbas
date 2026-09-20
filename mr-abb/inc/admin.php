<?php
/**
 * WordPress admin: Mr. Abb menu, settings, connections, logs, about.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Menu.
 */
function mrabb_admin_menu() {
	add_menu_page( 'Mr. Abb', 'Mr. Abb', 'manage_options', 'mrabb', 'mrabb_admin_dashboard_page', 'dashicons-microphone', 3 );
	add_submenu_page( 'mrabb', __( 'Dashboard', 'mr-abb' ), __( 'Dashboard', 'mr-abb' ), 'manage_options', 'mrabb', 'mrabb_admin_dashboard_page' );
	add_submenu_page( 'mrabb', __( 'Settings', 'mr-abb' ), __( 'Settings', 'mr-abb' ), 'manage_options', 'mrabb-settings', 'mrabb_admin_settings_page' );
	add_submenu_page( 'mrabb', __( 'Connections', 'mr-abb' ), __( 'Connections', 'mr-abb' ), 'manage_options', 'mrabb-connections', 'mrabb_admin_connections_page' );
	add_submenu_page( 'mrabb', __( 'Logs', 'mr-abb' ), __( 'Logs', 'mr-abb' ), 'manage_options', 'mrabb-logs', 'mrabb_admin_logs_page' );
	add_submenu_page( 'mrabb', __( 'About', 'mr-abb' ), __( 'About', 'mr-abb' ), 'manage_options', 'mrabb-about', 'mrabb_admin_about_page' );
}
add_action( 'admin_menu', 'mrabb_admin_menu' );

/**
 * Admin assets only on our screens.
 *
 * @param string $hook Hook suffix.
 */
function mrabb_admin_assets( $hook ) {
	if ( false === strpos( $hook, 'mrabb' ) ) {
		return;
	}
	wp_enqueue_style( 'mrabb-admin', MRABB_URI . 'assets/css/admin.css', array(), MRABB_VERSION );
	wp_enqueue_script( 'mrabb-admin', MRABB_URI . 'assets/js/admin.js', array(), MRABB_VERSION, true );
	wp_localize_script(
		'mrabb-admin',
		'MrAbbAdmin',
		array(
			'restUrl' => esc_url_raw( rest_url( MRABB_REST_NAMESPACE ) ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'mrabb_admin_assets' );

/**
 * Settings API registration.
 */
function mrabb_register_settings() {
	register_setting(
		'mrabb',
		MRABB_OPTION,
		array(
			'type'              => 'array',
			'sanitize_callback' => 'mrabb_sanitize_settings',
			'default'           => mrabb_default_settings(),
		)
	);

	$sections = array(
		'general'    => __( 'General', 'mr-abb' ),
		'voice'      => __( 'Voice', 'mr-abb' ),
		'api'        => __( 'API', 'mr-abb' ),
		'security'   => __( 'Security', 'mr-abb' ),
		'appearance' => __( 'Appearance', 'mr-abb' ),
	);
	foreach ( $sections as $id => $title ) {
		add_settings_section( 'mrabb_' . $id, $title, 'mrabb_section_intro', 'mrabb-settings' );
	}

	$fields = array(
		// General.
		array( 'agent_name', __( 'Agent Name', 'mr-abb' ), 'general', 'text', __( 'How the assistant introduces itself.', 'mr-abb' ) ),
		array( 'owner_name', __( 'Owner Name', 'mr-abb' ), 'general', 'text', __( 'Shown in the top bar and greetings.', 'mr-abb' ) ),
		array( 'default_language', __( 'Default Language', 'mr-abb' ), 'general', 'select', '', array( 'en' => 'English', 'ar' => 'العربية (Arabic)' ) ),
		array( 'welcome_message', __( 'Welcome Message', 'mr-abb' ), 'general', 'textarea', __( 'Shown once, on the first session.', 'mr-abb' ) ),
		// Voice.
		array( 'voice_enabled', __( 'Voice Enabled', 'mr-abb' ), 'voice', 'checkbox', __( 'When off, the interface works with typed commands only.', 'mr-abb' ) ),
		array( 'agent_id', __( 'ElevenLabs Agent ID', 'mr-abb' ), 'voice', 'text', __( 'Public agent identifier. The API key never goes here.', 'mr-abb' ) ),
		array( 'session_endpoint', __( 'Backend Session Endpoint', 'mr-abb' ), 'voice', 'text', __( 'Path on the backend that returns a signed ElevenLabs session. Default: /voice/session', 'mr-abb' ) ),
		array( 'sdk_url', __( 'ElevenLabs SDK URL', 'mr-abb' ), 'voice', 'text', __( 'ES module URL of @elevenlabs/client. Loaded only when a live voice session starts.', 'mr-abb' ) ),
		// API.
		array( 'backend_url', __( 'Backend Base URL', 'mr-abb' ), 'api', 'url', __( 'Secure tool gateway, e.g. https://api.eldeniney.me. Leave empty to stay in demo mode.', 'mr-abb' ) ),
		array( 'backend_secret', __( 'Backend Secret', 'mr-abb' ), 'api', 'secret', __( 'Sent as a Bearer token from the server only. Prefer defining MRABB_BACKEND_SECRET in wp-config.php.', 'mr-abb' ) ),
		array( 'environment', __( 'Environment', 'mr-abb' ), 'api', 'select', '', array( 'development' => 'Development', 'staging' => 'Staging', 'production' => 'Production' ) ),
		array( 'mock_mode', __( 'Demo / Mock Mode', 'mr-abb' ), 'api', 'checkbox', __( 'Simulate the whole experience without a backend. Forced on while no backend URL is set.', 'mr-abb' ) ),
		// Security.
		array( 'require_auth', __( 'Require Authentication', 'mr-abb' ), 'security', 'checkbox', __( 'Only signed-in, allowed users can open the interface.', 'mr-abb' ) ),
		array( 'allowed_roles', __( 'Allowed User Roles', 'mr-abb' ), 'security', 'roles', __( 'Administrators always have access.', 'mr-abb' ) ),
		array( 'debug_logging', __( 'Debug Logging', 'mr-abb' ), 'security', 'checkbox', __( 'Show technical error details and keep a short log. Turn off in production.', 'mr-abb' ) ),
		// Appearance.
		array( 'accent_color', __( 'Accent Colour', 'mr-abb' ), 'appearance', 'color', '' ),
		array( 'density', __( 'Interface Density', 'mr-abb' ), 'appearance', 'select', '', array( 'comfortable' => 'Comfortable', 'compact' => 'Compact' ) ),
	);

	foreach ( $fields as $f ) {
		add_settings_field(
			$f[0],
			$f[1],
			'mrabb_render_field',
			'mrabb-settings',
			'mrabb_' . $f[2],
			array(
				'key'         => $f[0],
				'type'        => $f[3],
				'description' => $f[4] ?? '',
				'options'     => $f[5] ?? array(),
				'label_for'   => 'mrabb_' . $f[0],
			)
		);
	}
}
add_action( 'admin_init', 'mrabb_register_settings' );

/**
 * Section intro text.
 *
 * @param array $args Section args.
 */
function mrabb_section_intro( $args ) {
	$intros = array(
		'mrabb_general'    => __( 'Identity and language of the assistant.', 'mr-abb' ),
		'mrabb_voice'      => __( 'ElevenLabs voice session configuration. Secrets stay on the server.', 'mr-abb' ),
		'mrabb_api'        => __( 'Where Mr. Abb sends tool requests. The browser only ever talks to this WordPress site.', 'mr-abb' ),
		'mrabb_security'   => __( 'Who can use the command center.', 'mr-abb' ),
		'mrabb_appearance' => __( 'Small visual adjustments. Purple is used sparingly by design.', 'mr-abb' ),
	);
	if ( isset( $intros[ $args['id'] ] ) ) {
		echo '<p class="description">' . esc_html( $intros[ $args['id'] ] ) . '</p>';
	}
}

/**
 * Render a settings field.
 *
 * @param array $args Field args.
 */
function mrabb_render_field( $args ) {
	$key      = $args['key'];
	$settings = mrabb_get_settings();
	$name     = MRABB_OPTION . '[' . $key . ']';
	$id       = 'mrabb_' . $key;
	$value    = $settings[ $key ] ?? '';

	switch ( $args['type'] ) {
		case 'text':
		case 'url':
			printf( '<input type="%1$s" id="%2$s" name="%3$s" value="%4$s" class="regular-text" />', esc_attr( $args['type'] ), esc_attr( $id ), esc_attr( $name ), esc_attr( $value ) );
			break;
		case 'secret':
			if ( defined( 'MRABB_BACKEND_SECRET' ) && MRABB_BACKEND_SECRET ) {
				echo '<code>' . esc_html__( 'Defined in wp-config.php (MRABB_BACKEND_SECRET).', 'mr-abb' ) . '</code>';
			} else {
				$has = '' !== mrabb_get_backend_secret();
				printf( '<input type="password" id="%1$s" name="%2$s" value="%3$s" class="regular-text" autocomplete="new-password" placeholder="%4$s" />', esc_attr( $id ), esc_attr( $name ), $has ? '••••••••' : '', esc_attr__( 'Not set', 'mr-abb' ) );
				if ( $has ) {
					printf( ' <label><input type="checkbox" name="%1$s" value="1" /> %2$s</label>', esc_attr( MRABB_OPTION . '[clear_backend_secret]' ), esc_html__( 'Clear stored secret', 'mr-abb' ) );
				}
			}
			break;
		case 'textarea':
			printf( '<textarea id="%1$s" name="%2$s" rows="3" class="large-text">%3$s</textarea>', esc_attr( $id ), esc_attr( $name ), esc_textarea( $value ) );
			break;
		case 'checkbox':
			printf( '<label><input type="checkbox" id="%1$s" name="%2$s" value="1" %3$s /> %4$s</label>', esc_attr( $id ), esc_attr( $name ), checked( (bool) $value, true, false ), esc_html__( 'Enabled', 'mr-abb' ) );
			break;
		case 'select':
			printf( '<select id="%1$s" name="%2$s">', esc_attr( $id ), esc_attr( $name ) );
			foreach ( $args['options'] as $opt => $label ) {
				printf( '<option value="%1$s" %2$s>%3$s</option>', esc_attr( $opt ), selected( $value, $opt, false ), esc_html( $label ) );
			}
			echo '</select>';
			break;
		case 'color':
			printf( '<input type="color" id="%1$s" name="%2$s" value="%3$s" />', esc_attr( $id ), esc_attr( $name ), esc_attr( $value ) );
			break;
		case 'roles':
			$roles = wp_roles()->roles;
			$value = (array) $value;
			echo '<fieldset>';
			foreach ( $roles as $slug => $role ) {
				printf(
					'<label style="display:block;margin-bottom:4px;"><input type="checkbox" name="%1$s[]" value="%2$s" %3$s %4$s /> %5$s</label>',
					esc_attr( $name ),
					esc_attr( $slug ),
					checked( in_array( $slug, $value, true ) || 'administrator' === $slug, true, false ),
					disabled( 'administrator' === $slug, true, false ),
					esc_html( translate_user_role( $role['name'] ) )
				);
			}
			echo '</fieldset>';
			break;
	}
	if ( ! empty( $args['description'] ) ) {
		echo '<p class="description">' . esc_html( $args['description'] ) . '</p>';
	}
}

/**
 * Shared admin header.
 *
 * @param string $title Title.
 */
function mrabb_admin_header( $title ) {
	echo '<div class="wrap mrabb-admin"><h1 class="mrabb-admin__title"><span class="mrabb-admin__brand">Mr. Abb</span> ' . esc_html( $title ) . '</h1>';
}

/**
 * Dashboard screen.
 */
function mrabb_admin_dashboard_page() {
	$mock   = mrabb_is_mock_mode();
	$health = MrAbb_Gateway::health();
	mrabb_admin_header( __( 'Dashboard', 'mr-abb' ) );
	if ( isset( $_GET['pages'] ) && 'created' === $_GET['pages'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'Pages created.', 'mr-abb' ) . '</p></div>';
	}
	?>
	<div class="mrabb-admin__grid">
		<div class="mrabb-admin__card">
			<h2><?php esc_html_e( 'Mode', 'mr-abb' ); ?></h2>
			<p class="mrabb-admin__big"><?php echo $mock ? esc_html__( 'Demo / Mock', 'mr-abb' ) : esc_html__( 'Live', 'mr-abb' ); ?></p>
			<p class="description"><?php echo $mock ? esc_html__( 'The interface simulates every step. Configure a backend to go live.', 'mr-abb' ) : esc_html__( 'Requests are forwarded to your backend gateway.', 'mr-abb' ); ?></p>
		</div>
		<div class="mrabb-admin__card">
			<h2><?php esc_html_e( 'Backend', 'mr-abb' ); ?></h2>
			<p class="mrabb-admin__big mrabb-admin__status--<?php echo esc_attr( $health['state'] ); ?>"><?php echo esc_html( ucfirst( $health['state'] ) ); ?></p>
			<p class="description"><?php echo esc_html( $health['message'] ); ?></p>
			<p><button type="button" class="button" id="mrabb-test-connection"><?php esc_html_e( 'Test connection', 'mr-abb' ); ?></button> <span id="mrabb-test-result"></span></p>
		</div>
		<div class="mrabb-admin__card">
			<h2><?php esc_html_e( 'Voice', 'mr-abb' ); ?></h2>
			<p class="mrabb-admin__big"><?php echo mrabb_get_setting( 'voice_enabled' ) ? esc_html__( 'Enabled', 'mr-abb' ) : esc_html__( 'Disabled', 'mr-abb' ); ?></p>
			<p class="description"><?php echo mrabb_get_setting( 'agent_id' ) ? esc_html__( 'Agent ID configured.', 'mr-abb' ) : esc_html__( 'No ElevenLabs Agent ID yet.', 'mr-abb' ); ?></p>
		</div>
		<div class="mrabb-admin__card">
			<h2><?php esc_html_e( 'Access', 'mr-abb' ); ?></h2>
			<p class="mrabb-admin__big"><?php echo mrabb_get_setting( 'require_auth' ) ? esc_html__( 'Private', 'mr-abb' ) : esc_html__( 'Public', 'mr-abb' ); ?></p>
			<p class="description"><?php echo esc_html( implode( ', ', (array) mrabb_get_setting( 'allowed_roles' ) ) ); ?></p>
		</div>
	</div>
	<h2><?php esc_html_e( 'Pages', 'mr-abb' ); ?></h2>
	<table class="widefat striped mrabb-admin__table">
		<thead><tr><th><?php esc_html_e( 'View', 'mr-abb' ); ?></th><th><?php esc_html_e( 'URL', 'mr-abb' ); ?></th></tr></thead>
		<tbody>
		<?php foreach ( mrabb_app_pages() as $slug => $page ) : ?>
			<tr><td><?php echo esc_html( $page['title'] ); ?></td><td><a href="<?php echo esc_url( mrabb_page_url( $slug ) ); ?>" target="_blank" rel="noopener"><?php echo esc_html( mrabb_page_url( $slug ) ); ?></a></td></tr>
		<?php endforeach; ?>
		</tbody>
	</table>
	<p><a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=mrabb-settings' ) ); ?>"><?php esc_html_e( 'Open Settings', 'mr-abb' ); ?></a> <a class="button" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Open Mr. Abb', 'mr-abb' ); ?></a></p>
	</div>
	<?php
}

/**
 * Settings screen.
 */
function mrabb_admin_settings_page() {
	mrabb_admin_header( __( 'Settings', 'mr-abb' ) );
	settings_errors( MRABB_OPTION );
	?>
	<form method="post" action="options.php" class="mrabb-admin__form">
		<?php
		settings_fields( 'mrabb' );
		do_settings_sections( 'mrabb-settings' );
		submit_button();
		?>
	</form>
	<div class="mrabb-admin__note">
		<h3><?php esc_html_e( 'Keeping secrets out of the browser', 'mr-abb' ); ?></h3>
		<p><?php esc_html_e( 'Add this line to wp-config.php instead of using the Backend Secret field:', 'mr-abb' ); ?></p>
		<pre><code>define( 'MRABB_BACKEND_SECRET', 'your-long-random-secret' );</code></pre>
		<p><?php esc_html_e( 'The ElevenLabs API key belongs in the backend, never in WordPress.', 'mr-abb' ); ?></p>
	</div>
	</div>
	<?php
}

/**
 * Connections screen (server-side view of backend connections).
 */
function mrabb_admin_connections_page() {
	mrabb_admin_header( __( 'Connections', 'mr-abb' ) );
	$result = mrabb_is_mock_mode() ? null : MrAbb_Gateway::request( 'GET', '/connections' );
	if ( null === $result ) {
		echo '<p>' . esc_html__( 'Demo mode: the Connections page on the site shows sample services. Once a backend is configured, this screen lists the real connection status from GET /connections.', 'mr-abb' ) . '</p>';
	} elseif ( is_wp_error( $result ) ) {
		echo '<div class="notice notice-error"><p>' . esc_html( $result->get_error_message() ) . '</p></div>';
	} else {
		$items = isset( $result['data'] ) && is_array( $result['data'] ) ? $result['data'] : $result;
		echo '<table class="widefat striped mrabb-admin__table"><thead><tr><th>' . esc_html__( 'Service', 'mr-abb' ) . '</th><th>' . esc_html__( 'Status', 'mr-abb' ) . '</th><th>' . esc_html__( 'Last sync', 'mr-abb' ) . '</th></tr></thead><tbody>';
		foreach ( (array) $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			printf( '<tr><td>%1$s</td><td>%2$s</td><td>%3$s</td></tr>', esc_html( $item['name'] ?? '' ), esc_html( $item['status'] ?? '' ), esc_html( $item['lastSync'] ?? '—' ) );
		}
		echo '</tbody></table>';
	}
	echo '<p><a class="button" href="' . esc_url( mrabb_page_url( 'connections' ) ) . '">' . esc_html__( 'Open Connections page', 'mr-abb' ) . '</a></p></div>';
}

/**
 * Logs screen.
 */
function mrabb_admin_logs_page() {
	mrabb_admin_header( __( 'Logs', 'mr-abb' ) );
	if ( ! mrabb_get_setting( 'debug_logging' ) ) {
		echo '<p>' . esc_html__( 'Debug logging is off. Only errors are recorded.', 'mr-abb' ) . '</p>';
	}
	$logs = mrabb_get_logs();
	if ( empty( $logs ) ) {
		echo '<p>' . esc_html__( 'No log entries.', 'mr-abb' ) . '</p>';
	} else {
		echo '<table class="widefat striped mrabb-admin__table"><thead><tr><th>' . esc_html__( 'Time', 'mr-abb' ) . '</th><th>' . esc_html__( 'Level', 'mr-abb' ) . '</th><th>' . esc_html__( 'Message', 'mr-abb' ) . '</th><th>' . esc_html__( 'Context', 'mr-abb' ) . '</th></tr></thead><tbody>';
		foreach ( $logs as $log ) {
			printf(
				'<tr><td>%1$s</td><td><span class="mrabb-admin__level mrabb-admin__level--%2$s">%2$s</span></td><td>%3$s</td><td><code>%4$s</code></td></tr>',
				esc_html( $log['time'] ),
				esc_attr( $log['level'] ),
				esc_html( $log['message'] ),
				esc_html( wp_json_encode( $log['context'] ) )
			);
		}
		echo '</tbody></table>';
	}
	$clear = wp_nonce_url( admin_url( 'admin-post.php?action=mrabb_clear_logs' ), 'mrabb_clear_logs' );
	echo '<p><a class="button" href="' . esc_url( $clear ) . '">' . esc_html__( 'Clear logs', 'mr-abb' ) . '</a></p></div>';
}

/**
 * Clear logs action.
 */
function mrabb_handle_clear_logs() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Not allowed.', 'mr-abb' ) );
	}
	check_admin_referer( 'mrabb_clear_logs' );
	mrabb_clear_logs();
	wp_safe_redirect( admin_url( 'admin.php?page=mrabb-logs' ) );
	exit;
}
add_action( 'admin_post_mrabb_clear_logs', 'mrabb_handle_clear_logs' );

/**
 * About screen.
 */
function mrabb_admin_about_page() {
	mrabb_admin_header( __( 'About', 'mr-abb' ) );
	?>
	<div class="mrabb-admin__note">
		<p><strong>Mr. Abb</strong> <?php echo esc_html( MRABB_VERSION ); ?> — <?php esc_html_e( 'a personal AI Voice Command Center for Abbas ElDeniney.', 'mr-abb' ); ?></p>
		<p><?php esc_html_e( 'One person. One AI. All tools.', 'mr-abb' ); ?></p>
		<p><?php esc_html_e( 'Architecture: Browser → WordPress (this theme) → Secure Tool Gateway → Connected systems. WordPress is the interface; business logic and credentials live in the backend.', 'mr-abb' ); ?></p>
		<p><?php esc_html_e( 'Documentation lives in the theme folder under /docs: backend API contract, ElevenLabs integration, event schemas and security notes.', 'mr-abb' ); ?></p>
	</div>
	</div>
	<?php
}
