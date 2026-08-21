type AppIconProps = {
  name: string
  className?: string
  label?: string
}

/** Tek ve tutarlı ikon dili için mevcut Tabler webfont katmanı. */
export function AppIcon({ name, className = '', label }: AppIconProps) {
  return (
    <span
      className={`ti ti-${name} app-icon ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  )
}
