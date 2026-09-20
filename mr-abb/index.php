<?php
/**
 * Fallback template. Everything that is not a Mr. Abb app page renders here.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="mrabb-main" class="mrabb-main mrabb-main--content" tabindex="-1">
	<div class="mrabb-content">
		<?php if ( have_posts() ) : ?>
			<?php while ( have_posts() ) : the_post(); ?>
				<article <?php post_class( 'mrabb-article' ); ?>>
					<h1 class="mrabb-article__title"><?php the_title(); ?></h1>
					<div class="mrabb-prose"><?php the_content(); ?></div>
				</article>
			<?php endwhile; ?>
		<?php else : ?>
			<?php mrabb_empty_state( __( 'Nothing here yet.', 'mr-abb' ), __( 'Try asking Mr. Abb instead.', 'mr-abb' ) ); ?>
		<?php endif; ?>
	</div>
</main>
<?php
get_footer();
