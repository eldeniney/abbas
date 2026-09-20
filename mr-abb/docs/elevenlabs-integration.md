# Mr. Abb — ElevenLabs Voice Agent Integration

## Principles

* The **ElevenLabs API key never leaves the backend.** WordPress does not store it, and the browser never sees it.
* The browser gets a **short-lived signed URL or conversation token**, minted by the backend per session.
* The SDK (`@elevenlabs/client`) is loaded on demand as an ES module only when a live session starts. The URL is configurable in *Mr. Abb → Settings → Voice*.

## Flow

```
Orb tap
  └─ VoiceAgent.start()
       ├─ POST /wp-json/mrabb/v1/voice/session   (WordPress checks login, role, nonce)
       │     └─ backend POST /voice/session       (backend calls ElevenLabs with its API key)
       │           └─ { signedUrl | conversationToken, dynamicVariables }
       ├─ import(sdkUrl) → Conversation
       └─ Conversation.startSession({ signedUrl, clientTools, dynamicVariables, overrides })
```

Callbacks are mapped to the central state manager:

| SDK callback | Mr. Abb |
| --- | --- |
| `onConnect` | connection → connected, state → listening |
| `onModeChange` (`speaking`/`listening`) | state → speaking / listening |
| `onMessage` (`source: user|ai`) | transcript events |
| `onError` | error state + human error card |
| `onDisconnect` | state → idle |
| `getInputVolume()` / `getOutputVolume()` | orb amplitude |

## Client tools to register on the agent

In the ElevenLabs agent configuration add these **client tools** so the agent can drive the interface. All parameters are JSON objects matching docs/events.md.

| Tool name | Parameters | Returns |
| --- | --- | --- |
| `mrabb_set_state` | `{ state }` | `"ok"` |
| `mrabb_tool_event` | tool event fields (`id`, `tool`, `title`, `status`, …) | `"ok"` |
| `mrabb_show_result` | result event fields (`tool`, `cardType`, `title`, `data`) | `"ok"` |
| `mrabb_request_approval` | approval fields (`id`, `tool`, `title`, `details`, `preview`) | waits for the user, then `"approved"` or `"rejected"` |
| `mrabb_show_error` | `{ message, hint?, details? }` | `"ok"` |

Server-side tools (the ones the backend executes on behalf of the agent) do not need client tools: report them through `GET /activity` and the theme polls that feed while a session is open.

## Dynamic variables passed at session start

`user_name`, `language`, `timezone`, plus anything the backend returns in `dynamicVariables` (for example a pre-computed `today_summary`).

## Language

The current interface language (`en`/`ar`) is sent as `overrides.agent.language`. Make sure the agent is configured with both languages enabled.

## Interface reference (assets/js/voice-agent.js)

```
getVoiceSession()      → POST /voice/session via WordPress
start()                → startConversation()
stop()                 → endConversation()
sendText(text)         → conversation.sendUserMessage() or POST /agent/message
respondApproval(id, approved)
onUserTranscript / onAgentResponse / onAgentStateChange / onToolStarted / onToolCompleted / onApprovalRequired / onError
```

`MockAgent` (assets/js/mock-agent.js) implements the same interface with scripted scenarios and is used whenever Demo mode is on or no backend is configured.
