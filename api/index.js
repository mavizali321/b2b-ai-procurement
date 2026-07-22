import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

const systemPrompt = `You are an expert B2B Procurement AI Agent.
Your job is to extract ALL requested products from the client's message and generate a structured multi-item RFQ array.

CRITICAL INSTRUCTIONS:
- Always respond with a helpful conversational text message first.
- Then, output a valid JSON block inside a markdown code block (\`\`\`json ... \`\`\`).
- You MUST process ALL requested items in the request. Never limit to just one item.
- The JSON block strictly must match this structure:

\`\`\`json
{
  "product_found": true,
  "items": [
    {
      "name": "Dell Laptops",
      "sku": "B2B-DELL-LAT-5000",
      "requested_qty": 50,
      "final_price": 1200.00,
      "total": 60000.00
    }
  ]
}
\`\`\`
`;

app.post(['/api/chat', '/chat'], async (req, res) => {
    try {
        const userInput = req.body.message;
        if (!userInput) {
            return res.status(400).json({ success: false, error: "Empty message" });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userInput,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.15,
            }
        });

        res.json({ success: true, reply: response.text });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Vercel Serverless Export
export default app;