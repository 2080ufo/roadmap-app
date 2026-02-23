import { useEffect, useState } from 'react'
import api from '../lib/api'
import RoadmapBar from '../components/RoadmapBar'
import KanbanBoard from '../components/KanbanBoard'
import CreateTaskModal from '../components/CreateTaskModal'
import WeeklyCounter from '../components/WeeklyCounter'

export default function Dashboard() {
  const [roadmap, setRoadmap] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [tasks, setTasks] = useState([])
  const [tags, setTags] = useState([])
  const [activeFilter, setActiveFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalColumn, setModalColumn] = useState('ideas')

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      let roadmaps = await api.get('/api/roadmaps')
      let rm = roadmaps[0]
      if (!rm) rm = await api.post('/api/roadmaps', { title: 'Product Roadmap' })
      setRoadmap(rm)

      const [ms, ts, tg] = await Promise.all([
        api.get(`/api/milestones?roadmap_id=${rm.id}`),
        api.get('/api/tasks'),
        api.get('/api/tags')
      ])
      setMilestones(ms || [])
      setTasks(ts || [])
      setTags(tg || [])
    } catch (e) { console.error('Init failed:', e) }
    setLoading(false)
  }

  // Milestone actions
  const addMilestone = async () => {
    if (!roadmap) return
    const data = await api.post('/api/milestones', {
      roadmap_id: roadmap.id, title: 'New Milestone', position: milestones.length, status: 'planned'
    })
    if (data) setMilestones([...milestones, data])
  }

  const updateMilestone = async (id, updates) => {
    await api.put(`/api/milestones/${id}`, updates)
    setMilestones(milestones.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const deleteMilestone = async (id) => {
    await api.del(`/api/milestones/${id}`)
    setMilestones(milestones.filter(m => m.id !== id))
  }

  // Tag actions
  const createTag = async (name, color) => {
    try {
      const tag = await api.post('/api/tags', { name, color })
      setTags([...tags, tag])
      return tag
    } catch { return null }
  }

  // Task actions
  const openCreateModal = (columnId) => {
    setModalColumn(columnId)
    setModalOpen(true)
  }

  const addTask = async (columnName, title, description, tagIds, files = []) => {
    const colTasks = tasks.filter(t => t.column_name === columnName)
    const data = await api.post('/api/tasks', { title, description: description || null, column_name: columnName, position: colTasks.length, tag_ids: tagIds })
    if (data) {
      // Upload files if any
      let attachments = []
      if (files.length > 0) {
        try {
          attachments = await api.upload(`/api/tasks/${data.id}/attachments`, files)
        } catch (e) {
          console.error('File upload failed:', e)
        }
      }
      setTasks([...tasks, { ...data, attachments }])
      if (columnName === 'wip') {
        api.post('/api/webhooks/wip-signal', { task_id: data.id, title }).catch(() => {})
      }
    }
  }

  const updateTask = async (id, updates) => {
    try {
      await api.put(`/api/tasks/${id}`, updates)
      setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t))
    } catch {}
  }

  const deleteTask = async (id) => {
    await api.del(`/api/tasks/${id}`)
    setTasks(tasks.filter(t => t.id !== id))
  }

  const moveTask = async (taskId, newColumn) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.column_name === newColumn) return
    const oldColumn = task.column_name
    setTasks(tasks.map(t => t.id === taskId ? { ...t, column_name: newColumn } : t))
    try {
      await api.put(`/api/tasks/${taskId}/move`, { column_name: newColumn })
      if (newColumn === 'wip' && oldColumn !== 'wip') {
        api.post('/api/webhooks/wip-signal', { task_id: taskId, title: task.title }).catch(() => {})
      }
    } catch {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, column_name: oldColumn } : t))
    }
  }

  const reorderTasks = async (column, newOrder) => {
    setTasks(prev => {
      const others = prev.filter(t => t.column_name !== column)
      return [...others, ...newOrder.map((t, i) => ({ ...t, position: i }))]
    })
  }

  // Filter tasks by tag
  const filteredTasks = activeFilter
    ? tasks.filter(t => t.tags?.some(tag => tag.id === activeFilter))
    : tasks

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <>
      <RoadmapBar
        milestones={milestones}
        onAdd={addMilestone}
        onUpdate={updateMilestone}
        onDelete={deleteMilestone}
      />

      {/* Tag filter bar */}
      {tags.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">Filter:</span>
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                !activeFilter ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' : 'bg-surface-700 text-text-muted border border-surface-600 hover:border-text-muted/30'
              }`}
            >
              All
            </button>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveFilter(activeFilter === tag.id ? null : tag.id)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                  activeFilter === tag.id
                    ? 'border'
                    : 'border opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: tag.color + (activeFilter === tag.id ? '30' : '15'),
                  color: tag.color,
                  borderColor: tag.color + (activeFilter === tag.id ? '60' : '30')
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-4 pb-20">
        <KanbanBoard
          tasks={filteredTasks}
          onDeleteTask={deleteTask}
          onUpdateTask={updateTask}
          onMoveTask={moveTask}
          onReorderTasks={reorderTasks}
          onOpenCreateModal={openCreateModal}
        />
      </div>

      <WeeklyCounter tasks={tasks} />

      <CreateTaskModal
        isOpen={modalOpen}
        columnId={modalColumn}
        tags={tags}
        onClose={() => setModalOpen(false)}
        onSubmit={addTask}
        onCreateTag={createTag}
      />
    </>
  )
}
