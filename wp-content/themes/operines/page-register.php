<?php
/**
 * Client registration / onboarding.
 *
 * @package Operines
 */

get_header();

$error  = isset( $_GET['error'] );  // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$exists = isset( $_GET['exists'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

operines_page_hero(
	'Create your account',
	'Start with Operines.',
	'One account for everything: follow your requests, keep your business details in one place, and move faster when we start automating.'
);
?>

<section class="section section--tight">
	<div class="container grid-2" style="align-items:start">
		<div class="form-shell">
			<div id="form-status" role="status" aria-live="polite">
				<?php if ( $exists ) : ?>
					<p class="form-status form-status--error">An account already exists for this email. <a href="<?php echo esc_url( home_url( '/login/' ) ); ?>">Sign in instead</a> — or use the password reset if you forgot it.</p>
				<?php elseif ( $error ) : ?>
					<p class="form-status form-status--error">Something didn&rsquo;t go through. Please check the fields (password needs at least 8 characters) and try again.</p>
				<?php endif; ?>
			</div>

			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-validate novalidate>
				<input type="hidden" name="action" value="operines_register">
				<?php wp_nonce_field( 'operines_register', '_opnonce' ); ?>
				<input type="hidden" name="_opts" value="<?php echo esc_attr( (string) time() ); ?>">
				<p class="hp-field" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></p>

				<div class="field-row">
					<div class="field">
						<label for="r-name">Your name</label>
						<input id="r-name" name="name" type="text" required autocomplete="name">
						<p class="field-error">Please add your name.</p>
					</div>
					<div class="field">
						<label for="r-company">Company</label>
						<input id="r-company" name="company" type="text" autocomplete="organization">
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<label for="r-email">Work email</label>
						<input id="r-email" name="email" type="email" required autocomplete="email">
						<p class="field-error">Please add a valid email address.</p>
					</div>
					<div class="field">
						<label for="r-phone">Phone / WhatsApp <span class="hint">(optional)</span></label>
						<input id="r-phone" name="phone" type="tel" autocomplete="tel">
					</div>
				</div>
				<div class="field">
					<label for="r-password">Password <span class="hint">(at least 8 characters)</span></label>
					<input id="r-password" name="password" type="password" required minlength="8" autocomplete="new-password">
					<p class="field-error">Please choose a password of at least 8 characters.</p>
				</div>
				<div class="field-row">
					<div class="field">
						<label for="r-industry">Industry</label>
						<select id="r-industry" name="industry">
							<?php foreach ( array( 'Real Estate', 'Healthcare', 'Retail & E-commerce', 'Professional Services', 'Logistics', 'Hospitality', 'Financial Services', 'Education', 'Other' ) as $opt ) : ?>
								<option><?php echo esc_html( $opt ); ?></option>
							<?php endforeach; ?>
						</select>
					</div>
					<div class="field">
						<label for="r-size">Company size</label>
						<select id="r-size" name="size">
							<?php foreach ( array( '1–10', '11–50', '51–200', '200+' ) as $opt ) : ?>
								<option><?php echo esc_html( $opt ); ?></option>
							<?php endforeach; ?>
						</select>
					</div>
				</div>
				<div class="field">
					<label for="r-goal">What should run better in your business? <span class="hint">(optional — this starts your first conversation with us)</span></label>
					<textarea id="r-goal" name="goal" rows="3" placeholder="e.g. Leads from our website wait hours for a reply…"></textarea>
				</div>
				<button class="btn btn--primary" type="submit"><span>Create my account</span><?php echo operines_icon( 'arrow-right', 17 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></button>
				<p class="small muted" style="margin-top:1rem">Already have an account? <a href="<?php echo esc_url( home_url( '/login/' ) ); ?>">Sign in</a>. By registering you agree to our <a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">privacy policy</a>.</p>
			</form>
		</div>

		<aside>
			<p class="panel-label">What your account gives you</p>
			<ul class="trust-list" style="margin-top:0.5rem">
				<li><?php echo operines_icon( 'clock', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Track every request</strong><p>See the live status of your inquiries and audit — no chasing by email.</p></span></li>
				<li><?php echo operines_icon( 'person', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>One profile</strong><p>Your business details stay with us, so every conversation starts warm.</p></span></li>
				<li><?php echo operines_icon( 'spark', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>A faster audit</strong><p>Your industry and systems pre-fill the AI Automation Audit.</p></span></li>
				<li><?php echo operines_icon( 'shield', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput ?><span><strong>Your data, respected</strong><p>Used only to serve you. Never sold, never shared for marketing.</p></span></li>
			</ul>
		</aside>
	</div>
</section>

<?php get_footer(); ?>
