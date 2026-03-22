import React, { useState, useEffect, useMemo } from 'react';
import { Settings, List, Receipt, Save, Crown, Clock, UserPlus, Calendar as CalendarIcon, ShieldCheck, Lock, Unlock, Search } from 'lucide-react';
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
interface GlobalState { events: EventData[]; defaults: GlobalDefaults; paidStatus: { [key: string]: boolean }; }
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
    paidStatus: {} 
  });
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'summary' | 'calendar' | 'hosts' | 'settings'>('events');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [cloudContacts, setCloudContacts] = useState<Contact[]>([]);
  const USER_ID = 'Owen_User_001'; 
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [secretSearchTerm, setSecretSearchTerm] = useState(''); // ★ 新增：搜尋關鍵字狀態

  const [skillBook, setSkillBook] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('volley_skill_book');
    return saved ? JSON.parse(saved) : {};
  });

  // 這裡就是你說的「自動識別過往所有人並去重複」的引擎！
  const allUniquePlayers = useMemo(() => {
    const names = new Set(store.defaults.playerNames); // 先載入預設舊名單
    store.events.forEach(e => e.players.forEach(p => names.add(p.name))); // 把所有歷史活動的球員都加進來
    return Array.from(names).sort(); // 自動去重複並排序
  }, [store.events, store.defaults.playerNames]);

  const fetchCloudContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setCloudContacts(data);
  };

  useEffect(() => {
    if (isLoaded) {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        const timer = setTimeout(() => {
          splash.classList.add('splash-hidden');
          setTimeout(() => splash.remove(), 500);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded]);

  useEffect(() => {
    const loadCloudData = async () => {
      try {
        const { data } = await supabase.from('volley_events').select('data').eq('user_id', USER_ID).maybeSingle(); 
        if (data) {
          let cloudData = data.data;
          if (!cloudData.defaults.phoneBook) cloudData.defaults.phoneBook = PLAYER_PHONE_BOOK;
          setStore(cloudData);
        }
        await fetchCloudContacts();
      } catch (e) { 
        console.error('SYNC ERROR:', e); 
      } finally { 
        setIsLoaded(true); 
      }
    };
    loadCloudData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      if (isLoaded) {
        await supabase.from('volley_events').upsert({ user_id: USER_ID, data: store, updated_at: new Date() }, { onConflict: 'user_id' });
      }
    };
    saveData();
  }, [store, isLoaded]);

  const handleTogglePaid = (playerName: string) => {
    setStore(prev => ({ ...prev, paidStatus: { ...prev.paidStatus, [playerName]: !prev.paidStatus[playerName] } }));
  };

  const handleUpdateEvent = (updatedEvent: EventData) => {
    setStore(prev => ({ ...prev, events: prev.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) }));
  };

  const handleCreateEvent = (data: { name: string, date: string, startTime: string, endTime: string, rawRoster: string }) => {
    const newId = generateId();
    
    const startHour = parseInt(data.startTime.split(':')[0], 10);
    const endHour = parseInt(data.endTime.split(':')[0], 10);
    const autoSessions = [];
    
    for (let i = startHour; i < endHour; i++) {
      const sessionName = `${i.toString().padStart(2, '0')}:00 - ${(i + 1).toString().padStart(2, '0')}:00`;
      autoSessions.push({
        id: generateId(),
        name: sessionName,
        cost: store.defaults.cost,
        hostId: 'Carol' 
      });
    }

    let initialPlayers: Player[] = [];
    
    if (data.rawRoster && data.rawRoster.trim() !== '') {
      const lines = data.rawRoster.split('\n');
      
      lines.forEach(line => {
        let cleanName = line.replace(/^\s*\d+[\.、]\s*/, ''); 
        cleanName = cleanName.replace(/[\(（\[【].*?[\)）\]】]/g, ''); 
        cleanName = cleanName.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ''); 
        cleanName = cleanName.trim();
        
        if (cleanName) {
          if (!initialPlayers.find(p => p.name === cleanName)) {
            initialPlayers.push({ id: generateId(), name: cleanName });
          }
        }
      });
    }

    const newEvent: EventData = {
      id: newId, 
      date: data.date, 
      eventName: data.name, 
      defaultCost: store.defaults.cost,
      players: initialPlayers, 
      sessions: autoSessions, 
      participation: {}
    };
    
    setStore(prev => ({ ...prev, events: [newEvent, ...prev.events] }));
    setCurrentEventId(newId);
  };

  if (!isLoaded) return null;

  if (currentEventId) {
    const event = store.events.find(e => e.id === currentEventId);
    if (!event) return null;
    return (
      <div className="max-w-3xl mx-auto p-4">
        <EventWorkspace 
          event={event} 
          onUpdate={handleUpdateEvent} 
          onBack={() => setCurrentEventId(null)} 
          onDelete={() => {
            setStore(prev => ({ ...prev, events: prev.events.filter(e => e.id !== currentEventId) }));
            setCurrentEventId(null);
          }} 
          phoneBook={store.defaults.phoneBook} 
          cloudContacts={cloudContacts} 
        />
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
        {activeTab === 'events' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <EventList events={store.events} onSelectEvent={setCurrentEventId} onCreateEvent={handleCreateEvent} />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <WeeklyHeatmap events={store.events} />
          </div>
        )}

        {activeTab === 'summary' && (
          <Ledger events={store.events} paidStatus={store.paidStatus} onTogglePaid={handleTogglePaid} />
        )}

        {activeTab === 'hosts' && (
          <ContactManager contacts={cloudContacts} onRefresh={fetchCloudContacts} userId={USER_ID} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <section className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
                <span className="font-black text-slate-700 text-sm block">預設場租費用</span>
                <input 
                  type="number" 
                  value={store.defaults.cost} 
                  onChange={(e) => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, cost: Number(e.target.value) } }))}
                  className="w-full bg-slate-50 mt-2 p-3 rounded-xl font-black text-blue-900 outline-none"
                />
             </section>

             <section className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-black text-slate-700 text-sm flex items-center gap-2">
                      <ShieldCheck size={18} className="text-amber-500" />
                      進階模式 (實力設定)
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">此數據僅存於本機，用於分隊平衡</p>
                  </div>
                  {!isSecretUnlocked ? (
                    <button onClick={() => {
                      const pwd = prompt('請輸入進階模式密碼：');
                      if (pwd === '1020304050') setIsSecretUnlocked(true);
                      else if (pwd !== null) alert('密碼錯誤！');
                    }} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
                      <Lock size={18} />
                    </button>
                  ) : (
                    <button onClick={() => {
                      setIsSecretUnlocked(false);
                      setSecretSearchTerm(''); // 關閉時清空搜尋
                    }} className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-600 active:scale-95 transition-all">
                      <Unlock size={18} />
                    </button>
                  )}
                </div>

                {/* ★ 展開後的進階模式內容 */}
                {isSecretUnlocked && (
                  <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                    
                    {/* 搜尋列與人數統計 */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">總收錄：{allUniquePlayers.length} 人</span>
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="搜尋球員..." 
                          value={secretSearchTerm}
                          onChange={(e) => setSecretSearchTerm(e.target.value)}
                          className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 w-32 transition-all"
                        />
                      </div>
                    </div>

                    {/* 球員名單列表 */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {allUniquePlayers
                        .filter(name => name.toLowerCase().includes(secretSearchTerm.toLowerCase()))
                        .map(name => {
                          const currentLvl = skillBook[name] || 2;
                          return (
                            <div key={name} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors">
                              <span className="font-black text-slate-700 text-sm truncate pr-2">{name}</span>
                              <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                                {[1, 2, 3].map(level => (
                                  <button
                                    key={level}
                                    onClick={() => {
                                      const newBook = { ...skillBook, [name]: level };
                                      setSkillBook(newBook);
                                      localStorage.setItem('volley_skill_book', JSON.stringify(newBook));
                                    }}
                                    className={`px-3 py-1.5 text-[10px] font-black transition-colors ${
                                      currentLvl === level 
                                        ? level === 3 ? 'bg-red-500 text-white' : level === 2 ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                                        : 'text-slate-400 hover:bg-slate-200'
                                    }`}
                                  >
                                    {level === 3 ? 'S' : level === 2 ? 'A' : 'B'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                      })}
                      
                      {/* 搜尋不到的提示 */}
                      {allUniquePlayers.filter(name => name.toLowerCase().includes(secretSearchTerm.toLowerCase())).length === 0 && (
                        <div className="text-center py-4 text-xs font-bold text-slate-400">
                          找不到這位球員 🏐
                        </div>
                      )}
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
          <button onClick={() => setActiveTab('events')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'events' ? 'text-blue-700' : 'text-slate-400'}`}>
            <List size={24} /><span className="text-[10px] font-black uppercase">Events</span>
          </button>
          
          <button onClick={() => setActiveTab('summary')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'summary' ? 'text-blue-700' : 'text-slate-400'}`}>
            <Receipt size={24} /><span className="text-[10px] font-black uppercase">Billing</span>
          </button>
          
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'calendar' ? 'text-blue-700' : 'text-slate-400'}`}>
            <CalendarIcon size={24} /><span className="text-[10px] font-black uppercase">Calendar</span>
          </button>

          <button onClick={() => setActiveTab('hosts')} className={`flex flex-col items-center gap-1 w-16 ${activeTab === 'hosts' ? 'text-blue-700' : 'text-slate-400'}`}>
            <Crown size={24} /><span className="text-[10px] font-black uppercase">Host</span>
          </button>
        </div>
      </nav>
    </div>
  );
}