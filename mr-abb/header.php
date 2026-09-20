<?php
/**
 * App shell: opens the document and the application frame.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$mrabb_view = mrabb_current_view();
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="mrabb-skip" href="#mrabb-main"><?php esc_html_e( 'Skip to content', 'mr-abb' ); ?></a>
<div id="mrabb-app" class="mrabb-app" data-view="<?php echo esc_attr( $mrabb_view ); ?>" data-mock="<?php echo mrabb_is_mock_mode() ? '1' : '0'; ?>">
	<?php get_template_part( 'template-parts/sidebar' ); ?>
	<div class="mrabb-frame">
		<?php get_template_part( 'template-parts/topbar' ); ?>
