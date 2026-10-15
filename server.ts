import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Increase JSON limit for base64 image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to get GoogleGenAI client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// AI OCR & Text Detection endpoint
app.post('/api/detect-text', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Using local smart text detection heuristics.',
        detectedTexts: []
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const prompt = `You are a high-precision OCR and typography analyzer for graphic design.
Analyze this image and identify all visible text elements, titles, subtitles, prices, paragraphs, and labels.
For each text block, detect its exact bounding box and typography style.

Return a JSON array of objects with the following schema:
[
  {
    "id": "t1",
    "text": "Exact text content",
    "box_2d": [ymin, xmin, ymax, xmax], // Normalized 0 to 1000 integers (ymin is top, xmin is left, ymax is bottom, xmax is right)
    "font_family": "Suggested Google font e.g. Inter, Montserrat, Playfair Display, Oswald, Bebas Neue, Roboto, Poppins, Dancing Script, Cinzel, Space Grotesk, Fira Code, Anton, Satisfy",
    "font_category": "sans-serif" | "serif" | "display" | "handwriting" | "monospace",
    "color": "#RRGGBB", // Dominant text hex color
    "background_color": "#RRGGBB", // Dominant background color directly underneath/behind this text
    "font_weight": 400 | 600 | 700 | 800 | 900,
    "font_style": "normal" | "italic",
    "text_align": "left" | "center" | "right",
    "text_transform": "none" | "uppercase" | "lowercase",
    "letter_spacing": 0, // approximate letter spacing in pixels
    "rotation": 0 // rotation angle in degrees if text is tilted
  }
]

IMPORTANT:
- Return ONLY valid raw JSON array.
- Do not wrap in markdown quotes if possible, or use standard json formatting.
- Detect both large titles and smaller body texts.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '[]';
    let detectedTexts = [];
    try {
      detectedTexts = JSON.parse(responseText);
    } catch {
      // Clean possible markdown code fences
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      detectedTexts = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      detectedTexts,
    });
  } catch (error: any) {
    console.error('Error in /api/detect-text:', error);
    return res.status(500).json({
      error: error.message || 'Failed to detect text with AI',
      detectedTexts: []
    });
  }
});

// Conversational AI Image Text Command endpoint
app.post('/api/ai-command', async (req, res) => {
  try {
    const { command, currentTexts } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command prompt is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const prompt = `You are a graphic design typography AI assistant for the PhoText image text editor.
The user wants to modify the typography layers on their image with this instruction: "${command}".

Here is the current list of text layers (JSON):
${JSON.stringify(currentTexts, null, 2)}

Instructions:
1. Apply the user request accurately (e.g. translation, changing discount numbers, updating titles, changing font styling, color, uppercase, removing/adding layers).
2. If the user asks to translate, translate the 'text' property while preserving or adapting typography.
3. If the user asks to change a price or date or discount, update accordingly.
4. If the user asks to style text (e.g. "make header gold and larger"), update the color and fontSize/weight.
5. Return the full modified array of text objects in the same JSON structure.
6. Return a short 1-sentence "summary" of what changes were made.

Return a JSON object with this exact shape:
{
  "summary": "Changed '50% OFF' to '70% FLASH SALE' and updated color to vibrant red.",
  "updatedTexts": [ ...same text objects array with updates... ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let result = { summary: 'Command applied', updatedTexts: currentTexts };
    try {
      result = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      result = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      summary: result.summary,
      updatedTexts: result.updatedTexts || currentTexts,
    });
  } catch (error: any) {
    console.error('Error in /api/ai-command:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process AI command',
    });
  }
});

// Server status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PhoText Studio server running at http://0.0.0.0:${port}`);
  });
}

startServer();
