import { useState, useRef, useEffect } from 'react'

const TAG_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
]

export default function CreateTaskModal({ isOpen, columnId, tags, onClose, onSubmit, onCreateTag }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [tagSearch, setTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const inputRef = useRef(null)
  const tagInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setSelectedTags([])
      setTagSearch('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
    !selectedTags.find(s => s.id === t.id)
  )

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)

    // Detect hashtag typing
    const hashMatch = val.match(/#(\w*)$/)
    if (hashMatch) {
      setTagSearch(hashMatch[1])
      setShowTagDropdown(true)
    } else {
      setShowTagDropdown(false)
    }
  }

  const selectTag = (tag) => {
    setSelectedTags([...selectedTags, tag])
    // Remove #word from title
    setTitle(title.replace(/#\w*$/, '').trim())
    setShowTagDropdown(false)
    setTagSearch('')
    inputRef.current?.focus()
  }

  const removeTag = (tagId) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId))
  }

  const createAndSelectTag = async () => {
    if (!tagSearch.trim()) return
    const tag = await onCreateTag(tagSearch.trim(), newTagColor)
    if (tag) {
      selectTag(tag)
      setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)])
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit(columnId, title.trim(), description.trim(), selectedTags.map(t => t.id))
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
    if (showTagDropdown && e.key === 'Enter' && tagSearch) {
      e.preventDefault()
      if (filteredTags.length > 0) {
        selectTag(filteredTags[0])
      } else {
        createAndSelectTag()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Title input */}
          <div className="relative">
            <input
              ref={inputRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              placeholder="Task title... (type # for tags)"
              className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 text-sm"
            />

            {/* Tag autocomplete dropdown */}
            {showTagDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface-700 border border-surface-600 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => selectTag(tag)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-text-primary">{tag.name}</span>
                  </button>
                ))}
                {tagSearch && !filteredTags.find(t => t.name === tagSearch.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={createAndSelectTag}
                    className="w-full text-left px-3 py-2 hover:bg-surface-600 transition-colors flex items-center gap-2 text-sm border-t border-surface-600"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: newTagColor }} />
                    <span className="text-text-secondary">Create "<span className="text-text-primary">{tagSearch}</span>"</span>
                    {/* Color picker dots */}
                    <div className="ml-auto flex gap-1">
                      {TAG_COLORS.slice(0, 5).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNewTagColor(c) }}
                          className={`w-3 h-3 rounded-full transition-transform ${newTagColor === c ? 'scale-125 ring-1 ring-white' : 'opacity-60 hover:opacity-100'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                )}
                {filteredTags.length === 0 && !tagSearch && (
                  <p className="px-3 py-2 text-xs text-text-muted">No tags yet. Type a name to create one.</p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={4}
            className="w-full mt-3 px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 text-sm resize-none"
          />

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}40` }}
                >
                  {tag.name}
                  <button type="button" onClick={() => removeTag(tag.id)} className="hover:opacity-70">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
            >
              <span className="text-base">#</span> Add tags
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-4 py-1.5 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/20 transition-all disabled:opacity-30"
              >
                Add task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
