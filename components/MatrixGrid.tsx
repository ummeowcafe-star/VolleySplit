import React, { useState } from 'react';
import { EventData } from '../types';
import { Trash2, X, Crown, GripVertical, GripHorizontal } from 'lucide-react';

interface Props {
  event: EventData;
  cloudContacts: { id: string; name: string; phone: string }[];
  onWeightChange: (sessionId: string, playerId: string, weight: number) => void;
  onRemoveSession: (sessionId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onHostChange: (sessionId: string, hostId: string) => void;
  onReorderPlayers?: (newPlayers: any[]) => void;
  onReorderSessions?: (newSessions: any[]) => void;
}

export const MatrixGrid: React.FC<Props> = ({ 
  event, 
  cloudContacts, 
  onWeightChange, 
  onRemoveSession, 
  onRemovePlayer, 
  onHostChange,
  onReorderPlayers,
  onReorderSessions
}) => {
  
  const [draggedPlayerIdx, setDraggedPlayerIdx] = useState<number | null>(null);
  const [draggedSessionIdx, setDraggedSessionIdx] = useState<number | null>(null);

  // ==========================================
  // ★ 場次 (Column) 實時拖曳邏輯
  // ==========================================
  const handleSessionDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSessionIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString()); // 修正 Safari/Firefox 拖曳失效的 Bug
  };

  const handleSessionDragEnter = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSessionIdx === null || draggedSessionIdx === targetIndex || !onReorderSessions) return;

    // 實時換位：只要經過就立刻交換
    const newSessions = [...event.sessions];
    const [movedSession] = newSessions.splice(draggedSessionIdx, 1);
    newSessions.splice(targetIndex, 0, movedSession);
    
    onReorderSessions(newSessions);
    setDraggedSessionIdx(targetIndex); // 更新索引，讓拖曳可以連續進行
  };

  // ==========================================
  // ★ 玩家 (Row) 實時拖曳邏輯
  // ==========================================
  const handlePlayerDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPlayerIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString()); // 修正 Safari/Firefox 拖曳失效的 Bug
  };

  const handlePlayerDragEnter = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPlayerIdx === null || draggedPlayerIdx === targetIndex || !onReorderPlayers) return;

    // 實時換位
    const newPlayers = [...event.players];
    const [movedPlayer] = newPlayers.splice(draggedPlayerIdx, 1);
    newPlayers.splice(targetIndex, 0, movedPlayer);
    
    onReorderPlayers(newPlayers);
    setDraggedPlayerIdx(targetIndex);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // 必須阻擋預設行為，才能允許放置
  };

  const handleDragEnd = () => {
    setDraggedPlayerIdx(null);
    setDraggedSessionIdx(null);
  };

  // ==========================================

  const uniqueTodayPlayers = event.players.filter(player => 
    !cloudContacts.some(cloud => cloud.name.trim() === player.name.trim())
  );

  const getWeight = (sessionId: string, playerId: string) => {
    const key = `${sessionId}_${playerId}`;
    return event.participation?.[key] || 0;
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
              
              {event.sessions.map((session, index) => (
                <th 
                  key={session.id} 
                  draggable
                  onDragStart={(e) => handleSessionDragStart(e, index)}
                  onDragEnter={(e) => handleSessionDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  className={`px-4 py-4 min-w-[130px] text-center font-black text-blue-900 border-b border-blue-100 group relative transition-all ${draggedSessionIdx === index ? 'opacity-30 bg-blue-100' : ''}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="cursor-grab active:cursor-grabbing text-blue-200 hover:text-blue-500 mb-1 opacity-50 hover:opacity-100">
                      <GripHorizontal size={14} />
                    </div>

                    <span className="text-[10px] text-blue-400 uppercase tracking-tighter">Time</span>
                    <span className="text-xs whitespace-nowrap">{session.name}</span>
                    <div className="text-[9px] font-bold text-blue-300">${session.cost}</div>
                    
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
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {event.players.map((player, index) => (
              <tr 
                key={player.id} 
                draggable
                onDragStart={(e) => handlePlayerDragStart(e, index)}
                onDragEnter={(e) => handlePlayerDragEnter(e, index)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                className={`transition-colors ${draggedPlayerIdx === index ? 'opacity-30 bg-slate-100' : 'hover:bg-blue-50/20'}`}
              >
                <td className="px-5 py-4 sticky left-0 bg-white z-10 border-r border-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100" />
                      {/* ★ 字體顏色恢復為黑色 font-black text-slate-700 */}
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
                    <td key={session.id} className={`px-3 py-3 text-center ${isHost ? 'bg-yellow-50/30' : ''}`}>
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