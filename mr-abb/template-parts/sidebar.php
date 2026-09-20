<?php
/**
 * Left sidebar navigation.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$mrabb_view  = mrabb_current_view();
$mrabb_pages = mrabb_app_pages();
$mrabb_user  = wp_get_current_user();
?>
<aside class="mrabb-sidebar" id="mrabb-sidebar" aria-label="<?php esc_attr_e( 'Primary', 'mr-abb' ); ?>">
	<div class="mrabb-sidebar__top">
		<a class="mrabb-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>">
			<span class="mrabb-brand__mark" aria-hidden="true"></span>
			<span class="mrabb-brand__name"><?php echo esc_html( mrabb_get_setting( 'agent_name', 'Mr. Abb' ) ); ?></span>
		</a>
		<button type="button" class="mrabb-sidebar__toggle" data-action="toggle-sidebar" aria-label="<?php esc_attr_e( 'Collapse sidebar', 'mr-abb' ); ?>" aria-expanded="true">
			<?php mrabb_the_icon( 'panel', 18 ); ?>
		</button>
	</div>

	<a class="mrabb-btn mrabb-btn--primary mrabb-sidebar__new" href="<?php echo esc_url( add_query_arg( 'new', '1', home_url( '/' ) ) ); ?>" data-action="new-session">
		<?php mrabb_the_icon( 'plus', 18 ); ?>
		<span class="mrabb-sidebar__label"><?php esc_html_e( 'New Session', 'mr-abb' ); ?></span>
	</a>

	<nav class="mrabb-nav" aria-label="<?php esc_attr_e( 'Sections', 'mr-abb' ); ?>">
		<?php foreach ( $mrabb_pages as $slug => $page ) : ?>
			<a class="mrabb-nav__item<?php echo $mrabb_view === $slug ? ' is-active' : ''; ?>" href="<?php echo esc_url( mrabb_page_url( $slug ) ); ?>" <?php echo $mrabb_view === $slug ? 'aria-current="page"' : ''; ?> data-nav="<?php echo esc_attr( $slug ); ?>">
				<?php mrabb_the_icon( $page['icon'], 20 ); ?>
				<span class="mrabb-sidebar__label"><?php echo esc_html( $page['title'] ); ?></span>
			</a>
		<?php endforeach; ?>
	</nav>

	<div class="mrabb-sidebar__bottom">
		<?php if ( current_user_can( 'manage_options' ) ) : ?>
			<a class="mrabb-nav__item" href="<?php echo esc_url( admin_url( 'admin.php?page=mrabb-settings' ) ); ?>">
				<?php mrabb_the_icon( 'settings', 20 ); ?>
				<span class="mrabb-sidebar__label"><?php esc_html_e( 'Settings', 'mr-abb' ); ?></span>
			</a>
		<?php endif; ?>
		<button type="button" class="mrabb-nav__item mrabb-nav__profile" data-action="open-profile">
			<?php if ( $mrabb_user->ID && get_avatar_url( $mrabb_user->ID ) ) : ?>
				<img class="mrabb-avatar" src="<?php echo esc_url( get_avatar_url( $mrabb_user->ID, array( 'size' => 48 ) ) ); ?>" alt="" width="24" height="24" loading="lazy">
			<?php else : ?>
				<?php mrabb_the_icon( 'user', 20 ); ?>
			<?php endif; ?>
			<span class="mrabb-sidebar__label"><?php esc_html_e( 'Profile', 'mr-abb' ); ?></span>
		</button>
	</div>
</aside>
