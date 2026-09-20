# Mr. Abb — Backend API Contract (v1)

**Default: built-in gateway.** Since v1.1 the theme implements this contract inside WordPress (`inc/gateway/`), so no external backend is required. Set *Settings → API → Gateway* to *External* to forward the same routes to your own service instead. The contract below is identical in both modes.

The WordPress theme never talks to third-party services from the browser. It talks to **one secure tool gateway** (for example `https://api.eldeniney.me`) through the theme's own REST proxy:

```
Browser ──(cookie + X-WP-Nonce)──▶ WordPress /wp-json/mrabb/v1/* ──(Bearer MRABB_BACKEND_SECRET)──▶ Backend
```

The backend therefore only ever receives requests from the WordPress server, authenticated with a shared secret, and carrying the WordPress user identity in headers.

## Headers sent by WordPress on every request

| Header | Value |
| --- | --- |
| `Authorization` | `Bearer <MRABB_BACKEND_SECRET>` (constant in wp-config.php, or stored option) |
| `Content-Type` / `Accept` | `application/json` |
| `X-MrAbb-Site` | Home URL of the WordPress site |
| `X-MrAbb-User-Id` | WordPress user id |
| `X-MrAbb-User` | WordPress user email |
| `X-MrAbb-Language` | `en` or `ar` |
| `X-Request-Id` | UUID v4 per request |
| `X-MrAbb-Version` | Theme version |

The backend should reject any request without a valid bearer token. `X-MrAbb-User-Id` identifies the person; the backend may map this to its own user/tenant.

## Response conventions

* Success: `2xx` with a JSON body. Either the resource directly or `{ "data": ... }` (the frontend accepts both).
* Error: non-2xx with `{ "message": "Human readable text", "code": "machine_code" }`. The message is shown to the user as-is (keep it human). Technical details are only shown when Debug Logging is on.

## Endpoints

### `GET /health`
Used by the admin "Test connection" button. Return `{ "ok": true, "version": "..." }`.

### `POST /voice/session`
Request a short-lived ElevenLabs session. The ElevenLabs API key lives **here**, in the backend.

Request body:
```json
{ "agentId": "agent_xxx", "language": "en", "user": { "id": 1, "name": "Abbas", "email": "..." }, "timezone": "Asia/Dubai" }
```
Response (one of `signedUrl` or `conversationToken` is required):
```json
{
  "signedUrl": "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=...&token=...",
  "conversationToken": null,
  "agentId": "agent_xxx",
  "sessionId": "ses_123",
  "expiresAt": "2026-01-01T09:00:00Z",
  "dynamicVariables": { "user_name": "Abbas", "today_summary": "..." }
}
```
`signedUrl` → WebSocket connection. `conversationToken` → WebRTC connection. `dynamicVariables` are passed to the agent at session start.

### `POST /agent/message`
Text fallback (typed commands when no voice session is open).
```json
{ "text": "What do I have today?", "sessionId": "ses_123", "language": "en" }
```
Response:
```json
{ "session": { "id": "ses_123", "title": "Morning planning" }, "reply": { "text": "You have three meetings…" }, "events": [ /* see events.md */ ] }
```

### `POST /tools/execute`
Direct tool execution (used by future UI actions, e.g. "Run now").
```json
{ "tool": "calendar.search", "params": { "range": "today" }, "sessionId": "ses_123" }
```
Response: `{ "events": [ ... ] }`.

### `POST /approvals/{id}/approve` · `POST /approvals/{id}/reject`
Resolve a pending approval. Response: `{ "ok": true, "events": [ ... ] }` (events describe what happened after approval, e.g. the tool running and completing).

### `GET /activity?since=<iso>&sessionId=<id>`
Event feed for tools executed server-side during a live voice session. Polled every 2.5 s while a session is active.
```json
{ "now": "2026-01-01T09:00:05Z", "events": [ ... ] }
```

### `GET /connections`
```json
{ "data": [ { "id": "gmail", "name": "Gmail", "description": "…", "status": "connected|not_connected|attention", "icon": "M", "lastSync": "2026-01-01T07:45:00Z", "category": "google" } ] }
```
### `POST /connections/{id}/connect` · `POST /connections/{id}/disconnect`
Connect may return `{ "url": "https://…oauth…" }` to redirect the browser into an OAuth flow owned by the backend. WordPress never stores OAuth credentials.

### `GET /profile/context`
Data for the right-hand context panel.
```json
{ "schedule": [ { "time": "09:00", "title": "Prime Team Meeting", "location": "Boardroom" } ],
  "tasks": [ { "id": "t2", "title": "Call Ahmed Hassan", "time": "12:00", "source": "manual", "priority": "high", "status": "open" } ],
  "activity": [ { "title": "Checked calendar", "meta": "09:10", "tone": "success" } ] }
```

### `GET /history` · `GET /history/{id}`
List: `{ "sessions": [ { "id": "h1", "title": "Morning Planning", "startedAt": "…", "durationMin": 6, "actions": 7, "approvals": 1 } ] }`
Detail adds `messages` (`{ role: "user"|"agent", text, time }`), `tools` (`{ tool, title, status }`), `approvals` (`{ title, status }`).

### `GET /tasks` · `POST /tasks` · `POST /tasks/{id}/complete`
`{ "tasks": [ { "id", "title", "time", "date": "ISO", "source": "manual|google|ai|crm|automation", "priority": "high|medium|low", "status": "open|done" } ] }`

### `GET /automations` · `POST /automations/{id}/toggle` · `POST /automations/{id}/run`
`{ "automations": [ { "id", "name", "schedule", "enabled": true, "lastRun": "ISO", "lastStatus": "completed|failed", "description" } ] }`

## Adding a tool

Nothing in WordPress needs to change. Emit `tool` events with your new tool name (e.g. `hubspot.searchDeals`) and, optionally, `result` events with a `cardType`. Unknown card types render as a clean generic card. Permission levels are inferred from the tool name (`*.send`, `*.delete`, `*.pay` → approval; `*.create`, `*.draft`, `*.execute` → action; otherwise read) unless the event specifies `level`.

## Inbound endpoints (built-in gateway)

| Endpoint | Caller | Auth |
| --- | --- | --- |
| `POST /wp-json/mrabb/v1/hooks/tool/{tool_name}` | ElevenLabs server tools (`calendar_search`, `email_send`, …) | header `X-MrAbb-Hook-Secret` |
| `POST /wp-json/mrabb/v1/hooks/elevenlabs` | ElevenLabs post-call webhook | `ElevenLabs-Signature` HMAC |
| `GET /wp-json/mrabb/v1/oauth/google` | Google OAuth redirect | signed `state` |

Tool hook request body: the tool's parameters plus `session_id` (the `mrabb_session_id` dynamic variable). Response: `{ status: "completed|failed|requires_approval", summary, data?, approvalId? }`.
