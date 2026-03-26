# The Conversation Coach

A voice-first Progressive Web App for practicing better conversations through AI coaching, built on the "Dialogue System" framework by Gerard Egan and Andrew Bailey.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 (via CDN, no build step), Babel Standalone for JSX |
| Backend | Vercel Edge Functions (Node.js) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| TTS | OpenAI TTS API (tts-1 model, nova voice) |
| STT | Web Speech API (SpeechRecognition) |
| Hosting | Vercel |
| Styling | Vanilla CSS, Google Fonts (Inter, Patrick Hand) |
| PWA | Service Worker, Web App Manifest |

## Project Structure

```
chatbot-demo/
├── api/                       # Vercel serverless endpoints
│   ├── chat.js               # Non-streaming Claude API (legacy)
│   ├── chat-stream.js        # Streaming Claude API (primary, Edge Runtime)
│   └── tts.js                # OpenAI TTS endpoint (Edge Runtime)
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
│   └── generate-icons.mjs    # Sharp-based icon generation
├── index.html                # Entire app — single-page React PWA
├── styles.css                # Global styles (dark theme, animations)
├── sw.js                     # Service Worker (cache-first assets, network-first API)
├── manifest.json             # PWA manifest
├── vercel.json               # Vercel deployment config
├── plan.md                   # Original implementation plan
└── package.json              # Only dev dep: sharp for icon gen
```

## Architecture

### Voice Pipeline (Low-Latency Streaming)

```
User speaks
  → Browser SpeechRecognition (interim + final transcript)
  → POST /api/chat-stream (SSE stream to Claude)
  → Response streams back as text chunks
  → Sentence buffer accumulates until punctuation or 80+ chars
  → Each sentence → POST /api/tts (parallel fetch)
  → Audio blobs played sequentially
  → ~1-2s latency from speech end to first audio
```

### Voice State Machine

```
IDLE → (tap mic) → LISTENING → (speech ends) → PROCESSING → (streaming) → SPEAKING → IDLE
```

Users can interrupt at any point by tapping the mic during SPEAKING.

### API Endpoints

| Endpoint | Runtime | Purpose |
|----------|---------|---------|
| `POST /api/chat-stream` | Edge | Primary. Streams Claude responses as simplified SSE (`data: { text }`, then `data: [DONE]`) |
| `POST /api/chat` | Node.js | Legacy non-streaming Claude call. Not actively used |
| `POST /api/tts` | Edge | Converts text to MP3 audio via OpenAI TTS API |

All endpoints accept JSON bodies and return CORS headers for all origins.

### Request Formats

**chat-stream**: `{ messages: [{role, content}], system: string, max_tokens: number }`
**tts**: `{ input: string, voice: string }`

## Frontend Architecture

Single-page React app rendered entirely in `index.html` (no build tooling).

### Key Components

- **`App`** — Root. Manages conversation state, voice state machine, streaming pipeline
- **`OnboardingScreen`** — Welcome screen with feature highlights (Learn/Coach/Practice)
- **`MessageBubble`** — Chat bubbles (user = yellow right-aligned, assistant = gray left-aligned)
- **`TypingIndicator`** — Animated dots during processing
- **`WaveVisualizer`** — 7 animated bars during listening

### Custom Hooks

- **`useSpeechRecognition`** — Wraps native SpeechRecognition API, returns `{ start, stop, supported }`
- **`useSpeechSynthesis`** — Manages TTS pipeline with `speak(text)`, `speakStreaming()`, and `cancel()`

### State (React useState/useRef, no external library)

- `started` — boolean, onboarding → chat transition
- `messages` — array of `{ role, content }`, full conversation history
- `voiceState` — `'idle' | 'listening' | 'processing' | 'speaking'`
- `interimText` — real-time transcription preview
- `textInput` — fallback text input value
- `error` — error message (auto-clears after 4s)

## Coaching Framework

The system prompt implements the **Dialogue System** by Gerard Egan & Andrew Bailey:

- **4 Characteristics** of effective dialogue
- **3 Roles** the coach can play
- **6 Skill Sets** for communication
- Frameworks: SAME, MRI, PRE, CRITIC

### Coaching Modes

1. **Learn** — Explain communication concepts with vivid examples
2. **Coach** — Analyze real conversation challenges
3. **Practice** — Role-play difficult scenarios with feedback
4. **Reflection** — Help users discover their communication style

Responses are optimized for voice: concise (2-4 sentences), warm, no markdown/bullets.

## Styling

- Dark theme: `#0f0f1a` background, `#1a1a2e` surfaces
- Accent: `#ffd21f` (yellow)
- Hand-drawn doodle iconography (SVG)
- Animations: `fadeInUp`, `pulse`, `dotPulse`, `waveBar`
- Mobile-first, responsive, safe-area-inset aware

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Required for Claude API
OPENAI_API_KEY=sk-...          # Required for TTS
```

## Deployment

Hosted on **Vercel**. Config in `vercel.json`:
- Clean URLs (no `.html` extensions)
- SPA rewrites (all non-API routes → `/index.html`)
- Service Worker headers (no-cache, Service-Worker-Allowed `/`)

## PWA

- Service Worker (`sw.js`) with cache name `conversation-coach-v3`
- Static assets + CDN libs cached on install
- API calls always network-first
- Offline fallback to cached `/index.html`
- Installable to home screen (standalone display mode)

## Dependencies

**Runtime**: None in package.json — React 18, ReactDOM 18, Babel loaded via CDN from unpkg.com

**Dev**: `sharp@^0.34.5` (icon generation only)

**External APIs**: Anthropic Claude, OpenAI TTS

## Browser Support

- **Full support**: Chrome, Edge, Safari (SpeechRecognition + SpeechSynthesis)
- **No SpeechRecognition**: Firefox (text input fallback available)
- **Recommended**: Chrome for best experience

## Development Notes

- No build step — edit `index.html` and deploy
- API functions in `api/` are auto-deployed as Vercel serverless functions
- `scripts/generate-icons.mjs` regenerates PWA PNGs from `images/icon-app.svg` (run with `node scripts/generate-icons.mjs`)
- Conversation history grows per session (max_tokens capped at 500 per response)
- Original plan (`plan.md`) called for separate `voice.html` — consolidated into single `index.html` instead
