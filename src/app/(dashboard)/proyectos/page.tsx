'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Project, ProjectCard } from '@/features/proyectos/components/ProjectCard';

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar proyectos desde el almacenamiento local
    const loadProjects = () => {
      try {
        const saved = localStorage.getItem('komorebi_projects');
        if (saved) {
          setProyectos(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjects();
  }, []);

  const handleDeleteProject = (id: string) => {
    const updated = proyectos.filter(p => p.id !== id);
    setProyectos(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('komorebi_projects', JSON.stringify(updated));
      window.dispatchEvent(new Event('projects_updated'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E8DCD1] border-t-[#845326] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[80vh] flex-col animate-in fade-in duration-500">
      
      {/* Se eliminó el botón superior izquierdo para unificar la creación en el grid */}

      {proyectos.length === 0 ? (
        /* ============================
           EMPTY STATE
           ============================ */
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-8 flex h-[200px] w-[200px] items-center justify-center overflow-hidden border-4 bg-surface-container-lowest animate-morph-glow">
            <video
              src="/images/mascot/mrChiwiVideo.mp4"
              loop
              muted
              autoPlay
              playsInline
              disablePictureInPicture
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-on-surface">¡Empieza tu nuevo proyecto!</h1>
          <p className="max-w-md text-on-surface-variant">
            Crea tu primer espacio de estudio o trabajo y organiza todas tus tareas de forma sencilla.
          </p>
          <Link 
            href="/proyectos/nuevo"
            className="mt-8 flex items-center justify-center gap-2 rounded-full bg-[#f5e5d9] px-6 py-3 text-[15px] font-bold text-[#845326] shadow-sm transition-all hover:-translate-y-[2px] hover:bg-[#E8DCD1] hover:shadow-md active:scale-[0.98]"
          >
            <Plus className="size-5" />
            Crear mi primer proyecto
          </Link>
        </div>
      ) : (
        /* ============================
           GRID DE PROYECTOS
           ============================ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          
          {/* Tarjetas de Proyectos Creados */}
          {proyectos.map((proyecto, index) => (
            <ProjectCard 
              key={proyecto.id} 
              project={proyecto} 
              index={index} 
              onDelete={handleDeleteProject}
            />
          ))}

          {/* Tarjeta de Agregar Proyecto Rápido */}
          <Link href="/proyectos/nuevo" className="group flex flex-col items-center justify-center bg-transparent rounded-[20px] border-2 border-dashed border-[#d2c4bb] hover:border-[#845326] hover:bg-[#FDFBF9] transition-all min-h-[250px] cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-[#f5e5d9] group-hover:bg-[#E8DCD1] text-[#845326] flex items-center justify-center mb-4 transition-colors">
              <Plus className="size-6" />
            </div>
            <span className="font-bold text-[#845326] group-hover:text-[#433022] transition-colors">
              Nuevo Proyecto
            </span>
          </Link>

        </div>
      )}
    </div>
  );
}
