const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODEL = 'gemini-1.5-flash';

async function generateWithGemini(systemPrompt, userMessage, context, options = {}) {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key not set');
    return null;
  }
  try {
    let finalContent = '';
    if (context) {
      finalContent += `Here is relevant legal information from the Nepal law knowledge base to help answer:\n\n${context}\n\n`;
    }
    finalContent += userMessage;

    const parts = [];
    if (systemPrompt) {
      parts.push({ text: systemPrompt + '\n\nIMPORTANT: Follow the above instructions when responding to the user.' });
    }
    parts.push({ text: finalContent });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens || 800,
          topP: options.topP ?? 0.9
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '';
  } catch (error) {
    console.error('Gemini API error:', error.message);
    if (error.response) {
      console.error('Gemini API response:', error.response.status, error.response.data?.error?.message);
    }
    return null;
  }
}

module.exports = { generateWithGemini, GEMINI_API_KEY };
