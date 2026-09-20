<?php
/**
 * Bottom navigation for phones.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$mrabb_view = mrabb_current_view();
$mrabb_tabs = array(
	'home'        => array( __( 'Home', 'mr-abb' ), 'home' ),
	'history'     => array( __( 'History', 'mr-abb' ), 'history' ),
	'tasks'       => array( __( 'Tasks', 'mr-abb' ), 'tasks' ),
	'connections' => array( __( 'Tools', 'mr-abb' ), 'tools' ),
);
?>
<nav class="mrabb-tabbar" aria-label="<?php esc_attr_e( 'Mobile navigation', 'mr-abb' ); ?>">
	<?php foreach ( $mrabb_tabs as $slug => $tab ) : ?>
		<a class="mrabb-tabbar__item<?php echo $mrabb_view === $slug ? ' is-active' : ''; ?>" href="<?php echo esc_url( mrabb_page_url( $slug ) ); ?>" <?php echo $mrabb_view === $slug ? 'aria-current="page"' : ''; ?>>
			<?php mrabb_the_icon( $tab[1], 22 ); ?>
			<span><?php echo esc_html( $tab[0] ); ?></span>
		</a>
	<?php endforeach; ?>
</nav>
