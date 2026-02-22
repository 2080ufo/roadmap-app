import { useState } from 'react'

const statusColors = {
  planned: { dot: 'bg-text-muted', line: '#71717a' },
  in_progress: { dot: 'bg-accent-blue', line: '#3b82f6' },
  done: { dot: 'bg-accent-green', line: '#22c55e' }
}
const statusLabels = { planned: 'Planned', in_progress: 'In Progress', done: 'Done' }
const statuses = ['planned', 'in_progress', 'done']

export default function RoadmapBar({ milestones, onAdd, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const startEdit = (ms) => { setEditingId(ms.id); setEditTitle(ms.title) }
  const saveEdit = (id) => {
    if (editTitle.trim()) onUpdate(id, { title: editTitle.trim() })
    setEditingId(null)
  }
  const cycleStatus = (ms) => {
    const idx = statuses.indexOf(ms.status)
    onUpdate(ms.id, { status: statuses[(idx + 1) % statuses.length] })
  }

  return (
    <div className="bg-surface-800 border-b border-surface-600 sticky top-14 z-40">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center gap-0 overflow-x-auto pb-1">
          {milestones.map((ms, i) => {
            const colors = statusColors[ms.status]
            return (
              <div key={ms.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[100px] group">
                  <button
                    onClick={() => cycleStatus(ms)}
                    className={`w-5 h-5 rounded-full ${colors.dot} transition-all hover:scale-125 relative`}
                    title={`${statusLabels[ms.status]} — click to change`}
                  >
                    {ms.status === 'done' && <span className="absolute inset-0 flex items-center justify-center text-surface-900 text-[10px] font-bold">✓</span>}
                  </button>
                  {editingId === ms.id ? (
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => saveEdit(ms.id)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(ms.id)}
                      className="mt-2 text-xs bg-surface-700 border border-surface-600 rounded px-2 py-0.5 text-center w-24 focus:outline-none focus:border-accent-blue/50"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(ms)}
                      className="mt-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                    >
                      {ms.title}
                    </span>
                  )}
                  <span className="text-[10px] text-text-muted mt-0.5">{statusLabels[ms.status]}</span>
                  <button
                    onClick={() => onDelete(ms.id)}
                    className="text-[10px] text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                  >
                    remove
                  </button>
                </div>
                {i < milestones.length - 1 && (
                  <div className="w-12 h-px mx-1" style={{
                    background: `linear-gradient(90deg, ${colors.line}, ${statusColors[milestones[i + 1].status].line})`
                  }} />
                )}
              </div>
            )
          })}
          <button
            onClick={onAdd}
            className="ml-3 w-6 h-6 rounded-full border border-dashed border-surface-600 hover:border-accent-blue text-text-muted hover:text-accent-blue transition-all flex items-center justify-center text-sm flex-shrink-0"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
