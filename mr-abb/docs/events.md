# Mr. Abb — Event Schemas

One normalised event format drives the whole interface. Events can originate from:

1. the backend (`/agent/message`, `/approvals/*`, `/activity`, `/tools/execute` responses),
2. ElevenLabs client tools (the agent calling `mrabb_*` tools in the browser),
3. the mock agent (demo mode).

They are all routed through `MrAbb.events.handle(event)` (assets/js/core.js).

## `state`
```json
{ "type": "state", "state": "idle|connecting|listening|thinking|executing|speaking|approval_required|error" }
```

## `transcript`
```json
{ "type": "transcript", "role": "user|agent", "text": "…", "final": true, "id": "msg_1" }
```
Send the same `id` with `final: false` several times to stream a partial sentence.

## `tool`
```json
{
  "type": "tool",
  "id": "call_42",
  "tool": "calendar.search",
  "title": "Checking Calendar",
  "subtitle": "3 meetings today",
  "status": "queued|running|completed|failed|requires_approval",
  "level": "read|action|approval",
  "timestamp": "2026-01-01T09:00:00Z",
  "data": {},
  "error": null
}
```
Re-send with the same `id` to update status. A `requires_approval` tool may embed `"approval": { … }` (same shape as the approval event) to open the approval card in one step.

## `result`
```json
{ "type": "result", "id": "res_1", "tool": "calendar.search", "cardType": "calendar", "title": "3 meetings", "data": { … }, "wide": false }
```
`cardType` is optional; it is inferred from the tool prefix. Known types and the `data` they expect:

| cardType | data |
| --- | --- |
| `calendar` | `{ label, created?, events: [{ time, title, location?, duration? }] }` |
| `tasks` | `{ label, tasks: [{ id, title, time?, source?, priority?, status }] }` |
| `email` | inbox: `{ label, messages: [{ from, subject, snippet?, time? }] }` · single: `{ status: "draft|sent", to, subject, body? }` |
| `crm` | `{ label, count, pipeline, attention, opportunities: [{ name, customer, value, risk: "high|medium|low" }] }` |
| `contacts` | `{ contacts: [{ name, company?, role?, phone?, email? }] }` |
| `customers` | `{ customers: [{ name, segment?, value? }] }` |
| `documents` | `{ label, documents: [{ name, type?, modified?, url? }] }` |
| `report` | `{ label, metrics?: [{ value, label, tone? }], summary?, columns?, rows? }` |
| `analytics` | `{ label, metrics?, series?: [{ label, value, display? }] }` |
| `whatsapp` | `{ status?, to, message }` |
| `odoo` | `{ label, model?, columns?, rows? }` or `{ record: { … } }` |
| `web` | `{ query?, summary, sources: [{ title, domain?, url? }] }` |
| `notification` | `{ label?, title, text, tone?, badge? }` |
| `automation` | `{ label, name, status, steps: [{ title, meta?, status }] }` |
| `approval` | `{ status, details }` |
| `generic` | any JSON: strings, flat objects (key/value), arrays of objects (table), `{ summary, fields }` |

## `approval`
```json
{ "type": "approval", "id": "apr_1", "tool": "email.send", "title": "Send email to Ahmed Hassan",
  "details": { "To": "ahmed@…", "Subject": "Project Update" }, "preview": "Hi Ahmed, …" }
```
The user's decision is sent to `POST /approvals/{id}/approve|reject`. When an ElevenLabs client tool (`mrabb_request_approval`) raised it, the tool's promise also resolves with `"approved"` or `"rejected"`, so the agent hears the answer.

## `approval_resolved`
```json
{ "type": "approval_resolved", "id": "apr_1", "status": "approved|rejected" }
```

## `error`
```json
{ "type": "error", "message": "Something went wrong while checking your calendar.", "hint": "…", "details": { … }, "retryable": true }
```
`message` is shown to the user. `details` is only shown when Debug Logging is on.

## `session`
```json
{ "type": "session", "id": "ses_123", "title": "Morning planning" }
```

## Frontend data models (assets/js/core.js → `MrAbb.Models`)
`user`, `session`, `message`, `toolCall`, `toolResult`, `approval`, `connection`, `task`, `automation`, `notification`. They are plain objects; the backend is the source of truth and nothing is persisted in WordPress.
