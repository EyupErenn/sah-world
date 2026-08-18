'use client';

import { VILLAGE_LOCATIONS, WORLD_BOUNDS, getActiveRoadPaths, getStreamCenterZ, type VillageLocation } from '@/lib/villageData';
import type { VillageTier } from '@/lib/growth';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  activeBuildingId: number | null;
  villageTier: VillageTier;
  onSelectLocation?: (loc: VillageLocation) => void;
}

export default function Minimap({
  playerX,
  playerZ,
  playerHeading,
  activeBuildingId,
  villageTier,
  onSelectLocation,
}: MinimapProps) {
  const mapSize = 176;
  const worldRadius = WORLD_BOUNDS;

  // Convert world coordinates (x, z) to minimap (px, py)
  const toMapCoords = (wx: number, wz: number) => {
    const normX = Math.max(-1, Math.min(1, wx / worldRadius));
    const normZ = Math.max(-1, Math.min(1, wz / worldRadius));
    const px = (normX + 1) * 0.5 * (mapSize - 24) + 12;
    const py = (normZ + 1) * 0.5 * (mapSize - 24) + 12;
    return { px, py };
  };

  const { px: playerPx, py: playerPy } = toMapCoords(playerX, playerZ);
  const headingDeg = (-playerHeading * 180) / Math.PI;

  return (
    <div className="relative group flex flex-col items-center">
      {/* Outer Radar Glass Container */}
      <div className="w-44 h-44 rounded-full glass-panel p-2 shadow-2xl relative overflow-hidden flex items-center justify-center select-none backdrop-blur-2xl ring-1 ring-white/5 hover:ring-indigo-300/20 transition-all">
        
        {/* Subtle Dark Radar Grid & Rings */}
        <div className="absolute inset-0 rounded-full bg-slate-950/75" />
        <div className="absolute w-28 h-28 rounded-full border border-indigo-500/10 pointer-events-none" />
        <div className="absolute w-16 h-16 rounded-full border border-indigo-500/10 pointer-events-none" />

        {/* Shared road/river network — uses the same world coordinates as driving physics. */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox={`0 0 ${mapSize} ${mapSize}`} aria-hidden>
          <polyline
            points={Array.from({ length: 33 }, (_, index) => {
              const x = -WORLD_BOUNDS + (index / 32) * WORLD_BOUNDS * 2;
              const point = toMapCoords(x, getStreamCenterZ(x));
              return `${point.px},${point.py}`;
            }).join(' ')}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.55"
          />
          {getActiveRoadPaths(villageTier).map(path => (
            <polyline
              key={path.id}
              points={path.points.map(([x, z]) => {
                const point = toMapCoords(x, z);
                return `${point.px},${point.py}`;
              }).join(' ')}
              fill="none"
              stroke={villageTier === 1 ? '#92400e' : path.width > 6 ? '#cbd5e1' : '#94a3b8'}
              strokeWidth={path.width > 6 ? 3.4 : 2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.48"
            />
          ))}
        </svg>
        
        {/* Compass Cardinal Points */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black font-mono text-amber-400/90 pointer-events-none">N</span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono text-slate-600 pointer-events-none">S</span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold font-mono text-slate-600 pointer-events-none">W</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold font-mono text-slate-600 pointer-events-none">E</span>

        {/* Central Plaza Blip */}
        <div
          className="absolute w-6 h-6 rounded-full border border-indigo-400/30 bg-indigo-950/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: toMapCoords(0, 0).px,
            top: toMapCoords(0, 0).py,
          }}
        />

        {/* 8 Village Landmark Dots */}
        {VILLAGE_LOCATIONS.map(loc => {
          if (loc.id === 0) return null;
          const { px, py } = toMapCoords(loc.x, loc.z);
          const isNearby = activeBuildingId === loc.id;
          const dist = Math.round(Math.hypot(playerX - loc.x, playerZ - loc.z));

          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation?.(loc)}
              title={`${loc.label} (${dist}m)`}
              className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[9px] transition-all cursor-pointer ${
                isNearby
                  ? 'scale-150 ring-4 ring-cyan-400/50 z-20 shadow-lg animate-pulse'
                  : 'hover:scale-135 z-10 opacity-85 hover:opacity-100'
              }`}
              style={{
                left: px,
                top: py,
                backgroundColor: loc.color,
                boxShadow: `0 0 10px ${loc.color}80`,
              }}
            >
              <span className="scale-75 pointer-events-none">{loc.icon}</span>
            </button>
          );
        })}

        {/* Player Blip & Direction Radar Beam */}
        <div
          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-transform duration-75"
          style={{
            left: playerPx,
            top: playerPy,
            transform: `translate(-50%, -50%) rotate(${headingDeg}deg)`,
          }}
        >
          {/* Radar Direction Cone */}
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[10px] border-b-cyan-300 mx-auto -mt-1 drop-shadow-[0_0_8px_#38bdf8]" />
          {/* Core Player Dot — pulsing glow */}
          <div className="player-blip w-2.5 h-2.5 rounded-full bg-indigo-400 mx-auto -mt-1 ring-2 ring-white/90" />
        </div>
      </div>

      {/* Sleek Floating Coordinates Badge */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-950/70 px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
          {Math.round(playerX)}, {Math.round(playerZ)}
        </span>
      </div>
    </div>
  );
}
