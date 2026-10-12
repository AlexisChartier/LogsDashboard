import type { LogLevel } from '../types'

interface LevelStyle {
  badge: string
  border: string
  row: string
}

/**
 * Styles associés à chaque niveau de sévérité. La sévérité est signalée à trois
 * endroits : un badge (texte + fond), une bordure à gauche et, pour error/critical
 * uniquement, un léger fond de ligne.
 */
const LEVEL_STYLES: Record<LogLevel, LevelStyle> = {
  debug: {
    badge: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',
    border: 'border-l-slate-400/70',
    row: '',
  },
  info: {
    badge: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-300',
    border: 'border-l-blue-500/70',
    row: '',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300',
    border: 'border-l-amber-500/70',
    row: '',
  },
  error: {
    badge: 'bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-300',
    border: 'border-l-red-500/80',
    row: 'bg-red-500/[0.04]',
  },
  critical: {
    badge: 'bg-red-600 text-white ring-red-600/40',
    border: 'border-l-red-600',
    row: 'bg-red-500/[0.07]',
  },
}

export function getLevelBadgeClass(level: LogLevel): string {
  return LEVEL_STYLES[level].badge
}

export function getLevelBorderClass(level: LogLevel): string {
  return LEVEL_STYLES[level].border
}

export function getLevelRowClass(level: LogLevel): string {
  return LEVEL_STYLES[level].row
}

export function getDurationClass(durationMs: number): string {
  if (durationMs < 500) return 'text-emerald-600 dark:text-emerald-400'
  if (durationMs <= 1500) return 'text-amber-600 dark:text-amber-400'
  return 'font-semibold text-red-600 dark:text-red-400'
}

export function getHttpStatusClass(httpStatus: number): string {
  if (httpStatus >= 200 && httpStatus < 300) return 'text-emerald-600 dark:text-emerald-400'
  if (httpStatus >= 400 && httpStatus < 500) return 'text-amber-600 dark:text-amber-400'
  if (httpStatus >= 500 && httpStatus < 600) return 'text-red-600 dark:text-red-400'
  return 'text-ink-muted'
}

/**
 * Convertit un horodatage ISO au format timestamp HH:mm:ss.SSS.
 * On extrait l'heure à la main plutôt que via Date, car l'API renvoie parfois des
 * microsecondes que Date n'interprète pas de façon fiable.
 */
export function formatTimestamp(iso: string): string {
  const match = iso.match(/T(\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?/)
  if (!match) return iso
  const milliseconds = (match[2] ?? '0').padEnd(3, '0')
  return `${match[1]}.${milliseconds}`
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`
  const seconds = durationMs / 1000
  if (seconds < 60) return `${seconds.toFixed(1).replace('.', ',')} s`
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds - minutes * 60)
  return `${minutes} min ${String(remaining).padStart(2, '0')} s`
}
