import { useCallback, useState } from 'react'
import type { LogEntry } from '../types'
import { useLogFilters } from '../hooks/useLogFilters'
import { useLogMetrics } from '../hooks/useLogMetrics'
import { useLogStream } from '../hooks/useLogStream'
import { ControlPanel } from './ControlPanel'
import { LogDetail } from './LogDetail'
import { LogTable } from './LogTable'
import { StatsBar } from './StatsBar'

/**
 * Conteneur de la console : assemble le flux (réseau et mémoire), les filtres et les
 * indicateurs via des hooks dédiés, puis compose le rendu. Aucune logique métier ici,
 * seulement de l'orchestration et le passage des props aux composants.
 */
export function LogDashboard() {
  const { logs, connectionStatus, isPaused, togglePause, manualReconnect, clearLogs } =
    useLogStream()
  const filters = useLogFilters(logs)
  const metrics = useLogMetrics(logs)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)

  const handleSelectLog = useCallback((log: LogEntry) => setSelectedLog(log), [])
  const handleCloseDetail = useCallback(() => setSelectedLog(null), [])

  return (
    <div className="space-y-4">
      <StatsBar
        total={metrics.total}
        errors={metrics.errors}
        critical={metrics.critical}
        slow={metrics.slow}
        services={metrics.services.length}
        evicted={metrics.losses.evicted}
        dropped={metrics.losses.dropped}
        disconnects={metrics.losses.disconnects}
      />

      <ControlPanel
        status={connectionStatus}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onReconnect={manualReconnect}
        onClear={clearLogs}
        onResetFilters={filters.resetFilters}
        hasActiveFilters={filters.hasActiveFilters}
        totalCount={metrics.total}
        visibleCount={filters.visibleCount}
        searchQuery={filters.searchQuery}
        onSearchQueryChange={filters.setSearchQuery}
        services={metrics.services}
        serviceFilter={filters.serviceFilter}
        onServiceFilterChange={filters.setServiceFilter}
        levelFilter={filters.levelFilter}
        onLevelFilterChange={filters.setLevelFilter}
        levelCounts={metrics.levelCounts}
        requestIdFilter={filters.requestIdFilter}
        onRequestIdFilterChange={filters.setRequestIdFilter}
        userIdFilter={filters.userIdFilter}
        onUserIdFilterChange={filters.setUserIdFilter}
        httpStatusFilter={filters.httpStatusFilter}
        onHttpStatusFilterChange={filters.setHttpStatusFilter}
        sortOrder={filters.sortOrder}
        onToggleSortOrder={filters.toggleSortOrder}
      />

      <LogTable
        logs={filters.filteredLogs}
        sortOrder={filters.sortOrder}
        isPaused={isPaused}
        selectedLogId={selectedLog?.id ?? null}
        onSelectLog={handleSelectLog}
        onFilterRequestId={filters.setRequestIdFilter}
        onFilterUserId={filters.setUserIdFilter}
      />

      {selectedLog && <LogDetail log={selectedLog} onClose={handleCloseDetail} />}
    </div>
  )
}
