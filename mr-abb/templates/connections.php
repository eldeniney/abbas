<?php
/**
 * Template Name: Mr. Abb — Connections
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
global $mrabb_current_view;
$mrabb_current_view = 'connections';
get_header();
?>
<main id="mrabb-main" class="mrabb-main mrabb-main--page" tabindex="-1" data-page="connections">
	<header class="mrabb-page-head">
		<h1 class="mrabb-page-title"><?php esc_html_e( 'Connections', 'mr-abb' ); ?></h1>
		<p class="mrabb-page-sub"><?php esc_html_e( 'Connect your tools and Mr. Abb becomes more capable.', 'mr-abb' ); ?></p>
	</header>
	<div class="mrabb-page-body" data-page-body>
		<div class="mrabb-skeleton mrabb-skeleton--grid" aria-hidden="true"></div>
	</div>
</main>
<?php
get_footer();
