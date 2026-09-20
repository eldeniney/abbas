<?php
/**
 * Shared overlay containers: modal, drawer, toasts, first-run welcome.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="mrabb-scrim" data-scrim hidden></div>

<div class="mrabb-modal" id="mrabb-modal" role="dialog" aria-modal="true" aria-labelledby="mrabb-modal-title" hidden>
	<div class="mrabb-modal__card" data-modal-card>
		<div class="mrabb-modal__head">
			<h2 class="mrabb-modal__title" id="mrabb-modal-title"></h2>
			<button type="button" class="mrabb-iconbtn" data-action="close-modal" aria-label="<?php esc_attr_e( 'Close', 'mr-abb' ); ?>"><?php mrabb_the_icon( 'close', 18 ); ?></button>
		</div>
		<div class="mrabb-modal__body" data-modal-body></div>
		<div class="mrabb-modal__foot" data-modal-foot></div>
	</div>
</div>

<aside class="mrabb-drawer" id="mrabb-drawer" aria-label="<?php esc_attr_e( 'Details', 'mr-abb' ); ?>" hidden>
	<div class="mrabb-drawer__head">
		<h2 class="mrabb-drawer__title" data-drawer-title></h2>
		<button type="button" class="mrabb-iconbtn" data-action="close-drawer" aria-label="<?php esc_attr_e( 'Close', 'mr-abb' ); ?>"><?php mrabb_the_icon( 'close', 18 ); ?></button>
	</div>
	<div class="mrabb-drawer__body" data-drawer-body></div>
</aside>

<div class="mrabb-toasts" data-toasts aria-live="polite" aria-atomic="false"></div>

<div class="mrabb-welcome" id="mrabb-welcome" role="dialog" aria-modal="true" aria-labelledby="mrabb-welcome-title" hidden>
	<div class="mrabb-welcome__card">
		<div class="mrabb-orb mrabb-orb--small" data-state="idle" aria-hidden="true"><span class="mrabb-orb__core"></span><span class="mrabb-orb__ring mrabb-orb__ring--1"></span></div>
		<h2 class="mrabb-welcome__title" id="mrabb-welcome-title" data-welcome-greeting><?php echo esc_html( mrabb_greeting( mrabb_owner_first_name() ) ); ?></h2>
		<p class="mrabb-welcome__text" data-welcome-text><?php echo esc_html( mrabb_get_setting( 'welcome_message' ) ); ?></p>
		<button type="button" class="mrabb-btn mrabb-btn--primary mrabb-btn--lg" data-action="start-talking"><?php esc_html_e( 'Start Talking', 'mr-abb' ); ?></button>
	</div>
</div>
