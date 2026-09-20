'use client';

import React, { useState } from 'react';
import { Clock, ExternalLink, Play, Check } from 'lucide-react';
import { toggleTaskStatus } from '@/services/proyectoServices';

export interface Task {
  id: string;
  title: string;
  description?: string;
  duration: string;
  timeSlot: string;
  resourceUrl?: string;
  resourceName?: string;
  isCompleted: boolean;
}

interface TaskItemCardProps {
  task: Task;
  projectName: string;
  projectPriority: string;
  onToggleComplete: (id: string, newStatus: boolean) => void;
}

export function TaskItemCard({ task, projectName, projectPriority, onToggleComplete }: TaskItemCardProps) {
  const [isCompleted, setIsCompleted] = useState(task.isCompleted);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    const newStatus = !isCompleted;
    setIsCompleted(newStatus);
    
    try {
      // Llamada al servicio simulado (preparado para Supabase)
      await toggleTaskStatus(task.id, newStatus);
      // Actualizamos el estado en el padre para la barra de progreso
      onToggleComplete(task.id, newStatus);
    } catch (error) {
      console.error('Error toggling task status', error);
      // Revertir si hay error
      setIsCompleted(!newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className={`
        flex flex-col sm:flex-row gap-4 items-start sm:items-center 
        p-4 sm:p-5 rounded-[20px] border-2 transition-all duration-300
        ${isCompleted 
          ? 'bg-surface-container-lowest border-transparent opacity-75' 
          : 'bg-white border-[#E8DCD1] hover:shadow-md hover:border-[#d2c4bb]'
        }
      `}
    >
      {/* 1. Lado Izquierdo (Interacción) */}
      <div className="flex-shrink-0 pt-1 sm:pt-0">
        <button 
          onClick={handleToggle}
          disabled={isUpdating}
          className={`
            w-7 h-7 rounded-md flex items-center justify-center transition-colors border-2
            ${isCompleted 
              ? 'bg-[#845326] border-[#845326] text-white' 
              : 'border-[#d2c4bb] bg-transparent hover:border-[#845326]'
            }
          `}
          aria-label={isCompleted ? 'Marcar como incompleta' : 'Marcar como completa'}
        >
          {isCompleted && <Check className="size-4" strokeWidth={3} />}
        </button>
      </div>

      {/* 2. Centro (Información y Recursos) */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        
        {/* Badges superiores */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#845326] bg-[#f5e5d9] px-2 py-0.5 rounded-full">
            {projectName}
          </span>
          <span className={`
            text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full
            ${projectPriority === 'Prioritario' ? 'bg-red-100 text-red-700' : ''}
            ${projectPriority === 'Obligatorio' ? 'bg-orange-100 text-orange-700' : ''}
            ${projectPriority === 'Hobby' ? 'bg-blue-100 text-blue-700' : ''}
            ${!['Prioritario', 'Obligatorio', 'Hobby'].includes(projectPriority) ? 'bg-gray-100 text-gray-700' : ''}
          `}>
            {projectPriority}
          </span>
        </div>

        {/* Título y Descripción */}
        <h3 className={`text-base font-bold transition-all ${isCompleted ? 'text-gray-400 line-through decoration-gray-300' : 'text-on-surface'}`}>
          {task.title}
        </h3>
        {task.description && (
          <p className={`text-sm ${isCompleted ? 'text-gray-400' : 'text-on-surface-variant'}`}>
            {task.description}
          </p>
        )}

        {/* Metadatos y Recurso */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant">
            <Clock className="size-4" />
            <span>{task.timeSlot} · {task.duration}</span>
          </div>
          
          {task.resourceUrl && (
            <a 
              href={task.resourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-bold text-[#845326] hover:text-[#433022] hover:underline transition-colors bg-[#FDFBF9] px-3 py-1 rounded-full border border-[#E8DCD1]"
            >
              <ExternalLink className="size-3.5" />
              {task.resourceName || 'Ver Recurso Recomendado'}
            </a>
          )}
        </div>
      </div>

      {/* 3. Lado Derecho (Acción) */}
      <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
        <button 
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-on-surface px-5 py-2.5 text-sm font-bold text-surface transition-transform hover:scale-105 hover:bg-[#333] active:scale-95"
        >
          {isCompleted ? 'Ver más' : 'Iniciar tarea'}
          {!isCompleted && <Play className="size-4" fill="currentColor" />}
        </button>
      </div>

    </div>
  );
}
