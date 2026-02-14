import React from 'react';
import { Trash2, User, Crown } from 'lucide-react';
import { EventData } from '../types';

interface MatrixGridProps {
  event: EventData;
  cloudContacts: { id: string; name: string; phone: string }[];
  onWeightChange: (sessionId: string, playerId: string, weight: number) => void;
  onRemoveSession: (id: string) => void;
  onRemovePlayer: (id: string) => void;
  onHostChange: (sessionId: string, hostId: string) => void;
}

export const MatrixGrid: React.FC<MatrixGridProps> = ({ 
  event, 
  cloudContacts, 
  onWeightChange, 
  onRemoveSession, 
  onRemovePlayer, 
  onHostChange 
}) => {
  
  // ★ 1. 排重邏輯：過濾掉已經在雲端聯絡簿中的球員，避免下拉選單出現兩次
  const uniqueTodayPlayers = event.players.filter(player => 
    !cloudContacts.some(cloud => cloud.name.trim() === player.name.trim())
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in zoom-in duration-500">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            {/* 時段標題行 */}
            <tr className="bg-slate-50/50">
              <th className="p-4 text-left border-b border-slate-100 min-w-[120px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">點名矩陣</span>
              </th>
              {event.sessions.map((session) => (
                <th key={session.id} className="p-4 border-b border-slate-100 min-w-[140px] group">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Time</span>
                    <span className="text-sm font-black text-blue-900">{session.name}</span>
                    <span className="text-[10px] font-bold text-slate-300">${session.cost}</span>
                    <button 
                      onClick={() => onRemoveSession(session.id)}
                      className="mt-2 p-1.5 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>

            {/* ★ 2. Host 下拉選單行 - 實裝排重過濾 */}
            <tr className="bg-blue-50/30">
              <td className="p-4 border-b border-slate-100 text-center">
                <div className="flex items-center gap-2 justify-center">
                  <Crown size={14} className="text-amber-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Paid By</span>
                </div>
              </td>
              {event.sessions.map((session) => (
                <td key={session.id} className="p-2 border-b border-slate-100">
                  <div className="bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-600 transition-all">
                    <select
                      value={session.hostId || ''}
                      onChange={(e) => onHostChange(session.id, e.target.value)}
                      className="w-full bg-transparent text-xs font-black text-blue-700 outline-none appearance-none cursor-pointer"
                    >
                      <option value="">選擇付款人...</option>
                      
                      {/* 第一組：雲端聯絡簿 (具備電話，優先顯示) */}
                      <optgroup label="🌟 雲端聯絡簿 (有電話)">
                        {cloudContacts.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </optgroup>

                      {/* 第二組：今日玩家 (已自動排除重複的人) */}
                      <optgroup label="🏐 今日玩家">
                        {uniqueTodayPlayers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* 球員名單行 */}
            {event.players.map((player) => (
              <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 border-b border-slate-50 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User size={16} />
                      </div>
                      <span className="font-black text-slate-700 text-sm">{player.name}</span>
                    </div>
                    <button 
                      onClick={() => onRemovePlayer(player.id)}
                      className="p-1 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
                {event.sessions.map((session) => {
                  const weight = event.participation?.[`${session.id}_${player.id}`] || 0;
                  return (
                    <td key={session.id} className="p-2 border-b border-slate-50 text-center">
                      <button
                        onClick={() => onWeightChange(session.id, player.id, weight === 1 ? 0.5 : weight === 0.5 ? 0 : 1)}
                        className={`w-12 h-12 rounded-2xl font-black text-lg transition-all active:scale-90 ${
                          weight === 1 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                            : weight === 0.5
                            ? 'bg-amber-400 text-white shadow-lg shadow-amber-100'
                            : 'bg-slate-50 text-slate-200'
                        }`}
                      >
                        {weight > 0 ? (weight === 1 ? '1' : '½') : '0'}
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