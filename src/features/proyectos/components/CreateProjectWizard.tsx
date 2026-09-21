'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Loader2,
  UploadCloud,
  Link as LinkIcon,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { createProjectAction } from '@/features/proyectos/actions/proyectoActions';

interface StepMaterials {
  files: string[];
  urls: string[];
}

interface StepDailyTime {
  mainOption?: string;
  subOption?: string;
}

type WizardAnswers = {
  0?: string;
  1?: string;
  2?: string;
  3?: string;
  4?: string;
  5?: StepMaterials;
  6?: StepDailyTime;
};

export function CreateProjectWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicializar tiempo de onboarding desde localStorage sin llamar setState en useEffect
  const [onboardingTime] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('komorebi_onboarding_answers');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed[5]) {
            return String(parsed[5]);
          }
        }
      } catch (e) {
        console.error('Error parsing onboarding answers', e);
      }
    }
    return 'unas horas';
  });

  const totalSteps = 7;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);
  const todayStr = new Date().toISOString().split('T')[0];

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const calculateDailyMinutes = (ans6?: StepDailyTime): number => {
    if (!ans6?.mainOption) return 30;
    if (ans6.mainOption === 'Menos de 1 hora diaria') {
      if (ans6.subOption === 'Menos de 30 minutos') return 20;
      if (ans6.subOption === '30 minutos') return 30;
      if (ans6.subOption === 'Más de 30 minutos') return 45;
      return 30;
    }
    if (ans6.mainOption === 'Entre 1 a 2 horas') return 90;
    if (ans6.mainOption === 'Más de 2 horas') return 150;
    return 30;
  };

  const handleComplete = async () => {
    setIsFinishing(true);
    setErrorMessage(null);

    try {
      // 1. Preparar material_url con URLs y nombres de hasta 3 archivos
      const filesNames = (answers[5]?.files || []).filter(Boolean);
      const validUrls = (answers[5]?.urls || []).filter(
        (u: string) => typeof u === 'string' && u.trim().length > 0,
      );
      const materialParts: string[] = [];
      if (validUrls.length > 0) {
        materialParts.push(`URLs: ${validUrls.join(', ')}`);
      }
      if (filesNames.length > 0) {
        materialParts.push(`Archivos: ${filesNames.join(', ')}`);
      }
      const materialUrl = materialParts.join(' | ') || (validUrls[0] ?? '');

      const dailyMinutes = calculateDailyMinutes(answers[6]);

      // 2. Guardar en Supabase usando la Server Action
      const result = await createProjectAction({
        titulo: answers[0]?.trim() || 'Proyecto Sin Nombre',
        objetivo: answers[1]?.trim() || '',
        fecha_limite: answers[2] || '',
        prioridad: answers[3] || 'Prioritario',
        nivel_conocimiento: answers[4] || '',
        material_url: materialUrl || undefined,
        minutos_diarios: dailyMinutes,
      });

      if (!result.success || !result.project) {
        throw new Error(result.error || 'Error al guardar el proyecto en Supabase');
      }

      const createdProject = result.project;

      // 3. Sincronizar localStorage para compatibilidad inmediata con componentes clientes (como SidebarNav)
      if (typeof window !== 'undefined') {
        const existing = localStorage.getItem('komorebi_projects');
        const projects = existing ? JSON.parse(existing) : [];
        projects.unshift({
          id: createdProject.id,
          name: createdProject.titulo,
          importance: createdProject.prioridad,
          tasksCount: 0,
          progress: 0,
          createdAt: createdProject.fecha_limite || new Date().toISOString(),
        });
        localStorage.setItem('komorebi_projects', JSON.stringify(projects));
        window.dispatchEvent(new Event('projects_updated'));
      }

      router.push(`/proyectos/${createdProject.id}`);
    } catch (error: unknown) {
      console.error('Error creating project:', error);
      const msg = error instanceof Error ? error.message : 'No fue posible crear el proyecto.';
      setErrorMessage(msg);
      setIsFinishing(false);
    }
  };

  const updateAnswer = <K extends keyof WizardAnswers>(step: K, value: WizardAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [step]: value }));
  };

  // Validadores para habilitar "Siguiente"
  const canGoNext = () => {
    switch (currentStep) {
      case 0:
        return !!answers[0] && answers[0].trim().length > 0 && answers[0].length <= 50;
      case 1:
        return !!answers[1] && answers[1].trim().length > 0 && answers[1].length <= 250;
      case 2:
        return !!answers[2] && answers[2] >= todayStr;
      case 3:
        return !!answers[3];
      case 4:
        return !!answers[4];
      case 5:
        return true;
      case 6:
        if (!answers[6]?.mainOption) return false;
        if (answers[6].mainOption === 'Menos de 1 hora diaria' && !answers[6]?.subOption) {
          return false;
        }
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              ¿Cuál será el nombre del proyecto?
            </h2>
            <input
              type="text"
              className="w-full p-4 rounded-2xl border-[1.5px] border-[#E2D9D0] bg-white text-[#2C1F14] placeholder-[#A0958A] focus:border-[#2C1F14] focus:ring-0 outline-none transition-all"
              placeholder="Ej. Mi Curso de Python, Rediseño Web..."
              value={answers[0] || ''}
              maxLength={50}
              onChange={(e) => updateAnswer(0, e.target.value)}
            />
            <p className="mt-2 text-right text-xs text-[#845326] font-medium">
              {(answers[0] || '').length}/50
            </p>
          </div>
        );
      case 1:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              ¿Cuál es el objetivo final de este proyecto?
            </h2>
            <textarea
              className="w-full h-32 p-4 rounded-2xl border-[1.5px] border-[#E2D9D0] bg-white text-[#2C1F14] placeholder-[#A0958A] focus:border-[#2C1F14] focus:ring-0 outline-none resize-none transition-all"
              placeholder="Ej. Aprender Next.js para conseguir un trabajo como desarrollador frontend..."
              value={answers[1] || ''}
              maxLength={250}
              onChange={(e) => updateAnswer(1, e.target.value)}
            />
            <p className="mt-2 text-right text-xs text-[#845326] font-medium">
              {(answers[1] || '').length}/250
            </p>
          </div>
        );
      case 2:
        const isPastDate = answers[2] && answers[2] < todayStr;
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              Fecha límite para terminar el proyecto
            </h2>
            <input
              type="date"
              min={todayStr}
              className={`w-full p-4 rounded-2xl border-[1.5px] bg-white text-[#2C1F14] focus:ring-0 outline-none transition-all ${isPastDate
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-[#E2D9D0] focus:border-[#2C1F14]'
                }`}
              value={answers[2] || ''}
              onChange={(e) => updateAnswer(2, e.target.value)}
            />
            {isPastDate ? (
              <p className="mt-2.5 text-xs text-red-600 font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                La fecha límite no puede ser anterior al día de creación.
              </p>
            ) : (
              <p className="mt-3 text-sm text-[#845326]">
                * Esta fecha nos ayudará a evaluar la viabilidad de tus metas.
              </p>
            )}
          </div>
        );
      case 3: {
        const options = ['Obligatorio', 'Prioritario', 'Hobby'];
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              ¿Qué nivel de importancia tiene este proyecto en tu día a día?
            </h2>
            <div className="space-y-3">
              {options.map((opt) => {
                const isSelected = answers[3] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => updateAnswer(3, opt)}
                    className={`w-full rounded-[16px] py-4 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                      }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${isSelected
                          ? 'border-[#2C1F14] bg-[#2C1F14] text-white'
                          : 'border-[#E2D9D0] bg-transparent'
                        }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case 4: {
        const options = [
          'Ninguno (Parto desde cero absoluto).',
          'Básico (Conozco la teoría o algunos conceptos sueltos).',
          'Intermedio (Ya he practicado, pero necesito profundizar o estructurarme).',
        ];
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              ¿Cuál es tu nivel de conocimiento actual sobre este tema específico?
            </h2>
            <div className="space-y-3">
              {options.map((opt) => {
                const isSelected = answers[4] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => updateAnswer(4, opt)}
                    className={`w-full rounded-[16px] py-4 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                      }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${isSelected
                          ? 'border-[#2C1F14] bg-[#2C1F14] text-white'
                          : 'border-[#E2D9D0] bg-transparent'
                        }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      case 5: {
        const currentData = answers[5] || { files: [], urls: [''] };
        const files: string[] = currentData.files || [];
        const urls: string[] =
          currentData.urls && currentData.urls.length > 0 ? currentData.urls : [''];

        const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const selectedFiles = e.target.files;
          if (!selectedFiles) return;

          const newFileNames = Array.from(selectedFiles).map((f) => f.name);
          const combined = [...files, ...newFileNames].slice(0, 3);
          updateAnswer(5, { ...currentData, files: combined });
        };

        const handleRemoveFile = (indexToRemove: number) => {
          const updated = files.filter((_, idx) => idx !== indexToRemove);
          updateAnswer(5, { ...currentData, files: updated });
        };

        const handleUrlChange = (index: number, val: string) => {
          const updated = [...urls];
          updated[index] = val;
          updateAnswer(5, { ...currentData, urls: updated });
        };

        const handleAddUrl = () => {
          updateAnswer(5, { ...currentData, urls: [...urls, ''] });
        };

        const handleRemoveUrl = (indexToRemove: number) => {
          const updated = urls.filter((_, idx) => idx !== indexToRemove);
          updateAnswer(5, { ...currentData, urls: updated.length > 0 ? updated : [''] });
        };

        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              ¿Tienes algún material base, índice de libro o temario que debamos seguir?
            </h2>

            <div className="space-y-5">
              {/* Sección Subida de Archivos (Máx 3) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-[#2C1F14]">Archivos adjuntos</label>
                  <span className="text-xs font-semibold text-[#845326] bg-[#f5e5d9] px-2 py-0.5 rounded-full">
                    {files.length}/3 archivos
                  </span>
                </div>

                {files.length < 3 ? (
                  <div className="border-2 border-dashed border-[#E2D9D0] rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-[#FDFBF9] hover:bg-[#F5EFE9] transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      multiple
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                    <UploadCloud className="size-7 text-[#845326] mb-1.5" />
                    <p className="text-sm font-semibold text-[#2C1F14]">
                      Haz click o arrastra tus archivos aquí
                    </p>
                    <p className="text-xs text-[#845326] mt-0.5">
                      PDF, DOCX, TXT (Máx. 3 archivos)
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-[#FDFBF9] border border-[#E2D9D0] rounded-xl text-center text-xs font-semibold text-[#845326]">
                    Has alcanzado el límite de 3 archivos adjuntos.
                  </div>
                )}

                {/* Lista de archivos cargados */}
                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 px-3 bg-white border border-[#E2D9D0] rounded-xl text-xs"
                      >
                        <span className="truncate max-w-[280px] font-medium text-[#2C1F14]">
                          {file}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors cursor-pointer"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sección URLs Dinámicas */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-[#2C1F14] mb-2">
                  <LinkIcon className="size-4 text-[#845326]" /> Enlaces y URLs de referencia
                </label>

                <div className="space-y-2.5">
                  {urls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/temario"
                        className="flex-1 p-3 rounded-xl border-[1.5px] border-[#E2D9D0] bg-white text-[#2C1F14] placeholder-[#A0958A] focus:border-[#2C1F14] focus:ring-0 outline-none text-sm transition-all"
                        value={url}
                        onChange={(e) => handleUrlChange(idx, e.target.value)}
                      />
                      {urls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveUrl(idx)}
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
                  onClick={handleAddUrl}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#845326] hover:text-[#433022] bg-[#f5e5d9] hover:bg-[#E8DCD1] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Añadir otra URL</span>
                </button>
              </div>
            </div>
          </div>
        );
      }
      case 6: {
        const mainOptions = ['Menos de 1 hora diaria', 'Entre 1 a 2 horas', 'Más de 2 horas'];
        const subOptions = ['Menos de 30 minutos', '30 minutos', 'Más de 30 minutos'];
        const currentData = answers[6] || {};

        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              En la encuesta indicaste que tienes{' '}
              <span className="text-[#845326]">{onboardingTime}</span> libres al día. ¿Cuánto de ese
              tiempo puedes dedicarle a este proyecto?
            </h2>
            <div className="space-y-3 mb-6">
              {mainOptions.map((opt) => {
                const isSelected = currentData.mainOption === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      updateAnswer(6, {
                        mainOption: opt,
                        subOption: opt !== 'Menos de 1 hora diaria' ? '' : currentData.subOption,
                      });
                    }}
                    className={`w-full rounded-[16px] py-4 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                      }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${isSelected
                          ? 'border-[#2C1F14] bg-[#2C1F14] text-white'
                          : 'border-[#E2D9D0] bg-transparent'
                        }`}
                    >
                      {isSelected && <Check className="size-3 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {currentData.mainOption === 'Menos de 1 hora diaria' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-[#FDFBF9] border border-[#EAE3DC] rounded-2xl">
                <p className="text-sm font-semibold text-[#2C1F14] mb-3">¿Cuántos minutos?</p>
                <div className="space-y-2">
                  {subOptions.map((sub) => {
                    const isSubSelected = currentData.subOption === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => updateAnswer(6, { ...currentData, subOption: sub })}
                        className={`w-full rounded-[12px] py-2 px-4 text-left text-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${isSubSelected
                            ? 'bg-white border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold'
                            : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14]'
                          }`}
                      >
                        <span>{sub}</span>
                        {isSubSelected && <Check className="size-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="w-[90%] max-w-[1050px] min-h-[80vh] mx-auto flex flex-col justify-center py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center justify-items-center w-full">
        {/* COLUMNA IZQUIERDA: Persistente */}
        <div className="flex flex-col items-center text-center w-full max-w-[420px]">
          <div className="mb-6">
            <h1 className="font-handwriting text-3xl sm:text-4xl font-bold text-[#2C1F14] tracking-wide leading-tight">
              Atrévete a Cumplir Tus Metas
            </h1>
            <p className="font-handwriting text-xl sm:text-2xl text-[#845326] font-semibold mt-1">
              Trazamos tu Nuevo Camino
            </p>
          </div>

          <div className="character-slot relative w-56 h-56 sm:w-64 sm:h-64 mt-3 flex items-center justify-center">
            <div className="relative w-full h-full motion-safe:animate-[chigui-float_4s_ease-in-out_infinite]">
              <Image
                src="/images/mascot/imagendechiwiconcafe.png"
                alt="Mr. Chiwi con Café"
                fill
                priority
                className="object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Formulario / Preguntas */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[480px] bg-white border border-[#EAE3DC] rounded-[20px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all relative">
            {/* Encabezado e Indicador de Progreso */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E8DCD1] text-xs font-semibold text-[#2C1F14] uppercase tracking-wider">
                  Paso {currentStep + 1} de {totalSteps}
                </span>
                <span className="text-xs font-bold text-[#2C1F14]/70">{progressPercent}%</span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-2 rounded-full bg-[#E8DCD1]/50 overflow-hidden">
                <div
                  className="h-full bg-[#2C1F14] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Mensaje de error si falla la creación */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Contenido Dinámico de la Pregunta */}
            <div className="min-h-[280px]">{renderStepContent()}</div>

            {/* Botones de Navegación Inferior */}
            <div className="flex items-center justify-between pt-6 mt-2 border-t border-[#EAE3DC]">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="rounded-[25px] bg-[#E8DCD1] hover:bg-[#dfd1c4] text-[#2C1F14] px-5 py-2.5 font-semibold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 active:scale-[0.99] cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext() || isFinishing}
                className="rounded-[25px] bg-[#2C1F14] hover:bg-[#433022] text-white px-6 py-2.5 font-semibold text-xs sm:text-sm shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Creando tareas...</span>
                  </>
                ) : currentStep === totalSteps - 1 ? (
                  <>
                    <span>Finalizar</span>
                    <Sparkles className="size-3.5 text-[#FEB800]" />
                  </>
                ) : (
                  <>
                    <span>Siguiente</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Volver a Proyectos abajo a la izquierda en el recuadro general */}
      <div className="mt-8 flex justify-start w-full">
        <button
          type="button"
          onClick={() => router.push('/proyectos')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-[#845326] bg-[#f5e5d9] hover:bg-[#E8DCD1] hover:text-[#433022] transition-all shadow-xs cursor-pointer active:scale-95"
          aria-label="Volver a Proyectos"
        >
          <ArrowLeft className="size-4" />
          <span>Volver a Proyectos</span>
        </button>
      </div>
    </div>
  );
}
