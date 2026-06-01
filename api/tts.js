export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Groq Orpheus TTS. OpenAI-compatible endpoint, so request/response shape
// matches what we used previously — just different model + voice IDs.
//
// English voices: autumn, diana, hannah, austin, daniel, troy
// 'autumn' is the warm female default that most closely fills the role
// 'shimmer' did on OpenAI.
const GROQ_TTS_URL = 'https://api.groq.com/openai/v1/audio/speech';
const GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english';
const DEFAULT_VOICE = 'autumn';
// Groq Orpheus has a 200-char hard limit per request. Keep margin.
const MAX_INPUT_CHARS = 180;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  try {
    const { input, voice, speed } = await req.json();

    if (!input || !input.trim()) {
      return new Response(JSON.stringify({ error: 'No input text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Defensive truncation in case the client sends something longer than
    // Groq's 200-char limit. Client already chunks; this is belt-and-braces.
    const safeInput = input.length > MAX_INPUT_CHARS
      ? input.slice(0, MAX_INPUT_CHARS).replace(/\s+\S*$/, '')
      : input;

    // Keep the body minimal — Orpheus is stricter than OpenAI about
    // extra params. Orpheus only emits WAV (not mp3/ogg/flac), so the
    // response_format is fixed.
    const body = {
      model: GROQ_TTS_MODEL,
      input: safeInput,
      voice: voice || DEFAULT_VOICE,
      response_format: 'wav',
    };
    if (typeof speed === 'number' && speed !== 1.0) body.speed = speed;

    const response = await fetch(GROQ_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || 'TTS request failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}
