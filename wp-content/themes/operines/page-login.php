<?php
/**
 * Client sign-in.
 *
 * @package Operines
 */

get_header();

$error = isset( $_GET['error'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

operines_page_hero( 'Welcome back', 'Sign in to Operines.' );
?>

<section class="section section--tight">
	<div class="container">
		<div class="form-shell" style="max-width:440px">
			<?php if ( $error ) : ?>
				<p class="form-status form-status--error">That email and password don&rsquo;t match. Try again, or <a href="<?php echo esc_url( wp_lostpassword_url() ); ?>">reset your password</a>.</p>
			<?php endif; ?>

			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post" data-validate novalidate>
				<input type="hidden" name="action" value="operines_login">
				<?php wp_nonce_field( 'operines_login', '_opnonce' ); ?>
				<div class="field">
					<label for="l-email">Email</label>
					<input id="l-email" name="email" type="email" required autocomplete="email">
					<p class="field-error">Please add your email address.</p>
				</div>
				<div class="field">
					<label for="l-password">Password</label>
					<input id="l-password" name="password" type="password" required autocomplete="current-password">
					<p class="field-error">Please add your password.</p>
				</div>
				<div class="field">
					<label style="display:inline-flex;align-items:center;gap:0.5rem;font-weight:500"><input type="checkbox" name="remember" value="1" style="width:auto"> Keep me signed in</label>
				</div>
				<button class="btn btn--primary" type="submit"><span>Sign in</span><?php echo operines_icon( 'arrow-right', 17 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></button>
				<p class="small muted" style="margin-top:1.2rem"><a href="<?php echo esc_url( wp_lostpassword_url() ); ?>">Forgot your password?</a> &middot; New to Operines? <a href="<?php echo esc_url( home_url( '/register/' ) ); ?>">Create an account</a></p>
			</form>
		</div>
	</div>
</section>

<?php get_footer(); ?>
