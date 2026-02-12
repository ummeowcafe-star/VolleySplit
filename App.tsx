import React, { useState, useEffect } from 'react';
import { Settings, List, Receipt, User, Plus, Trash2, Save, Crown, Clock, UserPlus } from 'lucide-react';
import { EventWorkspace } from './components/EventWorkspace';
import { EventList } from './components/EventList';
import { Ledger } from './components/Ledger';
import { ContactManager } from './components/ContactManager'; // ★ 確保你有這個元件
import { supabase } from './supabaseClient'; // ★ 唯一連線來源

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
  const [activeTab, setActiveTab] = useState<'events' | 'summary' | 'hosts' | 'settings'>('events');
  const [isLoaded, setIsLoaded] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newSessionName, setNewSessionName] = useState('');

  // 雲端聯絡簿狀態
  const [cloudContacts, setCloudContacts] = useState<Contact[]>([]);
  const USER_ID = 'Owen_User_001'; 
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // 抓取雲端聯絡人
  const fetchCloudContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setCloudContacts(data);
  };

  // 初始載入與數據同步
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
      } catch (e) { console.error('SYNC ERROR:', e); } finally { setIsLoaded(true); }
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

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600">SYNCING...</div>;

  // --- 活動工作區渲染 ---
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
        {activeTab === 'events' && <EventList events={store.events} onSelectEvent={setCurrentEventId} onCreateEvent={handleCreateEvent} />}

        {activeTab === 'summary' && (
          <Ledger events={store.events} paidStatus={store.paidStatus} onTogglePaid={handleTogglePaid} />
        )}

        {/* 使用獨立的 ContactManager 元件管理雲端名單 */}
        {activeTab === 'hosts' && (
          <ContactManager 
            contacts={cloudContacts} 
            onRefresh={fetchCloudContacts} 
            userId={USER_ID} 
          />
        )}

        {/* SETTINGS 頁面 */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
             {/* 這裡保留你原本的 Roster, Sessions, Cost 設定代碼 */}
             <section className="bg-white rounded-[2rem] border border-slate-200 p-5 shadow-sm">
                <span className="font-black text-slate-700 text-sm block">預設場租費用</span>
                <input 
                  type="number" 
                  value={store.defaults.cost} 
                  onChange={(e) => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, cost: Number(e.target.value) } }))}
                  className="w-full bg-slate-50 mt-2 p-3 rounded-xl font-black text-blue-900 outline-none"
                />
             </section>
             <button onClick={() => setActiveTab('events')} className="w-full bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={24} /> 保存並返回</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-6 py-3 z-40 shadow-2xl">
        <div className="max-w-3xl mx-auto flex justify-around items-center">
          <button onClick={() => setActiveTab('events')} className={`flex flex-col items-center gap-1 ${activeTab === 'events' ? 'text-blue-700' : 'text-slate-400'}`}><List size={24} /><span className="text-[10px] font-black uppercase">Events</span></button>
          <button onClick={() => setActiveTab('summary')} className={`flex flex-col items-center gap-1 ${activeTab === 'summary' ? 'text-blue-700' : 'text-slate-400'}`}><Receipt size={24} /><span className="text-[10px] font-black uppercase">Billing</span></button>
          <button onClick={() => setActiveTab('hosts')} className={`flex flex-col items-center gap-1 ${activeTab === 'hosts' ? 'text-blue-700' : 'text-slate-400'}`}><Crown size={24} /><span className="text-[10px] font-black uppercase">Host</span></button>
        </div>
      </nav>
    </div>
  );
}