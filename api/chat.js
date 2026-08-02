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
  const geminiRes = await fetch(
    `https://googleapis.com{apiKey}`,
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: "Hello! Analyze this text input." }]
          }
        ],
        generationConfig: { 
          temperature: 0.8, 
          maxOutputTokens: 200 
        }
      })
    }
  );

  const data = await geminiRes.json();
  console.log(data);

} catch (error) {
  console.error("Gemini API Error:", error);
} 