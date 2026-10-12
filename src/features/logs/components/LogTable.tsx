import { forwardRef, useRef, useState, type ComponentPropsWithoutRef } from 'react'
import { ArchiveX, ArrowDown, TriangleAlert, WifiOff } from 'lucide-react'
import { TableVirtuoso, type TableComponents, type TableVirtuosoHandle } from 'react-virtuoso'
import {
  isGapEntry,
  type LogEntry,
  type LogGap,
  type LogItem,
  type LogLevel,
  type SortOrder,
} from '../types'
import { formatDuration, formatTimestamp } from '../utils/logVisuals'
import { LogRowCells } from './LogRow'

interface LogTableProps {
  logs: LogItem[]
  sortOrder: SortOrder
  isPaused: boolean
  selectedLogId: string | null
  onSelectLog: (log: LogEntry) => void
  onFilterRequestId: (value: string) => void
  onFilterUserId: (value: string) => void
}

const COLUMNS = [
  { label: 'Heure', align: 'text-left' },
  { label: 'Niveau', align: 'text-left' },
  { label: 'Service', align: 'text-left' },
  { label: 'Message', align: 'text-left' },
  { label: 'Durée', align: 'text-right' },
  { label: 'HTTP', align: 'text-right' },
  { label: 'User', align: 'text-right' },
  { label: 'Request ID', align: 'text-left' },
] as const

/**
 * Composants de rendu de la table virtualisée. Seules les lignes visibles existent
 * réellement dans le DOM (~25 au lieu de 5000) : le défilement et le filtrage restent
 * donc fluides quel que soit le volume.
 */
const VirtuosoTableComponents: TableComponents<LogItem> = {
  Scroller: forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
    function Scroller(props, ref) {
      return <div {...props} ref={ref} className={`${props.className ?? ''} console-scroll`} />
    },
  ),
  Table: (props: ComponentPropsWithoutRef<'table'>) => (
    <table {...props} className={`${props.className ?? ''} w-full border-collapse text-left`} />
  ),
  TableHead: forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'thead'>>(
    function TableHead(props, ref) {
      return <thead {...props} ref={ref} className={`${props.className ?? ''} bg-panel-2`} />
    },
  ),
  TableRow: ({ item: _item, ...props }: ComponentPropsWithoutRef<'tr'> & { item?: LogItem }) => (
    <tr {...props} className={`${props.className ?? ''} group transition-colors`} />
  ),
  TableBody: forwardRef<HTMLTableSectionElement, ComponentPropsWithoutRef<'tbody'>>(
    function TableBody(props, ref) {
      return (
        <tbody
          {...props}
          ref={ref}
          className={`${props.className ?? ''} divide-y divide-hairline`}
        />
      )
    },
  ),
}

const LEVEL_ORDER: LogLevel[] = ['debug', 'info', 'warning', 'error', 'critical']

function LevelBreakdown({ breakdown }: { breakdown?: Partial<Record<LogLevel, number>> }) {
  if (!breakdown) return null
  const parts = LEVEL_ORDER.filter((level) => (breakdown[level] ?? 0) > 0).map(
    (level) => `${breakdown[level]} ${level}`,
  )
  if (parts.length === 0) return null
  return <span className="text-ink-subtle">({parts.join(', ')})</span>
}

function GapRow({ gap }: { gap: LogGap }) {
  if (gap.kind === 'disconnected') {
    return (
      <td colSpan={9} className="bg-red-500/[0.06] py-2 pl-3 pr-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-red-600 dark:text-red-400">
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-mono tabular-nums">[{formatTimestamp(gap.timestamp)}]</span>
          <span>
            Connexion interrompue
            {gap.durationMs !== undefined
              ? ` — rétablie après ${formatDuration(gap.durationMs)}`
              : ''}
          </span>
        </div>
      </td>
    )
  }

  if (gap.kind === 'evicted') {
    return (
      <td colSpan={9} className="bg-panel-2 py-2 pl-3 pr-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-muted">
          <ArchiveX className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-mono tabular-nums">[{formatTimestamp(gap.timestamp)}]</span>
          <span>
            <span className="font-semibold tabular-nums">{gap.count.toLocaleString('fr-FR')}</span>{' '}
            anciens logs supprimés pour préserver la mémoire
          </span>
          <LevelBreakdown breakdown={gap.breakdown} />
        </div>
      </td>
    )
  }

  return (
    <td colSpan={9} className="bg-amber-500/[0.06] py-2 pl-3 pr-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-amber-600 dark:text-amber-400">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-mono tabular-nums">[{formatTimestamp(gap.timestamp)}]</span>
        <span>
          <span className="font-semibold tabular-nums">{gap.count.toLocaleString('fr-FR')}</span>{' '}
          logs ignorés pour préserver la mémoire (rafale de données / pause)
        </span>
      </div>
    </td>
  )
}

export function LogTable({
  logs,
  sortOrder,
  isPaused,
  selectedLogId,
  onSelectLog,
  onFilterRequestId,
  onFilterUserId,
}: LogTableProps) {
  const virtuosoRef = useRef<TableVirtuosoHandle>(null)
  const [atBottom, setAtBottom] = useState(true)

  const scrollToLatest = () => {
    if (logs.length === 0) return
    virtuosoRef.current?.scrollToIndex({ index: logs.length - 1, align: 'end', behavior: 'smooth' })
    setAtBottom(true)
  }

  return (
    <section className="relative overflow-hidden rounded-lg border border-hairline bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
          {sortOrder === 'asc' ? 'Flux chronologique' : 'Flux inversé'}
        </span>
        {isPaused && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Flux en pause, réception en arrière-plan
          </span>
        )}
      </div>

      <div className="relative">
        <TableVirtuoso<LogItem>
          ref={virtuosoRef}
          style={{ height: '64vh' }}
          data={logs}
          components={VirtuosoTableComponents}
          atBottomStateChange={setAtBottom}
          // Défilement automatique intelligent : on suit le bas seulement si l'utilisateur
          // s'y trouve déjà ; on s'arrête s'il remonte, on reprend s'il redescend. Désactivé en tri décroissant.
          followOutput={sortOrder === 'asc' ? (bottom) => (bottom ? 'smooth' : false) : false}
          increaseViewportBy={{ top: 200, bottom: 400 }}
          fixedHeaderContent={() => (
            <tr className="border-b border-hairline">
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={`whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle ${column.align}`}
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="w-9 px-2 py-2">
                <span className="sr-only">Détails</span>
              </th>
            </tr>
          )}
          itemContent={(_index, item) =>
            isGapEntry(item) ? (
              <GapRow gap={item} />
            ) : (
              <LogRowCells
                log={item}
                isSelected={item.id === selectedLogId}
                onSelect={onSelectLog}
                onFilterRequestId={onFilterRequestId}
                onFilterUserId={onFilterUserId}
              />
            )
          }
        />

        {logs.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-subtle">
              En attente de flux
            </p>
            <p className="text-xs text-ink-muted">
              Aucun log reçu ou aucun résultat pour les filtres actifs.
            </p>
          </div>
        )}
      </div>

      {!atBottom && !isPaused && sortOrder === 'asc' && logs.length > 0 && (
        <button
          type="button"
          onClick={scrollToLatest}
          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-contrast shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Derniers logs
        </button>
      )}
    </section>
  )
}
