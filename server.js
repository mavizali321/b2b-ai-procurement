import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Environment variables load karein (.env file se)
dotenv.config();

const app = express();

// JSON body parser size limits ke sath configured hai
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// BULLETPROOF CORS: Browser blocks ko bypass karne ke liye custom headers setup
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Preflight requests handling
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Key format validator to prevent silent runtime crashes
if (!GEMINI_KEY) {
    console.warn("⚠️ ERROR: 'GEMINI_API_KEY' environment variable .env file mein nahi mili!");
} else if (!GEMINI_KEY.startsWith("AIzaSy")) {
    console.warn("⚠️ WARNING: Aapki API Key 'AIzaSy' se shuru nahi ho rahi. Yeh invalid ho sakti hai!");
}

// Client ko explicitly API Key pass kar ke initialize kiya taaki fallback issues na hon
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
    },
    {
      "name": "Logitech Mice",
      "sku": "B2B-LOGI-MX-001",
      "requested_qty": 20,
      "final_price": 25.00,
      "total": 500.00
    }
  ]
}
\`\`\`

Rules:
1. Always parse EVERY item requested by the user into the "items" array.
2. Calculate "total" as requested_qty * final_price for each item.
`;

app.post('/api/chat', async (req, res) => {
    try {
        const userInput = req.body.message;

        console.log("📥 Raw Requirement Received:", userInput);

        if (!userInput) {
            return res.status(400).json({ 
                success: false, 
                error: "Request body mein 'message' field empty hai!" 
            });
        }

        // Gemini Call using gemini-1.5-flash
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: userInput,
            config: {
                systemInstruction: systemPrompt, // FIXED: Matches systemPrompt variable name
                temperature: 0.15,
            }
        });

        const generatedText = response.text;

        console.log("📤 Agent Response Generated Successfully.");

        // React App expectation response structure
        res.json({
            success: true,
            reply: generatedText
        });

    } catch (error) {
        console.error("❌ Gemini Call Crash Error Details:", error);
        
        res.status(500).json({ 
            success: false, 
            error: "Gemini Agent could not process the text.",
            details: error.message 
        });
    }
});

// Port strictly 5000 par locked hai taaki app.jsx se easily sync ho sake
const PORT = 5000;

app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🚀 B2B PROCUREMENT AGENT READY!`);
    console.log(`🔌 Listening directly on: http://localhost:${PORT}`);
    console.log(`📦 Synced with React App.jsx fetch request`);
    console.log(`=============================================================\n`);
});