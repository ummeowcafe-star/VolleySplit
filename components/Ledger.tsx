import React, { useMemo } from 'react';
import { CheckCircle2, XCircle, Calendar, User, ReceiptText } from 'lucide-react';

interface EventData {
  id: string;
  eventName: string;
  date: string;
  players: any[];
  sessions: any[];
  participation?: { [key: string]: number }; 
}

interface LedgerProps {
  events: EventData[];
  paidStatus: { [key: string]: boolean };
  onTogglePaid: (eventId: string, playerName: string) => void;
}

export const Ledger: React.FC<LedgerProps> = ({ events, paidStatus, onTogglePaid }) => {
  // 將活動按日期排序（最新的在前）
  const sortedEvents = useMemo(() => 
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [events]);

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-500">
      {/* 頁面標題區 */}
      <div className="px-1 flex justify-between items-end">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Accounting</h2>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Event Ledger</h1>
        </div>
        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
          <ReceiptText size={24} />
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2rem] p-16 text-center shadow-sm">
          <Calendar size={48} className="mx-auto text-slate-100 mb-4" />
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No history found</p>
        </div>
      ) : (
        sortedEvents.map((event) => {
          // 1. 計算該活動中每個 Session 的單位權重費用
          const sessionCosts: Record<string, number> = {};
          event.sessions.forEach(session => {
            let totalWeight = 0;
            event.players.forEach(p => {
              totalWeight += Number(event.participation?.[`${session.id}_${p.id}`] ?? 0);
            });
            sessionCosts[session.id] = totalWeight > 0 ? session.cost / totalWeight : 0;
          });

          return (
            <div key={event.id} className="space-y-4">
              {/* 日期分組標題 */}
              <div className="flex items-center gap-3 px-2">
                <div className="h-px flex-1 bg-slate-200"></div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  <Calendar size={12} className="text-indigo-500" />
                  <span className="font-black text-[10px] text-slate-500 uppercase tracking-tighter">
                    {event.date} • {event.eventName}
                  </span>
                </div>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>

              {/* 該場活動的球員清單 */}
              <div className="grid grid-cols-1 gap-3">
                {event.players.map((player) => {
                  const isPaid = paidStatus[`${event.id}_${player.name}`] || false;
                  
                  // 2. 計算該球員在此場活動的個人總費用
                  let playerEventCost = 0;
                  event.sessions.forEach(session => {
                    const weight = Number(event.participation?.[`${session.id}_${player.id}`] ?? 0);
                    playerEventCost += weight * sessionCosts[session.id];
                  });

                  if (playerEventCost < 0.1) return null;

                  return (
                    <button 
                      key={`${event.id}_${player.name}`}
                      onClick={() => onTogglePaid(event.id, player.name)}
                      className={`w-full p-5 rounded-[1.5rem] border transition-all duration-300 flex items-center justify-between active:scale-[0.97] group ${
                        isPaid 
                          ? 'bg-emerald-50/40 border-emerald-100 shadow-sm shadow-emerald-100/50' 
                          : 'bg-white border-slate-100 shadow-md shadow-slate-200/40 hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        {/* 左側圖示 */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                          isPaid ? 'bg-emerald-500 text-white rotate-[360deg]' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400'
                        }`}>
                          <User size={24} strokeWidth={2.5} />
                        </div>

                        <div>
                          <h4 className={`font-black text-base tracking-tight ${isPaid ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {player.name}
                          </h4>
                          {/* 狀態標籤 (Badge) */}
                          <div className="mt-1">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-black text-white uppercase tracking-wider shadow-sm shadow-emerald-200">
                                <CheckCircle2 size={10} strokeWidth={3} /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-[9px] font-black text-red-500 border border-red-100 uppercase tracking-wider shadow-sm shadow-red-50">
                                <XCircle size={10} strokeWidth={3} /> Unpaid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 右側金額 */}
                      <div className="text-right">
                        <p className={`text-xl font-black tabular-nums tracking-tighter ${isPaid ? 'text-emerald-600' : 'text-indigo-600'}`}>
                          ${playerEventCost.toFixed(1)}
                        </p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                          {isPaid ? 'Completed' : 'Balance Due'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
      <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] pt-4">
        End of Records
      </p>
    </div>
  );
};