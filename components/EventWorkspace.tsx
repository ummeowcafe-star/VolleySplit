import React, { useState, useRef, useEffect } from 'react';
import { EventData, Session } from '../types';
import { MatrixGrid } from './MatrixGrid';
import { SummaryCard } from './SummaryCard';
import { ArrowLeft, Trash2, Clock, UserPlus, X, Check, ArrowUp, Users, Edit2 } from 'lucide-react';
import { TeamGenerator } from './TeamGenerator';

interface Props {
  event: EventData;
  onUpdate: (event: EventData) => void;
  onBack: () => void;
  onDelete: () => void;
  phoneBook: { [name: string]: string }; 
  cloudContacts: { id: string; name: string; phone: string }[];
}

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
  const [showTeamGenerator, setShowTeamGenerator] = useState(false);

  // ★ 新增：標題編輯狀態
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // ★ 新增：儲存編輯後的標題
  const saveTitle = () => {
    if (editTitleValue.trim()) {
      onUpdate({ ...event, eventName: editTitleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  // ★ 焦點自動定位到編輯框並全選
  useEffect(() => {
    if (isEditingTitle && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingTitle]);

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
      <Modal isOpen={modalType === 'add-session'} title="新增時段" onSubmit={handleSubmit} onClose={() => setModalType(null)} submitLabel="新增">
        <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="例如: 18:00 - 20:00" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </Modal>

      <Modal isOpen={modalType === 'add-player'} title="新增球員" onSubmit={handleSubmit} onClose={() => setModalType(null)} submitLabel="新增">
        <input autoFocus value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="球員姓名" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 font-bold" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
      </Modal>

      <Modal isOpen={modalType?.startsWith('delete') || false} title="確認刪除？" onSubmit={handleSubmit} onClose={() => setModalType(null)} isDestructive submitLabel="確認刪除">
        <p className="text-slate-500 font-medium">此動作無法復原，確定要執行嗎？</p>
      </Modal>

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
        {/* ★ 可點擊編輯的標題區塊 */}
        {isEditingTitle ? (
          <div className="flex items-center gap-2 mb-1 animate-in fade-in duration-200">
            <input 
              ref={editInputRef}
              type="text" 
              value={editTitleValue} 
              onChange={e => setEditTitleValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              className="flex-1 text-2xl font-black text-blue-900 tracking-tight bg-slate-50 border border-slate-300 rounded-xl px-3 py-1 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button onClick={saveTitle} className="bg-emerald-100 text-emerald-600 p-2 rounded-xl hover:bg-emerald-200 active:scale-95 transition-all">
              <Check size={18} />
            </button>
            <button onClick={() => setIsEditingTitle(false)} className="bg-slate-100 text-slate-500 p-2 rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-1 group cursor-pointer" onClick={() => {
            setEditTitleValue(event.eventName);
            setIsEditingTitle(true);
          }}>
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">{event.eventName}</h1>
            <div className="text-slate-300 group-hover:text-blue-500 transition-colors p-1 bg-slate-100/50 rounded-lg">
              <Edit2 size={16} />
            </div>
          </div>
        )}
        <p className="text-slate-400 font-bold">{event.date}</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setModalType('add-session')} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-slate-200 rounded-2xl font-black text-blue-700 shadow-sm active:scale-95 transition-all">
          <Clock size={18} /> <span className="text-[10px] uppercase tracking-widest">加時段</span>
        </button>
        <button onClick={() => setModalType('add-player')} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-white border border-slate-200 rounded-2xl font-black text-blue-700 shadow-sm active:scale-95 transition-all">
          <UserPlus size={18} /> <span className="text-[10px] uppercase tracking-widest">加球員</span>
        </button>
        <button onClick={() => setShowTeamGenerator(true)} className="flex flex-col items-center justify-center gap-1.5 py-3 bg-gradient-to-br from-indigo-500 to-blue-600 border border-blue-400 rounded-2xl font-black text-white shadow-sm active:scale-95 transition-all">
          <Users size={18} /> <span className="text-[10px] uppercase tracking-widest">智能分隊</span>
        </button>
      </div>

      <MatrixGrid 
        event={event} 
        cloudContacts={cloudContacts} 
        onWeightChange={handleWeightChange}
        onRemoveSession={id => { setTargetId(id); setModalType('delete-session'); }}
        onRemovePlayer={id => { setTargetId(id); setModalType('delete-player'); }}
        onHostChange={handleHostChange} 
        onReorderPlayers={(newPlayers) => onUpdate({ ...event, players: newPlayers })}
        onReorderSessions={(newSessions) => onUpdate({ ...event, sessions: newSessions })}
      />
      
      <SummaryCard 
        event={event} 
        phoneBook={phoneBook} 
        cloudContacts={cloudContacts} 
      />

       {showTeamGenerator && (
        <TeamGenerator 
          event={event} 
          onClose={() => setShowTeamGenerator(false)} 
        />
      )}

      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-6 z-[60] p-4 bg-blue-700 text-white rounded-full shadow-2xl transition-all hover:bg-blue-800 active:scale-90 ring-4 ring-white"
      >
        <ArrowUp size={24} />
      </button>
    </div>
  );
};