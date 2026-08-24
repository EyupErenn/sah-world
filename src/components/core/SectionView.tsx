'use client';

import { useState } from 'react';
import { useJourneyStore } from '@/store/useJourneyStore';
import { recordXpEvent } from '@/lib/xp';
import { AppIcon } from '@/components/ui/AppIcon';
import type { EisenhowerState } from '@/types';
import PrayerTimes from './PrayerTimes';

export type SectionKey = 'journal' | 'quran' | 'hadis' | 'matrix' | 'lessons' | 'sukur' | 'mescidim' | 'depot';

const meta: Record<SectionKey, { title: string; eyebrow: string; description: string; icon: string }> = {
  journal: { title: 'Günlük', eyebrow: 'KENDİNE DÖN', description: 'Duygularını yargılamadan fark et ve gününe küçük bir not bırak.', icon: 'notebook' },
  quran: { title: 'Kur’an Notlarım', eyebrow: 'TEFEKKÜR', description: 'Okuduğun ayetlerden sende kalan anlamı ve hayata taşıyacağın dersi kaydet.', icon: 'book-2' },
  hadis: { title: 'Hadis Notlarım', eyebrow: 'ÖĞREN VE UYGULA', description: 'Kaynağıyla birlikte not al, günlük hayata dönük bir niyet belirle.', icon: 'quote' },
  matrix: { title: 'Öncelik Matrisi', eyebrow: 'SADELEŞTİR', description: 'Önemli olanı acil olandan ayır ve enerjini bilinçli kullan.', icon: 'layout-grid' },
  lessons: { title: 'Hatalar ve Dersler', eyebrow: 'ŞEFKATLİ MUHASEBE', description: 'Kendini suçlamadan olanı gör, öğrendiğin dersi geleceğe taşı.', icon: 'history' },
  sukur: { title: 'Şükür Alanım', eyebrow: 'FARK ET', description: 'Bugünün içindeki küçük ve büyük nimetlere sakinlikle bak.', icon: 'sparkles' },
  mescidim: { title: 'Mescidim', eyebrow: 'MANEVİ MOLA', description: 'Kısa bir duruş, zikir sayacı ve günün tefekkür notları.', icon: 'building-mosque' },
  depot: { title: 'Ahiret Deposu', eyebrow: 'YOLCULUK ÖZETİ', description: 'Uygulamadaki istikrarının ve oluşturduğun kayıtların sakin bir özeti.', icon: 'archive' },
};

export default function SectionView({ section, onNavigate }: { section: SectionKey; onNavigate: (view: string) => void }) {
  const store = useJourneyStore();
  const [notice, setNotice] = useState('');
  const info = meta[section];

  const reward = (amount: number, label: string, sourceType: string, sourceId: string) => {
    store.addXP(amount); store.updateStreak(); store.checkBadges(); setNotice(`${label} kaydedildi · +${amount} XP`);
    void recordXpEvent({ sourceType, sourceId, label, amount });
    window.setTimeout(() => setNotice(''), 3200);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const fd = new FormData(form); const id = crypto.randomUUID(); const now = new Date();
    const createdAt = now.toISOString(); const date = createdAt.slice(0, 10);
    if (section === 'journal') { store.addJournal({ id, date, mood: Number(fd.get('mood')), energy: Number(fd.get('energy')), stress: Number(fd.get('stress')), content: String(fd.get('content')), tags: [], createdAt }); reward(25, 'Günlük kaydı', 'journal', id); }
    if (section === 'quran') { store.addQuranNote({ id, date, sure: String(fd.get('sure')), ayet: String(fd.get('ayet')), tefsir: String(fd.get('tefsir')), ders: String(fd.get('ders')), createdAt }); reward(35, 'Kuran notu', 'quran', id); }
    if (section === 'hadis') { store.addHadisNote({ id, date, metin: String(fd.get('metin')), kaynak: String(fd.get('kaynak')), konu: String(fd.get('konu')), uygulama: String(fd.get('uygulama')), createdAt }); reward(30, 'Hadis notu', 'hadis', id); }
    if (section === 'lessons') { store.addLesson({ id, date, title: String(fd.get('title')), wrong: String(fd.get('wrong')), learned: String(fd.get('learned')), severity: Number(fd.get('severity')), createdAt }); reward(25, 'Ders kaydı', 'lessons', id); }
    if (section === 'sukur') { store.addSukur({ id, date, text: String(fd.get('text')), nimets: [String(fd.get('n1')), String(fd.get('n2')), String(fd.get('n3'))], createdAt }); reward(20, 'Şükür kaydı', 'sukur', id); }
    form.reset();
  };

  return <div className="view-stack"><header className="page-heading section-heading"><div><span className="eyebrow">{info.eyebrow}</span><h1><i><AppIcon name={info.icon}/></i> {info.title}</h1><p>{info.description}</p></div>{notice && <span className="success-toast"><AppIcon name="check"/> {notice}</span>}</header>
    {section === 'matrix' ? <Matrix reward={reward} /> : section === 'mescidim' ? <PrayerTimes reward={reward} /> : section === 'depot' ? <Depot /> : <EntrySection section={section} onSubmit={submit} onNavigate={onNavigate} />}
  </div>;
}

function Field({ label, name, type = 'text', placeholder, required = true, min, max }: { label: string; name: string; type?: 'text' | 'textarea' | 'number'; placeholder: string; required?: boolean; min?: number; max?: number }) {
  const validation = {
    required, onInvalid: (event: React.InvalidEvent<HTMLInputElement | HTMLTextAreaElement>) => event.currentTarget.setCustomValidity('Bu alanı tamamlaman gerekiyor.'),
    onInput: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => event.currentTarget.setCustomValidity(''),
  };
  return <label className="field"><span>{label}</span>{type === 'textarea' ? <textarea name={name} placeholder={placeholder} rows={4} {...validation}/> : <input name={name} type={type} placeholder={placeholder} min={min} max={max} {...validation}/>}<small className="field-error">Bu alanı tamamlaman gerekiyor.</small></label>;
}

function EntrySection({ section, onSubmit, onNavigate }: { section: Exclude<SectionKey, 'matrix'|'mescidim'|'depot'>; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; onNavigate: (view: string) => void }) {
  const store = useJourneyStore();
  const lists = { journal: store.journal, quran: store.quranNotes, hadis: store.hadisNotes, lessons: store.lessons, sukur: store.sukurList };
  const items = lists[section];
  return <div className="workspace-grid"><form className="surface-card entry-form" onSubmit={onSubmit}><div className="card-heading"><div><span className="eyebrow">YENİ KAYIT</span><h2>Bugünden bir iz bırak</h2></div></div>
    {section === 'journal' && <><div className="three-fields"><Field label="Ruh hali (1-5)" name="mood" type="number" min={1} max={5} placeholder="3"/><Field label="Enerji (1-10)" name="energy" type="number" min={1} max={10} placeholder="7"/><Field label="Stres (1-10)" name="stress" type="number" min={1} max={10} placeholder="3"/></div><Field label="Bugün sende ne kaldı?" name="content" type="textarea" placeholder="Kendine dürüst ve şefkatli bir not..."/></>}
    {section === 'quran' && <><div className="two-fields"><Field label="Sure" name="sure" placeholder="Örn. İnşirah"/><Field label="Ayet" name="ayet" placeholder="Ayet numarası veya kısa referans"/></div><Field label="Tefsir / not" name="tefsir" type="textarea" placeholder="Okuduğundan anladığın..."/><Field label="Hayata taşıyacağım ders" name="ders" type="textarea" placeholder="Bugün uygulayabileceğim küçük bir adım..."/></>}
    {section === 'hadis' && <><div className="two-fields"><Field label="Kaynak" name="kaynak" placeholder="Örn. Buhârî"/><Field label="Konu" name="konu" placeholder="Örn. İstikrar"/></div><Field label="Hadis metni / kısa not" name="metin" type="textarea" placeholder="Kaynakla birlikte notun..."/><Field label="Hayata uygulama niyeti" name="uygulama" type="textarea" placeholder="Bunu bugün nasıl yaşayabilirim?"/></>}
    {section === 'lessons' && <><div className="two-fields"><Field label="Başlık" name="title" placeholder="Durumu kısa adlandır"/><Field label="Etkisi (1-5)" name="severity" type="number" min={1} max={5} placeholder="3"/></div><Field label="Ne oldu?" name="wrong" type="textarea" placeholder="Yargılamadan olayı tarif et..."/><Field label="Bundan ne öğrendim?" name="learned" type="textarea" placeholder="Bir sonraki sefer için küçük ve gerçekçi bir ders..."/></>}
    {section === 'sukur' && <><Field label="Bugünün şükür notu" name="text" type="textarea" placeholder="Bugün fark ettiğim..."/><div className="three-fields"><Field label="Nimet 1" name="n1" placeholder="Küçük de olabilir"/><Field label="Nimet 2" name="n2" placeholder="Bugünden"/><Field label="Nimet 3" name="n3" placeholder="Kalbine gelen"/></div></>}
    <ContextLinks section={section} onNavigate={onNavigate} />
    <button className="primary-button" type="submit">Kaydı tamamla</button></form>
    <section className="surface-card recent-card"><div className="card-heading"><div><span className="eyebrow">ARŞİV</span><h2>Son kayıtlar</h2></div><span className="quiet-chip">{items.length} toplam</span></div>{items.length === 0 ? <div className="empty-state"><i><AppIcon name="notes"/></i><strong>Bu sayfa ilk izini bekliyor</strong><p>Bugünden kalan tek bir cümle, zamanla anlamlı bir yolculuğa dönüşebilir.</p></div> : <div className="simple-records">{items.slice(0,8).map((item) => <article key={item.id}><strong>{new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long'}).format(new Date(item.createdAt))}</strong><p>{'content' in item ? item.content : 'ders' in item ? item.ders : 'uygulama' in item ? item.uygulama : 'learned' in item ? item.learned : item.text}</p></article>)}</div>}</section></div>;
}

function ContextLinks({ section, onNavigate }: { section: Exclude<SectionKey, 'matrix'|'mescidim'|'depot'>; onNavigate: (view: string) => void }) {
  const links = section === 'journal'
    ? [{ view: 'quran', icon: 'book-2', label: 'İlgili Kur’an notu ekle' }, { view: 'hadis', icon: 'quote', label: 'İlgili hadis notu ekle' }]
    : section === 'lessons'
      ? [{ view: 'matrix', icon: 'layout-grid', label: 'Bununla ilgili bir hedef oluştur' }]
      : ['quran', 'hadis'].includes(section)
        ? [{ view: 'journal', icon: 'notebook', label: 'Bunu günlüğüme yansıt' }]
        : [];
  if (!links.length) return null;
  return <div className="context-links"><span><AppIcon name="link" /> İstersen bu kaydı başka bir alanla derinleştir</span><div>{links.map((link) => <button type="button" key={link.view} onClick={() => onNavigate(link.view)}><AppIcon name={link.icon} /> {link.label}<AppIcon name="arrow-right" /></button>)}</div></div>;
}

function Matrix({ reward }: { reward: (a:number,l:string,s:string,id:string)=>void }) {
  const store = useJourneyStore(); const quadrants: Array<[keyof EisenhowerState,string,string]> = [['q1','Acil + Önemli','Şimdi yap'],['q2','Önemli + Acil değil','Planla'],['q3','Acil + Önemli değil','Sadeleştir'],['q4','Acil değil + Önemli değil','Ele']];
  const add = (event: React.FormEvent<HTMLFormElement>, q: keyof EisenhowerState) => { event.preventDefault(); const form=event.currentTarget; const text=String(new FormData(form).get('task')).trim(); if(!text)return; store.addTask(q,{id:crypto.randomUUID(),text,done:false,createdAt:new Date().toISOString()}); form.reset(); };
  return <div className="matrix-grid">{quadrants.map(([q,title,hint],i)=><section className={`surface-card quadrant q${i+1}`} key={q}><div className="card-heading"><div><span className="eyebrow">{hint}</span><h2>{title}</h2></div><span className="quiet-chip">{store.eisenhower[q].length}</span></div><form onSubmit={(e)=>add(e,q)} className="inline-form"><input name="task" placeholder="Yeni görev..."/><button type="submit">+</button></form><div className="task-list">{store.eisenhower[q].map(task=><label key={task.id}><input type="checkbox" checked={task.done} onChange={()=>{store.toggleTask(q,task.id); if(!task.done)reward(25,'Görev tamamlandı','matrix',task.id)}}/><span>{task.text}</span></label>)}</div></section>)}</div>;
}

function Depot(){const s=useJourneyStore();const total=s.journal.length+s.quranNotes.length+s.hadisNotes.length+s.lessons.length+s.sukurList.length+Object.values(s.eisenhower).flat().length;return <section className="surface-card depot-card"><div><span className="eyebrow">BÜTÜN YOLCULUK</span><h2>Biriken küçük adımların</h2><p>Buradaki sayılar yalnızca uygulamadaki kayıt ve istikrar özetidir.</p></div><div className="depot-metrics"><article><strong>{s.xp.toLocaleString('tr-TR')}</strong><span>Toplam XP</span></article><article><strong>{total}</strong><span>Toplam kayıt</span></article><article><strong>{s.streak.current}</strong><span>Günlük seri</span></article><article><strong>{s.badges.length}</strong><span>Kazanılan rozet</span></article></div></section>}
