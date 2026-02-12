import React, { useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, User, Copy, Check } from 'lucide-react';

// ★ 更新介面定義：加入 cloudContacts
interface SummaryCardProps {
  event: any;
  phoneBook: { [name: string]: string }; 
  cloudContacts: { id: string; name: string; phone: string }[]; 
}

export function SummaryCard({ event, phoneBook, cloudContacts }: SummaryCardProps) {
  const safePhoneBook = phoneBook || {}; 
  const safeCloudContacts = cloudContacts || [];

  // ★ 核心修正 1：改良名稱搜尋邏輯
  const getPlayerName = (id: string) => {
    const player = event.players.find((p: any) => p.id === id);
    if (player) return player.name;
    return id || "未知"; 
  };

  // ★ 核心修正 2：整合搜尋器，並統一「未知」字串的判斷
  const findPhone = (name: string) => {
    let phone = null;
    
    // 1. 先從靜態通訊錄找
    if (safePhoneBook[name]) {
      phone = safePhoneBook[name];
    } 
    // 2. 再從雲端名單找
    else {
      const cloudMatch = safeCloudContacts.find(c => c.name === name);
      if (cloudMatch) phone = cloudMatch.phone;
    }

    // ★ 關鍵修正：過濾字串 "unknown"、空字串或 null
    // 這樣可以消除 image_17e6e5.png 中出現藍色 unknown 的錯誤情況
    if (!phone || phone.toLowerCase() === 'unknown' || phone.trim() === '') {
      return null;
    }
    
    return phone;
  };

  const balances: { [playerId: string]: number } = {};
  event.players.forEach((p: any) => { balances[p.id] = 0; });

  // 1. 計算淨額 (代付 - 消費)
  event.sessions.forEach((session: any) => {
    if (session.hostId) {
      if (balances[session.hostId] === undefined) balances[session.hostId] = 0;
      balances[session.hostId] += session.cost;
    }
  });

  event.sessions.forEach((session: any) => {
    const participants = event.players.filter((p: any) => 
      (event.participation?.[`${session.id}_${p.id}`] || 0) > 0
    );
    const totalWeight = participants.reduce((sum: number, p: any) => 
      sum + (event.participation?.[`${session.id}_${p.id}`] || 0), 0
    );

    if (totalWeight > 0) {
      const unitCost = session.cost / totalWeight;
      participants.forEach((p: any) => {
        const weight = event.participation?.[`${session.id}_${p.id}`] || 0;
        balances[p.id] -= unitCost * weight;
      });
    }
  });

  // 2. 準備債務與債權清單
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < -0.1) debtors.push({ id, amount: Math.abs(balance) });
    else if (balance > 0.1) creditors.push({ id, amount: balance });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // 3. 撮合轉帳
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
  const handleCopy = (key: string, phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

            return (
              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-4 flex flex-col gap-3 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase">From</span>
                      <span className="font-black text-slate-700 text-sm">{getPlayerName(tx.from)}</span>
                    </div>
                    <ArrowRight size={14} className="text-blue-200" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-blue-400 uppercase">To</span>
                      <span className="font-black text-blue-900 text-sm">{receiverName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-blue-900 tracking-tighter">${tx.amount.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2 border border-blue-50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">轉帳電話:</span>
                    {receiverPhone ? (
                      <span className="text-xs font-black text-blue-600 font-mono">{receiverPhone}</span>
                    ) : (
                      <span className="text-xs font-black text-red-400">Unknown</span>
                    )}
                  </div>

                  {/* ★ 只有真正的號碼才會顯示複製按鈕 */}
                  {receiverPhone && (
                    <button 
                      onClick={() => handleCopy(uniqueKey, receiverPhone)}
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

      {/* 收款彙整區塊 */}
      {creditors.length > 0 && (
        <div className="px-6 pb-6 pt-2 animate-in fade-in duration-500">
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 px-1">本場收款人彙整</h4>
            <div className="flex flex-wrap gap-2">
              {creditors.map(c => (
                <div key={c.id} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-blue-100/50 shadow-sm">
                  <User size={12} /> {getPlayerName(c.id)}: <span className="text-blue-900">${c.amount.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}