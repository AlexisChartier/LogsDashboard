import { useMemo } from 'react'
import type { LogItem } from '../types'
import { computeMetrics, type LogMetrics } from '../utils/metrics'

export function useLogMetrics(logs: LogItem[]): LogMetrics {
  return useMemo(() => computeMetrics(logs), [logs])
}
