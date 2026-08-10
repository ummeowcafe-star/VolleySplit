import React, { useState, useMemo, useEffect } from 'react';
import { EventData } from '../types';
import { 
  Receipt, 
  CheckCircle2, 
  Check, 
  ArrowLeft, 
  ChevronRight, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  Search, 
  X, 
  Wallet, 
  Copy, 
  Clock, 
  Sparkles,
  UserCheck,
  CreditCard
} from 'lucide-react';

interface Props {
  events: EventData[];
  paidStatus: { [key: string]: boolean };
  reportedStatus: { [key: string]: boolean };
  onTogglePaid: (key: string) => void;
  onReportPaid: (key: string) => void;
  phoneBook: { [name: string]: string };
  cloudContacts: { id: string; name: string; phone: string }[];
}

export const Ledger: React.FC<Props> = ({ 
  events, 
  paidStatus, 
  reportedStatus, 
  onTogglePaid, 
  onReportPaid, 
  phoneBook, 
  cloudContacts 
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 每次進入或退出單一活動帳單時，自動捲動回最頂端
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedEventId]);

  const getPhoneNumber = (name: string) => {
    const cloudContact = cloudContacts.find(c => c.name === name);
    if (cloudContact && cloudContact.phone) return cloudContact.phone;
    return phoneBook[name] || '';
  };

  // 接收一組 uniqueKeys 陣列，進行「批次連動報數」
  const handleCopy = (phone: string, uniqueKeys: string[]) => {
    navigator.clipboard.writeText(phone);
    alert(`已複製代墊人號碼：${phone}\n請前往支付 App 進行轉帳！`);
    
    setTimeout(() => {
      // 10秒後，將所有同屬該代墊人的帳單一次性全部標記為「已轉帳」
      uniqueKeys.forEach(key => onReportPaid(key));
    }, 10000);
  };

  // ==========================================
  // 統一收款 + 舊資料兼容模式
  //
  // 規則：
  // 1. 新增／尚未有任何付款狀態的帳單：全部改為支付給 Carol。
  // 2. 舊資料中已「回報已轉帳」或已「核實付款」的交易：保留原收款人及原 uniqueKey，
  //    避免更新程式後歷史紀錄突然變成未付款。
  // 3. 舊資料中仍未處理的交易：重新合併為「支付給 Carol」。
  //
  // 這樣不需要改動 localStorage / database 內既有 paidStatus、reportedStatus 資料。
  // ==========================================
  const eventDebts = useMemo(() => {
    const debtsByEvent: { [eventId: string]: any[] } = {};

    events.forEach(event => {
      if (!event.sessions || !event.players) return;

      // ---------- Step 1：先完整重建舊版結算結果 ----------
      // 必須保持與舊版算法及 uniqueKey 完全一致，才能辨認既有付款紀錄。
      const balances: { [playerId: string]: number } = {};
      event.players.forEach(p => { balances[p.id] = 0; });

      event.sessions.forEach(session => {
        if (session.hostId) {
          let targetId = session.hostId;
          const playerByName = event.players.find(
            p => p.name === session.hostId || p.id === session.hostId
          );
          if (playerByName) targetId = playerByName.id;
          if (balances[targetId] === undefined) balances[targetId] = 0;
          balances[targetId] += session.cost;
        }
      });

      event.sessions.forEach(session => {
        const participants = event.players.filter(
          p => (event.participation?.[`${session.id}_${p.id}`] || 0) > 0
        );
        const totalWeight = participants.reduce(
          (sum, p) => sum + (event.participation?.[`${session.id}_${p.id}`] || 0),
          0
        );

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
      const legacyTransactions: any[] = [];

      while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
        const d = tempDebtors[dIdx];
        const c = tempCreditors[cIdx];
        const settleAmount = Math.min(d.amount, c.amount);
        const fromPlayer = event.players.find(p => p.id === d.id);
        const toPlayer = event.players.find(p => p.id === c.id);

        legacyTransactions.push({
          eventId: event.id,
          eventName: event.eventName,
          eventDate: event.date,
          fromId: d.id,
          toId: c.id,
          fromName: fromPlayer ? fromPlayer.name : d.id,
          toName: toPlayer ? toPlayer.name : c.id,
          amount: settleAmount,
          uniqueKey: `${event.id}_${d.id}_${c.id}`,
          isLegacyLocked: false
        });

        d.amount -= settleAmount;
        c.amount -= settleAmount;
        if (d.amount < 0.1) dIdx++;
        if (c.amount < 0.1) cIdx++;
      }

      // ---------- Step 2：找中央收款人 Carol ----------
      const collector = event.players.find(
        p => p.name.trim().toLowerCase() === 'carol'
      );

      // 找不到 Carol 時，為避免帳單消失，直接沿用舊版結算。
      if (!collector) {
        debtsByEvent[event.id] = legacyTransactions;
        return;
      }

      // ---------- Step 3：保留已有狀態的舊交易 ----------
      // paid / reported 都視為「已經開始按舊流程處理」，不可突然更改收款人。
      const lockedLegacyTransactions = legacyTransactions
        .filter(t => paidStatus[t.uniqueKey] || reportedStatus[t.uniqueKey])
        .map(t => ({ ...t, isLegacyLocked: true }));

      // ---------- Step 4：其餘尚未處理的舊交易，改為統一支付 Carol ----------
      // 按付款人合併，避免同一個人需要看到多筆「支付 Carol」。
      const unlockedLegacyTransactions = legacyTransactions.filter(
        t => !paidStatus[t.uniqueKey] && !reportedStatus[t.uniqueKey]
      );

      const amountByDebtor: Record<string, number> = {};
      unlockedLegacyTransactions.forEach(t => {
        // Carol 自己不需要支付給自己。
        if (t.fromId === collector.id) return;
        amountByDebtor[t.fromId] = (amountByDebtor[t.fromId] || 0) + t.amount;
      });

      const centralizedTransactions = Object.entries(amountByDebtor)
        .filter(([, amount]) => amount > 0.1)
        .map(([fromId, amount]) => {
          const fromPlayer = event.players.find(p => p.id === fromId);
          return {
            eventId: event.id,
            eventName: event.eventName,
            eventDate: event.date,
            fromId,
            toId: collector.id,
            fromName: fromPlayer ? fromPlayer.name : fromId,
            toName: collector.name,
            amount,
            // 新 key 與舊版 key 分開，避免與歷史 creditor 狀態互相污染。
            uniqueKey: `${event.id}_${fromId}_collector_${collector.id}`,
            isLegacyLocked: false
          };
        });

      // 已處理的歷史交易 + 尚未處理的新中央收款交易同時存在。
      // 已付款舊交易在 UI 中仍會保持「已結清」；未付款部分則統一轉給 Carol。
      debtsByEvent[event.id] = [
        ...lockedLegacyTransactions,
        ...centralizedTransactions
      ];
    });

    return debtsByEvent;
  }, [events, paidStatus, reportedStatus]);

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
  // 單一活動詳情：Host / Carol 進來核數的地方
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
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 mb-10 mt-2">
        {/* 頂部固定列 */}
        <div className="sticky top-16 z-40 -mx-4 px-4 py-3.5 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedEventId(null)} 
              className="p-2 -ml-1 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all active:scale-95 flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-tight flex items-center gap-1.5">
                {event.eventName}
              </h2>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">{event.date} 的結算核數明細</p>
            </div>
          </div>
        </div>

        {debtorNames.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <CheckCircle2 size={56} className="mx-auto text-emerald-400 mb-3 opacity-80" />
            <h2 className="text-lg font-black text-slate-600">本場活動帳目已全部清算</h2>
            <p className="text-xs font-bold text-slate-400 mt-1">目前沒有任何未結清的款項</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {debtorNames.map(debtorName => {
              const isAllPaid = groupedDebts[debtorName].filter(d => !paidStatus[d.uniqueKey]).length === 0;
              const hasReported = groupedDebts[debtorName].some(d => !paidStatus[d.uniqueKey] && reportedStatus[d.uniqueKey]);

              let cardStyle = "bg-white rounded-[2rem] p-5 border transition-all duration-300 relative overflow-hidden ";
              if (isAllPaid) {
                cardStyle += "border-slate-100 bg-slate-50/60 opacity-60";
              } else if (hasReported) {
                cardStyle += "border-amber-300 bg-amber-50/30 shadow-md shadow-amber-100/50 ring-2 ring-amber-400/20";
              } else {
                cardStyle += "border-slate-200/80 shadow-sm hover:shadow-md";
              }

              return (
                <div key={debtorName} className={cardStyle}>
                  {/* 等待核實角標 */}
                  {hasReported && !isAllPaid && (
                     <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-400 text-white text-[10px] font-black px-3.5 py-1 rounded-bl-xl shadow-sm flex items-center gap-1 tracking-wider">
                        <Sparkles size={11} /> 等待核實
                     </div>
                  )}

                  <div className="flex justify-between items-center mb-3.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isAllPaid ? 'bg-slate-200 text-slate-500' : hasReported ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {debtorName.slice(0, 2)}
                      </div>
                      <h3 className={`font-black text-lg ${isAllPaid ? 'text-slate-400' : hasReported ? 'text-amber-950' : 'text-slate-800'}`}>
                        {debtorName}
                      </h3>
                    </div>

                    {isAllPaid ? (
                      <span className="bg-emerald-100/80 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-black uppercase flex items-center gap-1 border border-emerald-200/50">
                        <Check size={12} strokeWidth={3} /> 已結清
                      </span>
                    ) : (
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider">待付金額</span>
                        <span className={`text-lg font-black tracking-tight ${hasReported ? 'text-amber-600' : 'text-red-500'}`}>
                          ${groupedDebts[debtorName].filter(d => !paidStatus[d.uniqueKey]).reduce((s, d) => s + d.amount, 0).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* 交易細項 */}
                  <div className="space-y-2">
                    {groupedDebts[debtorName].map(debt => {
                      const isPaid = paidStatus[debt.uniqueKey];
                      const isReported = reportedStatus[debt.uniqueKey];

                      let containerStyle = 'bg-slate-50/80 border-slate-200/60 hover:bg-slate-100/80';
                      let textStyle = 'text-slate-700';
                      let numberStyle = 'text-blue-600';
                      
                      if (isPaid) {
                        containerStyle = 'bg-slate-100/40 border-slate-100 opacity-60';
                        textStyle = 'text-slate-400 line-through';
                        numberStyle = 'text-slate-400';
                      } else if (isReported) {
                        containerStyle = 'bg-amber-100/60 border-amber-300 hover:bg-amber-100/90 shadow-sm';
                        textStyle = 'text-amber-950 font-bold';
                        numberStyle = 'text-amber-700';
                      }

                      return (
                        <div 
                          key={debt.uniqueKey} 
                          onClick={() => onTogglePaid(debt.uniqueKey)} 
                          className={`flex justify-between items-center p-3 rounded-2xl cursor-pointer transition-all border active:scale-[0.98] ${containerStyle}`}
                        >
                          <div className="flex flex-col">
                            <span className={`font-black text-sm flex items-center gap-1.5 ${textStyle}`}>
                              支付給 <span className="font-black text-slate-900">{debt.toName}</span> 
                              <span className={`font-black ml-1 ${numberStyle}`}>${debt.amount.toFixed(1)}</span>
                            </span>
                            {!isPaid && isReported && (
                              <span className="text-[10px] font-black text-amber-700 uppercase mt-0.5 flex items-center gap-1">
                                <Sparkles size={10} /> 球友回報已轉帳（點擊核實）
                              </span>
                            )}
                          </div>
                          
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isPaid 
                              ? 'bg-emerald-500 text-white shadow-sm' 
                              : isReported 
                              ? 'border-2 border-amber-500 bg-white shadow-sm text-amber-500' 
                              : 'border-2 border-slate-300 bg-white hover:border-blue-400'
                          }`}>
                            {isPaid && <Check size={14} strokeWidth={3.5} />}
                            {!isPaid && isReported && <UserCheck size={12} strokeWidth={2.5} />}
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
  // 主頁面：上方搜尋 + 下方活動列表
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-10 mt-2">
      
      {/* 球友自助查帳 Search Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 rounded-[2.2rem] text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden transition-all duration-500 border border-indigo-400/20">
        <div className="absolute -right-6 -top-6 text-white/10 rotate-12 pointer-events-none">
          <Wallet size={140} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                <CreditCard size={22} className="text-indigo-200" />
                球友自助查帳
              </h2>
              <p className="text-indigo-200 text-[10px] font-bold tracking-widest uppercase mt-0.5">Search Your Unpaid Dues</p>
            </div>
          </div>

          <div className="relative mt-2">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200" />
            <input 
              type="text" 
              placeholder="輸入你的名字（搜尋個人未結帳單）..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full bg-white/15 backdrop-blur-md border border-white/25 text-white placeholder:text-indigo-200/70 px-11 py-3.5 rounded-2xl outline-none focus:bg-white/25 focus:border-white/40 transition-all font-bold text-sm shadow-inner" 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 搜尋結果 Search Results */}
      {searchQuery.trim() !== '' && (
        <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {matchingDebtors.length > 0 ? (
             matchingDebtors.map(debtor => (
               <div key={debtor.name} className="bg-white rounded-[2rem] p-5 border-2 border-indigo-100 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-50 px-4 py-2 rounded-bl-2xl font-black text-indigo-600 text-lg border-l border-b border-indigo-100 shadow-sm">
                    ${debtor.total.toFixed(1)}
                  </div>
                  <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    {debtor.name} 的待付帳單
                  </h3>

                  <div className="space-y-3">
                    {debtor.details.map(d => {
                      const phone = getPhoneNumber(d.toName);
                      const isReported = reportedStatus[d.uniqueKey];
                      return (
                        <div key={d.uniqueKey} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                           <div className="flex items-center justify-between mb-2">
                             <p className="text-sm font-black text-slate-700">
                               轉帳給 <span className="text-indigo-600 font-black">{d.toName}</span>
                             </p>
                             <span className="font-black text-slate-800 text-base">${d.amount.toFixed(1)}</span>
                           </div>
                           
                           {phone && (
                             <div className="flex items-center gap-2 mb-1.5">
                               <span className="text-xs font-bold text-slate-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-xs">
                                 {phone}
                               </span>
                               
                               {/* 按下複製時，抓取該球員所有欠這位代墊人(d.toName)的帳單，進行批次標記 */}
                               <button 
                                 onClick={() => {
                                   const keysForThisHost = debtor.details
                                     .filter(x => x.toName === d.toName)
                                     .map(x => x.uniqueKey);
                                   handleCopy(phone, keysForThisHost);
                                 }} 
                                 className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-600 hover:text-white active:scale-90 transition-all flex items-center gap-1.5 shadow-xs border border-indigo-100"
                               >
                                 <Copy size={13} /> 
                                 <span className="text-xs font-black">複製號碼並報數</span>
                               </button>
                             </div>
                           )}
                           
                           {isReported && (
                             <div className="w-full bg-amber-50 border border-amber-200/80 text-amber-700 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 animate-pulse shadow-inner mt-3">
                               <Clock size={14} /> 狀態已更新，等待 Host 核實中...
                             </div>
                           )}
                        </div>
                      )
                    })}
                  </div>
               </div>
             ))
          ) : (
            <div className="bg-emerald-50/80 rounded-[2rem] p-8 border-2 border-emerald-100 text-center shadow-sm">
              <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-2" />
              <h3 className="font-black text-emerald-800 text-base">太棒了！找不到相關未付帳單</h3>
              <p className="text-xs font-bold text-emerald-600/80 mt-1">請確認名字是否輸入正確，或該帳目已順利清算</p>
            </div>
          )}
        </div>
      )}

      {/* 活動列表 Section */}
      {searchQuery.trim() === '' && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-slate-400" />
              <h2 className="text-sm font-black text-slate-600 tracking-wide">按活動結算</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">點擊可查看活動明細</span>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <Receipt size={40} className="mx-auto text-slate-300 mb-3 opacity-50" />
              <h2 className="text-base font-black text-slate-400">尚無任何活動紀錄</h2>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => {
                const unpaid = (eventDebts[event.id] || []).filter(d => !paidStatus[d.uniqueKey]).length;
                return (
                  <div 
                    key={event.id} 
                    onClick={() => setSelectedEventId(event.id)} 
                    className="bg-white p-4 rounded-3xl shadow-xs border border-slate-200/80 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all hover:border-blue-300 hover:shadow-md group"
                  >
                    {/* 日期標籤 */}
                    <div className="bg-slate-50 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border border-slate-100 shrink-0 group-hover:bg-blue-50/50 transition-colors">
                      {event.date.match(/(\d+)月\s*(\d+)日/) ? (
                        <>
                          <span className="text-[10px] font-black text-blue-500 uppercase leading-none">
                            {event.date.match(/(\d+)月/)?.[1]}月
                          </span>
                          <span className="text-lg font-black text-slate-800 leading-none mt-1">
                            {event.date.match(/日/)?.[1] || event.date.split('日')[0].split('月')[1]}
                          </span>
                        </>
                      ) : (
                        <CalendarIcon size={22} className="text-blue-500" />
                      )}
                    </div>

                    {/* 活動內容 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-800 text-base truncate group-hover:text-blue-700 transition-colors">
                        {event.eventName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {unpaid === 0 ? (
                          <span className="text-[10px] font-black bg-emerald-100/80 text-emerald-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/50">
                            <Check size={10} strokeWidth={3} /> 全部結清
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-200/60 animate-pulse">
                            <AlertCircle size={10} /> 剩餘 {unpaid} 筆待收
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
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