import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, List, Receipt, Save, Crown, Clock, UserPlus, Calendar as CalendarIcon, ShieldCheck, Lock, Unlock, Search, Database, Download, Upload } from 'lucide-react';
import { EventWorkspace } from './components/EventWorkspace';
import { EventList } from './components/EventList';
import { Ledger } from './components/Ledger';
import { ContactManager } from './components/ContactManager'; 
import { supabase } from './supabaseClient'; 
import { WeeklyHeatmap } from './components/WeeklyHeatmap'; 

// 引入外部數據檔
import { PLAYER_PHONE_BOOK } from './data/playerData';

// 型別定義
interface Session { id: string; name: string; cost: number; hostId?: string; }
interface Player { id: string; name: string; }
interface EventData { id: string; date: string; eventName: string; defaultCost: number; players: Player[]; sessions: Session[]; participation?: { [key: string]: number }; }
interface GlobalDefaults { cost: number; playerNames: string[]; sessionNames: string[]; phoneBook: { [name: string]: string }; }
interface GlobalState { events: EventData[]; defaults: GlobalDefaults; paidStatus: { [key: string]: boolean }; reportedStatus: { [key: string]: boolean }; }
interface Contact { id: string; name: string; phone: string; }

export default function App() {
  const [store, setStore] = useState<GlobalState>({ 
    events: [],
    defaults: {
      cost: 200,
      playerNames: ['Carol', 'Kei', 'Owen', 'Tao', 'Candice', 'Humberto', 'Abby', 'Elson', 'Miki', 'Jacob', 'Vanessa', 'Eddie', 'Iman', 'Herman', 'Fifi', 'Ka Ieng', 'Jimmy', 'Kit', 'Celia', 'Winnie', 'Pang', 'On' , 'Ricky'],
      sessionNames: ['15:00 - 16:00', '16:00 - 17:00'],
      phoneBook: PLAYER_PHONE_BOOK
    },
    paidStatus: {},
    reportedStatus: {} 
  });
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'summary' | 'calendar' | 'hosts' | 'settings'>('events');
  const [isLoaded, setIsLoaded] = useState(false);
  const [preventSave, setPreventSave] = useState(true); // ★ 防空燒安全鎖
  
  const [cloudContacts, setCloudContacts] = useState<Contact[]>([]);
  const USER_ID = 'Owen_User_001'; 
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [secretSearchTerm, setSecretSearchTerm] = useState(''); 

  const [skillBook, setSkillBook] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('volley_skill_book');
    return saved ? JSON.parse(saved) : {};
  });

  const [genderBook, setGenderBook] = useState<Record<string, 'M' | 'F'>>(() => {
    const saved = localStorage.getItem('volley_gender_book');
    return saved ? JSON.parse(saved) : {};
  });

  const allUniquePlayers = useMemo(() => {
    const names = new Set(store.defaults.playerNames); 
    store.events.forEach(e => e.players.forEach(p => names.add(p.name))); 
    return Array.from(names).sort(); 
  }, [store.events, store.defaults.playerNames]);

  const fetchCloudContacts = async () => {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (!error && data) setCloudContacts(data);
  };

  useEffect(() => {
    if (isLoaded) {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        const timer = setTimeout(() => { splash.classList.add('splash-hidden'); setTimeout(() => splash.remove(), 500); }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded]);

  // ★ 載入資料邏輯 (包含本地影子備份還原)
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error } = await supabase.from('volley_events').select('data').eq('user_id', USER_ID).maybeSingle(); 
        if (error) throw error;

        let finalData = null;

        if (data && data.data && data.data.events && data.data.events.length > 0) {
          finalData = data.data;
          console.log("✅ 成功從雲端讀取資料");
        } else {
          // 如果雲端是空的，嘗試從本地瀏覽器抓取影子備份
          const localBackup = localStorage.getItem('volley_shadow_backup');
          if (localBackup) {
            finalData = JSON.parse(localBackup);
            console.log("🔄 雲端為空，已成功從本地影子備份還原資料！");
          }
        }

        if (finalData) {
          if (!finalData.defaults.phoneBook) finalData.defaults.phoneBook = PLAYER_PHONE_BOOK;
          if (!finalData.reportedStatus) finalData.reportedStatus = {}; 
          setStore(finalData);
        }

        await fetchCloudContacts();
        setPreventSave(false); // ★ 讀取流程順利完成，解開存檔鎖
      } catch (e) { 
        console.error('❌ SYNC ERROR 讀取失敗:', e); 
        // 讀取失敗時，嘗試使用本地備份，但保持 preventSave = true 防止覆寫雲端
        const localBackup = localStorage.getItem('volley_shadow_backup');
        if (localBackup) {
          setStore(JSON.parse(localBackup));
          alert("⚠️ 雲端連線失敗，目前顯示為本地離線備份資料。");
        }
      } finally { 
        setIsLoaded(true); 
      }
    };
    loadData();
  }, []);

  // ★ 存檔邏輯 (包含雲端存檔與本地影子備份)
  useEffect(() => {
    const saveData = async () => {
      // 只有在「解鎖 (preventSave: false)」且「活動數量 > 0」時，才允許覆寫雲端
      if (isLoaded && !preventSave && store.events.length > 0) {
        // 1. 存入雲端
        await supabase.from('volley_events').upsert({ user_id: USER_ID, data: store, updated_at: new Date() }, { onConflict: 'user_id' });
        // 2. 存入本地影子備份 (防空燒保險)
        localStorage.setItem('volley_shadow_backup', JSON.stringify(store));
      } else if (isLoaded && store.events.length === 0 && !preventSave) {
        console.warn("⚠️ 偵測到名單為空，攔截雲端覆寫，以保護歷史數據！");
      }
    };
    saveData();
  }, [store, isLoaded, preventSave]);

  // ★ 手動備份匯出 (下載 JSON)
  const handleExportBackup = () => {
    const dataStr = JSON.stringify(store, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `VolleySplit_Backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ★ 手動備份還原 (上傳 JSON)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData && importedData.events) {
          if (window.confirm("⚠️ 警告：這將會用備份檔覆蓋目前的全部資料！確定要還原嗎？")) {
            setStore(importedData);
            setPreventSave(false); // 允許這份新資料存上雲端
            // 強制覆寫雲端
            await supabase.from('volley_events').upsert({ user_id: USER_ID, data: importedData, updated_at: new Date() }, { onConflict: 'user_id' });
            localStorage.setItem('volley_shadow_backup', JSON.stringify(importedData));
            alert("✅ 資料還原成功！並已同步至雲端。");
          }
        } else {
          alert("❌ 檔案格式錯誤，無法還原！");
        }
      } catch (err) {
        alert("❌ 檔案讀取失敗！請確保是正確的 .json 備份檔。");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // 重置 input
  };

  // 帳單與報數狀態管理
  const handleTogglePaid = (key: string) => { 
    setStore(prev => ({ ...prev, paidStatus: { ...prev.paidStatus, [key]: !prev.paidStatus[key] }, reportedStatus: { ...prev.reportedStatus, [key]: false } })); 
  };
  const handleReportPaid = (key: string) => { 
    setStore(prev => ({ ...prev, reportedStatus: { ...prev.reportedStatus, [key]: true } })); 
  };
  const handleUpdateEvent = (updatedEvent: EventData) => { 
    setStore(prev => ({ ...prev, events: prev.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) })); 
  };

  // 接龍解析引擎
  const handleCreateEvent = (data: { name: string, date: string, startTime: string, endTime: string, rawRoster: string }) => {
    const newId = generateId();
    const startHour = parseInt(data.startTime.split(':')[0], 10);
    const endHour = parseInt(data.endTime.split(':')[0], 10);
    const autoSessions = [];
    for (let i = startHour; i < endHour; i++) {
      autoSessions.push({ id: generateId(), name: `${i.toString().padStart(2, '0')}:00 - ${(i + 1).toString().padStart(2, '0')}:00`, cost: store.defaults.cost, hostId: 'Carol' });
    }
    let initialPlayers: Player[] = [];
    if (data.rawRoster && data.rawRoster.trim() !== '') {
      data.rawRoster.split('\n').forEach(line => {
        if (/^\s*\d+[\.、]\s*/.test(line)) {
          let cleanName = line.replace(/^\s*\d+[\.、]\s*/, '').replace(/[\(（\[【].*?[\)）\]】]/g, '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').replace(/[~^]+/g, '').trim();
          if (cleanName && !initialPlayers.find(p => p.name === cleanName)) initialPlayers.push({ id: generateId(), name: cleanName });
        }
      });
    }
    const newEvent: EventData = { id: newId, date: data.date, eventName: data.name, defaultCost: store.defaults.cost, players: initialPlayers, sessions: autoSessions, participation: {} };
    setStore(prev => ({ ...prev, events: [newEvent, ...prev.events] }));
    setCurrentEventId(newId);
  };

  if (!isLoaded) return null;

  if (currentEventId) {
    const event = store.events.find(e => e.id === currentEventId);
    if (!event) return null;
    return (
      <div className="max-w-3xl mx-auto p-4">
        <EventWorkspace event={event} onUpdate={handleUpdateEvent} onBack={() => setCurrentEventId(null)} onDelete={() => { setStore(prev => ({ ...prev, events: prev.events.filter(e => e.id !== currentEventId) })); setCurrentEventId(null); }} phoneBook={store.defaults.phoneBook} cloudContacts={cloudContacts} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
          <button onClick={() => setActiveTab('events')} className="flex items-center gap-3">
            <img src="https://i.postimg.cc/447QbrCz/ilustracao-de-ball-volly-320979-35.avif" alt="Logo" className="w-12 h-12" />
            <h1 className="font-black text-2xl tracking-tighter text-blue-900">排球計數易 VolleySplit</h1>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-full transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}>
            <Settings size={28} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {activeTab === 'events' && <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500"><EventList events={store.events} onSelectEvent={setCurrentEventId} onCreateEvent={handleCreateEvent} /></div>}
        {activeTab === 'calendar' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><WeeklyHeatmap events={store.events} /></div>}
        
        {/* Ledger */}
        {activeTab === 'summary' && (
          <Ledger 
            events={store.events} 
            paidStatus={store.paidStatus} 
            reportedStatus={store.reportedStatus} 
            onTogglePaid={handleTogglePaid} 
            onReportPaid={handleReportPaid} 
            phoneBook={store.defaults.phoneBook} 
            cloudContacts={cloudContacts} 
          />
        )}
        
        {activeTab === 'hosts' && <ContactManager contacts={cloudContacts} onRefresh={fetchCloudContacts} userId={USER_ID} />}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
             
             {/* 資料安全備份區塊 */}
             <section className="bg-white rounded-[2rem] border border-blue-200 p-5 shadow-sm shadow-blue-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10">
                  <span className="font-black text-blue-900 text-base flex items-center gap-2 mb-1">
                    <Database size={20} className="text-blue-600" /> 資料安全備份 (雙重保險)
                  </span>
                  <p className="text-xs font-bold text-slate-500 mb-4 leading-relaxed">
                    除了雲端同步，強烈建議定期點擊匯出備份，保存至群組。若發生意外，可隨時還原包含「打球時數」的完整歷史紀錄。
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleExportBackup} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200"
                    >
                      <Download size={18} /> 匯出備份檔
                    </button>
                    <label className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-700 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                      <Upload size={18} className="text-slate-400" /> 還原資料
                      <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImportBackup} />
                    </label>
                  </div>
                </div>
             </section>

             <section className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
                <span className="font-black text-slate-700 text-sm block">預設場租費用</span>
                <input type="number" value={store.defaults.cost} onChange={(e) => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, cost: Number(e.target.value) } }))} className="w-full bg-slate-50 mt-2 p-3 rounded-xl font-black text-blue-900 outline-none" />
             </section>

             <section className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div><span className="font-black text-slate-700 text-sm flex items-center gap-2"><ShieldCheck size={18} className="text-amber-500" />進階模式</span><p className="text-[10px] text-slate-400 font-bold mt-1">此數據僅存於本機，用於分隊平衡</p></div>
                  {!isSecretUnlocked ? (
                    <button onClick={() => { const pwd = prompt('請輸入進階模式密碼：'); if (pwd === '1020304050') setIsSecretUnlocked(true); else if (pwd !== null) alert('密碼錯誤！'); }} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"><Lock size={18} /></button>
                  ) : (
                    <button onClick={() => { setIsSecretUnlocked(false); setSecretSearchTerm(''); }} className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-600 active:scale-95 transition-all"><Unlock size={18} /></button>
                  )}
                </div>
                {isSecretUnlocked && (
                  <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">總收錄：{allUniquePlayers.length} 人</span><div className="relative"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="搜尋球員..." value={secretSearchTerm} onChange={(e) => setSecretSearchTerm(e.target.value)} className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 w-32 transition-all" /></div></div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {allUniquePlayers.filter(name => name.toLowerCase().includes(secretSearchTerm.toLowerCase())).map(name => {
                          const currentLvl = skillBook[name] || 2;
                          const currentGender = genderBook[name] || 'M'; 
                          return (
                            <div key={name} className="flex flex-wrap items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors gap-2">
                              <span className="font-black text-slate-700 text-sm truncate pr-2 flex-1">{name}</span>
                              <div className="flex items-center gap-2">
                                <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                                  <button onClick={() => { const newBook = { ...genderBook, [name]: 'M' }; setGenderBook(newBook); localStorage.setItem('volley_gender_book', JSON.stringify(newBook)); }} className={`px-3 py-1.5 text-xs font-black transition-colors ${currentGender === 'M' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:bg-slate-200'}`}>♂</button>
                                  <button onClick={() => { const newBook = { ...genderBook, [name]: 'F' }; setGenderBook(newBook); localStorage.setItem('volley_gender_book', JSON.stringify(newBook)); }} className={`px-3 py-1.5 text-xs font-black transition-colors ${currentGender === 'F' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:bg-slate-200'}`}>♀</button>
                                </div>
                                <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                                  {[1, 2, 3].map(level => (
                                    <button key={level} onClick={() => { const newBook = { ...skillBook, [name]: level }; setSkillBook(newBook); localStorage.setItem('volley_skill_book', JSON.stringify(newBook)); }} className={`px-3 py-1.5 text-[10px] font-black transition-colors ${currentLvl === level ? level === 3 ? 'bg-red-500 text-white' : level === 2 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-200'}`}>{level === 3 ? 'S' : level === 2 ? 'A' : 'B'}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                      })}
                    </div>
                  </div>
                )}
             </section>
             <button onClick={() => setActiveTab('events')} className="w-full bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={24} /> 保存並返回</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-4 py-3 z-40 shadow-2xl">
        <div className="max-w-3xl mx-auto flex justify-between items-center px-2">
          <button onClick={() => setActiveTab('events')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'events' ? 'text-blue-700' : 'text-slate-400'}`}><List size={24} /><span className="text-[10px] font-black uppercase">Events</span></button>
          <button onClick={() => setActiveTab('summary')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'summary' ? 'text-blue-700' : 'text-slate-400'}`}><Receipt size={24} /><span className="text-[10px] font-black uppercase">Billing</span></button>
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'calendar' ? 'text-blue-700' : 'text-slate-400'}`}><CalendarIcon size={24} /><span className="text-[10px] font-black uppercase">Calendar</span></button>
          <button onClick={() => setActiveTab('hosts')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'hosts' ? 'text-blue-700' : 'text-slate-400'}`}><Crown size={24} /><span className="text-[10px] font-black uppercase">Host</span></button>
        </div>
      </nav>
    </div>
  );
}