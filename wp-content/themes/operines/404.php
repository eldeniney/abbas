<?php
/**
 * 404 — even the error page thinks in workflows.
 *
 * @package Operines
 */

get_header();
?>

<section class="error-hero">
	<div class="container">
		<?php operines_eyebrow( 'Error 404' ); ?>
		<h1>This page didn&rsquo;t follow the workflow.</h1>
		<div class="ledger" aria-hidden="true">
			<div class="ledger-row"><span class="ledger-time"><?php echo esc_html( gmdate( 'H:i:s' ) ); ?></span><span class="ledger-event">Request received</span></div>
			<div class="ledger-row"><span class="ledger-time"><?php echo esc_html( gmdate( 'H:i:s' ) ); ?></span><span class="ledger-event">Page lookup&hellip; not found</span></div>
			<div class="ledger-row"><span class="ledger-time"><?php echo esc_html( gmdate( 'H:i:s' ) ); ?></span><span class="ledger-event">Escalating to a human — that&rsquo;s you</span></div>
		</div>
		<div class="btn-row" style="justify-content:center">
			<?php operines_button( 'Back to the homepage', home_url( '/' ) ); ?>
			<?php operines_button( 'See what we automate', home_url( '/use-cases/' ), 'ghost' ); ?>
		</div>
	</div>
</section>

<?php get_footer(); ?>
