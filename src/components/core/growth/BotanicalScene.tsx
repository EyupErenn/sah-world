'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { Vitality } from '@/lib/growthScene'
import styles from './GrowthScene.module.css'

type Props = { uid: string; stage: number; fedAreas: number; vitality: Vitality; playing: boolean; pulse: boolean; label: string }
const clusters = [
  { x: 203, y: 199, rx: 58, ry: 42, angle: -19 },
  { x: 278, y: 142, rx: 63, ry: 49, angle: 14 },
  { x: 331, y: 183, rx: 60, ry: 44, angle: 25 },
  { x: 239, y: 171, rx: 62, ry: 47, angle: -10 },
  { x: 271, y: 221, rx: 59, ry: 39, angle: 5 },
  { x: 334, y: 240, rx: 43, ry: 34, angle: -18 },
]
const roots = [
  'M274 412C248 426 235 455 208 477s-40 22-55 38',
  'M278 412C299 443 328 443 351 470s35 19 46 43',
  'M272 414C270 447 256 463 254 510',
  'M281 412C288 443 280 472 301 517',
]
const leafPath = 'M-9 0C-6-5 2-7 9 0C4 6-4 6-9 0Z'

/** Eight independently lit layers. Geometry is deterministic, with no bitmap or canvas payload. */
export function BotanicalScene({ uid, stage, fedAreas, vitality, playing, pulse, label }: Props) {
  const reduced = useReducedMotion()
  const maturity = Math.max(0, Math.min(10, stage))
  const treeScale = .68 + Math.min(8, maturity) * .04
  const canopyScale = .64 + Math.min(8, maturity) * .04
  const earlyOpacity = Math.max(0, Math.min(1, 2 - maturity))
  const treeOpacity = Math.max(0, Math.min(1, maturity - 1))
  const rootScale = .35 + maturity * .065
  return <svg className={styles.landscape} viewBox="0 0 560 560" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label}>
    <defs>
      <linearGradient id={`${uid}-sky`} x2="0" y2="1"><stop stopColor="var(--sky-top)"/><stop offset=".65" stopColor="var(--sky-mid)"/><stop offset="1" stopColor="var(--sky-low)"/></linearGradient>
      <radialGradient id={`${uid}-sun`}><stop stopColor="var(--sun-core)" stopOpacity=".85"/><stop offset=".16" stopColor="var(--sun-core)" stopOpacity=".65"/><stop offset="1" stopColor="var(--sun-core)" stopOpacity="0"/></radialGradient>
      <linearGradient id={`${uid}-rays`} x1="1" y1="0" x2="0" y2="1"><stop stopColor="var(--sun-core)" stopOpacity=".4"/><stop offset="1" stopColor="var(--sun-core)" stopOpacity="0"/></linearGradient>
      <linearGradient id={`${uid}-meadow`} x2="0" y2="1"><stop stopColor="var(--meadow-light)"/><stop offset="1" stopColor="var(--meadow-dark)"/></linearGradient>
      <linearGradient id={`${uid}-soil`} x2="0" y2="1"><stop stopColor="var(--soil-light)"/><stop offset=".3" stopColor="var(--soil-mid)"/><stop offset="1" stopColor="var(--soil-dark)"/></linearGradient>
      <linearGradient id={`${uid}-bark`}><stop stopColor="var(--bark-shadow)"/><stop offset=".45" stopColor="var(--bark-mid)"/><stop offset=".82" stopColor="var(--bark-light)"/><stop offset="1" stopColor="var(--bark-mid)"/></linearGradient>
      <radialGradient id={`${uid}-foliage`} cx="76%" cy="20%" r="90%"><stop stopColor="var(--leaf-rim)"/><stop offset=".25" stopColor="var(--leaf-light)"/><stop offset=".6" stopColor="var(--leaf-mid)"/><stop offset="1" stopColor="var(--leaf-shadow)"/></radialGradient>
      <radialGradient id={`${uid}-haze`}><stop stopColor="var(--haze)" stopOpacity=".55"/><stop offset="1" stopColor="var(--haze)" stopOpacity="0"/></radialGradient>
      <filter id={`${uid}-soft`}><feGaussianBlur stdDeviation="5"/></filter>
      <filter id={`${uid}-far`}><feGaussianBlur stdDeviation="1.8"/></filter>
      <filter id={`${uid}-contact`} x="-50%" width="200%" y="-100%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id={`${uid}-crown-shadow`} x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="-5" dy="8" stdDeviation="5" floodColor="var(--leaf-shadow)" floodOpacity=".3"/></filter>
      <pattern id={`${uid}-grain`} width="31" height="29" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".6" fill="var(--grain)" opacity=".2"/><circle cx="17" cy="23" r=".5" fill="var(--grain)" opacity=".15"/><path d="m24 9 2 1M8 19h1" stroke="var(--grain)" opacity=".12" strokeWidth=".5"/></pattern>
      <path id={`${uid}-leaf`} d={leafPath}/>
    </defs>
    <g data-layer="sky"><rect width="560" height="560" fill={`url(#${uid}-sky)`}/><ellipse cx="290" cy="248" rx="390" ry="155" fill={`url(#${uid}-haze)`}/></g>
    <g data-layer="clouds" fill="var(--cloud)" filter={`url(#${uid}-soft)`} opacity=".55">
      {[{x:84,y:111,s:1},{x:340,y:70,s:.68},{x:468,y:157,s:.8},{x:25,y:232,s:.55}].map((cloud,index)=><g key={index} transform={`translate(${cloud.x} ${cloud.y}) scale(${cloud.s})`}><g className={styles.cloud} style={{animationDuration:`${70+index*14}s`,animationDelay:`-${index*19}s`}}><ellipse rx="64" ry="12"/><ellipse cx="-23" cy="-8" rx="30" ry="15"/><ellipse cx="12" cy="-14" rx="34" ry="19"/></g></g>)}
    </g>
    <g data-layer="sun" data-part="sukur" className={styles.part}>
      <circle cx="442" cy="83" r="119" fill={`url(#${uid}-sun)`}/><circle cx="442" cy="83" r="17" fill="var(--sun-core)" opacity=".7"/>
      <g className={styles.rays} fill={`url(#${uid}-rays)`}><path d="M450 63 93 434 152 467Z"/><path d="M451 65 271 417 339 429Z"/><path d="M451 65 411 413 455 413Z"/></g>
    </g>
    <g data-layer="hills">
      <path d="M-30 319C40 257 103 237 171 266S283 300 364 249 472 244 590 204V440H-30Z" fill="var(--hill-far)" filter={`url(#${uid}-far)`}/>
      <path d="M-30 354C48 287 130 309 191 323S309 266 396 304 494 302 590 267V448H-30Z" fill="var(--hill-middle)"/>
      <path d="M-30 384C41 360 85 325 155 345S269 378 346 338 463 335 590 319V450H-30Z" fill="var(--hill-near)"/>
      <ellipse cx="415" cy="307" rx="250" ry="42" fill={`url(#${uid}-haze)`} opacity=".5"/>
    </g>
    <g data-layer="meadow"><path d="M0 402C124 365 170 387 263 382S451 359 560 389V467H0Z" fill={`url(#${uid}-meadow)`}/><path d="M365 384C344 399 397 413 452 431H514C445 407 385 398 389 380Z" fill="var(--path)" opacity=".42"/><ellipse cx="215" cy="417" rx={55+stage*5} ry="13" transform="rotate(-10 215 417)" fill="var(--shadow)" opacity=".25" filter={`url(#${uid}-contact)`}/><ellipse cx="276" cy="414" rx="27" ry="7" fill="var(--shadow)" opacity=".5" filter={`url(#${uid}-contact)`}/></g>
    <motion.g data-layer="tree" animate={{scale: pulse && playing ? 1.02 : 1}} transition={playing ? {type:'spring',stiffness:200,damping:13} : {duration:0}} style={{transformOrigin:'280px 412px'}}>
      <g opacity={earlyOpacity} style={{transition:'opacity 1s'}}>
        <ellipse cx="277" cy="409" rx="10" ry="6" fill="var(--bark-light)"/>
        <g transform={`translate(280 410) scale(${.35+Math.min(1,maturity)*.65})`}><path d="M0 0C-7-22-1-47 4-61" fill="none" stroke="var(--leaf-mid)" strokeWidth="5"/><path d="M1-27C-32-26-36-53-22-50S-2-41 1-27ZM3-50c3-29 33-28 32-16S19-48 3-50Z" fill={`url(#${uid}-foliage)`}/></g>
      </g>
      <g opacity={treeOpacity} style={{transform:`translate(${280-280*treeScale}px,${414-414*treeScale}px) scale(${treeScale})`,transition:reduced?'none':'transform 1.4s ease, opacity 1s'}}>
        <g className={styles.treeWind}>
          <g data-part="focus" className={styles.part}><path d="M266 414C271 376 271 346 265 313C259 275 277 231 280 191C290 230 286 271 288 310C283 347 288 381 292 414Z" fill={`url(#${uid}-bark)`}/><path d="M286 406C278 363 282 337 277 310S279 252 282 222" fill="none" stroke="var(--bark-rim)" strokeWidth="2" opacity=".65"/><path d="M272 409c-5-41 2-54-3-77m12 51-3-38m-8-39 1-28" fill="none" stroke="var(--bark-shadow)" strokeWidth="2" opacity=".6"/></g>
          <g data-part="profession" className={styles.part} fill="none" stroke={`url(#${uid}-bark)`} strokeLinecap="round"><path d="M277 337C254 308 231 287 196 259M280 307C306 281 330 260 352 234M274 285C251 253 240 229 237 202M281 264C301 226 302 198 299 173" strokeWidth="9"/><path d="M235 289c-28-2-46-13-58-34M316 272c23-6 39-16 51-30M254 250c-3-29-14-47-30-61M299 224c24-17 42-35 52-59" strokeWidth="4"/></g>
          <g data-part="journal" className={styles.part} style={{transform:`translate(${280-280*canopyScale}px,${200-200*canopyScale}px) scale(${canopyScale})`,transition:reduced?'none':'transform 1.4s ease'}}>
            {clusters.map((cluster,index)=><g key={index} transform={`translate(${cluster.x} ${cluster.y}) rotate(${cluster.angle})`} opacity={Math.min(1,Math.max(.2,(maturity-1)*.55+(.2-index*.025)))}>
              <g className={styles.foliage} style={{animationDelay:`-${index*1.6}s`}}>
                <path d={`M${-cluster.rx} 0C${-cluster.rx-5} ${-cluster.ry*.6} ${-cluster.rx*.6} ${-cluster.ry} -12 ${-cluster.ry*.88}C12 ${-cluster.ry*1.2} ${cluster.rx*.72} ${-cluster.ry*.87} ${cluster.rx*.8} -14C${cluster.rx*1.2} 9 ${cluster.rx*.8} ${cluster.ry*.83} 21 ${cluster.ry*.85}C-12 ${cluster.ry*1.1} ${-cluster.rx*.93} ${cluster.ry*.65} ${-cluster.rx} 0Z`} fill={`url(#${uid}-foliage)`} filter={`url(#${uid}-crown-shadow)`}/>
                <g data-part="quran" className={styles.part}>{Array.from({length:24},(_,leaf)=>{
                  const angle=leaf*2.399+index
                  const distance=Math.sqrt((leaf+.5)/24)
                  const x=Math.cos(angle)*cluster.rx*distance
                  const y=Math.sin(angle)*cluster.ry*distance
                  return <use key={leaf} href={`#${uid}-leaf`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${leaf*37}) scale(${.55+(leaf%4)*.12})`} fill={leaf%3===0?'var(--leaf-rim)':leaf%3===1?'var(--leaf-light)':'var(--leaf-shadow)'} opacity={leaf%3===0?.46:.27}/>
                })}</g>
                <path d={`M8 ${-cluster.ry*.76}Q${cluster.rx*.7} ${-cluster.ry*.8} ${cluster.rx*.82} -8`} stroke="var(--leaf-rim)" strokeWidth="1.5" fill="none" opacity=".6"/>
              </g>
            </g>)}
          </g>
        </g>
      </g>
    </motion.g>
    <g data-layer="foreground">
      {Array.from({length:38},(_,index)=>{const x=(index*79)%560;const y=418+(index%4)*4;return <g key={index} transform={`translate(${x} ${y})`}><path className={styles.grass} style={{animationDelay:`-${index%7}s`}} d={`M0 0q-3-${8+index%9} -8-${11+index%13}Q-1-9 0 0q1-${12+index%12} 8-${17+index%9}Q2-5 0 0Z`} fill={index%2?'var(--grass)':'var(--meadow-light)'}/></g>})}
      <g fill="var(--stone)"><path d="m91 424 4-10 15-4 13 8-3 7Z"/><path d="m401 414 5-7 8 1 7 8Z"/></g>
      <path d="m97 415 12-3 10 7-12-2Z" fill="var(--stone-light)"/>
    </g>
    <g data-layer="soil" data-part="lessons" className={styles.part}><path d="M0 431C106 417 164 438 273 426S448 444 560 426V560H0Z" fill={`url(#${uid}-soil)`}/><path d="M0 431C106 417 164 438 273 426S448 444 560 426" fill="none" stroke="var(--grass)" strokeWidth="4"/>
      {Array.from({length:40},(_,index)=><ellipse key={index} cx={(index*83)%560} cy={449+(index*17)%109} rx={1+index%3} ry="1" fill="var(--soil-speck)" opacity=".25"/>)}
      <g data-part="mescidim" className={styles.part} style={{transform:`translate(${278-278*rootScale}px,${425-425*rootScale}px) scale(${rootScale})`,transition:reduced?'none':'transform 1.4s ease'}}>
        <g fill="none" stroke={`url(#${uid}-bark)`} strokeLinecap="round"><path d="M278 424v-15" strokeWidth="11"/>{roots.map((path,index)=><path key={path} d={path} strokeWidth={5-index*.7}/>)}<path d="M238 449q-39-4-62 15M219 468q-4 26-30 39M335 452q25-3 46 10M350 470q0 19 22 33M260 475l-21 17M290 474l24 13" strokeWidth="1.8"/></g>
        <g fill="var(--pollen)" opacity={fedAreas/7}>{[[153,515],[397,513],[254,510],[301,517]].map(([x,y])=><circle key={x} cx={x} cy={y} r="3" className={styles.rootTip}/>)}</g>
        {pulse&&roots.map((path,index)=><path key={path} d={path} fill="none" stroke="var(--pollen)" strokeWidth="3" pathLength="100" className={styles.rootDrop} style={{animationDelay:`${index*.08}s`}}/>)}
      </g>
    </g>
    <rect width="560" height="560" fill={`url(#${uid}-grain)`} opacity=".55" pointerEvents="none"/>
    <g className={styles.pollen} aria-hidden="true">{Array.from({length:12},(_,index)=><circle key={index} cx={65+(index*97)%439} cy={140+(index*61)%260} r={index%3===0?1.8:1} fill="var(--pollen)" className={styles.mote} style={{animationDelay:`-${index*.8}s`,animationDuration:`${6+index%4}s`}}/>)}</g>
    {pulse&&<g fill="var(--pollen)">{Array.from({length:6},(_,index)=><circle key={index} cx={274+(index-3)*12} cy={300+(index%3)*12} r="2" className={styles.burst} style={{animationDelay:`${index*.07}s`}}/>)}</g>}
    {vitality==='radiant'&&<g className={styles.birds} fill="none" stroke="var(--bird)" strokeWidth="1.5" opacity=".5"><path d="M90 133q6-7 13 0 6-6 12 0M116 116q5-5 10 0 5-4 9 0M142 133q4-4 8 0 4-4 8 0"/></g>}
  </svg>
}
