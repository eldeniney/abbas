# Mr. Abb — Security Notes

## Secrets
* The backend secret is read from `MRABB_BACKEND_SECRET` in `wp-config.php` (recommended) or from a separate option that is never included in the public settings array or localized to the browser.
* The ElevenLabs API key is **not** a WordPress setting. It belongs in the backend.
* The ElevenLabs Agent ID is public by design; private agents are protected by the signed-URL handshake.
* The debug log redacts any context key containing `secret`, `token`, `password`, `authorization` or `key`.

## Access control
* `Require Authentication` (default on) gates every front-end template through `template_include`. Unauthorised visitors get the in-theme login screen; logged-in users without an allowed role get a "private" screen.
* Every REST route except `/manifest` uses `mrabb_rest_permission()` (logged in + allowed role). Admin routes (`/status`, `GET /logs`) require `manage_options`.
* Cookie authentication needs the `X-WP-Nonce` header; the frontend sends it on every call. Without it WordPress treats the request as anonymous and the permission callback fails.

## Proxy hardening
* Only allowlisted backend paths can be proxied (`MrAbb_Gateway::$allowed`). Path traversal (`..`) and query injection are refused.
* Redirects are not followed; SSL verification is forced in production; production backends must use HTTPS.
* Bodies are recursively sanitised; ids are URL-encoded; error details reach the browser only when Debug Logging is on.

## Privacy
* Front-end responses carry `Cache-Control: private, no-store` and `DONOTCACHEPAGE` so page caches/CDNs never store a transcript.
* `<meta name="robots" content="noindex, nofollow">` on every page.
* The admin bar and WordPress generator/RSD/WLW hints are removed.
* Anonymous REST user enumeration (`/wp/v2/users`) is disabled.
* Conversation history is not stored in WordPress; the backend owns it.

## Headers
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: microphone=(self), camera=(), geolocation=()`.

## Hosting recommendations (Tasjeel)
* Force HTTPS.
* Keep Debug Logging off in production.
* Restrict `wp-login.php` with rate limiting or 2FA (plugin) since the interface exposes business data.
