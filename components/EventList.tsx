import React, { useState, useEffect } from 'react';
import { ChevronRight, Users, Plus, X, Calendar, FileText, Clock } from 'lucide-react';

interface Event {
  id: string;
  date: string;
  eventName: string;
  players: any[];
}

interface EventListProps {
  events: Event[];
  onSelectEvent: (id: string) => void;
  // ★ 修改傳遞的資料格式，加入 startTime 和 endTime
  onCreateEvent: (data: { name: string, date: string, copyRoster: boolean, startTime: string, endTime: string }) => void;
}

// 產生時間選項 (09:00 ~ 23:00)
const TIME_OPTIONS = Array.from({ length: 15 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`);

export function EventList({ events, onSelectEvent, onCreateEvent }: EventListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    copyRoster: true,
    startTime: '16:00', // 預設下午 4 點
    endTime: '17:00'
  });

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const openModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      date: today,
      name: `Volleyball ${today}`,
      copyRoster: events.length > 0,
      startTime: '16:00',
      endTime: '17:00'
    });
    setIsModalOpen(true);
  };

  // 監聽開始時間改變，自動將結束時間設定為開始時間的下一小時
  const handleStartTimeChange = (newStartTime: string) => {
    const startHour = parseInt(newStartTime.split(':')[0], 10);
    const endHour = startHour + 1;
    const newEndTime = endHour <= 23 ? `${endHour.toString().padStart(2, '0')}:00` : '23:00';
    setFormData(prev => ({ ...prev, startTime: newStartTime, endTime: newEndTime }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 防呆：結束時間不能比開始時間早
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-blue-50/50">
              <h3 className="font-black text-xl text-blue-900">建立新球局</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-blue-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div>
                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1.5 ml-1">活動日期</label>
                <div className="relative">
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormData({ ...formData, date: newDate, name: `Volleyball ${newDate}` });
                    }} 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1.5 ml-1">球局名稱</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700" 
                  placeholder="例如：週日晚排" 
                />
              </div>

              {/* ★ 新增：預定時長 (開始與結束時間) */}
              <div>
                <label className="block text-[10px] font-black text-blue-400 uppercase mb-1.5 ml-1 flex items-center gap-1"><Clock size={12}/> 預定時長 (系統將自動切分時段)</label>
                <div className="flex items-center gap-2">
                  <select 
                    value={formData.startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-slate-700 appearance-none text-center"
                  >
                    {TIME_OPTIONS.map(time => <option key={time} value={time}>{time}</option>)}
                  </select>
                  
                  <span className="font-black text-slate-300">-</span>
                  
                  <select 
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({...prev, endTime: e.target.value}))}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 outline-none font-black text-slate-700 appearance-none text-center"
                  >
                    {TIME_OPTIONS.map(time => <option key={time} value={time} disabled={parseInt(time) <= parseInt(formData.startTime)}>{time}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2">
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

              <button 
                type="submit" 
                className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-800 active:scale-[0.98] transition-all mt-4 shadow-lg shadow-blue-200"
              >
                開始算帳
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}