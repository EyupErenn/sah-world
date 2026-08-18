export type StationTier = 1 | 2 | 3;
export type VillageTier = 1 | 2 | 3 | 4 | 5;

export type StationTierMap = Record<number, StationTier>;
export type StationEntryCountMap = Record<number, number>;

/** Pure, derived station growth — no persistence or duplicate database state. */
export function getStationTier(entryCount: number): StationTier {
  if (entryCount >= 30) return 3;
  if (entryCount >= 10) return 2;
  return 1;
}

/** Maps the existing 10 spiritual levels into five visible village eras. */
export function getVillageTier(level: number): VillageTier {
  const normalizedLevel = Math.max(1, Math.min(10, Math.floor(level)));
  return Math.ceil(normalizedLevel / 2) as VillageTier;
}

export function deriveStationTiers(counts: StationEntryCountMap): StationTierMap {
  return Object.fromEntries(
    Object.entries(counts).map(([stationId, count]) => [Number(stationId), getStationTier(count)])
  ) as StationTierMap;
}
