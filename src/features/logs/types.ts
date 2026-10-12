import type { ConnectionStatus, SortOrder } from '../../core/types'

export type { ConnectionStatus, SortOrder }

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical'

export interface LogMetadata {
  request_id: string
  user_id: number
  http_status: number
}

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  service: string
  message: string
  duration_ms: number
  metadata: LogMetadata
}

/**
 * Type de marqueur synthétique injecté dans le flux :
 * 'evicted'      : logs peu importants retirés de l'historique pour libérer de la mémoire
 * 'dropped'      : logs perdus à l'ingestion
 * 'disconnected' : coupure du flux SSE (réseau), avec sa durée.
 */
export type GapKind = 'evicted' | 'dropped' | 'disconnected'

export interface LogGap {
  id: string
  isGap: true
  kind: GapKind
  /** Nombre de logs concernés (0 pour une simple coupure réseau). */
  count: number
  timestamp: string
  /** Répartition par niveau, renseignée pour les évictions uniquement. */
  breakdown?: Partial<Record<LogLevel, number>>
  /** Durée de l'interruption en millisecondes, uniquement pour les coupures réseau. */
  durationMs?: number
}

export type LogItem = LogEntry | LogGap

export function isGapEntry(item: LogItem): item is LogGap {
  return (item as LogGap).isGap === true
}

export type HttpStatusFilter = 'all' | '2xx' | '4xx' | '5xx'

export type LogLevelFilter = LogLevel | 'all'
