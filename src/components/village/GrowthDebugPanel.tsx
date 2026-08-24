'use client';

import { VILLAGE_LOCATIONS } from '@/lib/villageData';
import type { StationTier, VillageTier } from '@/lib/growth';

interface GrowthDebugPanelProps {
  villageTier: VillageTier;
  villageTierOverride: VillageTier | null;
  stationTierOverrides: Partial<Record<number, StationTier>>;
  onVillageTierChange: (tier: VillageTier | null) => void;
  onStationTierChange: (stationId: number, tier: StationTier | null) => void;
  onPreviewStation: (stationId: number) => void;
}

// DEV-ONLY: rendered behind a compile-time NODE_ENV guard in page.tsx.
export default function GrowthDebugPanel({
  villageTier,
  villageTierOverride,
  stationTierOverrides,
  onVillageTierChange,
  onStationTierChange,
  onPreviewStation,
}: GrowthDebugPanelProps) {
  return (
    <details className="fixed bottom-4 left-4 z-[19000] w-72 rounded-2xl bg-slate-950/90 p-4 text-slate-100 shadow-2xl ring-1 ring-fuchsia-400/30 backdrop-blur-xl" data-testid="growth-debug-panel">
      <summary className="cursor-pointer select-none text-xs font-black uppercase tracking-wider text-fuchsia-300">
        🧪 Büyüme Laboratuvarı · Köy {villageTier}
      </summary>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
        <label className="block text-xs font-bold text-slate-300">
          Global köy seviyesi
          <select
            aria-label="Global köy seviyesi"
            value={villageTierOverride ?? 'auto'}
            onChange={event => onVillageTierChange(event.target.value === 'auto' ? null : Number(event.target.value) as VillageTier)}
            className="mt-2 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm ring-1 ring-white/10"
          >
            <option value="auto">Otomatik (gerçek XH)</option>
            {[1, 2, 3, 4, 5].map(tier => <option key={tier} value={tier}>Tier {tier}</option>)}
          </select>
        </label>

        <div className="h-px bg-white/10" />

        {VILLAGE_LOCATIONS.filter(location => location.id !== 0).map(location => (
          <label key={location.id} className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <span className="truncate">{location.icon} {location.name}</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => onPreviewStation(location.id)} aria-label={`${location.name} yanına git`} className="rounded-lg bg-indigo-500/20 px-2 py-2 text-indigo-200 ring-1 ring-indigo-400/30">◎</button>
              <select
                aria-label={`${location.name} görsel seviyesi`}
                value={stationTierOverrides[location.id] ?? 'auto'}
                onChange={event => onStationTierChange(location.id, event.target.value === 'auto' ? null : Number(event.target.value) as StationTier)}
                className="w-24 rounded-lg bg-slate-900 px-2 py-2 text-xs ring-1 ring-white/10"
              >
                <option value="auto">Otomatik</option>
                {[1, 2, 3].map(tier => <option key={tier} value={tier}>Tier {tier}</option>)}
              </select>
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}
