import React, { useState } from 'react';
import { EventData, Session } from '../types';
import { MatrixGrid } from './MatrixGrid';
import { SummaryCard } from './SummaryCard';
import { ArrowLeft, Trash2, Clock, UserPlus, X, Check, ArrowUp } from 'lucide-react';

interface Props {
  event: EventData;
  onUpdate: (event: EventData) => void;
  onBack: () => void;
  onDelete: () => void;
  phoneBook: { [name: string]: string }; 
  cloudContacts: { id: string; name: string; phone: string }[];
}

// --- 內部元件：自定義彈窗 (Modal) ---
const Modal = ({ 
  isOpen, 
  title, 
  onClose, 
  onSubmit, 
  children, 
  submitLabel = "確認",
  isDestructive = false
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-white">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-blue-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-blue-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        <div className="px-6 py-4 bg-slate-50/50 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            取消
          </button>
          <button 
            onClick={onSubmit}
            className={`px-4 py-2 text-sm font-black text-white rounded-xl shadow-md transition-all flex items-center gap-2 ${
              isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {isDestructive ? <Trash2 size={16} /> : <Check size={16} />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const EventWorkspace: React.FC<Props> = ({ event, onUpdate, onBack, onDelete, phoneBook, cloudContacts }) => {
  const [modalType, setModalType] = useState<'add-session' | 'add-player' | 'delete-session' | 'delete-player' | 'delete-event' | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // 捲動回頂部函數
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- 邏輯處理 ---
  const handleHostChange = (sessionId: string, hostId: string) => {
    const updatedEvent = {
      ...event,
      sessions: event.sessions.map((s: any) => 
        s.id === sessionId ? { ...s, hostId } : s
      )
    };
    onUpdate(updatedEvent);
  };

  const handleWeightChange = (sessionId: string, playerId: string, weight: number) => {
    const newParticipation = { ...(event.participation || {}) };
    const key = `${sessionId}_${playerId}`;
    if (weight === 0) delete newParticipation[key];
    else newParticipation[key] = weight;
    onUpdate({ ...event, participation: newParticipation });
  };

  const handleSubmit = () => {
    if (modalType === 'add-session') {
      if (!inputValue.trim()) return;
      const newSession: Session = {
        id: generateId(),
        name: inputValue.trim(),
        cost: event.defaultCost || 200
      };
      onUpdate({ ...event, sessions: [...event.sessions, newSession] });
    }

    if (modalType === 'add-player') {
      const name = inputValue.trim();
      if (!name) return;
      if (event.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert("球員已存在！");
        return;
      }
      onUpdate({ ...event, players: [...event.players, { id: generateId(), name }] });
    }

    if (modalType === 'delete-session' && targetId) {
      const newSessions = event.sessions.filter(s => s.id !== targetId);
      const newParticipation = { ...(event.participation || {}) };
      Object.keys(newParticipation).forEach(key => { if (key.startsWith(`${targetId}_`)) delete newParticipation[key]; });
      onUpdate({ ...event, sessions: newSessions, participation: newParticipation });
    }

    if (modalType === 'delete-player' && targetId) {
      const newPlayers = event.players.filter(p => p.id !== targetId);
      const newParticipation = { ...(event.participation || {}) };
      Object.keys(newParticipation).forEach(key => { if (key.endsWith(`_${targetId}`)) delete newParticipation[key]; });
      onUpdate({ ...event, players: newPlayers, participation: newParticipation });
    }

    if (modalType === 'delete-event') onDelete();
    setModalType(null);
    setInputValue("");
  };

  return (
    <div className="relative space-y-6 pb-32 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* 1. Modals */}
      <Modal isOpen={modalType === 'add-session'} title="新增時段" onSubmit={handleSubmit} onClose={() => setModalType(null)} submitLabel="新增">
        <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="例如: 18:00 - 20:00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </Modal>

      <Modal isOpen={modalType === 'add-player'} title="新增球員" onSubmit={handleSubmit} onClose={() => setModalType(null)} submitLabel="新增">
        <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="球員姓名" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </Modal>

      <Modal isOpen={modalType?.startsWith('delete') || false} title="確認刪除？" onSubmit={handleSubmit} onClose={() => setModalType(null)} isDestructive submitLabel="確認刪除">
        <p className="text-slate-500 font-medium">此動作無法復原，確定要執行嗎？</p>
      </Modal>

      {/* 2. Sticky Header - 固定頂部導航條 */}
      <div className="sticky top-0 z-50 -mx-4 px-4 py-3 bg-[#f8fafc]/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between mb-2">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-slate-500 hover:text-blue-700 font-black transition-colors active:scale-95"
        >
          <ArrowLeft size={20} /> 返回
        </button>
        
        <button 
          onClick={() => setModalType('delete-event')} 
          className="text-slate-300 hover:text-red-500 transition-colors active:scale-90 p-1"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <header className="pt-2">
        <h1 className="text-3xl font-black text-blue-900 tracking-tight">{event.eventName}</h1>
        <p className="text-slate-400 font-bold">{event.date}</p>
      </header>

      {/* 3. Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setModalType('add-session')} className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl font-black text-blue-700 shadow-sm active:scale-95 transition-all">
          <Clock size={18} /> 加時段
        </button>
        <button onClick={() => setModalType('add-player')} className="flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl font-black text-blue-700 shadow-sm active:scale-95 transition-all">
          <UserPlus size={18} /> 加球員
        </button>
      </div>

      {/* 4. Matrix & Summary */}
      <MatrixGrid 
        event={event} 
        cloudContacts={cloudContacts} 
        onWeightChange={handleWeightChange}
        onRemoveSession={id => { setTargetId(id); setModalType('delete-session'); }}
        onRemovePlayer={id => { setTargetId(id); setModalType('delete-player'); }}
        onHostChange={handleHostChange} 
        // ★ 核心補全：把拖曳排序的結果存進 event 裡
        onReorderPlayers={(newPlayers) => onUpdate({ ...event, players: newPlayers })}
        onReorderSessions={(newSessions) => onUpdate({ ...event, sessions: newSessions })}
      />
      
      <SummaryCard 
        event={event} 
        phoneBook={phoneBook} 
        cloudContacts={cloudContacts} 
      />

      {/* 5. 回頂部按鈕 */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-6 z-[60] p-4 bg-blue-700 text-white rounded-full shadow-2xl transition-all hover:bg-blue-800 active:scale-90 ring-4 ring-white"
      >
        <ArrowUp size={24} />
      </button>
    </div>
  );
};