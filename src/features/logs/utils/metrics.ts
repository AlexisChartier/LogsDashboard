import { isGapEntry, type LogItem, type LogLevel } from '../types'

export const SLOW_THRESHOLD_MS = 1500

const EMPTY_LEVEL_COUNTS: Record<LogLevel, number> = {
  debug: 0,
  info: 0,
  warning: 0,
  error: 0,
  critical: 0,
}

export interface LogMetrics {
  services: string[]
  levelCounts: Record<LogLevel, number>
  total: number
  errors: number
  critical: number
  slow: number
  losses: {
    evicted: number
    dropped: number
    disconnects: number
  }
}

/**
 * Calcule en une seule passe les indicateurs affichés en haut de la console :
 * services présents, compteurs par niveau, total et pertes (logs supprimés, perdus à
 * l'ingestion, coupures réseau).
 */
export function computeMetrics(logs: LogItem[]): LogMetrics {
  const serviceSet = new Set<string>()
  const levelCounts: Record<LogLevel, number> = { ...EMPTY_LEVEL_COUNTS }
  let total = 0
  let errors = 0
  let critical = 0
  let slow = 0
  let evicted = 0
  let dropped = 0
  let disconnects = 0

  for (const item of logs) {
    if (isGapEntry(item)) {
      if (item.kind === 'evicted') evicted += item.count
      else if (item.kind === 'dropped') dropped += item.count
      else disconnects += 1
      continue
    }

    total += 1
    serviceSet.add(item.service)
    levelCounts[item.level] += 1
    if (item.level === 'error' || item.level === 'critical') errors += 1
    if (item.level === 'critical') critical += 1
    if (item.duration_ms > SLOW_THRESHOLD_MS) slow += 1
  }

  return {
    services: Array.from(serviceSet).sort((a, b) => a.localeCompare(b)),
    levelCounts,
    total,
    errors,
    critical,
    slow,
    losses: { evicted, dropped, disconnects },
  }
}
