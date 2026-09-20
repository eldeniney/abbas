<?php
/**
 * Template Name: Mr. Abb — Automations
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $mrabb_current_view;
$mrabb_current_view = 'automations';
get_header();
?>
<main id="mrabb-main" class="mrabb-main mrabb-main--page" tabindex="-1" data-page="automations">
	<header class="mrabb-page-head">
		<div>
			<h1 class="mrabb-page-title"><?php esc_html_e( 'Automations', 'mr-abb' ); ?></h1>
			<p class="mrabb-page-sub"><?php esc_html_e( 'Things Mr. Abb does without being asked.', 'mr-abb' ); ?></p>
		</div>
		<button type="button" class="mrabb-btn mrabb-btn--primary" data-action="new-automation"><?php mrabb_the_icon( 'plus', 18 ); ?><span><?php esc_html_e( 'New automation', 'mr-abb' ); ?></span></button>
	</header>
	<div class="mrabb-page-body" data-page-body>
		<div class="mrabb-skeleton mrabb-skeleton--list" aria-hidden="true"></div>
	</div>
</main>
<?php
get_footer();
