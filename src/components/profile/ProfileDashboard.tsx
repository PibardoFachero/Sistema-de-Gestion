'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Check,
  ChevronDown,
  Edit3,
  Flame,
  GraduationCap,
  ImagePlus,
  Images,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { saveOnboardingAnswers, type OnboardingAnswersInput } from '@/features/onboarding/actions/saveOnboardingAction';
import { onboardingQuestions } from '@/features/onboarding/data/questions';
import { savePersonalContext } from '@/features/profile/actions/savePersonalContextAction';

export type ProfileDashboardData = {
  name: string;
  username: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  role?: string | null;
  age?: string | null;
  workSituation?: string | null;
  availability?: string | null;
  schedule?: string | null;
  methodology?: string | null;
  experience?: string | null;
  personalContext?: string | null;
  currentStreak?: number | null;
  bestStreak?: number | null;
  lastSignInAt?: string | null;
};

type EditableSection = 'identity' | 'learning' | null;

export function ProfileDashboard({ profile }: { profile: ProfileDashboardData }) {
  const router = useRouter();
  const [editingSection, setEditingSection] = useState<EditableSection>(null);
  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [personalContext, setPersonalContext] = useState(profile.personalContext ?? '');
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl ?? '');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [answers, setAnswers] = useState<OnboardingAnswersInput>({
    rol_condicion: profile.role ?? '',
    edad: profile.age ?? '',
    situacion_laboral: profile.workSituation ?? '',
    jornada_horarios: profile.schedule ?? '',
    tiempo_diario_min: profile.availability ?? '',
    metodologia: profile.methodology ?? '',
    experiencia: profile.experience ?? '',
  });
  const unknown = 'Aún no definido';

  function toggleEditing(section: Exclude<EditableSection, null>) {
    setSaveMessage(null);
    setSaveError(null);
    setEditingSection((current) => current === section ? null : section);
  }

  function updateAnswer(field: keyof OnboardingAnswersInput, value: string) {
    setAnswers((current) => ({ ...current, [field]: value }));
  }

  function selectAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('La imagen debe pesar menos de 5 MB.');
      return;
    }
    setAvatarError(null);
    setAvatarPreview(URL.createObjectURL(file));
    event.target.value = '';
  }

  function saveAnswers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage(null);
    setSaveError(null);
    startSaving(async () => {
      const [answersResult, contextResult] = await Promise.all([
        saveOnboardingAnswers(answers),
        savePersonalContext(personalContext),
      ]);
      if (!answersResult.success || !contextResult.success) {
        setSaveError(answersResult.error ?? contextResult.error ?? 'No fue posible guardar tus cambios.');
        return;
      }
      setSaveMessage('Tu información personal se guardó correctamente.');
      setEditingSection(null);
      router.refresh();
    });
  }

  return (
    <div className="relative isolate min-w-0 overflow-hidden py-1">
      <div className="pointer-events-none absolute -left-24 top-20 -z-10 size-64 rounded-full bg-accent-amber/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-[30rem] -z-10 size-72 rounded-full bg-primary/5 blur-3xl" />

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-amber">Espacio personal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Perfil</h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">Tu información de aprendizaje, organizada para que puedas ajustarla cuando la necesites.</p>
      </header>

      <div className="space-y-5">
        <WideSection title="Identidad y presencia" description="La información con la que te reconocemos dentro de Komorebi y las respuestas que orientan tu experiencia." icon={<Edit3 className="size-5" />} actionLabel={editingSection === 'identity' ? 'Cerrar edición' : 'Editar'} onAction={() => toggleEditing('identity')}>
          <div className="grid min-w-0 gap-6 lg:grid-cols-[auto_minmax(0,1fr)_15rem] lg:items-center">
            <div className="min-w-0">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-container-lowest text-2xl font-bold text-primary shadow-[0_10px_24px_-12px_rgba(74,53,37,0.35)]">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt={`Foto de perfil de ${profile.name}`} className="size-full object-cover" />
              ) : profile.initials}
              </div>
              {editingSection === 'identity' && <div className="mt-3 flex flex-wrap gap-2"><input ref={avatarInputRef} type="file" accept="image/*" onChange={selectAvatar} className="sr-only" /><Button type="button" variant="secondary" size="sm" className="min-h-10 gap-2" onClick={() => avatarInputRef.current?.click()}><ImagePlus className="size-3.5" />Subir imagen</Button><Button type="button" variant="secondary" size="sm" className="min-h-10 gap-2" onClick={() => setIsLibraryOpen((current) => !current)}><Images className="size-3.5" />Biblioteca</Button></div>}
              {editingSection === 'identity' && <p className="mt-2 max-w-56 text-xs leading-relaxed text-on-surface-variant">PNG, JPG o WebP, máximo 5 MB.</p>}
              {editingSection === 'identity' && avatarPreview !== (profile.avatarUrl ?? '') && <p className="mt-2 max-w-56 rounded-lg bg-status-attention-bg px-2 py-1.5 text-xs leading-relaxed text-status-attention">Vista previa lista. El guardado permanente se activará al conectar el almacenamiento de imágenes.</p>}
              {avatarError && <p role="alert" className="mt-2 max-w-56 text-xs leading-relaxed text-status-error">{avatarError}</p>}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold tracking-tight">{profile.name}</h2>
              <p className="mt-1 truncate text-sm text-on-surface-variant">@{profile.username}</p>
              {editingSection === 'identity' ? <label className="mt-4 block"><span className="text-xs font-semibold uppercase tracking-wide text-outline">Contexto personal</span><textarea value={personalContext} onChange={(event) => setPersonalContext(event.target.value)} maxLength={1000} rows={4} placeholder="Comparte objetivos, intereses o cualquier detalle que quieras tener presente." className="mt-2 block w-full resize-y rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm leading-relaxed text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20" /><span className="mt-1 block text-right text-xs text-outline">{personalContext.length}/1000</span></label> : personalContext ? <div className="mt-4 rounded-xl border border-primary/15 bg-surface-container-low px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Contexto personal</p><p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant">{personalContext}</p></div> : null}
            </div>
            <div className="grid grid-cols-1 gap-2 border-t border-outline-variant/40 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <CompactDetail label="Usuario" value={`@${profile.username}`} />
              <CompactDetail label="Rol actual" value={answers.rol_condicion || unknown} />
            </div>
          </div>
          <OnboardingAnswers
            answers={answers}
            fields={onboardingFields.slice(0, 3)}
            title="Información personal"
            description="Estas respuestas nos ayudan a reconocer tu punto de partida. Puedes modificarlas cuando quieras."
            editing={editingSection === 'identity'}
            isSaving={isSaving}
            saveError={saveError}
            saveMessage={saveMessage}
            unknown={unknown}
            onChange={updateAnswer}
            onSubmit={saveAnswers}
          />
          {editingSection === 'identity' && isLibraryOpen && <div className="mt-5 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-5"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Images className="size-5" /></div><div><p className="font-semibold">Biblioteca de avatares</p><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Aquí podrás elegir una imagen predeterminada cuando la biblioteca esté disponible. Por ahora puedes subir una imagen propia para ver cómo se verá tu perfil.</p></div></div></div>}
        </WideSection>

        <WideSection title="Perfil de aprendizaje" description="Las preferencias que nos ayudan a adaptar tu planificación y el acompañamiento." icon={<GraduationCap className="size-5" />} actionLabel={editingSection === 'learning' ? 'Cerrar edición' : 'Editar'} onAction={() => toggleEditing('learning')}>
          <OnboardingAnswers
            answers={answers}
            fields={onboardingFields.slice(3)}
            title="Preferencias de aprendizaje"
            description="Estas respuestas ayudan a adaptar la planificación y el acompañamiento a tu disponibilidad y experiencia."
            editing={editingSection === 'learning'}
            isSaving={isSaving}
            saveError={saveError}
            saveMessage={saveMessage}
            unknown={unknown}
            onChange={updateAnswer}
            onSubmit={saveAnswers}
          />
          <div className="mt-5 border-t border-outline-variant/40 pt-5">
            <p className="text-sm font-semibold">Información que podrás complementar</p>
            <div className="mt-3 flex flex-wrap gap-2"><FutureField label="Objetivo principal" /><FutureField label="Ritmo preferido" /><FutureField label="Dificultades habituales" /><FutureField label="Áreas prioritarias" /></div>
          </div>
          {editingSection === 'learning' && <EditingHint section="aprendizaje" />}
        </WideSection>

        <WideSection title="Mi espacio de aprendizaje" description="La conexión entre tu perfil, tus temas, proyectos y el contexto que autorizas para la IA." icon={<Sparkles className="size-5" />}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_15rem]">
            <Link href="/temas" className="group rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/80 p-4 shadow-sm transition-colors hover:border-primary/35 hover:bg-surface-container-low">
              <div className="flex items-start justify-between gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></div><ArrowUpRight className="size-4 text-outline transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" /></div>
              <h3 className="mt-5 font-bold">Temas</h3><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Organiza notas y fuentes para reutilizarlas en tus proyectos.</p>
            </Link>
            <Link href="/proyectos" className="group rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/80 p-4 shadow-sm transition-colors hover:border-primary/35 hover:bg-surface-container-low">
              <div className="flex items-start justify-between gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target className="size-5" /></div><ArrowUpRight className="size-4 text-outline transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" /></div>
              <h3 className="mt-5 font-bold">Proyectos</h3><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">Mantén una vista clara de lo que estás construyendo.</p>
            </Link>
            <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-primary"><Flame className="size-4 text-accent-amber" />Constancia</div>
              <div className="mt-5 space-y-3"><Streak value={`${profile.currentStreak ?? 0} días`} label="Racha actual" /><Streak value={`${profile.bestStreak ?? 0} días`} label="Mejor racha" /></div>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-primary/15 bg-surface-container-low px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-sm font-bold">Contexto bajo tu control</p><p className="mt-1 text-sm text-on-surface-variant">La IA solo usará fuentes de Temas y Proyectos que decidas incluir.</p></div></div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface-variant"><Mail className="size-3.5" />{formatDate(profile.lastSignInAt)}</span>
          </div>
        </WideSection>
      </div>
    </div>
  );
}

const onboardingFields: Array<{ field: keyof OnboardingAnswersInput; questionId: number }> = [
  { field: 'rol_condicion', questionId: 1 },
  { field: 'edad', questionId: 2 },
  { field: 'situacion_laboral', questionId: 3 },
  { field: 'jornada_horarios', questionId: 4 },
  { field: 'tiempo_diario_min', questionId: 5 },
  { field: 'metodologia', questionId: 6 },
  { field: 'experiencia', questionId: 7 },
];

function OnboardingAnswers({ answers, fields, title, description, editing, isSaving, saveError, saveMessage, unknown, onChange, onSubmit }: {
  answers: OnboardingAnswersInput;
  fields: Array<{ field: keyof OnboardingAnswersInput; questionId: number }>;
  title: string;
  description: string;
  editing: boolean;
  isSaving: boolean;
  saveError: string | null;
  saveMessage: string | null;
  unknown: string;
  onChange: (field: keyof OnboardingAnswersInput, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="mt-6 border-t border-outline-variant/40 pt-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div><h3 className="text-base font-bold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{description}</p></div>
        <span className="w-fit shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{fields.length} respuestas</span>
      </div>

      {editing ? (
        <form className="mt-5" onSubmit={onSubmit}>
          <div className="grid min-w-0 gap-3">
            {fields.map(({ field, questionId }) => {
              const item = onboardingQuestions.find((question) => question.id === questionId);
              if (!item) return null;
              return <div key={field} className="min-w-0 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4"><p className="text-sm font-semibold leading-snug">{item.question}</p><AnswerPicker value={answers[field]} options={item.options} onChange={(value) => onChange(field, value)} /></div>;
            })}
          </div>
          {saveError && <p role="alert" className="mt-4 rounded-xl border border-status-error/30 bg-status-error-bg px-4 py-3 text-sm text-status-error">{saveError}</p>}
          <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant/40 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-relaxed text-on-surface-variant">Todos los campos son necesarios para guardar los cambios.</p><Button type="submit" disabled={isSaving} className="min-h-11 gap-2 sm:self-auto">{isSaving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{isSaving ? 'Guardando...' : 'Guardar respuestas'}</Button></div>
        </form>
      ) : (
        <div className="mt-5 grid min-w-0 gap-3">
          {fields.map(({ field, questionId }) => {
            const item = onboardingQuestions.find((question) => question.id === questionId);
            if (!item) return null;
            return <div key={field} className="min-w-0 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/75 p-4"><p className="text-xs font-semibold leading-snug text-on-surface-variant">{item.question}</p><p className="mt-2 break-words text-sm font-bold leading-relaxed">{answers[field] || unknown}</p></div>;
          })}
        </div>
      )}
      {saveMessage && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-status-success/30 bg-status-success-bg px-4 py-3 text-sm text-status-success"><CheckCircle2 className="size-4 shrink-0" />{saveMessage}</p>}
    </div>
  );
}

function AnswerPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = value || 'Selecciona una opción';

  return <div className="relative mt-3"><button type="button" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-left text-sm font-medium transition-colors hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/20"><span className={value ? 'min-w-0 break-words text-on-surface' : 'text-on-surface-variant'}>{selected}</span><ChevronDown className={`size-4 shrink-0 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && <div role="listbox" aria-label="Opciones de respuesta" className="mt-2 grid max-h-72 gap-1 overflow-y-auto rounded-xl border border-primary/20 bg-surface-container-lowest p-2 shadow-[0_16px_34px_-18px_rgba(74,53,37,0.45)]"><p className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-outline">Elige una respuesta</p>{options.map((option) => { const isSelected = option === value; return <button key={option} type="button" role="option" aria-selected={isSelected} onClick={() => { onChange(option); setIsOpen(false); }} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm leading-snug transition-colors ${isSelected ? 'bg-primary/10 font-semibold text-primary' : 'text-on-surface hover:bg-surface-container-low'}`}><span>{option}</span>{isSelected && <Check className="size-4 shrink-0" />}</button>; })}</div>}</div>;
}

function WideSection({ title, description, icon, actionLabel, onAction, children }: { title: string; description: string; icon: React.ReactNode; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
  return <Card className="max-w-full border-outline-variant/60 bg-surface-container-lowest/75 p-5 shadow-[0_10px_30px_-18px_rgba(74,53,37,0.3)] backdrop-blur-sm sm:p-6"><div className="mb-6 flex flex-col gap-3 border-b border-outline-variant/40 pb-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-on-surface-variant">{description}</p></div></div>{actionLabel && onAction && <Button type="button" variant="secondary" size="sm" className="min-h-10 w-fit gap-2 self-start" onClick={onAction}><Edit3 className="size-3.5" />{actionLabel}</Button>}</div>{children}</Card>;
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-outline">{label}</p><p className="mt-1 truncate text-sm font-semibold">{value}</p></div>;
}

function LearningFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0 p-4"><div className="flex items-center gap-2 text-outline">{icon}<p className="text-xs font-semibold">{label}</p></div><p className="mt-3 truncate text-sm font-bold text-on-surface">{value}</p></div>;
}

function FutureField({ label }: { label: string }) {
  return <span className="rounded-full border border-dashed border-outline-variant/70 bg-surface px-3 py-2 text-xs font-semibold text-on-surface-variant">+ {label}</span>;
}

function EditingHint({ section }: { section: string }) {
  return <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-surface-container-low px-4 py-4"><Edit3 className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-sm leading-relaxed text-on-surface-variant">La edición de {section} se conectará al perfil persistente cuando definamos los campos y la validación correspondientes.</p></div>;
}

function Streak({ value, label }: { value: string; label: string }) {
  return <div><p className="text-lg font-bold">{value}</p><p className="text-xs text-on-surface-variant">{label}</p></div>;
}

function formatDate(value?: string | null) {
  if (!value) return 'Aún sin actividad';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Aún sin actividad';
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short' }).format(date);
}
