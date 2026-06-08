# The Conversation Coach

A voice-first Progressive Web App for practicing better conversations through AI coaching, built on the "Dialogue System" framework by Gerard Egan and Andrew Bailey.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (via CDN, no build step), Babel Standalone for JSX |
| Backend | Vercel Functions — Edge Runtime (`chat-stream`, `tts`, `stt`) + Node.js (`chat`, legacy) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| TTS | OpenAI TTS API (`tts-1` model, `shimmer` voice) |
| STT | Native Web Speech API (`SpeechRecognition`) where supported; OpenAI Whisper (`gpt-4o-mini-transcribe`) fallback via `/api/stt` for browsers that lack it |
| Hosting | Vercel |
| Styling | Vanilla CSS, Google Fonts (Inter, Patrick Hand) |
| PWA | Service Worker, Web App Manifest |

## Project Structure

```
chatbot-demo/
├── api/                       # Vercel serverless endpoints
│   ├── chat.js               # Non-streaming Claude API (legacy, Node.js)
│   ├── chat-stream.js        # Streaming Claude API (primary, Edge Runtime)
│   ├── tts.js                # OpenAI TTS endpoint (Edge Runtime)
│   └── stt.js                # Speech-to-text endpoint — OpenAI Whisper, Groq fallback (Edge Runtime)
├── images/                    # Icons, logos, doodle-style SVGs
│   ├── favicon.svg
│   ├── logo.svg
│   ├── icon-app.svg          # Master SVG for PWA icons
│   ├── icon-192.png / icon-512.png  # Generated PWA icons
│   ├── apple-touch-icon.png
│   ├── icon-avatar.svg       # Chat assistant avatar
│   ├── icon-learn.svg        # Feature icon (onboarding)
│   ├── icon-coach.svg        # Feature icon (onboarding)
│   └── icon-practice.svg     # Feature icon (onboarding)
├── scripts/
│   ├── generate-icons.mjs    # Sharp-based icon generation
│   └── bump-version.mjs      # Single-source-of-truth version bumper (see Versioning)
├── index.html                # Entire app — single-page React PWA
├── styles.css                # Global styles (dark theme, animations)
├── sw.js                     # Service Worker (cache-first assets, network-first API)
├── manifest.json             # PWA manifest
├── vercel.json               # Vercel deployment config
├── plan.md                   # Original implementation plan (historical — see its status note)
└── package.json              # Dev dep: sharp for icon gen; "version" is the release source of truth
```

## Architecture

### Voice Pipeline (Low-Latency Streaming)

```
User speaks
  → STT: native SpeechRecognition, or MediaRecorder → /api/stt (Whisper) fallback
    (end-of-turn after ~2.2s of silence, or tap mic to end immediately)
  → POST /api/chat-stream (SSE stream to Claude, sent unbuffered)
  → Response streams back as text chunks, rendered live
  → Sentence buffer fires TTS aggressively at natural breaks
    (first chunk after ~28 chars so audio starts ASAP; looser thresholds after)
  → Each chunk → POST /api/tts (parallel fetch, retried once on 429/5xx)
  → Audio buffers played sequentially via AudioContext
  → Voice starts on the first sentence, not after the whole reply
```

### Voice State Machine

```
IDLE → (tap mic) → LISTENING → (speech ends) → PROCESSING → (streaming) → SPEAKING → IDLE
```

Users can interrupt at any point by tapping the mic during SPEAKING.

### API Endpoints

| Endpoint | Runtime | Purpose |
|----------|---------|---------|
| `POST /api/chat-stream` | Edge | Primary. Streams Claude responses as simplified SSE (`data: { text }`, then `data: [DONE]`). Sent unbuffered (`X-Accel-Buffering: no`, `no-transform`) so deltas arrive as produced |
| `POST /api/tts` | Edge | Converts text → MP3 via OpenAI TTS. Aborts a slow upstream after 12s and returns a clean `504` so the client can retry |
| `POST /api/stt` | Edge | Transcribes uploaded audio. Prefers OpenAI `gpt-4o-mini-transcribe`; falls back to Groq `whisper-large-v3-turbo` if only `GROQ_API_KEY` is set |
| `POST /api/chat` | Node.js | Legacy non-streaming Claude call. Not actively used |

All endpoints accept their respective bodies and return CORS headers for all origins.

### Request Formats

**chat-stream**: JSON `{ messages: [{role, content}], system: string, max_tokens: number }`
**tts**: JSON `{ input: string, voice: string }` → `audio/mpeg` stream
**stt**: `multipart/form-data` with an `audio` file → JSON `{ text, provider }`

## Frontend Architecture

Single-page React app rendered entirely in `index.html` (no build tooling).

### Key Components

- **`App`** — Root. Manages conversation state, voice state machine, streaming pipeline
- **Feel Understood onboarding** — A short questionnaire (`FEEL_UNDERSTOOD_SCREENS`) builds a profile, then offers three next-step paths (see Coaching Modes)
- **`MessageBubble`** — Chat bubbles (user = yellow right-aligned, assistant = gray left-aligned)
- **`TypingIndicator`** — Animated dots during processing
- **`WaveVisualizer`** — Animated bars during listening; reacts to live mic level on the Whisper path

### Custom Hooks

- **`useSpeechRecognition`** — Wraps native `SpeechRecognition`; manages its own ~2.2s silence debounce. Returns `{ start, stop, supported }`
- **`useMediaRecorderSTT`** — Fallback for browsers without usable `SpeechRecognition` (iOS Chrome/Firefox/Edge). Records via `MediaRecorder`, does its own RMS-based silence detection, posts audio to `/api/stt`. Same interface plus `getLevel` for the visualizer
- **`useSpeechSynthesis`** — Manages the TTS pipeline. Returns `{ speak, speakStreaming, cancel, getLastError }`. `getLastError` surfaces real TTS failures as a banner instead of masking them with a robotic browser voice

### State (React useState/useRef, no external library)

- `started` — boolean, onboarding → chat transition
- `profile` — the Feel Understood profile + selected `mode`/`goal`/`path`
- `messages` — array of `{ role, content }`, full conversation history
- `voiceState` — `'idle' | 'listening' | 'processing' | 'speaking'`
- `interimText` / `transcribing` — real-time transcription preview / Whisper-path "transcribing" state
- `textInput` — fallback text input value
- `error` — error message (voice failures persist ~10s; others auto-clear faster)

## Coaching Framework

The system prompt implements the **Dialogue System** by Gerard Egan & Andrew Bailey:

- **4 Characteristics** of effective dialogue
- **3 Roles** the coach can play
- **6 Skill Sets** for communication
- Frameworks: SAME, MRI, PRE, CRITIC

### Coaching Modes

After the Feel Understood questionnaire, the user picks one of three paths, which map onto a system-prompt **mode** the chat AI uses to tailor its opening turn:

1. **Lessons** (`mode: coach`, goal `learn`) — short teaching sessions on communication skills
2. **Helpline** (`mode: coach`, goal `helpline`) — talk through a specific conversation or an aspect of yourself you want seen; can role-play approaches
3. **Facilitator** (`mode: facilitator`) — the AI acts as a neutral third party in a conversation between the user and another person, making sure both are heard

System prompts are built by `buildCoachSystemPrompt` and `buildFacilitatorSystemPrompt`. Responses are optimized for voice: concise (2–4 sentences), warm, no markdown/bullets.

## Styling

- Dark theme: `#0f0f1a` background, `#1a1a2e` surfaces
- Accent: `#ffd21f` (yellow)
- Hand-drawn doodle iconography (SVG)
- Animations: `fadeInUp`, `pulse`, `dotPulse`, `waveBar`
- Mobile-first, responsive, safe-area-inset aware

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Required — Claude API (chat-stream, chat)
OPENAI_API_KEY=sk-...          # Required — OpenAI TTS and primary Whisper STT
GROQ_API_KEY=gsk_...           # Optional — STT fallback only (whisper-large-v3-turbo)
```

If `OPENAI_API_KEY` is set, STT uses OpenAI; Groq is only used when OpenAI isn't configured.

## Deployment

Hosted on **Vercel**. Config in `vercel.json`:
- Clean URLs (no `.html` extensions)
- SPA rewrites (all non-API routes → `/index.html`)
- Service Worker headers (no-cache, Service-Worker-Allowed `/`)

## PWA

- Service Worker (`sw.js`) with cache name `feel-understood-v<app-version>` (bumped automatically per release — see Versioning)
- Static assets + CDN libs cached on install
- API calls always network-first, passed straight through (never cached/cloned, so streaming isn't buffered)
- Offline fallback to cached `/index.html`
- Installable to home screen (standalone display mode)

## Voice Reliability & Tuning

Key knobs and behaviors that keep the voice experience smooth (all in `index.html` unless noted):

- **End-of-turn silence**: `SILENCE_MS = 2200` in both STT paths — how long to wait through a pause before treating the user as done. Tap the mic to end immediately.
- **TTS model**: `tts-1` (not `tts-1-hd`) in `api/tts.js` — much faster to generate, which matters for per-sentence streaming on an edge function.
- **TTS timeout**: `api/tts.js` aborts a slow OpenAI call after 12s → clean `504`, so the client retry fires fast instead of waiting for the platform gateway.
- **TTS retry**: `fetchTTSBuffer` retries once on `429` (rate limit, longer backoff) or `5xx`/network errors. Other `4xx` are not retried.
- **Resilient playback**: a single failed/slow sentence never silences the rest — `speak()` and `speakStreaming()` log the error (surfaced via the "Voice failed" banner) and keep going.
- **Unbuffered streaming**: `api/chat-stream.js` sets `X-Accel-Buffering: no` + `Cache-Control: no-transform` and primes the connection so deltas reach the browser as Claude produces them. The client also carries incomplete SSE lines across reads so chunks split mid-line don't drop words.

## Dependencies

**Runtime**: None in package.json — React 18, ReactDOM 18, Babel loaded via CDN from unpkg.com

**Dev**: `sharp@^0.34.5` (icon generation only)

**External APIs**: Anthropic Claude (chat), OpenAI (TTS + primary Whisper STT), Groq (optional STT fallback)

## Browser Support

- **Full support (native SpeechRecognition)**: Chrome, Edge, Safari, and the home-screen PWA
- **Whisper fallback (MediaRecorder → /api/stt)**: iOS Chrome (CriOS), iOS Firefox (FxiOS), iOS Edge (EdgiOS) and other browsers without usable `SpeechRecognition`
- **No mic support at all**: text input fallback is always available
- **Recommended**: Chrome for best experience

## Versioning

`package.json` `version` is the **single source of truth**. The version appears
in three places that must stay in sync: `package.json`, the on-screen label in
`index.html` (`'vX.Y.Z'`), and the `CACHE_NAME` in `sw.js` (bumping it busts the
PWA cache on each release).

Never hand-edit these individually. Use the bumper, which updates all three at
once and **refuses to ever go backwards** (the guard against version
regressions):

```
npm run bump          # patch:  2.1.0 -> 2.1.1
npm run bump minor    #         2.1.0 -> 2.2.0
npm run bump major    #         2.1.0 -> 3.0.0
npm run bump 2.5.0    # set an explicit (higher) version
```

Bump as part of any change you intend to deploy, then commit the result.

## Development Notes

- No build step — edit `index.html` and deploy
- API functions in `api/` are auto-deployed as Vercel serverless functions
- `scripts/generate-icons.mjs` regenerates PWA PNGs from `images/icon-app.svg` (run with `node scripts/generate-icons.mjs`)
- Conversation history grows per session (`max_tokens` capped at 500 per response)
- Original plan (`plan.md`) called for a separate `voice.html` and browser `SpeechSynthesis`/`SpeechRecognition` — the implementation diverged significantly (consolidated into a single `index.html`, OpenAI TTS + Whisper STT fallback, streaming pipeline). See `plan.md`'s status note for details.
