import { useEffect, useState } from 'react'
import api from '../lib/api'
import RoadmapBar from '../components/RoadmapBar'
import KanbanBoard from '../components/KanbanBoard'

export default function Dashboard() {
  const [roadmap, setRoadmap] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      // Get or create default roadmap
      let roadmaps = await api.get('/api/roadmaps')
      let rm = roadmaps[0]
      if (!rm) {
        rm = await api.post('/api/roadmaps', { title: 'Product Roadmap' })
      }
      setRoadmap(rm)

      const [ms, ts] = await Promise.all([
        api.get(`/api/milestones?roadmap_id=${rm.id}`),
        api.get('/api/tasks')
      ])
      setMilestones(ms || [])
      setTasks(ts || [])
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

  // Task actions
  const addTask = async (columnName, title) => {
    const colTasks = tasks.filter(t => t.column_name === columnName)
    const data = await api.post('/api/tasks', { title, column_name: columnName, position: colTasks.length })
    if (data) {
      setTasks([...tasks, data])
      // Signal if added directly to WIP
      if (columnName === 'wip') {
        api.post('/api/webhooks/wip-signal', { task_id: data.id, title }).catch(() => {})
      }
    }
  }

  const deleteTask = async (id) => {
    await api.del(`/api/tasks/${id}`)
    setTasks(tasks.filter(t => t.id !== id))
  }

  const moveTask = async (taskId, newColumn) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.column_name === newColumn) return

    const oldColumn = task.column_name
    // Optimistic update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, column_name: newColumn } : t))

    try {
      await api.put(`/api/tasks/${taskId}/move`, { column_name: newColumn })
      // Signal when moved to WIP
      if (newColumn === 'wip' && oldColumn !== 'wip') {
        api.post('/api/webhooks/wip-signal', { task_id: taskId, title: task.title }).catch(() => {})
      }
    } catch {
      // Revert on failure
      setTasks(tasks.map(t => t.id === taskId ? { ...t, column_name: oldColumn } : t))
    }
  }

  const reorderTasks = async (column, newOrder) => {
    setTasks(prev => {
      const others = prev.filter(t => t.column_name !== column)
      return [...others, ...newOrder.map((t, i) => ({ ...t, position: i }))]
    })
  }

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
      <div className="max-w-7xl mx-auto px-6 py-6">
        <KanbanBoard
          tasks={tasks}
          onAddTask={addTask}
          onDeleteTask={deleteTask}
          onMoveTask={moveTask}
          onReorderTasks={reorderTasks}
        />
      </div>
    </>
  )
}
