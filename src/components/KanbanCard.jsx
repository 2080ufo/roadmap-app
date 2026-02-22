import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function KanbanCard({ task, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const age = task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface-700 border border-surface-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-text-primary leading-snug">{task.title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
          className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs flex-shrink-0 mt-0.5"
        >
          ✕
        </button>
      </div>
      {age && <p className="text-[11px] text-text-muted mt-1.5">{age}</p>}
    </div>
  )
}
