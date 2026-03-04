import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { Receipt, CheckCircle2, Check, ArrowLeft, ChevronRight, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  events: EventData[];
  paidStatus: { [key: string]: boolean };
  onTogglePaid: (key: string) => void;
}

export const Ledger: React.FC<Props> = ({ events, paidStatus, onTogglePaid }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // 1. 核心引擎：預先計算所有活動的帳目明細
  const eventDebts = useMemo(() => {
    const debtsByEvent: { [eventId: string]: any[] } = {};

    events.forEach(event => {
      if (!event.sessions || !event.players) return;

      const balances: { [playerId: string]: number } = {};
      event.players.forEach(p => { balances[p.id] = 0; });

      event.sessions.forEach(session => {
        if (session.hostId) {
          let targetId = session.hostId;
          const playerByName = event.players.find(p => p.name === session.hostId || p.id === session.hostId);
          if (playerByName) targetId = playerByName.id;
          if (balances[targetId] === undefined) balances[targetId] = 0;
          balances[targetId] += session.cost;
        }
      });

      event.sessions.forEach(session => {
        const participants = event.players.filter(p => (event.participation?.[`${session.id}_${p.id}`] || 0) > 0);
        const totalWeight = participants.reduce((sum, p) => sum + (event.participation?.[`${session.id}_${p.id}`] || 0), 0);
        if (totalWeight > 0) {
          const unitCost = session.cost / totalWeight;
          participants.forEach(p => {
            const weight = event.participation?.[`${session.id}_${p.id}`] || 0;
            balances[p.id] -= unitCost * weight;
          });
        }
      });

      const debtors: { id: string; amount: number }[] = [];
      const creditors: { id: string; amount: number }[] = [];
      Object.entries(balances).forEach(([id, balance]) => {
        if (balance < -0.1) debtors.push({ id, amount: Math.abs(balance) });
        else if (balance > 0.1) creditors.push({ id, amount: balance });
      });

      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);

      const tempDebtors = JSON.parse(JSON.stringify(debtors));
      const tempCreditors = JSON.parse(JSON.stringify(creditors));
      let dIdx = 0, cIdx = 0;
      const transactions = [];

      while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
        const d = tempDebtors[dIdx], c = tempCreditors[cIdx];
        const settleAmount = Math.min(d.amount, c.amount);

        const fromPlayer = event.players.find(p => p.id === d.id);
        const toPlayer = event.players.find(p => p.id === c.id);

        transactions.push({
          fromId: d.id,
          toId: c.id,
          fromName: fromPlayer ? fromPlayer.name : d.id,
          toName: toPlayer ? toPlayer.name : c.id,
          amount: settleAmount,
          uniqueKey: `${event.id}_${d.id}_${c.id}`
        });

        d.amount -= settleAmount;
        c.amount -= settleAmount;
        if (d.amount < 0.1) dIdx++;
        if (c.amount < 0.1) cIdx++;
      }

      debtsByEvent[event.id] = transactions;
    });

    return debtsByEvent;
  }, [events]);

  // ==========================================
  // 視圖 2：單一活動的欠款明細 (點擊進入後)
  // ==========================================
  if (selectedEventId) {
    const event = events.find(e => e.id === selectedEventId);
    if (!event) return null;

    const debts = eventDebts[selectedEventId] || [];
    
    const groupedDebts: { [name: string]: any[] } = {};
    debts.forEach(debt => {
      if (!groupedDebts[debt.fromName]) groupedDebts[debt.fromName] = [];
      groupedDebts[debt.fromName].push(debt);
    });

    // ★ 核心優化：修復浮點數誤差，確保「未付款」絕對置頂
    const debtorNames = Object.keys(groupedDebts).sort((a, b) => {
      const unpaidA = groupedDebts[a].filter(d => !paidStatus[d.uniqueKey]).reduce((sum, d) => sum + d.amount, 0);
      const unpaidB = groupedDebts[b].filter(d => !paidStatus[d.uniqueKey]).reduce((sum, d) => sum + d.amount, 0);

      // 使用 0.1 作為容差值，避免浮點數 0.0000001 造成的誤判
      const hasUnpaidA = unpaidA > 0.1;
      const hasUnpaidB = unpaidB > 0.1;

      // 規則 1：有欠款的排前面，已付清的排後面
      if (hasUnpaidA && !hasUnpaidB) return -1;
      if (!hasUnpaidA && hasUnpaidB) return 1;
      
      // 規則 2：都有欠款的話，欠比較多的排前面
      if (hasUnpaidA && hasUnpaidB && Math.abs(unpaidA - unpaidB) > 0.1) {
        return unpaidB - unpaidA; 
      }
      
      // 規則 3：狀態一樣的話，照字母順序排
      return a.localeCompare(b);
    });

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 mb-8 mt-2">
        <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-100 flex items-center gap-3 mb-2">
          <button 
            onClick={() => setSelectedEventId(null)} 
            className="flex items-center gap-1 text-slate-500 hover:text-blue-700 font-black transition-colors active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-blue-900 leading-tight">{event.eventName}</h2>
            <p className="text-xs font-bold text-slate-400">{event.date} 的結算明細</p>
          </div>
        </div>

        {debtorNames.length === 0 ? (
          <div className="py-20 text-center">
            <CheckCircle2 size={64} className="mx-auto text-emerald-300 mb-4 opacity-50" />
            <h2 className="text-xl font-black text-slate-400">本場活動帳目已清</h2>
            <p className="text-sm font-bold text-slate-300 mt-2">無需任何轉帳操作</p>
          </div>
        ) : (
          <div className="space-y-4">
            {debtorNames.map(debtorName => {
              // ★ 第二層優化：卡片內部的項目也是「未打勾」排在「已打勾」前面
              const personDebts = [...groupedDebts[debtorName]].sort((a, b) => {
                const paidA = paidStatus[a.uniqueKey] ? 1 : 0;
                const paidB = paidStatus[b.uniqueKey] ? 1 : 0;
                if (paidA !== paidB) return paidA - paidB; // 0 (未付) 排在 1 (已付) 前面
                return b.amount - a.amount;
              });

              const totalUnpaid = personDebts.filter(d => !paidStatus[d.uniqueKey]).reduce((sum, d) => sum + d.amount, 0);
              const isAllPaid = totalUnpaid < 0.1;

              return (
                <div key={debtorName} className={`bg-white rounded-[2rem] p-5 border shadow-sm transition-all duration-300 ${isAllPaid ? 'border-emerald-100 opacity-60 bg-slate-50' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                    <h3 className={`font-black text-xl ${isAllPaid ? 'text-slate-400' : 'text-slate-700'}`}>{debtorName}</h3>
                    {isAllPaid ? (
                      <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                        <Check size={12} /> 已結清
                      </span>
                    ) : (
                      <div className="text-right">
                        <span className="text-[10px] font-black text-red-400 uppercase block mb-0.5">待付總額</span>
                        <span className="text-xl font-black text-red-500 tracking-tighter">${totalUnpaid.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {personDebts.map(debt => {
                      const isPaid = paidStatus[debt.uniqueKey];
                      return (
                        <div 
                          key={debt.uniqueKey} 
                          onClick={() => onTogglePaid(debt.uniqueKey)} 
                          className={`flex justify-between items-center p-3.5 rounded-2xl cursor-pointer transition-all border active:scale-[0.98] ${
                            isPaid 
                              ? 'bg-slate-50 border-slate-100 opacity-70' 
                              : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-200'
                          }`}
                        >
                          <span className={`font-black text-sm flex items-center gap-1.5 ${isPaid ? 'text-slate-400 line-through decoration-slate-300' : 'text-blue-900'}`}>
                            支付給 {debt.toName}
                            <span className={`${isPaid ? 'text-slate-400' : 'text-blue-600'}`}>${debt.amount.toFixed(1)}</span>
                          </span>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isPaid ? 'bg-emerald-500 text-white shadow-inner' : 'border-2 border-blue-200 bg-white'
                          }`}>
                            {isPaid && <Check size={14} strokeWidth={4} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 視圖 1：活動列表 (首頁狀態)
  // ==========================================
  if (events.length === 0) {
    return (
      <div className="py-20 text-center animate-in fade-in zoom-in duration-300">
        <Receipt size={64} className="mx-auto text-slate-300 mb-4 opacity-50" />
        <h2 className="text-xl font-black text-slate-400">尚無活動紀錄</h2>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 mt-2">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-6 rounded-[2rem] text-white shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Receipt size={24} /> 活動結算
          </h2>
          <p className="text-[10px] font-bold text-blue-200 mt-1 uppercase tracking-widest">Billing History</p>
        </div>
      </div>

      <div className="space-y-3">
        {events.map(event => {
          const debts = eventDebts[event.id] || [];
          const totalTransactions = debts.length;
          
          // 修正浮點數誤差，只計算尚未結清的交易數量
          const unpaidTransactions = debts.filter(d => !paidStatus[d.uniqueKey]).length;
          
          const dateMatch = event.date.match(/(\d+)月\s*(\d+)日/);
          const month = dateMatch ? dateMatch[1] : '';
          const day = dateMatch ? dateMatch[2] : '';

          return (
            <div 
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer active:scale-95 transition-all hover:border-blue-300 group"
            >
              <div className="bg-slate-50 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0 group-hover:bg-blue-50 transition-colors">
                {month && day ? (
                  <>
                    <span className="text-[10px] font-black text-blue-500 uppercase">{month}月</span>
                    <span className="text-xl font-black text-blue-900 leading-none mt-0.5">{day}</span>
                  </>
                ) : (
                  <CalendarIcon size={24} className="text-blue-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-700 text-lg truncate group-hover:text-blue-800 transition-colors">{event.eventName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {totalTransactions === 0 ? (
                    <span className="text-xs font-bold text-slate-400">無需結算</span>
                  ) : unpaidTransactions === 0 ? (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                      <Check size={10} /> 全部結清
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-red-100 text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit animate-pulse">
                      <AlertCircle size={10} /> 剩餘 {unpaidTransactions} 筆未收
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};