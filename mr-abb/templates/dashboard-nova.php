<?php
/**
 * Nova home: bento command center (used when Appearance → Style = Nova).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $mrabb_current_view;
$mrabb_current_view = 'home';
$mrabb_first        = is_user_logged_in() ? ( wp_get_current_user()->first_name ? wp_get_current_user()->first_name : wp_get_current_user()->display_name ) : mrabb_owner_first_name();
$mrabb_tiles        = array(
	array( 'summarize', __( 'Summarize', 'mr-abb' ), __( 'Summarize my important emails.', 'mr-abb' ), '<path d="M5 5h14v14H5z"/><path d="M8 9h8M8 12h8M8 15h5"/>' ),
	array( 'translate', __( 'Translate', 'mr-abb' ), __( 'Translate my last email to Arabic.', 'mr-abb' ), '<path d="M4 5h8M8 3v2M6 9c1.5 3 4 5 6 6"/><path d="M12 9c-1 3-3.5 5.5-6 6.5"/><path d="M13 20l4-9 4 9M14.5 17h5"/>' ),
	array( 'write', __( 'Write', 'mr-abb' ), __( 'Write an email to Ahmed Hassan about the project update.', 'mr-abb' ), '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M13 7l3 3"/>' ),
	array( 'analyze', __( 'Analyze', 'mr-abb' ), __( "What's closing this month?", 'mr-abb' ), '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' ),
	array( 'plan', __( 'Plan', 'mr-abb' ), __( 'Plan my day and prioritize my tasks.', 'mr-abb' ), '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>' ),
	array( 'workflow', __( 'Workflow', 'mr-abb' ), __( 'Run the onboarding workflow.', 'mr-abb' ), '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' ),
);
$mrabb_shortcuts    = array(
	array( __( 'Meeting Summary', 'mr-abb' ), __( 'Summarize your meeting', 'mr-abb' ), __( 'Summarize my last meeting and list the action items.', 'mr-abb' ), '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19a6 6 0 0 1 12 0M14 19a4 4 0 0 1 7 0"/>' ),
	array( __( 'Email Assistant', 'mr-abb' ), __( 'Draft professional email', 'mr-abb' ), __( 'Draft a professional email for me.', 'mr-abb' ), '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m3 7 9 6 9-6"/>' ),
	array( __( 'Pipeline Review', 'mr-abb' ), __( 'Opportunities and risks', 'mr-abb' ), __( 'Review my sales pipeline and flag what needs attention.', 'mr-abb' ), '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-5 3 3 5-7"/>' ),
	array( __( 'Plan My Day', 'mr-abb' ), __( 'Schedule & prioritize', 'mr-abb' ), __( 'What do I have today?', 'mr-abb' ), '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>' ),
);
get_header();
?>
<div class="mrabb-workspace mrabb-workspace--nova">
	<main id="mrabb-main" class="mrabb-main mrabb-main--home" tabindex="-1">
		<div class="nova-grid">

			<!-- LEFT -->
			<div class="nova-col nova-col--left">
				<section class="nova-card nova-hello">
					<h1 class="nova-hello__title"><?php esc_html_e( 'Hello,', 'mr-abb' ); ?> <span><?php echo esc_html( $mrabb_first ); ?></span></h1>
					<p class="nova-hello__sub"><?php esc_html_e( 'What would you like to accomplish today?', 'mr-abb' ); ?></p>
					<div class="nova-wave" data-nova-wave aria-hidden="true"><?php echo str_repeat( '<i></i>', 40 ); // phpcs:ignore ?></div>
				</section>

				<section class="nova-card">
					<div class="nova-eyebrow"><span><?php esc_html_e( 'AI Tools', 'mr-abb' ); ?></span></div>
					<div class="nova-tools">
						<?php foreach ( $mrabb_tiles as $tile ) : ?>
							<button type="button" class="nova-tile" data-command="<?php echo esc_attr( $tile[2] ); ?>">
								<span class="nova-tile__icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?php echo $tile[3]; // phpcs:ignore ?></svg></span>
								<span><?php echo esc_html( $tile[1] ); ?></span>
							</button>
						<?php endforeach; ?>
					</div>
				</section>

				<section class="nova-card">
					<div class="nova-eyebrow"><span><?php esc_html_e( 'Smart Shortcuts', 'mr-abb' ); ?></span></div>
					<div class="nova-rows">
						<?php foreach ( $mrabb_shortcuts as $sc ) : ?>
							<button type="button" class="nova-shortcut" data-command="<?php echo esc_attr( $sc[2] ); ?>">
								<span class="nova-shortcut__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><?php echo $sc[3]; // phpcs:ignore ?></svg></span>
								<span><span class="nova-shortcut__title"><?php echo esc_html( $sc[0] ); ?></span><br><span class="nova-shortcut__sub"><?php echo esc_html( $sc[1] ); ?></span></span>
								<?php mrabb_the_icon( 'chevron', 18 ); ?>
							</button>
						<?php endforeach; ?>
					</div>
				</section>

				<section class="nova-card">
					<div class="nova-eyebrow"><span><?php esc_html_e( 'Connected Tools', 'mr-abb' ); ?></span><a href="<?php echo esc_url( mrabb_page_url( 'connections' ) ); ?>"><?php esc_html_e( 'Manage', 'mr-abb' ); ?></a></div>
					<div class="nova-rows" data-nova-devices><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
				</section>
			</div>

			<!-- CENTER -->
			<div class="nova-col nova-col--center">
				<section class="nova-card nova-assistant mrabb-stage">
					<span class="nova-assistant__label"><?php esc_html_e( 'AI Assistant', 'mr-abb' ); ?></span>
					<div class="nova-holo" data-nova-holo data-state="idle" aria-hidden="true">
						<span class="nova-holo__grid"></span>
						<span class="nova-holo__ring"></span>
						<span class="nova-holo__ring nova-holo__ring--2"></span>
						<span class="nova-holo__ring nova-holo__ring--3"></span>
						<span class="nova-holo__particles"><i style="--dx:30px;--dy:-70px;left:30%;top:60%"></i><i style="--dx:-40px;--dy:-60px;left:65%;top:70%"></i><i style="--dx:20px;--dy:-80px;left:50%;top:75%"></i><i style="--dx:-25px;--dy:-50px;left:40%;top:55%"></i><i style="--dx:45px;--dy:-40px;left:20%;top:50%"></i><i style="--dx:-15px;--dy:-90px;left:75%;top:55%"></i></span>
						<span class="nova-holo__core"></span>
						<span class="nova-holo__base"></span>
					</div>
					<div class="nova-bubble">
						<span data-nova-greeting><?php echo esc_html( mrabb_greeting( $mrabb_first ) ); ?></span>
						<span data-prompt><?php esc_html_e( 'How can I help you', 'mr-abb' ); ?> <em><?php esc_html_e( 'today?', 'mr-abb' ); ?></em></span>
					</div>
					<p class="nova-hint" data-hint aria-hidden="true"></p>
					<p class="mrabb-visually-hidden" data-orb-label aria-live="polite"><?php esc_html_e( 'Tap to talk', 'mr-abb' ); ?></p>
				</section>

				<section class="mrabb-session" aria-label="<?php esc_attr_e( 'Session', 'mr-abb' ); ?>" data-session hidden>
					<div class="nova-card mrabb-session__col mrabb-session__col--conversation">
						<h2 class="mrabb-section-title" data-nova-clock><?php echo esc_html( __( 'Today', 'mr-abb' ) . ' ' . wp_date( 'H:i' ) ); ?></h2>
						<ol class="mrabb-transcript" data-transcript aria-live="polite" aria-relevant="additions"></ol>
					</div>
					<div class="nova-card mrabb-session__col mrabb-session__col--actions">
						<h2 class="mrabb-section-title"><?php esc_html_e( 'Actions', 'mr-abb' ); ?></h2>
						<ol class="mrabb-tools" data-tools></ol>
						<div class="mrabb-approval-slot" data-approvals></div>
					</div>
					<div class="nova-card mrabb-session__col mrabb-session__col--results">
						<h2 class="mrabb-section-title"><?php esc_html_e( 'Results', 'mr-abb' ); ?></h2>
						<div class="mrabb-results" data-results></div>
					</div>
				</section>

				<section class="nova-card nova-mic">
					<div class="nova-mic__row">
						<span class="nova-mic__bars" data-nova-bars aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
						<button type="button" class="nova-mic__btn" id="mrabb-orb" data-state="idle" data-action="orb" aria-label="<?php esc_attr_e( 'Start listening', 'mr-abb' ); ?>" aria-pressed="false">
							<span class="nova-mic__glow" aria-hidden="true"></span>
							<svg class="nova-mic__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
						</button>
						<span class="nova-mic__bars nova-mic__bars--r" data-nova-bars aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
					</div>
					<span class="nova-mic__label" data-nova-mic-label><?php esc_html_e( 'Tap to speak', 'mr-abb' ); ?></span>
					<span class="nova-mic__sub" data-nova-mic-sub><?php echo mrabb_is_mock_mode() ? esc_html__( 'Demo mode', 'mr-abb' ) : esc_html__( 'Voice ready', 'mr-abb' ); ?></span>
					<form class="mrabb-composer" data-composer autocomplete="off">
						<label class="mrabb-visually-hidden" for="mrabb-command"><?php esc_html_e( 'Type a command', 'mr-abb' ); ?></label>
						<span class="mrabb-composer__icon" aria-hidden="true"><?php mrabb_the_icon( 'keyboard', 18 ); ?></span>
						<input type="text" id="mrabb-command" class="mrabb-composer__input" placeholder="<?php esc_attr_e( 'or type a command…', 'mr-abb' ); ?>" data-composer-input maxlength="500" />
						<button type="submit" class="mrabb-iconbtn mrabb-composer__send" aria-label="<?php esc_attr_e( 'Send', 'mr-abb' ); ?>"><?php mrabb_the_icon( 'send', 18 ); ?></button>
					</form>
				</section>
			</div>

			<!-- RIGHT -->
			<div class="nova-col nova-col--right">
				<section class="nova-card nova-weather" data-nova-weather data-city="<?php echo esc_attr( mrabb_get_setting( 'weather_city', 'Dubai' ) ); ?>">
					<div class="nova-eyebrow"><span><?php esc_html_e( 'Weather', 'mr-abb' ); ?></span></div>
					<div class="nova-weather__main">
						<div>
							<div class="nova-weather__city"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><span data-nova-weather-city><?php echo esc_html( mrabb_get_setting( 'weather_city', 'Dubai' ) ); ?></span></div>
							<div class="nova-weather__temp" data-nova-weather-temp>—°</div>
							<div class="nova-weather__desc" data-nova-weather-desc><?php esc_html_e( 'Loading…', 'mr-abb' ); ?></div>
						</div>
						<svg class="nova-weather__icon" viewBox="0 0 96 96" aria-hidden="true" data-nova-weather-icon>
							<defs><radialGradient id="novaMoon" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#9B6BFF"/><stop offset="1" stop-color="#2B1E66"/></radialGradient><linearGradient id="novaCloud" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C6CFF"/><stop offset="1" stop-color="#2B2A6A"/></linearGradient></defs>
							<circle cx="60" cy="34" r="20" fill="url(#novaMoon)"/>
							<path d="M22 70a14 14 0 0 1 4-27 18 18 0 0 1 34-4 12 12 0 0 1 8 31z" fill="url(#novaCloud)" stroke="rgba(160,150,255,.5)"/>
						</svg>
					</div>
					<div class="nova-weather__days" data-nova-weather-days></div>
				</section>

				<section class="nova-card">
					<div class="nova-eyebrow"><span><?php esc_html_e( 'AI Insights', 'mr-abb' ); ?></span></div>
					<svg class="nova-spark" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true" data-nova-spark>
						<defs><linearGradient id="novaSparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C6CFF" stop-opacity=".55"/><stop offset="1" stop-color="#7C6CFF" stop-opacity="0"/></linearGradient><linearGradient id="novaSparkLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4FC3FF"/><stop offset="1" stop-color="#E85BFF"/></linearGradient><linearGradient id="novaRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4FC3FF"/><stop offset="1" stop-color="#E85BFF"/></linearGradient></defs>
						<path data-nova-spark-fill fill="url(#novaSparkFill)" d=""/>
						<path data-nova-spark-line fill="none" stroke="url(#novaSparkLine)" stroke-width="2.5" stroke-linecap="round" d=""/>
					</svg>
					<div class="nova-insight">
						<div>
							<div class="nova-insight__label"><?php esc_html_e( 'Productivity', 'mr-abb' ); ?></div>
							<div class="nova-insight__delta" data-nova-delta>—</div>
							<div class="nova-insight__sub"><?php esc_html_e( 'actions this week vs last', 'mr-abb' ); ?></div>
						</div>
						<div class="nova-ring"><svg viewBox="0 0 96 96"><circle class="nova-ring__bg" cx="48" cy="48" r="40"/><circle class="nova-ring__fg" cx="48" cy="48" r="40" data-nova-ring/></svg><div><div class="nova-ring__val" data-nova-score>—</div><div class="nova-ring__cap"><?php esc_html_e( 'Score', 'mr-abb' ); ?></div></div></div>
					</div>
				</section>

				<section class="nova-card" id="mrabb-context">
					<div class="nova-eyebrow"><span><?php esc_html_e( "Today's schedule", 'mr-abb' ); ?></span><a href="<?php echo esc_url( add_query_arg( 'cmd', rawurlencode( 'What do I have this week?' ), home_url( '/' ) ) ); ?>" data-command="<?php esc_attr_e( 'What do I have this week?', 'mr-abb' ); ?>"><?php esc_html_e( 'Full week', 'mr-abb' ); ?></a></div>
					<div class="nova-sched" data-context-body="schedule"><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
					<div class="nova-eyebrow" style="margin-top:18px"><span><?php esc_html_e( 'Priority tasks', 'mr-abb' ); ?></span><a href="<?php echo esc_url( mrabb_page_url( 'tasks' ) ); ?>"><?php esc_html_e( 'All', 'mr-abb' ); ?></a></div>
					<div data-context-body="tasks"><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
					<div data-context-body="activity" hidden></div>
				</section>

				<section class="nova-card">
					<div class="nova-eyebrow"><span><?php esc_html_e( 'Recent sessions', 'mr-abb' ); ?></span><a href="<?php echo esc_url( mrabb_page_url( 'history' ) ); ?>"><?php esc_html_e( 'Explore more', 'mr-abb' ); ?></a></div>
					<div class="nova-recent" data-nova-recent><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
				</section>
			</div>
		</div>
	</main>
</div>
<?php
get_footer();
