'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Trash2, AlertCircle, Check, Link as LinkIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Task, TaskItemCard } from '@/features/proyectos/components/TaskItemCard';
import { DeleteConfirmModal } from '@/features/proyectos/components/DeleteConfirmModal';
import {
  getProjectDetailAction,
  toggleTaskStatusAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  deleteProjectAction,
  TaskRecord,
} from '@/features/proyectos/actions/proyectoActions';

interface ProjectDetailState {
  id: string;
  title: string;
  priority: string;
  objective?: string;
  cuteImage: string;
  progress: number;
  completado?: boolean;
  tasks: Task[];
  fecha_limite?: string | null;
}

interface LocalProjectStorageItem {
  id: string;
  name: string;
  importance?: string;
  progress?: number;
  tasksCount?: number;
  createdAt?: string;
}

const CHIGUI_MASCOTS = [
  'chigui-celebrate',
  'chigui-focus',
  'chigui-idle',
  'chigui-rest',
  'chigui-welcome',
  'imagendechiwiconcafe',
];

interface ScheduleConflictResult {
  hasConflict: boolean;
  message: string | null;
}

function checkScheduleConflict(
  newDateStr: string,
  newTimeStr: string,
  newDurationMinutes: number,
  existingTasks: Task[],
  excludeTaskId?: string,
): ScheduleConflictResult {
  if (!newDateStr || !newTimeStr) {
    return { hasConflict: false, message: null };
  }

  const newStart = new Date(`${newDateStr}T${newTimeStr}:00`).getTime();
  if (isNaN(newStart)) {
    return { hasConflict: false, message: null };
  }

  const durationMin = Math.max(1, newDurationMinutes || 1);
  const newEnd = newStart + durationMin * 60 * 1000;

  for (const t of existingTasks) {
    if (excludeTaskId && t.id === excludeTaskId) continue;
    if (!t.startDate) continue;
    const exStart = new Date(t.startDate).getTime();
    if (isNaN(exStart)) continue;

    const exDurMin =
      typeof t.duration === 'number' ? t.duration : parseInt(String(t.duration)) || 30;
    const exEnd = exStart + exDurMin * 60 * 1000;

    // Caso 1: Fecha y hora exactamente igual
    if (newStart === exStart) {
      return {
        hasConflict: true,
        message: `Ya hay una tarea asignada para ese horario ("${t.title}").`,
      };
    }

    // Caso 2: Conflicto de duración con horario de otra tarea (solapamiento)
    if (newStart < exEnd && exStart < newEnd) {
      const exStartTimeStr = new Date(t.startDate).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const exEndTimeStr = new Date(exEnd).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return {
        hasConflict: true,
        message: `El tiempo de duración entra en conflicto con la tarea "${t.title}" (${exStartTimeStr} - ${exEndTimeStr}). No se permite solapar horarios.`,
      };
    }
  }

  return { hasConflict: false, message: null };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetailState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeletingProject, setIsDeletingProject] = useState<boolean>(false);

  // Estados para modales de confirmación de eliminación
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Estado para el modal de agregar tarea manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskUrls, setNewTaskUrls] = useState<string[]>(['']);
  const [durationValue, setDurationValue] = useState('30');
  const [durationUnit, setDurationUnit] = useState<'minutos' | 'horas'>('minutos');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskErrorMessage, setTaskErrorMessage] = useState<string | null>(null);

  // Fecha y hora de inicio para nueva tarea manual
  const todayStr = new Date().toISOString().split('T')[0];
  const [taskStartDate, setTaskStartDate] = useState(todayStr);
  const [taskStartTime, setTaskStartTime] = useState('09:00');

  // Funciones para manipular URLs en la creación de tarea
  const handleAddTaskUrl = () => {
    setNewTaskUrls((prev) => [...prev, '']);
  };
  const handleRemoveTaskUrl = (index: number) => {
    setNewTaskUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const handleTaskUrlChange = (index: number, val: string) => {
    setNewTaskUrls((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // Estados para modal de editar tarea
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskStartDate, setEditTaskStartDate] = useState(todayStr);
  const [editTaskStartTime, setEditTaskStartTime] = useState('09:00');
  const [editDurationValue, setEditDurationValue] = useState('30');
  const [editDurationUnit, setEditDurationUnit] = useState<'minutos' | 'horas'>('minutos');
  const [editTaskUrls, setEditTaskUrls] = useState<string[]>(['']);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  // Funciones para manipular URLs en la edición de tarea
  const handleAddEditUrl = () => {
    setEditTaskUrls((prev) => [...prev, '']);
  };
  const handleRemoveEditUrl = (index: number) => {
    setEditTaskUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const handleEditUrlChange = (index: number, val: string) => {
    setEditTaskUrls((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleDeleteProject = () => {
    if (typeof window !== 'undefined' && project) {
      const saved = localStorage.getItem('komorebi_projects');
      if (saved) {
        const projects = JSON.parse(saved);
        const updated = projects.filter((p: { id: string }) => p.id !== project.id);
        localStorage.setItem('komorebi_projects', JSON.stringify(updated));
        window.dispatchEvent(new Event('projects_updated'));
      }
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setEditTaskTitle(task.title);
    setEditTaskDescription(task.description || '');

    // Desglosar startDate
    if (task.startDate) {
      try {
        const d = new Date(task.startDate);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const mins = String(d.getMinutes()).padStart(2, '0');
          setEditTaskStartDate(`${year}-${month}-${day}`);
          setEditTaskStartTime(`${hours}:${mins}`);
        } else {
          setEditTaskStartDate(todayStr);
          setEditTaskStartTime('09:00');
        }
      } catch {
        setEditTaskStartDate(todayStr);
        setEditTaskStartTime('09:00');
      }
    } else {
      setEditTaskStartDate(todayStr);
      setEditTaskStartTime('09:00');
    }

    // Desglosar duración
    const durNum =
      typeof task.duration === 'number' ? task.duration : parseInt(String(task.duration)) || 30;
    if (durNum >= 60 && durNum % 60 === 0) {
      setEditDurationValue(String(durNum / 60));
      setEditDurationUnit('horas');
    } else {
      setEditDurationValue(String(durNum));
      setEditDurationUnit('minutos');
    }

    // Desglosar URLs
    if (task.resourceUrl) {
      const parsedUrls = task.resourceUrl
        .split(/[\s,|;\n]+/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      setEditTaskUrls(parsedUrls.length > 0 ? parsedUrls : ['']);
    } else {
      setEditTaskUrls(['']);
    }

    setEditErrorMessage(null);
  };

  // Cargar proyecto y tareas desde Supabase al resolver params
  useEffect(() => {
    let isMounted = true;

    Promise.resolve(params).then((resolved) => {
      if (!isMounted) return;
      const id = resolved.id;

      getProjectDetailAction(id)
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.project) {
            const p = res.project;
            const tareasList: Task[] = (
              (p.tareas as (TaskRecord & {
                resources?: string;
                recurso_url?: string;
                material_url?: string;
              })[]) || []
            ).map((t) => ({
              id: t.id,
              title: t.titulo,
              description: t.descripcion || '',
              duration: t.duracion,
              startDate: t.fecha_inicio || null,
              resourceUrl: t.resources || t.recurso_url || t.material_url || null,
              isCompleted: Boolean(t.completado),
            }));

            const charCodeSum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const mascot = CHIGUI_MASCOTS[charCodeSum % CHIGUI_MASCOTS.length];

            const totalTasks = tareasList.length;
            const completedTasks = tareasList.filter((t) => t.isCompleted).length;
            const calculatedProgress =
              totalTasks === 0
                ? (p.progreso ?? 0)
                : Math.round((completedTasks / totalTasks) * 100);
            const isCompleted = p.completado || (totalTasks > 0 && completedTasks === totalTasks);

            setProject({
              id: p.id,
              title: p.titulo,
              priority: p.prioridad || 'Prioritario',
              objective: p.objetivo,
              cuteImage: mascot,
              progress: calculatedProgress,
              completado: isCompleted,
              tasks: tareasList,
              fecha_limite: p.fecha_limite || null,
            });
          } else {
            if (typeof window !== 'undefined') {
              const saved = localStorage.getItem('komorebi_projects');
              if (saved) {
                const list: LocalProjectStorageItem[] = JSON.parse(saved);
                const found = list.find((item) => item.id === id);
                if (found) {
                  setProject({
                    id: found.id,
                    title: found.name,
                    priority: found.importance || 'Normal',
                    cuteImage: 'imagendechiwiconcafe',
                    progress: found.progress || 0,
                    tasks: [],
                  });
                }
              }
            }
          }
        })
        .catch((error) => {
          console.error('Error cargando detalle del proyecto:', error);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [params]);

  // Manejador para marcar/desmarcar tarea completada
  const handleToggleTask = async (taskId: string, newStatus: boolean) => {
    if (!project) return;

    // Actualización optimista en interfaz
    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, isCompleted: newStatus } : t,
    );
    const completedCount = updatedTasks.filter((t) => t.isCompleted).length;
    const optimisticProgress =
      updatedTasks.length === 0 ? 0 : Math.round((completedCount / updatedTasks.length) * 100);

    setProject((prev) =>
      prev ? { ...prev, progress: optimisticProgress, tasks: updatedTasks } : null,
    );

    try {
      const res = await toggleTaskStatusAction(taskId, newStatus, project.id);
      if (res.success && typeof res.progreso === 'number') {
        setProject((prev) =>
          prev
            ? {
                ...prev,
                progress: res.progreso,
                completado: typeof res.completado === 'boolean' ? res.completado : prev.completado,
              }
            : null,
        );

        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('komorebi_projects');
          if (saved) {
            const list: LocalProjectStorageItem[] = JSON.parse(saved);
            const updatedList = list.map((item) =>
              item.id === project.id ? { ...item, progress: res.progreso } : item,
            );
            localStorage.setItem('komorebi_projects', JSON.stringify(updatedList));
            window.dispatchEvent(new Event('projects_updated'));
          }
        }
      }
    } catch (error) {
      console.error('Error actualizando estado de tarea en Supabase:', error);
    }
  };

  // Manejador al hacer click en el botón de eliminar tarea
  const handleDeleteTaskClick = (taskId: string) => {
    const found = project?.tasks.find((t) => t.id === taskId);
    if (found) {
      setTaskToDelete(found);
    }
  };

  // Confirmación de eliminación de tarea (desde DeleteConfirmModal)
  const confirmDeleteTask = async () => {
    if (!project || !taskToDelete || isDeletingTask) return;
    setIsDeletingTask(true);
    const taskId = taskToDelete.id;

    const previousTasks = [...project.tasks];
    const previousProgress = project.progress;

    // Optimista
    const updatedTasks = project.tasks.filter((t) => t.id !== taskId);
    const completedCount = updatedTasks.filter((t) => t.isCompleted).length;
    const optimisticProgress =
      updatedTasks.length === 0 ? 0 : Math.round((completedCount / updatedTasks.length) * 100);

    setProject((prev) =>
      prev ? { ...prev, progress: optimisticProgress, tasks: updatedTasks } : null,
    );

    try {
      const res = await deleteTaskAction(taskId, project.id);
      if (res.success && typeof res.progreso === 'number') {
        setProject((prev) =>
          prev
            ? {
                ...prev,
                progress: res.progreso,
                completado: typeof res.completado === 'boolean' ? res.completado : prev.completado,
              }
            : null,
        );

        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('komorebi_projects');
          if (saved) {
            const list: LocalProjectStorageItem[] = JSON.parse(saved);
            const updatedList = list.map((item) =>
              item.id === project.id
                ? { ...item, progress: res.progreso, tasksCount: updatedTasks.length }
                : item,
            );
            localStorage.setItem('komorebi_projects', JSON.stringify(updatedList));
            window.dispatchEvent(new Event('projects_updated'));
          }
        }
      } else {
        setProject((prev) =>
          prev ? { ...prev, progress: previousProgress, tasks: previousTasks } : null,
        );
      }
    } catch (error) {
      console.error('Error eliminando tarea en Supabase:', error);
      setProject((prev) =>
        prev ? { ...prev, progress: previousProgress, tasks: previousTasks } : null,
      );
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
    }
  };

  // Manejador al hacer click en el botón de eliminar proyecto
  const handleDeleteProjectClick = () => {
    setIsDeleteProjectModalOpen(true);
  };

  // Confirmación de eliminación de proyecto (desde DeleteConfirmModal)
  const confirmDeleteProject = async () => {
    if (!project || isDeletingProject) return;

    setIsDeletingProject(true);

    try {
      const res = await deleteProjectAction(project.id);
      if (!res.success) {
        console.error('Error al eliminar proyecto:', res.error);
        setIsDeletingProject(false);
        return;
      }

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('komorebi_projects');
        if (saved) {
          const projects: LocalProjectStorageItem[] = JSON.parse(saved);
          const updated = projects.filter((p) => p.id !== project.id);
          localStorage.setItem('komorebi_projects', JSON.stringify(updated));
          window.dispatchEvent(new Event('projects_updated'));
        }
      }

      setIsDeleteProjectModalOpen(false);
      router.push('/proyectos');
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      setIsDeletingProject(false);
    }
  };

  // Manejador para guardar tarea manual
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newTaskTitle.trim() || isSubmittingTask) return;

    const maxProjectDate = project.fecha_limite ? project.fecha_limite.split('T')[0] : undefined;

    // Validación de rango de fecha de inicio
    if (taskStartDate) {
      if (taskStartDate < todayStr) {
        setTaskErrorMessage('El día de inicio no puede ser anterior a la fecha de hoy.');
        return;
      }
      if (maxProjectDate && taskStartDate > maxProjectDate) {
        setTaskErrorMessage(
          `El día de inicio no puede superar la fecha límite del proyecto (${maxProjectDate}).`,
        );
        return;
      }
    } else {
      setTaskErrorMessage('Por favor selecciona el día de inicio de la tarea.');
      return;
    }

    setIsSubmittingTask(true);
    setTaskErrorMessage(null);

    try {
      const numericVal = Math.max(1, Math.round(Number(durationValue)) || 1);
      const calculatedDurationMinutes = durationUnit === 'horas' ? numericVal * 60 : numericVal;

      // Validación de conflicto de horario en el cliente
      const conflict = checkScheduleConflict(
        taskStartDate,
        taskStartTime,
        calculatedDurationMinutes,
        project.tasks || [],
      );

      if (conflict.hasConflict) {
        setTaskErrorMessage(conflict.message);
        setIsSubmittingTask(false);
        return;
      }

      const localDate = new Date(`${taskStartDate}T${taskStartTime || '09:00'}:00`);
      const fullStartDateTime = !isNaN(localDate.getTime())
        ? localDate.toISOString()
        : `${taskStartDate}T${taskStartTime || '09:00'}:00`;

      const validUrls = newTaskUrls.map((u) => u.trim()).filter(Boolean);
      const combinedUrls = validUrls.join(', ');

      const res = await createTaskAction({
        projectId: project.id,
        titulo: newTaskTitle.trim(),
        duracion: calculatedDurationMinutes,
        descripcion: newTaskDescription.trim(),
        prioridad: project.priority,
        fecha_inicio: fullStartDateTime,
        resources: combinedUrls || undefined,
      });

      if (res.success && res.task) {
        const created: Task = {
          id: res.task.id,
          title: res.task.titulo,
          description: res.task.descripcion || '',
          duration: res.task.duracion,
          startDate: res.task.fecha_inicio || fullStartDateTime,
          resourceUrl:
            (res.task as TaskRecord & { resources?: string }).resources || combinedUrls || null,
          isCompleted: false,
        };

        const updatedTasks = [...project.tasks, created];
        setProject((prev) =>
          prev
            ? {
                ...prev,
                progress: res.progreso ?? prev.progress,
                completado: false,
                tasks: updatedTasks,
              }
            : null,
        );

        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('komorebi_projects');
          if (saved) {
            const list: LocalProjectStorageItem[] = JSON.parse(saved);
            const updatedList = list.map((item) =>
              item.id === project.id
                ? {
                    ...item,
                    progress: res.progreso ?? item.progress,
                    tasksCount: updatedTasks.length,
                  }
                : item,
            );
            localStorage.setItem('komorebi_projects', JSON.stringify(updatedList));
            window.dispatchEvent(new Event('projects_updated'));
          }
        }

        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskUrls(['']);
        setDurationValue('30');
        setDurationUnit('minutos');
        setTaskStartDate(todayStr);
        setTaskStartTime('09:00');
        setIsAddModalOpen(false);
      } else {
        setTaskErrorMessage(res.error || 'Error al guardar la tarea');
      }
    } catch (error: unknown) {
      console.error('Error agregando tarea:', error);
      const msg = error instanceof Error ? error.message : 'Error inesperado al crear la tarea';
      setTaskErrorMessage(msg);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Manejador para guardar cambios de la tarea editada
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !taskToEdit) return;

    if (!editTaskTitle.trim()) {
      setEditErrorMessage('Por favor ingresa un título para la tarea.');
      return;
    }

    if (editTaskStartDate) {
      if (editTaskStartDate < todayStr) {
        setEditErrorMessage('El día de inicio no puede ser anterior a la fecha de hoy.');
        return;
      }
      const maxProjectDate = project.fecha_limite ? project.fecha_limite.split('T')[0] : null;
      if (maxProjectDate && editTaskStartDate > maxProjectDate) {
        setEditErrorMessage(
          `El día de inicio no puede superar la fecha límite del proyecto (${maxProjectDate}).`,
        );
        return;
      }
    } else {
      setEditErrorMessage('Por favor selecciona el día de inicio de la tarea.');
      return;
    }

    const numericVal = Math.max(1, Math.round(Number(editDurationValue)) || 1);
    const calculatedDurationMinutes = editDurationUnit === 'horas' ? numericVal * 60 : numericVal;

    // Validación de conflicto de horario (excluyendo la tarea en edición)
    const conflict = checkScheduleConflict(
      editTaskStartDate,
      editTaskStartTime,
      calculatedDurationMinutes,
      project.tasks || [],
      taskToEdit.id,
    );

    if (conflict.hasConflict) {
      setEditErrorMessage(conflict.message);
      return;
    }

    setIsSubmittingEdit(true);
    setEditErrorMessage(null);

    try {
      const localDate = new Date(`${editTaskStartDate}T${editTaskStartTime || '09:00'}:00`);
      const fullStartDateTime = !isNaN(localDate.getTime())
        ? localDate.toISOString()
        : `${editTaskStartDate}T${editTaskStartTime || '09:00'}:00`;

      const validUrls = editTaskUrls.map((u) => u.trim()).filter(Boolean);
      const combinedUrls = validUrls.join(', ');

      const res = await updateTaskAction({
        taskId: taskToEdit.id,
        projectId: project.id,
        titulo: editTaskTitle.trim(),
        duracion: calculatedDurationMinutes,
        descripcion: editTaskDescription.trim(),
        prioridad: project.priority,
        fecha_inicio: fullStartDateTime,
        resources: combinedUrls || null,
      });

      if (res.success && res.task) {
        const updatedTaskItem: Task = {
          id: res.task.id,
          title: res.task.titulo,
          description: res.task.descripcion || '',
          duration: res.task.duracion,
          startDate: res.task.fecha_inicio || fullStartDateTime,
          resourceUrl:
            (res.task as TaskRecord & { resources?: string }).resources || combinedUrls || null,
          isCompleted: taskToEdit.isCompleted,
        };

        const updatedTasks = project.tasks.map((t) =>
          t.id === taskToEdit.id ? updatedTaskItem : t,
        );

        setProject((prev) =>
          prev
            ? {
                ...prev,
                progress: res.progreso ?? prev.progress,
                completado: typeof res.completado === 'boolean' ? res.completado : prev.completado,
                tasks: updatedTasks,
              }
            : null,
        );

        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('komorebi_projects');
          if (saved) {
            const list: LocalProjectStorageItem[] = JSON.parse(saved);
            const updatedList = list.map((item) =>
              item.id === project.id
                ? {
                    ...item,
                    progress: res.progreso ?? item.progress,
                    tasksCount: updatedTasks.length,
                  }
                : item,
            );
            localStorage.setItem('komorebi_projects', JSON.stringify(updatedList));
            window.dispatchEvent(new Event('projects_updated'));
          }
        }

        setTaskToEdit(null);
      } else {
        setEditErrorMessage(res.error || 'Error al actualizar la tarea');
      }
    } catch (error: unknown) {
      console.error('Error editando tarea:', error);
      const msg = error instanceof Error ? error.message : 'Error inesperado al editar la tarea';
      setEditErrorMessage(msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E8DCD1] border-t-[#845326] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <h2 className="text-xl font-bold text-on-surface mb-2">Proyecto no encontrado</h2>
        <p className="text-sm text-on-surface-variant mb-6">
          No se pudo encontrar el proyecto especificado.
        </p>
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f5e5d9] text-[#845326] font-bold text-sm hover:bg-[#E8DCD1] transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver a Proyectos
        </Link>
      </div>
    );
  }

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.isCompleted).length;

  // Las tareas completadas deben colocarse directamente arriba de las tareas no completadas
  const sortedTasks = [...project.tasks].sort((a, b) => {
    if (a.isCompleted && !b.isCompleted) return -1;
    if (!a.isCompleted && b.isCompleted) return 1;
    if (a.startDate && b.startDate) {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    }
    return 0;
  });

  const numericDuration = Math.max(1, Math.round(Number(durationValue)) || 1);
  const currentDurationMin = durationUnit === 'horas' ? numericDuration * 60 : numericDuration;

  const liveScheduleConflict = checkScheduleConflict(
    taskStartDate,
    taskStartTime,
    currentDurationMin,
    project.tasks || [],
  );

  const numericEditDuration = Math.max(1, Math.round(Number(editDurationValue)) || 1);
  const currentEditDurationMin =
    editDurationUnit === 'horas' ? numericEditDuration * 60 : numericEditDuration;

  const liveEditScheduleConflict = taskToEdit
    ? checkScheduleConflict(
        editTaskStartDate,
        editTaskStartTime,
        currentEditDurationMin,
        project.tasks || [],
        taskToEdit.id,
      )
    : { hasConflict: false, message: null };

  return (
    <div className="flex h-full min-h-[80vh] flex-col animate-in fade-in duration-500 pb-20">
      {/* Botón superior izquierdo: Volver a Proyectos */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/proyectos"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#845326] hover:text-[#433022] bg-[#f5e5d9]/60 hover:bg-[#f5e5d9] px-3.5 py-1.5 rounded-full transition-all"
        >
          <ArrowLeft className="size-4" />
          <span>Volver a Proyectos</span>
        </Link>
      </div>

      {/* 1. CABECERA Y MÉTRICAS DEL PROYECTO */}
      <div className="bg-white rounded-[24px] border border-[#E8DCD1] overflow-hidden shadow-sm mb-8 relative">
        {/* Banner Superior */}
        <div className="h-40 sm:h-48 bg-[#f5e5d9] relative w-full overflow-hidden flex items-end justify-center">
          {/* Badge de Estado Absoluto y Completado */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {project.completado && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-600 text-white shadow-sm">
                <Check className="size-3.5" strokeWidth={3} />
                Completado
              </span>
            )}
            <span
              className={`
              inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
              ${project.priority === 'Prioritario' ? 'bg-red-500 text-white shadow-sm' : ''}
              ${project.priority === 'Obligatorio' ? 'bg-orange-500 text-white shadow-sm' : ''}
              ${project.priority === 'Hobby' ? 'bg-blue-500 text-white shadow-sm' : ''}
              ${!['Prioritario', 'Obligatorio', 'Hobby'].includes(project.priority) ? 'bg-gray-600 text-white shadow-sm' : ''}
            `}
            >
              {project.priority}
            </span>
          </div>

          {/* Ilustración de Chigui */}
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 translate-y-4">
            <Image
              src={`/images/mascot/${project.cuteImage}.png`}
              alt="Mascota del proyecto"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
        </div>

        {/* Fila Informativa de Métricas */}
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-2">{project.title}</h1>
          {project.objective && (
            <p className="text-sm text-on-surface-variant mb-6">{project.objective}</p>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-3">
            <div>
              <p className="text-sm font-bold text-on-surface-variant">Progreso del proyecto</p>
              <div className="text-sm text-on-surface-variant mt-1">
                Nro. de Tareas: <span className="font-bold text-on-surface">{totalTasks}</span>
                <span className="mx-2">•</span>
                Realizadas:{' '}
                <span className="font-bold text-on-surface">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            </div>
            <div className="text-2xl font-black text-[#845326]">{project.progress}%</div>
          </div>

          {/* Barra de Progreso */}
          <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-[#845326] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. LISTA DE TAREAS */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Plan de Acción</h2>
      </div>

      {project.tasks.length === 0 ? (
        <div className="bg-white border border-[#E8DCD1] rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-on-surface mb-2">
            Aún no hay tareas registradas
          </p>
          <p className="text-xs text-on-surface-variant mb-4">
            Comienza agregando tu primera tarea de estudio para este proyecto.
          </p>
          <button
            onClick={() => {
              setTaskErrorMessage(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f5e5d9] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#845326] hover:bg-[#E8DCD1] transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            Agregar Tarea
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {sortedTasks.map((task) => (
              <TaskItemCard
                key={task.id}
                task={task}
                projectId={project.id}
                projectName={project.title}
                projectPriority={project.priority}
                onToggleComplete={handleToggleTask}
                onDeleteTask={handleDeleteTaskClick}
                onEditTask={handleOpenEditModal}
              />
            ))}
          </div>

          {/* Botón de agregar tarea manualmente: por debajo de las tareas creadas y en el centro */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => {
                setTaskErrorMessage(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f5e5d9] px-7 py-3 text-sm font-bold text-[#845326] shadow-sm hover:shadow-md transition-all hover:bg-[#E8DCD1] hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Plus className="size-5" />
              <span>Agregar Tarea</span>
            </button>
          </div>
        </>
      )}

      {/* 3. PIE DE PÁGINA: OPCIÓN ELIMINAR PROYECTO ABAJO A LA DERECHA */}
      <div className="mt-14 pt-6 border-t border-[#E8DCD1] flex justify-end">
        <button
          type="button"
          onClick={handleDeleteProjectClick}
          disabled={isDeletingProject}
          className="inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl border border-red-200/60 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Trash2 className="size-4" />
          <span>Eliminar Proyecto</span>
        </button>
      </div>

      {/* Modal para agregar tarea manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-[#E8DCD1]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-xl font-bold text-on-surface mb-5">Nueva Tarea</h2>

            {taskErrorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{taskErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddTask} className="flex flex-col gap-5">
              <div>
                <label htmlFor="taskTitle" className="block text-sm font-bold text-on-surface mb-2">
                  Título de la tarea
                </label>
                <input
                  id="taskTitle"
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ej. Revisar vocabulario o hacer ejercicio 1"
                  className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-4 py-3 text-on-surface placeholder:text-gray-400 focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="taskDescription"
                  className="block text-sm font-bold text-on-surface mb-2"
                >
                  Descripción (opcional)
                </label>
                <textarea
                  id="taskDescription"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Detalles sobre lo que se trabajará..."
                  className="w-full h-20 rounded-xl border-2 border-[#E8DCD1] bg-white px-4 py-2.5 text-on-surface placeholder:text-gray-400 focus:border-[#2C1F14] focus:outline-none resize-none transition-all text-sm"
                />
              </div>

              {/* Apartado de Día de inicio y Hora de inicio */}
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">
                  Fecha y hora de inicio
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="taskStartDate"
                      className="block text-xs font-semibold text-gray-500 mb-1"
                    >
                      Día de inicio
                    </label>
                    <input
                      id="taskStartDate"
                      type="date"
                      min={todayStr}
                      max={project?.fecha_limite ? project.fecha_limite.split('T')[0] : undefined}
                      value={taskStartDate}
                      onChange={(e) => setTaskStartDate(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-3.5 py-2.5 text-on-surface focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="taskStartTime"
                      className="block text-xs font-semibold text-gray-500 mb-1"
                    >
                      Hora de inicio
                    </label>
                    <input
                      id="taskStartTime"
                      type="time"
                      value={taskStartTime}
                      onChange={(e) => setTaskStartTime(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-3.5 py-2.5 text-on-surface focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
                {project?.fecha_limite && (
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    * Debe estar dentro del rango hasta la fecha límite del proyecto (
                    {project.fecha_limite.split('T')[0]}).
                  </p>
                )}
              </div>

              {/* Selector de Duración: Número + Opción Horas o Minutos */}
              <div>
                <label
                  htmlFor="durationInput"
                  className="block text-sm font-bold text-on-surface mb-2"
                >
                  Duración estimada
                </label>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <input
                      id="durationInput"
                      type="number"
                      min="1"
                      max={durationUnit === 'horas' ? 24 : 1440}
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      placeholder="Ej. 30"
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-4 py-3 text-on-surface focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="w-36">
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as 'minutos' | 'horas')}
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-[#FDFBF9] px-3.5 py-3 text-on-surface font-semibold focus:border-[#2C1F14] focus:outline-none transition-all text-sm cursor-pointer"
                    >
                      <option value="minutos">Minutos</option>
                      <option value="horas">Horas</option>
                    </select>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {durationUnit === 'horas'
                    ? `Equivale a ${(Math.round(Number(durationValue)) || 1) * 60} minutos.`
                    : `${Math.round(Number(durationValue)) || 1} minutos registrados.`}
                </p>
              </div>

              {/* Sección URLs recomendadas dinámicas (mismo formato que el wizard) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-on-surface mb-2">
                  <LinkIcon className="size-4 text-[#845326]" /> Enlaces y URLs recomendadas
                  (opcional)
                </label>

                <div className="space-y-2.5">
                  {newTaskUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/material"
                        className="flex-1 p-3 rounded-xl border-2 border-[#E8DCD1] bg-white text-on-surface placeholder:text-gray-400 focus:border-[#2C1F14] focus:outline-none text-sm transition-all"
                        value={url}
                        onChange={(e) => handleTaskUrlChange(idx, e.target.value)}
                      />
                      {newTaskUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskUrl(idx)}
                          className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar enlace"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddTaskUrl}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#845326] hover:text-[#433022] bg-[#f5e5d9] hover:bg-[#E8DCD1] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Añadir otra URL</span>
                </button>
              </div>

              {/* Advertencia en caso de conflicto de horario o solapamiento */}
              {liveScheduleConflict.hasConflict && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in shadow-sm">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950">Advertencia de horario:</span>
                    <span className="text-amber-800 mt-0.5 block leading-relaxed">
                      {liveScheduleConflict.message}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !newTaskTitle.trim() || isSubmittingTask || liveScheduleConflict.hasConflict
                  }
                  className="flex-1 rounded-xl bg-[#2C1F14] hover:bg-[#433022] px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-98"
                >
                  {isSubmittingTask ? 'Guardando...' : 'Guardar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar tarea */}
      {taskToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-[#E8DCD1] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setTaskToEdit(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-xl font-bold text-on-surface mb-5">Editar Tarea</h2>

            {editErrorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{editErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleEditTask} className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="editTaskTitle"
                  className="block text-sm font-bold text-on-surface mb-2"
                >
                  Título de la tarea
                </label>
                <input
                  id="editTaskTitle"
                  type="text"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  placeholder="Ej. Revisar vocabulario o hacer ejercicio 1"
                  className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-4 py-3 text-on-surface placeholder:text-gray-400 focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="editTaskDescription"
                  className="block text-sm font-bold text-on-surface mb-2"
                >
                  Descripción (opcional)
                </label>
                <textarea
                  id="editTaskDescription"
                  value={editTaskDescription}
                  onChange={(e) => setEditTaskDescription(e.target.value)}
                  placeholder="Detalles sobre lo que se trabajará..."
                  className="w-full h-20 rounded-xl border-2 border-[#E8DCD1] bg-white px-4 py-2.5 text-on-surface placeholder:text-gray-400 focus:border-[#2C1F14] focus:outline-none resize-none transition-all text-sm"
                />
              </div>

              {/* Apartado de Día de inicio y Hora de inicio */}
              <div>
                <label className="block text-sm font-bold text-on-surface mb-2">
                  Fecha y hora de inicio
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="editTaskStartDate"
                      className="block text-xs font-semibold text-gray-500 mb-1"
                    >
                      Día de inicio
                    </label>
                    <input
                      id="editTaskStartDate"
                      type="date"
                      min={todayStr}
                      max={project?.fecha_limite ? project.fecha_limite.split('T')[0] : undefined}
                      value={editTaskStartDate}
                      onChange={(e) => setEditTaskStartDate(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-3.5 py-2.5 text-on-surface focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="editTaskStartTime"
                      className="block text-xs font-semibold text-gray-500 mb-1"
                    >
                      Hora de inicio
                    </label>
                    <input
                      id="editTaskStartTime"
                      type="time"
                      value={editTaskStartTime}
                      onChange={(e) => setEditTaskStartTime(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-3.5 py-2.5 text-on-surface focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>
                </div>
                {project?.fecha_limite && (
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    * Debe estar dentro del rango hasta la fecha límite del proyecto (
                    {project.fecha_limite.split('T')[0]}).
                  </p>
                )}
              </div>

              {/* Selector de Duración: Número + Opción Horas o Minutos */}
              <div>
                <label
                  htmlFor="editDurationInput"
                  className="block text-sm font-bold text-on-surface mb-2"
                >
                  Duración estimada
                </label>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <input
                      id="editDurationInput"
                      type="number"
                      min="1"
                      max={editDurationUnit === 'horas' ? 24 : 1440}
                      value={editDurationValue}
                      onChange={(e) => setEditDurationValue(e.target.value)}
                      placeholder="Ej. 30"
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-white px-4 py-3 text-on-surface focus:border-[#2C1F14] focus:outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="w-36">
                    <select
                      value={editDurationUnit}
                      onChange={(e) => setEditDurationUnit(e.target.value as 'minutos' | 'horas')}
                      className="w-full rounded-xl border-2 border-[#E8DCD1] bg-[#FDFBF9] px-3.5 py-3 text-on-surface font-semibold focus:border-[#2C1F14] focus:outline-none transition-all text-sm cursor-pointer"
                    >
                      <option value="minutos">Minutos</option>
                      <option value="horas">Horas</option>
                    </select>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {editDurationUnit === 'horas'
                    ? `Equivale a ${(Math.round(Number(editDurationValue)) || 1) * 60} minutos.`
                    : `${Math.round(Number(editDurationValue)) || 1} minutos registrados.`}
                </p>
              </div>

              {/* Sección URLs recomendadas dinámicas (mismo formato que el wizard) */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-on-surface mb-2">
                  <LinkIcon className="size-4 text-[#845326]" /> Enlaces y URLs recomendadas
                  (opcional)
                </label>

                <div className="space-y-2.5">
                  {editTaskUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/material"
                        className="flex-1 p-3 rounded-xl border-2 border-[#E8DCD1] bg-white text-on-surface placeholder:text-gray-400 focus:border-[#2C1F14] focus:outline-none text-sm transition-all"
                        value={url}
                        onChange={(e) => handleEditUrlChange(idx, e.target.value)}
                      />
                      {editTaskUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditUrl(idx)}
                          className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar enlace"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddEditUrl}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#845326] hover:text-[#433022] bg-[#f5e5d9] hover:bg-[#E8DCD1] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Añadir otra URL</span>
                </button>
              </div>

              {/* Advertencia en caso de conflicto de horario o solapamiento */}
              {liveEditScheduleConflict.hasConflict && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 text-amber-900 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in shadow-sm">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950">Advertencia de horario:</span>
                    <span className="text-amber-800 mt-0.5 block leading-relaxed">
                      {liveEditScheduleConflict.message}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setTaskToEdit(null)}
                  className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    !editTaskTitle.trim() ||
                    isSubmittingEdit ||
                    liveEditScheduleConflict.hasConflict
                  }
                  className="flex-1 rounded-xl bg-[#2C1F14] hover:bg-[#433022] px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-98"
                >
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar proyecto */}
      <DeleteConfirmModal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => setIsDeleteProjectModalOpen(false)}
        onConfirm={confirmDeleteProject}
        title="¿Eliminar proyecto?"
        description="Esta acción eliminará de forma permanente el proyecto y todas sus tareas asociadas. Esta acción no se puede deshacer."
        itemName={project.title}
        confirmText="Eliminar Proyecto"
        isDeleting={isDeletingProject}
      />

      {/* Modal de confirmación para eliminar tarea */}
      <DeleteConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDeleteTask}
        title="¿Eliminar tarea?"
        description="Esta tarea será eliminada permanentemente de tu plan de acción y el progreso del proyecto se actualizará."
        itemName={taskToDelete?.title}
        confirmText="Eliminar Tarea"
        isDeleting={isDeletingTask}
      />
    </div>
  );
}
