'use client'

import { motion } from 'framer-motion'
import { useId, useMemo } from 'react'
import { getLevelForXP, LEVELS } from '@/lib/constants'

export default function GrowthTree({ xp, trigger, lastAmount }: { xp: number; trigger: number; lastAmount: number }) {
  const { level, nextLevel, index } = getLevelForXP(xp)
  const start = level.xp
  const end = nextLevel?.xp ?? start
  const progress = nextLevel ? Math.min(100, ((xp - start) / Math.max(1, end - start)) * 100) : 100
  const uid = useId().replace(/:/g, '')
  const motes = useMemo(() => Array.from({ length: Math.min(18, 3 + index * 2) }, (_, i) => ({ x: 34 + ((i * 73) % 350), y: 40 + ((i * 47) % 190), delay: `${(i % 8) * .23}s` })), [index])

  return <section className="growth-card" aria-labelledby="growth-title">
    <div className="growth-copy">
      <span className="eyebrow">GELİŞİM SAHNEN</span>
      <div className="level-heading"><h2 id="growth-title">{level.name}</h2><span>Seviye {index + 1} / 10</span></div>
      <p>{levelCopy[index]} Her düzenli kayıt, sahnenin yeni bir katmanını görünür kılar.</p>
      <div className="progress-heading"><strong>{xp.toLocaleString('tr-TR')} XH</strong><span>{nextLevel ? `${Math.round(progress)}% · ${nextLevel.name} için ${nextLevel.xp - xp} XH` : 'Yolculuğun en geniş ufku'}</span></div>
      <div className="core-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Sonraki seviyeye ilerleme"><span style={{ width: `${progress}%` }} /></div>
      <div className="level-rail" aria-label="Seviye yolculuğu">{LEVELS.map((item, itemIndex) => <i key={item.name} className={itemIndex <= index ? 'is-complete' : ''} title={item.name} />)}</div>
      <div className="growth-next"><span>{LEVELS[index].icon}</span><p><strong>Şu anki evrenin</strong><small>{nextLevel ? `Sıradaki: ${nextLevel.icon} ${nextLevel.name}` : 'Tüm sahne tamamlandı'}</small></p></div>
    </div>

    <div className={`growth-illustration level-${index + 1}`} aria-label={`${level.name} gelişim illüstrasyonu`}>
      {trigger > 0 && lastAmount > 0 && <span key={trigger} className="xp-particle">+{lastAmount} XH</span>}
      <span className="scene-level-chip">{level.icon} {level.name} · %{Math.round(progress)}</span>
      <motion.div className="growth-scene-frame" key={index} initial={{ opacity: .2, scale: .965, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .7, ease: [0.16, 1, 0.3, 1] }}>
        <svg viewBox="0 0 440 340" role="img" aria-label={`${level.name} seviyesinde katmanlı doğa ve ışık sahnesi`}>
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={index >= 8 ? '#17153f' : index >= 6 ? '#4338ca' : '#b9dcff'}/><stop offset=".52" stopColor={index >= 8 ? '#553c9a' : index >= 6 ? '#8b5cf6' : '#e5e7ff'}/><stop offset="1" stopColor={index >= 8 ? '#f59e8b' : '#fff1d6'}/></linearGradient>
            <linearGradient id={`${uid}-hill-back`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={index >= 7 ? '#5146a5' : '#8fcdb3'}/><stop offset="1" stopColor={index >= 7 ? '#6255be' : '#6fb99a'}/></linearGradient>
            <linearGradient id={`${uid}-hill-front`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={index >= 7 ? '#185b62' : '#45a978'}/><stop offset="1" stopColor={index >= 7 ? '#0d3d4c' : '#177157'}/></linearGradient>
            <linearGradient id={`${uid}-trunk`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#6a3f2a"/><stop offset=".5" stopColor="#9a6740"/><stop offset="1" stopColor="#4f2c22"/></linearGradient>
            <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={index >= 7 ? '#b9f17b' : '#6de39c'}/><stop offset=".54" stopColor={index >= 7 ? '#47c982' : '#23b46f'}/><stop offset="1" stopColor="#087454"/></linearGradient>
            <radialGradient id={`${uid}-sun`}><stop stopColor="#fffbd1" stopOpacity="1"/><stop offset=".26" stopColor="#ffd66b" stopOpacity=".82"/><stop offset="1" stopColor="#f59e0b" stopOpacity="0"/></radialGradient>
            <radialGradient id={`${uid}-cosmos`}><stop stopColor="#e9d5ff" stopOpacity=".7"/><stop offset=".5" stopColor="#8b5cf6" stopOpacity=".15"/><stop offset="1" stopColor="#4f46e5" stopOpacity="0"/></radialGradient>
            <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#112d2d" floodOpacity=".24"/></filter>
            <filter id={`${uid}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
            <clipPath id={`${uid}-clip`}><rect width="440" height="340" rx="30"/></clipPath>
          </defs>
          <g clipPath={`url(#${uid}-clip)`}>
            <rect width="440" height="340" rx="30" fill={`url(#${uid}-sky)`}/>
            {index >= 7 && <><circle cx="344" cy="70" r="73" fill={`url(#${uid}-sun)`} className="tree-halo"/><g className="sun-rays" stroke="#fff2a8" strokeWidth="2" opacity=".42"><path d="M344 8v21M344 111v23M281 70h-24M405 70h24M299 25l-16-16M389 115l16 16M299 115l-16 16M389 25l16-16"/></g></>}
            {index >= 8 && <><ellipse cx="218" cy="104" rx="170" ry="82" fill={`url(#${uid}-cosmos)`}/><path className="galaxy-line" d="M26 104C105 31 280 22 415 110C292 60 145 70 56 143" fill="none" stroke="#e9d5ff" strokeWidth="2" opacity=".34"/><path className="galaxy-line delay" d="M55 63C154 130 303 130 407 54" fill="none" stroke="#f0abfc" strokeWidth="9" opacity=".12"/></>}
            {index >= 3 && <g className="birds" fill="none" stroke={index >= 7 ? '#fff4cf' : '#5360a9'} strokeWidth="2" strokeLinecap="round"><path d="M72 82q7-7 14 0q7-7 14 0"/><path d="M125 58q5-5 10 0q5-5 10 0"/></g>}
            <path d="M-18 235C52 190 100 187 166 221C225 252 269 183 338 201C386 214 417 198 465 170V350H-18Z" fill={`url(#${uid}-hill-back)`} opacity=".78"/>
            {index >= 5 && <g className="mountain-layer"><path d="M-12 234L75 137l73 94 77-72 76 72 65-108 96 112v70H-12Z" fill={index >= 7 ? '#34356e' : '#7585a7'} opacity=".4"/><path d="M53 162l22-25 22 29-19-7zM343 149l23-26 25 29-23-9z" fill="#f8fafc" opacity=".7"/></g>}
            <path d="M-10 272C56 227 122 236 178 261C251 294 304 219 377 234C412 241 439 230 466 214V350H-10Z" fill={`url(#${uid}-hill-front)`}/>
            <path d="M-10 302C95 275 146 313 239 292C327 272 365 307 460 279V350H-10Z" fill={index >= 7 ? '#0d4350' : '#2d8c66'} opacity=".72"/>
            <ellipse cx="228" cy="298" rx={index < 2 ? 38 : 112} ry="18" fill="#0a2f35" opacity=".22" filter={`url(#${uid}-glow)`}/>
            <GrowthSubject index={index} uid={uid}/>
            {index >= 4 && <GroundLife index={index}/>}
            {index >= 6 && motes.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={1.5 + (i % 3)} fill={i % 3 === 0 ? '#ffe58d' : i % 2 ? '#d8b4fe' : '#a7f3d0'} className="mote" style={{ animationDelay: m.delay }}/>) }
            {index >= 9 && <g className="constellation" fill="none" stroke="#fef3c7" strokeWidth="1" opacity=".7"><path d="M49 49l35 19 29-31 31 32M328 42l25 29 35-20"/><circle cx="49" cy="49" r="3" fill="#fff"/><circle cx="84" cy="68" r="2" fill="#fff"/><circle cx="113" cy="37" r="3" fill="#fff"/><circle cx="144" cy="69" r="2" fill="#fff"/><circle cx="328" cy="42" r="2" fill="#fff"/><circle cx="353" cy="71" r="3" fill="#fff"/><circle cx="388" cy="51" r="2" fill="#fff"/></g>}
          </g>
        </svg>
      </motion.div>
      <span className="growth-caption">Bu sahne manevi değeri değil, yalnızca uygulamadaki istikrarı temsil eder.</span>
    </div>
  </section>
}

function GrowthSubject({ index, uid }: { index: number; uid: string }) {
  if (index === 0) return <g className="seed-stage" filter={`url(#${uid}-shadow)`}><path d="M176 294c19-19 75-24 108 0-27 20-82 20-108 0Z" fill="#704a35"/><ellipse cx="228" cy="283" rx="12" ry="8" fill="#c18a55" transform="rotate(-20 228 283)"/><path d="M228 278c-1-14 4-24 12-31" stroke="#2b9b63" strokeWidth="4" strokeLinecap="round"/><path d="M239 247c8-5 15-3 18 4-8 5-15 4-18-4Z" fill="#6ee7a2"/></g>
  if (index === 1) return <g className="sprout-stage" filter={`url(#${uid}-shadow)`}><path d="M190 296c20-16 66-17 86 0-20 13-67 14-86 0Z" fill="#704a35"/><path d="M229 289c-2-29 0-55 4-75" stroke="#258b58" strokeWidth="8" strokeLinecap="round"/><path d="M231 248c-23-18-43-12-46 5 19 12 35 10 46-5Z" fill="#55d98a"/><path d="M232 231c16-19 35-16 41-2-13 15-29 16-41 2Z" fill="#35bb70"/></g>
  const treeScale = 0.72 + index * .045
  return <g className="tree-stage" transform={`translate(${228 - 228 * treeScale} ${300 - 300 * treeScale}) scale(${treeScale})`} filter={`url(#${uid}-shadow)`}>
    <path d="M226 298C217 264 222 231 216 202C211 174 222 143 228 116C240 151 245 177 239 204C232 237 242 270 238 298Z" fill={`url(#${uid}-trunk)`}/>
    <path d="M226 232C204 207 183 187 157 173M235 220c25-25 46-48 75-62M222 196c-9-27-20-46-38-61M237 184c22-27 36-48 43-69" fill="none" stroke={`url(#${uid}-trunk)`} strokeWidth={index >= 5 ? 13 : 10} strokeLinecap="round"/>
    {index >= 3 && <path d="M218 164c-30-19-52-45-61-72M239 153c31-18 55-39 71-66" fill="none" stroke={`url(#${uid}-trunk)`} strokeWidth="8" strokeLinecap="round"/>}
    <g className="tree-crown"><path d="M111 172c-9-29 18-54 48-45 4-31 39-48 63-27 19-31 64-26 73 9 36-7 60 31 38 56 27 25 2 65-30 59-13 30-50 35-72 12-22 24-62 17-70-15-31 10-61-18-50-49Z" fill={`url(#${uid}-leaf)`}/><path d="M122 178c17-9 35-11 52-6M178 124c14 7 27 18 36 33M253 112c-10 14-17 30-18 49M285 165c-15 5-29 15-40 27" fill="none" stroke="#c8f8ae" strokeWidth="7" opacity=".25" strokeLinecap="round"/>{index >= 4 && <><path d="M94 151c-10-23 11-44 34-38 2-24 31-35 48-18 6 23-3 41-24 51-18 9-38 10-58 5Z" fill="#45c978"/><path d="M304 129c7-22 34-29 50-10 23-4 37 21 24 39-18 8-41 6-60-5-9-6-14-14-14-24Z" fill="#15945d"/></>}{index >= 6 && <path d="M160 95c1-28 34-42 54-22 14-29 55-27 65 3 24-5 42 19 30 40-45 24-105 17-149-21Z" fill="#78df79"/>}{index >= 7 && <g fill="#ffdf70" className="fruit-lights"><circle cx="145" cy="160" r="5"/><circle cx="201" cy="109" r="4"/><circle cx="281" cy="142" r="5"/><circle cx="319" cy="176" r="4"/></g>}</g>
    {index >= 8 && <g className="cosmic-ring" fill="none" stroke="#f8e7a1" strokeWidth="2"><ellipse cx="228" cy="160" rx="151" ry="70" transform="rotate(-12 228 160)" strokeDasharray="7 10"/><ellipse cx="228" cy="160" rx="127" ry="139" transform="rotate(58 228 160)" opacity=".38"/></g>}
  </g>
}

function GroundLife({ index }: { index: number }) {
  return <g className="ground-life"><g fill="#146b50"><path d="M73 296c-4-25 7-41 16-48 4 20-1 37-16 48Z"/><path d="M91 298c0-23 13-37 25-42-1 20-9 34-25 42Z"/><path d="M345 297c-2-25 10-41 21-47 2 20-5 37-21 47Z"/></g>{index >= 4 && <g className="wildflowers">{[50,77,106,326,354,389].map((x, i) => <g key={x}><path d={`M${x} 310v-15`} stroke="#136044" strokeWidth="2"/><path d={`M${x - 5} 297q5-7 10 0q-5 7-10 0Z`} fill={i % 2 ? '#f9a8d4' : '#fde68a'}/></g>)}</g>}{index >= 5 && <g className="forest-companions" fill="#185d49"><path d="M125 297l18-51 19 51Z"/><rect x="140" y="288" width="6" height="18" rx="3"/><path d="M294 297l17-47 18 47Z"/><rect x="308" y="289" width="6" height="17" rx="3"/></g>}</g>
}

const levelCopy = ['Başlangıç görünmez olabilir; yine de kök salmaya başladı.','İlk filiz, tekrar etmeye değer küçük bir niyeti temsil ediyor.','Fidanın gövdesi güçleniyor; alışkanlıkların biçim kazanıyor.','Ağaç artık kendi gölgesini kuruyor; ritmin belirginleşiyor.','Tek bir ağaç çevresine hayat çağırıyor; istikrarın yayılıyor.','Dağ silueti beliriyor; uzun soluklu emeğin ufku genişliyor.','Yıldızlar sahneye katılıyor; sürekliliğin yeni işaretler bırakıyor.','Güneş doğuyor; kökle gökyüzü aynı hikâyede buluşuyor.','Galaksi halkaları açılıyor; farklı alanlardaki emeklerin birleşiyor.','Evren tamamlandı; sahnen, uzun yolculuğunun yaşayan bir haritası.']
