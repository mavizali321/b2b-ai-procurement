import React, { useState } from 'react';
import mockProducts from './data/mockMagentoProducts.json';

function App() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Welcome! Main aapka B2B Procurement Assistant hoon. Aapko aaj kis material ki requirement hai?' }
  ]);
  const [input, setInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState([]);
  
  // Mobile UI ke liye state: 'chat' view dikhana hai ya 'quote' view
  const [activeTab, setActiveTab] = useState('chat');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setInput('');

    const lowerInput = input.toLowerCase();

    // Mock API Delay simulation for better UX
    setTimeout(() => {
      if (lowerInput.includes('switch')) {
        const product = mockProducts[0];
        const qty = 500;
        const finalPrice = 8.50;
        
        setCurrentQuote([
          {
            ...product,
            requested_qty: qty,
            final_price: finalPrice,
            total: qty * finalPrice
          }
        ]);
        setMessages([...newMessages, { 
          sender: 'bot', 
          text: `Maine aapki requirement ke mutabiq Magento database se "${product.name}" dhoond liya hai. Bulk quantity discount apply ho chuka hai.` 
        }]);
        // Mobile user ko automatic quote tab par le jayein taaki achha experience mile
        if (window.innerWidth < 768) setActiveTab('quote');

      } else if (lowerInput.includes('cable') || lowerInput.includes('wire')) {
        const product = mockProducts[1];
        const qty = 20;
        const finalPrice = 78.00;
        
        setCurrentQuote([
          {
            ...product,
            requested_qty: qty,
            final_price: finalPrice,
            total: qty * finalPrice
          }
        ]);
        setMessages([...newMessages, { 
          sender: 'bot', 
          text: `Database match successful: "${product.name}" add kar diya gaya hai.` 
        }]);
        if (window.innerWidth < 768) setActiveTab('quote');
      } else {
        setMessages([...newMessages, { 
          sender: 'bot', 
          text: 'Abhi main sirf "switch" ya "cable" samajh sakta hoon. Phase 2 mein LLM integration karenge.' 
        }]);
      }
    }, 400);
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
            Magento DB: Active (Mocked)
          </span>
        </div>
      </header>

      {/* MOBILE INTERACTIVE TABS (Only visible on Mobile/Tablet screens) */}
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
            </div>

            {/* Sticky Prompt Input field container */}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-gray-900 p-2 rounded-xl border border-gray-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type requirement (e.g., Need 500 switches)..."
                className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-md shrink-0">
                Send
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
                {/* Responsive Matrix Grid / Table Alternative for micro screens */}
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
                          <td className="p-4 text-right text-amber-400 font-medium">${item.final_price.toFixed(2)}</td>
                          <td className="p-4 text-right font-bold text-emerald-400">${item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total pricing block */}
                <div className="p-4 bg-gray-850/80 border-t border-gray-800 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-medium">Estimated Grand Total:</span>
                  <span className="text-lg font-black text-emerald-400">
                    ${currentQuote.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Call to Action Trigger block */}
          {currentQuote.length > 0 && (
            <div className="mt-6 w-full shrink-0">
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2">
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