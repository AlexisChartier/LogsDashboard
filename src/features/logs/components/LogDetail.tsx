import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Drawer } from '../../../components/ui/Drawer'
import type { LogEntry } from '../types'
import { formatTimestamp, getDurationClass, getHttpStatusClass } from '../utils/logVisuals'
import { LevelBadge } from './LevelBadge'

interface LogDetailProps {
  log: LogEntry
  onClose: () => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_1fr] gap-4 border-b border-hairline py-3 last:border-b-0">
      <dt className="pt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </dt>
      <dd className="min-w-0 text-[13px] text-ink">{children}</dd>
    </div>
  )
}

export function LogDetail({ log, onClose }: LogDetailProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(JSON.stringify(log, null, 2)).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Drawer
      onClose={onClose}
      ariaLabel="Détails du log"
      title={
        <>
          <LevelBadge level={log.level} />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Détail du log
          </span>
        </>
      }
      actions={
        <Button size="sm" variant="ghost" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copié' : 'JSON'}
        </Button>
      }
    >
      <dl>
        <Field label="Message">
          <p className="leading-relaxed">{log.message}</p>
        </Field>

        <Field label="Heure">
          <span className="font-mono text-[12px]">{formatTimestamp(log.timestamp)}</span>
          <span className="ml-2 font-mono text-[11px] text-ink-subtle">{log.timestamp}</span>
        </Field>

        <Field label="Service">
          <span className="font-mono text-[12px]">{log.service}</span>
        </Field>

        <Field label="Durée">
          <span
            className={`font-mono text-[12px] tabular-nums ${getDurationClass(log.duration_ms)}`}
          >
            {log.duration_ms} ms
          </span>
        </Field>

        <Field label="HTTP">
          <span
            className={`font-mono text-[12px] font-semibold tabular-nums ${getHttpStatusClass(log.metadata.http_status)}`}
          >
            {log.metadata.http_status}
          </span>
        </Field>

        <Field label="User ID">
          <span className="font-mono text-[12px] tabular-nums">{log.metadata.user_id}</span>
        </Field>

        <Field label="Request ID">
          <span className="break-all font-mono text-[12px]">{log.metadata.request_id}</span>
        </Field>

        <Field label="ID">
          <span className="break-all font-mono text-[11px] text-ink-muted">{log.id}</span>
        </Field>
      </dl>
    </Drawer>
  )
}
