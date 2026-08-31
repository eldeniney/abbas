<?php
/**
 * Solutions hub.
 *
 * @package Operines
 */

get_header();

operines_page_hero(
	'Solutions',
	'We don&rsquo;t sell software.<br>We make yours work together.',
	'Six capabilities, one method: start from how work moves through your business, then add intelligence where it pays.'
);
?>

<section class="section section--tight">
	<div class="container">
		<div class="sol-rows">
			<?php foreach ( operines_solutions() as $slug => $s ) : ?>
				<a class="sol-row" href="<?php echo esc_url( home_url( '/solutions/' . $slug . '/' ) ); ?>" data-reveal="up">
					<span class="sol-no"><?php echo esc_html( $s['no'] ); ?></span>
					<span class="sol-title"><?php echo esc_html( $s['title'] ); ?></span>
					<span class="sol-outcome"><?php echo esc_html( $s['outcome'] ); ?></span>
					<span class="sol-arrow"><?php echo operines_icon( 'arrow-right', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="section section--tone">
	<div class="container">
		<div class="grid-2">
			<div data-reveal="up">
				<?php operines_eyebrow( 'Against the hype' ); ?>
				<h2>AI without a process is just another tool.</h2>
			</div>
			<div data-reveal="up">
				<p class="lede">Operines starts with the business process. Then we determine what AI should decide, what automation should execute, what humans should approve, what systems should exchange — and what management should measure.</p>
				<p class="lede">Tools connect steps. Operines designs the operation.</p>
			</div>
		</div>
	</div>
</section>

<?php get_template_part( 'template-parts/architecture' ); ?>
<?php get_template_part( 'template-parts/ledger' ); ?>
<?php get_template_part( 'template-parts/integrations' ); ?>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
