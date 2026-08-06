import React, { useState, useRef, useEffect } from 'react';
import { EventData } from '../types';
import { Trash2, X, Crown, GripVertical, GripHorizontal, CheckSquare, Square } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  price: number;
}

interface Props {
  event: EventData;
  cloudContacts: { id: string; name: string; phone: string }[];
  venues: Venue[];
  onWeightChange: (sessionId: string, playerId: string, weight: number) => void;
  onBatchWeightChange?: (updates: { [key: string]: number }) => void; // 🌟 新增：批次更新支援
  onRemoveSession: (sessionId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onHostChange: (sessionId: string, hostId: string) => void;
  onSessionCostChange: (sessionId: string, cost: number) => void;
  onReorderPlayers?: (newPlayers: any[]) => void;
  onReorderSessions?: (newSessions: any[]) => void;
}

export const MatrixGrid: React.FC<Props> = ({ 
  event, 
  cloudContacts, 
  venues, 
  onWeightChange, 
  onBatchWeightChange,
  onRemoveSession, 
  onRemovePlayer, 
  onHostChange,
  onSessionCostChange, 
  onReorderPlayers,
  onReorderSessions
}) => {
  
  const [dragInfo, setDragInfo] = useState<{ type: 'player' | 'session', index: number } | null>(null);

  const stateRef = useRef({ event, dragInfo, onReorderPlayers, onReorderSessions });
  stateRef.current = { event, dragInfo, onReorderPlayers, onReorderSessions };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (stateRef.current.dragInfo) {
        e.preventDefault(); 
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const { dragInfo: info, event: evt, onReorderPlayers: cbPlayers, onReorderSessions: cbSessions } = stateRef.current;
      if (!info || !evt) return;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;

      if (info.type === 'player') {
        const targetRow = target.closest('[data-player-index]');
        if (targetRow) {
          const targetIndex = parseInt(targetRow.getAttribute('data-player-index') || '-1', 10);
          if (targetIndex !== -1 && targetIndex !== info.index) {
            const newPlayers = [...evt.players];
            const [moved] = newPlayers.splice(info.index, 1);
            newPlayers.splice(targetIndex, 0, moved);
            
            cbPlayers?.(newPlayers);
            
            const nextInfo = { type: 'player' as const, index: targetIndex };
            stateRef.current.dragInfo = nextInfo;
            setDragInfo(nextInfo);
          }
        }
      } else if (info.type === 'session') {
        const targetCol = target.closest('[data-session-index]');
        if (targetCol) {
          const targetIndex = parseInt(targetCol.getAttribute('data-session-index') || '-1', 10);
          if (targetIndex !== -1 && targetIndex !== info.index) {
            const newSessions = [...evt.sessions];
            const [moved] = newSessions.splice(info.index, 1);
            newSessions.splice(targetIndex, 0, moved);
            
            cbSessions?.(newSessions);
            
            const nextInfo = { type: 'session' as const, index: targetIndex };
            stateRef.current.dragInfo = nextInfo;
            setDragInfo(nextInfo);
          }
        }
      }
    };

    const handlePointerUp = () => {
      stateRef.current.dragInfo = null;
      setDragInfo(null);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []); 

  const uniqueTodayPlayers = event.players.filter(player => 
    !cloudContacts.some(cloud => cloud.name.trim() === player.name.trim())
  );

  const getWeight = (sessionId: string, playerId: string) => {
    const key = `${sessionId}_${playerId}`;
    return event.participation?.[key] ?? 0;
  };

  const getWeightStyle = (w: number, hasHost: boolean) => {
    if (!hasHost) return 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed';
    if (w === 1) return 'bg-emerald-500 text-white border-emerald-600 shadow-md';
    if (w === 0.5) return 'bg-yellow-400 text-white border-yellow-500 shadow-md';
    return 'bg-slate-100 text-slate-300 border-slate-200';
  };

  const toggleWeight = (sessionId: string, playerId: string) => {
    const session = event.sessions.find(s => s.id === sessionId);
    if (!session?.hostId) {
      alert(`請先為場次「${session?.name}」選擇代付人 (Host) 再開始點名喔！`);
      return;
    }
    const currentWeight = getWeight(sessionId, playerId);
    let nextWeight = 0;
    if (currentWeight === 0) nextWeight = 1;
    else if (currentWeight === 1) nextWeight = 0.5;
    else nextWeight = 0;
    onWeightChange(sessionId, playerId, nextWeight);
  };

  // 檢查該時段是否所有人都是 1.0 (全到)
  const isSessionAllSelected = (sessionId: string) => {
    if (!event.players || event.players.length === 0) return false;
    return event.players.every(player => getWeight(sessionId, player.id) === 1);
  };

  // 🌟 修復後的一鍵全選 / 全清空邏輯
  const handleToggleSessionAll = (sessionId: string) => {
    const session = event.sessions.find(s => s.id === sessionId);
    if (!session?.hostId) {
      alert(`請先為場次「${session?.name || ''}」選擇代付人 (Host) 再進行全選喔！`);
      return;
    }

    if (!event.players || event.players.length === 0) {
      alert('請先新增球員再進行全選！');
      return;
    }

    const allAreOne = isSessionAllSelected(sessionId);
    const targetWeight = allAreOne ? 0 : 1;

    // 彙整該時段所有球員的更新資料
    const updates: { [key: string]: number } = {};
    event.players.forEach(player => {
      const key = `${sessionId}_${player.id}`;
      updates[key] = targetWeight;
    });

    // 若父組件有傳入批次更新函式則優先採用，否則逐一呼叫
    if (onBatchWeightChange) {
      onBatchWeightChange(updates);
    } else {
      Object.entries(updates).forEach(([key, weight]) => {
        const [sId, pId] = key.split('_');
        onWeightChange(sId, pId, weight);
      });
    }
  };

  if (!event || !event.sessions || !event.players) {
    return <div className="p-8 text-center text-blue-300 font-bold">載入點名矩陣中...</div>;
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
        <h3 className="font-black text-blue-900 text-sm uppercase tracking-wider">點名矩陣</h3>
        <div className="flex gap-3 text-[10px] font-black uppercase">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 1.0</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> 0.5</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span> 0</div>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-blue-50/50">
              <th className="px-5 py-4 min-w-[130px] font-black text-blue-400 uppercase text-[10px] sticky left-0 bg-blue-50 z-20 border-b border-blue-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                Player
              </th>
              
              {event.sessions.map((session, index) => {
                const allSelected = isSessionAllSelected(session.id);
                return (
                  <th 
                    key={session.id} 
                    data-session-index={index}
                    className={`px-4 py-4 min-w-[130px] text-center font-black text-blue-900 border-b border-blue-100 group relative transition-all ${dragInfo?.type === 'session' && dragInfo.index === index ? 'opacity-60 bg-blue-100 shadow-inner' : ''}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="touch-none p-3 -mt-2 cursor-grab active:cursor-grabbing text-blue-300 hover:text-blue-600"
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDragInfo({ type: 'session', index });
                        }}
                      >
                        <GripHorizontal size={18} />
                      </div>

                      <span className="text-[10px] text-blue-400 uppercase tracking-tighter">Time</span>
                      <span className="text-xs whitespace-nowrap">{session.name}</span>
                      
                      {/* 一鍵全選按鈕 */}
                      <button
                        type="button"
                        onClick={() => handleToggleSessionAll(session.id)}
                        className={`mt-1 px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all active:scale-95 ${
                          allSelected 
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                            : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                        title={allSelected ? "點擊取消全選" : "一鍵全選該時段"}
                      >
                        {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                        {allSelected ? '已全選' : '全選'}
                      </button>

                      {/* 價錢下拉選單 */}
                      <select 
                        value={session.cost}
                        onChange={(e) => onSessionCostChange(session.id, Number(e.target.value))}
                        className="mt-1 w-[90%] text-[10px] font-black text-blue-600 bg-white border border-blue-200 rounded-lg py-1 px-1 outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer shadow-sm text-center"
                      >
                        {venues && venues.map(v => (
                          <option key={v.id} value={v.price}>{v.name} (${v.price}/hr)</option>
                        ))}
                      </select>
                      
                      <div className="mt-2 w-full px-1">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Crown size={10} className={session.hostId ? "text-yellow-500" : "text-blue-200"} />
                          <span className="text-[9px] text-blue-400 uppercase">Paid By</span>
                        </div>
                        
                        <select 
                          value={session.hostId || ''}
                          onChange={(e) => onHostChange(session.id, e.target.value)}
                          className={`w-full text-[10px] bg-white border ${!session.hostId ? 'border-red-200 animate-pulse' : 'border-blue-100'} rounded-lg py-1 px-1 outline-none focus:ring-1 focus:ring-blue-400 font-bold text-blue-700 cursor-pointer`}
                        >
                          <option value="">選擇代付人</option>
                          {cloudContacts.length > 0 && (
                            <optgroup label="🌟 雲端聯絡簿">
                              {cloudContacts.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="🏐 今日玩家">
                            {uniqueTodayPlayers.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <button 
                        onClick={() => onRemoveSession(session.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-50 text-red-400 p-1 rounded-full transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {event.players.map((player, index) => (
              <tr 
                key={player.id} 
                data-player-index={index}
                className={`transition-colors ${dragInfo?.type === 'player' && dragInfo.index === index ? 'opacity-60 bg-blue-50/80 shadow-inner' : 'hover:bg-blue-50/20'}`}
              >
                <td className="px-5 py-4 sticky left-0 bg-white z-10 border-r border-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-0.5">
                      <div 
                        className="touch-none p-3 -ml-4 cursor-grab active:cursor-grabbing text-slate-300 hover:text-blue-500"
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setDragInfo({ type: 'player', index });
                        }}
                      >
                        <GripVertical size={18} />
                      </div>
                      <span className="truncate max-w-[70px] font-black text-slate-700">{player.name}</span>
                    </div>
                    <button onClick={() => onRemovePlayer(player.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                  </div>
                </td>
                
                {event.sessions.map(session => {
                  const weight = getWeight(session.id, player.id);
                  const isHost = session.hostId === player.id;
                  const hasHost = !!session.hostId;

                  return (
                    <td key={session.id} data-session-index={event.sessions.findIndex(s => s.id === session.id)} className={`px-3 py-3 text-center ${isHost ? 'bg-yellow-50/30' : ''}`}>
                      <button
                        type="button"
                        onClick={() => toggleWeight(session.id, player.id)}
                        className={`w-12 h-12 rounded-2xl border-2 transition-all duration-200 font-black text-sm relative ${getWeightStyle(weight, hasHost)} ${hasHost ? 'active:scale-90' : 'opacity-40'}`}
                      >
                        {weight === 1 ? '1' : weight === 0.5 ? '.5' : ''}
                        {isHost && (
                          <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-0.5 rounded-full border-2 border-white">
                            <Crown size={8} fill="white" />
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};