export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ reply: 'Method not allowed.' });

  try {
    const { message } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!message) return res.status(400).json({ reply: 'Message required.' });
    if (!apiKey) return res.status(500).json({ reply: '❌ GEMINI_API_KEY Missing in Vercel!' });

    // 👉 USE THIS LATEST ACTIVE MODEL STRING DIRECTLY (gemini-1.5-flash)
    const activeModel = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a B2B Procurement AI Agent.
Extract product requirements into standard Markdown response AND structured JSON block.
JSON format must be:
\`\`\`json
{
  "product_found": true,
  "items": [
    {
      "name": "Product Name",
      "sku": "B2B-SKU-CODE",
      "requested_qty": 10,
      "final_price": 250,
      "total": 2500
    }
  ]
}
\`\`\``;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            { text: `User request: ${message}` }
          ]
        }
      ]
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error details:", data);
      return res.status(500).json({ 
        reply: `Gemini API Error: ${data.error?.message || 'Failed to fetch from Gemini'}` 
      });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    return res.status(200).json({ reply: aiText });

  } catch (err) {
    console.error("Backend Server Error:", err);
    return res.status(500).json({ reply: `Server Error: ${err.message}` });
  }
}