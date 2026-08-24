import { AppIcon } from '@/components/ui/AppIcon'

export default function PurposeEquation({ compact = false }: { compact?: boolean }) {
  return <aside className={`purpose-equation ${compact ? 'is-compact' : ''}`} aria-label="Amel, niyet ve sonuç üzerine tefekkür notu">
    <span className="purpose-equation-icon"><AppIcon name="sparkles" /></span>
    <div className="purpose-formula" aria-label="Sonuç eşittir amel çarpı niyet">
      <span>S</span><i>=</i><b>A</b><i>×</i><b>N</b>
    </div>
    <div><strong>Sonuç = Amel × Niyet</strong><p>Amel görünür adımdır; niyet yönünü belirler. Bu, XH hesabı değil; her adımın anlamını hatırlatan bir tefekkür metaforudur.</p></div>
  </aside>
}
