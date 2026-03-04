import React, { useState, useEffect } from 'react';
import { Users, Shuffle, X, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { EventData } from '../types';

interface Props {
  event: EventData;
  onClose: () => void;
}

export const TeamGenerator: React.FC<Props> = ({ event, onClose }) => {
  const [step, setStep] = useState<'setup' | 'result'>('setup'); 
  const [teamCount, setTeamCount] = useState(3); 
  const [teams, setTeams] = useState<{ id: string; name: string }[][]>([]);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set(event.players.map(p => p.id)));

  // ★ 放寬防呆：只要總人數 >= 12，且剩餘隊伍至少能分到 1 人即可
  const checkValidTeamCount = (playerCount: number, tCount: number) => {
    if (playerCount < 12) return false; // 總人數低於12絕對無法生出兩隊6人
    if (tCount === 2) return playerCount >= 12;
    // 如果分3隊以上，第3隊至少要有1個人，所以總人數要大於 12 + (tCount - 2)
    return playerCount >= 12 + (tCount - 2);
  };

  useEffect(() => {
    let maxValid = 2;
    for (let i = 4; i >= 2; i--) {
      if (checkValidTeamCount(activeIds.size, i)) {
        maxValid = i;
        break;
      }
    }
    if (activeIds.size < 12) {
      setTeamCount(2); 
    } else if (teamCount > maxValid || !checkValidTeamCount(activeIds.size, teamCount)) {
      setTeamCount(maxValid);
    }
  }, [activeIds.size]);

  const togglePlayerActive = (id: string) => {
    const newSet = new Set(activeIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setActiveIds(newSet);
  };

  const getSkill = (playerName: string) => {
    const saved = localStorage.getItem('volley_skill_book');
    const book = saved ? JSON.parse(saved) : {};
    return book[playerName] || 2; 
  };

  const generateTeams = () => {
    const presentPlayers = event.players.filter(p => activeIds.has(p.id));

    if (presentPlayers.length < 12) {
      alert("上場人數不足 12 人，無法組成兩隊 (每隊至少需 6 人)！");
      return;
    }

    if (!checkValidTeamCount(presentPlayers.length, teamCount)) {
      alert(`目前人數無法滿足至少兩隊達 6 人的條件！`);
      return;
    }

    // ★ 核心升級：計算每隊的「目標容量」
    let targetSizes: number[] = [];
    const base = Math.floor(presentPlayers.length / teamCount);
    const rem = presentPlayers.length % teamCount;

    // 先試算絕對平均的分配 (例如 16人分3隊 -> 6, 5, 5)
    for (let i = 0; i < teamCount; i++) {
      targetSizes.push(base + (i < rem ? 1 : 0));
    }

    // 檢查是否有「至少兩隊達到 6 人」
    const teamsWith6 = targetSizes.filter(s => s >= 6).length;

    if (teamsWith6 < 2) {
      // 若沒有，強制「保底兩隊滿編」 (例如將 6, 5, 5 強制改為 6, 6, 4)
      targetSizes = [6, 6];
      let remainingPlayers = presentPlayers.length - 12;
      let remainingTeams = teamCount - 2;

      if (remainingTeams > 0) {
        const rBase = Math.floor(remainingPlayers / remainingTeams);
        const rRem = remainingPlayers % remainingTeams;
        for (let i = 0; i < remainingTeams; i++) {
          targetSizes.push(rBase + (i < rRem ? 1 : 0));
        }
      }
    }

    const sTier = presentPlayers.filter(p => getSkill(p.name) === 3);
    const aTier = presentPlayers.filter(p => getSkill(p.name) === 2);
    const bTier = presentPlayers.filter(p => getSkill(p.name) === 1);

    const shuffle = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    const sortedAndShuffled = [
      ...shuffle(sTier),
      ...shuffle(aTier),
      ...shuffle(bTier)
    ];

    const newTeams: any[][] = Array.from({ length: teamCount }, () => []);
    
    let currentTeam = 0;
    let direction = 1;

    // 蛇形派發 (遇到人數已滿的隊伍自動跳過)
    sortedAndShuffled.forEach(player => {
      // 尋找下一個還有空位的隊伍
      while (newTeams[currentTeam].length >= targetSizes[currentTeam]) {
        currentTeam += direction;
        if (currentTeam >= teamCount) {
          currentTeam = teamCount - 1;
          direction = -1;
        } else if (currentTeam < 0) {
          currentTeam = 0;
          direction = 1;
        }
      }

      newTeams[currentTeam].push(player);

      currentTeam += direction;
      if (currentTeam >= teamCount) {
        currentTeam = teamCount - 1;
        direction = -1;
      } else if (currentTeam < 0) {
        currentTeam = 0;
        direction = 1;
      }
    });

    setTeams(newTeams);
    setStep('result'); 
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-white max-h-[90vh] flex flex-col">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-700 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Users size={20} />
            <h3 className="font-black text-lg">智能分隊器</h3>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors active:scale-90">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {step === 'setup' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-black text-slate-700">選擇上場名單</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">目前已選：<span className="text-blue-600 font-black text-xs">{activeIds.size}</span> 人</p>
                </div>
                <button 
                  onClick={() => setActiveIds(activeIds.size === event.players.length ? new Set() : new Set(event.players.map(p => p.id)))}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  {activeIds.size === event.players.length ? '全部取消' : '全選'}
                </button>
              </div>
              
              <div className="space-y-2">
                {event.players.map(p => {
                  const isActive = activeIds.has(p.id);
                  return (
                    <div key={p.id} 
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] ${isActive ? 'bg-white border-blue-100 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-60'}`}
                      onClick={() => togglePlayerActive(p.id)}
                    >
                      {isActive ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} className="text-slate-400" />}
                      <span className={`font-black ${isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{p.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-slate-700">分隊結果</h4>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  總共 {activeIds.size} 人參與
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {teams.map((team, idx) => (
                  <div key={idx} className={`rounded-2xl border p-4 shadow-sm ${idx === 0 ? 'bg-red-50 border-red-100' : idx === 1 ? 'bg-blue-50 border-blue-100' : idx === 2 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-black text-sm uppercase tracking-wider ${idx === 0 ? 'text-red-700' : idx === 1 ? 'text-blue-700' : idx === 2 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        Team {String.fromCharCode(65 + idx)}
                      </h4>
                      <span className="text-[10px] font-black opacity-50 bg-white/50 px-2 py-0.5 rounded-md">{team.length} 人</span>
                    </div>
                    <ul className="space-y-2">
                      {team.map(p => (
                        <li key={p.id} className="font-black text-slate-700 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-50"></span> {p.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-white border-t border-slate-100 flex gap-3 items-center shrink-0">
          {step === 'setup' ? (
            <>
              <div className="flex bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                {[2, 3, 4].map(num => {
                  const isValid = checkValidTeamCount(activeIds.size, num);
                  return (
                    <button
                      key={num}
                      onClick={() => isValid && setTeamCount(num)}
                      disabled={!isValid}
                      className={`px-3 py-2 text-sm font-black transition-colors ${
                        teamCount === num ? 'bg-blue-700 text-white' : 
                        isValid ? 'text-slate-500 hover:bg-slate-200' : 'text-slate-300 bg-slate-100 cursor-not-allowed'
                      }`}
                    >
                      {num}隊
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={generateTeams}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-black py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Shuffle size={18} /> 開始分隊
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setStep('setup')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2 rounded-xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> 名單
              </button>
              <button 
                onClick={generateTeams}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-black py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Shuffle size={18} /> 換一組
              </button>
            </>
          )}
        </div>
        
      </div>
    </div>
  );
};