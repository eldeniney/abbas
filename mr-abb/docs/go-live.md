# Go live — what you need to do after installing

Mr. Abb ships with a **built-in gateway**: WordPress itself runs the tools. Nothing else to deploy. You only enter keys and connect accounts. The checklist below is also shown live in **WordPress → Mr. Abb → Dashboard**.

## 1. Claude (typed commands, automations, web research) — 2 minutes
1. Go to https://console.anthropic.com → API keys → Create key.
2. WordPress → **Mr. Abb → Connections → Claude** → paste the key → Save.
3. Click **Test Claude**. Green means live.

Model and effort live under Mr. Abb → Settings → Brain (default: Claude Opus 5, medium effort).

## 2. ElevenLabs (voice) — 10 minutes
1. https://elevenlabs.io → Conversational AI → create an **Agent**.
   - Voice: pick one you like. Language: English, add Arabic as an additional language.
   - Turn on the **Security → Enable overrides → Language** switch and **Allow dynamic variables**.
2. ElevenLabs → Profile → **API keys** → create a key.
3. WordPress → Mr. Abb → Connections → ElevenLabs: paste the **API key** and the **Agent ID**, Save.
4. Click **Test agent**, then **Sync tools to agent**. This creates one webhook tool per connected capability on your agent (calendar, tasks, email, drive, web, n8n …) and attaches them. Re-run Sync whenever you connect a new service.
5. Copy the suggested **system prompt** from the *Manual setup* box into the agent's System prompt (the sync attaches tools but does not overwrite your prompt).
6. Optional: ElevenLabs → Settings → **Post-call webhook** → paste the URL shown in WordPress and copy the webhook secret back into WordPress. This stores full voice transcripts in History.

Then open the site, tap the orb, allow the microphone, and talk.

## 3. Google (Calendar, Gmail, Tasks, Drive) — 10 minutes
1. https://console.cloud.google.com → create a project → **APIs & Services → Library** → enable *Google Calendar API*, *Gmail API*, *Tasks API*, *Google Drive API*.
2. **OAuth consent screen** → External → add yourself as a test user (or publish).
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorised redirect URI: the URI shown in WordPress → Mr. Abb → Connections → Google (it is `https://eldeniney.me/wp-json/mrabb/v1/oauth/google`).
4. Paste the Client ID and Client Secret in WordPress → Save → click **Connect Google** → sign in with the account you want Mr. Abb to use.

## 4. n8n and the other systems (WhatsApp, CRM, Odoo, Power BI, Power Platform, UiPath, Operines)
Each of these is a **webhook connector**: a URL you control plus a secret. The easiest way is one n8n workflow per service:

1. In n8n create a workflow starting with a **Webhook** node (POST). Copy its URL.
2. In WordPress → Connections → the service → paste the URL and a secret you invent. Save. Click **Test (ping)**.
3. In the workflow, read `{{$json.body.action}}` and `{{$json.body.payload}}`, do the work (WhatsApp Business API, HubSpot/Zoho, Odoo XML-RPC, Power BI REST, UiPath Orchestrator, Operines API …), and respond with JSON:

```json
{ "summary": "One sentence Mr. Abb can say",
  "card": { "type": "crm", "title": "Closing this month", "data": { "count": 12, "pipeline": "AED 185,000", "attention": 4, "opportunities": [] } } }
```

Actions Mr. Abb sends per service are listed on the Connections page. `ping` must reply `{"summary":"ok"}`. Check the `Authorization: Bearer <secret>` header in the workflow to reject strangers.

## 5. Live mode
Live mode switches on automatically the moment ElevenLabs (key + Agent ID) or Claude is connected. The topbar status changes from "Demo" to "Ready". Settings → API → Demo / Live lets you force either mode.

## 6. Automations
Mr. Abb → Automations (on the site) → New automation. Name it, give a schedule in plain words (`weekdays 07:45`, `daily 18:00`, `weekly sunday 08:00`, `hourly`) and a prompt (what Mr. Abb should do). Runs use WordPress cron; on shared hosting add a real cron hitting `https://eldeniney.me/wp-cron.php` every 15 minutes for punctual runs. Results appear in History.

## What is real now

| Capability | Status |
| --- | --- |
| Voice conversation (ElevenLabs) | Live once key + agent + sync are done |
| Typed commands (Claude with tools) | Live once the Anthropic key is set |
| Calendar search/create, Tasks list/create/complete, Gmail search/read/draft/send, Drive search | Live once Google is connected |
| Web research | Live with the Anthropic key |
| Approvals (email.send, whatsapp.send, crm.updateOpportunity) | Live: nothing runs until you press Approve |
| History, activity feed, context panel, tasks page | Live (stored in WordPress tables) |
| Automations | Live (WP-Cron) |
| n8n / WhatsApp / CRM / Odoo / Power BI / Power Platform / UiPath / Operines | Live as soon as you point their webhook at a workflow that does the work |
| MCP servers, other databases | Not yet: add them as webhook connectors or as new tools in `inc/gateway/tools-builtin.php` |

## Security reminders
* All keys are stored encrypted in the WordPress database (or as `MRABB_SECRET_*` constants in wp-config.php) and never sent to the browser.
* The tool webhook is protected by a shared secret; rotate it by deleting the `mrabb_secret_hook_secret` option and re-syncing.
* Keep **Require Authentication** on; only allowed roles can open the interface or call the REST proxy.
