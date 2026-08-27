/** Loads the vector-map binaries + metadata the ETL produced. */
import type { WorldData } from '@/types';
import { DATA } from '@/config/gameConfig';

export interface City {
  name: string;
  x: number;
  y: number;
  pop: number;
  cap: number; // 1 = national capital
  rank: number; // scalerank (lower = larger)
  province: number; // owning province id (0 = unassigned)
}

export interface MapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface FlatMapData {
  world: WorldData;
  fill: Float32Array; // [x,y, ...] polygon vertices (indexed)
  fillId: Float32Array; // province id per fill vertex
  fillIdx: Uint32Array; // triangle indices into fill
  fillBk: Float32Array; // backstop fill (dissolved nation, plugs district gaps)
  fillBkId: Float32Array; // representative province id per backstop vertex
  fillBkIdx: Uint32Array; // backstop triangle indices
  bordersInternal: Float32Array; // district↔district (drawn muted)
  bordersInternalCol: Float32Array; // darkened nation colour per internal vertex
  bordersIntl: Float32Array; // national outlines (drawn prominent)
  /** River polylines with importance grade: [nPts, imp, x0,y0, ...] repeated. */
  rivers: Float32Array;
  lakes: Float32Array;
  lakesIdx: Uint32Array;
  seaFill: Float32Array; // sea-province vertices (x,y)
  seaId: Float32Array; // province id per sea vertex
  seaIdx: Uint32Array; // sea triangle indices
  seaBorders: Float32Array; // maritime border segments
  cities: City[];
  bounds: MapBounds;
}

async function bin(url: string): Promise<Float32Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}. Run \`pnpm etl\`.`);
  return new Float32Array(await res.arrayBuffer());
}
async function binU32(url: string): Promise<Uint32Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}. Run \`pnpm etl\`.`);
  return new Uint32Array(await res.arrayBuffer());
}
async function binOpt(url: string): Promise<Float32Array> {
  const res = await fetch(url);
  if (!res.ok) return new Float32Array(0);
  return new Float32Array(await res.arrayBuffer());
}
async function binU32Opt(url: string): Promise<Uint32Array> {
  const res = await fetch(url);
  if (!res.ok) return new Uint32Array(0);
  return new Uint32Array(await res.arrayBuffer());
}
async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}. Run \`pnpm etl\`.`);
  return res.json() as Promise<T>;
}

export async function loadFlatMap(): Promise<FlatMapData> {
  const [world, map, cities, fill, fillId, fillIdx, fillBk, fillBkId, fillBkIdx, bordersInternal, bordersInternalCol, bordersIntl, rivers, lakes, lakesIdx, seaFill, seaId, seaIdx, seaBorders] =
    await Promise.all([
      json<WorldData>(DATA.world),
      json<{ bounds: MapBounds }>(DATA.map.meta),
      json<City[]>(DATA.map.cities),
      bin(DATA.map.fill),
      bin(DATA.map.fillId),
      binU32(DATA.map.fillIdx),
      // Backstop is optional (built by the updated etl:build) — tolerate absence.
      binOpt(DATA.map.fillBk),
      binOpt(DATA.map.fillBkId),
      binU32Opt(DATA.map.fillBkIdx),
      bin(DATA.map.bordersInternal),
      binOpt(DATA.map.bordersInternalCol),
      bin(DATA.map.bordersIntl),
      bin(DATA.map.rivers),
      bin(DATA.map.lakes),
      binU32(DATA.map.lakesIdx),
      // Sea provinces are optional (built by `pnpm etl:sea`) — tolerate absence.
      binOpt(DATA.map.seaFill),
      binOpt(DATA.map.seaId),
      binU32Opt(DATA.map.seaIdx),
      binOpt(DATA.map.seaBorders),
    ]);

  return {
    world,
    fill,
    fillId,
    fillIdx,
    fillBk,
    fillBkId,
    fillBkIdx,
    bordersInternal,
    bordersInternalCol,
    bordersIntl,
    rivers,
    lakes,
    lakesIdx,
    seaFill,
    seaId,
    seaIdx,
    seaBorders,
    cities,
    bounds: map.bounds,
  };
}
