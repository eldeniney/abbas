<?php
/**
 * The voice orb.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="mrabb-orb-wrap">
	<button type="button" class="mrabb-orb" id="mrabb-orb" data-state="idle" data-action="orb" aria-label="<?php esc_attr_e( 'Start listening', 'mr-abb' ); ?>" aria-pressed="false">
		<span class="mrabb-orb__ring mrabb-orb__ring--3" aria-hidden="true"></span>
		<span class="mrabb-orb__ring mrabb-orb__ring--2" aria-hidden="true"></span>
		<span class="mrabb-orb__ring mrabb-orb__ring--1" aria-hidden="true"></span>
		<span class="mrabb-orb__core" aria-hidden="true"></span>
		<span class="mrabb-orb__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
		<span class="mrabb-orb__progress" aria-hidden="true"></span>
	</button>
	<p class="mrabb-orb-state" data-orb-label aria-live="polite"><?php esc_html_e( 'Tap to talk', 'mr-abb' ); ?></p>
</div>
