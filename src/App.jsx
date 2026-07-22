import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function App() {
  // 1. LOCAL STORAGE PERSISTENCE SETUP
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('b2b_chat_messages');
    return saved ? JSON.parse(saved) : [
      { sender: 'bot', text: 'Welcome! Main aapka B2B Procurement Assistant hoon. Aapko aaj kis material ki requirement hai?' }
    ];
  });

  const [currentQuote, setCurrentQuote] = useState(() => {
    const saved = localStorage.getItem('b2b_active_quote');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedQuotesHistory, setSavedQuotesHistory] = useState(() => {
    const saved = localStorage.getItem('b2b_quote_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const chatBottomRef = useRef(null);

  // Sync with Local Storage on State Changes
  useEffect(() => {
    localStorage.setItem('b2b_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('b2b_active_quote', JSON.stringify(currentQuote));
  }, [currentQuote]);

  useEffect(() => {
    localStorage.setItem('b2b_quote_history', JSON.stringify(savedQuotesHistory));
  }, [savedQuotesHistory]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // 2. INLINE TABLE EDITING & DELETION HANDLERS
  const handleQuantityChange = (index, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    const updated = [...currentQuote];
    updated[index].requested_qty = qty;
    updated[index].total = qty * Number(updated[index].final_price || 0);
    setCurrentQuote(updated);
  };

  const handlePriceChange = (index, newPrice) => {
    const price = Math.max(0, Number(newPrice) || 0);
    const updated = [...currentQuote];
    updated[index].final_price = price;
    updated[index].total = Number(updated[index].requested_qty || 1) * price;
    setCurrentQuote(updated);
  };

  const handleDeleteItem = (index) => {
    const updated = currentQuote.filter((_, i) => i !== index);
    setCurrentQuote(updated);
  };

  // 3. SAVE TO HISTORY & DOWNLOAD PDF
  const handleDownloadPDF = (quoteItems = currentQuote, refId = null) => {
    if (!quoteItems || quoteItems.length === 0) {
      alert("Koi active quote maujood nahi hai!");
      return;
    }

    try {
      const doc = new jsPDF();
      const quoteRef = refId || `RFQ-${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Branding Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("NextGen Procurement Core", 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Official B2B RFQ Quotation Document", 14, 27);
      
      // Meta Info
      doc.setTextColor(50, 50, 50);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 45);
      doc.text(`Quote Ref: ${quoteRef}`, 14, 52);

      const tableRows = quoteItems.map(item => [
        item.name || 'N/A',
        item.sku || 'B2B-SKU',
        item.requested_qty || 1,
        `$${Number(item.final_price || 0).toFixed(2)}`,
        `$${Number(item.total || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 60,
        head: [['Material Name', 'SKU', 'Qty', 'Unit Price', 'Subtotal']],
        body: tableRows,
        headStyles: { fillColor: [79, 70, 229] },
        theme: 'grid',
      });

      const grandTotal = quoteItems.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 130;
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: $${grandTotal.toFixed(2)}`, 140, finalY);

      doc.save(`${quoteRef}_Quotation.pdf`);

      // Archive Quote in History if new
      if (!refId) {
        const newHistoryRecord = {
          id: quoteRef,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: quoteItems,
          total: grandTotal
        };
        setSavedQuotesHistory(prev => [newHistoryRecord, ...prev]);
      }

    } catch (pdfError) {
      console.error("❌ PDF Error:", pdfError);
      alert("PDF issue: " + pdfError.message);
    }
  };

  const handleClearAllData = () => {
    if (window.confirm("Kiya aap tamaam chat aur history clear karna chahte hain?")) {
      localStorage.clear();
      setMessages([{ sender: 'bot', text: 'Welcome! Main aapka B2B Procurement Assistant hoon. Aapko aaj kis material ki requirement hai?' }]);
      setCurrentQuote([]);
      setSavedQuotesHistory([]);
    }
  };

  // 4. API CHAT HANDLER
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (data.reply) {
        let cleanText = data.reply;
        const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```|(\{[\s\S]*"product_found"[\s\S]*\})/i;
        const match = data.reply.match(jsonRegex);

        if (match) {
          const jsonString = match[1] || match[2] || match[0];
          try {
            const parsedJson = JSON.parse(jsonString.trim());
            
            if (parsedJson.product_found && Array.isArray(parsedJson.items)) {
              const sanitizedItems = parsedJson.items.map(item => ({
                ...item,
                requested_qty: Number(item.requested_qty) || 1,
                final_price: Number(item.final_price) || 0,
                total: Number(item.total) || ((Number(item.requested_qty) || 1) * (Number(item.final_price) || 0))
              }));

              setCurrentQuote(sanitizedItems);
              if (window.innerWidth < 768) setActiveTab('quote');
            }
            cleanText = data.reply.replace(jsonRegex, '').trim();
          } catch (jsonErr) {
            console.error("JSON Parsing Error:", jsonErr);
          }
        }

        setMessages((prev) => [...prev, { sender: 'bot', text: cleanText || "Live RFQ Manifest updated below." }]);
      }
    } catch (error) {
      console.error("Connection Error:", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: 'Backend server se connection toot gaya.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans relative selection:bg-indigo-500 selection:text-white">
      
      {/* GLOBAL ENTERPRISE HEADER */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4 sm:px-6 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-xl shadow-md shadow-indigo-900/30">💼</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">NextGen Procurement Core</h1>
            <p className="text-xs text-gray-400">AI-Powered Headless Magento B2B Agent</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>📜</span> History ({savedQuotesHistory.length})
          </button>
          <button 
            onClick={handleClearAllData}
            title="Reset Chat & Local Storage"
            className="bg-red-900/30 hover:bg-red-800/50 border border-red-800/50 text-red-300 text-xs font-semibold px-2.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            🗑️
          </button>
        </div>
      </header>

      {/* MOBILE TABS */}
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

      {/* MAIN SPLIT VIEW */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT PANEL: AI Chat */}
        <section className={`w-full md:w-1/2 flex flex-col justify-between bg-gray-900/40 p-4 sm:p-6 transition-all duration-300 ${
          activeTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex flex-col h-full justify-between gap-4">
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

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-900 text-gray-400 border border-gray-800 p-4 rounded-2xl rounded-bl-none text-sm flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    Agent is processing multi-item RFQ...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-gray-900 p-2 rounded-xl border border-gray-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder={loading ? "Waiting for Agent..." : "Type requirement (e.g., Need 50 Laptops, 10 Mice)..."}
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

        {/* RIGHT PANEL: Live RFQ Manifest with Inline Editing */}
        <section className={`w-full md:w-1/2 flex flex-col bg-gray-950 p-4 sm:p-6 border-t md:border-t-0 md:border-l border-gray-800 justify-between transition-all duration-300 overflow-y-auto ${
          activeTab === 'quote' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="w-full">
            <div className="flex justify-between items-center mb-4 hidden md:flex">
              <h2 className="text-md font-bold text-gray-400 tracking-wide uppercase">
                Live RFQ Document Manifest
              </h2>
              {currentQuote.length > 0 && (
                <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800/60 px-2.5 py-1 rounded-full font-semibold">
                  {currentQuote.length} Items Live
                </span>
              )}
            </div>

            {currentQuote.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 border border-dashed border-gray-800 rounded-2xl p-6 text-center">
                <span className="text-3xl mb-2">📋</span>
                <p className="text-sm font-medium">No active RFQ manifest found.</p>
                <p className="text-xs text-gray-600 mt-1">Submit your requirements to populate procurement table.</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[550px]">
                    <thead>
                      <tr className="bg-gray-850/50 border-b border-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-3.5">Material / SKU</th>
                        <th className="p-3.5 text-center w-24">Qty</th>
                        <th className="p-3.5 text-right w-32">B2B Rate ($)</th>
                        <th className="p-3.5 text-right">Subtotal</th>
                        <th className="p-3.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-sm">
                      {currentQuote.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-850/30 transition-colors">
                          <td className="p-3.5">
                            <span className="font-semibold text-gray-100 block truncate max-w-[160px] sm:max-w-xs">{item.name}</span>
                            <span className="text-xs text-indigo-400 font-mono mt-0.5 block">{item.sku}</span>
                          </td>
                          {/* INLINE EDITABLE QUANTITY */}
                          <td className="p-3.5 text-center">
                            <input 
                              type="number"
                              min="1"
                              value={item.requested_qty}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              className="w-16 bg-gray-950 border border-gray-700 text-amber-400 font-bold text-center rounded-lg py-1 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          {/* INLINE EDITABLE RATE */}
                          <td className="p-3.5 text-right">
                            <input 
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.final_price}
                              onChange={(e) => handlePriceChange(idx, e.target.value)}
                              className="w-24 bg-gray-950 border border-gray-700 text-amber-400 font-bold text-right rounded-lg py-1 px-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="p-3.5 text-right font-bold text-emerald-400">
                            ${Number(item.total || 0).toFixed(2)}
                          </td>
                          {/* DELETE ROW BUTTON */}
                          <td className="p-3.5 text-center">
                            <button 
                              onClick={() => handleDeleteItem(idx)}
                              className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                              title="Delete Item"
                            >
                              🗑️
                            </button>
                          </td>
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
                onClick={() => handleDownloadPDF(currentQuote)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📥</span> Download Official B2B PDF Quote
              </button>
            </div>
          )}
        </section>

      </main>

      {/* 5. MULTI-QUOTE HISTORY SIDE DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md bg-gray-900 border-l border-gray-800 h-full flex flex-col justify-between p-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <h3 className="font-bold text-white text-base">Archived RFQ Quotes</h3>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
                {savedQuotesHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No saved quote history found.<br/>Generate & download quotes to see history here.
                  </div>
                ) : (
                  savedQuotesHistory.map((hist) => (
                    <div key={hist.id} className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-2 hover:border-gray-700 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-bold text-indigo-400">{hist.id}</span>
                          <span className="text-xs text-gray-500 block">{hist.date} at {hist.time}</span>
                        </div>
                        <span className="text-sm font-black text-emerald-400">${hist.total.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {hist.items.length} Material(s): {hist.items.map(i => i.name).join(', ')}
                      </div>
                      <button 
                        onClick={() => handleDownloadPDF(hist.items, hist.id)}
                        className="mt-1 w-full bg-gray-800 hover:bg-indigo-600 text-gray-200 hover:text-white text-xs font-semibold py-2 rounded-lg border border-gray-700 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>📥</span> Re-Download PDF
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-full bg-gray-800 text-gray-300 text-sm py-2.5 rounded-xl font-semibold hover:bg-gray-700 cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;