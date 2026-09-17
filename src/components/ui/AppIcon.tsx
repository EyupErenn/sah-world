type AppIconProps = {
  name: string
  className?: string
  label?: string
}

/** Tek ve tutarlı ikon dili için mevcut Tabler webfont katmanı. */
export function AppIcon({ name, className = '', label }: AppIconProps) {
  // Keep the global search affordance visible even when the icon CDN fails.
  if (name === 'search') return (
    <svg className={`app-icon ${className}`.trim()} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>
      <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
    </svg>
  )
  return (
    <span
      className={`ti ti-${name} app-icon ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  )
}
