import { CreditCard, TransactionCategory } from '../types';

/**
 * Tính toán số tiền hoàn lại cho một giao dịch cụ thể dựa trên thẻ và danh mục.
 * @param card Thẻ tín dụng sử dụng
 * @param amount Số tiền giao dịch
 * @param category Danh mục chi tiêu
 * @param currentCashbackAccumulated Số tiền đã hoàn trong tháng này của thẻ (để tính trần)
 */
export const calculateCashbackForTransaction = (
  card: CreditCard,
  amount: number,
  category: TransactionCategory,
  currentCashbackAccumulated: number = 0
): { cashback: number; rate: number; reason: string } => {
  let rate = 0;
  let reason = '';

  if (card.id === 'cash-debit') {
      return { cashback: 0, rate: 0, reason: 'Thanh toán tiền mặt không hoàn tiền' };
  }
  
  // Logic chung cho dòng VPBank Shopee Platinum (Bao gồm cả H và L)
  if (card.id.includes('vp-shopee-plat')) {
    if (category === 'Shopee') {
      rate = 0.10;
      reason = '10% chi tiêu Shopee';
    } else if (['Electricity', 'Water', 'Internet', 'Phone'].includes(category)) {
      rate = 0.10; 
      reason = '10% nếu thanh toán qua Shopee Pay/App';
    } else {
      rate = 0.001; // 0.1% cơ bản
      reason = '0.1% chi tiêu khác/App NH';
    }
  } 
  // Logic chung cho dòng MSB Online (Bao gồm cả H và L)
  else if (card.id.includes('msb-online')) {
    if (['Shopee', 'Online'].includes(category)) {
      rate = 0.10; // Cập nhật: 10% cho Online/Shopee
      reason = '10% chi tiêu Online/Shopee';
    } else {
      rate = 0.001;
      reason = '0.1% chi tiêu khác';
    }
  } 
  // Logic cho Techcombank Everyday
  else if (card.id === 'tcb-everyday') {
    if (category === 'Shopee' || category === 'Supermarket') {
      // Techcombank Everyday mạnh về Siêu thị/Grab
      rate = 0.05;
      reason = '5% nhóm ngành Siêu thị/Shopee';
    } else if (category === 'Market') {
      // Chợ thường không có MCC siêu thị
      rate = 0.005;
      reason = '0.5% chi tiêu thường (Chợ)';
    } else {
      rate = 0.005;
      reason = '0.5% cơ bản';
    }
  } 
  // VPBank S Rewards (H và L) - Cập nhật 12%
  else if (card.id.includes('vp-s-rewards')) {
    rate = 0.12; 
    reason = 'Hoàn 12% (Yêu cầu min spend 5tr)';
  }
  // Các thẻ khác (Fallback)
  else {
    rate = 0.005; // 0.5% chung
    reason = 'Tích điểm cơ bản';
  }

  let potentialCashback = amount * rate;
  
  // Kiểm tra hạn mức (Cap)
  let finalCashback = potentialCashback;
  const remainingCap = card.maxCashback > 0 ? Math.max(0, card.maxCashback - currentCashbackAccumulated) : Infinity;

  if (card.maxCashback > 0 && potentialCashback > remainingCap) {
    finalCashback = remainingCap;
    reason += ` (Đã chạm trần tháng, chỉ nhận thêm ${finalCashback.toLocaleString()}đ)`;
  } else if (remainingCap === 0 && card.maxCashback > 0) {
    finalCashback = 0;
    reason += ' (Đã hết hạn mức hoàn tiền tháng này)';
  }

  return { cashback: finalCashback, rate, reason };
};