<?php
/**
 * Standalone Arabic survey (Beheira shopping & delivery needs).
 *
 * Responses are stored as a private CPT (`op_survey_response`) with one
 * meta entry per answer, browsable in wp-admin under "Survey Data" and
 * exportable as a UTF-8 CSV (Excel-safe BOM) with one column per question.
 * The landing page itself is a standalone template (page-templates/survey.php)
 * that never mentions any brand and is excluded from sitemap/search.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

const OP_SURVEY_CPT = 'op_survey_response';

/**
 * Question map: field key => [CSV column, Arabic label, is_multi].
 * Order defines the CSV column order.
 */
function op_survey_fields(): array {
	return array(
		'name'                 => array( 'Name', 'الاسم', false ),
		'mobile'               => array( 'Mobile', 'رقم الموبايل', false ),
		'email'                => array( 'Email', 'البريد الإلكتروني', false ),
		'consent'              => array( 'Consent', 'الموافقة', false ),
		'city'                 => array( 'City', 'المركز / المدينة', false ),
		'area'                 => array( 'Area', 'القرية / العزبة / الحي', false ),
		'landmark'             => array( 'Landmark', 'أقرب مكان معروف', false ),
		'last7'                => array( 'Purchases last 7 days', 'مشتريات آخر 7 أيام', true ),
		'source'               => array( 'Last purchase source', 'آخر مصدر شراء', false ),
		'travel_time'          => array( 'Travel time', 'وقت الرحلة للمحل/السوق', false ),
		'delivery30'           => array( 'Deliveries last 30 days', 'مرات التوصيل آخر 30 يوم', false ),
		'delivery_channel'     => array( 'Last delivery channel', 'قناة آخر توصيل', false ),
		'actual_fee'           => array( 'Last delivery fee (EGP)', 'رسوم آخر توصيل', false ),
		'actual_delivery_time' => array( 'Last delivery duration', 'مدة وصول آخر طلب', false ),
		'couldnt_find'         => array( 'Could not find product', 'منتج لم يجده', false ),
		'missing_product'      => array( 'Missing product', 'المنتج الناقص', false ),
		'missing_action'       => array( 'Action taken', 'التصرف وقتها', false ),
		'pain'                 => array( 'Top pains (max 3)', 'أكبر المشاكل', true ),
		'main_value'           => array( 'Main value', 'أهم قيمة', false ),
		'max_fee'              => array( 'Max acceptable fee', 'أقصى رسوم توصيل مقبولة', false ),
		'payments'             => array( 'Payment methods', 'طرق الدفع', true ),
		'stores'               => array( 'Frequent stores', 'محلات يشتري منها', false ),
		'one_change'           => array( 'One change wished', 'حاجة واحدة يغيّرها', false ),
	);
}

/* -------------------------------------------------- CPT */

add_action(
	'init',
	function () {
		register_post_type(
			OP_SURVEY_CPT,
			array(
				'labels'          => array(
					'name'          => 'Survey Data',
					'singular_name' => 'Survey Response',
					'menu_name'     => 'Survey Data',
					'all_items'     => 'Responses',
					'edit_item'     => 'Survey Response',
					'search_items'  => 'Search responses',
				),
				'public'          => false,
				'show_ui'         => true,
				'show_in_rest'    => false,
				'menu_icon'       => 'dashicons-clipboard',
				'menu_position'   => 27,
				'supports'        => array( 'title' ),
				'capability_type' => 'post',
				'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
				'map_meta_cap'    => true,
			)
		);
	}
);

/* -------------------------------------------------- Submission (AJAX) */

add_action( 'admin_post_nopriv_op_survey_submit', 'op_survey_handle_submit' );
add_action( 'admin_post_op_survey_submit', 'op_survey_handle_submit' );

/**
 * Validate, store, and return the promo code as JSON.
 */
function op_survey_handle_submit(): void {
	if ( ! operines_form_guard( 'op_survey_submit' ) ) {
		wp_send_json_error( array( 'message' => 'انتهت صلاحية الجلسة — حدّث الصفحة وجرّب تاني.' ), 403 );
	}

	// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified in the guard above.
	$mobile = preg_replace( '/\D/', '', (string) wp_unslash( $_POST['mobile'] ?? '' ) );
	if ( str_starts_with( $mobile, '0020' ) ) {
		$mobile = '0' . substr( $mobile, 4 );
	} elseif ( str_starts_with( $mobile, '20' ) && 12 === strlen( $mobile ) ) {
		$mobile = '0' . substr( $mobile, 2 );
	}

	$name    = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$consent = sanitize_text_field( wp_unslash( $_POST['consent'] ?? '' ) );
	$city    = sanitize_text_field( wp_unslash( $_POST['city'] ?? '' ) );
	$area    = sanitize_text_field( wp_unslash( $_POST['area'] ?? '' ) );

	if ( '' === $name || 'yes' !== $consent || '' === $city || '' === $area ) {
		wp_send_json_error( array( 'message' => 'في بيانات مطلوبة ناقصة — ارجع خطوة وكمّلها.' ), 400 );
	}
	if ( ! preg_match( '/^01[0-9]{9}$/', $mobile ) ) {
		wp_send_json_error( array( 'message' => 'رقم الموبايل مش صحيح — لازم يبدأ بـ 01 ويكون 11 رقم.' ), 400 );
	}

	$code = 'BHR75-' . substr( $mobile, -4 );

	// Same mobile already answered → return the same code, don't duplicate.
	$existing = get_posts(
		array(
			'post_type'   => OP_SURVEY_CPT,
			'post_status' => 'private',
			'numberposts' => 1,
			'fields'      => 'ids',
			'meta_query'  => array( // phpcs:ignore WordPress.DB.SlowDBQuery
				array(
					'key'   => '_op_survey_mobile',
					'value' => $mobile,
				),
			),
		)
	);
	if ( $existing ) {
		wp_send_json_success(
			array(
				'code'      => (string) get_post_meta( $existing[0], '_op_survey_code', true ) ?: $code,
				'duplicate' => true,
			)
		);
	}

	$meta    = array(
		'_op_survey_code'   => $code,
		'_op_survey_mobile' => $mobile,
	);
	$summary = '';
	foreach ( op_survey_fields() as $key => $def ) {
		list( , $label, $multi ) = $def;
		if ( 'mobile' === $key ) {
			$value = $mobile;
		} elseif ( $multi ) {
			$raw   = isset( $_POST[ $key ] ) ? (array) wp_unslash( $_POST[ $key ] ) : array();
			$value = implode( '، ', array_filter( array_map( 'sanitize_text_field', $raw ) ) );
		} elseif ( in_array( $key, array( 'stores', 'one_change' ), true ) ) {
			$value = sanitize_textarea_field( wp_unslash( $_POST[ $key ] ?? '' ) );
		} else {
			$value = sanitize_text_field( wp_unslash( $_POST[ $key ] ?? '' ) );
		}
		$meta[ '_op_survey_' . $key ] = $value;
		if ( '' !== $value ) {
			$summary .= $label . ': ' . $value . "\n";
		}
	}
	// phpcs:enable WordPress.Security.NonceVerification.Missing

	$post_id = wp_insert_post(
		array(
			'post_type'    => OP_SURVEY_CPT,
			'post_status'  => 'private',
			'post_title'   => sprintf( '%s — %s (%s)', $name, $mobile, $city ),
			'post_content' => $summary,
			'meta_input'   => $meta,
		),
		true
	);
	if ( is_wp_error( $post_id ) ) {
		wp_send_json_error( array( 'message' => 'حصلت مشكلة في الحفظ — جرّب تاني.' ), 500 );
	}

	/**
	 * Fires after a survey response is stored (webhook / sheet sync point).
	 *
	 * @param int    $post_id Response post ID.
	 * @param string $code    Promo code issued.
	 */
	do_action( 'op_survey_response_created', $post_id, $code );

	wp_send_json_success( array( 'code' => $code ) );
}

/* -------------------------------------------------- Admin list table */

add_filter(
	'manage_' . OP_SURVEY_CPT . '_posts_columns',
	function ( $columns ) {
		return array(
			'cb'          => $columns['cb'],
			'title'       => 'Respondent',
			'sv_mobile'   => 'Mobile',
			'sv_city'     => 'City',
			'sv_area'     => 'Area',
			'sv_delivery' => 'Deliveries/30d',
			'sv_code'     => 'Promo code',
			'date'        => 'Received',
		);
	}
);

add_action(
	'manage_' . OP_SURVEY_CPT . '_posts_custom_column',
	function ( $column, $post_id ) {
		$map = array(
			'sv_mobile'   => '_op_survey_mobile',
			'sv_city'     => '_op_survey_city',
			'sv_area'     => '_op_survey_area',
			'sv_delivery' => '_op_survey_delivery30',
		);
		if ( isset( $map[ $column ] ) ) {
			echo esc_html( (string) get_post_meta( $post_id, $map[ $column ], true ) );
		} elseif ( 'sv_code' === $column ) {
			echo '<code>' . esc_html( (string) get_post_meta( $post_id, '_op_survey_code', true ) ) . '</code>';
		}
	},
	10,
	2
);

// City filter dropdown on the list table.
add_action(
	'restrict_manage_posts',
	function ( $post_type ) {
		if ( OP_SURVEY_CPT !== $post_type ) {
			return;
		}
		$selected = isset( $_GET['sv_city'] ) ? sanitize_text_field( wp_unslash( $_GET['sv_city'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		global $wpdb;
		$cities = $wpdb->get_col( $wpdb->prepare( "SELECT DISTINCT meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s AND meta_value != '' ORDER BY meta_value", '_op_survey_city' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
		echo '<select name="sv_city"><option value="">All cities</option>';
		foreach ( $cities as $city ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $city ), selected( $selected, $city, false ), esc_html( $city ) );
		}
		echo '</select>';
	}
);

add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( ! is_admin() || ! $query->is_main_query() || OP_SURVEY_CPT !== $query->get( 'post_type' ) ) {
			return;
		}
		$city = isset( $_GET['sv_city'] ) ? sanitize_text_field( wp_unslash( $_GET['sv_city'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( $city ) {
			$query->set(
				'meta_query',
				array(
					array(
						'key'   => '_op_survey_city',
						'value' => $city,
					),
				)
			);
		}
	}
);

// "Export CSV" button beside the filters.
add_action(
	'manage_posts_extra_tablenav',
	function ( $which ) {
		if ( 'top' !== $which ) {
			return;
		}
		$screen = get_current_screen();
		if ( ! $screen || 'edit-' . OP_SURVEY_CPT !== $screen->id ) {
			return;
		}
		$url = wp_nonce_url( admin_url( 'admin-post.php?action=op_survey_export' ), 'op_survey_export' );
		printf( '<div class="alignleft actions"><a href="%s" class="button button-primary">⬇ Export CSV (Excel)</a></div>', esc_url( $url ) );
	}
);

/* -------------------------------------------------- Response detail metabox */

add_action(
	'add_meta_boxes_' . OP_SURVEY_CPT,
	function () {
		add_meta_box(
			'op-survey-detail',
			'Survey answers',
			function ( $post ) {
				echo '<table class="widefat striped" style="max-width:760px">';
				printf(
					'<tr><td style="width:260px"><strong>Promo code</strong></td><td><code>%s</code></td></tr>',
					esc_html( (string) get_post_meta( $post->ID, '_op_survey_code', true ) )
				);
				foreach ( op_survey_fields() as $key => $def ) {
					$value = (string) get_post_meta( $post->ID, '_op_survey_' . $key, true );
					printf(
						'<tr><td><strong>%s</strong><br><span style="color:#777">%s</span></td><td>%s</td></tr>',
						esc_html( $def[0] ),
						esc_html( $def[1] ),
						esc_html( '' !== $value ? $value : '—' )
					);
				}
				echo '</table>';
			},
			OP_SURVEY_CPT,
			'normal',
			'high'
		);
	}
);

/* -------------------------------------------------- CSV export */

add_action( 'admin_post_op_survey_export', 'op_survey_export_csv' );

/**
 * Stream every response as a UTF-8 CSV with a BOM so Arabic opens
 * correctly in Excel. One row per response, one column per question.
 */
function op_survey_export_csv(): void {
	if ( ! current_user_can( 'edit_others_posts' ) ) {
		wp_die( 'Not allowed.' );
	}
	check_admin_referer( 'op_survey_export' );

	$posts = get_posts(
		array(
			'post_type'   => OP_SURVEY_CPT,
			'post_status' => array( 'private', 'publish', 'draft' ),
			'numberposts' => -1,
			'orderby'     => 'date',
			'order'       => 'ASC',
		)
	);

	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename=survey-responses-' . gmdate( 'Ymd-Hi' ) . '.csv' );

	$out = fopen( 'php://output', 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	fwrite( $out, "\xEF\xBB\xBF" ); // phpcs:ignore WordPress.WP.AlternativeFunctions -- BOM for Excel.

	$fields = op_survey_fields();
	$header = array( 'ID', 'Submitted (UTC)' );
	foreach ( $fields as $def ) {
		$header[] = $def[0] . ' / ' . $def[1];
	}
	$header[] = 'Promo code';
	fputcsv( $out, $header );

	foreach ( $posts as $post ) {
		$row = array( $post->ID, get_post_time( 'Y-m-d H:i', true, $post ) );
		foreach ( $fields as $key => $def ) {
			$row[] = (string) get_post_meta( $post->ID, '_op_survey_' . $key, true );
		}
		$row[] = (string) get_post_meta( $post->ID, '_op_survey_code', true );
		fputcsv( $out, $row );
	}
	fclose( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	exit;
}

/* -------------------------------------------------- Keep the page unlisted */

// Out of the XML sitemap.
add_filter(
	'wp_sitemaps_posts_query_args',
	function ( $args, $post_type ) {
		if ( 'page' === $post_type ) {
			$survey = get_page_by_path( 'survey' );
			if ( $survey ) {
				$args['post__not_in']   = isset( $args['post__not_in'] ) ? (array) $args['post__not_in'] : array();
				$args['post__not_in'][] = $survey->ID;
			}
		}
		return $args;
	},
	10,
	2
);

// Out of front-end search results.
add_action(
	'pre_get_posts',
	function ( $query ) {
		if ( is_admin() || ! $query->is_main_query() || ! $query->is_search() ) {
			return;
		}
		$survey = get_page_by_path( 'survey' );
		if ( $survey ) {
			$not   = (array) $query->get( 'post__not_in' );
			$not[] = $survey->ID;
			$query->set( 'post__not_in', $not );
		}
	}
);
