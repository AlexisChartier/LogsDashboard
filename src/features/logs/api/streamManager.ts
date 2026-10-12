import type { ConnectionStatus } from '../../../core/types'
import type { LogEntry, LogGap } from '../types'
import { buildMarkers, createNetworkMarker } from '../utils/markerBuilder'
import { MAX_LOGS } from '../utils/evictionPolicy'
import { z } from 'zod'

export const STREAM_URL = 'https://technical-exercise.dyneo.io/logs/stream'

/**
 * Fréquence de rafraîchissement de l'affichage. Les chaînes reçues sont mises en
 * tampon, puis converties et injectées par lots : le nombre de rendus React (et de
 * JSON.parse) reste ainsi limité quel que soit le débit du flux.
 */
export const FLUSH_INTERVAL_MS = 300

/** Délai de repli exponentiel entre deux tentatives de reconnexion (pour ne pas solliciter l'API sans relâche). */
export const MIN_RECONNECT_DELAY_MS = 1000
export const MAX_RECONNECT_DELAY_MS = 30000

/** Nombre d'échecs consécutifs à partir duquel le disjoncteur s'ouvre : plus aucune reconnexion automatique. */
export const MAX_RECONNECT_ATTEMPTS = 3

export interface LogStreamBatch {
  logs: LogEntry[]
  markers: LogGap[]
}

export interface LogStreamManagerOptions {
  url: string
  maxLogs?: number
  flushIntervalMs?: number
  maxReconnectAttempts?: number
  minReconnectDelayMs?: number
  maxReconnectDelayMs?: number
  /** Appelé à chaque rafraîchissement avec le lot accumulé (jamais vide). */
  onBatch: (batch: LogStreamBatch) => void
  onStatus: (status: ConnectionStatus) => void
}

export interface LogStreamManager {
  start(): void
  stop(): void
  /** Met en pause ou reprend l'injection dans l'affichage (la connexion reste ouverte). */
  setPaused(paused: boolean): void
  reconnect(): void
  clearBuffers(): void
}

/**
 * Ajoute une chaîne brute en tête du tampon (les plus récentes d'abord), puis le
 * tronque en réaffectant simplement sa `length`, bien plus rapide qu'un `splice`.
 * Renvoie le nombre d'entrées abandonnées, afin de pouvoir comptabiliser les pertes.
 */
export function pushRaw(buffer: string[], raw: string, maxLogs: number = MAX_LOGS): number {
  buffer.unshift(raw)
  if (buffer.length > maxLogs) {
    const excess = buffer.length - maxLogs
    buffer.length = maxLogs
    return excess
  }
  return 0
}

/**
 * Forme exacte d'un log serveur, validée à l'exécution : TypeScript ne protège pas des
 * données JSON inattendues, donc chaque entrée est contrôlée avant d'être stockée.
 */
const logEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warning', 'error', 'critical']),
  service: z.string(),
  message: z.string(),
  duration_ms: z.number(),
  metadata: z.object({
    request_id: z.string(),
    user_id: z.number(),
    http_status: z.number(),
  }),
})

/** Conversion différée : n'est appelée que sur les chaînes ayant survécu à la troncature. */
export function parseBatch(raws: string[]): LogEntry[] {
  const parsed: LogEntry[] = []
  for (const raw of raws) {
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      // Ligne illisible : on l'ignore sans interrompre le traitement du lot.
      continue
    }
    const result = logEntrySchema.safeParse(json)
    if (result.success) parsed.push(result.data)
  }
  return parsed
}

/**
 * Pilote le flux SSE sans dépendre de React : connexion, mise en tampon des chaînes
 * brutes, rafraîchissement régulier, repli exponentiel avec aléa, disjoncteur et
 * marqueurs d'interruption. Les échanges se font par callbacks (onBatch / onStatus).
 */
class EventSourceLogStreamManager implements LogStreamManager {
  private readonly url: string
  private readonly maxLogs: number
  private readonly flushIntervalMs: number
  private readonly maxReconnectAttempts: number
  private readonly minReconnectDelayMs: number
  private readonly maxReconnectDelayMs: number
  private readonly onBatch: (batch: LogStreamBatch) => void
  private readonly onStatus: (status: ConnectionStatus) => void

  private source: EventSource | null = null
  private flushTimer: number | null = null
  private retryTimer: number | null = null
  private incoming: string[] = []
  private dropped = 0
  private networkMarkers: LogGap[] = []
  private paused = false
  private stopped = true
  private attempt = 0
  private outageStartedAt: number | null = null

  constructor(options: LogStreamManagerOptions) {
    this.url = options.url
    this.maxLogs = options.maxLogs ?? MAX_LOGS
    this.flushIntervalMs = options.flushIntervalMs ?? FLUSH_INTERVAL_MS
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS
    this.minReconnectDelayMs = options.minReconnectDelayMs ?? MIN_RECONNECT_DELAY_MS
    this.maxReconnectDelayMs = options.maxReconnectDelayMs ?? MAX_RECONNECT_DELAY_MS
    this.onBatch = options.onBatch
    this.onStatus = options.onStatus
  }

  start(): void {
    if (!this.stopped) return
    this.stopped = false
    this.open()
    this.flushTimer = window.setInterval(() => this.flush(), this.flushIntervalMs)
  }

  stop(): void {
    this.stopped = true
    if (this.flushTimer !== null) window.clearInterval(this.flushTimer)
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer)
    this.flushTimer = null
    this.retryTimer = null
    if (this.source) {
      this.source.close()
      this.source = null
    }
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return
    this.paused = paused
    // À la reprise, on vide immédiatement les données accumulées pendant la pause
    if (!paused) this.flush()
  }

  reconnect(): void {
    this.clearBuffers()
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.source) {
      this.source.close()
      this.source = null
    }
    if (this.stopped) {
      this.stopped = false
      this.flushTimer = window.setInterval(() => this.flush(), this.flushIntervalMs)
    }
    this.attempt = 0
    this.open()
  }

  clearBuffers(): void {
    this.incoming = []
    this.dropped = 0
    this.networkMarkers = []
  }

  private open(): void {
    if (this.stopped) return
    this.onStatus('connecting')
    const source = new EventSource(this.url)
    this.source = source

    source.onopen = () => {
      // Fin d'une coupure : on ajoute un marqueur d'interruption dans l'historique.
      if (this.outageStartedAt !== null) {
        this.networkMarkers.push(
          createNetworkMarker(this.outageStartedAt, Date.now() - this.outageStartedAt),
        )
        this.outageStartedAt = null
      }
      this.attempt = 0
      this.onStatus('connected')
    }

    // Réception quasi gratuite : on empile la chaîne brute, sans JSON.parse ni rendu React.
    source.onmessage = (event: MessageEvent<string>) => {
      this.dropped += pushRaw(this.incoming, event.data, this.maxLogs)
    }

    source.onerror = () => {
      // On désactive la reconnexion automatique du navigateur (trop brusque) pour la
      // gérer nous-mêmes, avec un repli exponentiel qui évite de déclencher des erreurs 503.
      if (this.source === source) {
        source.close()
        this.source = null
      }
      if (this.stopped) return

      if (this.outageStartedAt === null) this.outageStartedAt = Date.now()
      this.attempt += 1

      // Disjoncteur : après trop d'échecs consécutifs, on arrête les tentatives et on
      // attend une action manuelle (pour ne pas insister sur un serveur en panne).
      if (this.attempt > this.maxReconnectAttempts) {
        this.onStatus('offline')
        return
      }

      const delay = Math.min(
        this.maxReconnectDelayMs,
        this.minReconnectDelayMs * 2 ** (this.attempt - 1),
      )
      this.onStatus('error')
      this.retryTimer = window.setTimeout(() => this.open(), delay)
    }
  }

  private flush(): void {
    if (this.stopped) return
    // Onglet masqué ou flux en pause : on n'actualise pas l'affichage (économie de
    // batterie et de mémoire). Les chaînes brutes, elles, continuent de s'empiler puis
    // d'être tronquées sans bruit.
    if (document.hidden || this.paused) return

    const buffer = this.incoming
    const dropped = this.dropped
    const network = this.networkMarkers
    if (buffer.length === 0 && dropped === 0 && network.length === 0) return

    this.incoming = []
    this.dropped = 0
    this.networkMarkers = []

    // Le tampon est classé du plus récent au plus ancien : on rétablit l'ordre chronologique.
    const logs = parseBatch(buffer).reverse()
    this.onBatch({ logs, markers: buildMarkers(dropped, network) })
  }
}

export function createLogStreamManager(options: LogStreamManagerOptions): LogStreamManager {
  return new EventSourceLogStreamManager(options)
}
