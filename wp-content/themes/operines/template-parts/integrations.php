<?php
/**
 * Template part: integrations section.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;
?>
<!-- 10 · INTEGRATIONS -->
<section class="section" aria-labelledby="int-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'Integrations' ); ?>
			<h2 id="int-title">Keep your systems.<br>Make them work together.</h2>
			<p class="lede integrations-note">Operines integrates into the environment you already run — we replace things only when they genuinely block the operation.</p>
		</div>
		<div class="int-groups" data-reveal="up">
			<?php foreach ( operines_integrations() as $group => $items ) : ?>
				<div class="int-group">
					<p class="int-group-title"><?php echo esc_html( $group ); ?></p>
					<div class="int-chips">
						<?php foreach ( $items as $item ) : ?>
							<span class="chip"><?php echo esc_html( $item ); ?></span>
						<?php endforeach; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<p class="int-disclaimer">Product names belong to their owners. Integration with a platform does not imply partnership or certification by its vendor.</p>
	</div>
</section>
