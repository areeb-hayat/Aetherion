/** Simulation clock + treasury, fed by the engine worker each frame. */
import { create } from 'zustand';
import type { SimSpeed } from '@/types';
import { SIM } from '@/config/gameConfig';

interface SimState {
  speed: SimSpeed;
  gameHours: number;
  treasury: number;
  setSpeed: (s: SimSpeed) => void;
  setSnapshot: (gameHours: number, treasury: number) => void;
}

export const useSimStore = create<SimState>((set) => ({
  speed: 1,
  gameHours: 0,
  treasury: SIM.startingTreasury,
  setSpeed: (speed) => set({ speed }),
  setSnapshot: (gameHours, treasury) => set({ gameHours, treasury }),
}));
