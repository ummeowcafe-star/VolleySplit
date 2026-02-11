import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  LayoutList, 
  WalletCards,
  Settings as SettingsIcon
} from 'lucide-react';
import { GlobalState, EventData, Payment, GlobalDefaults } from './types';
import { EventWorkspace } from './components/EventWorkspace';
import { EventList } from './components/EventList';
import { Ledger } from './components/Ledger';
import { GlobalSettings } from './components/GlobalSettings';

// --- 安全的 ID 生成器 (取代 crypto) ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

const INITIAL_DEFAULTS: GlobalDefaults = {
  cost: 200,
  playerNames: [],
  sessionNames: ['15:00 - 16:00', '16:00 - 17:00', '17:00 - 18:00']
};

export default function App() {
  const [store, setStore] = useState<GlobalState>({ 
    events: [], 
    payments: [],
    defaults: INITIAL_DEFAULTS
  });
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<'events' | 'ledger' | 'settings'>('events');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('volleySplitData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStore(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('volleySplitData', JSON.stringify(store));
    }
  }, [store, isLoaded]);

  const handleCreateEvent = (data: { name: string, date: string, copyRoster: boolean }) => {
    // 使用 generateId() 防止報錯
    const newId = generateId();
    let newPlayers: any[] = [];
    
    if (data.copyRoster && store.events.length > 0) {
      const sorted = [...store.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latest = sorted[0];
      if (latest) {
        newPlayers = [...latest.players];
      }
    } else {
      newPlayers = store.defaults.playerNames.map(name => ({
        id: generateId(),
        name: name
      }));
    }

    const newSessions = store.defaults.sessionNames.map(name => ({
      id: generateId(),
      name: name,
      cost: store.defaults.cost
    }));

    const newEvent: EventData = {
      id: newId,
      date: data.date,
      eventName: data.name,
      defaultCost: store.defaults.cost,
      players: newPlayers,
      sessions: newSessions,
      participation: {}
    };

    setStore(prev => ({ ...prev, events: [...prev.events, newEvent] }));
    setCurrentEventId(newId);
  };

  const handleUpdateEvent = (updatedEvent: EventData) => {
    // 這裡確保狀態更新
    setStore(prev => ({
      ...prev,
      events: prev.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
    }));
  };

  const handleDeleteEvent = () => {
    if (currentEventId) {
      setStore(prev => ({
        ...prev,
        events: prev.events.filter(e => e.id !== currentEventId)
      }));
      setCurrentEventId(null);
    }
  };

  const handleClearBalance = (playerName: string, amount: number) => {
    const newPayment: Payment = {
      id: generateId(),
      playerName: playerName.trim(),
      amount: amount,
      date: new Date().toISOString()
    };
    setStore(prev => ({
      ...prev,
      payments: [...prev.payments, newPayment]
    }));
  };

  const handleSaveDefaults = (newDefaults: GlobalDefaults) => {
    setStore(prev => ({ ...prev, defaults: newDefaults }));
    setHomeTab('events');
  };

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  if (currentEventId) {
    const event = store.events.find(e => e.id === currentEventId);
    if (!event) {
      setCurrentEventId(null);
      return null;
    }
    return (
      <EventWorkspace 
        event={event}
        onUpdate={handleUpdateEvent}
        onBack={() => setCurrentEventId(null)}
        onDelete={handleDeleteEvent}
      />
    );
  }

  // Dashboard render... (保持原本的 return 不變，只要確保上面 handleCreateEvent 改用了 generateId 即可)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => {
              setHomeTab('events');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">VolleySplit</h1>
              <p className="text-xs text-slate-500">Event Manager</p>
            </div>
          </div>
          <button 
            onClick={() => setHomeTab('settings')}
            className={`p-2 rounded-full transition-colors ${homeTab === 'settings' ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {homeTab === 'settings' ? (
          <GlobalSettings 
            defaults={store.defaults}
            onSave={handleSaveDefaults}
            onClose={() => setHomeTab('events')}
          />
        ) : homeTab === 'ledger' ? (
          <Ledger state={store} onClearBalance={handleClearBalance} />
        ) : (
          <EventList 
            events={store.events}
            onSelectEvent={setCurrentEventId}
            onCreateEvent={handleCreateEvent}
          />
        )}
      </main>

      {homeTab !== 'settings' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-bottom z-40">
          <div className="max-w-3xl mx-auto flex justify-around items-center h-16">
            <button 
              onClick={() => setHomeTab('events')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${homeTab === 'events' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutList size={24} />
              <span className="text-[10px] font-medium uppercase">Events</span>
            </button>
            <button 
              onClick={() => setHomeTab('ledger')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${homeTab === 'ledger' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <WalletCards size={24} />
              <span className="text-[10px] font-medium uppercase">Ledger</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}