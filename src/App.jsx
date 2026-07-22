import React, { useState } from 'react';
import axios from 'axios';

export default function ProcurementAgentUI() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quoteData, setQuoteData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/chat', { message: input });
      
      // AI reply message se JSON block extract karna
      const responseText = res.data.reply;
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        setQuoteData(parsedJson);
      }
    } catch (err) {
      console.error("Error processing query:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-slate-900 text-white rounded-xl shadow-lg mt-10">
      <h2 className="text-2xl font-bold mb-4 text-blue-400">AI Procurement & Quoting Agent</h2>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="E.g., We need 100 enterprise laptops with i7 and 16GB RAM..." 
          className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Get Quote'}
        </button>
      </form>

      {/* Generated B2B Quotation Card */}
      {quoteData && (
        <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-emerald-400">Generated B2B Quotation</h3>
            <span className="text-xs bg-emerald-900 text-emerald-300 px-2.5 py-1 rounded-full">Status: Verified</span>
          </div>
          
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="py-2">Item / Spec</th>
                <th className="py-2">SKU</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Unit Price</th>
                <th className="py-2 text-right">Total Price</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700/50">
                <td className="py-3 font-medium">{quoteData.name}</td>
                <td className="py-3 text-slate-400 text-sm">{quoteData.sku}</td>
                <td className="py-3">{quoteData.requested_qty}</td>
                <td className="py-3">${quoteData.final_price}</td>
                <td className="py-3 text-right font-bold text-blue-400">${quoteData.total}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-5 flex justify-end">
            <button 
              onClick={() => alert('Quotation Saved & Purchase Order Issued!')}
              className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              Confirm & Save Quotation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}