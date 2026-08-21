const ALLOWED_DESTINATIONS = ['/', '/feedback', '/admin/feedback'] as const

export function getSafeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  const pathname = value.split(/[?#]/, 1)[0]
  return ALLOWED_DESTINATIONS.includes(pathname as (typeof ALLOWED_DESTINATIONS)[number]) ? pathname : '/'
}
