import React, { useState } from 'react';
import { CheckCircle2, XCircle, TrendingUp, Users, Search } from 'lucide-react';

interface LedgerProps {
  events: any[];
  paidStatus: { [key: string]: boolean };
  onTogglePaid: (name: string) => void;
}

export function Ledger({ events, paidStatus, onTogglePaid }: LedgerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // --- 核心邏輯：彙整所有場次的收支 ---
  const playerBalances: { [name: string]: number } = {};

  events.forEach(event => {
    const eventBalances: { [name: string]: number } = {};
    
    // 初始化該場球員
    event.players.forEach((p: any) => { eventBalances[p.name] = 0; });

    // 1. 計算該場 Host 拿回的錢 (代付)
    event.sessions.forEach((session: any) => {
      const hostName = event.players.find((p: any) => p.id === session.hostId)?.name;
      if (hostName) {
        eventBalances[hostName] += session.cost;
      }
    });

    // 2. 扣除該場球員的消費 (支出)
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
          eventBalances[p.name] -= unitCost * weight;
        });
      }
    });

    // 3. 將該場結果累加到全局總表
    Object.entries(eventBalances).forEach(([name, balance]) => {
      playerBalances[name] = (playerBalances[name] || 0) + balance;
    });
  });

  // 轉換為陣列並過濾搜尋
  const allPlayers = Object.entries(playerBalances)
    .map(([name, amount]) => ({
      name,
      amount,
      isPaid: paidStatus[name] || false
    }))
    .filter(p => Math.abs(p.amount) > 0.1) // 只顯示有帳務紀錄的人
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? 1 : -1));

  // 防止 NaN 的計算
  const totalUnpaid = allPlayers.filter(p => !p.isPaid && p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0);
  const paidCount = allPlayers.filter(p => p.isPaid || p.amount >= 0).length;
  const progressPercent = allPlayers.length > 0 ? (paidCount / allPlayers.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* 頂部：收款進度總覽 */}
      <section className="bg-blue-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-blue-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-black text-2xl tracking-tighter">帳目總覽</h3>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Financial Overview</p>
          </div>
          <TrendingUp size={24} className="opacity-40" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-3xl p-4 border border-white/10 backdrop-blur-md">
            <span className="text-[9px] font-black text-blue-100 uppercase block mb-1">待收總額</span>
            <span className="text-2xl font-black">${totalUnpaid.toFixed(1)}</span>
          </div>
          <div className="bg-white/10 rounded-3xl p-4 border border-white/10 backdrop-blur-md">
            <span className="text-[9px] font-black text-blue-100 uppercase block mb-1">收款進度</span>
            <span className="text-2xl font-black">{progressPercent.toFixed(0)}%</span>
          </div>
        </div>
      </section>

      {/* 搜尋列 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋球員姓名..." 
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* 球員清單 */}
      <div className="space-y-2">
        <div className="px-3 flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>球員名稱</span>
          <span>結餘 / 狀態</span>
        </div>
        
        {allPlayers.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
            <Users size={40} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-bold">目前沒有帳務數據</p>
          </div>
        ) : (
          allPlayers.map((player) => (
            <button
              key={player.name}
              onClick={() => onTogglePaid(player.name)}
              className={`w-full flex items-center justify-between p-4 rounded-[1.8rem] border transition-all active:scale-[0.98] ${
                player.isPaid 
                  ? 'bg-emerald-50/20 border-emerald-100 opacity-60' 
                  : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${player.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Users size={20} />
                </div>
                <div className="text-left">
                  <span className={`font-black block text-sm ${player.isPaid ? 'text-slate-500' : 'text-blue-900'}`}>
                    {player.name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    {player.amount >= 0 ? 'Creditor' : 'Debtor'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className={`text-lg font-black block leading-none ${player.amount >= 0 ? 'text-emerald-500' : 'text-blue-900'}`}>
                    {player.amount >= 0 ? '+' : '-'}${Math.abs(player.amount).toFixed(1)}
                  </span>
                </div>
                
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase ${
                  player.isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600'
                }`}>
                  {player.isPaid ? 'Paid' : 'Unpaid'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}