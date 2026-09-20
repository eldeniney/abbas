<?php
/**
 * Right-hand context panel (home only).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<aside class="mrabb-context" id="mrabb-context" aria-label="<?php esc_attr_e( 'Context', 'mr-abb' ); ?>">
	<section class="mrabb-context__section" data-context="schedule">
		<h2 class="mrabb-context__title"><?php esc_html_e( "Today's schedule", 'mr-abb' ); ?></h2>
		<div class="mrabb-context__body" data-context-body="schedule"><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
	</section>
	<section class="mrabb-context__section" data-context="tasks">
		<h2 class="mrabb-context__title"><?php esc_html_e( 'Priority tasks', 'mr-abb' ); ?></h2>
		<div class="mrabb-context__body" data-context-body="tasks"><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
	</section>
	<section class="mrabb-context__section" data-context="activity">
		<h2 class="mrabb-context__title"><?php esc_html_e( 'Recent actions', 'mr-abb' ); ?></h2>
		<div class="mrabb-context__body" data-context-body="activity"><div class="mrabb-skeleton mrabb-skeleton--lines"></div></div>
	</section>
</aside>
