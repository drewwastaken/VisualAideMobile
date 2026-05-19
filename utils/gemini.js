import { GEMINI_API_KEY } from './config';

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function extractTextFromImage(base64Image, mimeType = 'image/jpeg') {
  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
          {
            text: 'Extract all readable text from this image verbatim. Return only the extracted text with no commentary, formatting, or explanation.',
          },
        ],
      },
    ],
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log('Gemini response:', JSON.stringify(data));

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini API error');
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text extracted from image.');
  return text;
}