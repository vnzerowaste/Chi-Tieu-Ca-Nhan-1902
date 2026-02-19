import React, { useState } from 'react';
import { searchShopeeDeals } from '../services/geminiService';
import { Search, Tag, ShoppingBag, ExternalLink, Loader2 } from 'lucide-react';
import { Deal } from '../types';

const DealHunter: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleScanDeals = async (type: 'all' | '1k' | '9k') => {
    setLoading(true);
    setDeals([]);
    setRawText('');

    let query = "Tìm các mã voucher Shopee hôm nay";
    if (type === '1k') query = "Tìm các deal 1k Shopee đang hot hôm nay, flash sale 1k";
    if (type === '9k') query = "Tìm các deal 9k, đồng giá 9k Shopee hôm nay";

    const result = await searchShopeeDeals(query);
    setRawText(result.text);
    setDeals(result.deals);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleScanDeals('all')}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-shopee transition group"
        >
          <div className="p-3 bg-orange-100 rounded-full mb-2 group-hover:bg-orange-200">
            <Search className="w-6 h-6 text-shopee" />
          </div>
          <span className="font-semibold text-gray-700 group-hover:text-shopee">Săn Voucher HOT</span>
        </button>

        <button
          onClick={() => handleScanDeals('1k')}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-shopee transition group"
        >
          <div className="p-3 bg-orange-100 rounded-full mb-2 group-hover:bg-orange-200">
            <Tag className="w-6 h-6 text-shopee" />
          </div>
          <span className="font-semibold text-gray-700 group-hover:text-shopee">Săn Deal 1k</span>
        </button>

        <button
          onClick={() => handleScanDeals('9k')}
          disabled={loading}
          className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-shopee transition group"
        >
          <div className="p-3 bg-orange-100 rounded-full mb-2 group-hover:bg-orange-200">
            <ShoppingBag className="w-6 h-6 text-shopee" />
          </div>
          <span className="font-semibold text-gray-700 group-hover:text-shopee">Săn Deal 9k</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-shopee animate-spin mx-auto mb-4" />
          <p className="text-gray-500">AI đang quét dữ liệu Shopee mới nhất...</p>
        </div>
      )}

      {/* Results */}
      {!loading && rawText && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-800">Kết quả tìm kiếm</h3>
            <span className="text-xs text-gray-500 bg-white border px-2 py-1 rounded">Cập nhật vừa xong</span>
          </div>
          
          <div className="p-6">
             {/* Render Raw Markdown-like text nicely */}
             <div className="prose prose-orange max-w-none text-gray-700 whitespace-pre-line">
                {rawText}
             </div>

             {/* If structured deals detected, show cards */}
             {deals.length > 0 && (
                 <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {deals.map((deal) => (
                         <div key={deal.id} className="border border-dashed border-orange-300 bg-orange-50 rounded-lg p-4 flex justify-between items-start">
                             <div>
                                 <div className="flex items-center gap-2">
                                     <span className="bg-shopee text-white text-xs font-bold px-1.5 py-0.5 rounded">NEW</span>
                                     <h4 className="font-bold text-gray-800">{deal.title}</h4>
                                 </div>
                                 <p className="text-sm text-gray-600 mt-1">{deal.description}</p>
                             </div>
                             <button className="text-shopee hover:text-shopee-dark p-1">
                                 <ExternalLink className="w-5 h-5" />
                             </button>
                         </div>
                     ))}
                 </div>
             )}
          </div>
        </div>
      )}

      {!loading && !rawText && (
         <div className="text-center py-12 text-gray-400">
            <p>Nhấn vào các nút trên để bắt đầu săn deal.</p>
         </div>
      )}
    </div>
  );
};

export default DealHunter;