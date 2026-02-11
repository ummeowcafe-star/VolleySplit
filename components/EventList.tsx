import React, { useState } from 'react';
import { ChevronRight, Users, Calendar, FileText, Plus, X } from 'lucide-react';

interface EventListProps {
  events: any[];
  onSelectEvent: (id: string) => void;
  onCreateEvent: (data: { name: string, date: string, copyRoster: boolean }) => void;
}

export const EventList: React.FC<EventListProps> = ({ events, onSelectEvent, onCreateEvent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    copyRoster: true
  });

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openModal = () => {
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
    <div className="space-y-6">
      <button 
        onClick={openModal} 
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <Plus size={24} /> New Event
      </button>

      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">History</h2>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <FileText size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm font-medium">No events yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map(event => (
              <button key={event.id} onClick={() => onSelectEvent(event.id)} className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all flex items-center justify-between group text-left">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 text-slate-400 p-3 rounded-xl flex flex-col items-center min-w-[64px] border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-black">{new Date(event.date).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 group-hover:text-indigo-600">{event.eventName}</h3>
                    <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-slate-400 uppercase">
                      <span className="flex items-center gap-1"><Users size={12} /> {event.players.length} Players</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-xl text-slate-800">New Event</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  value={formData.date} 
                  onChange={(e) => {
                    const newDate = e.target.value;
                    // 同步更新日期與名稱
                    setFormData({
                      ...formData, 
                      date: newDate, 
                      name: `Volleyball ${newDate}` 
                    });
                  }} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Event Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                  placeholder="Sunday Volleyball" 
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={formData.copyRoster} onChange={(e) => setFormData({...formData, copyRoster: e.target.checked})} disabled={events.length === 0} className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 border-slate-300" />
                  <div>
                    <span className="block text-sm font-black text-slate-700">Copy Last Roster</span>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">自動匯入上次的球員名單</span>
                  </div>
                </label>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all mt-4 shadow-lg shadow-indigo-200">
                Create Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};