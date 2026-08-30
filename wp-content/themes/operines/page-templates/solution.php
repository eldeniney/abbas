<?php
/**
 * Template Name: Solution
 *
 * Data-driven solution page: content comes from operines_solutions(),
 * keyed by the page slug.
 *
 * @package Operines
 */

get_header();

$slug      = get_post_field( 'post_name', get_queried_object_id() );
$solutions = operines_solutions();
$s         = $solutions[ $slug ] ?? null;

if ( ! $s ) {
	// Slug not found in the data layer: render as a plain page.
	while ( have_posts() ) :
		the_post();
		operines_page_hero( 'Solutions', get_the_title() );
		echo '<div class="section"><div class="container"><div class="article-body">';
		the_content();
		echo '</div></div></div>';
	endwhile;
	get_footer();
	return;
}
?>

<header class="page-hero">
	<div class="container">
		<p class="eyebrow"><a href="<?php echo esc_url( home_url( '/solutions/' ) ); ?>" style="color:inherit;text-decoration:none">Solutions</a> &middot; <?php echo esc_html( $s['no'] ); ?></p>
		<h1><?php echo esc_html( $s['title'] ); ?></h1>
		<p class="lede"><?php echo esc_html( $s['outcome'] ); ?></p>
		<div class="btn-row">
			<?php operines_button( 'Book an AI Automation Audit', home_url( '/book-audit/' ) ); ?>
			<?php operines_button( 'Talk to a consultant', home_url( '/contact/' ), 'ghost' ); ?>
		</div>
	</div>
</header>

<section class="section" aria-label="The business challenge">
	<div class="container grid-2" style="align-items:start">
		<div data-reveal="up">
			<?php operines_eyebrow( 'The challenge' ); ?>
			<p class="statement"><?php echo esc_html( $s['problem'] ); ?></p>
		</div>
		<div data-reveal="up">
			<?php operines_eyebrow( 'What Operines changes' ); ?>
			<p class="lede"><?php echo esc_html( $s['body'] ); ?></p>
		</div>
	</div>
</section>

<section class="section section--tone" aria-label="Example workflow">
	<div class="container grid-2" style="align-items:start">
		<div data-reveal="up">
			<?php operines_eyebrow( 'In practice' ); ?>
			<h2><?php echo esc_html( $s['workflow_label'] ); ?></h2>
			<p class="lede">Every build is shaped around your process — this is the pattern.</p>
			<div class="mt-2">
				<p class="panel-label">Typical integrations</p>
				<div class="int-chips">
					<?php foreach ( $s['integrations'] as $chip ) : ?>
						<span class="chip"><?php echo esc_html( $chip ); ?></span>
					<?php endforeach; ?>
				</div>
			</div>
		</div>
		<div data-reveal="fade">
			<?php operines_flow( $s['workflow'], 'rail', 'The automated path' ); ?>
		</div>
	</div>
</section>

<section class="section" aria-label="Capabilities">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'Capabilities' ); ?>
			<h2>What this covers.</h2>
		</div>
		<div class="story-anatomy" style="max-width:none;columns:1">
			<div class="grid-2" style="align-items:start;gap:0 clamp(2rem,5vw,4.5rem)">
				<?php foreach ( $s['capabilities'] as $cap ) : ?>
					<div class="story-part" style="grid-template-columns:1fr" data-reveal="up">
						<div>
							<h3><?php echo esc_html( $cap[0] ); ?></h3>
							<p><?php echo esc_html( $cap[1] ); ?></p>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>

<section class="section section--line" aria-label="Frequently asked questions">
	<div class="container">
		<?php operines_faq_list( $s['faqs'], 'Questions we hear.' ); ?>
	</div>
</section>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
