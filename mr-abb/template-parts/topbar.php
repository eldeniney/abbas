<?php
/**
 * Top bar: owner identity, connection status, language, context toggle.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$mrabb_view = mrabb_current_view();
$mrabb_lang = mrabb_current_language();
?>
<header class="mrabb-topbar">
	<button type="button" class="mrabb-iconbtn mrabb-topbar__menu" data-action="open-sidebar" aria-label="<?php esc_attr_e( 'Open menu', 'mr-abb' ); ?>">
		<?php mrabb_the_icon( 'menu', 20 ); ?>
	</button>
	<div class="mrabb-topbar__identity">
		<span class="mrabb-topbar__owner"><?php echo esc_html( mrabb_get_setting( 'owner_name', 'Abbas ElDeniney' ) ); ?></span>
		<span class="mrabb-status" data-connection-status="idle">
			<span class="mrabb-status__dot" aria-hidden="true"></span>
			<span class="mrabb-status__label" data-connection-label><?php echo mrabb_is_mock_mode() ? esc_html__( 'Demo', 'mr-abb' ) : esc_html__( 'Ready', 'mr-abb' ); ?></span>
		</span>
	</div>
	<div class="mrabb-topbar__actions">
		<button type="button" class="mrabb-iconbtn mrabb-lang-toggle" data-action="toggle-language" aria-label="<?php esc_attr_e( 'Switch language', 'mr-abb' ); ?>" title="<?php esc_attr_e( 'Switch language', 'mr-abb' ); ?>">
			<span class="mrabb-lang-toggle__code"><?php echo 'ar' === $mrabb_lang ? 'EN' : 'ع'; ?></span>
		</button>
		<?php if ( 'home' === $mrabb_view ) : ?>
			<button type="button" class="mrabb-iconbtn mrabb-topbar__context" data-action="toggle-context" aria-label="<?php esc_attr_e( 'Toggle context panel', 'mr-abb' ); ?>" aria-expanded="true" aria-controls="mrabb-context">
				<?php mrabb_the_icon( 'panel', 20 ); ?>
			</button>
		<?php endif; ?>
	</div>
</header>
