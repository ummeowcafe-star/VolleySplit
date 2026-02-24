import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Info } from 'lucide-react'; 
import { EventData } from '../types';

interface Props {
  events: EventData[];
}

export const WeeklyHeatmap: React.FC<Props> = ({ events }) => {
  const DAYS = ['一', '二', '三', '四', '五', '六', '日'];
  const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); 

  const { matrix, maxValue } = useMemo(() => {
    const data: Record<number, number[]> = {};
    HOURS.forEach(h => { data[h] = [0, 0, 0, 0, 0, 0, 0]; });
    let max = 0;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return { matrix: data, maxValue: 0 };
    }

    events.forEach(event => {
      if (!event.date || !event.sessions || !event.players) return;

      const dateStr = event.date.replace(/年|月/g, '-').replace(/日/g, '');
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      
      let dayIdx = d.getDay(); 
      dayIdx = dayIdx === 0 ? 6 : dayIdx - 1; 

      event.sessions.forEach(session => {
        const timeMatch = session.name.match(/(\d{1,2})[:\d]*\s*[-~至]\s*(\d{1,2})[:\d]*/);
        if (!timeMatch) return;

        const startHour = parseInt(timeMatch[1], 10);
        let endHour = parseInt(timeMatch[2], 10);
        if (endHour < startHour) endHour += 24; 

        let attendance = 0;
        event.players.forEach(p => {
          if ((event.participation?.[`${session.id}_${p.id}`] || 0) > 0) attendance++;
        });

        for (let h = startHour; h < endHour; h++) {
          const hourKey = h % 24;
          if (data[hourKey] !== undefined) {
            data[hourKey][dayIdx] += attendance;
            if (data[hourKey][dayIdx] > max) max = data[hourKey][dayIdx];
          }
        }
      });
    });

    return { matrix: data, maxValue: max };
  }, [events]);

  // ★ 升級版的五段漸層顏色演算法
  const getColor = (value: number) => {
    if (value === 0) return 'bg-slate-50/50 text-transparent'; // 6. 隱形
    const ratio = value / maxValue;
    
    if (ratio >= 0.75) return 'bg-red-500 text-white shadow-inner font-black';     // 1. 爆滿 (紅色)
    if (ratio >= 0.50) return 'bg-orange-400 text-orange-900 shadow-inner font-bold'; // 2. 熱門 (橙色)
    if (ratio >= 0.25) return 'bg-yellow-300 text-yellow-900 font-bold';          // 3. 普通 (黃色)
    if (ratio >= 0.10) return 'bg-yellow-100 text-yellow-700 font-bold';          // 4. 較少 (淺黃)
    return 'bg-blue-100 text-blue-600 font-bold';                                 // 5. 甚少 (淺藍色)
  };

  if (!events || events.length === 0 || maxValue === 0) {
    return (
      <div className="p-8 text-center text-slate-400 font-bold bg-white rounded-3xl mt-6 border border-slate-200 shadow-sm">
        目前還沒有足夠的活動紀錄來分析最受歡迎時段喔！
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in zoom-in duration-300 mb-8 mt-2">
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 className="font-black text-lg leading-none">最受歡迎時段</h3>
            <p className="text-blue-200 text-[10px] font-bold mt-1 uppercase tracking-widest">Popular Times</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ★ 更新後的圖例說明 (5個級距) */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-md bg-blue-100"></div> 甚少</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-md bg-yellow-100"></div> 較少</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-md bg-yellow-300"></div> 普通</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-md bg-orange-400"></div> 熱門</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-md bg-red-500"></div> 爆滿</span>
        </div>

        <div className="rounded-2xl border border-slate-100 overflow-hidden relative shadow-inner bg-slate-50">
          <div className="overflow-x-auto overflow-y-auto max-h-[500px] no-scrollbar touch-pan-x touch-pan-y">
            <div className="min-w-[320px]">
              <div className="grid grid-cols-8 sticky top-0 z-20 shadow-[0_2px_5px_rgba(0,0,0,0.02)]">
                <div className="bg-white border-r border-b border-slate-100 h-10 flex justify-center items-center">
                  <Clock size={14} className="text-slate-300" />
                </div>
                {DAYS.map(day => (
                  <div key={day} className="bg-white border-b border-r border-slate-100 h-10 flex justify-center items-center text-[11px] font-black text-slate-500">
                    {day}
                  </div>
                ))}
              </div>

              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8">
                  <div className="bg-white border-r border-b border-slate-100 h-10 flex justify-center items-center text-[10px] font-bold text-slate-400 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    {hour}:00
                  </div>
                  {DAYS.map((_, dayIdx) => {
                    const val = matrix[hour][dayIdx];
                    return (
                      <div 
                        key={`${hour}-${dayIdx}`} 
                        className={`border-r border-b border-slate-100/50 h-10 flex justify-center items-center text-[11px] transition-colors ${getColor(val)}`}
                      >
                        {val > 0 ? val : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] font-bold text-slate-400 flex items-start gap-1.5 mt-2 bg-slate-50 p-3 rounded-xl">
          <Info size={14} className="shrink-0 text-blue-400" />
          數字代表過去在該時段的累積出席人次。未來揪團可優先參考紅、橙色的黃金時段！
        </p>
      </div>
    </div>
  );
};