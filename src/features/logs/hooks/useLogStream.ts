import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConnectionStatus } from '../../../core/types'
import type { LogItem } from '../types'
import { appendBatch } from '../utils/evictionPolicy'
import { createLogStreamManager, STREAM_URL, type LogStreamManager } from '../api/streamManager'

export interface UseLogStreamResult {
  logs: LogItem[]
  connectionStatus: ConnectionStatus
  isPaused: boolean
  togglePause: () => void
  manualReconnect: () => void
  clearLogs: () => void
}

/**
 * Relie le flux SSE à l'état React. Toute la mécanique réseau et mémoire se trouve
 * dans le streamManager (sans React) : ce hook se contente de brancher les callbacks
 * et d'exposer une API stable au reste de l'interface.
 */
export function useLogStream(): UseLogStreamResult {
  const [logs, setLogs] = useState<LogItem[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [isPaused, setIsPaused] = useState(false)
  const managerRef = useRef<LogStreamManager | null>(null)

  useEffect(() => {
    const manager = createLogStreamManager({
      url: STREAM_URL,
      onBatch: ({ logs: parsed, markers }) => {
        setLogs((previous) => appendBatch(previous, parsed, markers))
      },
      onStatus: setConnectionStatus,
    })
    managerRef.current = manager
    manager.start()

    return () => {
      manager.stop()
      managerRef.current = null
    }
  }, [])

  // Tient le manager informé de l'état de pause : le tampon est vidé dès la reprise.
  useEffect(() => {
    managerRef.current?.setPaused(isPaused)
  }, [isPaused])

  const togglePause = useCallback(() => {
    setIsPaused((wasPaused) => !wasPaused)
  }, [])

  const manualReconnect = useCallback(() => {
    managerRef.current?.reconnect()
  }, [])

  const clearLogs = useCallback(() => {
    managerRef.current?.clearBuffers()
    setLogs([])
  }, [])

  return { logs, connectionStatus, isPaused, togglePause, manualReconnect, clearLogs }
}
