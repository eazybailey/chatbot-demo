# Voice Chatbot Implementation Plan for "Feel Understood"

## Overview
Add a ChatGPT-like voice interface to the Feel Understood project. Users will be able to have a spoken conversation with a Claude-powered therapist/counselor chatbot that helps them explore how understood they feel.

## Architecture

```
User speaks → Browser SpeechRecognition API → transcribed text
    → POST /api/chat (Claude) → response text
    → Browser SpeechSynthesis API → spoken response
```

### Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Speech-to-Text | Web Speech API (`SpeechRecognition`) | Free, no API keys, works in Chrome/Edge/Safari — sufficient for a client demo |
| Text-to-Speech | Web Speech API (`SpeechSynthesis`) | Free, zero-latency start, built-in — good enough for demo; can upgrade later |
| AI Backend | Existing `api/chat.js` → Claude | Already in place, just needs system prompt update |
| UI Framework | React via CDN (existing) | No changes to build tooling |

### Browser Support Note
- SpeechRecognition works in Chrome, Edge, Safari (covers ~85% of users)
- SpeechSynthesis works in all major browsers
- For the demo, recommend Chrome for best experience

## Files to Create/Modify

### 1. NEW: `voice.html` — Voice Chatbot Interface
The main new file. A standalone page with:

**UI Components:**
- Centered chat area with message bubbles (user = right/yellow, assistant = left/white)
- Large circular microphone button at bottom center (pulsing animation when listening)
- Audio waveform/ripple visualization around mic button when active
- Status indicator: "Tap to speak" / "Listening..." / "Thinking..." / "Speaking..."
- Text input fallback (small input bar below mic for typing)
- Header with "Feel Understood" branding

**Voice Flow (state machine):**
```
IDLE → (tap mic) → LISTENING → (speech ends) → PROCESSING → (Claude responds) → SPEAKING → IDLE
```

**React Components:**
- `VoiceChatApp` — root component, manages conversation state
- `MessageBubble` — renders a single chat message
- `MicButton` — animated microphone button with states
- `StatusBar` — shows current state text
- `TextInput` — fallback text input

**Key Implementation Details:**
- `SpeechRecognition` with `lang='en-US'`, `continuous=false`, `interimResults=true`
- Show interim transcription in real-time as user speaks
- On `onresult` final transcript → send to Claude
- Claude response → feed to `SpeechSynthesis` with a warm, calm voice
- Conversation history maintained in state and sent with each API call
- Auto-scroll chat to bottom on new messages

### 2. MODIFY: `api/chat.js` — Update for conversation mode
- Increase `max_tokens` from 1000 to 2048 (voice conversations need room)
- Keep existing functionality intact (index.html still works)
- The system prompt will be sent from the frontend (already supported)

### 3. MODIFY: `index.html` — Add navigation link
- Add a "Try Voice Chat" button/link to navigate to `voice.html`

## Voice Chat System Prompt
```
You are a warm, empathetic counselor for the "Feel Understood" project.
Your role is to help people explore and articulate how well they feel
understood by the people in their lives.

Keep responses conversational and concise (2-3 sentences max) since
they will be spoken aloud. Ask thoughtful follow-up questions. Be
supportive and validating. Use natural, spoken language — avoid
bullet points, markdown, or long paragraphs.

Start by warmly greeting the user and asking how they're feeling today
about being understood by the people around them.
```

## UI Design Specs

**Color scheme** (matching existing yellow theme):
- Primary: #ffd21f (yellow)
- Background: #1a1a2e (dark — better for voice UI, like ChatGPT voice mode)
- Message bubbles: user=#ffd21f, assistant=#2a2a4a
- Mic button: #ffd21f with glow effect
- Text: #ffffff on dark, #1a1a2e on yellow

**Animations:**
- Mic button: pulse animation when listening (scale 1.0→1.1→1.0)
- Ripple rings around mic when active
- Fade-in for new messages
- Typing indicator dots while waiting for Claude

**Layout (mobile-first):**
```
┌─────────────────────────┐
│   Feel Understood  🎙    │  ← header
├─────────────────────────┤
│                         │
│  Hi! I'm here to help   │  ← assistant bubble (left)
│  you explore...         │
│                         │
│     I've been feeling   │  ← user bubble (right)
│     like nobody gets me │
│                         │
│  That sounds really     │  ← assistant bubble
│  tough. Can you tell... │
│                         │
├─────────────────────────┤
│      Listening...       │  ← status text
│                         │
│        ◉ ◉ ◉           │  ← ripple animation
│       (( 🎤 ))          │  ← mic button
│                         │
│  [Type a message...]    │  ← text fallback
└─────────────────────────┘
```

## Implementation Steps

1. Create `voice.html` with full React voice chat UI
2. Update `api/chat.js` to bump max_tokens
3. Add "Try Voice Chat" link to `index.html`
4. Test end-to-end flow
5. Commit and push
