interface StatsBarProps {
  total: number
  errors: number
  critical: number
  slow: number
  services: number
  evicted: number
  dropped: number
  disconnects: number
}

type Tone = 'neutral' | 'danger' | 'dangerStrong' | 'warn'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-ink',
  danger: 'text-red-500 dark:text-red-400',
  dangerStrong: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-500 dark:text-amber-400',
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: Tone }) {
  return (
    <div className="flex min-w-[132px] flex-1 flex-col gap-1.5 px-4 py-3">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
        {label}
      </dt>
      <dd className={`font-mono text-xl tabular-nums leading-none ${TONE_CLASS[tone]}`}>
        {value.toLocaleString('fr-FR')}
      </dd>
    </div>
  )
}

export function StatsBar({
  total,
  errors,
  critical,
  slow,
  services,
  evicted,
  dropped,
  disconnects,
}: StatsBarProps) {
  const lost = evicted + dropped
  return (
    <section className="overflow-hidden rounded-lg border border-hairline bg-panel">
      <dl className="console-scroll flex divide-x divide-hairline overflow-x-auto">
        <Stat label="Total capturé" value={total} />
        <Stat label="Erreurs" value={errors} tone={errors > 0 ? 'danger' : 'neutral'} />
        <Stat label="Critiques" value={critical} tone={critical > 0 ? 'dangerStrong' : 'neutral'} />
        <Stat label="Lents > 1.5s" value={slow} tone={slow > 0 ? 'warn' : 'neutral'} />
        <Stat label="Services" value={services} />
        <Stat label="Supprimés (mémoire)" value={lost} tone={lost > 0 ? 'warn' : 'neutral'} />
        <Stat
          label="Coupures réseau"
          value={disconnects}
          tone={disconnects > 0 ? 'danger' : 'neutral'}
        />
      </dl>
    </section>
  )
}
