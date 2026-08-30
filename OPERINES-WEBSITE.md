# Operines Corporate Website — WordPress Theme

The new Operines website lives in this repository as a complete custom WordPress
theme: **`wp-content/themes/operines/`**. It is a classic (PHP-template) theme
with no build step, no plugin dependencies, self-hosted fonts, and a single
vanilla-JS file.

> The unrelated `index.html` expense calculator at the repository root is left
> untouched.

## Deploying to a WordPress install

1. Copy `wp-content/themes/operines/` into the site's `wp-content/themes/`.
2. Activate the **Operines** theme.
3. Run the seeder once (creates pages, sets front/posts pages, permalinks,
   tagline, legal placeholders, and the three initial Insights articles;
   idempotent — safe to re-run):

   ```bash
   wp eval-file wp-content/themes/operines/bin/seed.php
   ```

   Without WP-CLI: create the pages listed in `bin/seed.php` manually and set
   Settings → Reading to a static front page (`Home`) with posts page
   (`Insights`), permalinks to "Post name".

No other plugins are required. The theme was developed and tested against
WordPress 7.1 / PHP 8.4.

## Architecture

| Piece | Where |
| --- | --- |
| All structured content (solutions, industries, use cases, departments, integrations, FAQs, effect rows, contact details) | `inc/data.php` — single source of truth, everything filterable |
| SEO: meta description, canonical, OG/Twitter, JSON-LD (Organization, WebSite, Service, FAQPage, Article, BreadcrumbList) | `inc/seo.php` (disable via `operines_seo_enabled` filter if an SEO plugin is added) |
| Forms: contact + multi-step Automation Audit; nonce + honeypot + time-trap; stored privately as `operines_lead` posts + admin email | `inc/forms.php` — forward to a CRM/webhook via the `operines_lead_created` action |
| CPTs: `case_study` (public, at `/customer-stories/`), `operines_lead` (private) | `inc/cpt.php` |
| Design system (tokens, components, RTL-ready via logical properties) | `assets/css/main.css` |
| Behavior (nav, reveals, hero sequencer, explorer, filters, audit stepper) | `assets/js/main.js` |
| Page templates | `front-page.php`, `page-*.php`, `page-templates/solution.php`, `home.php`, `single.php`, `archive-case_study.php`, `404.php` |

Solution pages are one template driven by `operines_solutions()` — adding a
solution means adding an array entry and re-running the seeder.

## CONTENT REQUIRED FROM OWNER

The site never invents proof. These items are placeholder/flagged in code
(search for `TODO(owner)`):

1. **Logo** — done: the official Operines wordmark is integrated as a vector
   recreation (`assets/img/operines-logo.svg` + `operines-logo-light.svg` for
   dark surfaces, favicon from the "O"). If you have a master vector file
   (AI/SVG), you can drop it over these paths; the gradient used is
   `#5a1c72 → #4f1964 → #1a1220`.
2. **Contact details** — confirm email, add WhatsApp number, phone, office
   address, LinkedIn URL in `inc/data.php::operines_contact()`. WhatsApp CTAs
   appear automatically once the number is set.
3. **Customer stories** — publish `case_study` posts once clients approve
   (names, systems, verified results). The archive currently shows an honest
   "we publish only verified results" state.
4. **Operines AI** — real product screenshots (current visuals are labeled
   conceptual illustrations) and the live product URL
   (`operines_ai_product_url` filter in `page-operines-ai.php`).
5. **Team / About** — approved team photos and bios if wanted.
6. **Legal** — Privacy Policy and Terms are marked placeholders requiring
   legal review.
7. **Certifications / partnerships** — none are claimed; add only when
   verifiable.
8. **Analytics** — no tracker is installed (none existed). Add your chosen
   analytics; recommended events: primary CTA click, audit started/completed,
   contact submitted, WhatsApp click, Operines AI click.
9. **Verified metrics** — the "Operines Effect" rows are descriptive by
   design; swap in client-verified numbers when available.

## Local development (as done in this build)

WordPress 7.1 + the SQLite integration plugin runs the theme with zero
external services: install both, generate `wp-content/db.php` from the
plugin's `db.copy`, then `php -S 127.0.0.1:8080 router.php`.
