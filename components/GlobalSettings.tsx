import React, { useState } from 'react';
import { GlobalDefaults } from '../types';
import { Save, Plus, Trash2, User, Clock, DollarSign } from 'lucide-react';

interface GlobalSettingsProps {
  defaults: GlobalDefaults;
  onSave: (newDefaults: GlobalDefaults) => void;
  onClose: () => void;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ defaults, onSave, onClose }) => {
  const [cost, setCost] = useState(defaults.cost);
  const [playerNames, setPlayerNames] = useState<string[]>(defaults.playerNames || []);
  const [sessionNames, setSessionNames] = useState<string[]>(defaults.sessionNames || []);
  
  const [newPlayer, setNewPlayer] = useState('');
  const [newSession, setNewSession] = useState('');

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayer.trim()) {
      setPlayerNames([...playerNames, newPlayer.trim()]);
      setNewPlayer('');
    }
  };

  const removePlayer = (index: number) => {
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSession.trim()) {
      setSessionNames([...sessionNames, newSession.trim()]);
      setNewSession('');
    }
  };

  const removeSession = (index: number) => {
    setSessionNames(sessionNames.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      cost,
      playerNames,
      sessionNames
    });
    onClose();
  };

  return (
    <div className="pb-20 space-y-6">
      
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
        <h3 className="font-bold mb-1">Admin Setup</h3>
        <p>Configure your default roster and settings here. These will be automatically applied when you create a new event.</p>
      </div>

      {/* Global Roster */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <User size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">Global Roster</h2>
        </div>
        
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              placeholder="Add default player..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button 
              type="submit"
              disabled={!newPlayer.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {playerNames.length === 0 ? (
             <div className="p-6 text-center text-slate-400 text-sm italic">
               No default players set.
             </div>
          ) : (
            playerNames.map((name, idx) => (
              <div key={idx} className="p-3 px-4 flex items-center justify-between group hover:bg-slate-50">
                <span className="font-medium text-slate-700">{name}</span>
                <button 
                  onClick={() => removePlayer(idx)}
                  className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Defaults */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <DollarSign size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">Defaults</h2>
        </div>
        <div className="p-4">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default Court Cost ($)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      {/* Default Sessions */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Clock size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">Default Sessions</h2>
        </div>
        
        <div className="p-4 bg-slate-50 border-b border-slate-200">
           <form onSubmit={handleAddSession} className="flex gap-2">
            <input
              type="text"
              value={newSession}
              onChange={(e) => setNewSession(e.target.value)}
              placeholder="e.g. 14:00 - 15:00"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button 
              type="submit"
              disabled={!newSession.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-100">
           {sessionNames.length === 0 ? (
             <div className="p-6 text-center text-slate-400 text-sm italic">
               No default sessions set.
             </div>
          ) : (
            sessionNames.map((name, idx) => (
              <div key={idx} className="p-3 px-4 flex items-center justify-between group hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700">{name}</span>
                <button 
                  onClick={() => removeSession(idx)}
                  className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Save Action */}
      <button 
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Save size={24} />
        Save & Close
      </button>

    </div>
  );
};
