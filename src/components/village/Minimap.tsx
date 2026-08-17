'use client';

import { VILLAGE_LOCATIONS, WORLD_BOUNDS, type VillageLocation } from '@/lib/villageData';

interface MinimapProps {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  activeBuildingId: number | null;
  onSelectLocation?: (loc: VillageLocation) => void;
}

export default function Minimap({
  playerX,
  playerZ,
  playerHeading,
  activeBuildingId,
  onSelectLocation,
}: MinimapProps) {
  const mapSize = 160; // px size
  const worldRadius = WORLD_BOUNDS; // 75 units

  // Convert world coordinates (x, z) to minimap (px, py)
  const toMapCoords = (wx: number, wz: number) => {
    const normX = wx / worldRadius; // -1 to 1
    const normZ = wz / worldRadius; // -1 to 1
    const px = (normX + 1) * 0.5 * (mapSize - 24) + 12;
    const py = (normZ + 1) * 0.5 * (mapSize - 24) + 12;
    return { px, py };
  };

  const { px: playerPx, py: playerPy } = toMapCoords(playerX, playerZ);
  const headingDeg = (-playerHeading * 180) / Math.PI;

  return (
    <div className="relative group flex flex-col items-center">
      {/* Outer Radar Glass Container */}
      <div className="w-[160px] h-[160px] rounded-full glass-panel p-2 shadow-2xl relative overflow-hidden flex items-center justify-center select-none backdrop-blur-2xl border border-white/10 hover:border-white/20 transition-all">
        
        {/* Subtle Dark Radar Grid & Rings */}
        <div className="absolute inset-0 rounded-full bg-slate-950/75" />
        <div className="absolute w-28 h-28 rounded-full border border-indigo-500/10 pointer-events-none" />
        <div className="absolute w-16 h-16 rounded-full border border-indigo-500/10 pointer-events-none" />
        
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
          <div className="player-blip w-2.5 h-2.5 rounded-full bg-indigo-400 mx-auto -mt-0.5 ring-2 ring-white/90" />
        </div>
      </div>

      {/* Sleek Floating Coordinates Badge */}
      <div className="mt-2 text-center">
        <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-950/70 px-2.5 py-0.5 rounded-full border border-white/5 backdrop-blur-md">
          {Math.round(playerX)}, {Math.round(playerZ)}
        </span>
      </div>
    </div>
  );
}
