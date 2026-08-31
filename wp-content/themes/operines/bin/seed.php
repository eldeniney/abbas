<?php
/**
 * WP-CLI entry point for site provisioning:
 *
 *   wp eval-file wp-content/themes/operines/bin/seed.php
 *
 * The same provisioning runs automatically when the theme is activated.
 *
 * @package Operines
 */

defined( 'WP_CLI' ) || defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/../inc/seed-functions.php';
operines_seed_site();
echo "Operines seed complete.\n";
