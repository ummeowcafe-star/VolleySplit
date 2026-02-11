import React, { useMemo } from 'react';
import { GlobalState } from '../types';
import { DollarSign, CheckCircle2 } from 'lucide-react';

interface LedgerProps {
  state: GlobalState;
  onClearBalance: (playerName: string, amount: number) => void;
}

export const Ledger: React.FC<LedgerProps> = ({ state, onClearBalance }) => {
  const { events, payments } = state;

  const ledgerData = useMemo(() => {
    const balances: Record<string, { totalFee: number, totalPaid: number }> = {};

    // 1. Calculate Fees from all events
    events.forEach(event => {
      // Calculate session costs for this event
      const sessionCosts: Record<string, number> = {};
      event.sessions.forEach(session => {
        let totalWeight = 0;
        event.players.forEach(p => {
          totalWeight += event.participation[session.id]?.[p.id] ?? 0;
        });
        sessionCosts[session.id] = totalWeight > 0 ? session.cost / totalWeight : 0;
      });

      // Add to player totals
      event.players.forEach(player => {
        const normalizedName = player.name.trim(); // Normalize by name
        if (!balances[normalizedName]) balances[normalizedName] = { totalFee: 0, totalPaid: 0 };
        
        let eventCost = 0;
        event.sessions.forEach(session => {
          const weight = event.participation[session.id]?.[player.id] ?? 0;
          eventCost += weight * sessionCosts[session.id];
        });
        
        balances[normalizedName].totalFee += eventCost;
      });
    });

    // 2. Subtract Payments
    payments.forEach(payment => {
      const normalizedName = payment.playerName.trim();
      if (!balances[normalizedName]) balances[normalizedName] = { totalFee: 0, totalPaid: 0 };
      balances[normalizedName].totalPaid += payment.amount;
    });

    // 3. Convert to array and filter
    return Object.entries(balances)
      .map(([name, data]) => ({
        name,
        fee: data.totalFee,
        paid: data.totalPaid,
        balance: data.totalFee - data.totalPaid
      }))
      .filter(p => Math.abs(p.balance) > 0.05 || p.paid > 0 || p.fee > 0) // Hide empty records
      .sort((a, b) => b.balance - a.balance); // Highest debt first

  }, [events, payments]);

  const handleSettle = (name: string, amount: number) => {
    if (confirm(`Clear balance for ${name}? This will mark $${amount.toFixed(1)} as paid.`)) {
      onClearBalance(name, amount);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-indigo-100 font-medium text-sm mb-1 uppercase tracking-wide">Total Outstanding</h2>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight">
            ${ledgerData.reduce((sum, p) => sum + Math.max(0, p.balance), 0).toFixed(0)}
          </span>
          <span className="text-indigo-200 text-sm">approx</span>
        </div>
        <p className="text-xs text-indigo-200 mt-2 opacity-80">Sum of all current player debts.</p>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Player Balances</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {ledgerData.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No transaction history found.</div>
          ) : (
            ledgerData.map((player) => {
              // Rounding for display
              const balanceDisplay = player.balance.toFixed(1);
              const isDebt = player.balance > 0.1;
              const isSettled = Math.abs(player.balance) <= 0.1;

              return (
                <div key={player.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                      ${isDebt ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700">{player.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Fees: ${player.fee.toFixed(0)} • Paid: ${player.paid.toFixed(0)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-lg font-bold font-mono ${isDebt ? 'text-red-500' : 'text-emerald-500'}`}>
                      {isSettled ? 'Settled' : `$${balanceDisplay}`}
                    </span>
                    {isDebt && (
                      <button 
                        onClick={() => handleSettle(player.name, player.balance)}
                        className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 size={12} /> Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};