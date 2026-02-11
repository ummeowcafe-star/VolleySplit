import React, { useState, useEffect } from 'react';
import { Settings, List, Receipt, User, Plus, Trash2, Save, Crown, Clock } from 'lucide-react';
import { EventWorkspace } from './components/EventWorkspace';
import { EventList } from './components/EventList';
import { Ledger } from './components/Ledger';
import { createClient } from '@supabase/supabase-js';

// 引入外部數據檔
import { PLAYER_PHONE_BOOK } from './data/playerData';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Session { id: string; name: string; cost: number; hostId?: string; }
interface EventData { id: string; date: string; eventName: string; defaultCost: number; players: any[]; sessions: Session[]; participation?: { [key: string]: number }; }
interface GlobalDefaults { cost: number; playerNames: string[]; sessionNames: string[]; phoneBook: { [name: string]: string }; }
interface GlobalState { events: EventData[]; defaults: GlobalDefaults; paidStatus: { [key: string]: boolean }; }

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

  const USER_ID = 'Owen_User_001'; 
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // ★ 新增：切換付款狀態的邏輯
  const handleTogglePaid = (playerName: string) => {
    setStore(prev => ({
      ...prev,
      paidStatus: {
        ...prev.paidStatus,
        [playerName]: !prev.paidStatus[playerName] // 切換該球員的布林值
      }
    }));
  };

  // 數據載入防護：確保電話簿始終存在
  useEffect(() => {
    const loadCloudData = async () => {
      try {
        const { data, error } = await supabase.from('volley_events').select('data').eq('user_id', USER_ID).maybeSingle(); 
        if (data) {
          let cloudData = data.data;
          // 自動補齊 phoneBook 欄位防止介面崩潰
          if (!cloudData.defaults.phoneBook) {
            cloudData.defaults.phoneBook = PLAYER_PHONE_BOOK;
          }
          setStore(cloudData);
        }
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

        {/* ★ 修改點：傳遞真正的 handleTogglePaid */}
        {activeTab === 'summary' && (
          <Ledger 
            events={store.events} 
            paidStatus={store.paidStatus} 
            onTogglePaid={handleTogglePaid} 
          />
        )}

        {/* HOST 聯絡簿管理 */}
        {activeTab === 'hosts' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-yellow-50 border border-yellow-100 rounded-[2rem] p-5 flex items-center gap-4">
              <Crown className="text-yellow-500" size={32} />
              <div>
                <h3 className="text-blue-900 font-black text-sm uppercase">Host 聯絡簿</h3>
                <p className="text-yellow-700/70 text-[10px] font-bold">在此更新球員的轉帳電話。</p>
              </div>
            </div>
            <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-2 space-y-1">
                {store.defaults.playerNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-3 p-4 hover:bg-blue-50/30 rounded-2xl transition-colors group">
                    <span className="font-black text-slate-700 min-w-[60px]">{name}</span>
                    <input 
                      type="tel" 
                      placeholder={PLAYER_PHONE_BOOK[name] || "unknown"}
                      value={store.defaults.phoneBook?.[name] || ''}
                      onChange={(e) => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, phoneBook: { ...prev.defaults.phoneBook, [name]: e.target.value } } }))}
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* SETTINGS 頁面 */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2"><User size={18} className="text-blue-500" /><h3 className="font-black text-slate-700 text-xs uppercase">Global Roster</h3></div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="加新人..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
                  <button onClick={() => { if(newPlayerName.trim()) { setStore(prev => ({ ...prev, defaults: { ...prev.defaults, playerNames: [...prev.defaults.playerNames, newPlayerName.trim()] } })); setNewPlayerName(''); } }} className="bg-blue-700 text-white p-2 rounded-xl"><Plus size={20} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                  {store.defaults.playerNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 text-sm">{name}</span>
                      <button onClick={() => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, playerNames: prev.defaults.playerNames.filter((_, i) => i !== index) } }))} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2"><Clock size={18} className="text-blue-500" /><h3 className="font-black text-slate-700 text-xs uppercase">Default Sessions</h3></div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} placeholder="加預設時段..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold" />
                  <button onClick={() => { if(newSessionName.trim()) { setStore(prev => ({ ...prev, defaults: { ...prev.defaults, sessionNames: [...prev.defaults.sessionNames, newSessionName.trim()] } })); setNewSessionName(''); } }} className="bg-blue-700 text-white p-2 rounded-xl"><Plus size={20} /></button>
                </div>
                <div className="space-y-2">
                  {store.defaults.sessionNames.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 text-sm">{name}</span>
                      <button onClick={() => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, sessionNames: prev.defaults.sessionNames.filter((_, i) => i !== index) } }))} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] border border-slate-200 p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Receipt size={20} /></div>
                <div>
                  <span className="font-black text-slate-700 text-sm block">預設場租費用</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Default Court Fee</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
                <span className="font-black text-blue-900">$</span>
                <input 
                  type="number" 
                  value={store.defaults.cost} 
                  onChange={(e) => setStore(prev => ({ ...prev, defaults: { ...prev.defaults, cost: Number(e.target.value) } }))}
                  className="w-20 bg-transparent outline-none font-black text-blue-900 text-center text-xl"
                />
              </div>
            </section>
            
            <button onClick={() => setActiveTab('events')} className="w-full bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-blue-200/50"><Save size={24} /> 保存並返回活動頁面</button>
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