import React, { useState, useEffect } from 'react';
import { Settings, List, Receipt, User, Plus, Trash2, Save, Crown, Clock, UserPlus } from 'lucide-react';
import { EventWorkspace } from './components/EventWorkspace';
import { EventList } from './components/EventList';
import { Ledger } from './components/Ledger';
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// 引入外部數據檔
import { PLAYER_PHONE_BOOK } from './data/playerData';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Session { id: string; name: string; cost: number; hostId?: string; }
interface EventData { id: string; date: string; eventName: string; defaultCost: number; players: any[]; sessions: Session[]; participation?: { [key: string]: number }; }
interface GlobalDefaults { cost: number; playerNames: string[]; sessionNames: string[]; phoneBook: { [name: string]: string }; }
interface GlobalState { events: EventData[]; defaults: GlobalDefaults; paidStatus: { [key: string]: boolean }; }

// ★ 新增：雲端聯絡人型別
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

  // ★ 新增：雲端聯絡簿狀態
  const [cloudContacts, setCloudContacts] = useState<Contact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const USER_ID = 'Owen_User_001'; 
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  // ★ 新增：抓取雲端聯絡人
  const fetchCloudContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setCloudContacts(data);
    }
  };

  // ★ 新增：儲存新聯絡人到雲端
  const handleAddCloudContact = async () => {
    if (!newContactName.trim()) return;
    
    const { error } = await supabase
      .from('contacts')
      .insert([{ 
        name: newContactName.trim(), 
        phone: newContactPhone.trim(),
        user_id: USER_ID // 配合 RLS 政策
      }]);

    if (!error) {
      setNewContactName('');
      setNewContactPhone('');
      fetchCloudContacts(); // 刷新列表
    }
  };

  // 數據載入防護
  useEffect(() => {
    const loadCloudData = async () => {
      try {
        const { data, error } = await supabase.from('volley_events').select('data').eq('user_id', USER_ID).maybeSingle(); 
        if (data) {
          let cloudData = data.data;
          if (!cloudData.defaults.phoneBook) cloudData.defaults.phoneBook = PLAYER_PHONE_BOOK;
          setStore(cloudData);
        }
        // ★ 載入時同步抓取雲端聯絡簿
        await fetchCloudContacts();
      } catch (e) { console.error('SYNC ERROR:', e); } finally { setIsLoaded(true); }
    };
    loadCloudData();
  }, []);

  // 數據同步到 Supabase
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
          // ★ 修改：同時傳入靜態與雲端名單
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
          <Ledger 
            events={store.events} 
            paidStatus={store.paidStatus} 
            onTogglePaid={handleTogglePaid} 
          />
        )}

        {/* ★ 重大修改：雲端 Host 聯絡簿管理 */}
        {activeTab === 'hosts' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* 新增聯絡人區塊 */}
            <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                <UserPlus size={16} /> 新增雲端聯絡人
              </h3>
              <div className="flex flex-col gap-3">
                <input placeholder="姓名 (例如: Angela)" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="電話 (例如: 66881234)" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddCloudContact} className="bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Save size={18} /> 存入雲端數據庫
                </button>
              </div>
            </section>

            {/* 列表顯示區塊 */}
            <section className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-blue-50/30 flex items-center gap-2">
                <Crown className="text-yellow-500" size={16} />
                <h3 className="font-black text-blue-900 text-[10px] uppercase">雲端聯絡人清單</h3>
              </div>
              <div className="p-2 space-y-1">
                {cloudContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-blue-50/30 rounded-2xl transition-colors group">
                    <div>
                      <span className="font-black text-slate-700 block">{contact.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{contact.phone || '無電話'}</span>
                    </div>
                    <button 
                      onClick={async () => {
                        if(confirm(`確定刪除 ${contact.name}?`)) {
                          await supabase.from('contacts').delete().eq('id', contact.id);
                          fetchCloudContacts();
                        }
                      }}
                      className="text-red-200 hover:text-red-500 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* SETTINGS 頁面 */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* ... 原本的 Global Roster, Sessions, Cost 設定保持不變 ... */}
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