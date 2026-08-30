<?php
/**
 * Operines site seeder. Run once after activating the theme:
 *
 *   wp eval-file wp-content/themes/operines/bin/seed.php
 *
 * Idempotent: existing pages (by slug) are kept, not duplicated.
 * Creates the page tree, sets front/posts pages, permalinks, tagline,
 * legal placeholder pages (flagged for legal review) and the initial
 * Insights articles.
 *
 * @package Operines
 */

defined( 'WP_CLI' ) || defined( 'ABSPATH' ) || exit;

/**
 * Get-or-create a page by path.
 */
function operines_seed_page( string $slug, string $title, array $args = array() ): int {
	$existing = get_page_by_path( ltrim( ( $args['parent_path'] ?? '' ) . '/' . $slug, '/' ), OBJECT, 'page' );
	if ( $existing ) {
		// WordPress ships some pages (e.g. Privacy Policy) as drafts — publish them.
		if ( 'publish' !== $existing->post_status ) {
			wp_update_post(
				array(
					'ID'           => $existing->ID,
					'post_status'  => 'publish',
					'post_content' => $existing->post_content ? $existing->post_content : ( $args['content'] ?? '' ),
				)
			);
		}
		return (int) $existing->ID;
	}
	$parent = 0;
	if ( ! empty( $args['parent_path'] ) ) {
		$p = get_page_by_path( $args['parent_path'], OBJECT, 'page' );
		if ( $p ) {
			$parent = (int) $p->ID;
		}
	}
	$id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_name'    => $slug,
			'post_title'   => $title,
			'post_parent'  => $parent,
			'post_content' => $args['content'] ?? '',
		)
	);
	if ( $id && ! empty( $args['template'] ) ) {
		update_post_meta( $id, '_wp_page_template', $args['template'] );
	}
	return (int) $id;
}

update_option( 'blogname', 'Operines' );
update_option( 'blogdescription', 'AI & Business Automation for UAE Business' );
update_option( 'permalink_structure', '/%postname%/' );
update_option( 'timezone_string', 'Asia/Dubai' );

// Core pages.
$home_id     = operines_seed_page( 'home', 'Home' );
$insights_id = operines_seed_page( 'insights', 'Insights' );
operines_seed_page( 'solutions', 'Solutions' );
operines_seed_page( 'industries', 'Industries' );
operines_seed_page( 'use-cases', 'Use Cases' );
operines_seed_page( 'operines-ai', 'Operines AI' );
operines_seed_page( 'about', 'About' );
operines_seed_page( 'contact', 'Contact' );
operines_seed_page( 'book-audit', 'Book an AI Automation Audit' );

// Solution child pages, driven by the data layer.
foreach ( operines_solutions() as $slug => $s ) {
	operines_seed_page(
		$slug,
		$s['title'],
		array(
			'parent_path' => 'solutions',
			'template'    => 'page-templates/solution.php',
		)
	);
}

// Legal placeholders — flagged for professional review before launch.
$legal_note = '<p><em>Placeholder: this text must be reviewed and completed by the site owner / legal counsel before launch.</em></p>';
operines_seed_page(
	'privacy-policy',
	'Privacy Policy',
	array( 'content' => $legal_note . '<p>Operines respects your privacy. Details submitted through forms on this site (name, contact details, and what you tell us about your business) are used only to respond to your inquiry and are not sold or shared with third parties for marketing.</p>' )
);
operines_seed_page(
	'terms',
	'Terms of Use',
	array( 'content' => $legal_note . '<p>By using this website you agree that its content is provided for general information about Operines services and does not constitute a contractual offer.</p>' )
);

update_option( 'show_on_front', 'page' );
update_option( 'page_on_front', $home_id );
update_option( 'page_for_posts', $insights_id );

// Categories.
$cats = array();
foreach ( array( 'AI Strategy', 'AI Agents', 'WhatsApp Automation', 'Automation', 'Data & Analytics' ) as $cat ) {
	$term = term_exists( $cat, 'category' );
	if ( ! $term ) {
		$term = wp_insert_term( $cat, 'category' );
	}
	$cats[ $cat ] = is_array( $term ) ? (int) $term['term_id'] : (int) $term;
}

// Initial Insights articles (editorial content authored for Operines —
// review wording before launch if desired).
$articles = array(
	array(
		'title'    => 'What should your business automate first?',
		'slug'     => 'what-to-automate-first',
		'category' => 'AI Strategy',
		'excerpt'  => 'Not the most exciting process. The most expensive boring one. A practical way to rank automation opportunities before you spend a dirham.',
		'content'  => '
<p>Most automation projects fail before they start — at the moment a company picks the wrong first process. The instinct is to automate something impressive. The discipline is to automate something boring, frequent and expensive.</p>
<h2>The three-question filter</h2>
<p>Put every candidate process through the same filter:</p>
<ol>
<li><strong>Is it frequent?</strong> A task performed forty times a day compounds. A task performed monthly rarely justifies engineering.</li>
<li><strong>Is it rule-based most of the time?</strong> If 80% of cases follow the same path, automate the 80% and route the rest to a person.</li>
<li><strong>Is delay expensive?</strong> A lead that waits until tomorrow, an invoice that waits for a signature, a report that arrives after the meeting — delay is where manual work quietly costs the most.</li>
</ol>
<h2>Where the answers usually point</h2>
<p>Across UAE businesses we see the same first winners: lead response and qualification, customer follow-up, invoice handling, data entry between two systems that don\'t talk, and the weekly management report. None of them are glamorous. All of them are measured in hours per week and lost revenue.</p>
<h2>What not to automate</h2>
<p>Anything that is genuinely judgment: pricing exceptions, sensitive customer conversations, decisions with contractual weight. A good automation design routes these to a person faster, with better context — it does not try to replace the person.</p>
<h2>The honest starting point</h2>
<p>Rank your processes by (hours spent × frequency × cost of delay) against implementation effort. The top of that list is your first automation. If you want a structured version of this exercise applied to your business, that is exactly what our <a href="/book-audit/">AI Automation Audit</a> produces.</p>',
	),
	array(
		'title'    => 'RPA, workflow tools and AI agents: what is actually different?',
		'slug'     => 'rpa-vs-workflows-vs-ai-agents',
		'category' => 'AI Agents',
		'excerpt'  => 'Three technologies get called "automation." They fail differently, cost differently, and fit different work. A plain-language map.',
		'content'  => '
<p>"Automation" now covers three quite different technologies. Choosing between them badly is the second most common way projects fail.</p>
<h2>RPA: replaying human clicks</h2>
<p>Robotic process automation drives the same screens a person would — clicking buttons, copying fields. It shines when a legacy system has no API. Its weakness: it breaks when the screen changes, and it never understands what it is doing.</p>
<h2>Workflow tools: connecting systems by rules</h2>
<p>Platforms like n8n, Make and Power Automate move data between systems through APIs: when X happens, do Y. Deterministic, auditable, fast to build. Their limit: every path must be foreseen. Unstructured input — a customer message, a scanned invoice — stops them.</p>
<h2>AI agents: handling the unstructured part</h2>
<p>An AI agent reads the WhatsApp message, understands that it is a delivery complaint from an existing customer, and decides — within limits you define — what happens next: answer, update the record, escalate. Agents handle variability; rules handle certainty.</p>
<h2>Real operations use all three</h2>
<p>A well-designed operation is layered: AI at the messy edges (messages, documents, decisions with bounded scope), deterministic workflows in the middle (routing, updates, notifications), and RPA only where a system offers no better door. The design question is never "which tool?" — it is "which work?"</p>
<p>Tools connect steps. The operating design — what AI decides, what automation executes, what humans approve — is the part that determines whether any of it pays off.</p>',
	),
	array(
		'title'    => 'WhatsApp is the front door of Gulf business. Most companies leave it unattended.',
		'slug'     => 'whatsapp-front-door-gulf-business',
		'category' => 'WhatsApp Automation',
		'excerpt'  => 'Customers in the UAE ask, negotiate and buy in chat — at 9pm, in two languages. What it takes to answer properly at scale.',
		'content'  => '
<p>In the UAE and the wider Gulf, WhatsApp is not a support channel. It is where inquiries arrive, where prices are negotiated, and where deals quietly die when nobody replies until morning.</p>
<h2>The pattern every business recognizes</h2>
<p>A customer messages at 21:40. Whoever holds the company phone is at dinner. The message gets a reply at 10:15 the next day — after the customer has already messaged two competitors. Nothing about this involves bad employees. It is an unstaffed front door.</p>
<h2>What "answering properly" means</h2>
<p>Automating WhatsApp badly is easy: a menu bot that frustrates everyone. Doing it well means four things:</p>
<ul>
<li><strong>Understanding, not menus.</strong> The system reads the actual request — in Arabic or English, or both in one message.</li>
<li><strong>Real answers from real data.</strong> Availability, prices and order status come from your systems, not from a script.</li>
<li><strong>A record, not a chat log.</strong> Every conversation becomes or updates a CRM record, so the follow-up exists even if the customer goes quiet.</li>
<li><strong>A human, one tap away.</strong> The moment a conversation needs judgment, a person takes over with the full context in front of them.</li>
</ul>
<h2>The operational payoff</h2>
<p>The visible win is response time measured in seconds. The structural win is bigger: WhatsApp stops being a private inbox on someone\'s phone and becomes part of the operation — measurable, assignable and connected to sales.</p>
<p>This problem is central to what we build at Operines — both for clients and in our own <a href="/operines-ai/">Operines AI</a> platform.</p>',
	),
);

foreach ( $articles as $a ) {
	if ( get_page_by_path( $a['slug'], OBJECT, 'post' ) ) {
		continue;
	}
	wp_insert_post(
		array(
			'post_type'     => 'post',
			'post_status'   => 'publish',
			'post_name'     => $a['slug'],
			'post_title'    => $a['title'],
			'post_excerpt'  => $a['excerpt'],
			'post_content'  => trim( $a['content'] ),
			'post_category' => array( $cats[ $a['category'] ] ),
		)
	);
}

// Remove default sample content if untouched.
foreach ( array( 'hello-world' ) as $sample ) {
	$p = get_page_by_path( $sample, OBJECT, 'post' );
	if ( $p ) {
		wp_delete_post( $p->ID, true );
	}
}
$sample_page = get_page_by_path( 'sample-page', OBJECT, 'page' );
if ( $sample_page ) {
	wp_delete_post( $sample_page->ID, true );
}

flush_rewrite_rules();

echo "Operines seed complete.\n";
