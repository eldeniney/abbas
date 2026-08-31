<?php
/**
 * Template part: agents section.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;
?>
<!-- 07 · AI AGENTS + HUMAN CONTROL -->
<section class="section" aria-labelledby="agents-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'AI agents' ); ?>
			<h2 id="agents-title">A digital workforce — with job descriptions.</h2>
			<p class="lede">Not chatbots. Each Operines agent has a role, connected systems, and clear limits: what it decides alone, and what waits for a human.</p>
		</div>
		<div class="agents-grid stagger">
			<?php
			foreach ( operines_agents() as $agent ) :
				?>
				<article class="agent" data-reveal="up">
					<div class="agent-role"><?php echo operines_icon( $agent['icon'], 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><h3><?php echo esc_html( $agent['name'] ); ?></h3></div>
					<dl class="agent-spec">
						<?php foreach ( $agent['spec'] as $k => $v ) : ?>
							<div><dt><?php echo esc_html( $k ); ?></dt><dd><?php echo esc_html( $v ); ?></dd></div>
						<?php endforeach; ?>
					</dl>
					<p class="agent-gate"><?php echo operines_icon( 'shield', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo wp_kses( $agent['gate'], array() ); ?></p>
				</article>
			<?php endforeach; ?>
		</div>
		<p class="mt-3" data-reveal="fade"><?php operines_textlink( 'See how the agents work', home_url( '/solutions/ai-agents/' ) ); ?></p>
	</div>
</section>
