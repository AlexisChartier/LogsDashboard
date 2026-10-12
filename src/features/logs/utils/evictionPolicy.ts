import { isGapEntry, type LogEntry, type LogItem, type LogLevel } from '../types'
import { createGapMarker } from './markerBuilder'

export const MAX_LOGS = 5000

/**
 * Indice d'importance de chaque sévérité, utilisé par l'éviction : plus l'indice est
 * bas, plus le log est sacrifié en premier.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
}

/**
 * Éviction intelligente : dès que la liste dépasse MAX_LOGS, on supprime d'abord les
 * logs les moins importants (debug < info < warning < error < critical), puis les plus
 * anciens à importance égale. Les marqueurs, eux, ne sont jamais supprimés.
 */
export function evictOverflow(items: LogItem[]): {
  items: LogItem[]
  evicted: Partial<Record<LogLevel, number>>
  total: number
} {
  const overflow = items.length - MAX_LOGS
  if (overflow <= 0) return { items, evicted: {}, total: 0 }

  const candidates: number[] = []
  for (let index = 0; index < items.length; index += 1) {
    if (!isGapEntry(items[index])) candidates.push(index)
  }

  candidates.sort((a, b) => {
    const left = items[a] as LogEntry
    const right = items[b] as LogEntry
    const priority = LOG_LEVEL_PRIORITY[left.level] - LOG_LEVEL_PRIORITY[right.level]
    if (priority !== 0) return priority
    const byTime = left.timestamp.localeCompare(right.timestamp)
    return byTime !== 0 ? byTime : a - b
  })

  const victimCount = Math.min(overflow, candidates.length)
  const victims = new Set(candidates.slice(0, victimCount))

  const kept: LogItem[] = []
  const evicted: Partial<Record<LogLevel, number>> = {}
  for (let index = 0; index < items.length; index += 1) {
    if (victims.has(index)) {
      const level = (items[index] as LogEntry).level
      evicted[level] = (evicted[level] ?? 0) + 1
      continue
    }
    kept.push(items[index])
  }

  return { items: kept, evicted, total: victimCount }
}

/**
 * Insère (ou fait grossir) un marqueur d'éviction cumulatif en tête de liste : on
 * affiche ainsi le total des logs supprimés sans créer une nouvelle ligne à chaque
 * cycle de rafraîchissement.
 */
export function withEvictionMarker(
  items: LogItem[],
  evicted: Partial<Record<LogLevel, number>>,
  total: number,
): LogItem[] {
  if (total === 0) return items

  const head = items[0]
  if (head && isGapEntry(head) && head.kind === 'evicted') {
    const breakdown: Partial<Record<LogLevel, number>> = { ...head.breakdown }
    for (const [level, value] of Object.entries(evicted) as [LogLevel, number][]) {
      breakdown[level] = (breakdown[level] ?? 0) + value
    }
    return [{ ...head, count: head.count + total, breakdown }, ...items.slice(1)]
  }

  const marker = {
    ...createGapMarker('evicted', new Date().toISOString()),
    count: total,
    breakdown: evicted,
  }
  return [marker, ...items]
}

/**
 * Fusionne un nouveau lot dans la liste : on écarte d'abord les doublons (même id),
 * on insère les marqueurs (logs perdus / coupure) avant le lot, puis on applique
 * l'éviction au-delà de MAX_LOGS.
 */
export function appendBatch(
  previous: LogItem[],
  parsed: LogEntry[],
  markers: LogItem[],
): LogItem[] {
  const seen = new Set<string>()
  for (const item of previous) seen.add(item.id)

  const unique: LogEntry[] = []
  for (const log of parsed) {
    if (seen.has(log.id)) continue
    seen.add(log.id)
    unique.push(log)
  }

  if (unique.length === 0 && markers.length === 0) return previous

  const combined = [...previous, ...markers, ...unique]
  const { items, evicted, total } = evictOverflow(combined)
  return withEvictionMarker(items, evicted, total)
}
