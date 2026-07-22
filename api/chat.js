import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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

    if (!message) {
      return res.status(400).json({ reply: 'Requirement text is required.' });
    }

    if (!genAI) {
      return res.status(500).json({ 
        reply: 'GEMINI_API_KEY Vercel Environment Variables mein set nahi hai! Deployment settings check karein.' 
      });
    }

    // Using Gemini 2.5 Flash for high performance & structured parsing
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `You are an enterprise B2B Procurement AI Agent. 
When a user asks for items, extract items with fields: name, sku, requested_qty, final_price, total. 
ALWAYS return valid markdown text along with a JSON block in this structure:
\`\`\`json
{
  "product_found": true,
  "items": [
    {
      "name": "Item Name",
      "sku": "B2B-SKU-CODE",
      "requested_qty": 10,
      "final_price": 500,
      "total": 5000
    }
  ]
}
\`\`\``
    });

    const result = await model.generateContent(message);
    const responseText = result.response.text();

    return res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("❌ Agent API Execution Error:", error);
    
    // Return structured error so Frontend UI displays exact issue instead of breaking
    return res.status(500).json({ 
      reply: `⚠️ AI Agent Execution Error: ${error.message || 'Server timeout or rate limit.'}` 
    });
  }
}