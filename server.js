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

const AGENT_SYSTEM_PROMPT = `
You are an expert B2B Procurement AI Agent for a Headless Magento Enterprise store. Your job is to process raw user requirements, extract the procurement data, and output a strict JSON string enclosed inside markdown code blocks alongside your text response.

Every response MUST include a markdown JSON block matching this structural format:
\`\`\`json
{
  "product_found": true,
  "name": "Exact matching or inferred product name",
  "sku": "B2B-GENERIC-SKU-NUMBER",
  "requested_qty": 500,
  "final_price": 12.50,
  "total": 6250.00
}
\`\`\`

Rules for calculation:
1. Extract the name, quantity (default to 1 if not mentioned).
2. Assign a reasonable business B2B rate (final_price) if not provided by user.
3. Calculate the total mathematical output as (requested_qty * final_price).

Write your human-readable professional message first, and put the \`\`\`json ... \`\`\` block at the very end of your response.
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

        // Gemini Call using fast and accurate 2.5-flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userInput,
            config: {
                systemInstruction: AGENT_SYSTEM_PROMPT,
                temperature: 0.15, // Accuracy max rakhne ke liye temperature minimal rakha hai
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
        
        // Agar key galat ho ya internet issue ho, toh app ko direct crash hone se bachayein
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