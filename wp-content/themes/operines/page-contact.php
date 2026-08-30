<?php
/**
 * Contact page.
 *
 * @package Operines
 */

get_header();

$contact = operines_contact();
$sent    = isset( $_GET['sent'] );   // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$error   = isset( $_GET['error'] );  // phpcs:ignore WordPress.Security.NonceVerification.Recommended

operines_page_hero(
	'Contact',
	'Tell us how your business runs.',
	'A short conversation is usually enough to know whether automation will pay for itself. No pitch decks — we talk about your operation.'
);
?>

<section class="section section--tight">
	<div class="container grid-2" style="align-items:start">
		<div class="form-shell">
			<div id="form-status" role="status" aria-live="polite">
				<?php if ( $sent ) : ?>
					<p class="form-status form-status--ok">Thank you — your message is with us. We reply within one business day.</p>
				<?php elseif ( $error ) : ?>
					<p class="form-status form-status--error">Something didn&rsquo;t go through. Please check the required fields and try again, or email us directly.</p>
				<?php endif; ?>
			</div>

			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-validate novalidate>
				<input type="hidden" name="action" value="operines_contact">
				<?php wp_nonce_field( 'operines_contact', '_opnonce' ); ?>
				<input type="hidden" name="_opts" value="<?php echo esc_attr( (string) time() ); ?>">
				<p class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>

				<div class="field-row">
					<div class="field">
						<label for="c-name">Name</label>
						<input id="c-name" name="name" type="text" required autocomplete="name">
						<p class="field-error">Please add your name.</p>
					</div>
					<div class="field">
						<label for="c-email">Work email</label>
						<input id="c-email" name="email" type="email" required autocomplete="email">
						<p class="field-error">Please add a valid email address.</p>
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<label for="c-phone">Phone <span class="hint">(optional)</span></label>
						<input id="c-phone" name="phone" type="tel" autocomplete="tel">
					</div>
					<div class="field">
						<label for="c-company">Company <span class="hint">(optional)</span></label>
						<input id="c-company" name="company" type="text" autocomplete="organization">
					</div>
				</div>
				<div class="field">
					<label for="c-topic">Area of interest</label>
					<select id="c-topic" name="topic">
						<option>AI Automation Audit</option>
						<option>AI Agents</option>
						<option>Business Process Automation</option>
						<option>CRM &amp; Sales Automation</option>
						<option>ERP / Odoo</option>
						<option>Data &amp; BI</option>
						<option>Operines AI platform</option>
						<option>Something else</option>
					</select>
				</div>
				<div class="field">
					<label for="c-message">What should run better?</label>
					<textarea id="c-message" name="message" rows="5" required placeholder="e.g. Leads from our website wait hours for a reply…"></textarea>
					<p class="field-error">Tell us a little about your situation.</p>
				</div>
				<button class="btn btn--primary" type="submit"><span>Send message</span><?php echo operines_icon( 'arrow-right', 17 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></button>
			</form>
		</div>

		<aside>
			<p class="panel-label">Prefer a direct line?</p>
			<ul class="trust-list" style="margin-top:0.5rem">
				<?php if ( $contact['whatsapp'] ) : ?>
					<li><?php echo operines_icon( 'whatsapp', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>WhatsApp</strong><p><a href="https://wa.me/<?php echo esc_attr( $contact['whatsapp'] ); ?>" rel="noopener">Message us on WhatsApp</a> — fitting, given what we do.</p></span></li>
				<?php endif; ?>
				<?php if ( $contact['email'] ) : ?>
					<li><?php echo operines_icon( 'mail', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Email</strong><p><a href="mailto:<?php echo esc_attr( $contact['email'] ); ?>"><?php echo esc_html( $contact['email'] ); ?></a></p></span></li>
				<?php endif; ?>
				<?php if ( $contact['phone'] ) : ?>
					<li><?php echo operines_icon( 'phone', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Phone</strong><p><a href="tel:<?php echo esc_attr( preg_replace( '/\s+/', '', $contact['phone'] ) ); ?>"><?php echo esc_html( $contact['phone'] ); ?></a></p></span></li>
				<?php endif; ?>
				<li><?php echo operines_icon( 'globe', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Location</strong><p><?php echo esc_html( $contact['location'] ); ?></p></span></li>
				<li><?php echo operines_icon( 'clock', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Response time</strong><p>Within one business day.</p></span></li>
			</ul>
			<div class="verified-note mt-3">
				<?php echo operines_icon( 'spark', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<p><strong>Not sure where to start?</strong> The <a href="<?php echo esc_url( home_url( '/book-audit/' ) ); ?>">AI Automation Audit</a> is the structured way in — it ends with a ranked map of what to automate first.</p>
			</div>
		</aside>
	</div>
</section>

<?php get_footer(); ?>
