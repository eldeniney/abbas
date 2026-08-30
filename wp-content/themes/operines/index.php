<?php
/**
 * Generic fallback template (archives, search, anything unhandled).
 *
 * @package Operines
 */

get_header();

$archive_title = '';
if ( is_search() ) {
	/* translators: %s: search query. */
	$archive_title = sprintf( __( 'Search: %s', 'operines' ), get_search_query() );
} elseif ( is_archive() ) {
	$archive_title = wp_strip_all_tags( get_the_archive_title() );
} else {
	$archive_title = __( 'Insights', 'operines' );
}

operines_page_hero( 'Operines', esc_html( $archive_title ) );
?>

<section class="section">
	<div class="container">
		<?php if ( have_posts() ) : ?>
			<div class="insights-list">
				<?php
				while ( have_posts() ) :
					the_post();
					?>
					<a class="insight-row" href="<?php the_permalink(); ?>">
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
			<p class="lede"><?php esc_html_e( 'Nothing found here yet.', 'operines' ); ?></p>
			<p class="mt-2"><?php operines_textlink( __( 'Back to the homepage', 'operines' ), home_url( '/' ) ); ?></p>
		<?php endif; ?>
	</div>
</section>

<?php get_footer(); ?>
