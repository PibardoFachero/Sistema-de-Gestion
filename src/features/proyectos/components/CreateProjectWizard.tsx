'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2, UploadCloud, Link as LinkIcon } from 'lucide-react';

export function CreateProjectWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [onboardingTime, setOnboardingTime] = useState<string>('unas horas');

  const totalSteps = 7;
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  useEffect(() => {
    // Leer respuestas previas de onboarding para la pregunta 6
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('komorebi_onboarding_answers');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed[5]) {
            setOnboardingTime(parsed[5]);
          }
        } catch (e) {
          console.error('Error parsing onboarding answers', e);
        }
      }
    }
  }, []);

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

  const handleComplete = async () => {
    setIsFinishing(true);
    // Simular guardado
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Crear el objeto del nuevo proyecto
    const newProject = {
      id: Date.now().toString(),
      name: answers[0] || 'Proyecto Sin Nombre',
      objective: answers[1] || '',
      deadline: answers[2] || '',
      importance: answers[3] || 'Normal',
      knowledge: answers[4] || '',
      materials: answers[5] || {},
      time: answers[6] || {},
      tasksCount: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('komorebi_projects');
      const projects = existing ? JSON.parse(existing) : [];
      projects.push(newProject);
      localStorage.setItem('komorebi_projects', JSON.stringify(projects));
    }
    
    router.push('/proyectos');
    router.refresh();
  };

  const updateAnswer = (step: number, value: any) => {
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
        return !!answers[2];
      case 3:
        return !!answers[3];
      case 4:
        return !!answers[4];
      case 5:
        // Opcional, o requiere al menos uno? El prompt no dice que sea obligatorio.
        // Lo dejaremos siempre habilitado para avanzar.
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
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              Fecha límite para terminar el proyecto
            </h2>
            <input
              type="date"
              className="w-full p-4 rounded-2xl border-[1.5px] border-[#E2D9D0] bg-white text-[#2C1F14] focus:border-[#2C1F14] focus:ring-0 outline-none transition-all"
              value={answers[2] || ''}
              onChange={(e) => updateAnswer(2, e.target.value)}
            />
            <p className="mt-3 text-sm text-[#845326]">
              * Esta fecha nos ayudará a evaluar la viabilidad de tus metas.
            </p>
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
                    className={`w-full rounded-[16px] py-4 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                    }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        isSelected ? 'border-[#2C1F14] bg-[#2C1F14] text-white' : 'border-[#E2D9D0] bg-transparent'
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
          'Intermedio (Ya he practicado, pero necesito profundizar o estructurarme).'
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
                    className={`w-full rounded-[16px] py-4 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                    }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        isSelected ? 'border-[#2C1F14] bg-[#2C1F14] text-white' : 'border-[#E2D9D0] bg-transparent'
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
        const currentData = answers[5] || { files: null, url: '' };
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight mb-5">
              ¿Tienes algún material base, índice de libro o temario que debamos seguir?
            </h2>
            
            <div className="space-y-5">
              <div className="border-2 border-dashed border-[#E2D9D0] rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-[#FDFBF9] hover:bg-[#F5EFE9] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files) {
                      updateAnswer(5, { ...currentData, files: Array.from(files).map(f => f.name).join(', ') });
                    }
                  }}
                />
                <UploadCloud className="size-8 text-[#845326] mb-2" />
                <p className="text-sm font-semibold text-[#2C1F14]">
                  {currentData.files ? currentData.files : 'Sube tus archivos aquí'}
                </p>
                <p className="text-xs text-[#845326] mt-1">PDF, DOCX, TXT</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-[#2C1F14] mb-2">
                  <LinkIcon className="size-4" /> O añade una URL de referencia
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/temario"
                  className="w-full p-4 rounded-2xl border-[1.5px] border-[#E2D9D0] bg-white text-[#2C1F14] focus:border-[#2C1F14] focus:ring-0 outline-none transition-all"
                  value={currentData.url || ''}
                  onChange={(e) => updateAnswer(5, { ...currentData, url: e.target.value })}
                />
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
              En la encuesta indicaste que tienes <span className="text-[#845326]">{onboardingTime}</span> libres al día. ¿Cuánto de ese tiempo puedes dedicarle a este proyecto?
            </h2>
            <div className="space-y-3 mb-6">
              {mainOptions.map((opt) => {
                const isSelected = currentData.mainOption === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      updateAnswer(6, { mainOption: opt, subOption: opt !== 'Menos de 1 hora diaria' ? '' : currentData.subOption });
                    }}
                    className={`w-full rounded-[16px] py-4 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                    }`}
                  >
                    <span>{opt}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        isSelected ? 'border-[#2C1F14] bg-[#2C1F14] text-white' : 'border-[#E2D9D0] bg-transparent'
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
                        className={`w-full rounded-[12px] py-2 px-4 text-left text-sm flex items-center justify-between transition-all duration-200 cursor-pointer ${
                          isSubSelected
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
    <div className="w-[90%] max-w-[1050px] min-h-[80vh] mx-auto flex items-center justify-center py-6 sm:py-10">
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
          <div className="w-full max-w-[480px] bg-white border border-[#EAE3DC] rounded-[20px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all">
            
            {/* Encabezado e Indicador de Progreso */}
            <div className="space-y-2.5 mb-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E8DCD1] text-xs font-semibold text-[#2C1F14] uppercase tracking-wider">
                  Paso {currentStep + 1} de {totalSteps}
                </span>
                <span className="text-xs font-bold text-[#2C1F14]/70">
                  {progressPercent}%
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-2 rounded-full bg-[#E8DCD1]/50 overflow-hidden">
                <div
                  className="h-full bg-[#2C1F14] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Contenido Dinámico de la Pregunta */}
            <div className="min-h-[280px]">
              {renderStepContent()}
            </div>

            {/* Botones de Navegación Inferior */}
            <div className="flex items-center justify-between pt-6 mt-2 border-t border-[#EAE3DC]">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="rounded-[25px] bg-[#E8DCD1] hover:bg-[#dfd1c4] text-[#2C1F14] px-5 py-2.5 font-semibold text-xs sm:text-sm transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 active:scale-[0.99]"
              >
                <ArrowLeft className="size-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext() || isFinishing}
                className="rounded-[25px] bg-[#2C1F14] hover:bg-[#433022] text-white px-6 py-2.5 font-semibold text-xs sm:text-sm shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Guardando...</span>
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
    </div>
  );
}
