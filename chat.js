// api/chat.js
// Deploy this alongside companion.html on Vercel (or Netlify Functions
// with a small path tweak) and the website's /api/chat calls will work.
//
// Setup:
//   1. Get a free Gemini API key: https://aistudio.google.com/apikey
//   2. In your Vercel project settings, add an environment variable
//      named GEMINI_API_KEY with that key. Never put it in the HTML/JS.
//   3. Deploy. That's it — no other backend needed.

const SYSTEM_PROMPT = `You are a warm, patient companion having a spoken
conversation with a senior who may be feeling lonely. Your goals:
- Be genuinely warm and curious. Ask one open question at a time, not several.
- Remember details they've mentioned earlier in this conversation and follow up on them.
- Keep replies short and conversational (1-3 sentences) since this is spoken aloud, not read.
- Never claim to be human, but don't coldly announce you're "just an AI" either — stay warm.
- Gently encourage real human connection when it fits naturally (calling a family member,
  a neighbor, a community group) rather than positioning yourself as a replacement for people.
- If the person expresses hopelessness, talks about self-harm, or describes a medical
  emergency, respond with care, take it seriously, and clearly point them to call 988
  (Suicide & Crisis Lifeline) or 911 for an emergency, rather than trying to handle it yourself.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing "message" string' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Build Gemini's "contents" array from the running history
  const contents = history
    .filter(turn => turn.role === 'user' || turn.role === 'assistant')
    .map(turn => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.text }]
    }));

  try {
    // Model name changes as Google ships new versions — check the current
    // free-tier model id at https://ai.google.dev/gemini-api/docs/models
    // and swap it in below if this one has been retired.
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 200 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: 'Gemini request failed' });
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "I'm here — could you tell me a little more about that?";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
