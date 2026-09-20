<?php
/**
 * Private access screen. Rendered instead of any page when the visitor
 * is not allowed in. Deliberately does not use header.php.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$mrabb_login_state = isset( $_GET['login'] ) ? sanitize_key( wp_unslash( $_GET['login'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
$mrabb_is_forbidden = is_user_logged_in();
$mrabb_redirect     = home_url( '/' );
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'mrabb-login-screen' ); ?>>
<?php wp_body_open(); ?>
<main class="mrabb-login" id="mrabb-main">
	<div class="mrabb-login__card">
		<div class="mrabb-orb mrabb-orb--small" data-state="idle" aria-hidden="true"><span class="mrabb-orb__core"></span><span class="mrabb-orb__ring mrabb-orb__ring--1"></span></div>
		<p class="mrabb-login__brand"><?php echo esc_html( mrabb_get_setting( 'agent_name', 'Mr. Abb' ) ); ?></p>
		<h1 class="mrabb-login__title"><?php echo $mrabb_is_forbidden ? esc_html__( 'This space is private.', 'mr-abb' ) : esc_html__( 'Welcome back.', 'mr-abb' ); ?></h1>

		<?php if ( $mrabb_is_forbidden ) : ?>
			<p class="mrabb-login__text"><?php esc_html_e( 'Your account is not allowed to use this interface.', 'mr-abb' ); ?></p>
			<a class="mrabb-btn mrabb-btn--ghost" href="<?php echo esc_url( wp_logout_url( home_url( '/' ) ) ); ?>"><?php esc_html_e( 'Sign out', 'mr-abb' ); ?></a>
		<?php else : ?>
			<p class="mrabb-login__text"><?php esc_html_e( 'Sign in to talk to Mr. Abb.', 'mr-abb' ); ?></p>
			<?php if ( 'failed' === $mrabb_login_state ) : ?>
				<p class="mrabb-login__error" role="alert"><?php esc_html_e( 'That did not match. Try again.', 'mr-abb' ); ?></p>
			<?php elseif ( 'empty' === $mrabb_login_state ) : ?>
				<p class="mrabb-login__error" role="alert"><?php esc_html_e( 'Please enter both your username and password.', 'mr-abb' ); ?></p>
			<?php endif; ?>
			<form name="loginform" id="loginform" action="<?php echo esc_url( site_url( 'wp-login.php', 'login_post' ) ); ?>" method="post" class="mrabb-login__form">
				<label class="mrabb-field">
					<span class="mrabb-field__label"><?php esc_html_e( 'Username or email', 'mr-abb' ); ?></span>
					<input type="text" name="log" class="mrabb-input" autocomplete="username" required autofocus />
				</label>
				<label class="mrabb-field">
					<span class="mrabb-field__label"><?php esc_html_e( 'Password', 'mr-abb' ); ?></span>
					<input type="password" name="pwd" class="mrabb-input" autocomplete="current-password" required />
				</label>
				<label class="mrabb-check">
					<input type="checkbox" name="rememberme" value="forever" />
					<span><?php esc_html_e( 'Keep me signed in', 'mr-abb' ); ?></span>
				</label>
				<input type="hidden" name="redirect_to" value="<?php echo esc_url( $mrabb_redirect ); ?>" />
				<input type="hidden" name="mrabb_login" value="1" />
				<button type="submit" class="mrabb-btn mrabb-btn--primary mrabb-btn--lg mrabb-btn--block"><?php esc_html_e( 'Sign in', 'mr-abb' ); ?></button>
			</form>
			<a class="mrabb-login__link" href="<?php echo esc_url( wp_lostpassword_url( home_url( '/' ) ) ); ?>"><?php esc_html_e( 'Forgot your password?', 'mr-abb' ); ?></a>
		<?php endif; ?>
	</div>
	<p class="mrabb-login__foot"><?php echo esc_html( mrabb_get_setting( 'owner_name', 'Abbas ElDeniney' ) ); ?></p>
</main>
<?php wp_footer(); ?>
</body>
</html>
