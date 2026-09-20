<?php
/**
 * App shell: closes the frame, adds mobile navigation and overlays.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
	</div><!-- .mrabb-frame -->
	<?php get_template_part( 'template-parts/' . ( mrabb_is_nova() ? 'dock' : 'mobile-nav' ) ); ?>
	<?php get_template_part( 'template-parts/overlays' ); ?>
</div><!-- #mrabb-app -->
<?php wp_footer(); ?>
</body>
</html>
