'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Task, TaskItemCard } from '@/features/proyectos/components/TaskItemCard';

// 4. CONTRATO DE DATOS MOCK
const mockProjectDetail = {
  id: "proj-1",
  title: "Aprender Inglés Desde Cero",
  priority: "Prioritario",
  cuteImage: "imagendechiwiconcafe", // We will use /images/mascot/${cuteImage}.png
  progress: 50,
  tasks: [
    {
      id: "t-1",
      title: "1. Aprender Gramática Básica (Tiempos verbales)",
      description: "Revisa la estructura del Presente Simple con ejercicios interactivos.",
      duration: "45 min",
      timeSlot: "10:30 AM",
      resourceUrl: "https://es.duolingo.com/",
      resourceName: "Duolingo",
      isCompleted: true
    },
    {
      id: "t-2",
      title: "2. Práctica de Escucha (Listening)",
      description: "Escucha el episodio 1 del podcast para principiantes.",
      duration: "30 min",
      timeSlot: "04:00 PM",
      resourceUrl: "https://spotlightenglish.com/",
      resourceName: "Spotlight English",
      isCompleted: false
    }
  ]
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState(mockProjectDetail);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('30 min');

  // We could fetch real data based on params.id here in the future
  
  // Calculate progress dynamically
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.isCompleted).length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const handleToggleTask = (taskId: string, newStatus: boolean) => {
    setProject(prev => {
      const updatedTasks = prev.tasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: newStatus } : t
      );
      return { ...prev, tasks: updatedTasks };
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: newTaskTitle,
      duration: newTaskDuration,
      timeSlot: 'Por definir', // Default or could be input
      isCompleted: false,
    };

    setProject(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
    
    setNewTaskTitle('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex h-full min-h-[80vh] flex-col animate-in fade-in duration-500 pb-20">
      
      {/* Back button */}
      <div className="mb-4">
        <Link href="/proyectos" className="inline-flex items-center gap-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowLeft className="size-4" />
          Volver a Proyectos
        </Link>
      </div>

      {/* 1. CABECERA Y MÉTRICAS DEL PROYECTO */}
      <div className="bg-white rounded-[24px] border border-[#E8DCD1] overflow-hidden shadow-sm mb-8 relative">
        
        {/* Banner Superior */}
        <div className="h-40 sm:h-48 bg-[#f5e5d9] relative w-full overflow-hidden flex items-end justify-center">
          {/* Badge de Estado Absoluto */}
          <div className="absolute top-4 right-4 z-10">
            <span className={`
              inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
              ${project.priority === 'Prioritario' ? 'bg-red-500 text-white shadow-sm' : ''}
              ${project.priority === 'Obligatorio' ? 'bg-orange-500 text-white shadow-sm' : ''}
              ${project.priority === 'Hobby' ? 'bg-blue-500 text-white shadow-sm' : ''}
              ${!['Prioritario', 'Obligatorio', 'Hobby'].includes(project.priority) ? 'bg-gray-600 text-white shadow-sm' : ''}
            `}>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-6">
            {project.title}
          </h1>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-3">
            <div>
              <p className="text-sm font-bold text-on-surface-variant">Progreso del proyecto</p>
              <div className="text-sm text-on-surface-variant mt-1">
                Nro. de Tareas: <span className="font-bold text-on-surface">{totalTasks}</span> 
                <span className="mx-2">•</span> 
                Realizadas: <span className="font-bold text-on-surface">{completedTasks}/{totalTasks}</span>
              </div>
            </div>
            <div className="text-2xl font-black text-[#845326]">
              {progressPercentage}%
            </div>
          </div>
          
          {/* Barra de Progreso */}
          <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#845326] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. LISTA DE TAREAS */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-on-surface">Plan de Acción</h2>
      </div>

      <div className="flex flex-col gap-4">
        {project.tasks.map((task) => (
          <TaskItemCard 
            key={task.id}
            task={task}
            projectName={project.title}
            projectPriority={project.priority}
            onToggleComplete={handleToggleTask}
          />
        ))}
      </div>

      {/* 3. BOTÓN AGREGAR TAREA (Flotante o al final) */}
      <div className="mt-8 flex justify-center sm:justify-start">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#f5e5d9] px-6 py-3 text-sm font-bold text-[#845326] shadow-sm hover:shadow-md transition-all hover:bg-[#E8DCD1] active:scale-95"
        >
          <Plus className="size-5" />
          Agregar Tarea
        </button>
      </div>

      {/* Modal para agregar tarea manual */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="size-5" />
            </button>
            
            <h2 className="text-xl font-bold text-on-surface mb-6">Nueva Tarea Manual</h2>
            
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
                  placeholder="Ej. Revisar vocabulario"
                  className="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-4 py-3 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="taskDuration" className="block text-sm font-bold text-on-surface mb-2">
                  Duración estimada
                </label>
                <input
                  id="taskDuration"
                  type="text"
                  value={newTaskDuration}
                  onChange={(e) => setNewTaskDuration(e.target.value)}
                  placeholder="Ej. 30 min"
                  className="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-4 py-3 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  required
                />
              </div>
              
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
