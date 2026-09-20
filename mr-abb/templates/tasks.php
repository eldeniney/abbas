<?php
/**
 * Template Name: Mr. Abb — Tasks
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $mrabb_current_view;
$mrabb_current_view = 'tasks';
get_header();
?>
<main id="mrabb-main" class="mrabb-main mrabb-main--page" tabindex="-1" data-page="tasks">
	<header class="mrabb-page-head">
		<h1 class="mrabb-page-title"><?php esc_html_e( 'Tasks', 'mr-abb' ); ?></h1>
		<p class="mrabb-page-sub"><?php esc_html_e( 'From you, from your tools, from Mr. Abb.', 'mr-abb' ); ?></p>
	</header>
	<div class="mrabb-page-body" data-page-body>
		<div class="mrabb-skeleton mrabb-skeleton--list" aria-hidden="true"></div>
	</div>
</main>
<?php
get_footer();
