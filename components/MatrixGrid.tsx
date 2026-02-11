import React from 'react';
import { EventData } from '../types';
import { Trash2 } from 'lucide-react';

interface Props {
  event: EventData;
  onWeightChange: (sessionId: string, playerId: string, weight: number) => void;
  onRemoveSession: (sessionId: string) => void;
  onRemovePlayer: (playerId: string) => void;
}

export const MatrixGrid: React.FC<Props> = ({ event, onWeightChange, onRemoveSession, onRemovePlayer }) => {
  
  const getWeight = (sessionId: string, playerId: string) => {
    const key = `${sessionId}_${playerId}`;
    return event.participation?.[key] || 0;
  };

  const getWeightColor = (w: number) => {
    if (w === 1) return 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
    if (w === 0.5) return 'bg-amber-400 text-white border-amber-500 shadow-sm';
    return 'bg-white border-slate-200 hover:border-indigo-300';
  };

  const toggleWeight = (sessionId: string, playerId: string) => {
    const currentWeight = getWeight(sessionId, playerId);
    let nextWeight = 0;
    if (currentWeight === 0) nextWeight = 1;
    else if (currentWeight === 1) nextWeight = 0.5;
    else if (currentWeight === 0.5) nextWeight = 0;
    
    onWeightChange(sessionId, playerId, nextWeight);
  };

  if (!event || !event.sessions || !event.players) {
    return <div className="p-4 text-center text-gray-400">Loading matrix...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Legend */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h3 className="font-semibold text-slate-700">Check-in Matrix</h3>
        <div className="flex gap-2 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 1.0</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> 0.5</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-gray-300"></span> 0</div>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {/* Sticky Corner Header */}
              <th className="px-4 py-3 min-w-[120px] font-bold text-slate-500 uppercase text-xs sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                TIME
              </th>
              
              {/* Player Columns */}
              {event.players.map(player => (
                <th key={player.id} className="px-2 py-3 min-w-[80px] text-center font-medium text-slate-700 relative group">
                  <div className="flex flex-col items-center gap-1">
                    <span className="truncate max-w-[80px]" title={player.name}>{player.name}</span>
                    
                    {/* Delete Player Button - High Z-Index */}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePlayer(player.id);
                      }}
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all z-30 cursor-pointer"
                      title="Remove player"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {event.sessions.map(session => (
              <tr key={session.id} className="hover:bg-slate-50/50">
                
                {/* Session Row Header (Sticky) */}
                <td className="px-4 py-3 font-medium text-slate-600 bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100">
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap font-semibold">{session.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 font-normal">${session.cost}</span>
                      
                      {/* Delete Session Button - High Z-Index */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSession(session.id);
                        }}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-all z-30 cursor-pointer"
                        title="Remove session"
                      >
                         <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </td>
                
                {/* Matrix Cells */}
                {event.players.map(player => {
                  const weight = getWeight(session.id, player.id);
                  return (
                    <td key={player.id} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleWeight(session.id, player.id)}
                        className={`w-10 h-10 rounded-lg border transition-all duration-200 font-bold ${getWeightColor(weight)} active:scale-95`}
                      >
                        {weight === 1 ? '1' : weight === 0.5 ? '.5' : ''}
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