<?php
/**
 * Operines AI — product page for our own SaaS platform.
 *
 * NOTE(owner): all product visuals here are labeled conceptual illustrations.
 * Replace with real Operines AI screenshots when provided, and confirm the
 * product URL for the primary CTA (see operines_contact / filter below).
 *
 * @package Operines
 */

get_header();

// TODO(owner): set the live product URL when confirmed (e.g. https://app.operines.ai).
$product_url = apply_filters( 'operines_ai_product_url', '' );
$cta_url     = $product_url ? $product_url : home_url( '/contact/' );
?>

<header class="page-hero">
	<div class="container">
		<?php operines_eyebrow( 'Operines AI — our product' ); ?>
		<h1>The platform we built<br>for WhatsApp-first business.</h1>
		<p class="lede">Operines AI is our own SaaS platform for AI-powered business communication: customer conversations on WhatsApp handled intelligently, connected to a built-in CRM, your product knowledge, offers and analytics — in Arabic and English.</p>
		<div class="btn-row">
			<?php operines_button( $product_url ? 'Open Operines AI' : 'Ask for a demo', $cta_url ); ?>
			<?php operines_button( 'Talk to us about it', home_url( '/contact/' ), 'ghost' ); ?>
		</div>
	</div>
</header>

<section class="section" aria-label="Why it matters">
	<div class="container grid-2">
		<div data-reveal="up">
			<?php operines_eyebrow( 'Why we built it' ); ?>
			<h2>In the Gulf, business happens on WhatsApp.</h2>
			<p class="lede">Customers ask, negotiate and buy in chat — at any hour, in two languages. Most companies answer with whoever is free, whenever they&rsquo;re free. Operines AI makes that first conversation instant, intelligent and connected to your operation.</p>
		</div>
		<div data-reveal="up">
			<div class="product-mock" aria-hidden="true">
				<div class="product-mock-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="product-mock-title">Operines AI — Conversation view</span></div>
				<div class="product-chat">
					<span class="bubble bubble--in">السلام عليكم، عندكم توصيل نفس اليوم؟</span>
					<span class="bubble bubble--out">وعليكم السلام! نعم، التوصيل في دبي خلال نفس اليوم للطلبات قبل الساعة ٢ ظهرًا. هل أجهّز لك الطلب؟</span>
					<span class="bubble bubble--sys"><?php echo operines_icon( 'check', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Language detected: Arabic &middot; Customer matched in CRM</span>
					<span class="bubble bubble--in">Yes please — 2 boxes to Marina.</span>
					<span class="bubble bubble--sys"><?php echo operines_icon( 'check', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Order draft created &middot; Team notified</span>
				</div>
			</div>
			<p class="mock-note">Product illustration — replaced by live product screenshots as they are approved for publication.</p>
		</div>
	</div>
</section>

<section class="section section--tone" aria-label="Capabilities">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'Inside the platform' ); ?>
			<h2>Conversation in front. Operation behind.</h2>
		</div>
		<div class="grid-3">
			<?php
			$features = array(
				array( 'whatsapp', 'AI conversations', 'Customers answered instantly on WhatsApp — qualifying, informing and following up in Arabic and English.' ),
				array( 'person', 'Built-in CRM', 'Every conversation becomes a customer record: history, status, ownership and next steps.' ),
				array( 'doc', 'Knowledge & products', 'The AI answers from your approved knowledge, catalog and offers — not from imagination.' ),
				array( 'spark', 'Automation', 'Follow-ups, assignments and notifications fire from conversation events.' ),
				array( 'chart', 'Analytics', 'Volumes, topics, response times and conversion — visible to management.' ),
				array( 'shield', 'Human handover', 'Your team takes over any conversation at any moment, with full context.' ),
			);
			foreach ( $features as $f ) :
				?>
				<div class="agent" data-reveal="up">
					<div class="agent-role"><?php echo operines_icon( $f[0], 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><h3><?php echo esc_html( $f[1] ); ?></h3></div>
					<p style="margin:0;color:var(--ink-2);font-size:0.95rem"><?php echo esc_html( $f[2] ); ?></p>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="section" aria-label="Product and services together">
	<div class="container grid-2">
		<div data-reveal="up">
			<?php operines_eyebrow( 'Why this matters to clients' ); ?>
			<h2>Proof we can engineer, not just advise.</h2>
		</div>
		<div data-reveal="up">
			<p class="lede">Operines AI is technology we designed, built and operate ourselves. When we architect automation for your business, we&rsquo;re applying the same engineering we stake our own product on.</p>
			<p class="mt-2"><?php operines_textlink( 'See what we build for clients', home_url( '/solutions/' ) ); ?></p>
		</div>
	</div>
</section>

<?php operines_cta_band(); ?>

<?php get_footer(); ?>
