import { GoogleGenAI } from "@google/genai";
import { Deal, Transaction, CardUsageStatus } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction for the deal hunter persona
const SYSTEM_INSTRUCTION = `Bạn là một trợ lý ảo chuyên nghiệp về săn sale Shopee và tối ưu tài chính cá nhân.
Nhiệm vụ của bạn là giúp người dùng tìm kiếm các mã giảm giá (voucher), các deal 1k, 9k và flash sale tốt nhất trên Shopee Việt Nam.
Ngoài ra, bạn cũng tư vấn cách sử dụng thẻ tín dụng để tối ưu hoàn tiền.
Người dùng có các thẻ: VPBank Super Shopee Platinum, VPBank S Rewards, MSB Online, Techcombank Everyday.
Khi tìm kiếm deal, hãy cố gắng trích xuất thông tin cụ thể (tên sản phẩm, giá, link nếu có).`;

export const searchShopeeDeals = async (query: string): Promise<{ text: string; deals: Deal[] }> => {
  try {
    const modelId = 'gemini-3-pro-preview'; // Supports Google Search
    
    // We construct a prompt that explicitly asks for lists
    const fullPrompt = `${query}. Hãy tìm kiếm thông tin mới nhất hôm nay.
    Nếu tìm thấy danh sách sản phẩm hoặc mã giảm giá, hãy liệt kê chi tiết dưới dạng Markdown.
    Đặc biệt chú ý đến các deal 1k, 9k, và mã Freeship.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Không tìm thấy thông tin.";
    const deals: Deal[] = []; 
    
    // Rudimentary parsing to create structured "Deal" objects if the AI lists them clearly
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('1k') || line.includes('9k') || line.toLowerCase().includes('voucher')) {
          const deal: Deal = {
              id: `deal-${index}`,
              title: line.replace(/[-*]/g, '').trim(),
              description: 'Deal hấp dẫn từ kết quả tìm kiếm',
              type: line.includes('1k') ? '1k' : line.includes('9k') ? '9k' : 'voucher'
          };
          deals.push(deal);
      }
    });

    return { text, deals: deals.slice(0, 5) }; // Return top 5 detected items
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { 
        text: "Xin lỗi, hiện tại tôi không thể kết nối để tìm deal mới nhất. Vui lòng thử lại sau.", 
        deals: [] 
    };
  }
};

export const adviseCardUsage = async (amount: number, category: string, cardStatus: string): Promise<string> => {
    try {
        const modelId = 'gemini-3-flash-preview';
        const prompt = `Tôi muốn mua một món đồ giá ${amount.toLocaleString('vi-VN')} VNĐ trên Shopee. Danh mục: ${category}.
        Tình trạng thẻ hiện tại: ${cardStatus}.
        Danh sách thẻ của tôi:
        1. VPBank Super Shopee Platinum (x2): Hoàn 10% Shopee, Max 600k.
        2. MSB Online (x2): Hoàn 20% Online, Max 300k.
        3. Techcombank Everyday (x1): Hoàn 5% Shopee, Max 200k.
        4. VPBank S Rewards (x2): Tích điểm (thấp).
        
        Hãy tính toán và khuyên tôi nên dùng thẻ nào để được hoàn tiền nhiều nhất. Giải thích ngắn gọn lý do.`;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                systemInstruction: "Bạn là chuyên gia tài chính cá nhân. Trả lời ngắn gọn, đi thẳng vào vấn đề.",
            }
        });

        return response.text || "Không thể phân tích.";
    } catch (error) {
        console.error(error);
        return "Đã có lỗi xảy ra khi phân tích thẻ.";
    }
}

export const analyzeSpendingHistory = async (transactions: Transaction[], cardUsage: CardUsageStatus[]): Promise<string> => {
    try {
      const modelId = 'gemini-3-flash-preview';
      
      const historySummary = transactions.map(t => 
        `- ${t.date}: ${t.title} (${t.amount.toLocaleString()}đ) - Danh mục: ${t.category} - Hoàn tiền: ${t.cashbackEarned.toLocaleString()}đ`
      ).join('\n');

      const usageSummary = cardUsage.map(c => 
        `- ${c.cardId}: Đã hoàn ${c.totalCashback.toLocaleString()}đ / Dư hạn mức ${c.remainingCap.toLocaleString()}đ`
      ).join('\n');

      const prompt = `
      Với vai trò là Chuyên gia Tư vấn Tài chính Cá nhân (Financial Advisor), hãy phân tích dữ liệu chi tiêu dưới đây của tôi:

      DỮ LIỆU CHI TIÊU:
      ${historySummary}

      TÌNH TRẠNG THẺ TÍN DỤNG:
      ${usageSummary}

      YÊU CẦU PHÂN TÍCH CHI TIẾT:
      1. **Tổng quan hiệu quả**: Tôi đã tận dụng hoàn tiền tốt chưa? Có khoản nào dùng sai thẻ gây lãng phí cashback không? (Ví dụ đi siêu thị dùng thẻ Online thay vì thẻ Techcombank).
      2. **Phân loại Chi tiêu**: Hãy chỉ ra đâu là các khoản "Cần thiết" (Essential - Điện, nước, đi chợ, siêu thị) và đâu là khoản "Không cần thiết/Lãng phí" (Discretionary - Mua sắm vô tội vạ).
      3. **Chiến lược Đi chợ/Siêu thị**: So sánh hiệu quả chi tiêu giữa việc đi Chợ (Market - thường không hoàn tiền) và Siêu thị (Supermarket - có hoàn tiền). Đưa ra lời khuyên nên mua gì ở đâu.
      4. **Hiến kế Tháng tới**: Đưa ra 3 hành động cụ thể để tiết kiệm thêm vào tháng sau.

      Hãy trả lời bằng định dạng Markdown dễ đọc, dùng các bullet point. Giọng văn khuyến khích, sắc sảo.
      `;

      const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
              systemInstruction: "Bạn là chuyên gia quản lý tài chính cá nhân (CFO cá nhân). Hãy đưa ra nhận xét thực tế, tính toán con số cụ thể nếu có thể.",
          }
      });

      return response.text || "Chưa đủ dữ liệu phân tích.";
    } catch (error) {
      console.error(error);
      return "Lỗi phân tích lịch sử.";
    }
};