// api/recipe.js
// Vercel serverless function (Node.js runtime).
// Calls the Google Gemini API to turn a list of ingredients into recipe ideas.

const SYSTEM_PROMPT = `You are FridgeGenie, a practical home-cooking assistant whose job is to
stop food waste by helping people cook with what they already have.

Rules you MUST follow:
1. Only suggest recipes that can be made PRIMARILY from the ingredients the user listed.
   You may assume the user has basic pantry staples (salt, pepper, oil, water, sugar) even
   if they didn't mention them, but do NOT assume they have any other ingredient.
2. Respect the user's dietary preference and time constraint exactly as given.
3. Suggest exactly 3 different recipes, ordered from easiest/fastest to most involved.
4. Be realistic and specific — real dishes, real steps, no vague filler like "cook until done".
5. If the ingredients genuinely don't make sense together, still do your best to suggest
   something edible rather than refusing.
6. Respond ONLY with valid JSON matching this exact schema, no markdown, no commentary:

{
  "recipes": [
    {
      "title": "string",
      "time_estimate": "string, e.g. '20 minutes'",
      "difficulty": "Easy | Medium | Hard",
      "ingredients_used": ["string", "..."],
      "steps": ["string", "..."],
      "tip": "string, one short practical tip"
    }
  ]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ingredients, diet, time } = req.body || {};

  if (!ingredients || typeof ingredients !== 'string') {
    return res.status(400).json({ error: 'Please provide a list of ingredients.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  const userMessage = `Ingredients available: ${ingredients}
Dietary preference: ${diet || 'no restrictions'}
Time available: ${time || 'under 30 minutes'}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: 'The AI service failed to respond.' });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(502).json({ error: 'The AI returned an empty response.' });
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      console.error('Failed to parse AI JSON:', rawText);
      return res.status(502).json({ error: 'The AI response was not valid JSON.' });
    }

    return res.status(200).json({ recipes: parsed.recipes || [] });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
