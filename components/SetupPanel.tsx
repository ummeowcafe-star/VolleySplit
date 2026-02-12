import React, { useState } from 'react';
import { Plus, X, UserPlus, Clock, DollarSign, Calendar, Users } from 'lucide-react';
import { AppData, Session, Player } from '../types';

interface SetupPanelProps {
  data: AppData;
  onUpdateSettings: (updates: Partial<AppData>) => void;
  onAddSession: () => void;
  onRemoveSession: (id: string) => void;
  onUpdateSession: (id: string, updates: Partial<Session>) => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
}

export const SetupPanel: React.FC<SetupPanelProps> = ({
  data,
  onUpdateSettings,
  onAddSession,
  onRemoveSession,
  onUpdateSession,
  onAddPlayer,
  onRemovePlayer
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Event Details Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Calendar size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">Event Details</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Event Name</label>
            <input
              type="text"
              value={data.eventName}
              onChange={(e) => onUpdateSettings({ eventName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Friday Night Volley"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Date</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => onUpdateSettings({ date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Default Cost ($)</label>
              <input
                type="number"
                value={data.defaultCost}
                onChange={(e) => onUpdateSettings({ defaultCost: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sessions Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-700">Time Sessions</h2>
          </div>
          <button 
            onClick={onAddSession}
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {data.sessions.map((session) => (
            <div key={session.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={session.name}
                  onChange={(e) => onUpdateSession(session.id, { name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:border-indigo-500 focus:outline-none"
                  placeholder="Session Name (e.g. 15:00-16:00)"
                />
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-slate-400" />
                  <input
                    type="number"
                    value={session.cost}
                    onChange={(e) => onUpdateSession(session.id, { cost: Number(e.target.value) })}
                    className="w-24 px-2 py-1 border border-slate-200 rounded text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={() => onRemoveSession(session.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          ))}
          {data.sessions.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No sessions added. Click "Add" to start.
            </div>
          )}
        </div>
      </section>

      {/* Roster Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Users size={18} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700">Player Roster</h2>
        </div>
        
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleAddPlayer} className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Add new player..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
            <button 
              type="submit"
              disabled={!newPlayerName.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <UserPlus size={18} />
              <span className="hidden sm:inline">Add</span>
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {data.players.map((player) => (
            <div key={player.id} className="p-3 px-4 flex items-center justify-between group hover:bg-slate-50">
              <span className="font-medium text-slate-700">{player.name}</span>
              <button 
                onClick={() => onRemovePlayer(player.id)}
                className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                title="Remove player"
              >
                <X size={18} />
              </button>
            </div>
          ))}
          {data.players.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              No players in roster.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};