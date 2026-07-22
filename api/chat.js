export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed. Use POST.' });
  }

  try {
    const { message } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!message) {
      return res.status(400).json({ reply: 'Message required.' });
    }

    if (!apiKey) {
      return res.status(500).json({ 
        reply: '❌ Vercel Settings mein GEMINI_API_KEY missing hai!' 
      });
    }

    // Direct Gemini REST API Call (Fastest & Zero NPM SDK Issues)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
      console.error("Gemini API Error:", data);
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