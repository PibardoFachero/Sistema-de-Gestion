'use client';

import React, { useState, useEffect } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfYear,
  eachMonthOfInterval,
  endOfYear,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  addDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  ArrowLeft,
  Copy,
  X,
  Check,
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  getCalendarDataAction,
  deleteCalendarEventAction,
} from '@/features/schedule/actions/calendarActions';

interface Availability {
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string;
  type?:
    'tareas' | 'descanso' | 'trabajo' | 'estudiando' | 'otra_actividad' | 'estudio' | 'ocupado';
  source?: 'google' | 'local' | 'supabase';
  eventId?: string;
}

const COLOR_MAP: Record<
  string,
  { bg: string; hover: string; text: string; border: string; bgPale: string }
> = {
  libre: {
    bg: 'bg-[#C8D6AF]',
    hover: 'hover:bg-[#B5C59A]',
    text: 'text-[#3A4A28]',
    border: 'border-[#3A4A28]/20',
    bgPale: 'bg-[#C8D6AF]/30',
  },
  tareas: {
    bg: 'bg-[#C8D6AF]',
    hover: 'hover:bg-[#B5C59A]',
    text: 'text-[#3A4A28]',
    border: 'border-[#3A4A28]/20',
    bgPale: 'bg-[#C8D6AF]/30',
  },
  estudiando: {
    bg: 'bg-[#BBD0F4]',
    hover: 'hover:bg-[#A4BFE6]',
    text: 'text-[#203D6B]',
    border: 'border-[#203D6B]/20',
    bgPale: 'bg-[#BBD0F4]/30',
  },
  estudio: {
    bg: 'bg-[#BBD0F4]',
    hover: 'hover:bg-[#A4BFE6]',
    text: 'text-[#203D6B]',
    border: 'border-[#203D6B]/20',
    bgPale: 'bg-[#BBD0F4]/30',
  },
  trabajo: {
    bg: 'bg-[#F4C2BA]',
    hover: 'hover:bg-[#E5B0A7]',
    text: 'text-[#6B3229]',
    border: 'border-[#6B3229]/20',
    bgPale: 'bg-[#F4C2BA]/30',
  },
  ocupado: {
    bg: 'bg-[#F4C2BA]',
    hover: 'hover:bg-[#E5B0A7]',
    text: 'text-[#6B3229]',
    border: 'border-[#6B3229]/20',
    bgPale: 'bg-[#F4C2BA]/30',
  },
  descanso: {
    bg: 'bg-[#F9EBB2]',
    hover: 'hover:bg-[#E8D9A0]',
    text: 'text-[#5C4F1A]',
    border: 'border-[#5C4F1A]/20',
    bgPale: 'bg-[#F9EBB2]/30',
  },
  otra_actividad: {
    bg: 'bg-[#E1C6F5]',
    hover: 'hover:bg-[#CFAEE8]',
    text: 'text-[#4A2D69]',
    border: 'border-[#4A2D69]/20',
    bgPale: 'bg-[#E1C6F5]/30',
  },
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
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map((a: Partial<Availability>) => {
              let t = a.type || 'tareas';
              if (t === 'estudio') t = 'estudiando';
              if (t === 'ocupado') t = 'trabajo';
              if ((t as string) === 'libre') t = 'tareas'; // backward compatibility
              if (a.source === 'supabase' || a.eventId || a.label?.startsWith('📌')) {
                t = 'tareas';
              }
              return { ...a, type: t } as Availability;
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [editingCell, setEditingCell] = useState<{ date: string; time: string } | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editType, setEditType] = useState<
    'tareas' | 'descanso' | 'trabajo' | 'estudiando' | 'otra_actividad'
  >('tareas');

  const [selectionStart, setSelectionStart] = useState<{
    date: string;
    time: string;
    action: 'add' | 'remove';
    isMacro: boolean;
  } | null>(null);

  const [expandedHours, setExpandedHours] = useState<number[]>([]);
  const [hoveredTimeStr, setHoveredTimeStr] = useState<string | null>(null);

  const [showReplicateMenu, setShowReplicateMenu] = useState(false);
  const [showSpecificWeeksModal, setShowSpecificWeeksModal] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [futureWeeksList, setFutureWeeksList] = useState<
    { start: Date; end: Date; label: string }[]
  >([]);

  // Estado para la subida y procesamiento de horario con IA
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('Analizando con Gemini...');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const loadCalendarEventsFromSupabase = React.useCallback(async () => {
    try {
      const res = await getCalendarDataAction();
      if (res.success && res.events && res.events.length > 0) {
        const dbEvents: Availability[] = [];
        res.events.forEach((ev) => {
          const startD = new Date(ev.inicio);
          const endD = new Date(ev.fin);
          if (isNaN(startD.getTime()) || isNaN(endD.getTime())) return;

          const dateStr = format(startD, 'yyyy-MM-dd');
          const dayOfWeekName = format(startD, 'EEEE', { locale: es });
          const startSlot = format(startD, 'HH:mm');
          const endSlot = format(endD, 'HH:mm');

          const startIdx = TIME_SLOTS.indexOf(startSlot);
          const endIdx = TIME_SLOTS.indexOf(endSlot);
          const fromIdx = startIdx !== -1 ? startIdx : 0;
          const toIdx =
            endIdx !== -1 && endIdx > fromIdx
              ? endIdx
              : fromIdx +
                Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (5 * 60 * 1000)));

          for (let i = fromIdx; i < toIdx; i++) {
            const slot = TIME_SLOTS[i];
            if (slot && slot !== '24:00') {
              dbEvents.push({
                date: dateStr,
                dayOfWeek: dayOfWeekName,
                startTime: slot,
                endTime: TIME_SLOTS[i + 1] || '24:00',
                label: `📌 ${ev.titulo}`,
                type: 'tareas',
                source: 'supabase',
                eventId: ev.id,
              });
            }
          }
        });

        if (dbEvents.length > 0) {
          setAvailabilities((prev) => {
            const nonSupabase = prev.filter((p) => p.source !== 'supabase' && !p.eventId);
            const keys = new Set(dbEvents.map((m) => `${m.date}_${m.startTime}`));
            const filteredNonSupabase = nonSupabase.filter(
              (p) => !keys.has(`${p.date}_${p.startTime}`),
            );
            return [...filteredNonSupabase, ...dbEvents];
          });
        }
      }
    } catch (err) {
      console.warn('Aviso cargando eventos de calendario:', err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('komorebi_availabilities');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.some((a: Availability) => a.source === 'google')) {
            setIsGoogleConnected(true);
          }
        }
      } catch (e) {
        console.error(e);
      }

      // Sincronizar estado real con la sesión / cookie segura de Google Calendar
      fetch('/api/auth/google?action=status')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.connected) {
            setIsGoogleConnected(true);
          }
        })
        .catch(() => {});

      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('gcal_success');
      const error = urlParams.get('gcal_error');

      if (success === 'true') {
        setIsGoogleConnected(true);
        setToastMessage({ type: 'success', text: 'Google Calendar sincronizado correctamente' });
        window.history.replaceState({}, document.title, window.location.pathname);

        // Mock de evento de Google Calendar para previsualizar el estilo
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        const tomorrowDay = format(tomorrow, 'EEEE', { locale: es });

        setAvailabilities((prev) => {
          if (prev.some((a) => a.source === 'google')) return prev;
          const mockEvents: Availability[] = [];
          for (let m = 0; m < 60; m += 5) {
            const mStr = m.toString().padStart(2, '0');
            const nmStr = m + 5 === 60 ? '00' : (m + 5).toString().padStart(2, '0');
            const h = 10 + (m + 5 === 60 ? 1 : 0);
            mockEvents.push({
              date: tomorrowStr,
              dayOfWeek: tomorrowDay,
              startTime: `10:${mStr}`,
              endTime: `${h.toString().padStart(2, '0')}:${nmStr}`,
              label: 'Reunión Sync',
              source: 'google',
            });
          }
          return [...prev, ...mockEvents];
        });
      } else if (error === 'true') {
        const errorDetail = urlParams.get('calendar_error');
        const decodedDetail = errorDetail ? decodeURIComponent(errorDetail) : null;
        setToastMessage({
          type: 'error',
          text: decodedDetail || 'Error al conectar con Google Calendar',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Cargar eventos del calendario y tareas programadas desde Supabase
      loadCalendarEventsFromSupabase();
    }
  }, [loadCalendarEventsFromSupabase]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleConnectGoogle = () => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/api/auth/google';
  };

  const handleDisconnectGoogle = () => {
    setIsGoogleConnected(false);
    setAvailabilities((prev) => prev.filter((a) => a.source !== 'google'));
    setToastMessage({ type: 'success', text: 'Google Calendar desconectado' });
  };

  const activeTimes = new Set(availabilities.map((a) => a.startTime));

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
    setExpandedHours((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
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
          <div className="relative z-10 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-[#845326] leading-tight">
              Si nos dices cuál es tu horario disponible podemos personalizar los planes de tu
              proyecto.
            </h2>
            <p className="text-[#A57855] text-sm mt-1 font-semibold">
              Selecciona un mes para configurar tus horas de estudio o trabajo.
            </p>
          </div>

          <div className="relative z-10 sm:ml-auto mt-4 sm:mt-0 w-full sm:w-auto min-h-[42px] flex items-center justify-end">
            {!isMounted ? null : !isGoogleConnected ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#5F6368] hover:bg-gray-50 border border-gray-200 rounded-xl font-semibold shadow-sm transition-all w-full sm:w-auto"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="truncate">Conectar Google Calendar</span>
              </button>
            ) : (
              <button
                onClick={handleDisconnectGoogle}
                className="group flex items-center justify-center gap-2 px-4 py-2 bg-[#E6F4EA] text-[#137333] hover:bg-[#FCE8E6] hover:text-[#C5221F] border border-[#CEEAD6] hover:border-[#FAD2CF] rounded-xl font-semibold shadow-sm transition-all w-full sm:w-auto"
              >
                <span className="group-hover:hidden flex items-center gap-2">
                  <Check className="size-4" /> Conectado a Google
                </span>
                <span className="hidden group-hover:flex items-center gap-2">
                  <X className="size-4" /> Desconectar
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-on-surface">{format(currentDate, 'yyyy')}</h3>
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
            const isPastMonth =
              month.getFullYear() < new Date().getFullYear() ||
              (month.getFullYear() === new Date().getFullYear() &&
                month.getMonth() < new Date().getMonth());

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
                  ${
                    isCurrentMonth
                      ? 'bg-[#f5e5d9] border-[#845326] text-[#845326]'
                      : !isPastMonth
                        ? 'bg-white border-[#EAE3DC] text-on-surface hover:border-[#F7D6BF]'
                        : 'border-[#EAE3DC]'
                  }
                `}
              >
                <span className="text-sm sm:text-base font-bold capitalize">
                  {format(month, 'MMMM', { locale: es })}
                </span>
                {isCurrentMonth && (
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">
                    Actual
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const compressImageForUpload = async (
    file: File,
  ): Promise<{ base64Data: string; mimeType: string }> => {
    if (file.type === 'application/pdf') {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(',');
          resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo PDF'));
        reader.readAsDataURL(file);
      });
      return { base64Data, mimeType: 'application/pdf' };
    }

    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 1600;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const idx = res.indexOf(',');
            resolve({
              base64Data: idx !== -1 ? res.substring(idx + 1) : res,
              mimeType: file.type || 'image/jpeg',
            });
          };
          reader.readAsDataURL(file);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const commaIdx = jpegDataUrl.indexOf(',');
        const base64Data = commaIdx !== -1 ? jpegDataUrl.substring(commaIdx + 1) : jpegDataUrl;

        resolve({ base64Data, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('No se pudo abrir la imagen para optimizarla'));
      };

      img.src = objectUrl;
    });
  };

  const handleProcessScheduleFile = async () => {
    if (!uploadFile) {
      setUploadError('Por favor selecciona una imagen o documento PDF con tu horario.');
      return;
    }

    setUploadLoading(true);
    setUploadStatusText('Optimizando documento/imagen...');
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const { base64Data, mimeType } = await compressImageForUpload(uploadFile);
      setUploadStatusText('Analizando horario con IA Gemini...');

      const res = await fetch('/api/calendar/extract-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          mimeType,
          guardarEnDisponibilidad: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar el horario');
      }

      if (data.bloques && data.bloques.length > 0) {
        // Calcular la semana activa actual
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({
          start,
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        });

        const mappedAvails: Availability[] = [];

        data.bloques.forEach(
          (b: {
            dia_semana: number;
            hora_inicio: string;
            hora_fin: string;
            tipo: string;
            etiqueta?: string;
          }) => {
            // Mapear dia_semana (0: Domingo, 1: Lunes.. 6: Sábado) al día correspondiente en la semana visible
            const targetDay = weekDays.find((d) => d.getDay() === b.dia_semana);
            if (!targetDay) return;

            const dateStr = format(targetDay, 'yyyy-MM-dd');
            const dayOfWeekName = format(targetDay, 'EEEE', { locale: es });

            // Normalizar horas al slot más cercano
            const startSlot =
              b.hora_inicio.length === 5 ? b.hora_inicio : `${b.hora_inicio.padStart(5, '0')}`;
            const endSlot = b.hora_fin.length === 5 ? b.hora_fin : `${b.hora_fin.padStart(5, '0')}`;

            const startIdx = TIME_SLOTS.indexOf(startSlot);
            const endIdx = TIME_SLOTS.indexOf(endSlot);

            const fromIdx = startIdx !== -1 ? startIdx : 0;
            const toIdx = endIdx !== -1 && endIdx > fromIdx ? endIdx : fromIdx + 12;

            let mappedType: 'tareas' | 'descanso' | 'trabajo' | 'estudiando' | 'otra_actividad' =
              'estudiando';
            const rawTipo = String(b.tipo || '').toLowerCase();
            if (
              rawTipo.includes('estudio') ||
              rawTipo.includes('estudiando') ||
              rawTipo.includes('clase')
            ) {
              mappedType = 'estudiando';
            } else if (
              rawTipo.includes('trabajo') ||
              rawTipo.includes('ocupado') ||
              rawTipo.includes('laboral')
            ) {
              mappedType = 'trabajo';
            } else if (rawTipo.includes('descanso') || rawTipo.includes('receso')) {
              mappedType = 'descanso';
            } else if (rawTipo.includes('libre') || rawTipo.includes('tareas')) {
              mappedType = 'tareas';
            } else {
              mappedType = 'otra_actividad';
            }

            for (let i = fromIdx; i < toIdx; i++) {
              const slot = TIME_SLOTS[i];
              if (slot && slot !== '24:00') {
                mappedAvails.push({
                  date: dateStr,
                  dayOfWeek: dayOfWeekName,
                  startTime: slot,
                  endTime: TIME_SLOTS[i + 1] || '24:00',
                  label: b.etiqueta || 'Clase/Actividad',
                  type: mappedType,
                });
              }
            }
          },
        );

        if (mappedAvails.length > 0) {
          setAvailabilities((prev) => {
            const keys = new Set(mappedAvails.map((m) => `${m.date}_${m.startTime}`));
            const filtered = prev.filter((p) => !keys.has(`${p.date}_${p.startTime}`));
            return [...filtered, ...mappedAvails];
          });
        }

        // Recargar eventos de Supabase para reflejar de inmediato tareas reagendadas por IA
        await loadCalendarEventsFromSupabase();

        const reagendadasCount = data.reagendamiento?.reagendadas || 0;
        if (reagendadasCount > 0) {
          setUploadSuccessMsg(
            `¡Se agregaron ${data.bloques.length} bloques a tu horario y la IA reagendó automáticamente ${reagendadasCount} tarea(s) para evitar colisiones!`,
          );
        } else {
          setUploadSuccessMsg(
            `¡Se detectaron y agregaron ${data.bloques.length} bloques a tu calendario con éxito!`,
          );
        }
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadSuccessMsg(null);
          setView('week');
        }, 2200);
      } else {
        setUploadError(
          'La IA no pudo detectar bloques de horario en el documento o imagen. Asegúrate de que las horas y días sean legibles.',
        );
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error inesperado extrayendo el horario');
    } finally {
      setUploadLoading(false);
    }
  };

  const applyRange = (
    dateStr: string,
    dayOfWeek: string,
    minIdx: number,
    maxIdx: number,
    action: 'add' | 'remove',
  ) => {
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
          type: 'tareas',
        });
      }

      setAvailabilities((prev) => {
        const filtered = prev.filter(
          (p) => !newBlocks.some((n) => n.date === p.date && n.startTime === p.startTime),
        );
        return [...filtered, ...newBlocks];
      });
    } else {
      const timesToRemove = new Set<string>();
      for (let i = minIdx; i <= maxIdx; i++) {
        if (TIME_SLOTS[i] !== '24:00') {
          timesToRemove.add(TIME_SLOTS[i]);
        }
      }

      setAvailabilities((prev) =>
        prev.filter((a) => !(a.date === dateStr && timesToRemove.has(a.startTime))),
      );
    }
  };

  const handleCellClick = (
    dateStr: string,
    dayOfWeek: string,
    timeStr: string,
    isPast: boolean,
  ) => {
    if (isPast) return;

    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const isCollapsedHour = mStr === '00' && !expandedHours.includes(h);

    const clickStartIdx = TIME_SLOTS.indexOf(timeStr);
    const clickEndIdx = isCollapsedHour ? clickStartIdx + 11 : clickStartIdx;

    let exists = false;
    let hasGoogle = false;
    for (let i = clickStartIdx; i <= clickEndIdx; i++) {
      const a = availabilities.find((a) => a.date === dateStr && a.startTime === TIME_SLOTS[i]);
      if (a) {
        if (a.source === 'google') hasGoogle = true;
        exists = true;
      }
    }

    if (hasGoogle) return; // Deshabilitar edición y selección para bloques de Google Calendar

    if (!selectionStart) {
      // Al hacer clic, simplemente seleccionar el bloque sin borrar su contenido ni categoría
      setSelectionStart({
        date: dateStr,
        time: timeStr,
        action: 'add',
        isMacro: isCollapsedHour,
      });
      setEditingCell(null);
    } else {
      if (selectionStart.date === dateStr && selectionStart.time === timeStr) {
        // Clic en el mismo bloque seleccionado: si existe, deseleccionar sin borrar nada
        if (exists) {
          setSelectionStart(null);
          return;
        }
        applyRange(dateStr, dayOfWeek, clickStartIdx, clickEndIdx, 'add');
        setSelectionStart(null);
        return;
      }

      if (selectionStart.date !== dateStr) {
        setSelectionStart({
          date: dateStr,
          time: timeStr,
          action: 'add',
          isMacro: isCollapsedHour,
        });
        return;
      }

      if (exists) {
        // Al hacer clic en otro bloque ya ocupado, mover la selección sin borrar nada
        setSelectionStart({
          date: dateStr,
          time: timeStr,
          action: 'add',
          isMacro: isCollapsedHour,
        });
        return;
      }

      const startIdxObj = TIME_SLOTS.indexOf(selectionStart.time);
      const startObjIsMacro = selectionStart.isMacro;

      const minIdx = Math.min(startIdxObj, clickStartIdx);
      let maxIdx = Math.max(startIdxObj, clickStartIdx);

      if (maxIdx === clickStartIdx && isCollapsedHour) maxIdx = clickEndIdx;
      if (maxIdx === startIdxObj && startObjIsMacro) maxIdx = startIdxObj + 11;

      applyRange(dateStr, dayOfWeek, minIdx, maxIdx, 'add');
      setSelectionStart(null);
    }
  };

  const handleDeleteBlock = (dateStr: string, timeStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const isCollapsedHour = mStr === '00' && !expandedHours.includes(h);

    const startIdx = TIME_SLOTS.indexOf(timeStr);
    const endIdx = isCollapsedHour ? startIdx + 11 : startIdx;

    const timesToRemove = new Set<string>();
    for (let i = startIdx; i <= endIdx; i++) {
      if (TIME_SLOTS[i] !== '24:00') {
        timesToRemove.add(TIME_SLOTS[i]);
      }
    }

    const removedEvents = availabilities.filter(
      (a) => a.date === dateStr && timesToRemove.has(a.startTime) && a.eventId,
    );

    setAvailabilities((prev) =>
      prev.filter((a) => !(a.date === dateStr && timesToRemove.has(a.startTime))),
    );

    if (removedEvents.length > 0) {
      for (const ev of removedEvents) {
        if (ev.eventId) {
          deleteCalendarEventAction(ev.eventId).catch((err) =>
            console.warn('Error eliminando evento en Supabase:', err),
          );
        }
      }
    }

    setSelectionStart(null);
    setToastMessage({ type: 'success', text: 'Bloque y categoría eliminados del calendario' });
  };

  const handleEditLabel = (
    dateStr: string,
    timeStr: string,
    currentLabel: string,
    currentType: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingCell({ date: dateStr, time: timeStr });
    setEditLabel(currentLabel === 'Tareas' || currentLabel === 'Libre' ? '' : currentLabel);
    let normalized: 'tareas' | 'descanso' | 'trabajo' | 'estudiando' | 'otra_actividad' = 'tareas';
    if (currentType === 'estudio' || currentType === 'estudiando') normalized = 'estudiando';
    else if (currentType === 'trabajo' || currentType === 'ocupado') normalized = 'trabajo';
    else if (currentType === 'descanso') normalized = 'descanso';
    else if (currentType === 'otra_actividad') normalized = 'otra_actividad';
    setEditType(normalized);
  };

  const saveEditedLabel = () => {
    if (editingCell) {
      const isCollapsed =
        editingCell.time.endsWith(':00') &&
        !expandedHours.includes(parseInt(editingCell.time.split(':')[0], 10));

      if (isCollapsed) {
        const startIdx = TIME_SLOTS.indexOf(editingCell.time);
        const hourTimes = new Set(TIME_SLOTS.slice(startIdx, startIdx + 12));

        setAvailabilities((prev) =>
          prev.map((a) =>
            a.date === editingCell.date && hourTimes.has(a.startTime)
              ? { ...a, label: editLabel.trim().substring(0, 15), type: editType }
              : a,
          ),
        );
      } else {
        setAvailabilities((prev) =>
          prev.map((a) =>
            a.date === editingCell.date && a.startTime === editingCell.time
              ? { ...a, label: editLabel.trim().substring(0, 15), type: editType }
              : a,
          ),
        );
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
    while (current <= limitDate) {
      weeks.push(current);
      current = addDays(current, 7);
    }
    return weeks;
  };

  const replicateToWeeks = (
    weekStarts: Date[],
    startOfCurrentWeek: Date,
    endOfCurrentWeek: Date,
  ) => {
    const currentWeekDates = eachDayOfInterval({
      start: startOfCurrentWeek,
      end: endOfCurrentWeek,
    }).map((d) => format(d, 'yyyy-MM-dd'));
    const currentWeekAvails = availabilities.filter((a) => currentWeekDates.includes(a.date));

    if (currentWeekAvails.length === 0) {
      alert('No hay disponibilidad marcada en esta semana para replicar.');
      return;
    }

    const newAvails: Availability[] = [];

    weekStarts.forEach((ws) => {
      const targetWeekDates = eachDayOfInterval({ start: ws, end: addDays(ws, 6) }).map((d) =>
        format(d, 'yyyy-MM-dd'),
      );
      currentWeekAvails.forEach((avail) => {
        const dayIndex = currentWeekDates.indexOf(avail.date);
        if (dayIndex !== -1) {
          const targetDateStr = targetWeekDates[dayIndex];
          if (!isBefore(parseISO(targetDateStr), startOfDay(new Date()))) {
            newAvails.push({ ...avail, date: targetDateStr });
          }
        }
      });
    });

    setAvailabilities((prev) => {
      const filtered = prev.filter(
        (p) => !newAvails.some((n) => n.date === p.date && n.startTime === p.startTime),
      );
      return [...filtered, ...newAvails];
    });

    setShowReplicateMenu(false);
    setShowSpecificWeeksModal(false);
    setSelectedWeeks([]);
    alert('¡Horario replicado con éxito!');
  };

  const renderWeeklyGrid = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const goToPrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

    const selectionStartDayIndex = selectionStart
      ? days.findIndex((d) => format(d, 'yyyy-MM-dd') === selectionStart.date)
      : -1;

    return (
      <div className="flex flex-col h-full w-full max-w-6xl mx-auto animate-in fade-in duration-300">
        {/* 1. CONTENEDOR MAESTRO DE SCROLL */}
        <div
          className="flex-grow overflow-y-auto custom-scrollbar select-none bg-white border border-[#EAE3DC] rounded-[20px] shadow-sm relative flex flex-col"
          style={{ height: 'calc(100vh - 120px)' }}
          onMouseLeave={() => setHoveredTimeStr(null)}
        >
          {/* 2. ENVOLTORIO STICKY UNIFICADO */}
          <div className="sticky top-0 z-[50] bg-[#FDFBF9] border-b border-[#EAE3DC] shadow-sm flex flex-col pt-4 shrink-0">
            {/* BOTONERA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-4 shrink-0">
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
                <button
                  onClick={() => {
                    setUploadFile(null);
                    setUploadError(null);
                    setUploadSuccessMsg(null);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-[#845326] hover:bg-[#6c421f] text-white rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  title="Subir imagen o PDF de tu horario para que la IA lo monte automáticamente"
                >
                  <Sparkles className="size-4 text-[#F7D6BF]" />
                  <span>Subir Horario (IA)</span>
                </button>

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
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowReplicateMenu(false)}
                      />
                      <div className="absolute top-full mt-2 right-2 w-64 bg-white border border-[#EAE3DC] rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          onClick={() => {
                            const endOfActiveMonth = endOfMonthFn(currentDate);
                            replicateToWeeks(
                              getWeeksUntil(addDays(start, 7), endOfActiveMonth),
                              start,
                              end,
                            );
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-[#845326] hover:bg-[#FDFBF9] border-b border-[#EAE3DC] font-semibold transition-colors"
                        >
                          Replicar en todo el mes
                        </button>
                        <button
                          onClick={() => {
                            const endOfActiveYear = endOfYear(currentDate);
                            replicateToWeeks(
                              getWeeksUntil(addDays(start, 7), endOfActiveYear),
                              start,
                              end,
                            );
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
                  <button
                    onClick={goToPrevWeek}
                    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="px-2 text-xs sm:text-sm font-bold text-on-surface-variant capitalize">
                    {format(start, 'd MMM', { locale: es })} -{' '}
                    {format(end, 'd MMM', { locale: es })}
                  </span>
                  <button
                    onClick={goToNextWeek}
                    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-on-surface"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* CABECERA DE DÍAS (Fila de días agrupada con la botonera) */}
            <div className="flex bg-[#FDFBF9]">
              <div className="w-[100px] min-w-[100px] border-r border-[#EAE3DC] bg-[#FDFBF9]"></div>
              <div className="flex-1 grid grid-cols-7 min-w-[500px]">
                {days.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isPast = isBefore(day, startOfDay(new Date()));
                  return (
                    <div
                      key={dateStr}
                      className={`flex flex-col items-center justify-center py-2 border-r border-[#EAE3DC] last:border-r-0 ${isPast ? 'opacity-50' : ''}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 truncate px-1">
                        {format(day, 'EEE', { locale: es })}
                      </span>
                      <span
                        className={`text-base font-black ${isToday ? 'bg-[#845326] text-white size-7 flex items-center justify-center rounded-full' : 'text-on-surface'}`}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Semanas Específicas */}
          {showSpecificWeeksModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-[#EAE3DC] flex items-center justify-between bg-[#FDFBF9]">
                  <h3 className="text-lg font-bold text-[#845326]">Semanas Específicas</h3>
                  <button
                    onClick={() => {
                      setShowSpecificWeeksModal(false);
                      setSelectedWeeks([]);
                    }}
                    className="p-2 hover:bg-[#EAE3DC] rounded-full text-on-surface-variant transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[50vh] custom-scrollbar">
                  <p className="text-sm text-on-surface-variant mb-4 font-medium">
                    Selecciona a qué semanas futuras quieres copiar tu disponibilidad actual:
                  </p>
                  <div className="flex flex-col gap-2">
                    {futureWeeksList.map((week) => (
                      <label
                        key={week.label}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedWeeks.includes(week.label) ? 'border-[#845326] bg-[#f5e5d9]' : 'border-[#EAE3DC] hover:bg-[#FDFBF9]'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWeeks.includes(week.label)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedWeeks((prev) => [...prev, week.label]);
                            else setSelectedWeeks((prev) => prev.filter((l) => l !== week.label));
                          }}
                          className="w-5 h-5 accent-[#845326] rounded border-[#845326] focus:ring-[#845326] cursor-pointer"
                        />
                        <span className="text-sm font-bold text-[#845326]">
                          Semana del {week.label}
                        </span>
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
                  <button
                    onClick={() => {
                      setShowSpecificWeeksModal(false);
                      setSelectedWeeks([]);
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-[#EAE3DC] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={selectedWeeks.length === 0}
                    onClick={() => {
                      const selectedWeekStarts = futureWeeksList
                        .filter((w) => selectedWeeks.includes(w.label))
                        .map((w) => w.start);
                      replicateToWeeks(selectedWeekStarts, start, end);
                    }}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-[#845326] text-white hover:bg-[#6c421f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="size-4" />
                    Aplicar Horario
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Subida de Horario con IA */}
          {showUploadModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-[#EAE3DC]">
                <div className="px-6 py-4 border-b border-[#EAE3DC] flex items-center justify-between bg-[#FDFBF9]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#f5e5d9] rounded-xl text-[#845326]">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-[#845326]">
                        Cargar Horario con Gemini AI
                      </h3>
                      <p className="text-xs text-on-surface-variant font-medium">
                        Extrae automáticamente tus materias o turnos
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!uploadLoading) {
                        setShowUploadModal(false);
                        setUploadFile(null);
                        setUploadError(null);
                      }
                    }}
                    disabled={uploadLoading}
                    className="p-2 hover:bg-[#EAE3DC] rounded-full text-on-surface-variant transition-colors disabled:opacity-40"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadSuccessMsg && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                      <Check className="size-4 shrink-0 text-green-600" />
                      <span>{uploadSuccessMsg}</span>
                    </div>
                  )}

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Sube una <strong>foto, captura de pantalla (.png, .jpg) o documento PDF</strong>{' '}
                    de tu horario escolar, universitario o laboral. La IA extraerá los días y
                    bloques horarios para que queden reflejados en tu calendario.
                  </p>

                  <div className="border-2 border-dashed border-[#E2D9D0] rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-[#FDFBF9] hover:bg-[#F5EFE9] transition-colors relative cursor-pointer">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf,image/*,application/pdf"
                      disabled={uploadLoading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFile(file);
                          setUploadError(null);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Upload className="size-8 text-[#845326] mb-2" />
                    <p className="text-sm font-bold text-[#2C1F14]">
                      {uploadFile ? uploadFile.name : 'Haz clic o arrastra tu archivo aquí'}
                    </p>
                    <p className="text-xs text-[#845326] mt-1 font-medium">
                      PNG, JPG, WEBP o PDF (Hasta 20MB)
                    </p>
                  </div>

                  {uploadFile && (
                    <div className="flex items-center justify-between p-2.5 px-3 bg-surface-container rounded-xl text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="size-4 text-[#845326] shrink-0" />
                        <span className="truncate font-semibold text-on-surface">
                          {uploadFile.name}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-medium shrink-0">
                          ({(uploadFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      {!uploadLoading && (
                        <button
                          type="button"
                          onClick={() => setUploadFile(null)}
                          className="text-red-500 hover:text-red-700 p-1 text-xs font-semibold"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 px-6 border-t border-[#EAE3DC] bg-[#FDFBF9] flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={uploadLoading}
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setUploadError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-[#EAE3DC] transition-colors disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!uploadFile || uploadLoading}
                    onClick={handleProcessScheduleFile}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-[#845326] text-white hover:bg-[#6c421f] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {uploadLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-white" />
                        <span>{uploadStatusText}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 text-[#F7D6BF]" />
                        <span>Procesar y Montar Horario</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. GRID DE HORAS (Contenido Desplazable) */}
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
                      ${isHourStart ? 'min-h-[48px]' : 'min-h-[32px]'} relative flex justify-end items-center pr-3 group transition-colors cursor-default
                      ${isHourStart ? 'border-b border-[#EAE3DC]' : ''}
                      ${isHourEnd ? 'mb-3' : ''}
                      ${isHovered ? 'bg-[#f5e5d9]/60' : ''}
                      ${isExtensionLine ? 'bg-[#E8DCD1] border-t border-b border-[#845326]/30' : ''}
                    `}
                  >
                    {isHourStart ? (
                      <div className="flex items-center gap-1.5 z-10 rounded">
                        <span
                          className={`text-[10px] ${isActive ? 'text-black font-extrabold' : 'text-[#845326] font-bold'} ${isExtensionLine ? 'text-black' : ''}`}
                        >
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
                      <span
                        className={`text-[9px] leading-none z-10 ${isActive ? 'text-black font-extrabold' : 'text-[#845326]/60 font-medium'}`}
                      >
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
                  <div
                    key={`col-${dateStr}`}
                    className={`flex flex-col border-r border-[#EAE3DC] last:border-r-0 bg-[#FDFBF9] ${isPast ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {visibleTimeSlots.map((timeStr) => {
                      const avail = availabilities.find(
                        (a) => a.date === dateStr && a.startTime === timeStr,
                      );
                      const isEditing =
                        editingCell?.date === dateStr && editingCell?.time === timeStr;
                      const isHourStart = timeStr.endsWith(':00');
                      const isHourEnd = timeStr.endsWith(':55');

                      const isHoveredRow = hoveredTimeStr === timeStr;
                      const isSelectedAsStart =
                        selectionStart?.date === dateStr && selectionStart?.time === timeStr;
                      const isExtensionLineCell =
                        selectionStart?.time === timeStr &&
                        isBeforeOrEqualSelectionDay &&
                        !isSelectedAsStart;

                      const isCollapsedHour =
                        timeStr.endsWith(':00') &&
                        !expandedHours.includes(parseInt(timeStr.split(':')[0], 10));
                      let macroAvailCount = 0;
                      let macroFirstAvail: Availability | undefined;
                      if (isCollapsedHour) {
                        const startIdx = TIME_SLOTS.indexOf(timeStr);
                        for (let i = startIdx; i < startIdx + 12; i++) {
                          const found = availabilities.find(
                            (a) => a.date === dateStr && a.startTime === TIME_SLOTS[i],
                          );
                          if (found) {
                            macroAvailCount++;
                            if (!macroFirstAvail) macroFirstAvail = found;
                          }
                        }
                      }

                      const effectiveAvail = isCollapsedHour ? macroFirstAvail : avail;
                      const isGoogleEvent = effectiveAvail?.source === 'google';
                      const currentType = effectiveAvail?.type || 'tareas';
                      const colorTheme = isGoogleEvent
                        ? {
                            bg: 'bg-[#F1F3F4]',
                            hover: 'hover:bg-[#E8EAED]',
                            text: 'text-[#5F6368]',
                            border: 'border-[#DADCE0]',
                            bgPale: 'bg-[#F1F3F4]/50',
                          }
                        : COLOR_MAP[currentType] || COLOR_MAP.tareas || COLOR_MAP.estudiando;
                      const isMacroPartiallyOccupied =
                        isCollapsedHour && macroAvailCount > 0 && macroAvailCount < 12;
                      const isOccupied = !!avail || (isCollapsedHour && macroAvailCount === 12);

                      const displayLabel = effectiveAvail?.label
                        ? effectiveAvail.label
                        : isGoogleEvent
                          ? 'Ocupado'
                          : effectiveAvail?.type === 'tareas'
                            ? 'Tareas'
                            : '';
                      return (
                        <div
                          key={`cell-${dateStr}-${timeStr}`}
                          onMouseEnter={() => setHoveredTimeStr(timeStr)}
                          className={`
                            ${isHourStart ? 'min-h-[48px]' : 'min-h-[32px]'} relative group transition-colors box-border
                            ${isHourStart ? 'border-b border-[#EAE3DC]' : 'border-b border-dashed border-[#EAE3DC]/40'}
                            ${isHourEnd ? 'mb-3' : ''}
                            ${isPast ? '' : 'cursor-pointer'}
                            ${isHoveredRow && !isOccupied && !isMacroPartiallyOccupied && !isSelectedAsStart ? 'bg-[#f5e5d9]/60' : ''}
                            ${isOccupied ? `${colorTheme.bg}` : ''}
                            ${isMacroPartiallyOccupied ? `${colorTheme.bgPale} border-[1px] border-dashed ${colorTheme.border}` : ''}
                            ${isExtensionLineCell ? 'bg-[#E8DCD1]/80 border-t border-b border-[#845326]/30' : ''}
                          `}
                          onClick={() => handleCellClick(dateStr, dayOfWeek, timeStr, isPast)}
                        >
                          {isSelectedAsStart && (
                            <div className="absolute inset-0 z-20 border-2 border-black bg-transparent pointer-events-none shadow-sm"></div>
                          )}

                          {(isOccupied || isMacroPartiallyOccupied) && !isEditing && (
                            <div className="absolute inset-0 flex items-center justify-between px-1 overflow-hidden pointer-events-none z-10">
                              <div className="flex items-center gap-1 overflow-hidden">
                                {isGoogleEvent && (
                                  <svg
                                    className="w-3 h-3 shrink-0 text-[#5F6368]"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      fill="currentColor"
                                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                      fill="currentColor"
                                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                      fill="currentColor"
                                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                      fill="currentColor"
                                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                  </svg>
                                )}
                                <span
                                  className={`text-[10px] font-bold truncate leading-none pt-[1px] ${isMacroPartiallyOccupied ? colorTheme.text + '/60' : colorTheme.text}`}
                                >
                                  {displayLabel}
                                </span>
                              </div>

                              {!isGoogleEvent && (
                                <div
                                  className={`flex items-center gap-1 ${isSelectedAsStart ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity pointer-events-auto`}
                                >
                                  {!isPast && (
                                    <>
                                      <button
                                        onClick={(e) => handleDeleteBlock(dateStr, timeStr, e)}
                                        className={`p-0.5 bg-white/80 rounded hover:bg-red-50 hover:text-red-600 ${colorTheme.text} transition-colors`}
                                        title="Borrar contenido y categoría del bloque"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                      <button
                                        onClick={(e) =>
                                          handleEditLabel(
                                            dateStr,
                                            timeStr,
                                            effectiveAvail!.label,
                                            currentType,
                                            e,
                                          )
                                        }
                                        className={`p-0.5 bg-white/70 rounded hover:bg-white ${colorTheme.text} transition-colors`}
                                        title="Editar"
                                      >
                                        <Edit2 className="size-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
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
                              <div className="flex gap-2 justify-center flex-wrap px-2">
                                <button
                                  onClick={() => setEditType('tareas')}
                                  className={`w-6 h-6 rounded border ${editType === 'tareas' ? 'border-[#845326] ring-2 ring-[#C8D6AF]/50' : 'border-[#EAE3DC]'} bg-[#C8D6AF]`}
                                  title="Tareas"
                                ></button>
                                <button
                                  onClick={() => setEditType('estudiando')}
                                  className={`w-6 h-6 rounded border ${editType === 'estudiando' ? 'border-[#845326] ring-2 ring-[#BBD0F4]/50' : 'border-[#EAE3DC]'} bg-[#BBD0F4]`}
                                  title="Estudiando"
                                ></button>
                                <button
                                  onClick={() => setEditType('trabajo')}
                                  className={`w-6 h-6 rounded border ${editType === 'trabajo' ? 'border-[#845326] ring-2 ring-[#F4C2BA]/50' : 'border-[#EAE3DC]'} bg-[#F4C2BA]`}
                                  title="Trabajo"
                                ></button>
                                <button
                                  onClick={() => setEditType('descanso')}
                                  className={`w-6 h-6 rounded border ${editType === 'descanso' ? 'border-[#845326] ring-2 ring-[#F9EBB2]/50' : 'border-[#EAE3DC]'} bg-[#F9EBB2]`}
                                  title="Descanso"
                                ></button>
                                <button
                                  onClick={() => setEditType('otra_actividad')}
                                  className={`w-6 h-6 rounded border ${editType === 'otra_actividad' ? 'border-[#845326] ring-2 ring-[#E1C6F5]/50' : 'border-[#EAE3DC]'} bg-[#E1C6F5]`}
                                  title="Otra actividad"
                                ></button>
                              </div>
                              <button
                                onClick={saveEditedLabel}
                                className="w-full bg-[#845326] text-white text-xs font-bold py-1.5 rounded-lg hover:bg-[#6c421f] transition-colors"
                              >
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
        <div className="flex-shrink-0 py-4 flex justify-center flex-wrap gap-x-6 gap-y-4 px-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-4 h-4 rounded bg-[#C8D6AF] border border-[#3A4A28]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Tareas</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-4 h-4 rounded bg-[#BBD0F4] border border-[#203D6B]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Estudiando</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-4 h-4 rounded bg-[#F4C2BA] border border-[#6B3229]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Trabajo</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-4 h-4 rounded bg-[#F9EBB2] border border-[#5C4F1A]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Descanso</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-4 h-4 rounded bg-[#E1C6F5] border border-[#4A2D69]/20"></div>
            <span className="text-xs font-bold text-[#845326]">Otra actividad</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full relative">
      {view === 'month' ? renderMonthlyGrid() : renderWeeklyGrid()}

      {toastMessage && (
        <div
          className={`fixed bottom-8 right-8 z-[100] px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toastMessage.type === 'success' ? 'bg-[#34A853] text-white' : 'bg-[#EA4335] text-white'
          }`}
        >
          <span className="font-bold text-sm">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
