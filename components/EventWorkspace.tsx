import React, { useState } from 'react';
import { EventData, Session } from '../types';
import { MatrixGrid } from './MatrixGrid';
import { SummaryCard } from './SummaryCard';
import { ArrowLeft, Trash2, Clock, UserPlus, X, Check } from 'lucide-react';

interface Props {
  event: EventData;
  onUpdate: (event: EventData) => void;
  onBack: () => void;
  onDelete: () => void;
}

// --- 內部元件：自定義彈窗 (Modal) ---
// 這取代了被 Google AI Studio 封鎖的 window.prompt
const Modal = ({ 
  isOpen, 
  title, 
  onClose, 
  onSubmit, 
  children, 
  submitLabel = "Confirm",
  isDestructive = false
}: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* 彈窗內容 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {children}
        </div>

        <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onSubmit}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all flex items-center gap-2 ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isDestructive && <Trash2 size={16} />}
            {!isDestructive && <Check size={16} />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const EventWorkspace: React.FC<Props> = ({ event, onUpdate, onBack, onDelete }) => {
  // --- State 管理彈窗 ---
  const [modalType, setModalType] = useState<'add-session' | 'add-player' | 'delete-session' | 'delete-player' | 'delete-event' | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);

  // 安全 ID 生成
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // --- 開啟彈窗的函數 ---
  const openAddSession = () => {
    setInputValue("");
    setModalType('add-session');
  };

  const openAddPlayer = () => {
    setInputValue("");
    setModalType('add-player');
  };

  const openDeleteSession = (id: string) => {
    setTargetId(id);
    setModalType('delete-session');
  };

  const openDeletePlayer = (id: string) => {
    setTargetId(id);
    setModalType('delete-player');
  };

  const openDeleteEvent = () => {
    setModalType('delete-event');
  };

  // --- 關閉彈窗 ---
  const closeModal = () => {
    setModalType(null);
    setInputValue("");
    setTargetId(null);
  };

  // --- 執行邏輯 (從 Modal 觸發) ---
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
        alert("Player already exists!"); // 這個 alert 通常不會被擋，若被擋也沒關係，只是沒提示
        return;
      }
      const newPlayer = { id: generateId(), name };
      onUpdate({ ...event, players: [...event.players, newPlayer] });
    }

    if (modalType === 'delete-session' && targetId) {
      const newSessions = event.sessions.filter(s => s.id !== targetId);
      const newParticipation = { ...(event.participation || {}) };
      Object.keys(newParticipation).forEach(key => {
        if (key.startsWith(`${targetId}_`)) delete newParticipation[key];
      });
      onUpdate({ ...event, sessions: newSessions, participation: newParticipation });
    }

    if (modalType === 'delete-player' && targetId) {
      const newPlayers = event.players.filter(p => p.id !== targetId);
      const newParticipation = { ...(event.participation || {}) };
      Object.keys(newParticipation).forEach(key => {
        if (key.endsWith(`_${targetId}`)) delete newParticipation[key];
      });
      onUpdate({ ...event, players: newPlayers, participation: newParticipation });
    }

    if (modalType === 'delete-event') {
      onDelete();
    }

    closeModal();
  };

  // 權重變更 (這個不需要彈窗，直接操作)
  const handleWeightChange = (sessionId: string, playerId: string, weight: number) => {
    const newParticipation = { ...(event.participation || {}) };
    const key = `${sessionId}_${playerId}`;
    
    if (weight === 0) delete newParticipation[key];
    else newParticipation[key] = weight;

    onUpdate({ ...event, participation: newParticipation });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* --- 彈窗區域 (根據 state 顯示不同內容) --- */}
      
      {/* 1. 新增 Session 彈窗 */}
      <Modal
        isOpen={modalType === 'add-session'}
        title="Add New Session"
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel="Add Session"
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Time / Name</label>
          <input 
            autoFocus
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. 18:00 - 19:00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </Modal>

      {/* 2. 新增 Player 彈窗 */}
      <Modal
        isOpen={modalType === 'add-player'}
        title="Add New Player"
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel="Add Player"
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Player Name</label>
          <input 
            autoFocus
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="e.g. Carol"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </Modal>

      {/* 3. 刪除確認彈窗 (Session) */}
      <Modal
        isOpen={modalType === 'delete-session'}
        title="Delete Session?"
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel="Delete"
        isDestructive={true}
      >
        <p className="text-gray-600">
          Are you sure you want to delete this session? This action cannot be undone.
        </p>
      </Modal>

      {/* 4. 刪除確認彈窗 (Player) */}
      <Modal
        isOpen={modalType === 'delete-player'}
        title="Remove Player?"
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel="Remove"
        isDestructive={true}
      >
        <p className="text-gray-600">
          Are you sure you want to remove this player from the event?
        </p>
      </Modal>

      {/* 5. 刪除 Event 確認 */}
      <Modal
        isOpen={modalType === 'delete-event'}
        title="Delete Event?"
        onClose={closeModal}
        onSubmit={handleSubmit}
        submitLabel="Delete Event"
        isDestructive={true}
      >
        <p className="text-gray-600">
          Permanently delete <strong>{event.eventName}</strong>?
        </p>
      </Modal>


      {/* --- 主介面 --- */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-slate-100">
          <ArrowLeft size={20} /> Back
        </button>
        <button onClick={openDeleteEvent} className="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50">
          <Trash2 size={20} />
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{event.eventName}</h1>
        <p className="text-slate-500">{event.date}</p>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={openAddSession}
          className="flex-1 bg-white border border-indigo-200 text-indigo-600 px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Clock size={18} /> Add Session
        </button>
        <button 
          onClick={openAddPlayer}
          className="flex-1 bg-white border border-indigo-200 text-indigo-600 px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={18} /> Add Player
        </button>
      </div>

      <MatrixGrid 
        event={event} 
        onWeightChange={handleWeightChange}
        onRemoveSession={openDeleteSession} // 改用新的 open 函數
        onRemovePlayer={openDeletePlayer}   // 改用新的 open 函數
      />
      
      <SummaryCard event={event} />
    </div>
  );
};