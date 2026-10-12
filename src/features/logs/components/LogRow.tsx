import { Eye } from 'lucide-react'
import type { LogEntry } from '../types'
import {
  formatTimestamp,
  getDurationClass,
  getHttpStatusClass,
  getLevelBorderClass,
  getLevelRowClass,
} from '../utils/logVisuals'
import { LevelBadge } from './LevelBadge'

interface LogRowCellsProps {
  log: LogEntry
  isSelected: boolean
  onSelect: (log: LogEntry) => void
  onFilterRequestId: (value: string) => void
  onFilterUserId: (value: string) => void
}

const FILTER_BUTTON =
  'cursor-pointer rounded font-mono text-[11px] tabular-nums underline-offset-2 transition-colors hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent'

/**
 * Ne rend que les cellules (<td>) d'une ligne. La balise <tr> est fournie par
 * TableVirtuoso (composant TableRow) : on ne modifie donc pas le DOM du conteneur de
 * ligne, ce qui est indispensable au bon fonctionnement de la virtualisation.
 */
export function LogRowCells({
  log,
  isSelected,
  onSelect,
  onFilterRequestId,
  onFilterUserId,
}: LogRowCellsProps) {
  const { level, service, message, duration_ms, metadata, timestamp } = log

  // Fond de la ligne, par ordre de priorité : sélection, puis sévérité (error/critical), puis survol neutre.
  const tint = isSelected ? 'bg-accent/10' : getLevelRowClass(level) || 'group-hover:bg-panel-2'

  return (
    <>
      <td
        className={`w-0 border-l-2 ${getLevelBorderClass(level)} whitespace-nowrap py-1.5 pl-3 pr-3 font-mono text-[11px] tabular-nums text-ink-subtle transition-colors ${tint}`}
      >
        {formatTimestamp(timestamp)}
      </td>
      <td className={`whitespace-nowrap py-1.5 pr-3 transition-colors ${tint}`}>
        <LevelBadge level={level} className="w-[64px]" />
      </td>
      <td
        className={`whitespace-nowrap py-1.5 pr-3 font-mono text-[11px] text-ink-muted transition-colors ${tint}`}
      >
        {service}
      </td>
      <td className={`py-1.5 pr-3 text-[13px] text-ink transition-colors ${tint}`}>{message}</td>
      <td
        className={`whitespace-nowrap py-1.5 pr-3 text-right font-mono text-[11px] tabular-nums transition-colors ${tint} ${getDurationClass(duration_ms)}`}
      >
        {duration_ms}ms
      </td>
      <td
        className={`whitespace-nowrap py-1.5 pr-3 text-right font-mono text-[11px] tabular-nums transition-colors ${tint} ${getHttpStatusClass(metadata.http_status)}`}
      >
        {metadata.http_status}
      </td>
      <td className={`whitespace-nowrap py-1.5 pr-3 text-right transition-colors ${tint}`}>
        <button
          type="button"
          onClick={() => onFilterUserId(String(metadata.user_id))}
          aria-label={`Filtrer par user_id ${metadata.user_id}`}
          title="Filtrer par cet user_id"
          className={`${FILTER_BUTTON} text-ink-muted`}
        >
          {metadata.user_id}
        </button>
      </td>
      <td className={`whitespace-nowrap py-1.5 pr-3 transition-colors ${tint}`}>
        <button
          type="button"
          onClick={() => onFilterRequestId(metadata.request_id)}
          aria-label={`Filtrer par request_id ${metadata.request_id}`}
          title="Filtrer par ce request_id"
          className={`${FILTER_BUTTON} text-ink-subtle`}
        >
          {metadata.request_id}
        </button>
      </td>
      <td className={`py-1.5 pr-2 text-right transition-colors ${tint}`}>
        <button
          type="button"
          onClick={() => onSelect(log)}
          aria-label={`Voir les détails du log ${log.id}`}
          title="Voir les détails"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-subtle opacity-0 transition group-hover:opacity-100 hover:bg-panel-2 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
        </button>
      </td>
    </>
  )
}
