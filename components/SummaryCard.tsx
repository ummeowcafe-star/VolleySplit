import React from 'react';
import { EventData } from '../types';
import { Wallet, Users } from 'lucide-react';

interface Props {
  event: EventData;
}

export const SummaryCard: React.FC<Props> = ({ event }) => {
  
  // --- 核心計算邏輯 ---
  const calculateTotals = () => {
    const playerTotals: { [key: string]: number } = {};
    let grandTotal = 0;

    // 1. 初始化每位玩家歸零
    event.players.forEach(p => playerTotals[p.id] = 0);

    // 2. 逐個 Session 計算分攤
    event.sessions.forEach(session => {
      // A. 算出該時段的總權重 (分母)
      let sessionTotalWeight = 0;
      event.players.forEach(p => {
        const key = `${session.id}_${p.id}`;
        const weight = event.participation?.[key] || 0;
        sessionTotalWeight += weight;
      });

      // B. 如果有人參加，則計算單價並分配
      if (sessionTotalWeight > 0) {
        const costPerUnit = session.cost / sessionTotalWeight;

        event.players.forEach(p => {
          const key = `${session.id}_${p.id}`;
          const weight = event.participation?.[key] || 0;
          if (weight > 0) {
            playerTotals[p.id] += weight * costPerUnit;
          }
        });
      }
    });

    // C. 計算總金額 (用於顯示)
    grandTotal = Object.values(playerTotals).reduce((sum, val) => sum + val, 0);

    return { playerTotals, grandTotal };
  };

  const { playerTotals, grandTotal } = calculateTotals();

  // 安全檢查
  if (!event || !event.players) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-indigo-600 px-4 py-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Wallet size={20} />
          <h3 className="font-bold text-lg">Total Fees</h3>
        </div>
        <div className="text-2xl font-bold">
          ${grandTotal.toFixed(0)}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {event.players.length === 0 ? (
          <div className="p-8 text-center text-gray-400 flex flex-col items-center">
            <Users size={32} className="mb-2 opacity-50" />
            <p>No players added yet</p>
          </div>
        ) : (
          event.players.map(player => {
            const amount = playerTotals[player.id];
            return (
              <div key={player.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700">{player.name}</span>
                </div>
                
                <div className="text-right">
                  <span className={`text-lg font-bold ${amount > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                    ${amount.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer / Stats */}
      <div className="bg-gray-50 px-4 py-2 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">Calculated based on session weights</p>
      </div>
    </div>
  );
};