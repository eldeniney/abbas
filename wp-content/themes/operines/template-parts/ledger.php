<?php
/**
 * Template part: ledger section.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;
?>
<!-- 04 · SIGNATURE: WHAT AUTOMATED MEANS -->
<section class="section" aria-labelledby="ledger-title">
	<div class="container">
		<div class="grid-2">
			<div data-reveal="up">
				<?php operines_eyebrow( 'In practice' ); ?>
				<h2 id="ledger-title">This is what &ldquo;automated&rdquo; actually means.</h2>
				<p class="lede">A lead submits a form. Then — with no person touching anything —</p>
				<p class="ledger-outro">No copying. No chasing.<br>No forgotten follow-up.</p>
			</div>
			<div data-reveal="ledger">
				<div class="ledger" data-ledger-live>
					<?php foreach ( operines_ledger() as $i => $row ) : ?>
						<div class="ledger-row" style="--i:<?php echo (int) $i; ?>">
							<span class="ledger-time"><?php echo esc_html( $row[0] ); ?></span>
							<span class="ledger-event"><?php echo esc_html( $row[1] ); ?></span>
						</div>
					<?php endforeach; ?>
					<p class="ledger-note">Illustrative sequence, based on the workflow pattern we build.</p>
				</div>
			</div>
		</div>
	</div>
</section>
