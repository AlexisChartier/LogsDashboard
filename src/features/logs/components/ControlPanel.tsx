import { Pause, Play, RefreshCw, RotateCcw, Search, SortAsc, SortDesc, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { TextInput } from '../../../components/ui/TextInput'
import type {
  ConnectionStatus,
  HttpStatusFilter,
  LogLevel,
  LogLevelFilter,
  SortOrder,
} from '../types'

interface ControlPanelProps {
  status: ConnectionStatus
  isPaused: boolean
  onTogglePause: () => void
  onReconnect: () => void
  onClear: () => void
  onResetFilters: () => void
  hasActiveFilters: boolean
  totalCount: number
  visibleCount: number
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  services: string[]
  serviceFilter: string
  onServiceFilterChange: (value: string) => void
  levelFilter: LogLevelFilter
  onLevelFilterChange: (value: LogLevelFilter) => void
  levelCounts: Record<LogLevel, number>
  requestIdFilter: string
  onRequestIdFilterChange: (value: string) => void
  userIdFilter: string
  onUserIdFilterChange: (value: string) => void
  httpStatusFilter: HttpStatusFilter
  onHttpStatusFilterChange: (value: HttpStatusFilter) => void
  sortOrder: SortOrder
  onToggleSortOrder: () => void
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  connecting: {
    label: 'Connexion…',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  connected: {
    label: 'En direct',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    label: 'Reconnexion…',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
  closed: {
    label: 'Déconnecté',
    dotClass: 'bg-ink-subtle',
    textClass: 'text-ink-muted',
  },
  offline: {
    label: 'Serveur hors ligne',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
  },
}

const HTTP_OPTIONS: { value: HttpStatusFilter; label: string }[] = [
  { value: 'all', label: 'Statut : tous' },
  { value: '2xx', label: '2xx — Succès' },
  { value: '4xx', label: '4xx — Client' },
  { value: '5xx', label: '5xx — Serveur' },
]

const LEVEL_CHIPS: { value: LogLevelFilter; label: string; active: string }[] = [
  {
    value: 'debug',
    label: 'debug',
    active: 'border-transparent bg-slate-500/15 text-slate-600 dark:text-slate-300',
  },
  {
    value: 'info',
    label: 'info',
    active: 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-300',
  },
  {
    value: 'warning',
    label: 'warning',
    active: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-300',
  },
  {
    value: 'error',
    label: 'error',
    active: 'border-transparent bg-red-500/15 text-red-600 dark:text-red-300',
  },
  { value: 'critical', label: 'critical', active: 'border-transparent bg-red-600 text-white' },
]

export function ControlPanel({
  status,
  isPaused,
  onTogglePause,
  onReconnect,
  onClear,
  onResetFilters,
  hasActiveFilters,
  totalCount,
  visibleCount,
  searchQuery,
  onSearchQueryChange,
  services,
  serviceFilter,
  onServiceFilterChange,
  levelFilter,
  onLevelFilterChange,
  levelCounts,
  requestIdFilter,
  onRequestIdFilterChange,
  userIdFilter,
  onUserIdFilterChange,
  httpStatusFilter,
  onHttpStatusFilterChange,
  sortOrder,
  onToggleSortOrder,
}: ControlPanelProps) {
  const statusConfig = STATUS_CONFIG[status]
  const isOffline = status === 'offline'
  // Le bouton n'apparaît que lorsque le système a cessé toute tentative (circuit breaker ouvert), jamais pendant une connexion ou une reconnexion automatique en cours.
  const canReconnect = status === 'offline' || status === 'closed'
  const isLive = status === 'connected'

  const serviceOptions = [
    { value: 'all', label: 'Service : tous' },
    ...services.map((service) => ({ value: service, label: service })),
  ]

  const chipCount = (value: LogLevelFilter): number =>
    value === 'all' ? totalCount : levelCounts[value]

  return (
    <section className="overflow-hidden rounded-lg border border-hairline bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="relative flex h-2 w-2" aria-hidden>
            {isLive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${statusConfig.dotClass}`}
            />
          </span>
          <span className={`text-xs font-medium ${statusConfig.textClass}`}>
            {statusConfig.label}
          </span>

          {isPaused && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pause
            </span>
          )}

          {canReconnect && (
            <Button size="sm" variant={isOffline ? 'danger' : 'primary'} onClick={onReconnect}>
              <RefreshCw className="h-3 w-3" />
              {isOffline ? 'Serveur hors ligne — Reconnecter' : 'Se reconnecter'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-subtle">
          <span className="text-ink tabular-nums">{visibleCount.toLocaleString('fr-FR')}</span>
          <span>/</span>
          <span className="tabular-nums">{totalCount.toLocaleString('fr-FR')}</span>
          <span className="uppercase tracking-[0.14em]">lignes</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
            <TextInput
              type="text"
              aria-label="Rechercher dans le message"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Rechercher dans les messages…"
              className="pl-8"
            />
          </div>
          <Select
            id="filter-service"
            value={serviceFilter}
            onChange={(event) => onServiceFilterChange(event.target.value)}
            options={serviceOptions}
            className="w-full min-w-[150px] sm:w-auto"
          />
          <Select
            id="filter-http"
            value={httpStatusFilter}
            onChange={(event) => onHttpStatusFilterChange(event.target.value as HttpStatusFilter)}
            options={HTTP_OPTIONS}
            className="w-full min-w-[150px] sm:w-auto"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label="Filtrer par niveau"
          >
            <button
              type="button"
              onClick={() => onLevelFilterChange('all')}
              className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                levelFilter === 'all'
                  ? 'border-transparent bg-accent text-accent-contrast'
                  : 'border-hairline text-ink-muted hover:bg-panel-2 hover:text-ink'
              }`}
            >
              tous
              <span className="font-mono text-[10px] tabular-nums opacity-70">
                {chipCount('all')}
              </span>
            </button>
            {LEVEL_CHIPS.map((chip) => {
              const active = levelFilter === chip.value
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => onLevelFilterChange(active ? 'all' : chip.value)}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                    active
                      ? chip.active
                      : 'border-hairline text-ink-muted hover:bg-panel-2 hover:text-ink'
                  }`}
                >
                  {chip.label}
                  <span className="font-mono text-[10px] tabular-nums opacity-70">
                    {chipCount(chip.value)}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <TextInput
              type="text"
              aria-label="Filtrer par Request ID"
              value={requestIdFilter}
              onChange={(event) => onRequestIdFilterChange(event.target.value)}
              placeholder="request_id"
              className="w-[150px] font-mono"
            />
            <TextInput
              type="text"
              inputMode="numeric"
              aria-label="Filtrer par User ID"
              value={userIdFilter}
              onChange={(event) => onUserIdFilterChange(event.target.value.replace(/\D/g, ''))}
              placeholder="user_id"
              className="w-[100px] font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
          <Button
            variant={isPaused ? 'success' : 'primary'}
            onClick={onTogglePause}
            aria-pressed={isPaused}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? 'Reprendre' : 'Pause'}
          </Button>

          <Button onClick={onToggleSortOrder}>
            {sortOrder === 'asc' ? (
              <SortAsc className="h-3.5 w-3.5" />
            ) : (
              <SortDesc className="h-3.5 w-3.5" />
            )}
            {sortOrder === 'asc' ? 'Plus anciens' : 'Plus récents'}
          </Button>

          <Button className="ml-auto" onClick={onResetFilters} disabled={!hasActiveFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser les filtres
          </Button>

          <Button onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Vider les logs
          </Button>
        </div>
      </div>
    </section>
  )
}
