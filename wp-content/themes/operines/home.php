<?php
/**
 * Insights index (posts page).
 *
 * @package Operines
 */

get_header();

operines_page_hero(
	'Insights',
	'Thinking in operations.',
	'Practical writing on AI agents, automation, CRM, ERP and data — for people who run businesses, not for people who run experiments.'
);
?>

<section class="section section--tight">
	<div class="container">
		<?php if ( have_posts() ) : ?>
			<div class="insights-list">
				<?php
				while ( have_posts() ) :
					the_post();
					?>
					<a class="insight-row" href="<?php the_permalink(); ?>" data-reveal="up">
						<span class="insight-date"><?php echo esc_html( get_the_date() ); ?></span>
						<span>
							<span class="insight-title"><?php the_title(); ?></span>
							<span class="insight-excerpt"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></span>
						</span>
						<span class="insight-cat"><?php
						$cats = get_the_category();
						echo esc_html( $cats ? $cats[0]->name : 'Insights' );
						?></span>
					</a>
				<?php endwhile; ?>
			</div>
			<?php the_posts_pagination(); ?>
		<?php else : ?>
			<p class="lede">Articles are on the way.</p>
		<?php endif; ?>
	</div>
</section>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
