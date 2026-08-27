/**
 * City label projections, pushed from the renderer each ~100ms. Kept tiny and
 * separate from uiStore so the high-frequency label churn never re-renders the
 * HUD panels. The renderer computes screen px; <CityLabels> just paints them.
 */
import { create } from 'zustand';

export interface CityLabel {
  id: number;
  name: string;
  x: number; // screen px
  y: number; // screen px
  cls: 1 | 2 | 3; // 1 = capital, 2 = major city, 3 = town (drives styling)
  alpha: number; // 0..1 reveal fade from the zoom band
}

interface LabelState {
  labels: CityLabel[];
  setLabels: (labels: CityLabel[]) => void;
}

export const useLabelStore = create<LabelState>((set) => ({
  labels: [],
  setLabels: (labels) => set({ labels }),
}));
