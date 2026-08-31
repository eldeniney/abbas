<?php
/**
 * About Operines.
 *
 * NOTE(owner): team photos, founder bios and office details are intentionally
 * absent until real, approved material is provided. See the report's
 * "content required" list.
 *
 * @package Operines
 */

get_header();

operines_page_hero(
	'About Operines',
	'We exist because software<br>promised more than it delivered.',
	'Companies bought the CRM, the ERP, the chat tools — and still run on copy-paste, chasing and memory. Operines was founded in the UAE to close that gap.'
);
?>

<section class="section" aria-label="What we believe">
	<div class="container grid-2" style="align-items:start">
		<div data-reveal="up">
			<?php operines_eyebrow( 'Our philosophy' ); ?>
			<p class="statement">The best automation is not the one employees notice.<br>It&rsquo;s the work they <em>no longer have to do</em>.</p>
		</div>
		<div data-reveal="up">
			<p class="lede">Technology should disappear into the operation. When it works, nobody talks about AI — leads are answered, approvals move, reports exist, and people spend their day on judgment, relationships and growth.</p>
			<p class="lede">That&rsquo;s the standard we build to.</p>
		</div>
	</div>
</section>

<section class="section section--tone" aria-label="What we believe, in practice">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'What we believe' ); ?>
			<h2>Four convictions we build by.</h2>
		</div>
		<div class="grid-2" style="align-items:start;gap:2rem clamp(2rem,5vw,4.5rem)">
			<?php
			$beliefs = array(
				array( 'Operations first, technology second.', 'We start from how your work actually moves. The stack follows the process — never the other way around.' ),
				array( 'Automate the repeatable. Keep humans on judgment.', 'Pricing, exceptions and commitments belong to people. Everything routine around them belongs to the machine.' ),
				array( 'Integrate before you replace.', 'Your existing systems hold your data and your habits. We make them cooperate; we replace only what truly blocks you.' ),
				array( 'Only verified claims.', 'On this website and in our proposals: no invented clients, no imagined percentages, no borrowed logos. If we can\'t verify it, we don\'t say it.' ),
			);
			foreach ( $beliefs as $b ) :
				?>
				<div data-reveal="up" style="border-top:1px solid var(--line-strong);padding-top:1.2rem">
					<h3><?php echo esc_html( $b[0] ); ?></h3>
					<p class="muted"><?php echo esc_html( $b[1] ); ?></p>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<?php get_template_part( 'template-parts/process' ); ?>

<section class="section section--line" aria-label="Regional grounding">
	<div class="container grid-2">
		<div data-reveal="up">
			<?php operines_eyebrow( 'Where we work' ); ?>
			<h2>Built for how the Gulf does business.</h2>
		</div>
		<div data-reveal="up">
			<ul class="trust-list" style="margin-top:0">
				<li><?php echo operines_icon( 'whatsapp', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>WhatsApp-first customer behavior</strong><p>We design for the channel your customers actually use.</p></span></li>
				<li><?php echo operines_icon( 'globe', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Arabic and English, natively</strong><p>Bilingual conversations and interfaces — not an afterthought translation.</p></span></li>
				<li><?php echo operines_icon( 'doc', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>UAE operational reality</strong><p>VAT-conscious finance flows, local working rhythms, regional systems.</p></span></li>
				<li><?php echo operines_icon( 'nodes', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>GCC scalability</strong><p>Architecture that expands from UAE across KSA and the wider region.</p></span></li>
			</ul>
		</div>
	</div>
</section>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
