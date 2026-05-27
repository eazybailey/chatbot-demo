export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

  try {
    const incoming = await req.formData();
    const audio = incoming.get('audio');
    if (!audio || typeof audio === 'string') {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const filename = (audio.name && /\.(webm|mp4|m4a|mp3|wav|ogg|mpga|mpeg)$/i.test(audio.name))
      ? audio.name
      : 'audio.webm';

    const outgoing = new FormData();
    outgoing.append('file', audio, filename);
    outgoing.append('model', 'whisper-1');
    outgoing.append('language', 'en');
    outgoing.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: outgoing,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err.error?.message || 'Transcription failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ text: (data.text || '').trim() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
}
