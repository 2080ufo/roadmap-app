const LEVELS = [
  { min: 0, emoji: '🐔', label: 'Chicken' },
  { min: 3, emoji: '🐌', label: 'Snail' },
  { min: 5, emoji: '🐎', label: 'Horse' },
  { min: 8, emoji: '🤖', label: 'Robot' },
]

function getLevel(count) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (count >= LEVELS[i].min) return LEVELS[i]
  }
  return LEVELS[0]
}

export default function WeeklyCounter({ tasks }) {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const doneThisWeek = tasks.filter(t =>
    t.column_name === 'done' && t.completed_at && new Date(t.completed_at) >= startOfWeek
  ).length

  const level = getLevel(doneThisWeek)
  const nextLevel = LEVELS.find(l => l.min > doneThisWeek)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-surface-600 z-40">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{level.emoji}</span>
          <div>
            <p className="text-sm text-text-primary font-medium">
              {doneThisWeek} task{doneThisWeek !== 1 ? 's' : ''} done this week
            </p>
            {nextLevel ? (
              <p className="text-xs text-text-muted">
                {nextLevel.min - doneThisWeek} more to become {nextLevel.emoji} {nextLevel.label}
              </p>
            ) : (
              <p className="text-xs text-text-muted">Max level reached!</p>
            )}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {LEVELS.map((l, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                doneThisWeek >= l.min ? 'bg-surface-700 text-text-primary' : 'text-text-muted opacity-40'
              }`}
            >
              <span>{l.emoji}</span>
              <span className="hidden sm:inline">{l.min}+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
