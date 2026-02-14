import React, { useState } from 'react';
import { UserPlus, Trash2, Edit2, Save, X, Phone, User, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Contact {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  contacts: Contact[];
  onRefresh: () => void;
  userId: string;
}

export const ContactManager: React.FC<Props> = ({ contacts, onRefresh, userId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 打開新增視窗
  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhone('');
    setIsModalOpen(true);
  };

  // 打開編輯視窗
  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    // 如果是 unknown，顯示空字串讓 Owen 方便輸入新號碼
    setPhone(contact.phone === 'unknown' ? '' : contact.phone);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("請至少填寫球員姓名");
      return;
    }
    setIsSubmitting(true);

    // ★ 核心邏輯：如果沒填電話，自動設為 'unknown'
    const finalPhone = phone.trim() || 'unknown';

    try {
      if (editingContact) {
        // 執行更新
        const { error } = await supabase
          .from('contacts')
          .update({ name: name.trim(), phone: finalPhone })
          .eq('id', editingContact.id);
        if (error) throw error;
      } else {
        // ★ 核心修正：使用標準 crypto.randomUUID() 符合 Supabase 的 UUID 格式
        const { error } = await supabase
          .from('contacts')
          .insert([{ 
            id: crypto.randomUUID(), 
            name: name.trim(), 
            phone: finalPhone, 
            user_id: userId 
          }]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      onRefresh(); // 成功後刷新清單
    } catch (e: any) {
      console.error('Database Error:', e);
      // 顯示具體錯誤，方便 Owen 確認是否為權限 (RLS) 問題
      alert(`儲存失敗: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這位聯絡人嗎？')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) onRefresh();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-blue-900">雲端聯絡簿</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Host Management</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-700 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all"
        >
          <UserPlus size={24} />
        </button>
      </div>

      {/* 2. Contact List */}
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${contact.phone === 'unknown' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-600'}`}>
                {contact.phone === 'unknown' ? <AlertCircle size={20} /> : <User size={20} />}
              </div>
              <div className="text-left">
                <span className="font-black text-slate-700 block">{contact.name}</span>
                <span className={`text-xs font-bold font-mono ${contact.phone === 'unknown' ? 'text-amber-500 italic' : 'text-slate-400'}`}>
                  {contact.phone === 'unknown' ? '待補電話' : contact.phone}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => openEditModal(contact)} className="p-2.5 text-slate-400 hover:text-blue-600 rounded-xl">
                <Edit2 size={18} />
              </button>
              <button onClick={() => handleDelete(contact.id)} className="p-2.5 text-slate-400 hover:text-red-500 rounded-xl">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-blue-900">{editingContact ? '編輯聯絡人' : '新增聯絡人'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">姓名</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-600" placeholder="例如: Angela" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">電話 / 轉帳號碼 (選填)</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-4 font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-600" placeholder="留空則預設為待補" />
              </div>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                儲存資料
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};