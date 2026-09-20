<?php
/**
 * 404 template.
 *
 * @package MrAbb
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

get_header();
?>
<main id="mrabb-main" class="mrabb-main mrabb-main--content" tabindex="-1">
	<div class="mrabb-content">
		<?php
		mrabb_empty_state(
			__( 'That page does not exist.', 'mr-abb' ),
			__( 'Go back to the command center and just ask.', 'mr-abb' ),
			array(
				'label' => __( 'Back to Mr. Abb', 'mr-abb' ),
				'url'   => home_url( '/' ),
			)
		);
		?>
	</div>
</main>
<?php
get_footer();
