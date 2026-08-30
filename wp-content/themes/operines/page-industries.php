<?php
/**
 * Industries page: problem → process → outcome per industry.
 *
 * @package Operines
 */

get_header();

operines_page_hero(
	'Industries',
	'Different industries.<br>The same broken handovers.',
	'Wherever work moves between people and systems, it can move intelligently. This is what that looks like in the industries we serve across the UAE and GCC.'
);
?>

<section class="section section--tight">
	<div class="container">
		<?php foreach ( operines_industries() as $key => $ind ) : ?>
			<article class="industry" id="<?php echo esc_attr( $key ); ?>" data-reveal="up">
				<div>
					<h2><?php echo esc_html( $ind['label'] ); ?></h2>
					<p class="industry-problem"><?php echo esc_html( $ind['problem'] ); ?></p>
					<p class="industry-outcome"><?php echo esc_html( $ind['outcome'] ); ?></p>
				</div>
				<div>
					<?php operines_flow( $ind['flow'], 'rail', 'The automated operation' ); ?>
				</div>
			</article>
		<?php endforeach; ?>
	</div>
</section>

<section class="section">
	<div class="container">
		<div class="grid-2">
			<div data-reveal="up">
				<?php operines_eyebrow( 'Not on the list?' ); ?>
				<h2>If your business has repeatable work, it qualifies.</h2>
			</div>
			<div data-reveal="up">
				<p class="lede">SME or enterprise, the method is the same: map how work moves, automate the repeatable path, keep people in charge of judgment. Tell us how your operation runs and we&rsquo;ll tell you what we&rsquo;d automate first.</p>
				<div class="btn-row">
					<?php operines_button( 'Book an AI Automation Audit', home_url( '/book-audit/' ) ); ?>
				</div>
			</div>
		</div>
	</div>
</section>

<?php get_footer(); ?>
