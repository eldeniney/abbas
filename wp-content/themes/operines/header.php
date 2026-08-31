<?php
/**
 * Site header: compact sticky nav with Solutions mega-panel.
 *
 * @package Operines
 */

$nav = operines_nav();
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#4f1964">
	<link rel="icon" href="<?php echo esc_url( OPERINES_URI . '/assets/img/favicon.svg' ); ?>" type="image/svg+xml">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main"><?php esc_html_e( 'Skip to content', 'operines' ); ?></a>

<div class="announce">
	<div class="container announce-inner">
		<p>AI &amp; automation for UAE business — Arabic &amp; English, WhatsApp-first.</p>
		<a href="<?php echo esc_url( home_url( '/book-audit/' ) ); ?>">Book an AI Automation Audit<?php echo operines_icon( 'arrow-right', 13 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
	</div>
</div>

<header class="site-header" id="site-header">
	<div class="container header-inner">
		<?php echo operines_logo(); // phpcs:ignore WordPress.Security.EscapeOutput ?>

		<nav class="primary-nav" id="primary-nav" aria-label="<?php esc_attr_e( 'Primary', 'operines' ); ?>">
			<ul class="nav-list">
				<li class="nav-item has-panel">
					<button class="nav-link nav-trigger" type="button" aria-expanded="false" aria-controls="solutions-panel">
						Solutions
						<svg class="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
					</button>
					<div class="nav-panel" id="solutions-panel">
						<div class="nav-panel-grid">
							<?php foreach ( $nav['solutions'] as $item ) : ?>
								<a class="nav-panel-item" href="<?php echo esc_url( $item['url'] ); ?>">
									<span class="nav-panel-title"><?php echo esc_html( $item['title'] ); ?></span>
									<span class="nav-panel-desc"><?php echo esc_html( $item['desc'] ); ?></span>
								</a>
							<?php endforeach; ?>
						</div>
						<div class="nav-panel-foot">
							<a class="textlink" href="<?php echo esc_url( home_url( '/solutions/' ) ); ?>"><span>All solutions</span><?php echo operines_icon( 'arrow-right', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
							<a class="textlink" href="<?php echo esc_url( home_url( '/customer-stories/' ) ); ?>"><span>Customer stories</span><?php echo operines_icon( 'arrow-right', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
						</div>
					</div>
				</li>
				<?php foreach ( $nav['links'] as $link ) : ?>
					<li class="nav-item"><a class="nav-link" href="<?php echo esc_url( $link[1] ); ?>"><?php echo esc_html( $link[0] ); ?></a></li>
				<?php endforeach; ?>
			</ul>
		</nav>

		<div class="header-actions">
			<a class="btn btn--primary btn--sm header-cta" href="<?php echo esc_url( $nav['cta'][1] ); ?>"><span><?php echo esc_html( $nav['cta'][0] ); ?></span></a>
			<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="<?php esc_attr_e( 'Open menu', 'operines' ); ?>">
				<?php echo operines_icon( 'menu', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
				<?php echo operines_icon( 'close', 22 ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
			</button>
		</div>
	</div>

	<div class="mobile-nav" id="mobile-nav" hidden>
		<nav aria-label="<?php esc_attr_e( 'Mobile', 'operines' ); ?>">
			<p class="mobile-nav-group">Solutions</p>
			<ul class="mobile-nav-list">
				<?php foreach ( $nav['solutions'] as $item ) : ?>
					<li><a href="<?php echo esc_url( $item['url'] ); ?>"><?php echo esc_html( $item['title'] ); ?></a></li>
				<?php endforeach; ?>
			</ul>
			<ul class="mobile-nav-list mobile-nav-list--main">
				<?php foreach ( $nav['links'] as $link ) : ?>
					<li><a href="<?php echo esc_url( $link[1] ); ?>"><?php echo esc_html( $link[0] ); ?></a></li>
				<?php endforeach; ?>
				<li><a href="<?php echo esc_url( home_url( '/customer-stories/' ) ); ?>">Customer Stories</a></li>
				<li><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Contact</a></li>
			</ul>
			<a class="btn btn--primary mobile-nav-cta" href="<?php echo esc_url( $nav['cta'][1] ); ?>"><span><?php echo esc_html( $nav['cta'][0] ); ?></span><?php echo operines_icon( 'arrow-right', 17 ); // phpcs:ignore WordPress.Security.EscapeOutput ?></a>
		</nav>
	</div>
</header>

<main id="main">
