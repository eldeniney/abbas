<?php
/**
 * Generic page template (legal pages, plain content).
 *
 * @package Operines
 */

get_header();

while ( have_posts() ) :
	the_post();
	operines_page_hero( 'Operines', get_the_title() );
	?>
	<article class="section">
		<div class="container">
			<div class="article-body" style="max-width:720px">
				<?php the_content(); ?>
			</div>
		</div>
	</article>
	<?php
endwhile;

get_footer();
