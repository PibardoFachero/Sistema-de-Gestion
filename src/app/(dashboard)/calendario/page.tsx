'use client';

import React, { useState, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfYear, eachMonthOfInterval, endOfYear, 
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameMonth, 
  isSameDay, isBefore, startOfDay, addDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Edit2, ArrowLeft, Copy, X, Check } from 'lucide-react';

interface Availability {
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string;
  type?: 'libre' | 'descanso' | 'trabajo';
}

const COLOR_MAP = {
  libre: { bg: 'bg-[#C8D6AF]', hover: 'hover:bg-[#B5C59A]', text: 'text-[#3A4A28]', border: 'border-[#3A4A28]/20', bgPale: 'bg-[#C8D6AF]/30' },
  descanso: { bg: 'bg-[#F9EBB2]', hover: 'hover:bg-[#E8D9A0]', text: 'text-[#5C4F1A]', border: 'border-[#5C4F1A]/20', bgPale: 'bg-[#F9EBB2]/30' },
  trabajo: { bg: 'bg-[#F4C2BA]', hover: 'hover:bg-[#E5B0A7]', text: 'text-[#6B3229]', border: 'border-[#6B3229]/20', bgPale: 'bg-[#F4C2BA]/30' }
};

// ARREGLO GLOBAL MAESTRO (Para lógica de rangos)
const TIME_SLOTS: string[] = [];
for (let h = 0; h <= 23; h++) {
  for (let m = 0; m < 60; m += 5) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}
TIME_SLOTS.push('24:00');

export default function CalendarioPage() {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState<Availability[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('komorebi_availabilities');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  
  const [editingCell, setEditingCell] = useState<{ date: string, time: string } | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<'libre' | 'descanso' | 'trabajo'>('libre');
  
  const [selectionStart, setSelectionStart] = useState<{ date: string, time: string, action: 'add' | 'remove', isMacro: boolean } | null>(null);

  const [expandedHours, setExpandedHours] = useState<number[]>([]);
  const [hoveredTimeStr, setHoveredTimeStr] = useState<string | null>(null);

  const [showReplicateMenu, setShowReplicateMenu] = useState(false);
  const [showSpecificWeeksModal, setShowSpecificWeeksModal] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [futureWeeksList, setFutureWeeksList] = useState<{ start: Date, end: Date, label: string }[]>([]);

  const activeTimes = new Set(availabilities.map(a => a.startTime));

  useEffect(() => {
    localStorage.setItem('komorebi_availabilities', JSON.stringify(availabilities));
  }, [availabilities]);

  const visibleTimeSlots: string[] = [];
  for (let h = 0; h <= 23; h++) {
    const hourStr = h.toString().padStart(2, '0');
    visibleTimeSlots.push(`${hourStr}:00`);
    if (expandedHours.includes(h)) {
      for (let m = 5; m < 60; m += 5) {
        visibleTimeSlots.push(`${hourStr}:${m.toString().padStart(2, '0')}`);
      }
    }
  }

  const toggleHour = (h: number) => {
    setExpandedHours(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  };

  const renderMonthlyGrid = () => {
    const startY = startOfYear(currentDate);
    const endY = endOfYear(currentDate);
    const months = eachMonthOfInterval({ start: startY, end: endY });
    
    const canGoPreviousYear = currentDate.getFullYear() > new Date().getFullYear();

    return (
      <div className="flex flex-col animate-in fade-in duration-500 w-full max-w-5xl mx-auto pb-12">
        <div className="bg-[#FBE6DD] rounded-[24px] p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-[#F7D6BF] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7D6BF] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4"></div>
          <div className="bg-white p-3 rounded-full shadow-sm relative z-10 text-[#845326] shrink-0">
            <Calendar className="size-6 sm:size-8" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-bold text-[#845326] leading-tight">
              Si nos dices cuál es tu horario disponible podemos personalizar los planes de tu proyecto.
            </h2>
            <p className="text-[#A57855] text-sm mt-1 font-semibold">
              Selecciona un mes para configurar tus horas de estudio o trabajo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-on-surface">
            {format(currentDate, 'yyyy')}
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 12))}
              disabled={!canGoPreviousYear}
              className={`p-2 rounded-full transition-colors ${!canGoPreviousYear ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high text-on-surface-variant'}`}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 12))}
              className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {months.map((month) => {
            const isCurrentMonth = isSameMonth(new Date(), month);
            const isPastMonth = month.getFullYear() < new Date().getFullYear() || (month.getFullYear() === new Date().getFullYear() && month.getMonth() < new Date().getMonth());

            return (
              <button
                key={month.toISOString()}
                disabled={isPastMonth}
                onClick={() => {
                  setCurrentDate(isCurrentMonth ? new Date() : month);
                  setView('week');
                }}
                className={`
                  flex flex-col items-center justify-center p-4 rounded-[16px] transition-all aspect-square border-2
                  ${isPastMonth ? 'opacity-50 cursor-not-allowed hover:bg-surface-container-lowest bg-surface-container-lowest text-on-surface-variant' : 'hover:-translate-y-1 hover:shadow-sm cursor-pointer'}
                  ${isCurrentMonth 
                    ? 'bg-[#f5e5d9] border-[#845326] text-[#845326]' 
                    : !isPastMonth ? 'bg-white border-[#EAE3DC] text-on-surface hover:border-[#F7D6BF]' : 'border-[#EAE3DC]'}
                `}
              >
                <span className="text-sm sm:text-base font-bold capitalize">
                  {format(month, 'MMMM', { locale: es })}
                </span>
                {isCurrentMonth && (
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Actual</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const applyRange = (dateStr: string, dayOfWeek: string, minIdx: number, maxIdx: number, action: 'add' | 'remove') => {
    if (action === 'add') {
      const newBlocks: Availability[] = [];
      for (let i = minIdx; i <= maxIdx; i++) {
        const slotTime = TIME_SLOTS[i];
        if (slotTime === '24:00') continue;
        
        const [h, m] = slotTime.split(':').map(Number);
        let endH = h;
        let endM = m + 5;
        if (endM >= 60) {
          endH += 1;
          endM -= 60;
        }
        const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

        newBlocks.push({
          date: dateStr,
          dayOfWeek: dayOfWeek,
          startTime: slotTime,
          endTime: endTimeStr,
          label: '',
          type: 'libre'
        });
      }

      setAvailabilities(prev => {
        const filtered = prev.filter(p => !newBlocks.some(n => n.date === p.date && n.startTime === p.startTime));
        return [...filtered, ...newBlocks];
      });
    } else {
      const timesToRemove = new Set<string>();
      for (let i = minIdx; i <= maxIdx; i++) {
        if (TIME_SLOTS[i] !== '24:00') {
          timesToRemove.add(TIME_SLOTS[i]);
        }
      }
      
      setAvailabilities(prev => prev.filter(a => !(a.date === dateStr && timesToRemove.has(a.startTime))));
    }
  };

  const handleCellClick = (dateStr: string, dayOfWeek: string, timeStr: string, isPast: boolean) => {
    if (isPast) return;

    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const isCollapsedHour = mStr === '00' && !expandedHours.includes(h);
    
    const clickStartIdx = TIME_SLOTS.indexOf(timeStr);
    const clickEndIdx = isCollapsedHour ? clickStartIdx + 11 : clickStartIdx;

    let exists = false;
    for (let i = clickStartIdx; i <= clickEndIdx; i++) {
       if (availabilities.some(a => a.date === dateStr && a.startTime === TIME_SLOTS[i])) {
         exists = true; break;
       }
    }

    if (!selectionStart) {
      setSelectionStart({ 
        date: dateStr, 
        time: timeStr, 
        action: exists ? 'remove' : 'add',
        isMacro: isCollapsedHour
      });
      setEditingCell(null);
    } else {
      if (selectionStart.date === dateStr && selectionStart.time === timeStr) {
        applyRange(dateStr, dayOfWeek, clickStartIdx, clickEndIdx, selectionStart.action);
        setSelectionStart(null);
        return;
      }

      if (selectionStart.date !== dateStr) {
        setSelectionStart({ 
          date: dateStr, 
          time: timeStr, 
          action: exists ? 'remove' : 'add',
          isMacro: isCollapsedHour
        });
        return;
      }

      const startIdxObj = TIME_SLOTS.indexOf(selectionStart.time);
      const startObjIsMacro = selectionStart.isMacro;
      
      const minIdx = Math.min(startIdxObj, clickStartIdx);
      let maxIdx = Math.max(startIdxObj, clickStartIdx);

      if (maxIdx === clickStartIdx && isCollapsedHour) maxIdx = clickEndIdx;
      if (maxIdx === startIdxObj && startObjIsMacro) maxIdx = startIdxObj + 11;

      applyRange(dateStr, dayOfWeek, minIdx, maxIdx, selectionStart.action);
      setSelectionStart(null);
    }
  };

  const handleEditLabel = (dateStr: string, timeStr: string, currentLabel: string, currentType: 'libre' | 'descanso' | 'trabajo', e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCell({ date: dateStr, time: timeStr });
    setEditLabel(currentLabel === 'Libre' ? '' : currentLabel);
    setEditType(currentType || 'libre');
  };

  const saveEditedLabel = () => {
    if (editingCell) {
      const isCollapsed = editingCell.time.endsWith(':00') && !expandedHours.includes(parseInt(editingCell.time.split(':')[0], 10));

      if (isCollapsed) {
        const startIdx = TIME_SLOTS.indexOf(editingCell.time);
        const hourTimes = new Set(TIME_SLOTS.slice(startIdx, startIdx + 12));
        
        setAvailabilities(prev => prev.map(a => 
          (a.date === editingCell.date && hourTimes.has(a.startTime))
            ? { ...a, label: editLabel.trim().substring(0, 15), type: editType }
            : a
        ));
      } else {
        setAvailabilities(prev => prev.map(a => 
          (a.date === editingCell.date && a.startTime === editingCell.time)
            ? { ...a, label: editLabel.trim().substring(0, 15), type: editType }
            : a
        ));
      }
    }
    setEditingCell(null);
  };

  const format12h = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    if (h === 24) return '12:00 AM';
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const endOfMonthFn = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const parseISO = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const generateFutureWeeks = (currentWeekStart: Date) => {
    const weeks = [];
    const endOfActiveYear = endOfYear(currentDate);
    let nextWeekStart = addDays(currentWeekStart, 7);

    while (nextWeekStart <= endOfActiveYear) {
      const nextWeekEnd = addDays(nextWeekStart, 6);
      const label = `${format(nextWeekStart, 'd MMM', { locale: es })} - ${format(nextWeekEnd, 'd MMM', { locale: es })}`;
      weeks.push({ start: nextWeekStart, end: nextWeekEnd, label });
      nextWeekStart = addDays(nextWeekStart, 7);
    }
    setFutureWeeksList(weeks);
  };

  const getWeeksUntil = (startNext: Date, limitDate: Date) => {
    const weeks = [];
    let current = startNext;
    while(current <= limitDate) {
      weeks.push(current);
      current = addDays(current, 7);
    }
    return weeks;
  };

  const replicateToWeeks = (weekStarts: Date[], startOfCurrentWeek: Date, endOfCurrentWeek: Date) => {
    const currentWeekDates = eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek }).map(d => format(d, 'yyyy-MM-dd'));
    const currentWeekAvails = availabilities.filter(a => currentWeekDates.includes(a.date));
    
    if (currentWeekAvails.length === 0) {
      alert("No hay disponibilidad marcada en esta semana para replicar.");
      return;
    }

    const newAvails: Availability[] = [];

    weekStarts.forEach(ws => {
      const targetWeekDates = eachDayOfInterval({ start: ws, end: addDays(ws, 6) }).map(d => format(d, 'yyyy-MM-dd'));
      currentWeekAvails.forEach(avail => {
         const dayIndex = currentWeekDates.indexOf(avail.date);
         if (dayIndex !== -1) {
           const targetDateStr = targetWeekDates[dayIndex];
           if (!isBefore(parseISO(targetDateStr), startOfDay(new Date()))) {
              newAvails.push({ ...avail, date: targetDateStr });
           }
         }
      });
    });

    setAvailabilities(prev => {
      const filtered = prev.filter(p => !newAvails.some(n => n.date === p.date && n.startTime === p.startTime));
      return [...filtered, ...newAvails];
    });

    setShowReplicateMenu(false);
    setShowSpecificWeeksModal(false);
    setSelectedWeeks([]);
    alert("¡Horario replicado con éxito!");
  };

  const renderWeeklyGrid = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    const selectionStartDayIndex = selectionStart ? days.findIndex(d => format(d, 'yyyy-MM-dd') === selectionStart.date) : -1;

    return (
      <div className="flex flex-col animate-in fade-in duration-300 w-full max-w-6xl mx-auto h-[calc(100vh-140px)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setView('month');
                setSelectionStart(null);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-bold text-on-surface-variant"
            >
              <ArrowLeft className="size-4" />
              Volver
            </button>
            <h2 className="text-xl sm:text-2xl font-bold capitalize text-on-surface hidden sm:block">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  generateFutureWeeks(start);
                  setShowReplicateMenu(!showReplicateMenu);
                }}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-[#f5e5d9] hover:bg-[#E8DCD1] text-[#845326] rounded-xl text-sm font-bold transition-colors shadow-sm mr-2"
                title="Copiar esta semana a otras fechas"
              >
                <Copy className="size-4" />
                Replicar Horario
              </button>

              {showReplicateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowReplicateMenu(false)} />
                  <div className="absolute top-full mt-2 right-2 w-64 bg-white border border-[#EAE3DC] rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button 
                      onClick={() => {
                        const endOfActiveMonth = endOfMonthFn(currentDate);
                        replicateToWeeks(getWeeksUntil(addDays(start, 7), endOfActiveMonth), start, end);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-[#845326] hover:bg-[#FDFBF9] border-b border-[#EAE3DC] font-semibold transition-colors"
                    >
                      Replicar en todo el mes
                    </button>
                    <button 
                      onClick={() => {
                        const endOfActiveYear = endOfYear(currentDate);
                        replicateToWeeks(getWeeksUntil(addDays(start, 7), endOfActiveYear), start, end);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-[#845326] hover:bg-[#FDFBF9] border-b border-[#EAE3DC] font-semibold transition-colors"
                    >
                      Replicar en todos los meses
                    </button>
                    <button 
                      onClick={() => {
                        setShowReplicateMenu(false);
                        setShowSpecificWeeksModal(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-[#845326] hover:bg-[#FDFBF9] font-semibold transition-colors"
                    >
                      Replicar en semanas específicas...
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 bg-white border border-[#EAE3DC] rounded-xl p-1 shadow-sm">
              <button onClick={goToPrevWeek} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface">
                <ChevronLeft className="size-5" />
              </button>
              <span className="px-2 text-xs sm:text-sm font-bold text-on-surface-variant capitalize">
                {format(start, 'd MMM', { locale: es })} - {format(end, 'd MMM', { locale: es })}
              </span>
              <button onClick={goToNextWeek} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Semanas Específicas */}
        {showSpecificWeeksModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-[#EAE3DC] flex items-center justify-between bg-[#FDFBF9]">
                <h3 className="text-lg font-bold text-[#845326]">Semanas Específicas</h3>
                <button onClick={() => { setShowSpecificWeeksModal(false); setSelectedWeeks([]); }} className="p-2 hover:bg-[#EAE3DC] rounded-full text-on-surface-variant transition-colors">
                  <X className="size-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[50vh] custom-scrollbar">
                <p className="text-sm text-on-surface-variant mb-4 font-medium">
                  Selecciona a qué semanas futuras quieres copiar tu disponibilidad actual:
                </p>
                <div className="flex flex-col gap-2">
                  {futureWeeksList.map((week) => (
                    <label key={week.label} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedWeeks.includes(week.label) ? 'border-[#845326] bg-[#f5e5d9]' : 'border-[#EAE3DC] hover:bg-[#FDFBF9]'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedWeeks.includes(week.label)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedWeeks(prev => [...prev, week.label]);
                          else setSelectedWeeks(prev => prev.filter(l => l !== week.label));
                        }}
                        className="w-5 h-5 accent-[#845326] rounded border-[#845326] focus:ring-[#845326] cursor-pointer"
                      />
                      <span className="text-sm font-bold text-[#845326]">Semana del {week.label}</span>
                    </label>
                  ))}
                  {futureWeeksList.length === 0 && (
                    <div className="text-center py-4 text-sm font-semibold text-on-surface-variant">
                      No hay semanas futuras disponibles en este año.
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-[#EAE3DC] bg-[#FDFBF9] flex justify-end gap-3">
                <button onClick={() => { setShowSpecificWeeksModal(false); setSelectedWeeks([]); }} className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-[#EAE3DC] transition-colors">
                  Cancelar
                </button>
                <button disabled={selectedWeeks.length === 0} onClick={() => {
                    const selectedWeekStarts = futureWeeksList.filter(w => selectedWeeks.includes(w.label)).map(w => w.start);
                    replicateToWeeks(selectedWeekStarts, start, end);
                  }} className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-[#845326] text-white hover:bg-[#6c421f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Check className="size-4" />
                  Aplicar Horario
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenedor del Grid */}
        <div className="flex-1 overflow-y-auto bg-white border border-[#EAE3DC] rounded-[20px] shadow-sm relative custom-scrollbar select-none" onMouseLeave={() => setHoveredTimeStr(null)}>
          <div className="sticky top-0 z-20 flex bg-surface-container-lowest border-b border-[#EAE3DC] shadow-sm">
            <div className="w-[100px] min-w-[100px] border-r border-[#EAE3DC] bg-surface-container-lowest"></div>
            <div className="flex-1 grid grid-cols-7 min-w-[500px]">
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                const dateStr = format(day, 'yyyy-MM-dd');
                const isPast = isBefore(day, startOfDay(new Date()));
                return (
                  <div key={dateStr} className={`flex flex-col items-center justify-center py-2 border-r border-[#EAE3DC] last:border-r-0 bg-surface-container-lowest ${isPast ? 'opacity-50' : ''}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 truncate px-1">
                      {format(day, 'EEE', { locale: es })}
                    </span>
                    <span className={`text-base font-black ${isToday ? 'bg-[#845326] text-white size-7 flex items-center justify-center rounded-full' : 'text-on-surface'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex relative pt-4 pb-4">
            <div className="sticky left-0 z-10 w-[100px] min-w-[100px] bg-white border-r border-[#EAE3DC] flex flex-col">
              {visibleTimeSlots.map((time) => {
                const isHourStart = time.endsWith(':00');
                const isHourEnd = time.endsWith(':55');
                const [, minuteStr] = time.split(':');
                const isActive = activeTimes.has(time);
                
                const isHovered = hoveredTimeStr === time;
                const isExtensionLine = selectionStart?.time === time;

                return (
                  <div 
                    key={`time-${time}`} 
                    className={`
                      h-[22px] relative flex justify-end items-center pr-3 group transition-colors cursor-default
                      ${isHourStart ? 'border-b border-[#EAE3DC]' : ''}
                      ${isHourEnd ? 'mb-3' : ''}
                      ${isHovered ? 'bg-[#f5e5d9]/60' : ''}
                      ${isExtensionLine ? 'bg-[#E8DCD1] border-t border-b border-[#845326]/30' : ''}
                    `}
                  >
                    {isHourStart ? (
                      <div className="flex items-center gap-1.5 z-10 rounded">
                        <span className={`text-[10px] ${isActive ? 'text-black font-extrabold' : 'text-[#845326] font-bold'} ${isExtensionLine ? 'text-black' : ''}`}>
                          {format12h(time)}
                        </span>
                        <button 
                          onClick={() => toggleHour(parseInt(time.split(':')[0], 10))}
                          className="p-0.5 hover:bg-[#EAE3DC] rounded-full text-[#845326] transition-colors"
                        >
                          {expandedHours.includes(parseInt(time.split(':')[0], 10)) ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronRight className="size-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[9px] leading-none z-10 ${isActive ? 'text-black font-extrabold' : 'text-[#845326]/60 font-medium'}`}>
                        {minuteStr}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 grid grid-cols-7 min-w-[500px]">
              {days.map((day, colIndex) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayOfWeek = format(day, 'EEEE', { locale: es });
                const isPast = isBefore(day, startOfDay(new Date()));
                
                const isBeforeOrEqualSelectionDay = colIndex <= selectionStartDayIndex;

                return (
                  <div key={`col-${dateStr}`} className={`flex flex-col border-r border-[#EAE3DC] last:border-r-0 bg-[#FDFBF9] ${isPast ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {visibleTimeSlots.map((timeStr) => {
                      const avail = availabilities.find(a => a.date === dateStr && a.startTime === timeStr);
                      const isEditing = editingCell?.date === dateStr && editingCell?.time === timeStr;
                      const isHourStart = timeStr.endsWith(':00');
                      const isHourEnd = timeStr.endsWith(':55');
                      
                      const isHoveredRow = hoveredTimeStr === timeStr;
                      const isSelectedAsStart = selectionStart?.date === dateStr && selectionStart?.time === timeStr;
                      const isExtensionLineCell = selectionStart?.time === timeStr && isBeforeOrEqualSelectionDay && !isSelectedAsStart;

                      const isStartAdd = isSelectedAsStart && selectionStart?.action === 'add';

                      const isCollapsedHour = timeStr.endsWith(':00') && !expandedHours.includes(parseInt(timeStr.split(':')[0], 10));
                      let macroAvailCount = 0;
                      let macroFirstAvail: Availability | undefined;
                      if (isCollapsedHour) {
                         const startIdx = TIME_SLOTS.indexOf(timeStr);
                         for(let i=startIdx; i<startIdx+12; i++) {
                           const found = availabilities.find(a => a.date === dateStr && a.startTime === TIME_SLOTS[i]);
                           if(found) {
                             macroAvailCount++;
                             if (!macroFirstAvail) macroFirstAvail = found;
                           }
                         }
                      }
                      
                      const effectiveAvail = isCollapsedHour ? macroFirstAvail : avail;
                      const currentType = effectiveAvail?.type || 'libre';
                      const colorTheme = COLOR_MAP[currentType];

                      const isMacroPartiallyOccupied = isCollapsedHour && macroAvailCount > 0 && macroAvailCount < 12;
                      const isOccupied = avail || (isCollapsedHour && macroAvailCount === 12);
                      const displayLabel = effectiveAvail?.label && effectiveAvail.label !== 'Libre' ? effectiveAvail.label : '';
                      
                      return (
                        <div 
                          key={`cell-${dateStr}-${timeStr}`} 
                          onMouseEnter={() => setHoveredTimeStr(timeStr)}
                          className={`
                            h-[22px] relative group transition-colors box-border
                            ${isHourStart ? 'border-b border-[#EAE3DC]' : 'border-b border-dashed border-[#EAE3DC]/40'}
                            ${isHourEnd ? 'mb-3' : ''}
                            ${isPast ? '' : 'cursor-pointer'}
                            ${isHoveredRow && !isOccupied && !isMacroPartiallyOccupied && !isSelectedAsStart ? 'bg-[#f5e5d9]/60' : ''}
                            ${!isPast && !isOccupied && !isMacroPartiallyOccupied && !isSelectedAsStart && !isHoveredRow ? 'hover:bg-[#E8DCD1]/30' : ''}
                            ${isOccupied && !isSelectedAsStart ? `${colorTheme.bg} ${colorTheme.hover}` : ''}
                            ${isMacroPartiallyOccupied && !isSelectedAsStart ? `${colorTheme.bgPale} hover:${colorTheme.bg} border-[1px] border-dashed ${colorTheme.border}` : ''}
                            ${isExtensionLineCell ? 'bg-[#E8DCD1]/80 border-t border-b border-[#845326]/30' : ''}
                          `}
                          onClick={() => handleCellClick(dateStr, dayOfWeek, timeStr, isPast)}
                        >
                          {isSelectedAsStart && (
                            <div className={`absolute inset-0 z-20 border-[2px] border-[#845326] shadow-sm ${isStartAdd ? 'bg-[#C8D6AF]' : 'bg-[#EAE3DC]'}`}></div>
                          )}

                          {(isOccupied || isMacroPartiallyOccupied) && !isEditing && (
                            <div className="absolute inset-0 flex items-center justify-between px-1 overflow-hidden pointer-events-none z-0">
                              <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 truncate leading-none pt-[1px] ${isMacroPartiallyOccupied ? colorTheme.text + '/60' : colorTheme.text}`}>
                                {displayLabel}
                              </span>
                              
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                                {!isPast && (
                                  <button 
                                    onClick={(e) => handleEditLabel(dateStr, timeStr, effectiveAvail!.label, currentType, e)}
                                    className={`p-0.5 bg-white/70 rounded hover:bg-white ${colorTheme.text} transition-colors`}
                                    title="Editar"
                                  >
                                    <Edit2 className="size-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {isEditing && !isPast && (
                            <div 
                              className="absolute top-0 left-0 z-[60] bg-white p-3 border border-[#EAE3DC] rounded-xl shadow-xl flex flex-col gap-3 min-w-[150px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                autoFocus
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditedLabel();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                maxLength={15}
                                className="w-full text-xs font-bold text-on-surface bg-[#FDFBF9] border border-[#EAE3DC] rounded-md p-1.5 focus:outline-none focus:border-[#845326]"
                                placeholder="Nota..."
                              />
                              <div className="flex gap-2 justify-center">
                                 <button onClick={() => setEditType('libre')} className={`w-6 h-6 rounded border ${editType === 'libre' ? 'border-[#845326] ring-2 ring-[#C8D6AF]/50' : 'border-[#EAE3DC]'} bg-[#C8D6AF]`} title="Libre"></button>
                                 <button onClick={() => setEditType('descanso')} className={`w-6 h-6 rounded border ${editType === 'descanso' ? 'border-[#845326] ring-2 ring-[#F9EBB2]/50' : 'border-[#EAE3DC]'} bg-[#F9EBB2]`} title="Descanso"></button>
                                 <button onClick={() => setEditType('trabajo')} className={`w-6 h-6 rounded border ${editType === 'trabajo' ? 'border-[#845326] ring-2 ring-[#F4C2BA]/50' : 'border-[#EAE3DC]'} bg-[#F4C2BA]`} title="Trabajo"></button>
                              </div>
                              <button onClick={saveEditedLabel} className="w-full bg-[#845326] text-white text-xs font-bold py-1.5 rounded-lg hover:bg-[#6c421f] transition-colors">
                                Guardar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LEYENDA VISUAL DE COLORES */}
        <div className="flex justify-center gap-6 mt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#C8D6AF] border border-[#3A4A28]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#F9EBB2] border border-[#5C4F1A]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Descanso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#F4C2BA] border border-[#6B3229]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Trabajo</span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="h-full w-full">
      {view === 'month' ? renderMonthlyGrid() : renderWeeklyGrid()}
    </div>
  );
}
