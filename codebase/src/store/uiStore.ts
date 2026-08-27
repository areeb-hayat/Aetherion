/** Interactive UI state: hover, selection, active overlay, open panels. */
import { create } from 'zustand';
import type { OverlayId } from '@/types';

export type PanelId = 'nation' | 'district' | 'overlays';

interface UIState {
  hoveredProvinceId: number | null;
  selectedProvinceId: number | null;
  activeOverlay: OverlayId;
  pointer: { x: number; y: number }; // screen px, for the map tooltip
  panels: Record<PanelId, boolean>;
  /** Left statecraft dashboard expanded vs. docked to a slim tab. */
  statecraftOpen: boolean;
  /** Rolling event-log panel (bottom-left). */
  eventLogOpen: boolean;

  setHovered: (id: number | null) => void;
  select: (id: number | null) => void;
  setOverlay: (id: OverlayId) => void;
  setPointer: (x: number, y: number) => void;
  togglePanel: (id: PanelId) => void;
  toggleStatecraft: () => void;
  toggleEventLog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  hoveredProvinceId: null,
  selectedProvinceId: null,
  activeOverlay: 'sovereignty',
  pointer: { x: 0, y: 0 },
  panels: { nation: true, district: true, overlays: true },
  statecraftOpen: true,
  eventLogOpen: false,

  setHovered: (id) =>
    set((s) => (s.hoveredProvinceId === id ? s : { hoveredProvinceId: id })),
  select: (id) => set({ selectedProvinceId: id }),
  setOverlay: (id) => set({ activeOverlay: id }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  togglePanel: (id) => set((s) => ({ panels: { ...s.panels, [id]: !s.panels[id] } })),
  toggleStatecraft: () => set((s) => ({ statecraftOpen: !s.statecraftOpen })),
  toggleEventLog: () => set((s) => ({ eventLogOpen: !s.eventLogOpen })),
}));
