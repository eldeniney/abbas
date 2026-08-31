<?php
/**
 * Template part: process section.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;
?>
<!-- 11 · HOW WE WORK -->
<section class="section section--line" aria-labelledby="process-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'How we work' ); ?>
			<h2 id="process-title">From process audit to a running operation.</h2>
		</div>
		<div class="process" data-reveal="fade">
			<div class="process-track">
				<?php foreach ( operines_process() as $stage ) : ?>
					<div class="process-stage">
						<span class="process-no"><?php echo esc_html( $stage[0] ); ?></span>
						<h3 class="process-name"><?php echo esc_html( $stage[1] ); ?></h3>
						<p class="process-desc"><?php echo esc_html( $stage[2] ); ?></p>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</section>
