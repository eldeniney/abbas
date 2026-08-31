<?php
/**
 * Template part: architecture section.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;
?>
<!-- 06 · ARCHITECTURE (dark) -->
<section class="section on-dark" aria-labelledby="arch-title">
	<div class="container">
		<div class="section-head section-head--center" data-reveal="up">
			<?php operines_eyebrow( 'The architecture' ); ?>
			<h2 id="arch-title">One intelligence layer.<br>Between your customers and your systems.</h2>
		</div>
		<div class="arch" data-reveal="up">
			<span class="arch-pulse" aria-hidden="true"></span>
			<div class="arch-band">
				<span class="arch-label">Customers</span>
				<div class="arch-chips"><span class="arch-chip">Inquiries</span><span class="arch-chip">Orders</span><span class="arch-chip">Requests</span><span class="arch-chip">Documents</span></div>
			</div>
			<div class="arch-joint"><?php echo operines_icon( 'arrow-down', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
			<div class="arch-band">
				<span class="arch-label">Channels</span>
				<div class="arch-chips"><span class="arch-chip">WhatsApp</span><span class="arch-chip">Email</span><span class="arch-chip">Website</span><span class="arch-chip">Voice</span></div>
			</div>
			<div class="arch-joint"><?php echo operines_icon( 'arrow-down', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
			<div class="arch-band arch-band--core">
				<span class="arch-label">Operines Intelligence</span>
				<div class="arch-chips"><span class="arch-chip">AI agents</span><span class="arch-chip">Automation</span><span class="arch-chip">Business rules</span><span class="arch-chip">Human approval</span></div>
			</div>
			<div class="arch-joint"><?php echo operines_icon( 'arrow-down', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
			<div class="arch-band">
				<span class="arch-label">Business systems</span>
				<div class="arch-chips"><span class="arch-chip">CRM</span><span class="arch-chip">ERP</span><span class="arch-chip">Finance</span><span class="arch-chip">HR</span><span class="arch-chip">Databases</span></div>
			</div>
			<div class="arch-joint"><?php echo operines_icon( 'arrow-down', 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
			<div class="arch-band">
				<span class="arch-label">Management</span>
				<div class="arch-chips"><span class="arch-chip">Live KPIs</span><span class="arch-chip">Alerts</span><span class="arch-chip">Reports</span><span class="arch-chip">Decisions</span></div>
			</div>
		</div>
		<p class="center mt-3" data-reveal="fade"><a class="textlink" style="color:var(--violet-bright)" href="<?php echo esc_url( home_url( '/solutions/' ) ); ?>"><span>View the full architecture approach</span><?php echo operines_icon( 'arrow-right', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a></p>
	</div>
</section>
