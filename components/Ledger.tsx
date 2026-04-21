import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { Receipt, CheckCircle2, Check, ArrowLeft, ChevronRight, AlertCircle, Calendar as CalendarIcon, Search, X, Wallet } from 'lucide-react';

interface Props {
  events: EventData[];
  paidStatus: { [key: string]: boolean };
  onTogglePaid: (key: string) => void;
}

export const Ledger: React.FC<Props> = ({ events, paidStatus, onTogglePaid }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // ★ 新增：搜尋關鍵字狀態

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
          eventId: event.id,          // ★ 記錄事件ID
          eventName: event.eventName, // ★ 記錄事件名稱 (給搜尋結果顯示用)
          eventDate: event.date,      // ★ 記錄事件日期 (給搜尋結果顯示用)
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

  // ★ 全域搜尋邏輯：找出正在搜尋的人的「所有未付款項」
  const matchingDebtors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const allDebtsFlat = Object.values(eventDebts).flat();
    // 只抓取「還沒付款」的帳目
    const unpaid = allDebtsFlat.filter(d => !paidStatus[d.uniqueKey]);
    
    const grouped: Record<string, any[]> = {};
    unpaid.forEach(d => {
      if (!grouped[d.fromName]) grouped[d.fromName] = [];
      grouped[d.fromName].push(d);
    });

    return Object.keys(grouped)
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(name => ({
        name,
        total: grouped[name].reduce((sum, d) => sum + d.amount, 0),
        details: grouped[name]
      }));
  }, [searchQuery, eventDebts, paidStatus]);


  // ==========================================
  // 視圖 2：單一活動的欠款明細 (點擊進入後 - Host 專用)
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

    const debtorNames = Object.keys(groupedDebts).sort((a, b) => {
      const unpaidA = groupedDebts[a].filter(d => !paidStatus[d.uniqueKey]).reduce((sum, d) => sum + d.amount, 0);
      const unpaidB = groupedDebts[b].filter(d => !paidStatus[d.uniqueKey]).reduce((sum, d) => sum + d.amount, 0);
      const hasUnpaidA = unpaidA > 0.1;
      const hasUnpaidB = unpaidB > 0.1;

      if (hasUnpaidA && !hasUnpaidB) return -1;
      if (!hasUnpaidA && hasUnpaidB) return 1;
      if (hasUnpaidA && hasUnpaidB && Math.abs(unpaidA - unpaidB) > 0.1) return unpaidB - unpaidA; 
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
              const personDebts = [...groupedDebts[debtorName]].sort((a, b) => {
                const paidA = paidStatus[a.uniqueKey] ? 1 : 0;
                const paidB = paidStatus[b.uniqueKey] ? 1 : 0;
                if (paidA !== paidB) return paidA - paidB;
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
  // 視圖 1：首頁狀態 (自助查帳 + 歷史活動)
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 mt-2">
      
      {/* 🟢 第一層：球友自助查帳區 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-md relative overflow-hidden">
        {/* 背景裝飾 */}
        <div className="absolute -right-6 -top-6 text-white/10 rotate-12">
          <Wallet size={120} />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-xl font-black mb-1">球友自助查帳</h2>
          <p className="text-indigo-200 text-[10px] font-bold mb-4 uppercase tracking-widest">Search Your Dues</p>
          
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" />
            <input 
              type="text" 
              placeholder="輸入你的名字..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/20 border border-white/30 text-white placeholder:text-indigo-200 px-11 py-3.5 rounded-2xl outline-none focus:bg-white/30 focus:border-white transition-all font-bold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 hover:text-white transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🔍 搜尋結果顯示區 */}
      {searchQuery.trim() !== '' && (
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-2">
          {matchingDebtors.length > 0 ? (
             matchingDebtors.map(debtor => (
               <div key={debtor.name} className="bg-white rounded-[2rem] p-5 border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-indigo-50 px-4 py-2 rounded-bl-2xl font-black text-indigo-600 text-lg border-l border-b border-indigo-100">
                   ${debtor.total.toFixed(1)}
                 </div>
                 <h3 className="font-black text-slate-700 text-lg mb-4">{debtor.name} 的待付帳單</h3>
                 
                 <div className="space-y-2">
                   {debtor.details.map(d => (
                     <div key={d.uniqueKey} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-700">轉帳給 <span className="text-indigo-600">{d.toName}</span></p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{d.eventDate} | {d.eventName}</p>
                        </div>
                        <span className="font-black text-slate-700">${d.amount.toFixed(1)}</span>
                     </div>
                   ))}
                 </div>
                 <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <AlertCircle size={12}/> 請盡快轉帳給代墊人，若已轉帳請通知 Host 打勾核銷！
                 </div>
               </div>
             ))
          ) : (
            <div className="bg-emerald-50 rounded-[2rem] p-6 border-2 border-emerald-100 text-center shadow-sm">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-2" />
              <h3 className="font-black text-emerald-700 text-lg">太棒了！沒有任何欠款！</h3>
              <p className="text-xs font-bold text-emerald-600 mt-1">目前找不到「{searchQuery}」的待付紀錄</p>
            </div>
          )}
        </div>
      )}


      {/* 🔴 第二層：主辦人管理區 (活動列表) */}
      <div className="pt-2 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Receipt size={18} className="text-slate-400" />
          <h2 className="text-sm font-black text-slate-600">主辦人後台：按活動結算</h2>
        </div>

        {events.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
            <Receipt size={40} className="mx-auto text-slate-300 mb-3 opacity-50" />
            <h2 className="text-base font-black text-slate-400">尚無活動紀錄</h2>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => {
              const debts = eventDebts[event.id] || [];
              const totalTransactions = debts.length;
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
        )}
      </div>
    </div>
  );
};