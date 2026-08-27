/** Static world data (nations + provinces + cities), loaded once at boot. */
import { create } from 'zustand';
import type { Nation, Province, WorldData } from '@/types';
import type { City } from '@/map/data/mapLoader';

interface WorldState {
  loaded: boolean;
  nations: Map<string, Nation>;
  provinces: Map<number, Province>;
  cities: City[];
  provinceCount: number;
  setWorld: (data: WorldData, cities?: City[]) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  loaded: false,
  nations: new Map(),
  provinces: new Map(),
  cities: [],
  provinceCount: 0,
  setWorld: (data, cities = []) =>
    set({
      loaded: true,
      nations: new Map(data.nations.map((n) => [n.id, n])),
      provinces: new Map(data.provinces.map((p) => [p.id, p])),
      cities,
      provinceCount: data.provinces.length,
    }),
}));

/** Non-reactive accessors for hot paths (picker, renderer) — avoid hook churn. */
export const getProvince = (id: number) => useWorldStore.getState().provinces.get(id);
export const getNation = (id: string) => useWorldStore.getState().nations.get(id);
