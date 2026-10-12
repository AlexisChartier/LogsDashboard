import type { GapKind, LogGap } from '../types'

export function createGapMarker(kind: GapKind, timestamp: string): LogGap {
  return {
    id: `gap-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    isGap: true,
    kind,
    count: 0,
    timestamp,
  }
}

/** Des logs ont été perdus à l'ingestion (pause ou interruption réseau) */
export function createDroppedMarker(count: number): LogGap {
  return { ...createGapMarker('dropped', new Date().toISOString()), count }
}

export function createNetworkMarker(startedAt: number, durationMs: number): LogGap {
  return { ...createGapMarker('disconnected', new Date(startedAt).toISOString()), durationMs }
}

export function buildMarkers(dropped: number, network: LogGap[]): LogGap[] {
  const markers = dropped > 0 ? [createDroppedMarker(dropped), ...network] : [...network]
  if (markers.length > 1) markers.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return markers
}
