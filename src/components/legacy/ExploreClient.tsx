'use client';

import dynamic from 'next/dynamic';

const LegacyVillageApp = dynamic(() => import('./LegacyVillageApp'), {
  ssr: false,
  loading: () => <div className="app-loader dark"><span className="brand-mark">S</span><i/><p>Keşif modu yükleniyor…</p></div>,
});

export default function ExploreClient(){ return <LegacyVillageApp/>; }
