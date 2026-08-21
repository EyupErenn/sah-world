'use client';

import { VILLAGE_LOCATIONS, type VillageLocation } from '@/lib/villageData';

export interface StationStatus {
  summary: string;
  detail: string;
}

interface StationListViewProps {
  statuses: Record<number, StationStatus>;
  onSelectLocation: (location: VillageLocation) => void;
  onReturnToWorld: () => void;
}

export default function StationListView({
  statuses,
  onSelectLocation,
  onReturnToWorld,
}: StationListViewProps) {
  const stations = VILLAGE_LOCATIONS.filter(location => location.id !== 0);

  return (
    <main className="fixed inset-0 z-[2] overflow-y-auto bg-[radial-gradient(circle_at_top,#312e81_0%,#111827_34%,#070b14_100%)] px-4 pb-12 pt-28 sm:px-6 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200 shadow-[0_8px_24px_rgba(79,70,229,0.18)]">
              <span aria-hidden>🧭</span>
              Hızlı erişim haritası
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Hayat istasyonları</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Sürüş yapmadan tüm duraklarına ulaş. Bir istasyon seçerek kayıtlarına, görevlerine veya manevi yolculuğuna doğrudan devam et.
            </p>
          </div>

          <button type="button" onClick={onReturnToWorld} className="sah-button-secondary shrink-0 self-start sm:self-auto">
            <span aria-hidden>🌐</span>
            3D köye dön
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="SAH World istasyonları">
          {stations.map(location => {
            const status = statuses[location.id] ?? { summary: 'Henüz kayıt yok', detail: 'İlk adımını at' };

            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onSelectLocation(location)}
                className="group relative min-h-48 overflow-hidden rounded-3xl bg-slate-900/72 p-6 text-left shadow-[0_16px_48px_rgba(0,0,0,0.24)] ring-1 ring-white/8 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-slate-900/88 hover:shadow-[0_24px_64px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                style={{ '--station-color': location.color } as React.CSSProperties}
                aria-label={`${location.name} istasyonunu aç. ${status.summary}`}
              >
                <span
                  className="absolute inset-x-0 top-0 h-1 opacity-90"
                  style={{ background: `linear-gradient(90deg, transparent, ${location.color}, transparent)` }}
                />
                <span
                  className="absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-15 blur-3xl transition-opacity group-hover:opacity-30"
                  style={{ backgroundColor: location.color }}
                />

                <span className="relative flex h-full flex-col">
                  <span className="mb-6 flex items-start justify-between gap-4">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-lg ring-1 ring-white/15"
                      style={{ backgroundColor: `${location.color}24`, boxShadow: `0 12px 32px ${location.color}20` }}
                    >
                      {location.icon}
                    </span>
                    <span className="rounded-full bg-white/6 px-3 py-2 text-[11px] font-bold text-slate-300 ring-1 ring-white/8">
                      {status.summary}
                    </span>
                  </span>

                  <span className="text-xl font-black text-white">{location.name}</span>
                  <span className="mt-1 text-xs font-semibold" style={{ color: location.color }}>{location.label}</span>
                  <span className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{location.description}</span>

                  <span className="mt-auto flex items-center justify-between gap-4 pt-6 text-xs">
                    <span className="text-slate-500">{status.detail}</span>
                    <span className="font-bold text-indigo-200 transition-transform group-hover:translate-x-1">İstasyona git →</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
