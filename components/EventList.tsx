import React, { useState } from 'react';
import { ChevronRight, Users, Plus, X, Calendar, FileText, Clock, MessageCircle, Sparkles } from 'lucide-react';

interface Event {
  id: string;
  date: string;
  eventName: string;
  players: any[];
}

interface EventListProps {
  events: Event[];
  onSelectEvent: (id: string) => void;
  onCreateEvent: (data: { name: string, date: string, copyRoster: boolean, startTime: string, endTime: string, rawRoster: string }) => void;
}

export function EventList({ events, onSelectEvent, onCreateEvent }: EventListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    copyRoster: true,
    startTime: '16:00',
    endTime: '17:00',
    rawRoster: '' 
  });

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      date: today,
      name: `Volleyball ${today}`,
      copyRoster: events.length > 0,
      startTime: '16:00',
      endTime: '17:00',
      rawRoster: '' 
    });
    setIsModalOpen(true);
  };

  const handleStartTimeChange = (newStartTime: string) => {
    if (!newStartTime) return;
    const startHour = parseInt(newStartTime.split(':')[0], 10);
    const endHour = startHour + 1;
    const newEndTime = endHour <= 23 ? `${endHour.toString().padStart(2, '0')}:00` : '23:00';
    setFormData(prev => ({ ...prev, startTime: newStartTime, endTime: newEndTime }));
  };

  // ★ 核心魔法：智能解析貼上的接龍文字 (取消場地抓取，保留純淨日期與時間)
  const handleRawRosterChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    let newDate = formData.date;
    let newStartTime = formData.startTime;
    let newEndTime = formData.endTime;
    let newName = formData.name;

    const lines = text.split('\n').filter(l => l.trim() !== '');
    
    if (lines.length > 0) {
      // 假設第一行通常是標題 (例如: 🔵3.15（日）14:00-17:00望廈場2🔵)
      const firstLine = lines[0];

      // 1. 智能抓取時間 (例如 14:00-17:00 或 14:00~17:00)
      const timeMatch = firstLine.match(/(\d{1,2}:\d{2})\s*(?:-|至|~)\s*(\d{1,2}:\d{2})/);
      if (timeMatch) {
        newStartTime = timeMatch[1].padStart(5, '0');
        newEndTime = timeMatch[2].padStart(5, '0');
      }

      // 2. 智能抓取日期 (例如 3.15 或 3/15 或 3月15)
      const dateMatch = firstLine.match(/(\d{1,2})[\.\/月](\d{1,2})/);
      if (dateMatch) {
        const year = new Date().getFullYear(); // 預設為今年
        const month = dateMatch[1].padStart(2, '0');
        const day = dateMatch[2].padStart(2, '0');
        newDate = `${year}-${month}-${day}`;
        // ★ 直接將名稱預設為乾淨的日期格式，不抓取場地
        newName = `Volleyball ${newDate}`;
      }
    }

    // 立即更新表單讓使用者看到魔法
    setFormData({
      ...formData,
      rawRoster: text,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      name: newName
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sHour = parseInt(formData.startTime);
    const eHour = parseInt(formData.endTime);
    if (eHour <= sHour) {
      alert("結束時間必須晚於開始時間喔！");
      return;
    }
    onCreateEvent(formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <button 
        onClick={openModal}
        className="w-full bg-blue-700 hover:bg-blue-800 text-white p-4 rounded-2xl shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 font-black text-lg transition-all active:scale-95"
      >
        <Plus size={24} /> New Event
      </button>
      
      <div className="space-y-4">
        <h2 className="font-black text-xs text-blue-900/60 tracking-wider uppercase mb-3 px-1">History</h2>
        
        {sortedEvents.length === 0 ? (
          <div className="text-center p-10 border-2 border-dashed border-blue-200 rounded-3xl bg-white/50">
            <FileText size={48} className="mx-auto text-blue-100 mb-2" />
            <p className="text-blue-400 font-bold">No events yet.</p>
            <p className="text-blue-300 text-sm">Tap the button above to start!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map(event => {
              const dateObj = new Date(event.date);
              const month = dateObj.getMonth() + 1;
              const day = dateObj.getDate();
              
              return (
                <button
                  key={event.id}
                  onClick={() => onSelectEvent(event.id)}
                  className="w-full bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-3 flex items-center justify-between shadow-md shadow-yellow-200/50 transition-all hover:shadow-lg hover:scale-[1.01] active:scale-98 group text-left border border-yellow-400/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-white/90 rounded-xl flex flex-col items-center justify-center shadow-sm backdrop-blur-sm">
                      <span className="text-[10px] font-black text-blue-600 uppercase leading-tight">{month}月</span>
                      <span className="text-2xl font-black text-blue-800 leading-none">{day}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-blue-900 text-base">{event.eventName}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 text-blue-700/80">
                        <Users size={14} />
                        <span className="text-xs font-bold">{event.players.length} Players</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-blue-700 opacity-60 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/50 shrink-0">
              <h3 className="font-black text-xl text-blue-900 flex items-center gap-2">建立新球局 <Sparkles size={18} className="text-amber-500"/></h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-blue-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
                
                <div className="mb-6">
                  <label className="block text-xs font-black text-emerald-600 uppercase mb-2 ml-1 flex items-center gap-1">
                    <MessageCircle size={14} /> 貼上微信接龍 (全自動填寫)
                  </label>
                  <textarea 
                    value={formData.rawRoster}
                    onChange={handleRawRosterChange}
                    placeholder="🔵1.1（日）14:00-17:00望廈場2🔵&#10;1. Carol🍓&#10;2. XXX "
                    className="w-full px-5 py-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none font-bold text-slate-700 text-sm h-32 resize-none placeholder:text-emerald-300 shadow-inner transition-all"
                  />
                  <p className="text-[10px] font-bold text-emerald-500/80 ml-1 mt-1.5 flex items-center gap-1">
                    <Sparkles size={10}/> 系統將自動解析日期與時段，過濾名單雜訊
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase mb-1.5 ml-1">活動日期</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date} 
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700 text-sm" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase mb-1.5 ml-1">球局名稱</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700 text-sm truncate" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-blue-400 uppercase mb-1.5 ml-1 flex items-center gap-1"><Clock size={12}/> 預定時長 (自動切分時段)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="time" 
                      required
                      value={formData.startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-slate-700 text-center"
                    />
                    <span className="font-black text-slate-300">-</span>
                    <input 
                      type="time" 
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({...prev, endTime: e.target.value}))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-slate-700 text-center"
                    />
                  </div>
                </div>

                {formData.rawRoster.trim() === '' && (
                  <div className="pt-2 animate-in fade-in zoom-in duration-300">
                    <label className="flex items-center gap-4 p-4 border border-slate-100 bg-slate-50/50 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all group">
                      <input 
                        type="checkbox" 
                        checked={formData.copyRoster} 
                        onChange={(e) => setFormData({...formData, copyRoster: e.target.checked})} 
                        disabled={events.length === 0} 
                        className="w-6 h-6 text-blue-600 rounded-lg focus:ring-blue-600 border-slate-300" 
                      />
                      <div>
                        <span className="block text-sm font-black text-slate-700 group-hover:text-blue-900">複製上次名單</span>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">自動匯入上一場陣容</span>
                      </div>
                    </label>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <button 
                form="create-event-form"
                type="submit" 
                className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-800 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Sparkles size={20} /> 建立並解析名單
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}