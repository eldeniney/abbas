<?php
/**
 * Book an AI Automation Audit — the productized lead magnet.
 *
 * Honest framing: this collects a structured initial assessment; the
 * opportunity map itself is prepared by consultants, not auto-generated.
 *
 * @package Operines
 */

get_header();

$sent  = isset( $_GET['sent'] );  // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$error = isset( $_GET['error'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
?>

<header class="page-hero">
	<div class="container">
		<?php operines_eyebrow( 'AI Automation Audit' ); ?>
		<h1>Discover what your company<br>should automate.</h1>
		<p class="lede">Seven quick questions about how your business runs. We use them to prepare your automation opportunity map — a ranked view of where AI and automation would pay off first in your operation.</p>
	</div>
</header>

<section class="section section--tight">
	<div class="container grid-2" style="align-items:start">
		<div>
			<div id="form-status" role="status" aria-live="polite">
				<?php if ( $sent ) : ?>
					<p class="form-status form-status--ok">Received — thank you. A consultant will review your answers and come back within one business day with next steps for your opportunity map.</p>
				<?php elseif ( $error ) : ?>
					<p class="form-status form-status--error">That didn&rsquo;t go through. Please check your answers and try again, or <a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">contact us directly</a>.</p>
				<?php endif; ?>
			</div>

			<?php if ( ! $sent ) : ?>
			<div class="audit-shell" data-audit>
				<div class="audit-progress">
					<span data-audit-count>1 / 7</span>
					<span class="audit-bar"><span class="audit-bar-fill"></span></span>
				</div>

				<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-validate novalidate>
					<input type="hidden" name="action" value="operines_audit">
					<?php wp_nonce_field( 'operines_audit', '_opnonce' ); ?>
					<input type="hidden" name="_opts" value="<?php echo esc_attr( (string) time() ); ?>">
					<p class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>

					<fieldset class="audit-step" style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">Which industry are you in?</legend>
						<div class="audit-options">
							<?php foreach ( array( 'Real Estate', 'Healthcare', 'Retail & E-commerce', 'Professional Services', 'Logistics', 'Hospitality', 'Financial Services', 'Other' ) as $i => $opt ) : ?>
								<div class="audit-option">
									<input type="radio" id="ind-<?php echo (int) $i; ?>" name="industry" value="<?php echo esc_attr( $opt ); ?>" <?php checked( 0 === $i ); ?>>
									<label for="ind-<?php echo (int) $i; ?>"><?php echo esc_html( $opt ); ?></label>
								</div>
							<?php endforeach; ?>
						</div>
					</fieldset>

					<fieldset class="audit-step" hidden style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">How many people work in the company?</legend>
						<div class="audit-options">
							<?php foreach ( array( '1–10', '11–50', '51–200', '200+' ) as $i => $opt ) : ?>
								<div class="audit-option">
									<input type="radio" id="size-<?php echo (int) $i; ?>" name="size" value="<?php echo esc_attr( $opt ); ?>" <?php checked( 0 === $i ); ?>>
									<label for="size-<?php echo (int) $i; ?>"><?php echo esc_html( $opt ); ?></label>
								</div>
							<?php endforeach; ?>
						</div>
					</fieldset>

					<fieldset class="audit-step" hidden style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">Where does the most manual work happen?</legend>
						<div class="audit-options">
							<?php foreach ( array( 'Sales', 'Customer Service', 'Operations', 'Finance', 'HR', 'Management reporting' ) as $i => $opt ) : ?>
								<div class="audit-option">
									<input type="radio" id="dept-<?php echo (int) $i; ?>" name="department" value="<?php echo esc_attr( $opt ); ?>" <?php checked( 0 === $i ); ?>>
									<label for="dept-<?php echo (int) $i; ?>"><?php echo esc_html( $opt ); ?></label>
								</div>
							<?php endforeach; ?>
						</div>
					</fieldset>

					<fieldset class="audit-step" hidden style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">Which systems do you run today?</legend>
						<div class="field">
							<label for="a-systems">Systems <span class="hint">(e.g. Zoho CRM, Odoo, Excel, WhatsApp Business)</span></label>
							<input id="a-systems" name="systems" type="text" placeholder="CRM, ERP, spreadsheets…">
						</div>
					</fieldset>

					<fieldset class="audit-step" hidden style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">Which process eats the most time?</legend>
						<div class="field">
							<label for="a-process">Describe it briefly</label>
							<textarea id="a-process" name="process" rows="4" required placeholder="e.g. Every lead from the portal is typed into Excel, then someone WhatsApps the agent…"></textarea>
							<p class="field-error">This is the most valuable answer — one sentence is enough.</p>
						</div>
					</fieldset>

					<fieldset class="audit-step" hidden style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">What&rsquo;s the main goal?</legend>
						<div class="audit-options audit-options--stack">
							<?php foreach ( array( 'Respond to customers faster', 'Stop losing leads', 'Reduce manual admin work', 'See the business clearly (reporting)', 'Scale without hiring proportionally' ) as $i => $opt ) : ?>
								<div class="audit-option">
									<input type="radio" id="ch-<?php echo (int) $i; ?>" name="challenge" value="<?php echo esc_attr( $opt ); ?>" <?php checked( 0 === $i ); ?>>
									<label for="ch-<?php echo (int) $i; ?>"><?php echo esc_html( $opt ); ?></label>
								</div>
							<?php endforeach; ?>
						</div>
					</fieldset>

					<fieldset class="audit-step" hidden style="border:0;padding:0;margin:0">
						<legend class="audit-step-title">Where should we send your opportunity map?</legend>
						<div class="field-row">
							<div class="field">
								<label for="a-name">Name</label>
								<input id="a-name" name="name" type="text" required autocomplete="name">
								<p class="field-error">Please add your name.</p>
							</div>
							<div class="field">
								<label for="a-company">Company</label>
								<input id="a-company" name="company" type="text" autocomplete="organization">
							</div>
						</div>
						<div class="field-row">
							<div class="field">
								<label for="a-email">Work email</label>
								<input id="a-email" name="email" type="email" required autocomplete="email">
								<p class="field-error">Please add a valid email address.</p>
							</div>
							<div class="field">
								<label for="a-phone">Phone / WhatsApp <span class="hint">(optional)</span></label>
								<input id="a-phone" name="phone" type="tel" autocomplete="tel">
							</div>
						</div>
					</fieldset>

					<div class="audit-preparing" hidden>
						<div class="spinner" aria-hidden="true"></div>
						<h2 style="font-size:1.4rem">Preparing your automation opportunity map&hellip;</h2>
						<p class="muted small">Your answers are on their way to our consultants.</p>
					</div>

					<div class="audit-nav">
						<button class="btn btn--ghost" type="button" data-audit-prev disabled><span>Back</span></button>
						<button class="btn btn--primary" type="button" data-audit-next><span>Continue</span><?php echo operines_icon( 'arrow-right', 17 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></button>
						<button class="btn btn--primary" type="submit" data-audit-submit hidden><span>Request my opportunity map</span><?php echo operines_icon( 'arrow-right', 17 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></button>
					</div>
				</form>
			</div>
			<p class="small muted" style="margin-top:1rem">This is a structured initial assessment reviewed by our consultants — not an automated report. You&rsquo;ll hear from a person.</p>
			<?php endif; ?>
		</div>

		<aside>
			<p class="panel-label">What you get</p>
			<div class="story-anatomy" style="margin-top:0.5rem">
				<div class="story-part"><div><h3>A review of your answers</h3><p>By a consultant who has automated similar operations.</p></div></div>
				<div class="story-part"><div><h3>Your opportunity map</h3><p>The processes worth automating in your business, ranked by return against effort.</p></div></div>
				<div class="story-part"><div><h3>A recommended first move</h3><p>The quick win we would ship first, and roughly what it involves.</p></div></div>
				<div class="story-part"><div><h3>An honest &ldquo;no&rdquo; where it applies</h3><p>If a process shouldn&rsquo;t be automated, we say so. That&rsquo;s the audit&rsquo;s job.</p></div></div>
			</div>
		</aside>
	</div>
</section>

<section class="section section--line" aria-label="Audit questions">
	<div class="container">
		<?php operines_faq_list( array_slice( operines_global_faqs(), 5 ), 'Before you ask.' ); ?>
	</div>
</section>

<?php get_footer(); ?>
