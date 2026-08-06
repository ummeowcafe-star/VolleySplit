import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Copy, 
  Check,
  User,
  Clock,
  ArrowRight,
  MinusCircle,
  PlusCircle
} from 'lucide-react';

interface Player { id: string; name: string; }
interface Session { id: string; name: string; cost: number; hostId?: string; }
interface EventData { 
  id: string; 
  date: string; 
  eventName: string; 
  defaultCost: number; 
  players: Player[]; 
  sessions: Session[]; 
  participation?: { [key: string]: any }; 
  venueId?: string; 
}

interface Contact { id: string; name: string; phone: string; }

interface CarolModeProps {
  events: EventData[];
  paidStatus: { [key: string]: boolean };
  reportedStatus: { [key: string]: boolean };
  onTogglePaid: (key: string) => void;
  onReportPaid: (key: string) => void;
  phoneBook?: { [name: string]: string };
  cloudContacts: Contact[];
}

export const CarolMode: React.FC<CarolModeProps> = ({
  events,
  paidStatus = {},
  reportedStatus = {},
  onTogglePaid,
  onReportPaid,
  cloudContacts = []
}) => {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(events[0]?.id || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. 查找 ContactManager 中的 Contact 資料
  const resolveContact = (hostIdOrName?: string): { name: string; phone: string } => {
    if (!hostIdOrName) return { name: '未指定', phone: '' };
    const cleanKey = hostIdOrName.trim().toLowerCase();
    
    const matchedContact = cloudContacts.find(
      c => c.id === hostIdOrName || c.name.trim().toLowerCase() === cleanKey
    );

    if (matchedContact) {
      return { 
        name: matchedContact.name, 
        phone: matchedContact.phone === 'unknown' ? '' : matchedContact.phone 
      };
    }
    return { name: hostIdOrName, phone: '' };
  };

  // 2. 超強容錯 checkParticipation (相容多種 Key 格式)
  const isPlayerInSession = (event: EventData, player: Player, session: Session, sessionIndex: number): boolean => {
    if (!event.participation) return false;
    const p = event.participation;

    const playerKeys = [player.id, player.name?.trim()].filter(Boolean);
    const sessionKeys = [session.id, session.name?.trim(), String(sessionIndex)].filter(Boolean);

    for (const pKey of playerKeys) {
      for (const sKey of sessionKeys) {
        const combinations = [
          `${pKey}_${sKey}`,
          `${sKey}_${pKey}`,
          `${pKey}-${sKey}`,
          `${sKey}-${pKey}`
        ];

        for (const key of combinations) {
          const val = p[key];
          if (val !== undefined && val !== null && val !== false && val !== 0 && val !== '0') {
            return true;
          }
        }

        if (p[pKey] && typeof p[pKey] === 'object' && p[pKey][sKey]) return true;
        if (p[sKey] && typeof p[sKey] === 'object' && p[sKey][pKey]) return true;
      }
    }
    return false;
  };

  // 3. 計算時段人均費用
  const getSessionCostPerHead = (event: EventData, session: Session, sessionIndex: number): number => {
    const activeCount = event.players.filter(p => isPlayerInSession(event, p, session, sessionIndex)).length;
    if (activeCount === 0) return 0;
    const sessionCost = session.cost || event.defaultCost || 200;
    return sessionCost / activeCount;
  };

  // 4. 計算球員個人總費用
  const getPlayerTotalFee = (event: EventData, player: Player): number => {
    return event.sessions.reduce((sum, session, idx) => {
      if (isPlayerInSession(event, player, session, idx)) {
        return sum + getSessionCostPerHead(event, session, idx);
      }
      return sum;
    }, 0);
  };

  // 5. 複製電話並自動標記為待確認
  const handleCopyPhone = (hostKey: string, phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedKey(hostKey);
    setTimeout(() => setCopiedKey(null), 2000);

    // 若尚未付款且尚未報價，複製後自動標記為待確認
    if (!paidStatus[hostKey] && !reportedStatus[hostKey]) {
      onReportPaid(hostKey);
    }
  };

  // 6. 處理 Host 轉帳 Check List 狀態切換 (未處理 -> 待確認 -> 已轉發 -> 未處理)
  const handleHostStatusClick = (hostKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPaid = paidStatus[hostKey];
    const isReported = reportedStatus[hostKey];

    if (isPaid) {
      onTogglePaid(hostKey);
    } else if (isReported) {
      onTogglePaid(hostKey);
    } else {
      onReportPaid(hostKey);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto">
      {events.map((event) => {
        // 全場向球員總應收（排除 Carol）
        let totalReceivable = 0;
        event.players.forEach(p => {
          if (p.name.trim().toUpperCase() !== 'CAROL') {
            totalReceivable += getPlayerTotalFee(event, p);
          }
        });

        // 收集與計算各 Host 代付明細
        const hostSummaryMap: {
          [hostName: string]: {
            displayName: string;
            phone: string;
            paidVenueCost: number;
            sessions: string[];
            personalCost: number;
          };
        } = {};

        // (A) 計算 Host 代付場地費
        event.sessions.forEach((s, idx) => {
          const { name: hostName, phone: hostPhone } = resolveContact(s.hostId);
          
          if (!hostSummaryMap[hostName]) {
            hostSummaryMap[hostName] = {
              displayName: hostName,
              phone: hostPhone,
              paidVenueCost: 0,
              sessions: [],
              personalCost: 0
            };
          }
          const sessionCost = s.cost || event.defaultCost || 200;
          hostSummaryMap[hostName].paidVenueCost += sessionCost;
          hostSummaryMap[hostName].sessions.push(s.name || `時段 ${idx + 1}`);
        });

        // (B) 扣除 Host 的個人球費
        Object.keys(hostSummaryMap).forEach(hostName => {
          const hostPlayer = event.players.find(p => {
            if (p.name.trim().toLowerCase() === hostName.trim().toLowerCase()) return true;
            const contact = cloudContacts.find(c => c.name.trim().toLowerCase() === hostName.trim().toLowerCase());
            return contact && p.id === contact.id;
          });

          if (hostPlayer) {
            hostSummaryMap[hostName].personalCost = getPlayerTotalFee(event, hostPlayer);
          }
        });

        // Carol 代付與個人球費
        const carolAsPlayer = event.players.find(p => p.name.trim().toUpperCase() === 'CAROL');
        const carolPersonalCost = carolAsPlayer ? getPlayerTotalFee(event, carolAsPlayer) : 0;
        const carolHostInfo = hostSummaryMap['Carol'] || hostSummaryMap['carol'] || { paidVenueCost: 0, personalCost: 0 };

        // Carol 淨應補給其他 Host 的總額
        let totalCarolPayoutToHosts = 0;
        Object.entries(hostSummaryMap).forEach(([hostName, info]) => {
          if (hostName.toUpperCase() !== 'CAROL') {
            const netPay = info.paidVenueCost - info.personalCost;
            if (netPay > 0) totalCarolPayoutToHosts += netPay;
          }
        });

        const carolNetTarget = totalReceivable - totalCarolPayoutToHosts;
        const isExpanded = expandedEventId === event.id;

        return (
          <div 
            key={event.id} 
            className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden ${
              isExpanded 
                ? 'border-indigo-200/80 shadow-lg shadow-indigo-100/50 ring-1 ring-indigo-500/10' 
                : 'border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md'
            }`}
          >
            {/* 折疊標頭 Header */}
            <div 
              onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
              className="p-5 cursor-pointer hover:bg-slate-50/80 transition-colors flex items-center justify-between select-none"
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-2xl transition-colors ${
                  isExpanded ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base tracking-tight">{event.eventName}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{event.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">全場向球員總應收 (不含CAROL)</span>
                  <span className="font-extrabold text-lg text-indigo-600">${Math.round(totalReceivable)}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>
            </div>

            {/* 展開後的詳細內容 */}
            {isExpanded && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-5">
                
                {/* Carol 本人統計看板 (藍紫漸變微光) */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-5 rounded-2xl shadow-xl shadow-indigo-950/20 space-y-4">
                  {/* 背景微光飾點 */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute right-12 -bottom-10 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md ${
                        carolAsPlayer 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-white/10 text-slate-300 border border-white/15'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${carolAsPlayer ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                        {carolAsPlayer ? 'Carol 已出席' : 'Carol 未出席'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-indigo-200/80 block tracking-wide">Carol 最終淨收目標</span>
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                        ${Math.round(carolNetTarget)}
                      </span>
                    </div>
                  </div>

                  {/* Carol 的個人場費與球費卡片 */}
                  <div className="relative grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="text-indigo-200/70 font-medium flex items-center gap-1">
                        <PlusCircle size={13} className="text-indigo-300" /> 代付場費
                      </span>
                      <span className="font-bold text-white">${Math.round(carolHostInfo.paidVenueCost)}</span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                      <span className="text-indigo-200/70 font-medium flex items-center gap-1">
                        <MinusCircle size={13} className="text-rose-300" /> 應扣個人球費
                      </span>
                      <span className="font-bold text-rose-200">${Math.round(carolPersonalCost)}</span>
                    </div>
                  </div>
                </div>

                {/* 各 HOST 代付與清算明細 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={14} className="text-indigo-500" /> 各 Host 代付與轉帳清算
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(hostSummaryMap).map(([hostName, info]) => {
                      if (hostName.toUpperCase() === 'CAROL') return null;
                      
                      const hostKey = `host_${event.id}_${hostName}`;
                      const netTransfer = info.paidVenueCost - info.personalCost;
                      const isHostPaid = paidStatus[hostKey];
                      const isHostReported = reportedStatus[hostKey];

                      return (
                        <div 
                          key={hostName} 
                          className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-all duration-200 space-y-3"
                        >
                          {/* 第一層：Host 資訊與 Carol 應轉金額 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {/* 名字大頭貼 Badge */}
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-slate-100 text-indigo-700 font-black text-xs flex items-center justify-center border border-indigo-200/50">
                                {info.displayName.substring(0, 2).toUpperCase()}
                              </div>
                              
                              <div>
                                <span className="font-bold text-slate-800 text-base block leading-tight">{info.displayName}</span>
                                {info.sessions.length > 0 && (
                                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                                    <Clock size={10} /> {info.sessions.join('、')}
                                  </span>
                                )}
                              </div>

                              {/* 一鍵複製電話膠囊按鈕 */}
                              {info.phone ? (
                                <button
                                  onClick={(e) => handleCopyPhone(hostKey, info.phone, e)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all ml-1 ${
                                    copiedKey === hostKey
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                      : 'bg-slate-100/80 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/60 active:scale-95'
                                  }`}
                                  title="點擊複製電話並設為待確認"
                                >
                                  <Phone size={11} />
                                  <span>{info.phone}</span>
                                  {copiedKey === hostKey ? (
                                    <Check size={12} className="text-emerald-500 animate-in zoom-in" />
                                  ) : (
                                    <Copy size={11} className="text-slate-400" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                                  待補電話
                                </span>
                              )}
                            </div>

                            {/* Carol 應轉發金額 */}
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-amber-600/90 uppercase block">
                                Carol 應轉發給 {info.displayName}
                              </span>
                              <span className="font-black text-xl text-amber-600 tracking-tight">
                                ${Math.round(netTransfer)}
                              </span>
                            </div>
                          </div>

                          {/* 第二層：明細算式與 Checklist 狀態控制鈕 */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                            {/* 算式標籤 */}
                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                代場費 ${Math.round(info.paidVenueCost)}
                              </span>
                              <span className="text-slate-300">-</span>
                              <span className={`px-2 py-0.5 rounded-md ${
                                info.personalCost > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'
                              }`}>
                                球費 ${Math.round(info.personalCost)}
                              </span>
                            </div>

                            {/* Checklist 狀態按鈕 */}
                            <button
                              onClick={(e) => handleHostStatusClick(hostKey, e)}
                              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 ${
                                isHostPaid 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 hover:bg-emerald-600' 
                                  : isHostReported 
                                  ? 'bg-amber-500 text-white shadow-md shadow-amber-200 hover:bg-amber-600' 
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {isHostPaid ? (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>已轉發</span>
                                </>
                              ) : isHostReported ? (
                                <>
                                  <Circle size={14} className="animate-ping" />
                                  <span>待確認</span>
                                </>
                              ) : (
                                <>
                                  <Circle size={14} />
                                  <span>未處理</span>
                                </>
                              )}
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};