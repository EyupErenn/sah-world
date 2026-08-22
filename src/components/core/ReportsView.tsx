'use client';

import { useMemo, useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { buildActivityFeed, CATEGORY_META, dayKey, getCategoryCounts, getDailyActivity, type ActivityCategory } from '@/lib/activity';
import { AppIcon } from '@/components/ui/AppIcon';

export default function ReportsView() {
  const store = useJourneyStore();
  const [heatRange, setHeatRange] = useState<'month'|'year'>('month');
  const [trendRange, setTrendRange] = useState<30|90>(30);
  const events = buildActivityFeed(store);
  const daily = useMemo(() => getDailyActivity(events), [events]);
  const counts = getCategoryCounts(store);
  const tasks = Object.values(store.eisenhower).flat();
  const now = new Date(); const today = dayKey(now); const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekCount = events.filter(e => new Date(e.createdAt) >= weekStart).length;
  const weekEvents = events.filter(e => new Date(e.createdAt) >= weekStart);
  const weekActive = new Set(weekEvents.map(event => dayKey(event.createdAt))).size;
  const monthActive = [...daily.keys()].filter(k => new Date(`${k}T12:00:00`) >= monthStart).length;
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  const bestStreak = bestRun([...daily.keys()]);
  const topWeekCategory = (Object.entries(weekEvents.reduce<Record<string,number>>((acc,event)=>({...acc,[event.category]:(acc[event.category]??0)+1}),{})).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'journal') as ActivityCategory;
  const recentMood = store.journal.filter(item=>new Date(item.createdAt)>=weekStart).map(item=>item.mood);
  const moodAverage = recentMood.length ? recentMood.reduce((sum,value)=>sum+value,0)/recentMood.length : 0;

  return <div className="view-stack reports-view"><header className="page-heading"><div><span className="eyebrow">GELİŞİM İÇGÖRÜLERİ</span><h1>Raporlarım</h1><p>Rakamları yargı için değil, ritmini anlamak ve dengen için kullan.</p></div><span className="quiet-chip">Son güncelleme · şimdi</span></header>
    <div className="stat-grid report-stats">
      <ReportStat icon="sparkles" label="Toplam XP" value={store.xp.toLocaleString('tr-TR')}/><ReportStat icon="calendar-week" label="Bu hafta kayıt" value={weekCount}/><ReportStat icon="calendar-check" label="Bugünün kaydı" value={daily.get(today)??0}/><ReportStat icon="notes" label="Toplam kayıt" value={total}/><ReportStat icon="flame" label="En iyi seri" value={`${bestStreak} gün`}/><ReportStat icon="calendar-stats" label="Bu ay aktif gün" value={monthActive}/>
    </div>
    <section className="surface-card weekly-digest-card"><div className="digest-symbol"><AppIcon name="wand" /></div><div><span className="eyebrow">BU HAFTANIN ÖZETİ</span><h2>{weekCount ? `Ritmin bu hafta ${CATEGORY_META[topWeekCategory].label} alanında güçlendi.` : 'Bu haftanın hikâyesi ilk kaydını bekliyor.'}</h2><p>{weekCount ? `${weekCount} kayıt ${weekActive || 1} aktif güne yayıldı.${moodAverage ? ` Günlüklerindeki ortalama ruh hali ${moodAverage.toFixed(1)}/5.` : ''} Tek bir güne yüklenmek yerine küçük adımları yayman, sürdürülebilir bir ritim kurduğunu gösterir.` : 'Kendine uzun bir rapor borçlu değilsin. Bugünden tek bir cümle bıraktığında burası sana anlamlı bir içgörü sunmaya başlayacak.'}</p></div><span className="digest-chip"><AppIcon name="calendar-week" /> Son 7 gün</span></section>
    <section className="surface-card heatmap-card"><div className="card-heading"><div><span className="eyebrow">DÜZENLİLİK</span><h2>Aktivite takvimi</h2></div><Segment value={heatRange} onChange={v=>setHeatRange(v as 'month'|'year')} options={[['month','Bu Ay'],['year','Bu Yıl']]}/></div><Heatmap daily={daily} range={heatRange}/><div className="heat-legend"><span>Daha az</span>{[0,1,2,3,4].map(i=><i key={i} className={`heat-${i}`}/>)}<span>Daha çok</span></div></section>
    <div className="reports-grid">
      <section className="surface-card"><div className="card-heading"><div><span className="eyebrow">DENGE</span><h2>Kategori dağılımı</h2></div></div><CategoryBreakdown counts={counts}/></section>
      <section className="surface-card"><div className="card-heading"><div><span className="eyebrow">İLERLEME</span><h2>XP trendi</h2></div><Segment value={String(trendRange)} onChange={v=>setTrendRange(Number(v) as 30|90)} options={[["30","30 Gün"],["90","90 Gün" ]]}/></div><TrendChart events={events} days={trendRange}/></section>
    </div>
    <section className="surface-card goals-card"><div className="card-heading"><div><span className="eyebrow">ÖNCELİKLER</span><h2>Hedef tamamlama</h2></div><strong className="completion-total">{tasks.length ? Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0}%</strong></div>{tasks.length===0?<div className="empty-state compact"><i><AppIcon name="layout-grid"/></i><strong>Önceliklerin şekillenmeye hazır</strong><p>İlk görevini eklediğinde hangi alanlara enerji verdiğini burada sakin ve net biçimde görebilirsin.</p></div>:<div className="quadrant-progress">{(['q1','q2','q3','q4'] as const).map((q,i)=>{const list=store.eisenhower[q], done=list.filter(t=>t.done).length, pct=list.length?done/list.length*100:0;return <article key={q}><span><b>Q{i+1}</b>{['Acil + Önemli','Önemli','Devredilebilir','Sadeleştir'][i]}</span><div><i style={{width:`${pct}%`}}/></div><strong>{done}/{list.length}</strong></article>})}</div>}</section>
  </div>;
}

function ReportStat({icon,label,value}:{icon:string;label:string;value:string|number}){return <article className="stat-card report-stat"><span className="stat-icon indigo"><AppIcon name={icon}/></span><div><small>{label}</small><strong>{value}</strong></div></article>}
function Segment({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:string[][]}){return <div className="segment">{options.map(([v,l])=><button className={value===v?'active':''} key={v} onClick={()=>onChange(v)}>{l}</button>)}</div>}

function Heatmap({daily,range}:{daily:Map<string,number>;range:'month'|'year'}){const now=new Date(); const days=range==='month'?new Date(now.getFullYear(),now.getMonth()+1,0).getDate():365; const start=range==='month'?new Date(now.getFullYear(),now.getMonth(),1):new Date(now.getFullYear(),0,1); const cells=Array.from({length:days},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const count=d>now?0:(daily.get(dayKey(d))??0);return {d,count,future:d>now}}); const max=Math.max(1,...cells.map(c=>c.count));const active=cells.filter(c=>c.count>0).length;return <div className={`heatmap ${range}`} role="img" aria-label={`${range==='month'?'Bu ay':'Bu yıl'} ${active} aktif gün var.`}>{cells.map(({d,count,future})=>{const level=count===0?0:Math.min(4,Math.ceil(count/max*4));return <span key={dayKey(d)} className={`heat-${level} ${future?'future':''}`} title={`${d.toLocaleDateString('tr-TR')}: ${count} kayıt`}><b>{range==='month'?d.getDate():''}</b></span>})}</div>}

function CategoryBreakdown({counts}:{counts:Record<ActivityCategory,number>}){const entries=Object.entries(counts) as [ActivityCategory,number][];const total=Math.max(1,entries.reduce((a,[,v])=>a+v,0));let offset=0;const stops=entries.map(([key,val])=>{const start=offset;offset+=val/total*100;return `${CATEGORY_META[key].color} ${start}% ${offset}%`}).join(',');return <div className="category-layout"><div className="donut" style={{background:entries.some(([,v])=>v)?`conic-gradient(${stops})`:'#eef2f7'}}><span><strong>{total===1&&entries.every(([,v])=>v===0)?0:total}</strong><small>kayıt</small></span></div><div className="category-list">{entries.map(([key,val])=><article key={key}><i style={{background:CATEGORY_META[key].color}}/><span>{CATEGORY_META[key].label}</span><div><b style={{width:`${val/total*100}%`,background:CATEGORY_META[key].color}}/></div><strong>{val}</strong></article>)}</div></div>}

function TrendChart({events,days}:{events:ReturnType<typeof buildActivityFeed>;days:number}){const now=new Date();const points=Array.from({length:days},(_,i)=>{const d=new Date(now);d.setDate(now.getDate()-(days-1-i));const cutoff=new Date(d);cutoff.setHours(23,59,59,999);return events.filter(e=>new Date(e.createdAt)<=cutoff).reduce((s,e)=>s+e.xp,0)});const max=Math.max(1,...points);const path=points.map((v,i)=>`${i?'L':'M'} ${(i/(points.length-1))*560} ${190-(v/max)*160}`).join(' ');return <div className="trend-chart"><svg viewBox="0 0 560 210" preserveAspectRatio="none"><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6366f1" stopOpacity=".3"/><stop offset="1" stopColor="#6366f1" stopOpacity="0"/></linearGradient></defs><path d={`${path} L560 205 L0 205 Z`} fill="url(#trendFill)"/><path d={path} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg><div><span>{days} gün önce</span><strong>+{points.at(-1)?.toLocaleString('tr-TR')??0} XP hareketi</strong><span>Bugün</span></div></div>}

function bestRun(keys:string[]){const sorted=[...new Set(keys)].sort();let best=0,current=0,prev='';for(const key of sorted){if(!prev){current=1}else{const d=new Date(prev+'T12:00:00');d.setDate(d.getDate()+1);current=dayKey(d)===key?current+1:1}best=Math.max(best,current);prev=key}return best}
