'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { FocusSession, FocusTimerType } from '@/types'
import type { FocusSoundId } from '@/lib/focusAudio'

export type FocusWidgetPosition = { x: number; y: number }

export interface FocusTimerState {
  isActive: boolean
  isPaused: boolean
  isFullscreen: boolean
  startedAt: number | null
  sessionStartedAt: number | null
  pausedElapsedSeconds: number
  plannedDurationSeconds: number
  timerType: FocusTimerType
  taskLabel: string
  position: FocusWidgetPosition
  positionInitialized: boolean
  sound: FocusSoundId
  volume: number
  completedSession: FocusSession | null
  setTaskLabel: (taskLabel: string) => void
  configure: (input: { timerType: FocusTimerType; plannedDurationSeconds: number }) => void
  setSound: (sound: FocusSoundId, volume: number) => void
  start: () => void
  pause: (at?: number) => void
  resume: (at?: number) => void
  setFullscreen: (isFullscreen: boolean) => void
  setPosition: (position: FocusWidgetPosition) => void
  initialisePosition: (position: FocusWidgetPosition) => void
  complete: (session: FocusSession) => void
  dismissCompletion: () => void
  reset: () => void
  restoreLegacy: (input: {
    taskLabel: string
    timerType: FocusTimerType
    plannedDurationSeconds: number
    elapsedBeforeRun: number
    runStartedAt: number | null
    sessionStartedAt: number
    isPaused: boolean
  }) => void
}

export function getFocusElapsedSeconds(state: Pick<FocusTimerState, 'isActive' | 'isPaused' | 'startedAt' | 'pausedElapsedSeconds'>, now = Date.now()): number {
  if (!state.isActive || state.isPaused || state.startedAt === null) return Math.max(0, state.pausedElapsedSeconds)
  return Math.max(0, state.pausedElapsedSeconds + (now - state.startedAt) / 1000)
}

export function getFocusDisplaySeconds(state: Pick<FocusTimerState, 'timerType' | 'plannedDurationSeconds' | 'isActive' | 'isPaused' | 'startedAt' | 'pausedElapsedSeconds'>, now = Date.now()): number {
  const elapsed = getFocusElapsedSeconds(state, now)
  return state.timerType === 'countdown' ? Math.max(0, state.plannedDurationSeconds - elapsed) : elapsed
}

const initialState = {
  isActive: false,
  isPaused: false,
  isFullscreen: false,
  startedAt: null,
  sessionStartedAt: null,
  pausedElapsedSeconds: 0,
  plannedDurationSeconds: 50 * 60,
  timerType: 'countdown' as FocusTimerType,
  taskLabel: '',
  position: { x: 24, y: 96 },
  positionInitialized: false,
  sound: 'none' as FocusSoundId,
  volume: .35,
  completedSession: null,
}

export const useFocusTimerStore = create<FocusTimerState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setTaskLabel: (taskLabel) => set({ taskLabel: taskLabel.trim().slice(0, 120) }),
      configure: ({ timerType, plannedDurationSeconds }) => {
        if (get().isActive) return
        set({
          timerType,
          plannedDurationSeconds: timerType === 'countdown' ? Math.min(12 * 60 * 60, Math.max(1, Math.round(plannedDurationSeconds))) : 0,
          pausedElapsedSeconds: 0,
          completedSession: null,
        })
      },
      setSound: (sound, volume) => set({ sound, volume: Math.min(1, Math.max(0, volume)) }),
      start: () => {
        const taskLabel = get().taskLabel.trim()
        if (!taskLabel || get().isActive) return
        const now = Date.now()
        set({ isActive: true, isPaused: false, startedAt: now, sessionStartedAt: now, pausedElapsedSeconds: 0, completedSession: null })
      },
      pause: (at = Date.now()) => {
        const state = get()
        if (!state.isActive || state.isPaused) return
        set({ isPaused: true, startedAt: null, pausedElapsedSeconds: getFocusElapsedSeconds(state, at) })
      },
      resume: (at = Date.now()) => {
        const state = get()
        if (!state.isActive || !state.isPaused) return
        set({ isPaused: false, startedAt: at })
      },
      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      setPosition: (position) => set({ position, positionInitialized: true }),
      initialisePosition: (position) => {
        if (!get().positionInitialized) set({ position, positionInitialized: true })
      },
      complete: (session) => set({
        isActive: false,
        isPaused: false,
        isFullscreen: false,
        startedAt: null,
        sessionStartedAt: null,
        pausedElapsedSeconds: session.actualDurationSeconds,
        completedSession: session,
      }),
      dismissCompletion: () => set({ completedSession: null }),
      reset: () => set({
        isActive: false,
        isPaused: false,
        startedAt: null,
        sessionStartedAt: null,
        pausedElapsedSeconds: 0,
        completedSession: null,
      }),
      restoreLegacy: (input) => set({
        isActive: true,
        isPaused: input.isPaused,
        isFullscreen: false,
        startedAt: input.isPaused ? null : (input.runStartedAt ?? Date.now()),
        sessionStartedAt: input.sessionStartedAt,
        pausedElapsedSeconds: input.elapsedBeforeRun,
        plannedDurationSeconds: input.plannedDurationSeconds,
        timerType: input.timerType,
        taskLabel: input.taskLabel,
        completedSession: null,
      }),
    }),
    {
      name: 'sah-focus-timer-global-v2',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isActive: state.isActive,
        isPaused: state.isPaused,
        isFullscreen: state.isFullscreen,
        startedAt: state.startedAt,
        sessionStartedAt: state.sessionStartedAt,
        pausedElapsedSeconds: state.pausedElapsedSeconds,
        plannedDurationSeconds: state.plannedDurationSeconds,
        timerType: state.timerType,
        taskLabel: state.taskLabel,
        position: state.position,
        positionInitialized: state.positionInitialized,
        sound: state.sound,
        volume: state.volume,
        completedSession: state.completedSession,
      }),
    },
  ),
)
