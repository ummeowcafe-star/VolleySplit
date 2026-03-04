import React, { useState, useEffect, useMemo } from 'react';
import { Settings, List, Receipt, Save, Crown, Clock, UserPlus, Calendar as CalendarIcon, ShieldCheck, Lock, Unlock } from 'lucide-react';
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

  // ★ 新增：暗箱模式狀態與實力本機儲存
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [skillBook, setSkillBook] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('volley_skill_book');
    return saved ? JSON.parse(saved) : {};
  });

  // ★ 統合曾經出現過的所有球員名單 (用於暗箱編輯)
  const allUniquePlayers = useMemo(() => {
    const names = new Set(store.defaults.playerNames);
    store.events.forEach(e => e.players.forEach(p => names.add(p.name)));
    return Array.from(names).sort();
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

  const handleCreateEvent = (data: { name: string, date: string, copyRoster: boolean }) => {
    const newId = generateId();
    const newEvent: EventData = {
      id: newId, date: data.date, eventName: data.name, defaultCost: store.defaults.cost,
      players: data.copyRoster && store.events.length > 0 ? [...store.events[0].players] : store.defaults.playerNames.map(name => ({ id: generateId(), name })),
      sessions: store.defaults.sessionNames.map(name => ({ id: generateId(), name, cost: store.defaults.cost })),
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

             {/* ★ 密碼保護的暗箱模式 */}
             <section className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-black text-slate-700 text-sm flex items-center gap-2">
                      <ShieldCheck size={18} className="text-amber-500" />
                      進階模式
                    </span>
                    <p className="text-[10px] text-slate-400 font-bold mt-1"></p>
                  </div>
                  {!isSecretUnlocked ? (
                    <button onClick={() => {
                      const pwd = prompt('請輸入密碼：');
                      if (pwd === '1020304050') setIsSecretUnlocked(true);
                      else if (pwd !== null) alert('密碼錯誤！');
                    }} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 active:scale-95 transition-all">
                      <Lock size={18} />
                    </button>
                  ) : (
                    <button onClick={() => setIsSecretUnlocked(false)} className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-600 active:scale-95 transition-all">
                      <Unlock size={18} />
                    </button>
                  )}
                </div>

                {isSecretUnlocked && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 max-h-[400px] overflow-y-auto pr-2">
                    {allUniquePlayers.map(name => {
                      const currentLvl = skillBook[name] || 2;
                      return (
                        <div key={name} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <span className="font-black text-slate-700">{name}</span>
                          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm shrink-0">
                            {[1, 2, 3].map(level => (
                              <button
                                key={level}
                                onClick={() => {
                                  const newBook = { ...skillBook, [name]: level };
                                  setSkillBook(newBook);
                                  localStorage.setItem('volley_skill_book', JSON.stringify(newBook));
                                }}
                                className={`px-3 py-1.5 text-xs font-black transition-colors ${
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
                  </div>
                )}
             </section>

             <button onClick={() => setActiveTab('events')} className="w-full bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={24} /> 保存並返回</button>
          </div>
        )}
      </main>

      {/* ★ 剛才不小心被刪掉的底部導航列在這裡！ */}
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