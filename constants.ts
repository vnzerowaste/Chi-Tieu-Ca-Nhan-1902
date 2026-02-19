import { CreditCard } from './types';

export const MY_CARDS: CreditCard[] = [
  // VPBank Super Shopee - Thẻ H
  {
    id: 'vp-shopee-plat-h',
    name: 'VPBank Shopee Platinum (H)',
    bank: 'VPBank',
    type: 'Platinum',
    image: 'from-orange-500 to-red-600',
    cashbackRate: 10, 
    maxCashback: 600000,
    minSpend: 4000000, 
    category: 'Shopee',
    notes: 'Thẻ H: Hoàn 10% Shopee. Min spend 4tr. Lịch trả: Mùng 8.',
    count: 1,
    dueDate: 8
  },
  // VPBank Super Shopee - Thẻ L
  {
    id: 'vp-shopee-plat-l',
    name: 'VPBank Shopee Platinum (L)',
    bank: 'VPBank',
    type: 'Platinum',
    image: 'from-orange-400 to-red-500', // Slightly different shade to distinguish
    cashbackRate: 10, 
    maxCashback: 600000,
    minSpend: 4000000, 
    category: 'Shopee',
    notes: 'Thẻ L: Hoàn 10% Shopee. Min spend 4tr. Lịch trả: Mùng 8.',
    count: 1,
    dueDate: 8
  },

  // MSB Online - Thẻ H
  {
    id: 'msb-online-h',
    name: 'MSB Visa Online (H)',
    bank: 'MSB',
    type: 'Visa',
    image: 'from-blue-600 to-indigo-700',
    cashbackRate: 10, 
    maxCashback: 300000,
    minSpend: 3000000, 
    category: 'Online',
    notes: 'Thẻ H: Hoàn 10% Online/Shopee. Min spend 3tr. Lịch trả: Mùng 7.',
    count: 1,
    dueDate: 7
  },
  // MSB Online - Thẻ L
  {
    id: 'msb-online-l',
    name: 'MSB Visa Online (L)',
    bank: 'MSB',
    type: 'Visa',
    image: 'from-blue-500 to-indigo-600',
    cashbackRate: 10, 
    maxCashback: 300000,
    minSpend: 3000000, 
    category: 'Online',
    notes: 'Thẻ L: Hoàn 10% Online/Shopee. Min spend 3tr. Lịch trả: Mùng 7.',
    count: 1,
    dueDate: 7
  },

  // VPBank S Rewards - Thẻ H
  {
    id: 'vp-s-rewards-h',
    name: 'VPBank S Rewards (H)',
    bank: 'VPBank',
    type: 'Standard',
    image: 'from-green-600 to-teal-700',
    cashbackRate: 12, 
    maxCashback: 0, 
    minSpend: 5000000, 
    category: 'All',
    notes: 'Thẻ H: Hoàn 12% (Min spend 5tr).',
    count: 1,
    dueDate: 8
  },
  // VPBank S Rewards - Thẻ L
  {
    id: 'vp-s-rewards-l',
    name: 'VPBank S Rewards (L)',
    bank: 'VPBank',
    type: 'Standard',
    image: 'from-green-500 to-teal-600',
    cashbackRate: 12, 
    maxCashback: 0, 
    minSpend: 5000000, 
    category: 'All',
    notes: 'Thẻ L: Hoàn 12% (Min spend 5tr).',
    count: 1,
    dueDate: 8
  },

  // Techcombank (Giữ nguyên 1 thẻ)
  {
    id: 'tcb-everyday',
    name: 'Techcombank Everyday',
    bank: 'Techcombank',
    type: 'Debit/Credit',
    image: 'from-red-600 to-gray-800',
    cashbackRate: 5,
    maxCashback: 200000,
    minSpend: 0, 
    category: 'Specific',
    notes: 'Hoàn 5% Shopee/Siêu thị. Lịch trả: Mùng 5.',
    count: 1,
    dueDate: 5
  },

  // Tiền mặt
  {
    id: 'cash-debit',
    name: 'Tiền mặt / TK Thanh toán',
    bank: 'Cash',
    type: 'Cash',
    image: 'from-gray-400 to-gray-600',
    cashbackRate: 0,
    maxCashback: 0,
    minSpend: 0,
    category: 'Cash',
    notes: 'Trừ trực tiếp vào tiền hiện có.',
    count: 1,
    dueDate: 0 // Immediate
  }
];