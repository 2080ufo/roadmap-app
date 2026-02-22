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
  const tags = task.tags || []

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
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {age && <p className="text-[11px] text-text-muted mt-1.5">{age}</p>}
    </div>
  )
}
