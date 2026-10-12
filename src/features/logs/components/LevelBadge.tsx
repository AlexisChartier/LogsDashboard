import { Badge } from '../../../components/ui/Badge'
import type { LogLevel } from '../types'
import { getLevelBadgeClass } from '../utils/logVisuals'

export function LevelBadge({ level, className }: { level: LogLevel; className?: string }) {
  return <Badge className={`${getLevelBadgeClass(level)} ${className ?? ''}`}>{level}</Badge>
}
