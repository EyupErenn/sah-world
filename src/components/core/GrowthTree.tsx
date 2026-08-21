'use client';

import { useMemo } from 'react';
import { getLevelForXP, LEVELS } from '@/lib/constants';

export default function GrowthTree({ xp, trigger, lastAmount }: { xp: number; trigger: number; lastAmount: number }) {
  const { level, nextLevel, index } = getLevelForXP(xp);
  const start = level.xp;
  const end = nextLevel?.xp ?? start;
  const progress = nextLevel ? Math.min(100, ((xp - start) / Math.max(1, end - start)) * 100) : 100;

  const motes = useMemo(() => Array.from({ length: Math.min(14, 4 + index) }, (_, i) => ({
    x: 46 + ((i * 67) % 280), y: 42 + ((i * 43) % 200), delay: `${(i % 7) * .24}s`,
  })), [index]);

  return (
    <section className="growth-card" aria-labelledby="growth-title">
      <div className="growth-copy">
        <span className="eyebrow">GELİŞİM ALANIN</span>
        <h2 id="growth-title">{level.name} <span>Seviye {index + 1}</span></h2>
        <p>İstikrarlı küçük adımların, kendi gelişim alanını görünür biçimde büyütüyor.</p>
        <div className="progress-heading"><strong>{xp.toLocaleString('tr-TR')} XP</strong><span>{nextLevel ? `${nextLevel.xp - xp} XP kaldı` : 'En yüksek seviye'}</span></div>
        <div className="core-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Sonraki seviyeye ilerleme">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="level-rail" aria-label="Seviye yolculuğu">
          {LEVELS.map((item, itemIndex) => <i key={item.name} className={itemIndex <= index ? 'is-complete' : ''} title={item.name} />)}
        </div>
      </div>

      <div className={`growth-illustration level-${index + 1}`} aria-label={`${level.name} gelişim illüstrasyonu`}>
        {trigger > 0 && lastAmount > 0 && <span key={trigger} className="xp-particle">+{lastAmount} XP</span>}
        <svg viewBox="0 0 420 330" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e0e7ff"/><stop offset="1" stopColor="#f5f3ff"/></linearGradient>
            <linearGradient id="hill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a7f3d0"/><stop offset="1" stopColor="#6ee7b7"/></linearGradient>
            <radialGradient id="halo"><stop stopColor="#fef3c7" stopOpacity=".95"/><stop offset="1" stopColor="#fbbf24" stopOpacity="0"/></radialGradient>
            <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
          </defs>
          <rect width="420" height="330" rx="28" fill="url(#sky)"/>
          {index >= 7 && <circle cx="310" cy="72" r="54" fill="url(#halo)" className="tree-halo"/>}
          {index >= 8 && <path d="M32 80 Q110 20 188 80 T344 80" fill="none" stroke="#8b5cf6" strokeWidth="2" opacity=".25"/>}
          {index >= 6 && [70,118,304,350].map((x, i) => <circle key={x} cx={x} cy={50 + i * 13} r="3" fill="#fff" className="star"/>)}
          <path d="M0 230 Q85 175 170 226 T340 218 T450 210 V330 H0Z" fill="#c4b5fd" opacity=".55"/>
          <path d="M0 260 Q96 218 178 256 T344 248 T450 242 V330 H0Z" fill="url(#hill)"/>
          <ellipse cx="220" cy="292" rx={index < 2 ? 34 : 104} ry="16" fill="#065f46" opacity=".16" filter="url(#soft)"/>

          {index === 0 ? <>
            <ellipse cx="214" cy="265" rx="28" ry="12" fill="#7c5a3c"/><path d="M214 264 Q207 246 218 232" stroke="#15803d" strokeWidth="6" strokeLinecap="round"/><ellipse cx="225" cy="238" rx="12" ry="6" fill="#34d399" transform="rotate(-28 225 238)"/>
          </> : <>
            <path d={`M215 278 C${210 - index} 235 ${222 + index} 198 216 ${150 - Math.min(index, 6) * 8}`} stroke="#7c4a2d" strokeWidth={12 + index * 1.3} fill="none" strokeLinecap="round"/>
            {index >= 2 && <path d="M216 226 Q176 200 158 168 M218 212 Q255 184 275 154" stroke="#7c4a2d" strokeWidth={7 + index} fill="none" strokeLinecap="round"/>}
            {index >= 3 && <path d="M211 196 Q181 162 177 131 M230 196 Q264 166 296 134" stroke="#7c4a2d" strokeWidth="8" fill="none" strokeLinecap="round"/>}
            <g className="tree-crown">
              <circle cx="215" cy={174 - index * 7} r={29 + index * 4} fill="#10b981"/>
              {index >= 2 && <><circle cx="168" cy={179 - index * 5} r={27 + index * 2.5} fill="#34d399"/><circle cx="268" cy={168 - index * 5} r={30 + index * 2.5} fill="#059669"/></>}
              {index >= 3 && <><circle cx="190" cy={125 - index * 3} r={34 + index * 2} fill="#22c55e"/><circle cx="248" cy={118 - index * 3} r={36 + index * 2} fill="#16a34a"/></>}
              {index >= 4 && <circle cx="218" cy={92 - index} r={40 + index * 1.7} fill="#4ade80"/>}
            </g>
            {index >= 4 && <g opacity=".85"><path d="M88 277q8-30 16 0M116 277q10-38 19 0M315 277q8-28 17 0" stroke="#16a34a" strokeWidth="8" strokeLinecap="round"/></g>}
            {index >= 5 && <g><path d="M18 246L64 174l46 72z" fill="#6366f1" opacity=".25"/><path d="M322 240l36-58 37 58z" fill="#7c3aed" opacity=".22"/></g>}
            {index >= 9 && <circle cx="216" cy="145" r="112" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8 12" className="cosmic-ring"/>}
          </>}
          {index >= 5 && motes.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={2 + (i % 3)} fill={i % 2 ? '#fbbf24' : '#8b5cf6'} className="mote" style={{ animationDelay: m.delay }}/>) }
        </svg>
        <span className="growth-caption">Bu görsel manevi değeri değil, uygulamadaki istikrarını temsil eder.</span>
      </div>
    </section>
  );
}
