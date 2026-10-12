import { useCallback, useMemo, useState } from 'react'
import {
  isGapEntry,
  type HttpStatusFilter,
  type LogItem,
  type LogLevelFilter,
  type SortOrder,
} from '../types'

export interface UseLogFiltersResult {
  searchQuery: string
  setSearchQuery: (value: string) => void
  serviceFilter: string
  setServiceFilter: (value: string) => void
  levelFilter: LogLevelFilter
  setLevelFilter: (value: LogLevelFilter) => void
  requestIdFilter: string
  setRequestIdFilter: (value: string) => void
  userIdFilter: string
  setUserIdFilter: (value: string) => void
  httpStatusFilter: HttpStatusFilter
  setHttpStatusFilter: (value: HttpStatusFilter) => void
  sortOrder: SortOrder
  toggleSortOrder: () => void
  filteredLogs: LogItem[]
  visibleCount: number
  hasActiveFilters: boolean
  resetFilters: () => void
}

/**
 * Regroupe l'état des filtres et du tri. Les marqueurs de perte ne sont jamais filtrés (l'utilisateur doit pouvoir
 * les voir) : seuls les vrais logs le sont.
 */
export function useLogFilters(logs: LogItem[]): UseLogFiltersResult {
  const [searchQuery, setSearchQuery] = useState('')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('all')
  const [requestIdFilter, setRequestIdFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [httpStatusFilter, setHttpStatusFilter] = useState<HttpStatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const filteredLogs = useMemo(() => {
    const messageQuery = searchQuery.trim().toLowerCase()
    const requestQuery = requestIdFilter.trim().toLowerCase()
    const userQuery = userIdFilter.trim()

    const result = logs.filter((item) => {
      if (isGapEntry(item)) return true

      if (messageQuery && !item.message.toLowerCase().includes(messageQuery)) return false
      if (serviceFilter !== 'all' && item.service !== serviceFilter) return false
      if (levelFilter !== 'all' && item.level !== levelFilter) return false
      if (requestQuery && !item.metadata.request_id.toLowerCase().includes(requestQuery))
        return false
      if (userQuery && !String(item.metadata.user_id).includes(userQuery)) return false

      if (httpStatusFilter !== 'all') {
        const code = item.metadata.http_status
        if (httpStatusFilter === '2xx' && (code < 200 || code >= 300)) return false
        if (httpStatusFilter === '4xx' && (code < 400 || code >= 500)) return false
        if (httpStatusFilter === '5xx' && (code < 500 || code >= 600)) return false
      }

      return true
    })

    return sortOrder === 'desc' ? [...result].reverse() : result
  }, [
    logs,
    searchQuery,
    serviceFilter,
    levelFilter,
    requestIdFilter,
    userIdFilter,
    httpStatusFilter,
    sortOrder,
  ])

  const visibleCount = useMemo(
    () => filteredLogs.reduce((count, item) => (isGapEntry(item) ? count : count + 1), 0),
    [filteredLogs],
  )

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    serviceFilter !== 'all' ||
    levelFilter !== 'all' ||
    requestIdFilter.trim() !== '' ||
    userIdFilter.trim() !== '' ||
    httpStatusFilter !== 'all'

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setServiceFilter('all')
    setLevelFilter('all')
    setRequestIdFilter('')
    setUserIdFilter('')
    setHttpStatusFilter('all')
  }, [])

  const toggleSortOrder = useCallback(() => {
    setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    serviceFilter,
    setServiceFilter,
    levelFilter,
    setLevelFilter,
    requestIdFilter,
    setRequestIdFilter,
    userIdFilter,
    setUserIdFilter,
    httpStatusFilter,
    setHttpStatusFilter,
    sortOrder,
    toggleSortOrder,
    filteredLogs,
    visibleCount,
    hasActiveFilters,
    resetFilters,
  }
}
