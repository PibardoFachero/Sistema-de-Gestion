'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Loader2, Brain, AlertCircle, Award } from 'lucide-react';
import {
  generateQuizAction,
  QuizQuestion,
  markTaskQuizPassedAction,
} from '@/features/certifications/actions/generateQuizAction';
import { cn } from '@/lib/utils';

interface QuizModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (taskId: string) => void;
  hasFullName: boolean;
}

export function QuizModal({ taskId, isOpen, onClose, onSuccess, hasFullName }: QuizModalProps) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<'name' | 'loading' | 'quiz' | 'evaluating' | 'error'>('loading');
  const [fullNameInput, setFullNameInput] = useState('');

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  // Render-time state reset when modal opens or taskId changes
  const [prevTaskId, setPrevTaskId] = useState<string | null>(null);
  if (isOpen && taskId && prevTaskId !== taskId) {
    setPrevTaskId(taskId);
    setStep(hasFullName ? 'loading' : 'name');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setError(null);
    setIsFallback(false);
  } else if (!isOpen && prevTaskId !== null) {
    setPrevTaskId(null);
  }

  const fetchQuiz = useCallback(
    (forceFallback = false) => {
      if (!taskId) return;
      startTransition(async () => {
        setError(null);
        setStep('loading');
        const res = await generateQuizAction({ taskId, forceFallback });
        if (res.success && res.questions && res.questions.length > 0) {
          setQuestions(res.questions);
          setIsFallback(Boolean(res.isFallback));
          setStep('quiz');
        } else {
          setError(res.error || 'No se pudo generar el cuestionario con IA.');
          setStep('error');
        }
      });
    },
    [taskId],
  );

  useEffect(() => {
    if (
      isOpen &&
      taskId &&
      hasFullName &&
      step === 'loading' &&
      questions.length === 0 &&
      !error &&
      !isPending
    ) {
      fetchQuiz();
    }
  }, [isOpen, taskId, hasFullName, step, questions.length, error, isPending, fetchQuiz]);

  const handleSaveName = async () => {
    if (fullNameInput.trim().length < 3) {
      setError('Por favor, ingresa tu nombre completo real para el certificado.');
      return;
    }
    setError(null);
    setStep('loading');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ nombre_completo: fullNameInput.trim() })
        .eq('id', user.id);
    }

    fetchQuiz();
  };

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((c) => c + 1);
    } else {
      evaluateQuiz();
    }
  };

  const evaluateQuiz = () => {
    if (!taskId) return;
    setStep('evaluating');
    startTransition(async () => {
      let score = 0;
      questions.forEach((q, i) => {
        if (selectedAnswers[i] === q.correctAnswerIndex) score++;
      });

      // 75% para aprobar (ej: 3 de 4)
      const passingScore = Math.ceil(questions.length * 0.75);
      if (score >= passingScore) {
        const res = await markTaskQuizPassedAction(taskId);
        if (res.success) {
          onSuccess(taskId);
        } else {
          setError(res.error || 'Aprobaste, pero no se pudo guardar tu progreso.');
          setStep('quiz');
        }
      } else {
        setError(
          `Obtuviste ${score} de ${questions.length}. Necesitas al menos ${passingScore} correctas para aprobar. Vuelve a estudiar el tema e inténtalo luego.`,
        );
        setStep('quiz');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Brain className="size-5" />
            Evaluación de Certificación
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container transition-colors text-outline"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto flex flex-col min-h-[300px]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex gap-2 items-start">
              <AlertCircle className="size-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {step === 'name' && (
            <div className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4">
              <div className="mx-auto w-16 h-16 bg-accent-amber/10 rounded-full flex items-center justify-center mb-6 text-accent-amber">
                <Award className="size-8" />
              </div>
              <h2 className="text-xl font-bold text-center text-on-surface mb-2">
                Nombre para tu Certificado
              </h2>
              <p className="text-center text-sm text-on-surface-variant mb-6">
                Notamos que no has configurado tu nombre legal. Ingresa tu nombre completo real tal
                y como quieres que aparezca impreso en tu certificado.
              </p>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Ej. María Pérez García"
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary mb-6"
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={fullNameInput.length < 3 || isPending}
                className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-5 animate-spin mx-auto" />
                ) : (
                  'Guardar y Continuar'
                )}
              </button>
            </div>
          )}

          {(step === 'loading' || step === 'evaluating') && (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in">
              <Loader2 className="size-10 animate-spin text-primary mb-4" />
              <h2 className="text-lg font-bold text-on-surface">
                {step === 'loading'
                  ? 'Generando evaluación personalizada...'
                  : 'Evaluando tus respuestas...'}
              </h2>
              <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
                {step === 'loading'
                  ? 'Komorebi está estructurando las preguntas basadas en la tarea que realizaste.'
                  : 'Validando tus respuestas para acreditar la tarea...'}
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in p-2">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mb-4">
                <Brain className="size-7" />
              </div>
              <h2 className="text-lg font-bold text-on-surface mb-2">
                Servicio de IA de Gemini Ocupado
              </h2>
              <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
                El modelo de Google Gemini se encuentra con alta demanda temporal o saturación de
                cuota. Puedes reintentar la conexión con la IA o realizar de inmediato el
                cuestionario de contingencia académica para no frenar tu avance.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => fetchQuiz(false)}
                  disabled={isPending}
                  className="flex-1 py-3 px-4 border border-outline-variant bg-white hover:bg-surface-container text-on-surface rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Reintentar con IA
                </button>
                <button
                  type="button"
                  onClick={() => fetchQuiz(true)}
                  disabled={isPending}
                  className="flex-1 py-3 px-4 bg-primary text-on-primary hover:bg-primary/90 rounded-xl font-bold text-sm transition-colors cursor-pointer shadow-sm"
                >
                  Cuestionario Rápido
                </button>
              </div>
            </div>
          )}

          {step === 'quiz' && questions.length > 0 && (
            <div className="flex-1 flex flex-col animate-in slide-in-from-right-4 min-h-0">
              {isFallback && (
                <div className="mb-4 px-3.5 py-2 bg-amber-50/80 border border-amber-200/70 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2 shrink-0">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                    Modo contingencia activo: Evaluación estructurada sobre los objetivos del tema.
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchQuiz(false)}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 shrink-0"
                  >
                    Usar IA
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-bold text-outline uppercase tracking-wider mb-6 shrink-0">
                <span>
                  Pregunta {currentQuestionIndex + 1} de {questions.length}
                </span>
                <span className="text-primary">
                  {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                </span>
              </div>

              <h2 className="text-lg font-bold text-on-surface mb-6 leading-relaxed shrink-0">
                {questions[currentQuestionIndex].question}
              </h2>

              <div className="flex flex-col gap-3 mb-6 flex-1 overflow-y-auto pr-1 min-h-0">
                {questions[currentQuestionIndex].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    className={cn(
                      'text-left p-4 rounded-xl border transition-all duration-200 text-sm',
                      selectedAnswers[currentQuestionIndex] === idx
                        ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-surface-container-low',
                    )}
                  >
                    <div className="flex gap-3 items-start">
                      <div
                        className={cn(
                          'mt-0.5 size-4 rounded-full border shrink-0 flex items-center justify-center transition-colors',
                          selectedAnswers[currentQuestionIndex] === idx
                            ? 'border-primary bg-primary'
                            : 'border-outline',
                        )}
                      >
                        {selectedAnswers[currentQuestionIndex] === idx && (
                          <div className="size-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span>{opt}</span>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={selectedAnswers[currentQuestionIndex] === undefined || isPending}
                className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2 shrink-0 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : currentQuestionIndex === questions.length - 1 ? (
                  'Enviar Respuestas'
                ) : (
                  'Siguiente Pregunta'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
