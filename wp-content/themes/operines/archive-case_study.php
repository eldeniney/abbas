<?php
/**
 * Customer Stories archive.
 *
 * Content policy: this page never shows invented clients or metrics. When no
 * verified stories are published, it explains the documentation standard —
 * a trust position, not an apology. Publish `case_study` posts to fill it.
 *
 * @package Operines
 */

get_header();

operines_page_hero(
	'Customer stories',
	'Real processes. Verified results.',
	'Every story we publish names the process before, what we built, the systems connected, and a result the client signed off.'
);
?>

<?php if ( have_posts() ) : ?>
	<section class="section section--tight">
		<div class="container">
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
						<span class="insight-cat"><?php esc_html_e( 'Customer story', 'operines' ); ?></span>
					</a>
				<?php endwhile; ?>
			</div>
			<?php the_posts_pagination(); ?>
		</div>
	</section>
<?php else : ?>
	<section class="section section--tight">
		<div class="container">
			<div class="grid-2" style="align-items:start">
				<div data-reveal="up">
					<?php operines_eyebrow( 'Our standard' ); ?>
					<h2>We&rsquo;d rather show you nothing<br>than show you fiction.</h2>
					<p class="lede">Client stories are being prepared for publication with our customers&rsquo; approval. Until each one is verified — names, systems, numbers — it doesn&rsquo;t go on this page.</p>
					<div class="verified-note mt-2">
						<?php echo operines_icon( 'shield', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
						<p><strong>In the meantime:</strong> ask us for references relevant to your industry during your audit call, and we&rsquo;ll walk you through comparable builds directly.</p>
					</div>
				</div>
				<div data-reveal="up">
					<p class="panel-label">What every published story documents</p>
					<div class="story-anatomy">
						<div class="story-part"><div><h3>The problem</h3><p>The operational pain, in the client&rsquo;s own terms.</p></div></div>
						<div class="story-part"><div><h3>The process before Operines</h3><p>How the work actually moved — people, tools, delays.</p></div></div>
						<div class="story-part"><div><h3>What Operines built</h3><p>Agents, automations and integrations, concretely.</p></div></div>
						<div class="story-part"><div><h3>Systems connected</h3><p>The real stack: CRM, ERP, WhatsApp, data.</p></div></div>
						<div class="story-part"><div><h3>The new process</h3><p>The same work, after intelligence was built in.</p></div></div>
						<div class="story-part"><div><h3>The result</h3><p>A measured outcome the client has signed off.</p></div></div>
					</div>
				</div>
			</div>
		</div>
	</section>
<?php endif; ?>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
