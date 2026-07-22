import { GoogleGenAI } from '@google/genai';

const systemPrompt = `You are an expert B2B Procurement AI Agent.
Your job is to extract ALL requested products from the client's message and generate a structured multi-item RFQ array with REALISTIC ESTIMATED B2B UNIT PRICES in USD.

CRITICAL INSTRUCTIONS:
- Always respond with a helpful conversational text message first.
- Then, output a valid JSON block inside a markdown code block (\`\`\`json ... \`\`\`).
- You MUST estimate realistic wholesale unit prices for each item (e.g., Laptops $800-$1500, Mice $15-$40, Switches $300-$1000). Never return 0 for price.
- Return pricing keys as BOTH "price" and "final_price" so frontend state maps it seamlessly.
- The JSON block strictly must match this structure:

\`\`\`json
{
  "product_found": true,
  "items": [
    {
      "name": "Dell Laptops",
      "sku": "B2B-DELL-LAT-GENERIC",
      "requested_qty": 50,
      "price": 1200.00,
      "final_price": 1200.00,
      "total": 60000.00
    }
  ]
}
\`\`\`
`;

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message missing' });
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY environment variable missing' });
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.15,
      },
    });

    return res.status(200).json({ success: true, reply: response.text });
  } catch (error) {
    console.error('Gemini Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}