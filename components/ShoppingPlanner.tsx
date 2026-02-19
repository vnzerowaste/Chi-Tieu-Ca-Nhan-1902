import React, { useState, useMemo } from 'react';
import { ShoppingItem, TransactionCategory, CardUsageStatus, FinancialEvent } from '../types';
import { MY_CARDS } from '../constants';
import { Plus, Calendar, Trash2, CheckSquare, Square, AlertCircle, ShoppingCart, TrendingUp, Lightbulb, Receipt, ArrowRight, Wallet, Sparkles } from 'lucide-react';

interface ShoppingPlannerProps {
  items: ShoppingItem[];
  upcomingBills?: FinancialEvent[];
  onAddItem: (item: ShoppingItem) => void;
  onRemoveItem: (id: string) => void;
  onToggleItem: (id: string) => void;
  cardUsage: CardUsageStatus[];
}

interface OptimizationPlan {
    itemId: string;
    itemName: string;
    suggestedCard: string;
    cashback: number;
    rate: number;
    reason: string;
}

const ShoppingPlanner: React.FC<ShoppingPlannerProps> = ({ 
    items, 
    upcomingBills = [],
    onAddItem, 
    onRemoveItem, 
    onToggleItem,
    cardUsage 
}) => {
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState<TransactionCategory>('Shopee');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Analysis State
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState<OptimizationPlan[]>([]);
  const [totalProjectedCashback, setTotalProjectedCashback] = useState(0);

  const handleAdd = () => {
      if (!name || price <= 0 || !date) return;
      
      const newItem: ShoppingItem = {
          id: Date.now().toString(),
          name,
          estimatedPrice: price,
          category,
          plannedDate: date,
          priority,
          isPurchased: false
      };
      
      onAddItem(newItem);
      setName('');
      setPrice(0);
  };

  // Group items by Date
  const groupedItems = useMemo(() => {
      const groups: Record<string, ShoppingItem[]> = {};
      const sortedItems = [...items].sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());

      sortedItems.forEach(item => {
          if (!groups[item.plannedDate]) groups[item.plannedDate] = [];
          groups[item.plannedDate].push(item);
      });
      return groups;
  }, [items]);

  // --- STRATEGY LOGIC ---
  const generateStrategy = () => {
      // 1. Combine all items (Shopping + Bills)
      const allItems = [
          ...items.filter(i => !i.isPurchased).map(i => ({ ...i, type: 'shopping' })),
          ...upcomingBills.map(b => ({
              id: b.id,
              name: b.title,
              estimatedPrice: b.amount,
              category: determineBillCategory(b.title), // Helper needed
              plannedDate: b.date,
              type: 'bill'
          }))
      ];

      const totalSpend = allItems.reduce((sum, i) => sum + i.estimatedPrice, 0);
      const optimizationPlan: OptimizationPlan[] = [];
      let currentTotalCashback = 0;

      // 2. Logic: Should we prioritize S Rewards (12%)?
      // S Rewards requires 5M spend.
      const canHitSRewards = totalSpend >= 5000000;

      // 3. Assign Cards
      allItems.forEach(item => {
          let bestCard = { id: '', name: '', rate: 0, cashback: 0, reason: '' };

          // Comparative approach for each item:
          const cardsToCompare = [
              { id: 'vp-shopee-plat-h', name: 'VPBank Shopee', rate: item.category === 'Shopee' || ['Electricity', 'Water', 'Internet'].includes(item.category) ? 0.1 : 0.001 },
              // Updated MSB to 10% (0.1)
              { id: 'msb-online-h', name: 'MSB Online', rate: ['Online', 'Shopee'].includes(item.category) ? 0.1 : 0.001 },
              { id: 'tcb-everyday', name: 'TCB Everyday', rate: ['Supermarket', 'Shopee'].includes(item.category) ? 0.05 : 0.005 },
              { id: 'vp-s-rewards-h', name: 'VPBank S Rewards', rate: canHitSRewards ? 0.12 : 0.001 } // Only valid if total spend > 5M
          ];

          // Sort by rate desc
          cardsToCompare.sort((a, b) => b.rate - a.rate);
          const winner = cardsToCompare[0];
          
          optimizationPlan.push({
              itemId: item.id,
              itemName: item.name,
              suggestedCard: winner.name,
              rate: winner.rate,
              cashback: item.estimatedPrice * winner.rate,
              reason: winner.id === 'vp-s-rewards-h' && canHitSRewards 
                  ? 'Gộp đơn đạt 5tr để nhận 12%' 
                  : `Tỷ lệ tốt nhất ${winner.rate * 100}%`
          });

          currentTotalCashback += item.estimatedPrice * winner.rate;
      });

      setPlan(optimizationPlan);
      setTotalProjectedCashback(currentTotalCashback);
      setShowPlan(true);
  };

  const determineBillCategory = (title: string): TransactionCategory => {
      const lower = title.toLowerCase();
      if (lower.includes('điện')) return 'Electricity';
      if (lower.includes('nước')) return 'Water';
      if (lower.includes('net') || lower.includes('wifi')) return 'Internet';
      return 'Online';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       {/* Left: Input Form */}
       <div className="lg:col-span-1 space-y-6">
           {/* Add Item Form */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                   <Calendar className="w-5 h-5 text-shopee" />
                   Thêm đồ cần mua
               </h3>
               
               <div className="space-y-3">
                   <div>
                       <label className="text-xs font-medium text-gray-500 mb-1 block">Tên món đồ</label>
                       <input 
                         type="text" 
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         placeholder="VD: Nước giặt, Tai nghe..."
                         className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                       />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                       <div>
                           <label className="text-xs font-medium text-gray-500 mb-1 block">Giá dự kiến</label>
                           <input 
                             type="number" 
                             value={price === 0 ? '' : price}
                             onChange={(e) => setPrice(Number(e.target.value))}
                             placeholder="0"
                             className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                           />
                       </div>
                       <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Danh mục</label>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                                className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                            >
                                <option value="Shopee">Shopee</option>
                                <option value="Supermarket">Siêu thị</option>
                                <option value="Online">Online Khác</option>
                                <option value="Electricity">Điện/Nước</option>
                            </select>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                       <div>
                           <label className="text-xs font-medium text-gray-500 mb-1 block">Ngày mua (Sale)</label>
                           <input 
                             type="date" 
                             value={date}
                             onChange={(e) => setDate(e.target.value)}
                             className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                           />
                       </div>
                       <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Độ ưu tiên</label>
                            <select 
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                            >
                                <option value="High">Cao (Cần gấp)</option>
                                <option value="Medium">Bình thường</option>
                                <option value="Low">Thấp</option>
                            </select>
                       </div>
                   </div>

                   <button 
                     onClick={handleAdd}
                     disabled={!name || price <= 0 || !date}
                     className="w-full bg-shopee text-white font-bold py-2.5 rounded-lg hover:bg-shopee-dark transition disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                   >
                       <Plus className="w-4 h-4" /> Thêm vào kế hoạch
                   </button>
               </div>
           </div>
           
           {/* Upcoming Bills Section (Read Only from SpendingManager) */}
           <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                <h4 className="font-bold text-purple-800 text-sm mb-3 flex items-center gap-2">
                   <Receipt className="w-4 h-4" /> Hóa đơn sắp tới
                </h4>
                {upcomingBills.length === 0 ? (
                    <p className="text-xs text-purple-600 italic">Không có hóa đơn nào chờ thanh toán.</p>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {upcomingBills.map(bill => (
                            <div key={bill.id} className="flex justify-between items-center bg-white p-2 rounded border border-purple-100 shadow-sm">
                                <div>
                                    <p className="text-xs font-bold text-gray-700">{bill.title}</p>
                                    <p className="text-[10px] text-gray-500">{bill.date}</p>
                                </div>
                                <span className="text-xs font-bold text-purple-700">{bill.amount.toLocaleString()}đ</span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-[10px] text-purple-800">💡 Mẹo: Hệ thống sẽ tự động tính toán gộp các hóa đơn này với đồ mua sắm để đạt điều kiện hoàn tiền thẻ VPBank S Rewards (12%).</p>
                </div>
           </div>
       </div>

       {/* Right: List & Optimization */}
       <div className="lg:col-span-2 space-y-6">
           
           {/* Action Bar */}
           {items.length > 0 && (
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 flex justify-between items-center text-white shadow-lg">
                    <div>
                        <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400"/> Phân tích Chiến lược Thẻ</h3>
                        <p className="text-xs text-gray-300 mt-1">Gộp đơn + Hóa đơn để tối ưu hoàn tiền</p>
                    </div>
                    <button 
                        onClick={generateStrategy}
                        className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition shadow-sm"
                    >
                        {showPlan ? 'Cập nhật phân tích' : 'Phân tích ngay'}
                    </button>
                </div>
           )}

           {/* Analysis Result Panel */}
           {showPlan && (
               <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-fadeIn">
                   <div className="flex justify-between items-end mb-4 border-b border-green-200 pb-3">
                       <div>
                           <h4 className="font-bold text-green-800 text-lg">Kế hoạch tối ưu</h4>
                           <p className="text-sm text-green-700">Đã gộp {items.length} món + {upcomingBills.length} hóa đơn</p>
                       </div>
                       <div className="text-right">
                           <p className="text-xs text-green-600 uppercase font-bold">Tổng hoàn tiền dự kiến</p>
                           <p className="text-2xl font-bold text-green-700">+{totalProjectedCashback.toLocaleString()} đ</p>
                       </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                           <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Chi tiết thẻ nên dùng</p>
                           <ul className="space-y-2 text-sm">
                               {plan.map(p => (
                                   <li key={p.itemId} className="flex justify-between items-center border-b border-dashed border-gray-100 last:border-0 pb-1 last:pb-0">
                                       <span className="truncate max-w-[150px] text-gray-700" title={p.itemName}>{p.itemName}</span>
                                       <div className="flex items-center gap-2">
                                           <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{p.suggestedCard}</span>
                                           <span className="font-bold text-green-600 text-xs">+{p.cashback.toLocaleString()}</span>
                                       </div>
                                   </li>
                               ))}
                           </ul>
                       </div>
                       <div className="bg-green-100 p-3 rounded-lg border border-green-200">
                           <p className="font-bold text-green-800 text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Chiến lược thực hiện</p>
                           <p className="text-xs text-green-900 leading-relaxed">
                               {totalProjectedCashback > 500000 
                                ? "Tuyệt vời! Bạn đã gom đủ đơn để đạt mốc tối ưu cao nhất. Hãy thanh toán các hóa đơn Điện/Nước bằng VPBank S Rewards (nếu tổng > 5tr) hoặc Shopee Platinum." 
                                : "Tổng chi tiêu chưa đủ lớn để kích hoạt các thẻ hạng cao (S Rewards). Hệ thống đã tự động chọn thẻ có tỷ lệ cơ bản tốt nhất cho từng món (MSB Online / Shopee Platinum)."}
                           </p>
                       </div>
                   </div>
               </div>
           )}

           {/* Normal Shopping List */}
           {Object.keys(groupedItems).length === 0 ? (
               <div className="text-center py-16 bg-white border border-dashed rounded-xl">
                   <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                   <p className="text-gray-500 font-medium">Chưa có kế hoạch mua sắm nào.</p>
                   <p className="text-sm text-gray-400">Thêm đồ cần mua để AI giúp bạn tối ưu thẻ nhé!</p>
               </div>
           ) : (
               Object.entries(groupedItems).map(([planDate, groupItems]: [string, ShoppingItem[]]) => {
                   const total = groupItems.reduce((s, i) => s + i.estimatedPrice, 0);
                   const isPast = new Date(planDate) < new Date(); 
                   
                   return (
                       <div key={planDate} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                           {/* Header Date */}
                           <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                               <div className="flex items-center gap-3">
                                   <div className={`flex flex-col items-center justify-center border rounded-lg w-12 h-12 bg-white shadow-sm shrink-0`}>
                                        <span className="text-[10px] text-gray-500 uppercase">{new Date(planDate).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="font-bold text-lg text-gray-800">{new Date(planDate).getDate()}</span>
                                   </div>
                                   <div>
                                       <h4 className="font-bold text-gray-800">Kế hoạch mua sắm</h4>
                                       <p className="text-xs text-gray-500">
                                           {groupItems.length} món • Tổng: <span className="font-bold text-shopee">{total.toLocaleString()} đ</span>
                                       </p>
                                   </div>
                               </div>
                               {isPast && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Đã qua ngày</span>}
                           </div>

                           {/* Items List */}
                           <div className="divide-y">
                               {groupItems.map(item => (
                                   <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition group">
                                       <div className="flex items-center gap-3">
                                           <button onClick={() => onToggleItem(item.id)} className="text-gray-400 hover:text-shopee transition">
                                               {item.isPurchased ? <CheckSquare className="w-5 h-5 text-green-500" /> : <Square className="w-5 h-5" />}
                                           </button>
                                           <div className={item.isPurchased ? "opacity-50 line-through" : ""}>
                                               <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                                               <div className="flex items-center gap-2 mt-0.5">
                                                   <span className="text-xs text-gray-500 bg-gray-100 px-1.5 rounded">{item.category}</span>
                                                   <span className={`text-[10px] px-1.5 rounded border ${
                                                       item.priority === 'High' ? 'border-red-200 text-red-600 bg-red-50' : 
                                                       item.priority === 'Medium' ? 'border-blue-200 text-blue-600 bg-blue-50' : 
                                                       'border-gray-200 text-gray-500'
                                                   }`}>
                                                       {item.priority === 'High' ? 'Gấp' : item.priority === 'Medium' ? 'Thường' : 'Thấp'}
                                                   </span>
                                               </div>
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-4">
                                           <div className="text-right">
                                               <span className={`font-bold text-sm block ${item.isPurchased ? 'text-gray-400' : 'text-gray-800'}`}>
                                                   {item.estimatedPrice.toLocaleString()} đ
                                               </span>
                                                {/* Show suggestion inline if plan exists */}
                                                {showPlan && (
                                                    <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">
                                                        {plan.find(p => p.itemId === item.id)?.suggestedCard}
                                                    </span>
                                                )}
                                           </div>
                                           <button onClick={() => onRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                               <Trash2 className="w-4 h-4" />
                                           </button>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )
               })
           )}
       </div>
    </div>
  );
};

export default ShoppingPlanner;