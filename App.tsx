import React, { useState, useEffect } from 'react';
// 修正：補回被遺漏的 Calculator 零件
import { Volleyball, Settings, List, Receipt, User, Plus, Trash2, Save, Calculator } from 'lucide-react';
import { EventWorkspace } from './components/EventWorkspace';
import { EventList } from './components/EventList';
import { Ledger } from './components/Ledger';
import { createClient } from '@supabase/supabase-js';

// --- Supabase 配置 ---
// 使用 import.meta.env 來讀取，這樣 GitHub 上的代碼就不會洩漏你的私密金鑰
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Session {
  id: string;
  name: string;
  cost: number;
}

interface EventData {
  id: string;
  date: string;
  eventName: string;
  defaultCost: number;
  players: any[];
  sessions: Session[];
  participation?: { [key: string]: number }; 
}

interface GlobalDefaults {
  cost: number;
  playerNames: string[];
  sessionNames: string[];
}

interface GlobalState {
  events: EventData[];
  defaults: GlobalDefaults;
  paidStatus: { [key: string]: boolean }; 
}

export default function App() {
  // 修改：將你提供的 23 位人員名單預設加入 playerNames
  const [store, setStore] = useState<GlobalState>({ 
    events: [],
    defaults: {
      cost: 200,
      playerNames: [
        'Carol', 'Kei', 'Owen',  'Tao', 'Candice', 'Humberto', 'Abby', 'Elson', 'Miki', 
        'Jacob', 'Vanessa', 'Eddie',  'Iman', 'Herman',  
         'Fifi', 'Ka Ieng', 'Jimmy', 'Kit',  'Celia', 
        'Winnie', 'Pang', 'On' , 'Ricky'
      ],
      sessionNames: ['15:00 - 16:00', '16:00 - 17:00']
    },
    paidStatus: {} 
  });
  
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'summary' | 'settings'>('events');
  const [isLoaded, setIsLoaded] = useState(false);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newSessionName, setNewSessionName] = useState('');

  const USER_ID = 'Owen_User_001'; 
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

useEffect(() => {
  const loadCloudData = async () => {
    try {
      // 修正：將 .single() 改為 .maybeSingle()
      const { data, error } = await supabase
        .from('volley_events')
        .select('data')
        .eq('user_id', USER_ID)
        .maybeSingle(); 

      if (data) setStore(data.data);
      if (error) console.error('Supabase error:', error.message);
    } catch (e) { 
      console.error('Cloud load failed:', e); 
    } finally { 
      setIsLoaded(true); 
    }
  };
  loadCloudData();
}, []);

  useEffect(() => {
    if (isLoaded) {
      supabase.from('volley_events').upsert({ user_id: USER_ID, data: store, updated_at: new Date() });
    }
  }, [store, isLoaded]);

  const handleTogglePaid = (eventId: string, playerName: string) => {
    const key = `${eventId}_${playerName}`;
    setStore(prev => ({
      ...prev,
      paidStatus: { ...prev.paidStatus, [key]: !prev.paidStatus[key] }
    }));
  };

  const handleCreateEvent = (data: { name: string, date: string, copyRoster: boolean }) => {
    const newId = generateId();
    const defaultSessions: Session[] = store.defaults.sessionNames.map(name => ({
      id: generateId(),
      name: name,
      cost: store.defaults.cost
    }));

    const newEvent: EventData = {
      id: newId,
      date: data.date,
      eventName: data.name,
      defaultCost: store.defaults.cost,
      players: data.copyRoster && store.events.length > 0 
        ? [...store.events[0].players] 
        : store.defaults.playerNames.map(name => ({ id: generateId(), name })),
      sessions: defaultSessions.length > 0 ? defaultSessions : [
        { id: generateId(), name: 'Session 1', cost: store.defaults.cost }
      ],
      participation: {}
    };
    setStore(prev => ({ ...prev, events: [newEvent, ...prev.events] }));
    setCurrentEventId(newId);
  };

  const handleUpdateEvent = (updatedEvent: EventData) => {
    setStore(prev => ({ ...prev, events: prev.events.map(e => e.id === updatedEvent.id ? updatedEvent : e) }));
  };

  const handleDeleteEvent = () => {
    setStore(prev => ({ ...prev, events: prev.events.filter(e => e.id !== currentEventId) }));
    setCurrentEventId(null);
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center font-black text-indigo-600">SYNCING...</div>;

  if (currentEventId) {
    const event = store.events.find(e => e.id === currentEventId);
    if (!event) { setCurrentEventId(null); return null; }
    return (
      <div className="max-w-3xl mx-auto p-4">
        <EventWorkspace event={event} onUpdate={handleUpdateEvent} onBack={() => setCurrentEventId(null)} onDelete={handleDeleteEvent} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('events')} 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md">
              <Volleyball size={20} />
            </div>
            <h1 className="font-black text-lg leading-tight tracking-tighter">VolleySplit</h1>
          </button>
          
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-full transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500'}`}>
            <Settings size={24} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {activeTab === 'events' && (
          <EventList events={store.events} onSelectEvent={setCurrentEventId} onCreateEvent={handleCreateEvent} />
        )}

        {activeTab === 'summary' && (
          <Ledger events={store.events} paidStatus={store.paidStatus} onTogglePaid={handleTogglePaid} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <h3 className="text-indigo-700 font-black text-sm uppercase">Admin Setup</h3>
              <p className="text-indigo-600/60 text-[11px] font-bold">Configure your default roster and settings here.</p>
            </div>

            {/* Global Roster */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <User size={18} className="text-slate-400" />
                <h3 className="font-black text-slate-700 text-sm uppercase">Global Roster</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Add default player..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
                  <button onClick={() => { if(newPlayerName.trim()) { setStore(prev => ({ ...prev, defaults: { ...prev.defaults, playerNames: [...prev.defaults.playerNames, newPlayerName.trim()] } })); setNewPlayerName(''); } }} className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Plus size={20} /></button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {store.defaults.playerNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                      <span className="font-bold text-slate-700">{name}</span>
                      <button onClick={() => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, playerNames: prev.defaults.playerNames.filter((_, i) => i !== index) } }))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Defaults Cost */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2"><Receipt size={18} className="text-slate-400" /><h3 className="font-black text-slate-700 text-sm uppercase">Defaults</h3></div>
              <div className="p-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Default Court Cost ($)</label>
                <input type="number" value={store.defaults.cost} onChange={(e) => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, cost: Number(e.target.value) } }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg" />
              </div>
            </section>

            {/* Default Sessions */}
            <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Calculator size={18} className="text-slate-400" />
                <h3 className="font-black text-slate-700 text-sm uppercase">Default Sessions</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <input type="text" value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)} placeholder="e.g. 14:00 - 15:00" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
                  <button onClick={() => { if(newSessionName.trim()) { setStore(prev => ({ ...prev, defaults: { ...prev.defaults, sessionNames: [...prev.defaults.sessionNames, newSessionName.trim()] } })); setNewSessionName(''); } }} className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Plus size={20} /></button>
                </div>
                <div className="space-y-2">
                  {store.defaults.sessionNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                      <span className="font-bold text-slate-700">{name}</span>
                      <button onClick={() => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, sessionNames: prev.defaults.sessionNames.filter((_, i) => i !== index) } }))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <button onClick={() => setActiveTab('events')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-emerald-100"><Save size={24} /> Save & Close</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-6 py-3 z-40 shadow-2xl">
        <div className="max-w-3xl mx-auto flex justify-around items-center">
          <button onClick={() => setActiveTab('events')} className={`flex flex-col items-center gap-1 ${activeTab === 'events' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <List size={24} /><span className="text-[10px] font-black uppercase">Events</span>
          </button>
          <button onClick={() => setActiveTab('summary')} className={`flex flex-col items-center gap-1 ${activeTab === 'summary' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Receipt size={24} /><span className="text-[10px] font-black uppercase">Billing</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <User size={24} /><span className="text-[10px] font-black uppercase">Me</span>
          </button>
        </div>
      </nav>
    </div>
  );
}