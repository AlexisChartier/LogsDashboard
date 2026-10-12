import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Button } from './Button'

export interface DrawerProps {
  onClose: () => void
  ariaLabel: string
  title: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function Drawer({ onClose, ariaLabel, title, actions, children }: DrawerProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-hairline bg-panel shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-2.5">{title}</div>
          <div className="flex items-center gap-1.5">
            {actions}
            <Button size="icon" onClick={onClose} aria-label="Fermer">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        <div className="console-scroll flex-1 overflow-auto px-4">{children}</div>
      </aside>
    </div>
  )
}
