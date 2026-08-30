<?php
/**
 * Single Insights article.
 *
 * @package Operines
 */

get_header();

while ( have_posts() ) :
	the_post();
	$cats = get_the_category();
	?>
	<article class="article container">
		<header class="article-header">
			<?php operines_eyebrow( $cats ? $cats[0]->name : 'Insights' ); ?>
			<h1><?php the_title(); ?></h1>
			<div class="article-meta">
				<span><?php echo esc_html( get_the_date() ); ?></span>
				<span>&middot;</span>
				<span>Operines</span>
			</div>
		</header>
		<div class="article-body">
			<?php the_content(); ?>
		</div>
		<p class="mt-3"><?php operines_textlink( __( 'All insights', 'operines' ), home_url( '/insights/' ) ); ?></p>
	</article>
	<?php
endwhile;

operines_cta_band();
get_footer();
