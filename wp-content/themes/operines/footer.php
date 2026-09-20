<?php
/**
 * Enterprise footer.
 *
 * @package Operines
 */

$contact   = operines_contact();
$solutions = operines_solutions();
?>
</main>

<footer class="site-footer">
	<div class="container">
		<div class="footer-top">
			<div class="footer-brand">
				<?php echo operines_logo( 'footer' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<p class="footer-tagline">Your business.<br>Operating intelligently.</p>
				<p class="footer-region"><?php echo operines_icon( 'globe', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?> <?php echo esc_html( $contact['location'] ); ?> &middot; Serving UAE &amp; GCC</p>
			</div>

			<nav class="footer-cols" aria-label="<?php esc_attr_e( 'Footer', 'operines' ); ?>">
				<div class="footer-col">
					<p class="footer-col-title">Solutions</p>
					<ul>
						<?php foreach ( $solutions as $slug => $s ) : ?>
							<li><a href="<?php echo esc_url( home_url( '/solutions/' . $slug . '/' ) ); ?>"><?php echo esc_html( $s['title'] ); ?></a></li>
						<?php endforeach; ?>
					</ul>
				</div>
				<div class="footer-col">
					<p class="footer-col-title">Company</p>
					<ul>
						<li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">About Operines</a></li>
						<li><a href="<?php echo esc_url( home_url( '/customer-stories/' ) ); ?>">Customer Stories</a></li>
						<li><a href="<?php echo esc_url( home_url( '/insights/' ) ); ?>">Insights</a></li>
						<li><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Contact</a></li>
						<li><a href="<?php echo esc_url( home_url( '/book-audit/' ) ); ?>">Book an Audit</a></li>
					</ul>
				</div>
				<div class="footer-col">
					<p class="footer-col-title">Explore</p>
					<ul>
						<li><a href="<?php echo esc_url( home_url( '/industries/' ) ); ?>">Industries</a></li>
						<li><a href="<?php echo esc_url( home_url( '/use-cases/' ) ); ?>">Use Cases</a></li>
						<li><a href="<?php echo esc_url( home_url( '/operines-ai/' ) ); ?>">Operines AI</a></li>
					</ul>
					<p class="footer-col-title footer-col-title--gap">Contact</p>
					<ul>
						<?php if ( $contact['email'] ) : ?>
							<li><a href="mailto:<?php echo esc_attr( $contact['email'] ); ?>"><?php echo esc_html( $contact['email'] ); ?></a></li>
						<?php endif; ?>
						<?php if ( $contact['whatsapp'] ) : ?>
							<li><a href="https://wa.me/<?php echo esc_attr( $contact['whatsapp'] ); ?>" rel="noopener">WhatsApp</a></li>
						<?php endif; ?>
						<?php if ( $contact['linkedin'] ) : ?>
							<li><a href="<?php echo esc_url( $contact['linkedin'] ); ?>" rel="noopener">LinkedIn</a></li>
						<?php endif; ?>
					</ul>
				</div>
			</nav>
		</div>

		<div class="footer-bottom">
			<p>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> Operines. All rights reserved.</p>
			<ul class="footer-legal">
				<li><a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy Policy</a></li>
				<li><a href="<?php echo esc_url( home_url( '/terms/' ) ); ?>">Terms</a></li>
			</ul>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
