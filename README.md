# 💼 NextGen Procurement Core — B2B AI Agent

[![Live Demo](https://img.shields.io/badge/Demo-Live%20Vercel-brightgreen?style=for-the-badge&logo=vercel)](https://b2b-ai-procurement.vercel.app/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Serverless](https://img.shields.io/badge/Backend-Vercel%20Serverless-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

An intelligent, autonomous B2B Procurement and RFQ (Request for Quotation) Agent powered by Google's Gemini 2.5 Flash model and built on a serverless micro-architecture. It transforms unstructured client requirements into structured, real-time interactive procurement manifests and downloadable PDF quotes.

---

## 🚀 Live Demo

🔗 **App URL:** [https://b2b-ai-procurement.vercel.app/](https://b2b-ai-procurement.vercel.app/)

---

## 🏗️ Architectural Flow Diagram

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT SIDE (Browser)                            |
|                                                                                   |
|  +------------------------+        HTTP POST        +--------------------------+  |
|  |   User Requirement     |  ====================>  |   Interactive Live RFQ   |  |
|  |   Prompt / Chat UI     |                         |   Manifest Table         |  |
|  +------------------------+                         +--------------------------+  |
+-------------------|----------------------------------------------^----------------+
                    |                                              |
                    | Request Payload (/api/chat)                  | JSON + Text
                    v                                              |
+------------------------------------------------------------------|----------------+
|                             VERCEL SERVERLESS LAYER              |                |
|                                                                  |                |
|  +---------------------------------------------------------------+-------------+  |
|  |  api/chat.js (Serverless Handler)                                           |  |
|  |  - Enforces System Instructions & Markdown JSON Output Format               |  |
|  |  - Secures API Keys via Environment Variables                               |  |
|  +-----------------------------------|-----------------------------------------+  |
+--------------------------------------|--------------------------------------------+
                                       |
                                       | API Call
                                       v
+-----------------------------------------------------------------------------------+
|                                GOOGLE GEMINI AI API                               |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |  Gemini 2.5 Flash Model                                                     |  |
|  |  - Entity Extraction (SKUs, Quantities, Items, Pricing)                     |  |
|  |  - Markdown-wrapped Structured Output Parsing                               |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+