<?php
/**
 * Custom post types.
 *
 * - case_study: public customer stories (published only when verified content exists).
 * - operines_lead: private storage for audit/contact submissions.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	function () {
		register_post_type(
			'case_study',
			array(
				'labels'       => array(
					'name'          => __( 'Customer Stories', 'operines' ),
					'singular_name' => __( 'Customer Story', 'operines' ),
				),
				'public'       => true,
				'has_archive'  => 'customer-stories',
				'rewrite'      => array( 'slug' => 'customer-stories', 'with_front' => false ),
				'menu_icon'    => 'dashicons-awards',
				'supports'     => array( 'title', 'editor', 'excerpt', 'thumbnail', 'custom-fields' ),
				'show_in_rest' => true,
			)
		);

		register_post_type(
			'operines_lead',
			array(
				'labels'          => array(
					'name'          => __( 'Leads', 'operines' ),
					'singular_name' => __( 'Lead', 'operines' ),
				),
				'public'          => false,
				'show_ui'         => true,
				'menu_icon'       => 'dashicons-email-alt',
				'supports'        => array( 'title', 'editor', 'custom-fields' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
			)
		);
	}
);
