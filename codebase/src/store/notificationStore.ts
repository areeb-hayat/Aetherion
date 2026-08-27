/** Transient toasts + a small rolling event log (TDD Ch.09, Phase-1 subset). */
import { create } from 'zustand';
import type { GameEvent } from '@/types';

interface NotificationState {
  toasts: GameEvent[]; // currently on-screen
  log: GameEvent[]; // rolling history (capped)
  push: (e: GameEvent) => void;
  dismiss: (id: string) => void;
}

const LOG_CAP = 200;

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  log: [],
  push: (e) =>
    set((s) => ({
      toasts: [...s.toasts, e].slice(-4),
      log: [e, ...s.log].slice(0, LOG_CAP),
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
