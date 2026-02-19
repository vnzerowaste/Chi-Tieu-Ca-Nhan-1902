import React, { useState, useMemo } from 'react';
import { Transaction, CreditCard, CardUsageStatus, TransactionCategory, FinancialEvent } from '../types';
import { MY_CARDS } from '../constants';
import { calculateCashbackForTransaction } from '../utils/cardLogic';
import { analyzeSpendingHistory } from '../services/geminiService';
import { PlusCircle, Wallet, History, Zap, Sparkles, Loader2, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, Store, Trash2, CheckCircle2, AlertTriangle, Target, Pencil, X, Save, CalendarClock, ArrowUpCircle, ArrowDownCircle, Banknote, CalendarDays, Lock } from 'lucide-react';

interface SpendingManagerProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  onRemoveTransaction: (id: string) => void;
  onEditTransaction: (t: Transaction) => void;
  onClearAllTransactions: () => void;
  cardUsage: CardUsageStatus[];
  
  // New props for Cash Flow
  financialEvents: FinancialEvent[];
  currentAsset: number;
  onUpdateAsset: (amount: number) => void;
  onAddEvent: (e: FinancialEvent) => void;
  onRemoveEvent: (id: string) => void;
  onToggleEvent: (id: string) => void;
}

const SpendingManager: React.FC<SpendingManagerProps> = ({ 
    transactions, 
    onAddTransaction, 
    onRemoveTransaction, 
    onEditTransaction, 
    onClearAllTransactions,
    cardUsage,
    financialEvents,
    currentAsset,
    onUpdateAsset,
    onAddEvent,
    onRemoveEvent,
    onToggleEvent
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'history' | 'report' | 'cashflow'>('cashflow');
  
  // Input State
  const [amount, setAmount] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<TransactionCategory>('Shopee');
  const [selectedCard, setSelectedCard] = useState<string>(MY_CARDS[0].id);
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Cash Flow Input State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventAmount, setNewEventAmount] = useState(0);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<'income' | 'expense'>('expense');

  // AI Analysis State
  const [analysis, setAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);

  // Derived Statistics
  const stats = useMemo(() => {
    const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);
    const totalCashback = transactions.reduce((acc, t) => acc + t.cashbackEarned, 0);
    const effectiveRate = totalSpent > 0 ? (totalCashback / totalSpent) * 100 : 0;
    
    // Group by Date
    const dailySpend: Record<string, number> = {};
    transactions.forEach(t => {
        dailySpend[t.date] = (dailySpend[t.date] || 0) + t.amount;
    });

    // Group by Category
    const categorySpend: Record<string, { spent: number, cashback: number }> = {};
    transactions.forEach(t => {
        if (!categorySpend[t.category]) categorySpend[t.category] = { spent: 0, cashback: 0 };
        categorySpend[t.category].spent += t.amount;
        categorySpend[t.category].cashback += t.cashbackEarned;
    });

    return { totalSpent, totalCashback, effectiveRate, dailySpend, categorySpend };
  }, [transactions]);

  // Cash Flow Stats
  const cashFlowStats = useMemo(() => {
      const pendingIncome = financialEvents
          .filter(e => e.type === 'income' && !e.isCompleted)
          .reduce((sum, e) => sum + e.amount, 0);
      
      const pendingExpense = financialEvents
          .filter(e => e.type === 'expense' && !e.isCompleted)
          .reduce((sum, e) => sum + e.amount, 0);

      // Sort events by date
      const sortedEvents = [...financialEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { pendingIncome, pendingExpense, sortedEvents };
  }, [financialEvents]);

  const priorityCard = useMemo(() => {
      // Find cards that have NOT met the min spend, sort by least remaining amount
      const needsSpend = cardUsage.filter(c => c.minSpend > 0 && !c.metMinSpend);
      needsSpend.sort((a, b) => a.remainingMinSpend - b.remainingMinSpend);
      
      if (needsSpend.length > 0) {
          const cardName = MY_CARDS.find(c => c.id === needsSpend[0].cardId)?.name;
          return {
              cardName,
              amount: needsSpend[0].remainingMinSpend,
              isFinished: false
          };
      }
      return { cardName: 'Tất cả đã đạt!', amount: 0, isFinished: true };
  }, [cardUsage]);

  const handleSave = () => {
    if (amount <= 0 || !title) return;

    const card = MY_CARDS.find(c => c.id === selectedCard)!;
    const usage = cardUsage.find(u => u.cardId === card.id);
    const currentAccumulated = usage ? usage.totalCashback : 0;
    const { cashback } = calculateCashbackForTransaction(card, amount, category, currentAccumulated);

    if (editingId) {
        const originalTx = transactions.find(t => t.id === editingId);
        if (originalTx) {
            const updatedTx: Transaction = {
                ...originalTx,
                title,
                amount,
                category,
                cardId: selectedCard,
                cashbackEarned: cashback
            };
            onEditTransaction(updatedTx);
        }
        setEditingId(null);
    } else {
        const newTx: Transaction = {
          id: Date.now().toString(),
          date: new Date().toLocaleDateString('vi-VN'),
          title,
          amount,
          category,
          cardId: selectedCard,
          cashbackEarned: cashback
        };
        onAddTransaction(newTx);
    }

    resetForm();
    setActiveTab('history');
  };

  const handleSaveEvent = () => {
      if (!newEventTitle || newEventAmount <= 0 || !newEventDate) return;
      
      const newEvent: FinancialEvent = {
          id: Date.now().toString(),
          title: newEventTitle,
          amount: newEventAmount,
          date: newEventDate,
          type: newEventType,
          isCompleted: false,
          recurring: false // Default to one-time for quick add
      };
      
      onAddEvent(newEvent);
      setNewEventTitle('');
      setNewEventAmount(0);
      setNewEventDate('');
  };

  const resetForm = () => {
      setTitle('');
      setAmount(0);
      setCategory('Shopee');
      setSelectedCard(MY_CARDS[0].id);
      setEditingId(null);
  }

  const handleEditClick = (tx: Transaction) => {
      setEditingId(tx.id);
      setTitle(tx.title);
      setAmount(tx.amount);
      setCategory(tx.category);
      setSelectedCard(tx.cardId);
      setActiveTab('add');
  };

  const handleQuickAddBill = (type: TransactionCategory, defaultTitle: string) => {
      resetForm();
      setTitle(defaultTitle);
      setCategory(type);
      setActiveTab('add');
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    const result = await analyzeSpendingHistory(transactions, cardUsage);
    setAnalysis(result);
    setAnalyzing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Input & Actions */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b bg-white p-4 rounded-t-xl shadow-sm overflow-x-auto">
            <button 
             onClick={() => setActiveTab('cashflow')}
             className={`pb-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'cashflow' ? 'text-shopee border-b-2 border-shopee' : 'text-gray-500'}`}
           >
               <CalendarClock className="w-4 h-4"/> Dòng tiền
           </button>
           <button 
             onClick={() => setActiveTab('report')}
             className={`pb-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'report' ? 'text-shopee border-b-2 border-shopee' : 'text-gray-500'}`}
           >
               <PieChart className="w-4 h-4"/> Báo cáo
           </button>
           <button 
             onClick={() => setActiveTab('add')}
             className={`pb-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'add' ? 'text-shopee border-b-2 border-shopee' : 'text-gray-500'}`}
           >
               <PlusCircle className="w-4 h-4"/> {editingId ? 'Chỉnh sửa' : 'Nhập chi tiêu'}
           </button>
           <button 
             onClick={() => setActiveTab('history')}
             className={`pb-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'history' ? 'text-shopee border-b-2 border-shopee' : 'text-gray-500'}`}
           >
               <History className="w-4 h-4"/> Lịch sử
           </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-t-0 p-6">
           
           {/* CASH FLOW TAB (New) */}
           {activeTab === 'cashflow' && (
               <div className="space-y-6 animate-fadeIn">
                   {/* 1. Asset Overview Cards */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Current Money */}
                       <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg relative overflow-hidden group">
                           <div className="absolute right-0 top-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-6 -mt-6"></div>
                           <div className="flex items-center gap-2 mb-2">
                               <Banknote className="w-5 h-5 text-blue-200" />
                               <span className="text-sm font-medium text-blue-100">Tiền hiện có</span>
                           </div>
                           <div className="flex items-center gap-2">
                               <input 
                                type="number" 
                                value={currentAsset}
                                onChange={(e) => onUpdateAsset(Number(e.target.value))}
                                className="bg-transparent text-2xl font-bold w-full outline-none border-b border-blue-400 focus:border-white transition-colors placeholder-blue-300"
                                />
                                <Pencil className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                           </div>
                           <p className="text-xs text-blue-200 mt-2">Ví tiền mặt + Tài khoản Bank</p>
                       </div>

                       {/* Pending Expense */}
                       <div className="bg-white border border-red-100 rounded-xl p-4 shadow-sm">
                           <div className="flex items-center gap-2 mb-2 text-red-600">
                               <ArrowUpCircle className="w-5 h-5" />
                               <span className="text-sm font-bold">Sắp phải trả</span>
                           </div>
                           <p className="text-2xl font-bold text-gray-800">{cashFlowStats.pendingExpense.toLocaleString()} đ</p>
                           <p className="text-xs text-gray-500 mt-2">Hóa đơn, Nợ thẻ, Tiền nhà...</p>
                       </div>

                       {/* Pending Income */}
                       <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                           <div className="flex items-center gap-2 mb-2 text-green-600">
                               <ArrowDownCircle className="w-5 h-5" />
                               <span className="text-sm font-bold">Sắp thu về</span>
                           </div>
                           <p className="text-2xl font-bold text-gray-800">{cashFlowStats.pendingIncome.toLocaleString()} đ</p>
                           <p className="text-xs text-gray-500 mt-2">Lương, Thưởng, Đối tác...</p>
                       </div>
                   </div>

                   {/* 2. Financial Calendar/List */}
                   <div className="border rounded-xl overflow-hidden">
                       <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                           <h3 className="font-bold text-gray-800 flex items-center gap-2">
                               <CalendarDays className="w-5 h-5 text-gray-600" />
                               Lịch Dòng Tiền & Nhắc Hẹn
                           </h3>
                           <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">Sắp tới</span>
                       </div>
                       <div className="max-h-[300px] overflow-y-auto">
                           {cashFlowStats.sortedEvents.length === 0 ? (
                               <p className="p-8 text-center text-gray-400 italic">Chưa có lịch nhắc nhở nào.</p>
                           ) : (
                               cashFlowStats.sortedEvents.map(event => {
                                   const isPast = new Date(event.date) < new Date() && !event.isCompleted;
                                   const isBill = event.isAutoGenerated;
                                   return (
                                       <div key={event.id} className={`flex items-center justify-between p-4 border-b last:border-0 hover:bg-gray-50 transition ${event.isCompleted ? 'opacity-50' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <div className={`flex flex-col items-center justify-center border rounded-lg w-12 h-12 shadow-sm shrink-0 ${isBill ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                                                    <span className="text-[10px] text-gray-500 uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className={`font-bold text-lg ${isPast ? 'text-red-500' : 'text-gray-800'}`}>{new Date(event.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <h4 className={`font-medium ${event.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                        {event.title}
                                                        {isBill && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1 py-0.5 rounded border border-orange-200">Tự động</span>}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${event.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {event.type === 'income' ? 'Thu nhập' : 'Chi trả'}
                                                        </span>
                                                        {isPast && <span className="text-[10px] text-red-500 font-bold">Quá hạn</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold ${event.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {event.type === 'income' ? '+' : '-'}{event.amount.toLocaleString()} đ
                                                </span>
                                                {isBill ? (
                                                    <div className="p-1.5" title="Thanh toán thẻ được tính tự động từ giao dịch">
                                                        <Lock className="w-4 h-4 text-gray-300" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button 
                                                          onClick={() => onToggleEvent(event.id)}
                                                          className={`p-1.5 rounded-full border transition-all ${event.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-300 hover:border-green-500 hover:text-green-500'}`}
                                                          title={event.isCompleted ? "Đánh dấu chưa xong" : "Đánh dấu đã xong"}
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => onRemoveEvent(event.id)} className="text-gray-400 hover:text-red-500">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                       </div>
                                   )
                               })
                           )}
                       </div>
                   </div>

                   {/* 3. Add New Event Form */}
                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                       <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase">Thêm nhắc nhở mới</h4>
                       <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                           <div className="md:col-span-4">
                               <label className="text-xs text-gray-500 mb-1 block">Tên khoản mục</label>
                               <input 
                                 type="text" 
                                 placeholder="VD: Lương, Tiền nhà..." 
                                 value={newEventTitle}
                                 onChange={(e) => setNewEventTitle(e.target.value)}
                                 className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                               />
                           </div>
                           <div className="md:col-span-3">
                               <label className="text-xs text-gray-500 mb-1 block">Số tiền</label>
                               <input 
                                 type="number" 
                                 placeholder="0" 
                                 value={newEventAmount === 0 ? '' : newEventAmount}
                                 onChange={(e) => setNewEventAmount(Number(e.target.value))}
                                 className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                               />
                           </div>
                           <div className="md:col-span-2">
                               <label className="text-xs text-gray-500 mb-1 block">Ngày</label>
                               <input 
                                 type="date" 
                                 value={newEventDate}
                                 onChange={(e) => setNewEventDate(e.target.value)}
                                 className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                               />
                           </div>
                           <div className="md:col-span-2">
                               <label className="text-xs text-gray-500 mb-1 block">Loại</label>
                               <select 
                                 value={newEventType}
                                 onChange={(e) => setNewEventType(e.target.value as 'income' | 'expense')}
                                 className="w-full p-2 text-sm border rounded-lg focus:ring-1 focus:ring-shopee outline-none"
                               >
                                   <option value="expense">Chi trả</option>
                                   <option value="income">Thu nhập</option>
                               </select>
                           </div>
                           <div className="md:col-span-1">
                               <button 
                                 onClick={handleSaveEvent}
                                 disabled={!newEventTitle || newEventAmount <= 0 || !newEventDate}
                                 className="w-full bg-gray-800 text-white p-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex justify-center items-center"
                               >
                                   <PlusCircle className="w-5 h-5" />
                               </button>
                           </div>
                       </div>
                   </div>
               </div>
           )}

           {/* REPORT TAB */}
           {activeTab === 'report' && (
               <div className="space-y-8">
                   {/* Summary Cards */}
                   <div className="grid grid-cols-3 gap-4">
                       <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                           <p className="text-xs text-gray-500 uppercase font-semibold">Tổng chi tiêu</p>
                           <p className="text-xl font-bold text-gray-800">{stats.totalSpent.toLocaleString()} đ</p>
                       </div>
                       <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                           <p className="text-xs text-gray-500 uppercase font-semibold">Tổng hoàn tiền</p>
                           <p className="text-xl font-bold text-green-600">+{stats.totalCashback.toLocaleString()} đ</p>
                       </div>
                       <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                           <p className="text-xs text-gray-500 uppercase font-semibold">Tỷ lệ hoàn</p>
                           <p className="text-xl font-bold text-blue-600">{stats.effectiveRate.toFixed(2)}%</p>
                       </div>
                   </div>

                   {/* Min Spend Progress Section */}
                   <div>
                       <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                           <Target className="w-5 h-5 text-red-500"/> 
                           Tiến độ điều kiện chi tiêu
                       </h4>
                       <div className="space-y-5">
                            {cardUsage.filter(u => u.minSpend > 0).map(u => {
                                const card = MY_CARDS.find(c => c.id === u.cardId);
                                const progress = Math.min((u.totalSpent / u.minSpend) * 100, 100);
                                return (
                                    <div key={u.cardId} className="relative">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-800">{card?.name}</span>
                                            <span className="text-gray-500 text-xs">
                                                {u.totalSpent.toLocaleString()} / <span className="font-semibold text-gray-700">{u.minSpend.toLocaleString()}</span> đ
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className={`h-2.5 rounded-full transition-all duration-700 ${u.metMinSpend ? 'bg-green-500' : 'bg-orange-400'}`} 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        <div className="mt-1 flex justify-end">
                                            {u.metMinSpend ? (
                                                <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3"/> Đã đạt điều kiện
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3"/> Thiếu {u.remainingMinSpend.toLocaleString()} đ
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                       </div>
                   </div>

                   {/* Daily Stats Visual */}
                   <div>
                       <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><History className="w-4 h-4"/> Xu hướng chi tiêu theo ngày</h4>
                       {Object.keys(stats.dailySpend).length === 0 ? (
                           <p className="text-gray-400 text-sm italic">Chưa có dữ liệu.</p>
                       ) : (
                           <div className="h-32 flex items-end gap-2 border-b border-l p-2">
                               {Object.entries(stats.dailySpend).slice(-7).map(([date, val]: [string, number]) => {
                                   const height = Math.min((val / stats.totalSpent) * 100 * 3, 100); // Rough scale
                                   return (
                                       <div key={date} className="flex-1 flex flex-col items-center group">
                                            <div className="relative w-full">
                                                <div 
                                                    className="w-full bg-shopee/80 rounded-t-sm hover:bg-shopee transition-all"
                                                    style={{ height: `${Math.max(height, 5)}%` }}
                                                ></div>
                                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                                    {(val/1000).toFixed(0)}k
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 mt-1">{date.slice(0,5)}</span>
                                       </div>
                                   )
                               })}
                           </div>
                       )}
                   </div>
               </div>
           )}

           {/* ADD / EDIT TAB */}
           {activeTab === 'add' && (
               <div className="space-y-4 animate-fadeIn">
                   <div className="flex justify-between items-center mb-2">
                       <h3 className="font-bold text-gray-800">
                           {editingId ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}
                       </h3>
                       {editingId && (
                           <button onClick={resetForm} className="text-sm text-red-500 hover:underline flex items-center gap-1">
                               <X className="w-4 h-4" /> Hủy bỏ
                           </button>
                       )}
                   </div>

                   {/* Priority Tip (Only show if not editing and priority exists) */}
                   {!editingId && !priorityCard.isFinished && (
                       <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-3">
                           <div className="bg-yellow-100 p-1.5 rounded-full mt-0.5">
                               <Zap className="w-4 h-4 text-yellow-600" />
                           </div>
                           <div>
                               <p className="text-xs font-bold text-yellow-800 uppercase mb-0.5">Ưu tiên chi tiêu</p>
                               <p className="text-sm text-yellow-800">
                                   Hãy dùng thẻ <span className="font-bold">{priorityCard.cardName}</span>. 
                                   Cần tiêu thêm <span className="font-bold">{priorityCard.amount.toLocaleString()}đ</span> để đạt điều kiện.
                               </p>
                           </div>
                       </div>
                   )}

                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Tên khoản chi</label>
                       <input 
                         type="text" 
                         value={title}
                         onChange={(e) => setTitle(e.target.value)}
                         placeholder="VD: Mua rau tại chợ, WinMart cuối tuần..." 
                         className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-shopee outline-none"
                       />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                           <input 
                             type="number" 
                             value={amount === 0 ? '' : amount}
                             onChange={(e) => setAmount(Number(e.target.value))}
                             className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-shopee outline-none"
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục / Nơi thanh toán</label>
                           <select 
                             value={category}
                             onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                             className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-shopee outline-none"
                           >
                               <option value="Shopee">Shopee</option>
                               <option value="Supermarket">Siêu thị (Có POS)</option>
                               <option value="Market">Chợ (Tiền mặt/CK)</option>
                               <option value="VPBankNEO">App VPBank NEO</option>
                               <option value="Online">Online Khác</option>
                               <option value="Electricity">Tiền Điện</option>
                               <option value="Water">Tiền Nước</option>
                               <option value="Internet">Internet/Wifi</option>
                           </select>
                       </div>
                   </div>
                   
                   <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
                        {category === 'Market' && "💡 Đi Chợ thường không được hoàn tiền trừ khi sạp có quẹt thẻ. Cân nhắc đi Siêu thị dùng thẻ Techcombank Everyday (5%) nếu có thể."}
                        {category === 'Supermarket' && "💡 Dùng Techcombank Everyday để được hoàn 5% tại siêu thị."}
                        {category === 'VPBankNEO' && "💡 Thanh toán qua App ngân hàng thường tính là giao dịch thường, không được hưởng ưu đãi Shopee/Online đặc biệt."}
                   </div>

                   <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Thẻ sử dụng</label>
                       <select 
                           value={selectedCard}
                           onChange={(e) => setSelectedCard(e.target.value)}
                           className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-shopee outline-none"
                       >
                           {MY_CARDS.map(card => {
                               const usage = cardUsage.find(u => u.cardId === card.id);
                               const isPriority = !usage?.metMinSpend && usage?.minSpend! > 0;
                               return (
                                   <option key={card.id} value={card.id}>
                                       {card.name} {isPriority ? `(Thiếu ${usage?.remainingMinSpend.toLocaleString()}đ)` : ''}
                                   </option>
                               )
                           })}
                       </select>
                   </div>
                   
                   <button 
                     onClick={handleSave}
                     className={`w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-2 transition-colors ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-shopee hover:bg-shopee-dark'}`}
                   >
                       {editingId ? <Save className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                       {editingId ? 'Cập nhật thay đổi' : 'Lưu chi tiêu'}
                   </button>
               </div>
           )}

           {/* HISTORY TAB */}
           {activeTab === 'history' && (
               <div className="space-y-4">
                   <div className="flex justify-between items-center mb-2">
                       <span className="text-sm text-gray-500 font-medium">Tổng số: {transactions.length} giao dịch</span>
                       {transactions.length > 0 && (
                           <button 
                             onClick={onClearAllTransactions}
                             className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 transition font-medium flex items-center gap-1"
                           >
                               <Trash2 className="w-3 h-3" /> Xóa tất cả
                           </button>
                       )}
                   </div>
                   
                   <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3">
                       {transactions.length === 0 ? (
                           <p className="text-center text-gray-500 py-8">Chưa có giao dịch nào.</p>
                       ) : (
                           transactions.slice().reverse().map(tx => (
                               <div key={tx.id} className="group flex justify-between items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition relative pr-20">
                                   <div className="flex items-start gap-3">
                                       <div className={`mt-1 p-2 rounded-full ${tx.cashbackEarned > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                           {tx.cashbackEarned > 0 ? <ArrowDownRight className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
                                       </div>
                                       <div>
                                           <p className="font-bold text-gray-800 text-sm">{tx.title}</p>
                                           <p className="text-xs text-gray-500">
                                               {tx.date} • {tx.category === 'Market' ? 'Chợ' : tx.category === 'Supermarket' ? 'Siêu thị' : tx.category === 'VPBankNEO' ? 'App VPBank NEO' : tx.category}
                                           </p>
                                           <p className="text-[10px] text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded mt-0.5">
                                               {MY_CARDS.find(c => c.id === tx.cardId)?.name}
                                           </p>
                                       </div>
                                   </div>
                                   <div className="text-right">
                                       <p className="font-bold text-gray-800">-{tx.amount.toLocaleString()} đ</p>
                                       {tx.cashbackEarned > 0 ? (
                                            <p className="text-xs text-green-600 font-bold">+ Hoàn {tx.cashbackEarned.toLocaleString()}</p>
                                       ) : (
                                            <p className="text-[10px] text-gray-400">Không hoàn tiền</p>
                                       )}
                                   </div>
                                   
                                   {/* Action Buttons */}
                                   <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10 bg-white/80 p-1 rounded-lg backdrop-blur-sm">
                                       <button 
                                         onClick={() => handleEditClick(tx)}
                                         className="p-1.5 rounded-full text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all"
                                         title="Chỉnh sửa"
                                       >
                                           <Pencil className="w-4 h-4" />
                                       </button>
                                       <button 
                                         onClick={() => {
                                             if(window.confirm('Bạn có chắc chắn muốn xóa giao dịch này không?')) {
                                                 onRemoveTransaction(tx.id);
                                             }
                                         }}
                                         className="p-1.5 rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 transition-all"
                                         title="Xóa"
                                       >
                                           <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                               </div>
                           ))
                       )}
                   </div>
               </div>
           )}
        </div>
      </div>

      {/* Right Column: Quick Utilities & AI */}
      <div className="space-y-6">
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-500" />
                  Thêm nhanh Chợ / Hóa đơn
              </h3>
              <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleQuickAddBill('Market', 'Đi chợ hôm nay')} className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border hover:bg-green-50 hover:border-green-400 transition text-center">
                      <Store className="w-5 h-5 text-green-600"/>
                      <span className="text-xs font-medium">Đi Chợ</span>
                  </button>
                  <button onClick={() => handleQuickAddBill('Supermarket', 'WinMart/Coop')} className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-400 transition text-center">
                      <Store className="w-5 h-5 text-blue-600"/>
                      <span className="text-xs font-medium">Siêu thị</span>
                  </button>
                  <button onClick={() => handleQuickAddBill('Electricity', 'Tiền Điện tháng này')} className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border hover:bg-yellow-50 hover:border-yellow-400 transition text-center">
                      <Zap className="w-5 h-5 text-yellow-600"/>
                      <span className="text-xs font-medium">Tiền Điện</span>
                  </button>
                  <button onClick={() => handleQuickAddBill('Water', 'Tiền Nước tháng này')} className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border hover:bg-cyan-50 hover:border-cyan-400 transition text-center">
                      <Wallet className="w-5 h-5 text-cyan-600"/>
                      <span className="text-xs font-medium">Tiền Nước</span>
                  </button>
              </div>
          </div>
          
           {/* Card Progress */}
           <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-shopee" />
                    Hạn mức hoàn tiền (Tháng)
                </h3>
                <div className="space-y-4">
                    {MY_CARDS.map(card => {
                        const usage = cardUsage.find(u => u.cardId === card.id) || { totalCashback: 0, totalSpent: 0 };
                        const percent = card.maxCashback > 0 ? (usage.totalCashback / card.maxCashback) * 100 : 0;
                        const isMaxed = card.maxCashback > 0 && usage.totalCashback >= card.maxCashback;
                        
                        return (
                            <div key={card.id}>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="font-medium text-gray-700 truncate max-w-[120px]">{card.name}</span>
                                    <span className="text-gray-500">
                                        {usage.totalCashback > 1000 ? (usage.totalCashback/1000).toFixed(0) + 'k' : usage.totalCashback} / {card.maxCashback > 0 ? (card.maxCashback/1000).toFixed(0) + 'k' : '∞'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div 
                                        className={`h-1.5 rounded-full transition-all duration-500 ${isMaxed ? 'bg-red-500' : 'bg-green-500'}`} 
                                        style={{ width: `${Math.min(percent, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
           </div>

          {/* AI Advisor */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg shadow-indigo-200 text-white p-5">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-yellow-300" />
                          Hiến Kế Chi Tiêu
                      </h3>
                      <p className="text-indigo-100 text-xs mt-1 opacity-90">AI phân tích thói quen & tối ưu dòng tiền</p>
                  </div>
              </div>
              
              {analysis ? (
                  <div className="text-sm text-white/90 whitespace-pre-line bg-white/10 p-3 rounded-lg border border-white/20 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {analysis}
                  </div>
              ) : (
                  <div className="text-center py-4">
                      <p className="text-xs text-indigo-100 italic mb-3">
                          Hệ thống sẽ phân tích lịch sử đi chợ, siêu thị và các hóa đơn để tìm ra cách tiết kiệm nhất cho bạn.
                      </p>
                      <button 
                        onClick={runAnalysis} 
                        disabled={analyzing || transactions.length === 0}
                        className="w-full bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 transition disabled:opacity-50 text-sm flex justify-center items-center gap-2"
                      >
                          {analyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Phân tích ngay'}
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default SpendingManager;