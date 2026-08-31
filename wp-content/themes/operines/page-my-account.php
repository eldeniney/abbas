<?php
/**
 * Client account: profile + request tracking.
 * Access is enforced in inc/accounts.php (redirects guests to /login/).
 *
 * @package Operines
 */

get_header();

$user     = wp_get_current_user();
$welcome  = isset( $_GET['welcome'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$saved    = isset( $_GET['sent'] );    // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$leads    = operines_user_leads( $user->ID );
$statuses = operines_lead_statuses();
$profile  = array();
foreach ( array_keys( operines_profile_fields() ) as $meta_key ) {
	$profile[ str_replace( 'operines_', '', $meta_key ) ] = get_user_meta( $user->ID, $meta_key, true );
}
?>

<header class="page-hero">
	<div class="container account-hero">
		<div>
			<?php operines_eyebrow( 'Your account' ); ?>
			<h1><?php echo esc_html( sprintf( 'Welcome, %s.', $user->display_name ) ); ?></h1>
			<?php if ( $profile['company'] ) : ?>
				<p class="lede"><?php echo esc_html( $profile['company'] ); ?><?php echo $profile['industry'] ? esc_html( ' · ' . $profile['industry'] ) : ''; ?></p>
			<?php endif; ?>
		</div>
		<a class="btn btn--ghost" href="<?php echo esc_url( wp_logout_url( home_url( '/' ) ) ); ?>"><span>Sign out</span></a>
	</div>
</header>

<section class="section section--tight">
	<div class="container">
		<div id="form-status" role="status" aria-live="polite">
			<?php if ( $welcome ) : ?>
				<p class="form-status form-status--ok">Your account is ready — welcome to Operines. A consultant will review your profile and reply within one business day. A confirmation email is on its way to you.</p>
			<?php elseif ( $saved ) : ?>
				<p class="form-status form-status--ok">Profile saved.</p>
			<?php endif; ?>
		</div>

		<div class="account-grid">
			<div>
				<div class="account-card">
					<div class="account-card-head">
						<h2>Your requests</h2>
						<?php operines_textlink( 'New audit request', home_url( '/book-audit/' ) ); ?>
					</div>
					<?php if ( $leads ) : ?>
						<ul class="request-list">
							<?php foreach ( $leads as $lead ) :
								$status = get_post_meta( $lead->ID, '_operines_lead_status', true );
								$status = isset( $statuses[ $status ] ) ? $status : 'new';
								?>
								<li class="request-item">
									<div>
										<strong><?php echo esc_html( get_post_meta( $lead->ID, '_operines_lead_type', true ) ); ?></strong>
										<span class="request-date"><?php echo esc_html( get_the_date( '', $lead ) ); ?></span>
									</div>
									<span class="operines-status operines-status--<?php echo esc_attr( $status ); ?>"><?php echo esc_html( $statuses[ $status ] ); ?></span>
								</li>
							<?php endforeach; ?>
						</ul>
						<p class="small muted" style="margin-top:1rem">Statuses update as our team works your requests — you&rsquo;ll also get an email on important changes.</p>
					<?php else : ?>
						<p class="muted">No requests yet. The best first step is the AI Automation Audit — seven questions, and you get a ranked map of what your business should automate first.</p>
						<div class="btn-row" style="margin-top:1rem">
							<?php operines_button( 'Book my AI Automation Audit', home_url( '/book-audit/' ) ); ?>
						</div>
					<?php endif; ?>
				</div>

				<div class="account-card">
					<div class="account-card-head"><h2>Quick actions</h2></div>
					<ul class="quick-actions">
						<li><?php operines_textlink( 'Book an AI Automation Audit', home_url( '/book-audit/' ) ); ?></li>
						<li><?php operines_textlink( 'Explore what we automate', home_url( '/use-cases/' ) ); ?></li>
						<li><?php operines_textlink( 'Talk to a consultant', home_url( '/contact/' ) ); ?></li>
						<li><?php operines_textlink( 'Change my password', wp_lostpassword_url() ); ?></li>
					</ul>
				</div>
			</div>

			<div class="account-card">
				<div class="account-card-head"><h2>Your profile</h2></div>
				<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-validate novalidate>
					<input type="hidden" name="action" value="operines_profile">
					<?php wp_nonce_field( 'operines_profile', '_opnonce' ); ?>
					<div class="field">
						<label for="p-name">Name</label>
						<input id="p-name" name="name" type="text" required value="<?php echo esc_attr( $user->display_name ); ?>">
						<p class="field-error">Please add your name.</p>
					</div>
					<div class="field">
						<label for="p-email">Email</label>
						<input id="p-email" type="email" value="<?php echo esc_attr( $user->user_email ); ?>" disabled>
						<p class="hint" style="margin-top:0.3rem">To change your email, contact us — it keeps your request history safe.</p>
					</div>
					<div class="field">
						<label for="p-phone">Phone / WhatsApp</label>
						<input id="p-phone" name="phone" type="tel" value="<?php echo esc_attr( $profile['phone'] ); ?>">
					</div>
					<div class="field">
						<label for="p-company">Company</label>
						<input id="p-company" name="company" type="text" value="<?php echo esc_attr( $profile['company'] ); ?>">
					</div>
					<div class="field-row">
						<div class="field">
							<label for="p-industry">Industry</label>
							<input id="p-industry" name="industry" type="text" value="<?php echo esc_attr( $profile['industry'] ); ?>">
						</div>
						<div class="field">
							<label for="p-size">Company size</label>
							<input id="p-size" name="size" type="text" value="<?php echo esc_attr( $profile['size'] ); ?>">
						</div>
					</div>
					<button class="btn btn--primary" type="submit"><span>Save profile</span></button>
				</form>
			</div>
		</div>
	</div>
</section>

<?php get_footer(); ?>
