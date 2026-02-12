import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserPlus, Save, Trash2, Smartphone, Loader2 } from 'lucide-react';

interface Contact { id: string; name: string; phone: string; }

interface Props {
  contacts: Contact[];
  onRefresh: () => void;
  userId: string;
}

export const ContactManager: React.FC<Props> = ({ contacts, onRefresh, userId }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    
    try {
      // ★ 連結 Supabase：將數據寫入 'contacts' 表格
      const { error } = await supabase
        .from('contacts')
        .insert([{ 
          name: name.trim(), 
          phone: phone.trim(),
          user_id: userId // 確保 Supabase 的 user_id 類型是 text
        }]);

      if (error) {
        // 如果報錯，通常是 RLS 沒設好或是 user_id 格式不對
        throw error;
      } else {
        setName('');
        setPhone('');
        onRefresh(); // 通知 App.tsx 重新整理名單
      }
    } catch (err: any) {
      alert('新增失敗：' + (err.message || '請檢查 Supabase 設定'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    if (window.confirm(`確定要從雲端刪除 ${contactName} 嗎？`)) {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (!error) onRefresh();
      else alert('刪除失敗');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* 新增區塊 */}
      <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
        <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
          <UserPlus size={16} /> 新增Host
        </h3>
        <div className="flex flex-col gap-3">
          <input 
            placeholder="姓名 (例如: Carol)" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input 
            placeholder="電話 (例如: 66881234)" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleAdd}
            disabled={isSubmitting || !name.trim()}
            className="bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSubmitting ? '儲存中...' : '存入數據庫'}
          </button>
        </div>
      </section>

      {/* 列表區塊 */}
      <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-blue-50/30">
          <h3 className="font-black text-blue-900 text-[10px] uppercase">HOST清單</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-blue-50/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <Smartphone size={18} />
                </div>
                <div>
                  <span className="font-black text-slate-700 block text-sm">{contact.name}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{contact.phone || '未錄入電話'}</span>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(contact.id, contact.name)} 
                className="text-slate-300 hover:text-red-500 p-2 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
              目前雲端沒有聯絡人
            </div>
          )}
        </div>
      </section>
    </div>
  );
};