'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import DashboardView from './DashboardView';
import ReportsView from './ReportsView';
import CommunityView from './CommunityView';
import SectionView, { type SectionKey } from './SectionView';
import LoginScreen from '@/components/auth/LoginScreen';
import { useAuthStore } from '@/store/useAuthStore';
import { useJourneyStore } from '@/store/useJourneyStore';
import { getLevelForXP } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

type ViewKey = 'dashboard'|'community'|'reports'|SectionKey;
const primaryNav: Array<{id:ViewKey;label:string;icon:string}> = [
  {id:'dashboard',label:'Evren',icon:'⌂'},{id:'journal',label:'Günlük',icon:'✎'},{id:'quran',label:'Kuran',icon:'◫'},{id:'hadis',label:'Hadis',icon:'❞'},{id:'matrix',label:'Matris',icon:'⊞'},{id:'lessons',label:'Hatalar',icon:'↺'},{id:'sukur',label:'Şükür',icon:'✦'},{id:'mescidim',label:'Mescidim',icon:'◌'},{id:'depot',label:'Depo',icon:'◇'},
];

export default function SahApp(){
  const {session,isAuthLoading,profile}=useAuthStore(); const store=useJourneyStore(); const [view,setView]=useState<ViewKey>('dashboard'); const [moreOpen,setMoreOpen]=useState(false); const [profileOpen,setProfileOpen]=useState(false); const {level}=getLevelForXP(store.xp);
  if(isAuthLoading)return <div className="app-loader"><span className="brand-mark">S</span><i/><p>Alan hazırlanıyor…</p></div>;
  if(!session)return <LoginScreen/>;
  const navigate=(next:string)=>{setView(next as ViewKey);setMoreOpen(false);window.scrollTo({top:0,behavior:'smooth'})};
  return <div className="core-app">
    <header className="topbar"><div className="topbar-inner"><button className="brand" onClick={()=>navigate('dashboard')}><span className="brand-mark">S</span><strong>SAH</strong><small>Kişisel gelişim alanı</small></button><nav className="main-nav" aria-label="Ana menü">{primaryNav.map(item=><button key={item.id} className={view===item.id?'active':''} onClick={()=>navigate(item.id)} title={item.label}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav><div className="top-actions"><button className={`nav-action ${view==='community'?'active':''}`} onClick={()=>navigate('community')}><i>◎</i><span>Topluluk</span></button><button className={`nav-action ${view==='reports'?'active':''}`} onClick={()=>navigate('reports')}><i>▥</i><span>Raporlar</span></button><button className="profile-button" onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen}><img src={profile?.avatar_url||`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile?.display_name||'Yolcu')}`} alt="Profil"/><span><strong>{profile?.display_name||'Yolcu'}</strong><small>{level.name} · {store.xp} XP</small></span><i>⌄</i></button></div></div>
      {profileOpen&&<div className="profile-popover"><div><img src={profile?.avatar_url||`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile?.display_name||'Yolcu')}`} alt=""/><span><strong>{profile?.display_name}</strong><small>↗ {store.streak.current} günlük seri</small></span></div><button onClick={()=>navigate('reports')}>▥ Gelişim raporlarım</button><button onClick={()=>navigate('community')}>◎ Topluluklarım</button><button className="signout" onClick={()=>void supabase.auth.signOut()}>Oturumu kapat</button></div>}
    </header>
    <main className="app-main">{view==='dashboard'?<DashboardView onNavigate={navigate}/>:view==='reports'?<ReportsView/>:view==='community'?<CommunityView/>:<SectionView section={view}/>}</main>
    <nav className="mobile-nav"><button className={view==='dashboard'?'active':''} onClick={()=>navigate('dashboard')}><i>⌂</i><span>Evren</span></button><button className={view==='journal'?'active':''} onClick={()=>navigate('journal')}><i>✎</i><span>Günlük</span></button><button className={view==='matrix'?'active':''} onClick={()=>navigate('matrix')}><i>⊞</i><span>Matris</span></button><button className={view==='community'?'active':''} onClick={()=>navigate('community')}><i>◎</i><span>Topluluk</span></button><button className={moreOpen?'active':''} onClick={()=>setMoreOpen(v=>!v)}><i>•••</i><span>Daha</span></button></nav>
    {moreOpen&&<div className="mobile-more">{[...primaryNav.filter(i=>!['dashboard','journal','matrix'].includes(i.id)),{id:'reports' as ViewKey,label:'Raporlar',icon:'▥'}].map(item=><button key={item.id} onClick={()=>navigate(item.id)}><i>{item.icon}</i><span>{item.label}</span></button>)}</div>}
  </div>;
}
