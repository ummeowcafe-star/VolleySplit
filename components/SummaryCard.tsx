import React, { useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, User, Copy, Check } from 'lucide-react';

interface SummaryCardProps {
  event: any;
  phoneBook: { [name: string]: string }; 
  cloudContacts: { id: string; name: string; phone: string }[]; 
  // ★ 加上問號 (?) 允許為空值
  paidStatus?: { [key: string]: boolean };
  reportedStatus?: { [key: string]: boolean };
  onTogglePaid: (key: string) => void;
  onReportPaid: (key: string) => void;
}

export function SummaryCard({ 
  event, 
  phoneBook, 
  cloudContacts, 
  paidStatus = {},     // ★ 防呆機制：如果是空值，預設為空物件
  reportedStatus = {}, // ★ 防呆機制：如果是空值，預設為空物件
  onTogglePaid, 
  onReportPaid 
}: SummaryCardProps) {
  
  const safePhoneBook = phoneBook || {}; 
  const safeCloudContacts = cloudContacts || [];

  const getPlayerName = (id: string) => {
    const player = event.players.find((p: any) => p.id === id);
    if (player) return player.name;
    return id || "未知"; 
  };

  const findPhone = (name: string) => {
    if (!name) return null;
    const searchName = name.trim().toLowerCase();
    
    const cloudMatch = safeCloudContacts.find(c => c.name.trim().toLowerCase() === searchName);
    if (cloudMatch && cloudMatch.phone && cloudMatch.phone.toLowerCase() !== 'unknown' && cloudMatch.phone.trim() !== '') {
      return cloudMatch.phone;
    }
    
    const localPhone = safePhoneBook[name]; 
    if (localPhone && localPhone.toLowerCase() !== 'unknown' && localPhone.trim() !== '') {
      return localPhone;
    }
    return null;
  };

  const balances: { [playerId: string]: number } = {};
  event.players.forEach((p: any) => { balances[p.id] = 0; });

  event.sessions.forEach((session: any) => {
    if (session.hostId) {
      let targetId = session.hostId;
      const playerByName = event.players.find((p: any) => p.name === session.hostId || p.id === session.hostId);
      if (playerByName) targetId = playerByName.id;
      if (balances[targetId] === undefined) balances[targetId] = 0;
      balances[targetId] += session.cost;
    }
  });

  event.sessions.forEach((session: any) => {
    const participants = event.players.filter((p: any) => (event.participation?.[`${session.id}_${p.id}`] || 0) > 0);
    const totalWeight = participants.reduce((sum: number, p: any) => sum + (event.participation?.[`${session.id}_${p.id}`] || 0), 0);
    if (totalWeight > 0) {
      const unitCost = session.cost / totalWeight;
      participants.forEach((p: any) => {
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

  const transactions: { from: string; to: string; amount: number }[] = [];
  const tempDebtors = JSON.parse(JSON.stringify(debtors));
  const tempCreditors = JSON.parse(JSON.stringify(creditors));
  let dIdx = 0, cIdx = 0;
  
  while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
    const d = tempDebtors[dIdx], c = tempCreditors[cIdx];
    const settleAmount = Math.min(d.amount, c.amount);
    transactions.push({ from: d.id, to: c.id, amount: settleAmount });
    d.amount -= settleAmount;
    c.amount -= settleAmount;
    if (d.amount < 0.1) dIdx++;
    if (c.amount < 0.1) cIdx++;
  }

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const handleCopy = (key: string, phone: string, paymentKey: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);

    // 10秒後自動觸發報數
    setTimeout(() => {
      onReportPaid(paymentKey);
    }, 10000);
  };

  return (
    <section className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-blue-700 p-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-2xl"><DollarSign size={24} /></div>
          <div>
            <h3 className="font-black text-lg leading-none">轉帳好Easy</h3>
            <p className="text-blue-200 text-[10px] font-bold mt-1 uppercase tracking-widest">Simplified Settlement</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {transactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 opacity-20" />
            <p className="text-slate-400 font-bold">帳目已清，不需要轉帳</p>
          </div>
        ) : (
          transactions.map((tx, idx) => {
            const receiverName = getPlayerName(tx.to);
            const receiverPhone = findPhone(receiverName); 
            const uniqueKey = `tx-${idx}`;
            
            const paymentKey = `${event.id}_${tx.from}_${tx.to}`;
            // ★ 安全讀取：因為上面已經給了預設值，這裡絕對不會報錯了
            const isSettled = paidStatus[paymentKey] || reportedStatus[paymentKey];

            return (
              <div key={idx} className={`border rounded-[1.5rem] p-4 flex flex-col gap-3 transition-all ${isSettled ? 'bg-emerald-50/60 border-emerald-200 opacity-80' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">From</span>
                      <span className={`font-black text-sm ${isSettled ? 'text-emerald-700' : 'text-slate-700'}`}>{getPlayerName(tx.from)}</span>
                    </div>
                    <ArrowRight size={14} className={isSettled ? 'text-emerald-300' : 'text-blue-200'} />
                    <div className="flex flex-col">
                      <span className={`text-[8px] font-black uppercase ${isSettled ? 'text-emerald-500' : 'text-blue-400'}`}>To</span>
                      <span className={`font-black text-sm ${isSettled ? 'text-emerald-900' : 'text-blue-900'}`}>{receiverName}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-xl font-black tracking-tighter ${isSettled ? 'text-emerald-600' : 'text-blue-900'}`}>${tx.amount.toFixed(1)}</span>
                    {isSettled && (
                      <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={10} /> 已報數
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={`flex items-center justify-between bg-white rounded-xl px-4 py-2 border shadow-sm ${isSettled ? 'border-emerald-100' : 'border-blue-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">轉帳電話:</span>
                    {receiverPhone ? (
                      <span className="text-xs font-black text-blue-600 font-mono">{receiverPhone}</span>
                    ) : (
                      <span className="text-xs font-black text-amber-500 animate-pulse">待補電話</span>
                    )}
                  </div>
                  {receiverPhone && (
                    <button 
                      onClick={() => handleCopy(uniqueKey, receiverPhone, paymentKey)} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                        copiedKey === uniqueKey ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {copiedKey === uniqueKey ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === uniqueKey ? '已複製' : '複製號碼'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {creditors.length > 0 && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 mt-2">
          <div className="flex items-center gap-2 mb-3">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本場收款人彙整</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {creditors.map(c => (
              <div key={c.id} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-blue-100/50 shadow-sm">
                <User size={12} className="text-blue-400" /> 
                {getPlayerName(c.id)}: <span className="text-blue-900">${c.amount.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}