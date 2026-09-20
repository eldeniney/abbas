<?php
/**
 * Template Name: Mr. Abb — Command Center
 *
 * The main product experience: orb, conversation, actions, results.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $mrabb_current_view;
$mrabb_current_view = 'home';
get_header();
?>
<div class="mrabb-workspace">
	<main id="mrabb-main" class="mrabb-main mrabb-main--home" tabindex="-1">
		<section class="mrabb-stage" aria-label="<?php esc_attr_e( 'Voice', 'mr-abb' ); ?>">
			<h1 class="mrabb-stage__title"><?php echo esc_html( mrabb_get_setting( 'agent_name', 'Mr. Abb' ) ); ?></h1>
			<p class="mrabb-stage__subtitle" data-i18n="tagline"><?php esc_html_e( 'Your AI Command Center', 'mr-abb' ); ?></p>

			<?php get_template_part( 'template-parts/orb' ); ?>

			<p class="mrabb-stage__prompt" data-prompt aria-live="polite"><?php esc_html_e( 'What should we do?', 'mr-abb' ); ?></p>
			<p class="mrabb-stage__hint" data-hint aria-hidden="true"></p>

			<form class="mrabb-composer" data-composer autocomplete="off">
				<label class="mrabb-visually-hidden" for="mrabb-command"><?php esc_html_e( 'Type a command', 'mr-abb' ); ?></label>
				<span class="mrabb-composer__icon" aria-hidden="true"><?php mrabb_the_icon( 'keyboard', 18 ); ?></span>
				<input type="text" id="mrabb-command" class="mrabb-composer__input" placeholder="<?php esc_attr_e( 'or type a command…', 'mr-abb' ); ?>" data-composer-input maxlength="500" />
				<button type="submit" class="mrabb-iconbtn mrabb-composer__send" aria-label="<?php esc_attr_e( 'Send', 'mr-abb' ); ?>"><?php mrabb_the_icon( 'send', 18 ); ?></button>
			</form>
		</section>

		<section class="mrabb-session" aria-label="<?php esc_attr_e( 'Session', 'mr-abb' ); ?>" data-session hidden>
			<div class="mrabb-session__col mrabb-session__col--conversation">
				<h2 class="mrabb-section-title"><?php esc_html_e( 'Conversation', 'mr-abb' ); ?></h2>
				<ol class="mrabb-transcript" data-transcript aria-live="polite" aria-relevant="additions"></ol>
			</div>
			<div class="mrabb-session__col mrabb-session__col--actions">
				<h2 class="mrabb-section-title"><?php esc_html_e( 'Actions', 'mr-abb' ); ?></h2>
				<ol class="mrabb-tools" data-tools></ol>
				<div class="mrabb-approval-slot" data-approvals></div>
			</div>
			<div class="mrabb-session__col mrabb-session__col--results">
				<h2 class="mrabb-section-title"><?php esc_html_e( 'Results', 'mr-abb' ); ?></h2>
				<div class="mrabb-results" data-results></div>
			</div>
		</section>
	</main>
	<?php get_template_part( 'template-parts/context-panel' ); ?>
</div>
<?php
get_footer();
