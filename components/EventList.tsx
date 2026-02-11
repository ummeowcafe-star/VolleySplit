import React, { useState } from 'react';
import { Plus, ChevronRight, Calendar, Users, FileText, X } from 'lucide-react';
import { EventData } from '../types';

interface EventListProps {
  events: EventData[];
  onSelectEvent: (id: string) => void;
  onCreateEvent: (data: { name: string, date: string, copyRoster: boolean }) => void;
}

export const EventList: React.FC<EventListProps> = ({ events, onSelectEvent, onCreateEvent }) => {
  // Sort events by date descending (newest first)
  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    copyRoster: true
  });

  const openModal = () => {
    // Default name based on date
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      date: today,
      name: `Volleyball ${today}`,
      copyRoster: events.length > 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateEvent(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Create Button */}
      <button 
        onClick={openModal}
        className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        <span className="font-semibold">Add New Event</span>
      </button>

      {/* Events List */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">History</h2>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
            <FileText size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm">No events yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map(event => (
              <button
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-slate-100 text-slate-500 p-3 rounded-lg flex flex-col items-center min-w-[60px]">
                    <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-bold leading-none">{new Date(event.date).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{event.eventName}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Users size={12} /> {event.players.length} players</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {event.sessions.length} sessions</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">New Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Event Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Sunday Morning"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox"
                    checked={formData.copyRoster}
                    onChange={(e) => setFormData({...formData, copyRoster: e.target.checked})}
                    disabled={events.length === 0}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-slate-700">Copy Last Roster</span>
                    <span className="block text-xs text-slate-400">Use players from {events[0]?.eventName || 'previous event'}</span>
                  </div>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all mt-2"
              >
                Create Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};