<?php
/**
 * Admin → Mr. Abb → Connections: the live setup screen.
 * Everything you need to enter to go live is on this one page.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Replace the placeholder Connections screen from admin.php. */
function mrabb_admin_connections_page() {
	$notice   = isset( $_GET['mrabb_notice'] ) ? sanitize_text_field( wp_unslash( $_GET['mrabb_notice'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$hook_url = rest_url( MRABB_REST_NAMESPACE . '/hooks/tool/' );
	$post_url = rest_url( MRABB_REST_NAMESPACE . '/hooks/elevenlabs' );
	$synced   = get_option( 'mrabb_elevenlabs_synced', array() );
	mrabb_admin_header( __( 'Connections', 'mr-abb' ) );
	if ( $notice ) {
		echo '<div class="notice notice-info is-dismissible"><p>' . esc_html( $notice ) . '</p></div>';
	}
	if ( mrabb_is_mock_mode() ) {
		echo '<div class="notice notice-warning"><p>' . esc_html__( 'Demo mode is ON. Connect at least Claude or ElevenLabs below, then turn Demo mode off in Settings → API.', 'mr-abb' ) . '</p></div>';
	}
	?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="mrabb-admin__form mrabb-conn">
		<?php wp_nonce_field( 'mrabb_save_connections' ); ?>
		<input type="hidden" name="action" value="mrabb_save_connections" />

		<div class="mrabb-conn__grid">

			<!-- Claude -->
			<section class="mrabb-admin__card mrabb-conn__card" id="claude">
				<?php mrabb_conn_head( 'claude', __( 'The brain. Powers typed commands, automations, approvals follow-up and web research.', 'mr-abb' ) ); ?>
				<?php mrabb_secret_field( 'anthropic_api_key', __( 'Anthropic API key', 'mr-abb' ), 'sk-ant-…' ); ?>
				<p class="description"><?php esc_html_e( 'Create one at console.anthropic.com → API keys. Model and effort are in Settings → Brain.', 'mr-abb' ); ?></p>
				<p><button type="button" class="button" data-mrabb-test="claude"><?php esc_html_e( 'Test Claude', 'mr-abb' ); ?></button> <span class="mrabb-test-out"></span></p>
			</section>

			<!-- ElevenLabs -->
			<section class="mrabb-admin__card mrabb-conn__card" id="elevenlabs">
				<?php mrabb_conn_head( 'elevenlabs', __( 'Voice. The API key stays here; the browser only ever gets a short-lived signed URL.', 'mr-abb' ) ); ?>
				<?php mrabb_secret_field( 'elevenlabs_api_key', __( 'ElevenLabs API key', 'mr-abb' ), 'xi-…' ); ?>
				<p><label><strong><?php esc_html_e( 'Agent ID', 'mr-abb' ); ?></strong><br><input type="text" name="agent_id" class="regular-text" value="<?php echo esc_attr( mrabb_get_setting( 'agent_id', '' ) ); ?>" placeholder="agent_…" /></label></p>
				<?php mrabb_secret_field( 'elevenlabs_webhook_secret', __( 'Post-call webhook secret (optional)', 'mr-abb' ), 'wsec_…' ); ?>
				<p class="description"><?php esc_html_e( 'Optional: lets ElevenLabs send the full transcript to History after each call. In ElevenLabs → Conversational AI → Settings → Post-call webhook, use this URL and copy the secret here:', 'mr-abb' ); ?></p>
				<p><code class="mrabb-copy" data-copy><?php echo esc_html( $post_url ); ?></code></p>
				<p>
					<button type="button" class="button" data-mrabb-test="elevenlabs"><?php esc_html_e( 'Test agent', 'mr-abb' ); ?></button>
					<button type="button" class="button button-primary" data-mrabb-sync="1"><?php esc_html_e( 'Sync tools to agent', 'mr-abb' ); ?></button>
					<span class="mrabb-test-out"></span>
				</p>
				<p class="description">
					<?php echo $synced && ! empty( $synced['at'] ) ? esc_html( sprintf( __( 'Last synced %1$s (%2$d tools).', 'mr-abb' ), wp_date( 'j M H:i', strtotime( $synced['at'] ) ), (int) $synced['tools'] ) ) : esc_html__( 'Not synced yet. Sync creates one webhook tool per connected capability on your ElevenLabs agent and attaches them. Re-run after connecting new services.', 'mr-abb' ); ?>
				</p>
				<details>
					<summary><?php esc_html_e( 'Manual setup (if sync is not possible)', 'mr-abb' ); ?></summary>
					<p><?php esc_html_e( '1. Agent → System prompt: paste this.', 'mr-abb' ); ?></p>
					<textarea readonly rows="6" class="large-text mrabb-copy" data-copy><?php echo esc_textarea( MrAbb_ElevenLabs::suggested_prompt() ); ?></textarea>
					<p><?php esc_html_e( '2. Agent → Tools → Add webhook tool, one per entry below. Each tool posts to:', 'mr-abb' ); ?> <code><?php echo esc_html( $hook_url ); ?>{tool_name}</code> <?php esc_html_e( 'with header', 'mr-abb' ); ?> <code>X-MrAbb-Hook-Secret</code> = <code class="mrabb-copy" data-copy><?php echo esc_html( MrAbb_Secrets::hook_secret() ); ?></code></p>
					<textarea readonly rows="10" class="large-text mrabb-copy" data-copy><?php echo esc_textarea( wp_json_encode( MrAbb_Tools::definitions_for_elevenlabs(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) ); ?></textarea>
					<p><?php esc_html_e( '3. Agent → Security → allow dynamic variables and add overrides for agent.language. Enable English and Arabic.', 'mr-abb' ); ?></p>
				</details>
			</section>

			<!-- Google -->
			<section class="mrabb-admin__card mrabb-conn__card" id="google">
				<?php mrabb_conn_head( 'google-calendar', __( 'One Google sign-in covers Calendar, Gmail, Tasks and Drive.', 'mr-abb' ), 'Google Workspace' ); ?>
				<?php if ( MrAbb_Google::is_connected() ) : ?>
					<p><span class="mrabb-admin__level" style="background:#E7F4EC;color:#2E8B5B"><?php esc_html_e( 'Connected', 'mr-abb' ); ?></span> <?php echo esc_html( MrAbb_Google::account_email() ); ?></p>
					<p><a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=mrabb_google_disconnect' ), 'mrabb_google_disconnect' ) ); ?>"><?php esc_html_e( 'Disconnect', 'mr-abb' ); ?></a> <button type="button" class="button" data-mrabb-test="google-calendar"><?php esc_html_e( 'Test', 'mr-abb' ); ?></button> <span class="mrabb-test-out"></span></p>
				<?php else : ?>
					<p><label><strong><?php esc_html_e( 'OAuth Client ID', 'mr-abb' ); ?></strong><br><input type="text" name="google_client_id" class="regular-text" value="<?php echo esc_attr( mrabb_get_setting( 'google_client_id', '' ) ); ?>" placeholder="…apps.googleusercontent.com" /></label></p>
					<?php mrabb_secret_field( 'google_client_secret', __( 'OAuth Client Secret', 'mr-abb' ), 'GOCSPX-…' ); ?>
					<p class="description"><?php esc_html_e( 'Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application). Enable the Calendar, Gmail, Tasks and Drive APIs. Add this Authorised redirect URI:', 'mr-abb' ); ?></p>
					<p><code class="mrabb-copy" data-copy><?php echo esc_html( MrAbb_Google::redirect_uri() ); ?></code></p>
					<p>
						<?php if ( MrAbb_Google::configured() ) : ?>
							<a class="button button-primary" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=mrabb_google_connect' ), 'mrabb_google_connect' ) ); ?>"><?php esc_html_e( 'Connect Google', 'mr-abb' ); ?></a>
						<?php else : ?>
							<span class="description"><?php esc_html_e( 'Save the client ID and secret first, then the Connect button appears.', 'mr-abb' ); ?></span>
						<?php endif; ?>
					</p>
				<?php endif; ?>
			</section>

			<!-- Webhook connectors -->
			<?php foreach ( MrAbb_Connectors::catalog() as $id => $c ) : if ( 'webhook' !== $c['type'] ) { continue; } $cfg = MrAbb_Connectors::webhook_config( $id ); ?>
				<section class="mrabb-admin__card mrabb-conn__card" id="<?php echo esc_attr( $id ); ?>">
					<?php mrabb_conn_head( $id, $c['description'] ); ?>
					<p><label><strong><?php esc_html_e( 'Webhook URL', 'mr-abb' ); ?></strong><br><input type="url" name="conn[<?php echo esc_attr( $id ); ?>][url]" class="regular-text" value="<?php echo esc_attr( $cfg['url'] ); ?>" placeholder="https://…/webhook/<?php echo esc_attr( $id ); ?>" /></label></p>
					<p><label><strong><?php esc_html_e( 'Secret', 'mr-abb' ); ?></strong><br><input type="password" name="conn[<?php echo esc_attr( $id ); ?>][secret]" class="regular-text" autocomplete="new-password" value="<?php echo MrAbb_Secrets::has( 'connector_' . $id ) ? '••••••••' : ''; ?>" placeholder="<?php esc_attr_e( 'Sent as Bearer token', 'mr-abb' ); ?>" /></label></p>
					<p><label><?php esc_html_e( 'Header', 'mr-abb' ); ?> <input type="text" name="conn[<?php echo esc_attr( $id ); ?>][header]" class="small-text" style="width:160px" value="<?php echo esc_attr( $cfg['header'] ); ?>" /></label>
						<button type="button" class="button" data-mrabb-test="<?php echo esc_attr( $id ); ?>"><?php esc_html_e( 'Test (ping)', 'mr-abb' ); ?></button> <span class="mrabb-test-out"></span></p>
					<p class="description"><?php echo esc_html( sprintf( __( 'Mr. Abb POSTs JSON {action, payload, user} to this URL. Actions for %s: %s. Reply with JSON {summary, data, card}.', 'mr-abb' ), $c['name'], mrabb_conn_actions( $id ) ) ); ?></p>
				</section>
			<?php endforeach; ?>
		</div>

		<p class="submit"><button type="submit" class="button button-primary button-large"><?php esc_html_e( 'Save connections', 'mr-abb' ); ?></button></p>
	</form>

	<div class="mrabb-admin__note">
		<h3><?php esc_html_e( 'Webhook contract (n8n, Make, Power Automate, custom)', 'mr-abb' ); ?></h3>
		<pre><code>POST {your url}
Authorization: Bearer {secret}
{ "action": "listOpportunities", "service": "crm", "payload": { "filter": "closing_this_month" },
  "user": { "id": 1, "name": "Abbas", "email": "…" }, "request_id": "…", "timezone": "Asia/Dubai" }

→ 200 { "summary": "12 opportunities, AED 185,000",
        "card": { "type": "crm", "title": "Closing this month",
                  "data": { "count": 12, "pipeline": "AED 185,000", "attention": 4, "opportunities": [ { "name": "…", "customer": "…", "value": "AED 62,000", "risk": "high" } ] } } }
→ 4xx/5xx { "error": "Human readable reason" }</code></pre>
		<p><?php esc_html_e( 'Card types and their data shapes are documented in docs/events.md inside the theme. "ping" should reply { "summary": "ok" }.', 'mr-abb' ); ?></p>
	</div>
	</div>
	<?php
}

function mrabb_conn_head( $id, $desc, $name = '' ) {
	$c      = MrAbb_Connectors::get( $id );
	$status = MrAbb_Connectors::status( $id );
	$label  = 'connected' === $status ? __( 'Connected', 'mr-abb' ) : ( 'attention' === $status ? __( 'Needs attention', 'mr-abb' ) : __( 'Not connected', 'mr-abb' ) );
	$class  = 'connected' === $status ? 'mrabb-admin__status--connected' : ( 'attention' === $status ? 'mrabb-admin__status--unconfigured' : '' );
	echo '<h2>' . esc_html( $name ? $name : $c['name'] ) . ' <span class="mrabb-admin__level ' . esc_attr( $class ) . '">' . esc_html( $label ) . '</span></h2>';
	echo '<p class="description">' . esc_html( $desc ) . '</p>';
}

function mrabb_secret_field( $key, $label, $placeholder = '' ) {
	echo '<p><label><strong>' . esc_html( $label ) . '</strong><br>';
	if ( MrAbb_Secrets::is_constant( $key ) ) {
		echo '<code>' . esc_html__( 'Defined in wp-config.php', 'mr-abb' ) . '</code>';
	} else {
		printf( '<input type="password" name="secrets[%1$s]" class="regular-text" autocomplete="new-password" value="%2$s" placeholder="%3$s" />', esc_attr( $key ), MrAbb_Secrets::has( $key ) ? '••••••••' : '', esc_attr( $placeholder ) );
	}
	echo '</label></p>';
}

function mrabb_conn_actions( $connector ) {
	$acts = array();
	foreach ( MrAbb_Tools::all() as $name => $t ) {
		if ( $t['connection'] === $connector ) {
			$acts[] = substr( $name, strpos( $name, '.' ) + 1 );
		}
	}
	$acts[] = 'ping';
	return implode( ', ', $acts );
}

/** Save handler. */
function mrabb_handle_save_connections() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Not allowed.', 'mr-abb' ) );
	}
	check_admin_referer( 'mrabb_save_connections' );
	$secrets = isset( $_POST['secrets'] ) && is_array( $_POST['secrets'] ) ? wp_unslash( $_POST['secrets'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- each value handled below.
	foreach ( $secrets as $key => $val ) {
		$key = sanitize_key( $key );
		if ( ! array_key_exists( $key, MrAbb_Secrets::keys() ) || MrAbb_Secrets::is_constant( $key ) ) {
			continue;
		}
		$val = trim( (string) $val );
		if ( '' === $val ) {
			continue; // Leave as is; use the clear action to remove.
		}
		if ( '••••••••' !== $val ) {
			MrAbb_Secrets::set( $key, $val );
		}
	}
	$settings = get_option( MRABB_OPTION, array() );
	$settings = is_array( $settings ) ? $settings : array();
	if ( isset( $_POST['agent_id'] ) ) {
		$settings['agent_id'] = preg_replace( '/[^A-Za-z0-9_\-]/', '', wp_unslash( $_POST['agent_id'] ) ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	}
	if ( isset( $_POST['google_client_id'] ) ) {
		$settings['google_client_id'] = sanitize_text_field( wp_unslash( $_POST['google_client_id'] ) );
	}
	update_option( MRABB_OPTION, wp_parse_args( $settings, mrabb_default_settings() ), false );

	$conn = isset( $_POST['conn'] ) && is_array( $_POST['conn'] ) ? wp_unslash( $_POST['conn'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
	foreach ( $conn as $id => $fields ) {
		$id = sanitize_key( $id );
		$c  = MrAbb_Connectors::get( $id );
		if ( ! $c || 'webhook' !== $c['type'] || ! is_array( $fields ) ) {
			continue;
		}
		$url = isset( $fields['url'] ) ? trim( $fields['url'] ) : '';
		if ( '' === $url ) {
			if ( '' !== MrAbb_Connectors::webhook_config( $id )['url'] ) {
				MrAbb_Connectors::clear_webhook( $id );
			}
			continue;
		}
		MrAbb_Connectors::save_webhook( $id, $url, isset( $fields['secret'] ) ? trim( $fields['secret'] ) : null, isset( $fields['header'] ) ? $fields['header'] : 'Authorization' );
	}
	wp_safe_redirect( add_query_arg( 'mrabb_notice', rawurlencode( __( 'Connections saved.', 'mr-abb' ) ), admin_url( 'admin.php?page=mrabb-connections' ) ) );
	exit;
}
add_action( 'admin_post_mrabb_save_connections', 'mrabb_handle_save_connections' );

function mrabb_handle_google_connect() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Not allowed.', 'mr-abb' ) );
	}
	check_admin_referer( 'mrabb_google_connect' );
	if ( ! MrAbb_Google::configured() ) {
		wp_safe_redirect( add_query_arg( 'mrabb_notice', rawurlencode( __( 'Save the Google client ID and secret first.', 'mr-abb' ) ), admin_url( 'admin.php?page=mrabb-connections' ) ) );
		exit;
	}
	wp_redirect( MrAbb_Google::auth_url( get_current_user_id() ) ); // phpcs:ignore WordPress.Security.SafeRedirect -- external OAuth provider.
	exit;
}
add_action( 'admin_post_mrabb_google_connect', 'mrabb_handle_google_connect' );

function mrabb_handle_google_disconnect() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Not allowed.', 'mr-abb' ) );
	}
	check_admin_referer( 'mrabb_google_disconnect' );
	MrAbb_Google::disconnect();
	wp_safe_redirect( add_query_arg( 'mrabb_notice', rawurlencode( __( 'Google disconnected.', 'mr-abb' ) ), admin_url( 'admin.php?page=mrabb-connections' ) ) );
	exit;
}
add_action( 'admin_post_mrabb_google_disconnect', 'mrabb_handle_google_disconnect' );

/** The "what you still need" checklist, embedded in the Dashboard. */
function mrabb_setup_checklist() {
	$conn  = admin_url( 'admin.php?page=mrabb-connections' );
	$sett  = admin_url( 'admin.php?page=mrabb-settings' );
	$items = array(
		array( MrAbb_Brain::configured(), __( 'Anthropic API key (typed commands, automations, web research)', 'mr-abb' ), $conn . '#claude' ),
		array( MrAbb_Secrets::has( 'elevenlabs_api_key' ) && mrabb_get_setting( 'agent_id' ), __( 'ElevenLabs API key + Agent ID (voice)', 'mr-abb' ), $conn . '#elevenlabs' ),
		array( (bool) get_option( 'mrabb_elevenlabs_synced' ), __( 'Tools synced to the ElevenLabs agent (so the voice agent can act)', 'mr-abb' ), $conn . '#elevenlabs' ),
		array( MrAbb_Google::is_connected(), __( 'Google connected (Calendar, Gmail, Tasks, Drive)', 'mr-abb' ), $conn . '#google' ),
		array( '' !== MrAbb_Connectors::webhook_config( 'n8n' )['url'], __( 'n8n webhook (workflows and the bridge to WhatsApp, CRM, Odoo, Power BI, UiPath, Operines)', 'mr-abb' ), $conn . '#n8n' ),
		array( ! mrabb_is_mock_mode(), __( 'Demo mode turned off', 'mr-abb' ), $sett ),
		array( is_ssl(), __( 'Site served over HTTPS (required for the microphone)', 'mr-abb' ), '' ),
	);
	$done = count( array_filter( $items, function ( $i ) { return $i[0]; } ) );
	echo '<div class="mrabb-admin__card mrabb-checklist"><h2>' . esc_html__( 'Go live checklist', 'mr-abb' ) . ' <span class="mrabb-admin__level">' . esc_html( $done . '/' . count( $items ) ) . '</span></h2><ol>';
	foreach ( $items as $i ) {
		echo '<li class="' . ( $i[0] ? 'is-done' : '' ) . '"><span class="mrabb-checklist__mark">' . ( $i[0] ? '✓' : '○' ) . '</span> ' . esc_html( $i[1] ) . ( $i[2] && ! $i[0] ? ' <a href="' . esc_url( $i[2] ) . '">' . esc_html__( 'Set up →', 'mr-abb' ) . '</a>' : '' ) . '</li>';
	}
	echo '</ol><p class="description">' . esc_html__( 'Voice needs steps 2 and 3. Typed commands need step 1. Everything else adds capabilities. Optional connectors (WhatsApp, CRM, Odoo, Power BI, Power Platform, UiPath, Operines) are configured as webhooks on the Connections page, usually pointed at n8n workflows.', 'mr-abb' ) . '</p></div>';
}
