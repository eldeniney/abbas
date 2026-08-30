<?php
/**
 * Reusable template components.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

/**
 * Inline SVG icon set — one coherent 24px stroke family.
 */
function operines_icon( string $name, int $size = 20 ): string {
	$paths = array(
		'arrow-right' => '<path d="M4 12h15m0 0-6-6m6 6-6 6"/>',
		'arrow-down'  => '<path d="M12 4v15m0 0 6-6m-6 6-6-6"/>',
		'check'       => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
		'whatsapp'    => '<path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"/><path d="M9 8.5c0 4 2.5 6.5 6.5 6.5l.9-1.8-2.2-1.1-1 .9c-1.1-.5-1.9-1.3-2.4-2.4l.9-1-1-2.2Z"/>',
		'mail'        => '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7.5 7.5 6 7.5-6"/>',
		'phone'       => '<path d="M6 3.5h3l1.5 4L8.6 9.4a12 12 0 0 0 6 6l1.9-1.9 4 1.5v3a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4 6a2 2 0 0 1 2-2.5Z"/>',
		'shield'      => '<path d="M12 3.5 5 6v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
		'clock'       => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.5"/>',
		'chart'       => '<path d="M4 20h16M7 16.5v-5m5 5v-9m5 9v-3"/>',
		'doc'         => '<path d="M7 3.5h7l4 4v13H7Z"/><path d="M13.5 3.5v4.5H18M10 13h5m-5 3.5h5"/>',
		'spark'       => '<path d="M12 3.5c.7 4.5 3 6.8 7.5 7.5-4.5.7-6.8 3-7.5 7.5-.7-4.5-3-6.8-7.5-7.5 4.5-.7 6.8-3 7.5-7.5Z"/>',
		'menu'        => '<path d="M4 7h16M4 12h16M4 17h16"/>',
		'close'       => '<path d="m6 6 12 12M18 6 6 18"/>',
		'globe'       => '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-4.7 4.8-4.7 12.2 0 17 4.7-4.8 4.7-12.2 0-17Z"/>',
		'nodes'       => '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M8 7.2 10.5 16M16 7.2 13.5 16M8.2 6h7.6"/>',
		'person'      => '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
	);
	if ( ! isset( $paths[ $name ] ) ) {
		return '';
	}
	return sprintf(
		'<svg class="icon icon-%s" width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%s</svg>',
		esc_attr( $name ),
		$size,
		$size,
		$paths[ $name ] // Static trusted markup.
	);
}

/**
 * Brand lockup: the official Operines wordmark (vector recreation of the
 * brand logo; gradient version on light surfaces, light version on dark).
 */
function operines_logo( string $context = 'header' ): string {
	$light = in_array( $context, array( 'footer', 'dark' ), true );
	$file  = $light ? 'operines-logo-light.svg' : 'operines-logo.svg';
	// Intrinsic ratio 4652:1107 — width/height attributes prevent layout shift.
	return sprintf(
		'<a class="brand brand--%s" href="%s"><img class="brand-logo" src="%s" alt="Operines — home" width="126" height="30"></a>',
		esc_attr( $context ),
		esc_url( home_url( '/' ) ),
		esc_url( OPERINES_URI . '/assets/img/' . $file )
	);
}

/**
 * Section eyebrow / overline.
 */
function operines_eyebrow( string $text, string $tag = 'p' ): void {
	printf( '<%1$s class="eyebrow">%2$s</%1$s>', esc_attr( $tag ), esc_html( $text ) );
}

/**
 * Button.
 *
 * @param string $style primary|ghost|light|link
 */
function operines_button( string $text, string $url, string $style = 'primary', bool $arrow = true ): void {
	printf(
		'<a class="btn btn--%s" href="%s"><span>%s</span>%s</a>',
		esc_attr( $style ),
		esc_url( $url ),
		esc_html( $text ),
		$arrow ? operines_icon( 'arrow-right', 17 ) : ''
	);
}

/**
 * Process flow: an ordered chain of steps with connectors.
 *
 * @param string $variant rail (vertical) | chain (wrapping inline)
 */
function operines_flow( array $steps, string $variant = 'chain', string $label = '' ): void {
	printf( '<div class="flow flow--%s" data-reveal="flow">', esc_attr( $variant ) );
	if ( $label ) {
		printf( '<p class="flow-label">%s</p>', esc_html( $label ) );
	}
	echo '<ol class="flow-steps">';
	foreach ( $steps as $i => $step ) {
		printf(
			'<li class="flow-step" style="--i:%d"><span class="flow-dot" aria-hidden="true"></span><span class="flow-text">%s</span></li>',
			(int) $i,
			esc_html( $step )
		);
	}
	echo '</ol></div>';
}

/**
 * FAQ list using native <details>.
 */
function operines_faq_list( array $faqs, string $heading = '' ): void {
	echo '<div class="faq">';
	if ( $heading ) {
		printf( '<h2 class="faq-heading">%s</h2>', esc_html( $heading ) );
	}
	foreach ( $faqs as $faq ) {
		printf(
			'<details class="faq-item"><summary><span>%s</span><span class="faq-marker" aria-hidden="true"></span></summary><div class="faq-answer"><p>%s</p></div></details>',
			esc_html( $faq[0] ),
			esc_html( $faq[1] )
		);
	}
	echo '</div>';
}

/**
 * The recurring final CTA band.
 */
function operines_cta_band(): void {
	?>
	<section class="cta-band" aria-labelledby="cta-band-title">
		<div class="container cta-band-inner">
			<div class="cta-band-copy">
				<?php operines_eyebrow( 'The next step' ); ?>
				<h2 id="cta-band-title">There is probably a process in your business<br class="br-wide">that should already be automated.</h2>
				<p>Let us find it. The AI Automation Audit maps how work moves through your company and returns a ranked list of what to automate first — and what to leave alone.</p>
				<div class="btn-row">
					<?php operines_button( 'Book your AI Automation Audit', home_url( '/book-audit/' ), 'light' ); ?>
					<?php operines_button( 'Talk to Operines', home_url( '/contact/' ), 'ghost-light' ); ?>
				</div>
			</div>
			<div class="cta-band-visual" aria-hidden="true">
				<div class="ledger ledger--dark">
					<?php foreach ( array_slice( operines_ledger(), 0, 5 ) as $row ) : ?>
						<div class="ledger-row"><span class="ledger-time"><?php echo esc_html( $row[0] ); ?></span><span class="ledger-event"><?php echo esc_html( $row[1] ); ?></span></div>
					<?php endforeach; ?>
					<p class="ledger-note">Illustrative sequence</p>
				</div>
			</div>
		</div>
	</section>
	<?php
}

/**
 * Inner-page hero.
 */
function operines_page_hero( string $eyebrow, string $title, string $lede = '', string $extra_class = '' ): void {
	?>
	<header class="page-hero <?php echo esc_attr( $extra_class ); ?>">
		<div class="container">
			<?php operines_eyebrow( $eyebrow ); ?>
			<h1><?php echo wp_kses( $title, array( 'br' => array( 'class' => array() ), 'em' => array() ) ); ?></h1>
			<?php if ( $lede ) : ?>
				<p class="lede"><?php echo esc_html( $lede ); ?></p>
			<?php endif; ?>
		</div>
	</header>
	<?php
}

/**
 * Contextual link ("microcopy" style).
 */
function operines_textlink( string $text, string $url ): void {
	printf(
		'<a class="textlink" href="%s"><span>%s</span>%s</a>',
		esc_url( $url ),
		esc_html( $text ),
		operines_icon( 'arrow-right', 15 )
	);
}
