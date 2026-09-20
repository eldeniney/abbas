# Mr. Abb — AI Voice Command Center (WordPress theme)

**One person. One AI. All tools.**

Mr. Abb is a custom WordPress theme that turns eldeniney.me into a private, voice-first AI command center for Abbas ElDeniney. WordPress is the *interface*; the AI orchestration, credentials and tool integrations live in a separate secure backend.

```
USER → WORDPRESS VOICE UI → ELEVENLABS VOICE SESSION → MR ABB AI → SECURE TOOL GATEWAY → CONNECTED SYSTEMS
```

## What is in the box

| Area | Files |
| --- | --- |
| Theme foundation | `style.css`, `functions.php`, `header.php`, `footer.php`, `index.php`, `page.php`, `404.php`, `front-page.php` |
| App views | `templates/dashboard.php` (home), `history.php`, `tasks.php`, `connections.php`, `automations.php`, `login.php` |
| Shell parts | `template-parts/sidebar.php`, `topbar.php`, `context-panel.php`, `mobile-nav.php`, `orb.php`, `overlays.php` |
| PHP modules | `inc/setup.php` (assets, config, routing), `settings.php`, `security.php`, `api.php` (gateway dispatcher), `rest-routes.php`, `admin.php`, `admin-connections.php`, `pages.php`, `logs.php`, `i18n.php`, `helpers.php` |
| Built-in gateway | `inc/gateway/class-secrets.php` (encrypted keys), `class-store.php` (sessions, events, approvals, tasks), `class-tools.php` (registry + approval gate), `tools-builtin.php`, `class-google.php`, `class-elevenlabs.php`, `class-brain.php` (Claude), `class-connectors.php` (webhooks), `class-local-gateway.php`, `hooks.php` (inbound webhooks, OAuth callback), `class-cron.php` (automations) |
| Design system | `assets/css/app.css` (tokens + layout), `components.css`, `animations.css`, `responsive.css`, `admin.css` |
| JavaScript | `assets/js/core.js` (bus, store, models, event ingestion), `i18n.js`, `api.js`, `ui.js`, `cards.js`, `voice-agent.js` (ElevenLabs adapter), `mock-agent.js`, `mock-data.js`, `pages.js`, `app.js`, `admin.js` |
| Docs | `docs/backend-api-contract.md`, `docs/events.md`, `docs/elevenlabs-integration.md`, `docs/security.md` |

No page builders, no frameworks, no build step. Vanilla PHP/CSS/JS.

## Styles

**Nova** (default): dark glass bento dashboard with an animated starfield, holographic assistant orb, glowing mic, weather (Open-Meteo, no key), AI insights, schedule, recent sessions and a floating AI dock. **Classic**: the light, minimal layout. Switch under Mr. Abb → Settings → Appearance → Style; the weather city is set there too. Both styles share the same live gateway, voice, approvals and pages.

## Installation

1. Upload `mr-abb.zip` via **Appearance → Themes → Add New → Upload Theme** and activate it.
2. On activation the theme creates the pages **Command Center** (set as the static front page), **History**, **Tasks**, **Connections**, **Automations**, enables pretty permalinks if needed, and adds the **Mr. Abb** admin menu.
3. Visit the site. You are in **Demo mode** until a backend is configured: everything you see is simulated so you can validate the experience end-to-end.

If pages are ever deleted, the admin shows a one-click "Create pages" notice.

## Configuration (Mr. Abb → Settings)

**General** — Agent Name, Owner Name, Default Language (English/Arabic), Welcome Message.
**Voice** — Voice Enabled, ElevenLabs Agent ID, Backend Session Endpoint (default `/voice/session`), ElevenLabs SDK URL.
**API** — Backend Base URL, Backend Secret (prefer `define( 'MRABB_BACKEND_SECRET', '…' );` in `wp-config.php`), Environment, Demo/Mock Mode.
**Security** — Require Authentication, Allowed User Roles, Debug Logging.
**Appearance** — Accent Colour, Interface Density.

The **Dashboard** screen shows mode, backend health (with a "Test connection" button), voice and access status. **Connections** lists the backend's connection state, **Logs** shows the debug ring buffer, **About** explains the architecture.

### Going live
1. Deploy the backend (see `docs/backend-api-contract.md`).
2. Add `define( 'MRABB_BACKEND_SECRET', 'long-random-secret' );` to `wp-config.php`.
3. Set **Backend Base URL** (HTTPS), your **ElevenLabs Agent ID**, turn **Demo mode** off, set **Environment** to Production.
4. Click **Test connection**.

## Per-user language
The top-bar toggle (`ع` / `EN`) switches the whole interface between English (LTR) and Arabic (RTL). The preference is saved per WordPress user. Arabic strings ship inside the theme (no .mo file needed); a `languages/ar.mo` would take precedence if you add one.

## Going live (built-in gateway)

The theme includes its own secure gateway, so there is nothing else to deploy. Follow **docs/go-live.md** (also shown as a checklist in Mr. Abb → Dashboard):

1. Mr. Abb → Connections → paste the **Anthropic API key** (typed commands, automations, web research).
2. Paste the **ElevenLabs API key + Agent ID**, click **Sync tools to agent**, paste the suggested system prompt into the agent.
3. Enter Google OAuth client ID/secret, click **Connect Google** (Calendar, Gmail, Tasks, Drive).
4. Point n8n (and WhatsApp/CRM/Odoo/Power BI/UiPath/Operines/Power Platform) webhooks at workflows that do the work.
5. Settings → API → turn **Demo mode** off.

## Real vs. mocked (v1)

| Real (live mode) | Demo only / not yet |
| --- | --- |
| Voice via ElevenLabs (server-minted signed URL, tools synced as webhook tools) | The scripted scenarios in `mock-agent.js` (demo mode only) |
| Typed commands via Claude with tool use, approvals follow-up, automations, web research | MCP servers, direct database tools (add as webhook connectors or new tools) |
| Google Calendar, Gmail, Tasks, Drive through OAuth inside WordPress | Native OAuth for CRM/Odoo/Microsoft (use webhook connectors, typically n8n) |
| Approvals, history, activity feed, context panel, tasks (WordPress tables) | Service worker / offline PWA |
| Webhook connectors: n8n, WhatsApp, CRM, Odoo, Power BI, Power Platform, UiPath, Operines | |
| Optional external backend mode (same contract) | |

## Recommended next step
Do the five steps above, then build one n8n workflow per business system (start with CRM). New tools are added in `inc/gateway/tools-builtin.php` or as webhook connectors; the interface needs no redesign because every tool speaks the same event format (`docs/events.md`).

## Testing performed
PHP lint on every file; the templates rendered through a stub-WordPress harness and exercised in headless Chromium (desktop 1440/1920, tablet 900, phone 390; EN/AR; idle, listening, thinking, executing, speaking, approval, error states; history drawer, tasks, connections, automations, login, profile modal, collapsed panels) with zero JavaScript errors and no horizontal overflow. Final verification on a real WordPress install (theme activation, REST permissions, admin settings) should be repeated on the Tasjeel host after upload.
