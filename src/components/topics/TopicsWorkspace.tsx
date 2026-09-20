'use client';

import { ChangeEvent, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  FileText,
  FolderKanban,
  FolderOpen,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

type SourceStatus = 'ready' | 'processing' | 'pending';

type TopicSource = {
  id: string;
  title: string;
  kind: 'Nota' | 'Archivo' | 'Enlace';
  detail: string;
  status: SourceStatus;
  enabledForAi: boolean;
};

type LinkedProject = {
  id: string;
  name: string;
  detail: string;
  progress: number;
};

type Topic = {
  id: string;
  name: string;
  description: string;
  lastEdited: string;
  note: string;
  sources: TopicSource[];
  projects: LinkedProject[];
};

const initialTopics: Topic[] = [
  {
    id: 'python',
    name: 'Aprender Python',
    description: 'Fundamentos, ejercicios y recursos para avanzar desde cero.',
    lastEdited: 'Editado hoy',
    note: 'Quiero construir una base sólida en Python antes de profundizar en backend. Me sirve aprender con ejercicios pequeños, repasar lo que no entienda y mantener un ritmo sostenible durante la semana.',
    sources: [
      { id: 'python-note', title: 'Objetivos de aprendizaje', kind: 'Nota', detail: 'Editado hoy', status: 'ready', enabledForAi: true },
      { id: 'python-guide', title: 'Guía de listas y diccionarios.pdf', kind: 'Archivo', detail: 'PDF · 1,8 MB', status: 'ready', enabledForAi: true },
      { id: 'python-docs', title: 'Documentación oficial de Python', kind: 'Enlace', detail: 'Referencia externa', status: 'pending', enabledForAi: false },
    ],
    projects: [
      { id: 'project-python', name: 'Aprender Python desde cero', detail: 'Proyecto activo', progress: 42 },
    ],
  },
  {
    id: 'backend',
    name: 'Backend y APIs',
    description: 'Notas sobre servidores, rutas, bases de datos y servicios.',
    lastEdited: 'Editado ayer',
    note: 'Este tema reunirá conceptos de APIs, autenticación y persistencia para apoyar mis próximos proyectos.',
    sources: [
      { id: 'backend-note', title: 'Mapa de conceptos', kind: 'Nota', detail: 'Editado ayer', status: 'ready', enabledForAi: true },
      { id: 'backend-roadmap', title: 'Ruta de estudio backend.docx', kind: 'Archivo', detail: 'DOCX · 420 KB', status: 'processing', enabledForAi: false },
    ],
    projects: [
      { id: 'project-backend', name: 'Construir mi primer backend', detail: 'Proyecto en planificación', progress: 18 },
    ],
  },
  {
    id: 'japanese',
    name: 'Japonés',
    description: 'Vocabulario, práctica y materiales para estudiar el idioma.',
    lastEdited: 'Sin actividad reciente',
    note: '',
    sources: [],
    projects: [],
  },
];

const statusCopy: Record<SourceStatus, { label: string; className: string }> = {
  ready: { label: 'Lista para IA', className: 'bg-status-success-bg text-status-success' },
  processing: { label: 'Procesando', className: 'bg-status-attention-bg text-status-attention' },
  pending: { label: 'Pendiente', className: 'bg-surface-container-high text-on-surface-variant' },
};

export function TopicsWorkspace() {
  const [topics, setTopics] = useState(initialTopics);
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopics[0].id);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState(initialTopics[0].note);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId) ?? topics[0];
  const filteredTopics = topics.filter((topic) => topic.name.toLowerCase().includes(search.toLowerCase()));
  const activeSourceCount = selectedTopic.sources.filter((source) => source.enabledForAi).length;

  function selectTopic(topic: Topic) {
    setSelectedTopicId(topic.id);
    setNote(topic.note);
    setIsAddingLink(false);
  }

  function updateSelectedTopic(update: (topic: Topic) => Topic) {
    setTopics((current) => current.map((topic) => (topic.id === selectedTopic.id ? update(topic) : topic)));
  }

  function saveNote() {
    updateSelectedTopic((topic) => ({ ...topic, note, lastEdited: 'Cambios preparados ahora' }));
  }

  function createTopic() {
    const id = `topic-${Date.now()}`;
    const topic: Topic = {
      id,
      name: 'Tema sin título',
      description: 'Describe el enfoque de este tema.',
      lastEdited: 'Creado ahora',
      note: '',
      sources: [],
      projects: [],
    };
    setTopics((current) => [topic, ...current]);
    setSelectedTopicId(id);
    setNote('');
  }

  function toggleSource(sourceId: string) {
    updateSelectedTopic((topic) => ({
      ...topic,
      sources: topic.sources.map((source) => source.id === sourceId ? { ...source, enabledForAi: !source.enabledForAi } : source),
    }));
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    updateSelectedTopic((topic) => ({
      ...topic,
      sources: [
        ...topic.sources,
        ...files.map((file) => ({
          id: `file-${file.name}-${Date.now()}`,
          title: file.name,
          kind: 'Archivo' as const,
          detail: `${file.type || 'Archivo'} · ${formatFileSize(file.size)}`,
          status: 'processing' as const,
          enabledForAi: false,
        })),
      ],
    }));
    event.target.value = '';
  }

  function addLink() {
    const url = linkValue.trim();
    if (!url) return;
    updateSelectedTopic((topic) => ({
      ...topic,
      sources: [
        ...topic.sources,
        { id: `link-${Date.now()}`, title: url, kind: 'Enlace', detail: 'Pendiente de validar', status: 'pending', enabledForAi: false },
      ],
    }));
    setLinkValue('');
    setIsAddingLink(false);
  }

  function linkProject() {
    const availableProjects = [
      { id: 'project-python', name: 'Aprender Python desde cero', detail: 'Proyecto activo', progress: 42 },
      { id: 'project-backend', name: 'Construir mi primer backend', detail: 'Proyecto en planificación', progress: 18 },
      { id: 'project-japanese', name: 'Rutina de japonés', detail: 'Proyecto activo', progress: 25 },
    ];
    const nextProject = availableProjects.find((project) => !selectedTopic.projects.some((linked) => linked.id === project.id));
    if (!nextProject) return;
    updateSelectedTopic((topic) => ({ ...topic, projects: [...topic.projects, nextProject] }));
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden animate-in fade-in duration-500 xl:-mx-4">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary"><BookOpen className="size-4" /></span>
            Biblioteca personal
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Temas</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">Reúne notas y fuentes que luego podrás activar como contexto para la IA o vincular a un proyecto.</p>
        </div>
        <Button type="button" className="min-h-11 shrink-0 gap-2 self-start" onClick={createTopic}><Plus className="size-4" />Nuevo tema</Button>
      </header>

      <div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="min-w-0 max-w-full space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-outline" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar temas" className="w-full rounded-xl border border-outline-variant/50 bg-surface px-9 py-2.5 text-sm outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10" />
          </div>
          <div className="grid w-full grid-cols-1 gap-2 xl:block xl:space-y-1.5">
            {filteredTopics.map((topic) => {
              const isSelected = selectedTopic.id === topic.id;
              const enabled = topic.sources.filter((source) => source.enabledForAi).length;
              return <button key={topic.id} type="button" onClick={() => selectTopic(topic)} className={cn('w-full min-w-0 max-w-full rounded-2xl border p-3.5 text-left shadow-sm transition-colors', isSelected ? 'border-primary/40 bg-surface-container-high ring-1 ring-primary/10' : 'border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low')}>
                <div className="flex items-start justify-between gap-3"><span className="line-clamp-1 text-sm font-bold">{topic.name}</span>{enabled > 0 && <Sparkles className="size-4 shrink-0 text-accent-amber" />}</div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">{topic.description}</p>
                <p className="mt-3 text-[11px] font-medium text-outline">{topic.sources.length} fuentes · {topic.lastEdited}</p>
              </button>;
            })}
          </div>
        </aside>

        <section className="min-w-0 max-w-full space-y-5">
          <Card className="max-w-full overflow-hidden border-outline-variant/60 p-0 shadow-[0_6px_22px_-8px_rgba(74,53,37,0.2)]">
            <div className="border-b border-outline-variant/30 px-5 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-accent-amber">Tema seleccionado</p><h2 className="mt-1 truncate text-2xl font-bold tracking-tight">{selectedTopic.name}</h2><p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{selectedTopic.description}</p><div className="mt-4 grid grid-cols-3 divide-x divide-outline-variant/60 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"><TopicMetric value={selectedTopic.sources.length} label="Fuentes" /><TopicMetric value={activeSourceCount} label="En contexto" /><TopicMetric value={selectedTopic.lastEdited.replace('Editado ', '')} label="Actualizado" compact /></div></div>
                <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-status-success-bg px-3 py-1.5 text-xs font-semibold text-status-success"><CheckCircle2 className="size-3.5" />{activeSourceCount} activas</span>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="font-bold">Nota principal</h3><p className="mt-1 text-xs text-on-surface-variant">Resume lo que quieres conservar de este tema.</p></div><FileText className="size-5 text-outline" /></div>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Escribe una nota para este tema..." rows={7} className="block w-full max-w-full resize-y rounded-xl border border-outline-variant/70 bg-surface p-4 text-sm leading-relaxed shadow-inner outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/15" />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs text-outline">El guardado se conectará a tu biblioteca cuando esté disponible.</span><Button type="button" size="sm" className="min-h-10 self-end sm:self-auto" onClick={saveNote}>Preparar cambios</Button></div>
              </div>
              <div className="border-t border-outline-variant/30 bg-surface-container-low p-4 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2 text-sm font-bold text-primary"><Sparkles className="size-4" />Contexto para IA</div>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">La IA solo utilizará las fuentes que actives aquí.</p>
                <div className="mt-5 rounded-xl border border-primary/10 bg-surface p-3"><p className="text-xs font-semibold">Chat contextual</p><p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">Disponible cuando conectemos el asistente a las fuentes de este tema.</p><button type="button" disabled className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-outline"><ArrowUpRight className="size-3.5" />Pendiente de conexión</button></div>
              </div>
            </div>
          </Card>

          <Card className="max-w-full border-outline-variant/60 p-5 shadow-[0_6px_22px_-8px_rgba(74,53,37,0.16)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-bold">Fuentes</h3><p className="mt-1 text-sm text-on-surface-variant">Notas, archivos y enlaces que pertenecen a este tema.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" className="min-h-10 gap-2" onClick={() => { updateSelectedTopic((topic) => ({ ...topic, sources: [...topic.sources, { id: `note-${Date.now()}`, title: 'Nota sin título', kind: 'Nota', detail: 'Creada ahora', status: 'ready', enabledForAi: false }] })); }}><FileText className="size-3.5" />Escribir nota</Button><Button type="button" variant="secondary" size="sm" className="min-h-10 gap-2" onClick={() => fileInputRef.current?.click()}><Upload className="size-3.5" />Subir archivo</Button></div></div>
            <input ref={fileInputRef} type="file" multiple className="sr-only" onChange={handleFileSelection} accept=".pdf,.doc,.docx,.txt,.md" />

            <div className="mt-5 space-y-2">
              {selectedTopic.sources.length === 0 ? <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/40 px-5 py-10 text-center"><FolderOpen className="mx-auto size-7 text-outline" /><p className="mt-3 text-sm font-semibold">Aún no hay fuentes</p><p className="mt-1 text-xs text-on-surface-variant">Escribe una nota o sube un archivo para comenzar.</p></div> : selectedTopic.sources.map((source) => <SourceRow key={source.id} source={source} onToggle={() => toggleSource(source.id)} />)}
            </div>

            {isAddingLink ? <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3"><Link2 className="mt-2 size-4 shrink-0 text-outline" /><input autoFocus value={linkValue} onChange={(event) => setLinkValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addLink(); }} placeholder="https://..." className="min-w-0 basis-[calc(100%-2rem)] flex-1 bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-outline sm:min-w-[12rem] sm:basis-auto" /><button type="button" onClick={addLink} className="min-h-10 px-2 text-xs font-bold text-primary">Añadir</button><button type="button" onClick={() => setIsAddingLink(false)} className="flex size-10 items-center justify-center text-outline" aria-label="Cancelar"><X className="size-4" /></button></div> : <button type="button" onClick={() => setIsAddingLink(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:text-primary-container"><Link2 className="size-4" />Añadir enlace</button>}
          </Card>

          <Card className="max-w-full border-outline-variant/60 p-5 shadow-[0_6px_22px_-8px_rgba(74,53,37,0.16)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-bold">Proyectos vinculados</h3><p className="mt-1 text-sm text-on-surface-variant">Los proyectos conectados podrán usar este tema como fuente de contexto.</p></div><Button type="button" variant="secondary" size="sm" className="min-h-10 w-fit gap-2" onClick={linkProject}><Plus className="size-3.5" />Vincular proyecto</Button></div>
            {selectedTopic.projects.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/40 px-4 py-6 text-center"><FolderKanban className="mx-auto size-6 text-outline" /><p className="mt-2 text-sm font-semibold">Este tema aún no está vinculado</p><p className="mt-1 text-xs text-on-surface-variant">Vincúlalo a un proyecto para reutilizar sus fuentes.</p></div> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{selectedTopic.projects.map((project) => <ProjectLinkCard key={project.id} project={project} />)}</div>}
          </Card>
        </section>
      </div>
    </div>
  );
}

function SourceRow({ source, onToggle }: { source: TopicSource; onToggle: () => void }) {
  const status = statusCopy[source.status];
  return <div className="flex min-w-0 max-w-full flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">{source.kind === 'Enlace' ? <Link2 className="size-4" /> : <FileText className="size-4" />}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{source.title}</p><p className="mt-0.5 truncate text-xs text-on-surface-variant">{source.kind} · {source.detail}</p></div></div><div className="flex max-w-full flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end"><span className={cn('rounded-full px-2.5 py-1.5 text-[11px] font-semibold', status.className)}>{status.label}</span><button type="button" onClick={onToggle} disabled={source.status !== 'ready'} className={cn('min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', source.enabledForAi ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-primary')}>{source.enabledForAi ? 'En contexto' : 'Incluir en IA'}</button><button type="button" className="flex size-10 items-center justify-center rounded-lg text-outline hover:bg-surface-container" aria-label={`Opciones de ${source.title}`}><MoreHorizontal className="size-4" /></button></div></div>;
}

function TopicMetric({ value, label, compact = false }: { value: string | number; label: string; compact?: boolean }) {
  return <div className="min-w-0 px-2 py-2.5 text-center first:pl-2 sm:px-3 sm:text-left"><p className={cn('truncate font-bold text-on-surface', compact ? 'text-[11px] sm:text-xs' : 'text-sm sm:text-base')}>{value}</p><p className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-wide text-outline sm:text-[10px]">{label}</p></div>;
}

function ProjectLinkCard({ project }: { project: LinkedProject }) {
  return <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderKanban className="size-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold">{project.name}</p><p className="mt-0.5 truncate text-xs text-on-surface-variant">{project.detail}</p></div></div><div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-accent-amber" style={{ width: `${project.progress}%` }} /></div><span className="text-xs font-semibold text-on-surface-variant">{project.progress}%</span></div></div>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
