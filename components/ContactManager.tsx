import React, { useState } from 'react';
import { UserPlus, Trash2, Edit2, Save, X, Phone, User, RefreshCw } from 'lucide-react';
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

  // ★ ID 生成器 (保持與 App.tsx 一致)
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhone(contact.phone);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("請填寫姓名和電話");
      return;
    }
    setIsSubmitting(true);

    try {
      if (editingContact) {
        // 更新邏輯
        const { error } = await supabase
          .from('contacts')
          .update({ name: name.trim(), phone: phone.trim() })
          .eq('id', editingContact.id);
        if (error) throw error;
      } else {
        // ★ 新增邏輯：補上手動生成的 id
        const { error } = await supabase
          .from('contacts')
          .insert([{ 
            id: generateId(), 
            name: name.trim(), 
            phone: phone.trim(), 
            user_id: userId 
          }]);
        if (error) throw error;
      }

      // 成功後清理狀態
      setIsModalOpen(false);
      setName('');
      setPhone('');
      setEditingContact(null);
      onRefresh(); // 重新整理列表
      
    } catch (e: any) {
      console.error('操作失敗:', e);
      alert(`操作失敗: ${e.message || '請檢查網路連線或資料庫權限'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這位聯絡人嗎？')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) onRefresh();
    else alert("刪除失敗");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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

      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-white p-4 rounded-[1.8rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                <User size={20} />
              </div>
              <div className="text-left">
                <span className="font-black text-slate-700 block">{contact.name}</span>
                <span className="text-xs font-bold text-slate-400 font-mono">{contact.phone}</span>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-blue-900">{editingContact ? '編輯聯絡人' : '新增聯絡人'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-600" placeholder="姓名 (如: Angela)" />
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-600" placeholder="電話 (如: 66123456)" />
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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