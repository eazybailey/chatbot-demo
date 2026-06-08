export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { input, voice } = await req.json();

    if (!input || !input.trim()) {
      return new Response(JSON.stringify({ error: 'No input text provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Abort a slow upstream ourselves (12s) so we return a clean 504 the
    // client can retry, instead of hanging until the platform gateway
    // kills the request (~25s) and produces an opaque 504.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          // tts-1 (not tts-1-hd): the standard model is much faster to
          // generate, which matters for per-sentence streaming on an edge
          // function — the HD model's latency was causing gateway 504s.
          model: 'tts-1',
          input: input,
          voice: voice || 'shimmer',
          response_format: 'mp3',
          speed: 1.04,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || 'TTS request failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream audio directly from OpenAI to client
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    return new Response(
      JSON.stringify({ error: aborted ? 'TTS upstream timed out' : 'Internal server error' }),
      { status: aborted ? 504 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
