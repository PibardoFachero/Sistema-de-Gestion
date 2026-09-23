'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { STUDY_TECHNIQUES, StudyTechnique } from '@/features/study-methods/data/techniques';

export type SessionPhase = 'idle' | 'focus' | 'break' | 'longBreak';

export interface FocusSessionState {
  isActive: boolean;
  isPlaying: boolean;
  phase: SessionPhase;
  timeLeft: number;
  totalDuration: number;
  cycleCount: number;
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  technique: StudyTechnique | null;
}

interface FocusSessionContextType extends FocusSessionState {
  startSession: (techniqueId: string, taskId?: string, taskTitle?: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  skipPhase: () => void;
  attachTask: (taskId: string, taskTitle: string) => void;
}

const FocusSessionContext = createContext<FocusSessionContextType | undefined>(undefined);

export function FocusSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FocusSessionState>({
    isActive: false,
    isPlaying: false,
    phase: 'idle',
    timeLeft: 0,
    totalDuration: 0,
    cycleCount: 0,
    activeTaskId: null,
    activeTaskTitle: null,
    technique: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.isActive && state.isPlaying && state.timeLeft > 0) {
      interval = setInterval(() => {
        setState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (state.isActive && state.isPlaying && state.timeLeft === 0) {
      handlePhaseComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isActive, state.isPlaying, state.timeLeft]);

  const handlePhaseComplete = useCallback(() => {
    const s = stateRef.current;
    if (!s.technique) return;

    if (s.phase === 'focus') {
      const nextCycle = s.cycleCount + 1;
      const isLongBreak = nextCycle % s.technique.cyclesBeforeLongBreak === 0;
      const nextPhase = isLongBreak ? 'longBreak' : 'break';
      const duration = isLongBreak ? s.technique.longBreakMinutes * 60 : s.technique.breakMinutes * 60;

      setState((prev) => ({
        ...prev,
        phase: nextPhase,
        cycleCount: nextCycle,
        timeLeft: duration,
        totalDuration: duration,
        isPlaying: false, // Wait for user to start break
      }));
      // Play sound notification here if needed
    } else {
      // Break is over, back to focus
      const duration = s.technique.focusMinutes * 60;
      setState((prev) => ({
        ...prev,
        phase: 'focus',
        timeLeft: duration,
        totalDuration: duration,
        isPlaying: false, // Wait for user to start next focus session
      }));
    }
  }, []);

  const startSession = useCallback((techniqueId: string, taskId?: string, taskTitle?: string) => {
    const tech = STUDY_TECHNIQUES.find((t) => t.id === techniqueId);
    if (!tech) return;

    const duration = tech.focusMinutes * 60;
    setState({
      isActive: true,
      isPlaying: true,
      phase: 'focus',
      timeLeft: duration,
      totalDuration: duration,
      cycleCount: 0,
      activeTaskId: taskId || null,
      activeTaskTitle: taskTitle || null,
      technique: tech,
    });
  }, []);

  const pauseSession = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const resumeSession = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const stopSession = useCallback(() => {
    setState({
      isActive: false,
      isPlaying: false,
      phase: 'idle',
      timeLeft: 0,
      totalDuration: 0,
      cycleCount: 0,
      activeTaskId: null,
      activeTaskTitle: null,
      technique: null,
    });
  }, []);

  const skipPhase = useCallback(() => {
    handlePhaseComplete();
  }, [handlePhaseComplete]);

  const attachTask = useCallback((taskId: string, taskTitle: string) => {
    setState((prev) => ({ ...prev, activeTaskId: taskId, activeTaskTitle: taskTitle }));
  }, []);

  return (
    <FocusSessionContext.Provider
      value={{
        ...state,
        startSession,
        pauseSession,
        resumeSession,
        stopSession,
        skipPhase,
        attachTask,
      }}
    >
      {children}
    </FocusSessionContext.Provider>
  );
}

export function useFocusSession() {
  const context = useContext(FocusSessionContext);
  if (context === undefined) {
    throw new Error('useFocusSession must be used within a FocusSessionProvider');
  }
  return context;
}
