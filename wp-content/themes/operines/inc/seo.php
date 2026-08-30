<?php
/**
 * SEO: meta descriptions, canonical, Open Graph / Twitter, JSON-LD.
 *
 * Kept deliberately lightweight; if an SEO plugin (Yoast/RankMath) is later
 * installed, disable this file's output via the operines_seo_enabled filter.
 *
 * @package Operines
 */

defined( 'ABSPATH' ) || exit;

/**
 * Per-page meta descriptions for the data-driven pages.
 */
function operines_meta_description(): string {
	$desc = get_bloginfo( 'description' );

	if ( is_front_page() ) {
		$desc = 'Operines is a UAE AI and business automation company. We connect your people, processes, data and software with AI agents and intelligent automation — one coordinated operation instead of disconnected tools.';
	} elseif ( is_singular() ) {
		$post = get_queried_object();
		if ( $post ) {
			$map = array(
				'solutions'        => 'AI agents, business process automation, CRM and ERP automation, data analytics and managed AI — the six ways Operines builds intelligence into UAE business operations.',
				'industries'       => 'How Operines automates real operations in UAE real estate, healthcare, retail, logistics, professional services, hospitality, finance and education.',
				'use-cases'        => 'A library of concrete automations Operines builds: AI lead qualification, WhatsApp agents, invoice processing, onboarding, executive reporting and more.',
				'customer-stories' => 'Verified Operines customer stories: the process before, what we built, the systems connected, and the result. We publish only verified results.',
				'operines-ai'      => 'Operines AI is our own SaaS platform for AI-powered business communication — WhatsApp-first customer conversations, CRM, knowledge and automation, in Arabic and English.',
				'about'            => 'Operines exists so businesses can run intelligently. Who we are, what we believe about automation, and how we work with UAE companies.',
				'contact'          => 'Talk to Operines about AI and automation for your business — by form, email or WhatsApp. Based in the UAE.',
				'book-audit'       => 'Book an AI Automation Audit: a structured review of your operation that produces a ranked map of what your business should automate first.',
				'insights'         => 'Practical writing from Operines on AI agents, automation, CRM, ERP and data for UAE businesses.',
			);
			$slug = $post->post_name ?? '';
			if ( isset( $map[ $slug ] ) ) {
				$desc = $map[ $slug ];
			} elseif ( has_excerpt( $post ) ) {
				$desc = wp_strip_all_tags( get_the_excerpt( $post ) );
			} elseif ( is_page() && 'solution' === get_page_template_slug( $post ) ) {
				$solutions = operines_solutions();
				if ( isset( $solutions[ $slug ] ) ) {
					$desc = $solutions[ $slug ]['outcome'] . ' ' . $solutions[ $slug ]['nav_desc'] . ' — by Operines, UAE.';
				}
			}
		}
	} elseif ( is_home() ) {
		$desc = 'Practical writing from Operines on AI agents, automation, CRM, ERP and data for UAE businesses.';
	}

	return apply_filters( 'operines_meta_description', trim( (string) $desc ) );
}

add_action(
	'wp_head',
	function () {
		if ( ! apply_filters( 'operines_seo_enabled', true ) ) {
			return;
		}

		$desc  = operines_meta_description();
		$url   = home_url( add_query_arg( array(), $GLOBALS['wp']->request ? '/' . $GLOBALS['wp']->request . '/' : '/' ) );
		$title = wp_get_document_title();
		$image = OPERINES_URI . '/assets/img/og-default.png';

		if ( is_singular() && has_post_thumbnail() ) {
			$thumb = get_the_post_thumbnail_url( null, 'operines-wide' );
			if ( $thumb ) {
				$image = $thumb;
			}
		}

		echo "\n<!-- Operines SEO -->\n";
		if ( $desc ) {
			printf( '<meta name="description" content="%s">' . "\n", esc_attr( $desc ) );
		}
		printf( '<link rel="canonical" href="%s">' . "\n", esc_url( $url ) );
		printf( '<meta property="og:site_name" content="Operines">' . "\n" );
		printf( '<meta property="og:type" content="%s">' . "\n", is_singular( 'post' ) ? 'article' : 'website' );
		printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( $title ) );
		if ( $desc ) {
			printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( $desc ) );
		}
		printf( '<meta property="og:url" content="%s">' . "\n", esc_url( $url ) );
		printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $image ) );
		printf( '<meta name="twitter:card" content="summary_large_image">' . "\n" );
		printf( '<meta name="twitter:title" content="%s">' . "\n", esc_attr( $title ) );
		if ( $desc ) {
			printf( '<meta name="twitter:description" content="%s">' . "\n", esc_attr( $desc ) );
		}
		printf( '<meta name="twitter:image" content="%s">' . "\n", esc_url( $image ) );

		operines_print_schema();
	},
	5
);

/**
 * JSON-LD structured data.
 */
function operines_print_schema(): void {
	$graph = array();

	$org_id = home_url( '/#organization' );
	$graph[] = array(
		'@type'       => 'Organization',
		'@id'         => $org_id,
		'name'        => 'Operines',
		'url'         => home_url( '/' ),
		'logo'        => OPERINES_URI . '/assets/img/operines-logo.svg',
		'description' => 'UAE AI and business automation company: AI agents, business process automation, CRM and ERP automation, data analytics and managed AI.',
		'areaServed'  => array( 'AE', 'SA', 'GCC' ),
		'slogan'      => 'Your business. Operating intelligently.',
	);

	$graph[] = array(
		'@type'    => 'WebSite',
		'@id'      => home_url( '/#website' ),
		'url'      => home_url( '/' ),
		'name'     => 'Operines',
		'publisher' => array( '@id' => $org_id ),
	);

	if ( is_page() ) {
		$slug      = get_queried_object()->post_name ?? '';
		$solutions = operines_solutions();
		if ( isset( $solutions[ $slug ] ) ) {
			$graph[] = array(
				'@type'       => 'Service',
				'name'        => $solutions[ $slug ]['title'],
				'description' => $solutions[ $slug ]['outcome'],
				'provider'    => array( '@id' => $org_id ),
				'areaServed'  => 'AE',
				'url'         => get_permalink(),
			);
			$graph[] = operines_faq_schema( $solutions[ $slug ]['faqs'] );
		}
		if ( in_array( $slug, array( 'book-audit', 'use-cases' ), true ) ) {
			$graph[] = operines_faq_schema( array_slice( operines_global_faqs(), 0, 5 ) );
		}
	}

	if ( is_singular( 'post' ) ) {
		$graph[] = array(
			'@type'         => 'Article',
			'headline'      => get_the_title(),
			'datePublished' => get_the_date( 'c' ),
			'dateModified'  => get_the_modified_date( 'c' ),
			'author'        => array( '@type' => 'Organization', 'name' => 'Operines' ),
			'publisher'     => array( '@id' => $org_id ),
			'mainEntityOfPage' => get_permalink(),
		);
	}

	// Breadcrumbs for anything below the front page.
	if ( ! is_front_page() ) {
		$items = array(
			array(
				'@type'    => 'ListItem',
				'position' => 1,
				'name'     => 'Home',
				'item'     => home_url( '/' ),
			),
		);
		if ( is_page() && get_queried_object() ) {
			$p        = get_queried_object();
			$position = 2;
			if ( $p->post_parent ) {
				$parent  = get_post( $p->post_parent );
				$items[] = array(
					'@type'    => 'ListItem',
					'position' => $position++,
					'name'     => get_the_title( $parent ),
					'item'     => get_permalink( $parent ),
				);
			}
			$items[] = array(
				'@type'    => 'ListItem',
				'position' => $position,
				'name'     => get_the_title( $p ),
				'item'     => get_permalink( $p ),
			);
		} elseif ( is_singular( 'post' ) ) {
			$items[] = array( '@type' => 'ListItem', 'position' => 2, 'name' => 'Insights', 'item' => home_url( '/insights/' ) );
			$items[] = array( '@type' => 'ListItem', 'position' => 3, 'name' => get_the_title(), 'item' => get_permalink() );
		}
		$graph[] = array(
			'@type'           => 'BreadcrumbList',
			'itemListElement' => $items,
		);
	}

	$schema = array(
		'@context' => 'https://schema.org',
		'@graph'   => array_values( array_filter( $graph ) ),
	);
	echo '<script type="application/ld+json">' . wp_json_encode( $schema, JSON_UNESCAPED_SLASHES ) . '</script>' . "\n";
}

/**
 * Build FAQPage schema from [question, answer] pairs.
 */
function operines_faq_schema( array $faqs ): array {
	$main = array();
	foreach ( $faqs as $faq ) {
		$main[] = array(
			'@type'          => 'Question',
			'name'           => $faq[0],
			'acceptedAnswer' => array(
				'@type' => 'Answer',
				'text'  => $faq[1],
			),
		);
	}
	return array(
		'@type'      => 'FAQPage',
		'mainEntity' => $main,
	);
}
