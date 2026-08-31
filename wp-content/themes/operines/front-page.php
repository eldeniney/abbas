<?php
/**
 * Homepage — minimal, decision-focused narrative for business owners.
 *
 * 01 Hero: illustration + live-operation feed
 * 02 Three business outcomes
 * 03 The Operines Effect (before/after)
 * 04 Core solutions (navigation hub)
 * 05 Operines AI (compact proof of engineering)
 * 06 Verified-results stance
 * 07 Final CTA
 *
 * Depth lives on the inner pages: department explorer on Use Cases,
 * architecture + integrations + the automation ledger on Solutions,
 * agent roles on the AI Agents page, process on About.
 *
 * @package Operines
 */

get_header();
?>

<!-- 01 · HERO -->
<section class="hero hero--split">
	<div class="container hero-split-grid">
		<div class="hero-copy">
			<?php operines_eyebrow( 'AI &amp; Automation — Built for UAE Business' ); ?>
			<h1>Build a business that runs intelligently</h1>
			<p class="lede">Operines connects your people, processes, data and software with AI agents and intelligent automation — one coordinated operation instead of disconnected tools. Built for your business. Kept under your control.</p>
			<div class="btn-row">
				<?php operines_button( 'Book an AI Automation Audit', home_url( '/book-audit/' ) ); ?>
				<?php operines_button( 'See what we automate', home_url( '/use-cases/' ), 'ghost' ); ?>
			</div>
			<ul class="hero-props">
				<li><?php echo operines_icon( 'check', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Arabic &amp; English</li>
				<li><?php echo operines_icon( 'check', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>WhatsApp-first</li>
				<li><?php echo operines_icon( 'check', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Built on your existing systems</li>
			</ul>
		</div>
		<div class="hero-visual" aria-hidden="true">
			<?php get_template_part( 'template-parts/hero-illustration' ); ?>
		</div>
	</div>
	<div class="container">
		<div class="systems-strip" role="presentation">
			<p class="systems-strip-label">Built on the systems you already run</p>
			<div class="systems-marquee">
				<ul class="systems-strip-list">
					<?php
					$systems = array( 'WhatsApp Business', 'Salesforce', 'Zoho', 'Odoo', 'Power BI', 'Microsoft 365', 'n8n', 'Make', 'UiPath', 'Shopify', 'Google Workspace', 'REST APIs' );
					foreach ( $systems as $sys ) :
						?>
						<li><?php echo esc_html( $sys ); ?></li>
					<?php endforeach; ?>
					<?php foreach ( $systems as $sys ) : // Duplicate run for the seamless loop. ?>
						<li aria-hidden="true"><?php echo esc_html( $sys ); ?></li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- 01a · LIVE OPERATION (simple) -->
<section class="section section--tight" aria-labelledby="live-title">
	<div class="container">
		<div class="section-head section-head--center" data-reveal="up">
			<?php operines_eyebrow( 'See it run' ); ?>
			<h2 id="live-title">This is your operation on Operines.</h2>
		</div>
		<div class="live-card" data-reveal="up">
			<p class="hero-ticker-head"><span class="pulse"></span> Live operation</p>
			<div class="hero-ticker-rows"></div>
			<p class="ledger-note">Illustrative sequence — this is how an automated operation behaves.</p>
		</div>
	</div>
</section>


<!-- 01b · VALUE PROPS -->
<section class="section section--tight" aria-label="What Operines delivers">
	<div class="container">
		<div class="value-grid stagger">
			<div class="value-item" data-reveal="up">
				<span class="value-icon"><?php echo operines_icon( 'spark', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				<h3>AI agents that work</h3>
				<p>Digital coworkers that answer customers, qualify leads and chase follow-ups — connected to your real systems, in Arabic and English.</p>
				<?php operines_textlink( 'Meet the agents', home_url( '/solutions/ai-agents/' ) ); ?>
			</div>
			<div class="value-item" data-reveal="up">
				<span class="value-icon"><?php echo operines_icon( 'nodes', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				<h3>Processes that run themselves</h3>
				<p>Approvals, documents, reporting and handovers automated end to end across CRM, ERP and finance — no retyping, no chasing.</p>
				<?php operines_textlink( 'See the automation', home_url( '/solutions/business-process-automation/' ) ); ?>
			</div>
			<div class="value-item" data-reveal="up">
				<span class="value-icon"><?php echo operines_icon( 'shield', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				<h3>People stay in control</h3>
				<p>Approval gates, audit trails and clear limits on what AI may decide alone. Automation executes; your team governs.</p>
				<?php operines_textlink( 'How governance works', home_url( '/solutions/ai-strategy-managed/' ) ); ?>
			</div>
		</div>
	</div>
</section>

<!-- 03 · THE OPERINES EFFECT -->
<section class="section section--tone" aria-labelledby="effect-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'The Operines effect' ); ?>
			<h2 id="effect-title">The same work. Without the waiting.</h2>
		</div>
		<div class="effect-rows">
			<?php foreach ( array_slice( operines_effect_rows(), 0, 3 ) as $row ) : ?>
				<div class="effect-row" data-reveal="up">
					<div class="effect-task"><?php echo esc_html( $row['task'] ); ?></div>
					<div class="effect-cell effect-cell--before">
						<span class="effect-tag effect-tag--before">Without Operines</span>
						<p><?php echo esc_html( $row['before'] ); ?></p>
						<p class="effect-cost"><?php echo esc_html( $row['b_cost'] ); ?></p>
					</div>
					<div class="effect-arrow"><?php echo operines_icon( 'arrow-right', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></div>
					<div class="effect-cell effect-cell--after">
						<span class="effect-tag effect-tag--after">With Operines</span>
						<p><?php echo esc_html( $row['after'] ); ?></p>
						<p class="effect-cost"><?php echo esc_html( $row['a_cost'] ); ?></p>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<p class="mt-3" data-reveal="fade"><?php operines_textlink( 'See every process we automate', home_url( '/use-cases/' ) ); ?></p>
	</div>
</section>

<!-- 04 · CORE SOLUTIONS -->
<section class="section" aria-labelledby="solutions-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'What we build' ); ?>
			<h2 id="solutions-title">Six ways in. One connected operation.</h2>
		</div>
		<div class="sol-grid stagger">
			<?php foreach ( operines_solutions() as $slug => $s ) : ?>
				<a class="sol-tile" href="<?php echo esc_url( home_url( '/solutions/' . $slug . '/' ) ); ?>" data-reveal="up">
					<span class="sol-no"><?php echo esc_html( $s['no'] ); ?></span>
					<span class="sol-title"><?php echo esc_html( $s['title'] ); ?></span>
					<span class="sol-outcome"><?php echo esc_html( $s['outcome'] ); ?></span>
					<span class="sol-tile-link">Explore<?php echo operines_icon( 'arrow-right', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<!-- 05 · OPERINES AI (compact) -->
<section class="section on-dark product-band" aria-labelledby="product-title">
	<div class="container grid-2">
		<div data-reveal="up">
			<?php operines_eyebrow( 'Our own platform' ); ?>
			<h2 id="product-title">We don&rsquo;t only implement AI.<br>We build it.</h2>
			<p class="lede" style="color:rgba(255,255,255,0.75)">Operines AI is our SaaS platform for WhatsApp-first business communication — the same engineering we bring to your operation.</p>
			<div class="btn-row">
				<?php operines_button( 'Explore Operines AI', home_url( '/operines-ai/' ), 'light' ); ?>
			</div>
		</div>
		<div data-reveal="up">
			<div class="product-mock" aria-hidden="true">
				<div class="product-mock-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="product-mock-title">Operines AI — Live conversations</span></div>
				<div class="product-chat" data-chat>
					<span class="bubble bubble--in">Do you deliver to Abu Dhabi? I need 40 units before Thursday.</span>
					<span class="bubble bubble--out">Yes — delivery to Abu Dhabi takes 48 hours, so a Thursday deadline works. Shall I prepare a quotation for 40 units?</span>
					<span class="bubble bubble--sys"><?php echo operines_icon( 'check', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Lead qualified &middot; CRM updated &middot; Sales notified</span>
				</div>
			</div>
			<p class="mock-note">Product illustration of the Operines AI conversation flow.</p>
		</div>
	</div>
</section>

<!-- 06 · PROOF STANCE -->
<section class="section section--tight" aria-label="Our standard for proof">
	<div class="container">
		<div class="verified-note" style="max-width:780px;margin-inline:auto" data-reveal="up">
			<?php echo operines_icon( 'shield', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			<p><strong>We publish only verified results.</strong> No borrowed logos, no invented percentages. Client stories appear on <a href="<?php echo esc_url( home_url( '/customer-stories/' ) ); ?>">Customer Stories</a> as they are approved — with the process before, what we built, and the measured outcome.</p>
		</div>
	</div>
</section>

<!-- 07 · FINAL CTA -->
<?php operines_cta_band(); ?>

<?php get_footer(); ?>
