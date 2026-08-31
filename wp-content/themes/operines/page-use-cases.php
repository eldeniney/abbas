<?php
/**
 * Use-case library with department filters.
 *
 * @package Operines
 */

get_header();

$departments = operines_departments();

operines_page_hero(
	'Use cases',
	'What we automate.',
	'Concrete automations we design and build — each one connects to your real systems and ends in a measurable outcome. Filter by department.'
);
?>

<section class="section section--tight">
	<div class="container">
		<div class="uc-filters" role="tablist" aria-label="<?php esc_attr_e( 'Filter by department', 'operines' ); ?>">
			<button class="explorer-tab" data-filter="all" aria-pressed="true">All</button>
			<?php foreach ( array( 'sales', 'service', 'operations', 'finance', 'hr', 'management' ) as $dept ) : ?>
				<button class="explorer-tab" data-filter="<?php echo esc_attr( $dept ); ?>" aria-pressed="false"><?php echo esc_html( $departments[ $dept ]['label'] ); ?></button>
			<?php endforeach; ?>
		</div>
		<div class="uc-grid stagger">
			<?php
			foreach ( operines_use_cases() as $uc ) :
				list( $title, $desc, $dept, $solution ) = $uc;
				?>
				<a class="uc-item" data-dept="<?php echo esc_attr( $dept ); ?>" href="<?php echo esc_url( home_url( '/solutions/' . $solution . '/' ) ); ?>">
					<span class="uc-title"><?php echo esc_html( $title ); ?></span>
					<span class="uc-desc"><?php echo esc_html( $desc ); ?></span>
					<span class="uc-meta">
						<span class="uc-dept"><?php echo esc_html( $departments[ $dept ]['label'] ?? $dept ); ?></span>
						<?php echo operines_icon( 'arrow-right', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					</span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="section section--line" aria-label="Common questions">
	<div class="container">
		<?php operines_faq_list( array_slice( operines_global_faqs(), 0, 5 ), 'Straight answers.' ); ?>
	</div>
</section>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
