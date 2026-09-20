<?php
/**
 * Nova floating dock (bottom navigation on every size).
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$mrabb_view = mrabb_current_view();
?>
<nav class="nova-dock" aria-label="<?php esc_attr_e( 'Navigation', 'mr-abb' ); ?>">
	<a class="nova-dock__item<?php echo 'home' === $mrabb_view ? ' is-active' : ''; ?>" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php mrabb_the_icon( 'home', 22 ); ?><span><?php esc_html_e( 'Home', 'mr-abb' ); ?></span></a>
	<a class="nova-dock__item<?php echo 'history' === $mrabb_view ? ' is-active' : ''; ?>" href="<?php echo esc_url( mrabb_page_url( 'history' ) ); ?>"><?php mrabb_the_icon( 'history', 22 ); ?><span><?php esc_html_e( 'History', 'mr-abb' ); ?></span></a>
	<a class="nova-dock__ai" href="<?php echo esc_url( add_query_arg( 'talk', '1', home_url( '/' ) ) ); ?>" data-action="dock-ai" aria-label="<?php esc_attr_e( 'Talk to Mr. Abb', 'mr-abb' ); ?>"><span>AI</span></a>
	<a class="nova-dock__item<?php echo 'tasks' === $mrabb_view ? ' is-active' : ''; ?>" href="<?php echo esc_url( mrabb_page_url( 'tasks' ) ); ?>"><?php mrabb_the_icon( 'tasks', 22 ); ?><span><?php esc_html_e( 'Tasks', 'mr-abb' ); ?></span></a>
	<a class="nova-dock__item<?php echo 'connections' === $mrabb_view ? ' is-active' : ''; ?>" href="<?php echo esc_url( mrabb_page_url( 'connections' ) ); ?>"><?php mrabb_the_icon( 'tools', 22 ); ?><span><?php esc_html_e( 'Tools', 'mr-abb' ); ?></span></a>
</nav>
