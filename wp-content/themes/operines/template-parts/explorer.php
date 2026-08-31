<?php
/**
 * Template part: explorer section.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;
?>
<!-- 05 · DEPARTMENT EXPLORER -->
<section class="section section--line" aria-labelledby="explorer-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'Give Operines a process' ); ?>
			<h2 id="explorer-title">What can Operines automate in <em>your</em> department?</h2>
		</div>
		<div data-explorer data-reveal="fade">
			<div class="explorer-tabs" role="tablist" aria-label="<?php esc_attr_e( 'Departments', 'operines' ); ?>">
				<?php $first = true; foreach ( operines_departments() as $key => $dept ) : ?>
					<button class="explorer-tab" role="tab" id="tab-<?php echo esc_attr( $key ); ?>" data-tab="<?php echo esc_attr( $key ); ?>" aria-selected="<?php echo $first ? 'true' : 'false'; ?>" aria-controls="panel-<?php echo esc_attr( $key ); ?>" tabindex="<?php echo $first ? '0' : '-1'; ?>"><?php echo esc_html( $dept['label'] ); ?></button>
				<?php $first = false; endforeach; ?>
			</div>
			<?php $first = true; foreach ( operines_departments() as $key => $dept ) : ?>
				<div class="explorer-panel" role="tabpanel" id="panel-<?php echo esc_attr( $key ); ?>" data-panel="<?php echo esc_attr( $key ); ?>" aria-labelledby="tab-<?php echo esc_attr( $key ); ?>" <?php echo $first ? '' : 'hidden'; ?>>
					<div>
						<p class="explorer-lede"><?php echo esc_html( $dept['lede'] ); ?></p>
						<ul class="explorer-items">
							<?php foreach ( $dept['items'] as $item ) : ?>
								<li><?php echo operines_icon( 'check', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo esc_html( $item ); ?></li>
							<?php endforeach; ?>
						</ul>
					</div>
					<div>
						<?php operines_flow( $dept['flow'], 'rail', 'The automated path' ); ?>
					</div>
				</div>
			<?php $first = false; endforeach; ?>
		</div>
	</div>
</section>
