import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { Receipt, CheckCircle2, Check, ArrowLeft, ChevronRight, AlertCircle, Calendar as CalendarIcon, Search, X, Wallet, Copy, Clock, Sparkles } from 'lucide-react';

interface Props {
  events: EventData[];
  paidStatus: { [key: string]: boolean };
  reportedStatus: { [key: string]: boolean };
  onTogglePaid: (key: string) => void;
  onReportPaid: (key: string) => void;
  phoneBook: { [name: string]: string };
  cloudContacts: { id: string; name: string; phone: string }[];
}

export const Ledger: React.FC<Props> = ({ events, paidStatus, reportedStatus, onTogglePaid, onReportPaid, phoneBook, cloudContacts }) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getPhoneNumber = (name: string) => {
    const cloudContact = cloudContacts.find(c => c.name === name);
    if (cloudContact && cloudContact.phone) return cloudContact.phone;
    return phoneBook[name] || '';
  };

  // ★ 核心升級：接收一組 uniqueKeys 陣列，進行「批次連動報數」
  const handleCopy = (phone: string, uniqueKeys: string[]) => {
    navigator.clipboard.writeText(phone);
    alert(`已複製代墊人號碼：${phone}\n請前往支付 App 進行轉帳！`);
    
    setTimeout(() => {
      // 10秒後，將所有同屬該代墊人的帳單一次性全部標記為「已轉帳」
      uniqueKeys.forEach(key => onReportPaid(key));
    }, 10000);
  };

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
          eventId: event.id, eventName: event.eventName, eventDate: event.date,
          fromId: d.id, toId: c.id, fromName: fromPlayer ? fromPlayer.name : d.id, toName: toPlayer ? toPlayer.name : c.id,
          amount: settleAmount, uniqueKey: `${event.id}_${d.id}_${c.id}`
        });
        d.amount -= settleAmount; c.amount -= settleAmount;
        if (d.amount < 0.1) dIdx++; if (c.amount < 0.1) cIdx++;
      }
      debtsByEvent[event.id] = transactions;
    });
    return debtsByEvent;
  }, [events]);

  const allUnpaidDebts = useMemo(() => {
    const flat = Object.values(eventDebts).flat();
    return flat.filter(d => !paidStatus[d.uniqueKey]);
  }, [eventDebts, paidStatus]);

  const matchingDebtors = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const unpaid = allUnpaidDebts;
    const grouped: Record<string, any[]> = {};
    unpaid.forEach(d => {
      if (!grouped[d.fromName]) grouped[d.fromName] = [];
      grouped[d.fromName].push(d);
    });
    return Object.keys(grouped)
      .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(name => ({ name, total: grouped[name].reduce((sum, d) => sum + d.amount, 0), details: grouped[name] }));
  }, [searchQuery, allUnpaidDebts]);


  // ==========================================
  // 單一活動詳情：Carol 進來核數的地方
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
      const unpaidDebtsA = groupedDebts[a].filter(d => !paidStatus[d.uniqueKey]);
      const unpaidDebtsB = groupedDebts[b].filter(d => !paidStatus[d.uniqueKey]);

      const hasUnpaidA = unpaidDebtsA.length > 0;
      const hasUnpaidB = unpaidDebtsB.length > 0;

      if (hasUnpaidA !== hasUnpaidB) return hasUnpaidA ? -1 : 1;

      const hasReportedA = unpaidDebtsA.some(d => reportedStatus[d.uniqueKey]);
      const hasReportedB = unpaidDebtsB.some(d => reportedStatus[d.uniqueKey]);

      if (hasReportedA !== hasReportedB) return hasReportedA ? -1 : 1;

      const amtA = unpaidDebtsA.reduce((sum, d) => sum + d.amount, 0);
      const amtB = unpaidDebtsB.reduce((sum, d) => sum + d.amount, 0);
      return amtB - amtA;
    });

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 mb-8 mt-2">
        <div className="sticky top-20 z-40 -mx-4 px-4 py-3 bg-[#f8fafc]/90 backdrop-blur-md border-b border-slate-100 flex items-center gap-3 mb-2">
          <button onClick={() => setSelectedEventId(null)} className="flex items-center gap-1 text-slate-500 hover:text-blue-700 font-black transition-colors active:scale-95"><ArrowLeft size={20} /></button>
          <div><h2 className="text-lg font-black text-blue-900 leading-tight">{event.eventName}</h2><p className="text-xs font-bold text-slate-400">{event.date} 的結算明細</p></div>
        </div>
        
        {debtorNames.length === 0 ? (
          <div className="py-20 text-center"><CheckCircle2 size={64} className="mx-auto text-emerald-300 mb-4 opacity-50" /><h2 className="text-xl font-black text-slate-400">本場活動帳目已清</h2></div>
        ) : (
          <div className="space-y-4">
            {debtorNames.map(debtorName => {
              const isAllPaid = groupedDebts[debtorName].filter(d => !paidStatus[d.uniqueKey]).length === 0;
              const hasReported = groupedDebts[debtorName].some(d => !paidStatus[d.uniqueKey] && reportedStatus[d.uniqueKey]);

              let cardStyle = "bg-white rounded-[2rem] p-5 border shadow-sm transition-all duration-300 relative overflow-hidden ";
              if (isAllPaid) {
                cardStyle += "border-emerald-100 opacity-60 bg-slate-50";
              } else if (hasReported) {
                cardStyle += "border-amber-400 bg-amber-50/40 shadow-md shadow-amber-200/50 ring-2 ring-amber-400/20";
              } else {
                cardStyle += "border-slate-200";
              }

              return (
                <div key={debtorName} className={cardStyle}>
                  {hasReported && !isAllPaid && (
                     <div className="absolute top-0 right-0 bg-amber-400 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                        <Sparkles size={10} /> 等待核實
                     </div>
                  )}

                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100/80">
                    <h3 className={`font-black text-xl ${isAllPaid ? 'text-slate-400' : hasReported ? 'text-amber-900' : 'text-slate-700'}`}>
                      {debtorName}
                    </h3>
                    {isAllPaid ? (
                      <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1"><Check size={12} /> 已結清</span>
                    ) : (
                      <div className="text-right">
                        <span className="text-[10px] font-black text-red-400 uppercase block mb-0.5">待付總額</span>
                        <span className={`text-xl font-black tracking-tighter ${hasReported ? 'text-amber-600' : 'text-red-500'}`}>
                          ${groupedDebts[debtorName].filter(d => !paidStatus[d.uniqueKey]).reduce((s, d) => s + d.amount, 0).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {groupedDebts[debtorName].map(debt => {
                      const isPaid = paidStatus[debt.uniqueKey];
                      const isReported = reportedStatus[debt.uniqueKey];

                      let containerStyle = 'bg-blue-50/50 border-blue-100 hover:bg-blue-50';
                      let textStyle = 'text-blue-900';
                      let numberStyle = 'text-blue-600';
                      
                      if (isPaid) {
                        containerStyle = 'bg-slate-50 border-slate-100 opacity-70';
                        textStyle = 'text-slate-400 line-through';
                        numberStyle = 'text-slate-400';
                      } else if (isReported) {
                        containerStyle = 'bg-amber-100 border-amber-300 hover:bg-amber-200/80 shadow-sm';
                        textStyle = 'text-amber-900';
                        numberStyle = 'text-amber-700';
                      }

                      return (
                        <div 
                          key={debt.uniqueKey} 
                          onClick={() => onTogglePaid(debt.uniqueKey)} 
                          className={`flex justify-between items-center p-3.5 rounded-2xl cursor-pointer transition-all border active:scale-[0.98] ${containerStyle}`}
                        >
                          <div>
                            <span className={`font-black text-sm flex items-center gap-1.5 ${textStyle}`}>
                              支付給 {debt.toName} <span className={numberStyle}>${debt.amount.toFixed(1)}</span>
                            </span>
                            {!isPaid && isReported && (
                               <span className="text-[10px] font-black text-amber-600 uppercase mt-0.5 flex items-center gap-1"><Sparkles size={10}/> 球友已轉帳</span>
                            )}
                          </div>
                          
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${isPaid ? 'bg-emerald-500 text-white shadow-inner' : isReported ? 'border-2 border-amber-400 bg-white shadow-sm' : 'border-2 border-blue-200 bg-white'}`}>
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
  // 主頁面：上方搜尋 + 下方舊有活動列表
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 mt-2">
      
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-md relative overflow-hidden transition-all duration-500">
        <div className="absolute -right-6 -top-6 text-white/10 rotate-12"><Wallet size={120} /></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div><h2 className="text-xl font-black mb-1">球友自助查帳</h2><p className="text-indigo-200 text-[10px] font-bold mb-4 uppercase tracking-widest">Search Your Dues</p></div>
          </div>
          <div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" /><input type="text" placeholder="輸入你的名字..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white/20 border border-white/30 text-white placeholder:text-indigo-200 px-11 py-3.5 rounded-2xl outline-none focus:bg-white/30 transition-all font-bold" />{searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 hover:text-white"><X size={18} /></button>}</div>
        </div>
      </div>

      {searchQuery.trim() !== '' && (
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-2">
          {matchingDebtors.length > 0 ? (
             matchingDebtors.map(debtor => (
               <div key={debtor.name} className="bg-white rounded-[2rem] p-5 border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-indigo-50 px-4 py-2 rounded-bl-2xl font-black text-indigo-600 text-lg border-l border-b border-indigo-100">${debtor.total.toFixed(1)}</div>
                 <h3 className="font-black text-slate-700 text-lg mb-4">{debtor.name} 的待付帳單</h3>
                 <div className="space-y-3">
                   {debtor.details.map(d => {
                     const phone = getPhoneNumber(d.toName);
                     const isReported = reportedStatus[d.uniqueKey];
                     return (
                       <div key={d.uniqueKey} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2"><p className="text-sm font-black text-slate-700">轉帳給 <span className="text-indigo-600">{d.toName}</span></p><span className="font-black text-slate-700">${d.amount.toFixed(1)}</span></div>
                          
                          {phone && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-slate-600 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{phone}</span>
                              
                              {/* ★ 按下複製時，抓取該球員所有欠這位代墊人(d.toName)的帳單，進行批次標記 */}
                              <button 
                                onClick={() => {
                                  const keysForThisHost = debtor.details
                                    .filter(x => x.toName === d.toName)
                                    .map(x => x.uniqueKey);
                                  handleCopy(phone, keysForThisHost);
                                }} 
                                className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-500 hover:text-white active:scale-90 transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Copy size={14} /> <span className="text-xs font-black">複製</span>
                              </button>
                            </div>
                          )}
                          
                          {isReported && (
                            <div className="w-full bg-amber-50 border border-amber-200 text-amber-600 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 animate-pulse shadow-inner mt-3">
                              <Clock size={14} /> 狀態已更新，等待 Host 核實中...
                            </div>
                          )}
                       </div>
                     )
                   })}
                 </div>
               </div>
             ))
          ) : <div className="bg-emerald-50 rounded-[2rem] p-6 border-2 border-emerald-100 text-center"><CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-2" /><h3 className="font-black text-emerald-700">太棒了！沒有任何欠款！</h3></div>}
        </div>
      )}

      {searchQuery.trim() === '' && (
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4 px-1"><Receipt size={18} className="text-slate-400" /><h2 className="text-sm font-black text-slate-600">按活動結算</h2></div>
          {events.length === 0 ? <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50"><Receipt size={40} className="mx-auto text-slate-300 mb-3 opacity-50" /><h2 className="text-base font-black text-slate-400">尚無活動紀錄</h2></div> : (
            <div className="space-y-3">
              {events.map(event => {
                const unpaid = (eventDebts[event.id] || []).filter(d => !paidStatus[d.uniqueKey]).length;
                return (
                  <div key={event.id} onClick={() => setSelectedEventId(event.id)} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4 cursor-pointer active:scale-95 transition-all hover:border-blue-300 group">
                    <div className="bg-slate-50 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0">{event.date.match(/(\d+)月\s*(\d+)日/) ? (<><span className="text-[10px] font-black text-blue-500 uppercase">{event.date.match(/(\d+)月/)?.[1]}月</span><span className="text-xl font-black text-blue-900 leading-none mt-0.5">{event.date.match(/日/)?.[1] || event.date.split('日')[0].split('月')[1]}</span></>) : <CalendarIcon size={24} className="text-blue-400" />}</div>
                    <div className="flex-1 min-w-0"><h3 className="font-black text-slate-700 text-lg truncate group-hover:text-blue-800 transition-colors">{event.eventName}</h3><div className="flex items-center gap-2 mt-1">{unpaid === 0 ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Check size={10} /> 全部結清</span> : <span className="text-[10px] font-black bg-red-100 text-red-500 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit animate-pulse"><AlertCircle size={10} /> 剩餘 {unpaid} 筆未收</span>}</div></div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};