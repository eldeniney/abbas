<?php
/**
 * Single customer story.
 *
 * Structure the post content with headings following the documented anatomy
 * (Problem / Before / What we built / Systems / New process / Result / Quote).
 *
 * @package Operines
 */

get_header();

while ( have_posts() ) :
	the_post();
	?>
	<article class="article">
		<header class="article-header">
			<?php operines_eyebrow( 'Customer story' ); ?>
			<h1><?php the_title(); ?></h1>
			<?php if ( has_excerpt() ) : ?>
				<p class="lede"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></p>
			<?php endif; ?>
		</header>
		<div class="article-body">
			<?php the_content(); ?>
		</div>
		<p class="mt-3"><?php operines_textlink( __( 'All customer stories', 'operines' ), home_url( '/customer-stories/' ) ); ?></p>
	</article>
	<?php
endwhile;

operines_cta_band();
get_footer();
