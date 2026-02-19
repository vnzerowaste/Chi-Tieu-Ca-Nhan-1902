import React, { useState } from 'react';
import { MY_CARDS } from '../constants';
import { OptimizationResult, CardUsageStatus, TransactionCategory } from '../types';
import { adviseCardUsage } from '../services/geminiService';
import { calculateCashbackForTransaction } from '../utils/cardLogic';
import { Calculator, Sparkles, AlertCircle } from 'lucide-react';

interface CardOptimizerProps {
  cardUsage: CardUsageStatus[];
}

const CardOptimizer: React.FC<CardOptimizerProps> = ({ cardUsage }) => {
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<TransactionCategory>('Shopee');
  const [result, setResult] = useState<OptimizationResult[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Deterministic calculation
  const calculateBestCard = () => {
    const results: OptimizationResult[] = MY_CARDS.map(card => {
      // Get current accumulated cashback from props
      const usage = cardUsage.find(u => u.cardId === card.id);
      const currentAccumulated = usage ? usage.totalCashback : 0;

      const { cashback, reason } = calculateCashbackForTransaction(card, amount, category, currentAccumulated);

      return {
        cardId: card.id,
        cardName: card.name,
        cashbackAmount: cashback,
        finalPrice: amount - cashback,
        reason: reason,
        isMaxedOut: cashback === 0 && amount > 0 && card.maxCashback > 0
      };
    });

    // Sort by highest cashback
    results.sort((a, b) => b.cashbackAmount - a.cashbackAmount);
    setResult(results);
  };

  const handleAnalyze = async () => {
    if (amount <= 0) return;
    setLoading(true);
    setAiAdvice('');
    
    // 1. Run deterministic calc
    calculateBestCard();

    // 2. Prepare status string for AI
    const statusStr = MY_CARDS.map(c => {
       const u = cardUsage.find(usage => usage.cardId === c.id);
       const rem = u ? (c.maxCashback - u.totalCashback) : c.maxCashback;
       return `${c.name}: Còn hạn mức ${rem > 0 ? rem.toLocaleString() : 0}đ`;
    }).join('. ');

    // 3. Run AI advice for nuance
    const advice = await adviseCardUsage(amount, category, statusStr);
    setAiAdvice(advice);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Calculator className="w-6 h-6 text-shopee" />
        Máy tính Hoàn Tiền (Có xét hạn mức)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị đơn hàng dự kiến (VNĐ)</label>
          <input
            type="number"
            value={amount === 0 ? '' : amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Ví dụ: 500000"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-shopee focus:border-shopee outline-none transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nơi mua / Ngành hàng</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TransactionCategory)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-shopee focus:border-shopee outline-none transition"
          >
            <option value="Shopee">Shopee</option>
            <option value="Online">Online Khác</option>
            <option value="VPBankNEO">App VPBank NEO</option>
            <option value="Supermarket">Siêu thị</option>
            <option value="Electricity">Tiền điện/nước</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={loading || amount <= 0}
        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all ${
          loading || amount <= 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-shopee hover:bg-shopee-dark active:scale-95'
        }`}
      >
        {loading ? 'Đang phân tích...' : 'Tìm thẻ tốt nhất'}
      </button>

      {/* Results Section */}
      {result.length > 0 && (
        <div className="mt-8 space-y-6">
          {/* Top Recommendation */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Sparkles className="w-8 h-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-800">Khuyên dùng: {result[0].cardName}</h3>
              <p className="text-green-700">
                Hoàn tiền dự kiến: <span className="font-bold text-xl">{result[0].cashbackAmount.toLocaleString()} đ</span>
              </p>
              <p className="text-sm text-green-600 mt-1">{result[0].reason}</p>
            </div>
          </div>

          {/* AI Advice */}
          {aiAdvice && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                 🤖 Góc nhìn AI
              </h4>
              <p className="text-blue-800 text-sm whitespace-pre-line">{aiAdvice}</p>
            </div>
          )}

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="py-2">Thẻ</th>
                  <th className="py-2 text-right">Hoàn tiền</th>
                  <th className="py-2 text-right">Giá thực tế</th>
                </tr>
              </thead>
              <tbody>
                {result.map((r, idx) => (
                  <tr key={r.cardId} className={`border-b last:border-0 ${idx === 0 ? 'bg-yellow-50' : ''}`}>
                    <td className="py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                          {r.cardName}
                          {r.isMaxedOut && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Full</span>}
                      </div>
                      {idx === 0 && <span className="ml-2 text-xs bg-shopee text-white px-2 py-0.5 rounded-full">Best</span>}
                    </td>
                    <td className={`py-3 text-right font-bold ${r.cashbackAmount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        +{r.cashbackAmount.toLocaleString()} đ
                    </td>
                    <td className="py-3 text-right text-gray-600">{(r.finalPrice).toLocaleString()} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-100 p-3 rounded-lg">
             <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
             <p>Hệ thống đã tự động tính toán dựa trên số dư hoàn tiền còn lại của từng thẻ trong tháng.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardOptimizer;