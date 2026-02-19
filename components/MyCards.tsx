import React from 'react';
import { MY_CARDS } from '../constants';
import { CreditCard as CardIcon, Copy } from 'lucide-react';

const MyCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {MY_CARDS.map((card) => (
        <div key={card.id} className={`relative overflow-hidden rounded-2xl shadow-lg text-white bg-gradient-to-br ${card.image} p-6 h-56 flex flex-col justify-between transition transform hover:-translate-y-1`}>
          {/* Decorative Circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 -left-10 w-32 h-32 bg-black opacity-10 rounded-full blur-2xl"></div>

          {/* Header */}
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-sm opacity-80 font-medium">{card.bank}</p>
              <h3 className="text-xl font-bold tracking-tight">{card.name}</h3>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/10">
              x{card.count} thẻ
            </div>
          </div>

          {/* Middle Info */}
          <div className="z-10 mt-2">
              <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-mono">
                      {card.category === 'Shopee' ? 'SHOPEE SUPER' : card.category.toUpperCase()}
                  </span>
              </div>
              <p className="text-xs opacity-90 line-clamp-2 leading-relaxed">
                  {card.notes}
              </p>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end z-10">
             <div className="flex flex-col">
                 <span className="text-[10px] opacity-70 uppercase tracking-widest">Cashback</span>
                 <span className="text-2xl font-bold">{card.cashbackRate}%</span>
                 <span className="text-[10px] opacity-70">Max: {card.maxCashback > 0 ? `${(card.maxCashback/1000).toFixed(0)}k` : 'Unlimited'}</span>
             </div>
             <div className="opacity-80">
                 <CardIcon className="w-8 h-8" />
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyCards;