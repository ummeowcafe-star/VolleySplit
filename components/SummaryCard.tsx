import React, { useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, User, Copy, Check } from 'lucide-react';

interface SummaryCardProps {
  event: any;
  phoneBook: { [name: string]: string }; // 接收來自 App.tsx 的電話數據
}

export function SummaryCard({ event, phoneBook }: SummaryCardProps) {
  // 安全防護：確保 phoneBook 不會是 undefined
  const safePhoneBook = phoneBook || {}; 

  const balances: { [playerId: string]: number } = {};
  event.players.forEach((p: any) => { balances[p.id] = 0; });

  // 1. 計算淨額 (代付 - 消費)
  event.sessions.forEach((session: any) => {
    if (session.hostId) {
      balances[session.hostId] = (balances[session.hostId] || 0) + session.cost;
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

  // 2. 準備債務與債權清單並排序
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

  const getPlayerName = (id: string) => event.players.find((p: any) => p.id === id)?.name || "未知";

  // 複製功能的狀態管理
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, phone: string) => {
    if (!phone || phone === 'unknown') return;
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

      <div className="p-5 space-y-3">
        {transactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 opacity-20" />
            <p className="text-slate-400 font-bold">帳目已清，不需要轉帳</p>
          </div>
        ) : (
          transactions.map((tx, idx) => {
            const receiverName = getPlayerName(tx.to);
            const receiverPhone = safePhoneBook?.[receiverName]; 
            const uniqueKey = `tx-${idx}`;

            return (
              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex items-center justify-between group hover:border-blue-200 transition-all">
                {/* 左側：人物資訊 */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1">付款人</span>
                    <span className="font-black text-blue-900 text-lg">{getPlayerName(tx.from)}</span>
                  </div>
                  <ArrowRight size={20} className="text-blue-200" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1">收款人</span>
                    <span className="font-black text-blue-700 text-lg">{receiverName}</span>
                  </div>
                </div>

                {/* ★ 中間區域：利用你圈出的空白空間顯示電話 */}
                <div className="flex-1 flex items-center justify-center px-4">
                  {receiverPhone && receiverPhone !== 'unknown' && (
                    <div className="flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-2xl border border-blue-50 shadow-sm animate-in fade-in zoom-in duration-300">
                      <span className="text-[10px] font-bold text-slate-400">Tel:</span>
                      <span className="text-sm font-black text-blue-600 font-mono tracking-tighter">{receiverPhone}</span>
                      <button 
                        onClick={() => handleCopy(uniqueKey, receiverPhone)}
                        className={`p-1.5 rounded-lg transition-all ${
                          copiedKey === uniqueKey ? 'bg-emerald-500 text-white' : 'text-blue-400 hover:bg-blue-100'
                        }`}
                      >
                        {copiedKey === uniqueKey ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* 右側：金額 */}
                <div className="text-right flex flex-col items-end min-w-[80px]">
                  <span className="text-[9px] font-black text-blue-400 uppercase mb-1">應轉金額</span>
                  <span className="text-2xl font-black text-blue-900 leading-none">${tx.amount.toFixed(1)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 text-center border-t border-slate-100">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
          點擊複製號碼後即可貼上銀行 App 轉帳 · 已自動優化轉帳路徑
        </p>
      </div>
    </section>
  );
}