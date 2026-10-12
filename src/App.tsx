import { Activity, Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from './core/theme/ThemeContext'
import { LogDashboard } from './features/logs/components/LogDashboard'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-panel text-ink-muted transition-colors hover:bg-panel-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-hairline bg-panel/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-panel-2 text-accent">
              <Activity className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <h1 className="text-[13px] font-semibold tracking-tight">Log Monitor</h1>
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                Observability console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-ink-subtle sm:inline">
              technical-exercise.dyneo.io
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6">
        <LogDashboard />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}
