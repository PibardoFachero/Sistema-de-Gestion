'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';

export interface OnboardingQuestion {
  id: number;
  question: string;
  chiwiSpeech: string;
  options: string[];
}

export const onboardingData: OnboardingQuestion[] = [
  {
    id: 1,
    question: "¿Cuál es tu rol o condición actual?",
    chiwiSpeech: "yo soy un chiwire autodidacta",
    options: [
      "Estudiante de bachillerato",
      "Estudiante universitario",
      "Autodidacta",
      "Profesional independiente"
    ]
  },
  {
    id: 2,
    question: "¿Cuál es tu edad?",
    chiwiSpeech: "yo tengo 5 años de chiwire",
    options: [
      "Menos de 18",
      "Entre 18 y 25 años",
      "26 años o más"
    ]
  },
  {
    id: 3,
    question: "¿Cuál es tu situación laboral u ocupación actual?",
    chiwiSpeech: "Mi trabajo es ser tu tutor ¡Me Chiwiencanta!",
    options: [
      "Solo estudio",
      "Solo trabajo",
      "Estudio y trabajo",
      "Ninguna de las anteriores"
    ]
  },
  {
    id: 4,
    question: "¿Qué tipo de esquema de horarios tienes en tu ocupación principal?",
    chiwiSpeech: "Yo siempre estare disponible en tu horario, porque soy tu chiwire de confianza",
    options: [
      "Jornada completa",
      "Media jornada",
      "Jornada nocturna",
      "Horario rotativo, flexible o impredecible"
    ]
  },
  {
    id: 5,
    question: "¿Cuánto tiempo diario tienes disponible para dedicar a tus proyectos de estudio?",
    chiwiSpeech: "Chiwitastico, espero que pasemos mucho tiempo juntos",
    options: [
      "Entre 30 a 60 minutos al día",
      "Entre 1 a 2 horas al día",
      "Entre 2 a 4 horas al día",
      "Más de 4 horas al día"
    ]
  },
  {
    id: 6,
    question: "¿Qué técnica o metodología de aprendizaje prefieres utilizar inicialmente?",
    chiwiSpeech: "Tu no te preocupes este chiwire te enseñara a cumplir tus metas con tecnicas reales de estudio, sino mirame a mi que soy tutor",
    options: [
      "Técnica Pomodoro",
      "Bloques de Tiempo",
      "Técnica Feynman",
      "No tengo experiencia previa con estas técnicas"
    ]
  },
  {
    id: 7,
    question: "¿Cuál es tu nivel de experiencia previa estructurando planes de estudio?",
    chiwiSpeech: "Chiwires somos tu y yo. A darle a esos proyectos. Animo!!",
    options: [
      "Básico (Me cuesta organizarme y suelo procrastinar)",
      "Intermedio (Uso listas de tareas, pero no siempre las cumplo)",
      "Avanzado (Tengo buena disciplina, pero busco optimizar mi rendimiento)"
    ]
  }
];

export function OnboardingSurvey() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  const totalSteps = onboardingData.length;
  const currentQuestion = onboardingData[currentStep];
  const selectedAnswer = answers[currentQuestion.id];
  const progressPercent = Math.round(((currentStep + 1) / totalSteps) * 100);

  const handleSelectOption = (option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

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

  const handleComplete = () => {
    setIsFinishing(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('komorebi_onboarding_answers', JSON.stringify(answers));
      localStorage.setItem('komorebi_onboarding_completed', 'true');
    }
    setTimeout(() => {
      router.push('/');
    }, 800);
  };

  return (
    <div className="w-[90%] max-w-[1050px] min-h-[80vh] mx-auto flex items-center justify-center py-6 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center justify-items-center w-full">
        
        {/* ========================================================
            COLUMNA IZQUIERDA: Persistente (Mr. Chiwi & Diálogo)
        ======================================================== */}
        <div className="flex flex-col items-center text-center w-full max-w-[420px]">
          
          {/* Títulos superiores manuscritos */}
          <div className="mb-4">
            <h1 className="font-handwriting text-3xl sm:text-4xl font-bold text-[#2C1F14] tracking-wide leading-tight">
              Hola Me llamo Mr Chiwi
            </h1>
            <p className="font-handwriting text-xl sm:text-2xl text-[#845326] font-semibold mt-0.5">
              Quiero Conocerte Mejor
            </p>
          </div>

          {/* Nube de Pensamiento Óvalo Perfecto */}
          <div className="relative w-full max-w-[380px] mb-6 z-10">
            <div className="relative bg-white border-2 border-[#1A1A1A] rounded-[100px] px-9 py-6 min-h-[100px] flex items-center justify-center text-center shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-300">
              <p
                key={currentStep}
                className="font-handwriting text-xl sm:text-2xl text-[#1A1A1A] font-bold leading-snug animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                &ldquo;{currentQuestion.chiwiSpeech}&rdquo;
              </p>
            </div>

            {/* Círculo superior mediano (22px x 22px) */}
            <div
              className="absolute rounded-full bg-white border-2 border-[#1A1A1A]"
              style={{
                width: '22px',
                height: '22px',
                bottom: '-10px',
                left: '52px',
              }}
            />

            {/* Círculo inferior pequeño (14px x 14px) */}
            <div
              className="absolute rounded-full bg-white border-2 border-[#1A1A1A]"
              style={{
                width: '14px',
                height: '14px',
                bottom: '-22px',
                left: '38px',
              }}
            />
          </div>

          {/* Slot del Personaje (.character-slot) */}
          <div className="character-slot relative w-44 h-44 sm:w-52 sm:h-52 mt-3 flex items-center justify-center">
            <div className="relative w-full h-full motion-safe:animate-[chigui-float_4s_ease-in-out_infinite]">
              <Image
                src="/images/mascot/chigui-welcome.png"
                alt="Mr. Chiwi Tutor"
                fill
                priority
                className="object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMNA DERECHA: Tarjeta de Preguntas Compacta (Login Style)
        ======================================================== */}
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

            {/* Pregunta Actual */}
            <div className="mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-[#2C1F14] leading-snug tracking-tight">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Opciones de Respuesta (Botones) */}
            <div className="space-y-2.5 mb-6">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full rounded-[16px] py-3 px-[18px] text-left text-sm sm:text-base flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F5EFE9] border-[1.5px] border-[#2C1F14] text-[#2C1F14] font-semibold shadow-xs'
                        : 'bg-white border-[1.5px] border-[#E2D9D0] text-[#2C1F14] hover:bg-[#F5EFE9] hover:border-[#2C1F14]'
                    }`}
                  >
                    <span className="pr-3 leading-snug">{option}</span>
                    <span
                      className={`size-5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                        isSelected
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

            {/* Botones de Navegación Inferior */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EAE3DC]">
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
                disabled={!selectedAnswer || isFinishing}
                className="rounded-[25px] bg-[#2C1F14] hover:bg-[#433022] text-white px-6 py-2.5 font-semibold text-xs sm:text-sm shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                {isFinishing ? (
                  <span>Guardando...</span>
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
