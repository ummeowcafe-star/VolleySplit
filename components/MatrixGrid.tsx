import React from 'react';
import { EventData } from '../types';
import { Trash2, X, Crown } from 'lucide-react';

interface Props {
  event: EventData;
  onWeightChange: (sessionId: string, playerId: string, weight: number) => void;
  onRemoveSession: (sessionId: string) => void;
  onRemovePlayer: (playerId: string) => void;
  onHostChange: (sessionId: string, hostId: string) => void; // 新增：處理主持人變更
}

export const MatrixGrid: React.FC<Props> = ({ event, onWeightChange, onRemoveSession, onRemovePlayer, onHostChange }) => {
  
  const getWeight = (sessionId: string, playerId: string) => {
    const key = `${sessionId}_${playerId}`;
    return event.participation?.[key] || 0;
  };

  const getWeightStyle = (w: number) => {
    if (w === 1) return 'bg-emerald-500 text-white border-emerald-600 shadow-md';
    if (w === 0.5) return 'bg-yellow-400 text-white border-yellow-500 shadow-md';
    return 'bg-slate-100 text-slate-300 border-slate-200';
  };

  const toggleWeight = (sessionId: string, playerId: string) => {
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
              
              {event.sessions.map(session => (
                <th key={session.id} className="px-4 py-4 min-w-[130px] text-center font-black text-blue-900 border-b border-blue-100 group relative">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-blue-400 uppercase tracking-tighter">Time</span>
                    <span className="text-xs whitespace-nowrap">{session.name}</span>
                    <div className="text-[9px] font-bold text-blue-300">${session.cost}</div>
                    
                    {/* ★新增：主持人選擇器 */}
                    <div className="mt-2 w-full px-1">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Crown size={10} className={session.hostId ? "text-yellow-500" : "text-blue-200"} />
                        <span className="text-[9px] text-blue-400 uppercase">Host</span>
                      </div>
                      <select 
                        value={session.hostId || ''}
                        onChange={(e) => onHostChange(session.id, e.target.value)}
                        className="w-full text-[10px] bg-white border border-blue-100 rounded-lg py-1 px-1 outline-none focus:ring-1 focus:ring-blue-400 font-bold text-blue-700 cursor-pointer"
                      >
                        <option value="">選擇代付人</option>
                        {event.players.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
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
            {event.players.map(player => (
              <tr key={player.id} className="hover:bg-blue-50/20 transition-colors">
                <td className="px-5 py-4 font-black text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between group">
                    <span className="truncate max-w-[90px]">{player.name}</span>
                    <button onClick={() => onRemovePlayer(player.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                  </div>
                </td>
                
                {event.sessions.map(session => {
                  const weight = getWeight(session.id, player.id);
                  const isHost = session.hostId === player.id; // 檢查此球員是否為此 Session 主持人
                  return (
                    <td key={session.id} className={`px-3 py-3 text-center ${isHost ? 'bg-yellow-50/30' : ''}`}>
                      <button
                        type="button"
                        onClick={() => toggleWeight(session.id, player.id)}
                        className={`w-12 h-12 rounded-2xl border-2 transition-all duration-200 font-black text-sm relative ${getWeightStyle(weight)} active:scale-90`}
                      >
                        {weight === 1 ? '1' : weight === 0.5 ? '.5' : ''}
                        {/* 如果是主持人，在按鈕角落顯示小皇冠 */}
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