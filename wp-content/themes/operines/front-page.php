<?php
/**
 * Homepage: the Intelligent Business narrative.
 *
 * 01 Hero — the operating canvas
 * 02 The problem
 * 03 The Operines Effect (before/after)
 * 04 Signature: what "automated" actually means
 * 05 Department explorer
 * 06 Architecture (dark)
 * 07 AI agents + human control
 * 08 Core solutions
 * 09 Operines AI product
 * 10 Integrations
 * 11 How we work
 * 12 Customer proof (honest state)
 * 13 Insights
 * 14 Final CTA band
 *
 * @package Operines
 */

get_header();

/*
 * Hero node map coordinates (percent of canvas). The SVG lines below use the
 * same viewBox-relative coordinates so chips and lines stay aligned.
 */
$nodes = array(
	'whatsapp'  => array( 14, 16, 'WhatsApp', 'whatsapp' ),
	'email'     => array( 46, 5, 'Email', 'mail' ),
	'crm'       => array( 82, 13, 'CRM', 'person' ),
	'erp'       => array( 92, 46, 'ERP', 'nodes' ),
	'finance'   => array( 82, 82, 'Finance', 'clock' ),
	'docs'      => array( 48, 93, 'Documents', 'doc' ),
	'analytics' => array( 12, 82, 'Analytics', 'chart' ),
	'website'   => array( 4, 46, 'Website', 'globe' ),
);
?>

<!-- 01 · HERO -->
<section class="hero hero--center">
	<div class="container">
		<div class="hero-copy">
			<?php operines_eyebrow( 'AI &amp; Automation — Built for UAE Business' ); ?>
			<h1>Build a business that <br class="br-wide">runs intelligently.</h1>
			<p class="lede">Operines connects your people, processes, data and software with AI agents and intelligent automation — turning disconnected operations into one coordinated system.</p>
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

		<div class="hero-frame" aria-hidden="true">
			<div class="hero-frame-bar">
				<span class="dot"></span><span class="dot"></span><span class="dot"></span>
				<span class="hero-frame-title">Operines — one operation, coordinated</span>
			</div>
			<div class="hero-frame-body">
				<div class="hero-map">
					<svg class="hero-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
						<?php foreach ( $nodes as $key => $n ) : ?>
							<line class="link-line" data-line="<?php echo esc_attr( $key ); ?>" x1="<?php echo esc_attr( $n[0] ); ?>" y1="<?php echo esc_attr( $n[1] ); ?>" x2="50" y2="50" vector-effect="non-scaling-stroke" />
						<?php endforeach; ?>
					</svg>
					<?php foreach ( $nodes as $key => $n ) : ?>
						<span class="hero-node" data-node="<?php echo esc_attr( $key ); ?>" style="left:<?php echo esc_attr( $n[0] ); ?>%;top:<?php echo esc_attr( $n[1] ); ?>%">
							<?php echo operines_icon( $n[3], 14 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><?php echo esc_html( $n[2] ); ?>
						</span>
					<?php endforeach; ?>
					<div class="hero-core">
						<img class="hero-core-logo" src="<?php echo esc_url( OPERINES_URI . '/assets/img/operines-logo-light.svg' ); ?>" alt="" width="105" height="25">
						<span class="hero-core-sub">Intelligence layer</span>
					</div>
				</div>
				<div class="hero-ticker">
					<p class="hero-ticker-head"><span class="pulse"></span> Live operation</p>
					<div class="hero-ticker-rows"></div>
					<p class="hero-ticker-note">Illustrative sequence — this is how an automated operation behaves.</p>
				</div>
			</div>
		</div>

		<div class="systems-strip" role="presentation">
			<p class="systems-strip-label">Built on the systems you already run</p>
			<ul class="systems-strip-list">
				<?php foreach ( array( 'WhatsApp Business', 'Salesforce', 'Zoho', 'Odoo', 'Power BI', 'Microsoft 365', 'n8n', 'Make', 'UiPath' ) as $sys ) : ?>
					<li><?php echo esc_html( $sys ); ?></li>
				<?php endforeach; ?>
			</ul>
		</div>
	</div>
</section>

<!-- 01b · VALUE PROPS -->
<section class="section section--tight" aria-label="What Operines delivers">
	<div class="container">
		<div class="value-grid">
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

<!-- 02 · THE PROBLEM -->
<section class="section section--line" aria-labelledby="problem-title">
	<div class="container">
		<div class="grid-2">
			<div data-reveal="up">
				<?php operines_eyebrow( 'The problem' ); ?>
				<h2 id="problem-title">Your business has enough software.<br>It&rsquo;s the work <em>between</em> the systems that&rsquo;s broken.</h2>
			</div>
			<div data-reveal="up">
				<p class="lede">The CRM doesn&rsquo;t know what happened on WhatsApp. The ERP waits for someone to retype the order. The weekly report is a person, a spreadsheet and an evening.</p>
				<p class="lede">Businesses don&rsquo;t need more tools. They need less manual work, less switching, less waiting — and more intelligent execution. Operines builds the intelligence layer around the systems you already own.</p>
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
			<p class="lede">Descriptive comparisons of the operations we automate — your audit maps the numbers for your own business.</p>
		</div>
		<div class="effect-rows">
			<?php foreach ( operines_effect_rows() as $row ) : ?>
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
	</div>
</section>

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
				<div class="ledger">
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

<!-- 06 · ARCHITECTURE (dark) -->
<section class="section on-dark" aria-labelledby="arch-title">
	<div class="container">
		<div class="section-head section-head--center" data-reveal="up">
			<?php operines_eyebrow( 'The architecture' ); ?>
			<h2 id="arch-title">One intelligence layer.<br>Between your customers and your systems.</h2>
		</div>
		<div class="arch" data-reveal="up">
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

<!-- 07 · AI AGENTS + HUMAN CONTROL -->
<section class="section" aria-labelledby="agents-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'AI agents' ); ?>
			<h2 id="agents-title">A digital workforce — with job descriptions.</h2>
			<p class="lede">Not chatbots. Each Operines agent has a role, connected systems, and clear limits: what it decides alone, and what waits for a human.</p>
		</div>
		<div class="agents-grid">
			<?php
			$agents = array(
				array(
					'icon' => 'person',
					'name' => 'Sales Agent',
					'spec' => array(
						'Observes'    => 'WhatsApp + website leads',
						'Understands' => 'Budget, intent, urgency',
						'Acts'        => 'Qualifies, creates the CRM opportunity, replies',
						'Coordinates' => 'Your sales team, with SLAs',
						'Reports'     => 'Conversion status, live',
					),
					'gate' => 'Discounts &amp; offers need human approval',
				),
				array(
					'icon' => 'whatsapp',
					'name' => 'Customer Service Agent',
					'spec' => array(
						'Observes'    => 'WhatsApp, email, web chat',
						'Understands' => 'The request, in Arabic or English',
						'Acts'        => 'Answers from approved knowledge, checks orders',
						'Coordinates' => 'Escalates hard cases with full context',
						'Reports'     => 'Volumes, topics, satisfaction',
					),
					'gate' => 'Refunds &amp; exceptions go to your team',
				),
				array(
					'icon' => 'chart',
					'name' => 'Reporting Agent',
					'spec' => array(
						'Observes'    => 'CRM, ERP, finance data',
						'Understands' => 'Your KPIs and thresholds',
						'Acts'        => 'Builds the weekly brief, refreshes dashboards',
						'Coordinates' => 'Alerts owners when numbers move',
						'Reports'     => 'The business, to management',
					),
					'gate' => 'Decisions stay with people — informed ones',
				),
			);
			foreach ( $agents as $agent ) :
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

<!-- 08 · CORE SOLUTIONS -->
<section class="section section--tone" aria-labelledby="solutions-title">
	<div class="container">
		<div class="section-head" data-reveal="up">
			<?php operines_eyebrow( 'What we build' ); ?>
			<h2 id="solutions-title">Six ways in. One connected operation.</h2>
		</div>
		<div class="sol-grid">
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

<!-- 09 · OPERINES AI PRODUCT -->
<section class="section on-dark product-band" aria-labelledby="product-title">
	<div class="container grid-2">
		<div data-reveal="up">
			<?php operines_eyebrow( 'Our own platform' ); ?>
			<h2 id="product-title">We don&rsquo;t only implement AI.<br>We build it.</h2>
			<p class="lede" style="color:rgba(255,255,255,0.75)">Operines AI is our SaaS platform for AI-powered business communication: WhatsApp-first customer conversations, a built-in CRM, product knowledge, offers and analytics — in Arabic and English.</p>
			<p style="color:rgba(255,255,255,0.6)">It runs the same intelligence we engineer for clients — which is exactly why you can trust us with yours.</p>
			<div class="btn-row">
				<?php operines_button( 'Explore Operines AI', home_url( '/operines-ai/' ), 'light' ); ?>
			</div>
		</div>
		<div data-reveal="up">
			<div class="product-mock" aria-hidden="true">
				<div class="product-mock-bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="product-mock-title">Operines AI — Live conversations</span></div>
				<div class="product-chat">
					<span class="bubble bubble--in">Do you deliver to Abu Dhabi? I need 40 units before Thursday.</span>
					<span class="bubble bubble--out">Yes — delivery to Abu Dhabi takes 48 hours, so a Thursday deadline works. Shall I prepare a quotation for 40 units?</span>
					<span class="bubble bubble--sys"><?php echo operines_icon( 'check', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Lead qualified &middot; CRM updated &middot; Sales notified</span>
					<span class="bubble bubble--in">Yes please, send it.</span>
					<span class="bubble bubble--sys"><?php echo operines_icon( 'check', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>Quotation task created — awaiting human approval</span>
				</div>
			</div>
			<p class="mock-note">Product illustration of the Operines AI conversation flow.</p>
		</div>
	</div>
</section>

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

<!-- 12 · PROOF, HONESTLY -->
<section class="section section--tone" aria-labelledby="proof-title">
	<div class="container">
		<div class="grid-2" style="align-items:start">
			<div data-reveal="up">
				<?php operines_eyebrow( 'Customer stories' ); ?>
				<h2 id="proof-title">We publish only verified results.</h2>
				<p class="lede">No borrowed logos. No invented percentages. As client stories are approved for publication, they appear here — with the process before, what we built, and the measured result.</p>
				<p class="mt-2"><?php operines_textlink( 'How we document results', home_url( '/customer-stories/' ) ); ?></p>
			</div>
			<div data-reveal="up">
				<div class="verified-note">
					<?php echo operines_icon( 'shield', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
					<p><strong>Our standard for proof:</strong> every published story names the systems connected, the process replaced, and a result the client has signed off. If we can&rsquo;t verify it, we don&rsquo;t publish it.</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- 13 · INSIGHTS -->
<?php
$recent = new WP_Query( array( 'posts_per_page' => 3, 'ignore_sticky_posts' => true, 'no_found_rows' => true ) );
if ( $recent->have_posts() ) :
	?>
	<section class="section" aria-labelledby="insights-title">
		<div class="container">
			<div class="section-head" data-reveal="up">
				<?php operines_eyebrow( 'Insights' ); ?>
				<h2 id="insights-title">Thinking in operations.</h2>
			</div>
			<div class="insights-list">
				<?php
				while ( $recent->have_posts() ) :
					$recent->the_post();
					?>
					<a class="insight-row" href="<?php the_permalink(); ?>" data-reveal="up">
						<span class="insight-date"><?php echo esc_html( get_the_date() ); ?></span>
						<span>
							<span class="insight-title"><?php the_title(); ?></span>
							<span class="insight-excerpt"><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></span>
						</span>
						<span class="insight-cat"><?php
						$cats = get_the_category();
						echo esc_html( $cats ? $cats[0]->name : 'Insights' );
						?></span>
					</a>
				<?php endwhile; wp_reset_postdata(); ?>
			</div>
			<p class="mt-3" data-reveal="fade"><?php operines_textlink( 'All insights', home_url( '/insights/' ) ); ?></p>
		</div>
	</section>
<?php endif; ?>

<!-- 14 · FINAL CTA -->
<?php operines_cta_band(); ?>

<?php get_footer(); ?>
