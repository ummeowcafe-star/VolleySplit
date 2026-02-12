import { createClient } from '@supabase/supabase-js';

// 獲取環境變數
// 使用 'as string' 告訴 TypeScript 這些值絕對不是 undefined
// ★ 加上 @ts-ignore 強制消除紅線
// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ★ 關鍵修正：增加空值檢查，防止程式在連線資訊缺失時崩潰
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL 或 Anon Key 遺失！請檢查 .env 檔案。');
}

// 建立並匯出 Supabase 用戶端，供 App.tsx 與 ContactManager 共用
export const supabase = createClient(supabaseUrl, supabaseAnonKey);