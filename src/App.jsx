import React, { useState, useRef, useEffect } from 'react';
import mockProducts from './data/mockMagentoProducts.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // FIXED: Named import for Vite ESM compatibility

function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Welcome! Main aapka B2B Procurement Assistant hoon. Aapko aaj kis material ki requirement hai?' }
  ]);
  const [input, setInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // FIXED PDF GENERATOR FUNCTION
  const handleDownloadPDF = () => {
    if (currentQuote.length === 0) {
      alert("Koi active quote maujood nahi hai!");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Header / Branding Box
      doc.setFillColor(15, 23, 42); // Dark slate bg
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("NextGen Procurement Core", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Official B2B RFQ Quotation Document", 14, 27);
      
      // Date & Quote Ref
      doc.setTextColor(50, 50, 50);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 45);
      doc.text(`Quote Ref: RFQ-${Math.floor(100000 + Math.random() * 900000)}`, 14, 52);

      // Dynamic Table Rows Data
      const tableRows = currentQuote.map(item => [
        item.name || 'N/A',
        item.sku || 'B2B-SKU',
        item.requested_qty || 1,
        `$${Number(item.final_price || 0).toFixed(2)}`,
        `$${Number(item.total || 0).toFixed(2)}`
      ]);

      // FIXED: Invoking autoTable directly as a standalone function
      autoTable(doc, {
        startY: 60,
        head: [['Material Name', 'SKU', 'Qty', 'Unit Price', 'Subtotal']],
        body: tableRows,
        headStyles: { fillColor: [79, 70, 229] }, // Indigo header color
        theme: 'grid',
      });

      // Grand Total & Position calculation
      const grandTotal = currentQuote.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 130;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: $${grandTotal.toFixed(2)}`, 140, finalY);

      // Save PDF File
      doc.save(`B2B_Quotation_${Date.now()}.pdf`);

    } catch (pdfError) {
      console.error("❌ PDF Generation Error:", pdfError);
      alert("PDF generate karte hue issue aya: " + pdfError.message);
    }
  };

  // Mobile UI state: 'chat' or 'quote' view
  const [activeTab, setActiveTab] = useState('chat');

  // Ref for auto-scrolling chat window
  const chatBottomRef = useRef(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (data.reply) {
        let cleanText = data.reply;
        
        // 🔍 EXTENDED REGEX: Matches markdown json code blocks or standalone raw JSON objects
        const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```|(\{[\s\S]*"product_found"[\s\S]*\})/i;
        const match = data.reply.match(jsonRegex);

        if (match) {
          const jsonString = match[1] || match[2] || match[0];
          try {
            const parsedJson = JSON.parse(jsonString.trim());
            
            if (parsedJson.product_found) {
              // Standardize numeric data to prevent crash on .toFixed()
              const sanitizedItem = {
                ...parsedJson,
                requested_qty: Number(parsedJson.requested_qty) || 1,
                final_price: Number(parsedJson.final_price) || 0,
                total: Number(parsedJson.total) || (Number(parsedJson.requested_qty || 1) * Number(parsedJson.final_price || 0))
              };

              // Live RFQ Table ko dynamic data se fill karna!
              setCurrentQuote([sanitizedItem]);
              
              // Mobile screen switch to quote tab
              if (window.innerWidth < 768) setActiveTab('quote');
            }
            
            // Clean conversational response from JSON blocks
            cleanText = data.reply.replace(jsonRegex, '').trim();
          } catch (jsonErr) {
            console.error("Failed to parse AI JSON:", jsonErr);
          }
        }

        setMessages((prev) => [...prev, { sender: 'bot', text: cleanText || "Quote manifest updated below." }]);
      } else {
        setMessages((prev) => [...prev, { sender: 'bot', text: 'Oops! Proper response nahi mila.' }]);
      }
    } catch (error) {
      console.error("Error communicating with backend:", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Backend server se connection toot gaya.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* GLOBAL ENTERPRISE HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-xl shadow-md shadow-indigo-900/30">💼</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">NextGen Procurement Core</h1>
            <p className="text-xs text-gray-400">AI-Powered Headless Magento B2B Agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-lg font-medium border border-gray-700">
            Ollama Llama3: Connected
          </span>
        </div>
      </header>

      {/* MOBILE INTERACTIVE TABS */}
      <div className="md:hidden flex bg-gray-900 border-b border-gray-800 p-2 gap-2 shrink-0">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
            activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          💬 AI Assistant
        </button>
        <button 
          onClick={() => setActiveTab('quote')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'quote' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          📄 Live RFQ Quote
          {currentQuote.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>
      </div>

      {/* MAIN WORKSPACE SPLIT CONTAINER */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT PANEL: AI Chat Agent */}
        <section className={`w-full md:w-1/2 flex flex-col justify-between bg-gray-900/40 p-4 sm:p-6 transition-all duration-300 ${
          activeTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex flex-col h-full justify-between gap-4">
            {/* Chat Screen Messages viewport */}
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[calc(100vh-240px)] md:max-h-[calc(100vh-180px)] pr-1">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-md p-4 rounded-2xl shadow-sm border border-transparent leading-relaxed text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-gray-900 text-gray-200 border-gray-800 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-900 text-gray-400 border border-gray-800 p-4 rounded-2xl rounded-bl-none text-sm flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    Agent is thinking...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input field container */}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-gray-900 p-2 rounded-xl border border-gray-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder={loading ? "Waiting for Agent..." : "Type requirement (e.g., Need 500 laptops)..."}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-md shrink-0 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT PANEL: Live Quoting Core engine */}
        <section className={`w-full md:w-1/2 flex flex-col bg-gray-950 p-4 sm:p-6 border-t md:border-t-0 md:border-l border-gray-800 justify-between transition-all duration-300 overflow-y-auto ${
          activeTab === 'quote' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="w-full">
            <h2 className="text-md font-bold text-gray-400 tracking-wide uppercase mb-4 hidden md:block">
              Live RFQ Document Manifest
            </h2>

            {currentQuote.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 border border-dashed border-gray-800 rounded-2xl p-6 text-center">
                <span className="text-3xl mb-2">📋</span>
                <p className="text-sm font-medium">No live active quotes found.</p>
                <p className="text-xs text-gray-600 mt-1">Submit your requirements to populate procurement table.</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="bg-gray-850/50 border-b border-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-4">Material / SKU</th>
                        <th className="p-4 text-center">Qty</th>
                        <th className="p-4 text-right">B2B Rate</th>
                        <th className="p-4 text-right">Net Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                      {currentQuote.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-850/30 transition-colors">
                          <td className="p-4">
                            <span className="font-semibold text-gray-100 block truncate max-w-[180px] sm:max-w-xs">{item.name}</span>
                            <span className="text-xs text-indigo-400 font-mono mt-0.5 block">{item.sku}</span>
                          </td>
                          <td className="p-4 text-center font-medium text-gray-300">{item.requested_qty}</td>
                          <td className="p-4 text-right text-amber-400 font-medium">${Number(item.final_price).toFixed(2)}</td>
                          <td className="p-4 text-right font-bold text-emerald-400">${Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-gray-850/80 border-t border-gray-800 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-medium">Estimated Grand Total:</span>
                  <span className="text-lg font-black text-emerald-400">
                    ${currentQuote.reduce((acc, curr) => acc + Number(curr.total || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {currentQuote.length > 0 && (
            <div className="mt-6 w-full shrink-0">
              <button 
                type="button"
                onClick={handleDownloadPDF}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📥</span> Download Official B2B PDF Quote
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;