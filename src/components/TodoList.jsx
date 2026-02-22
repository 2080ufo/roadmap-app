import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function TodoList() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => { fetchTasks() }, [])

  const fetchTasks = async () => {
    try {
      const data = await api.get('/api/tasks')
      setTasks(data || [])
    } catch { setTasks([]) }
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    const data = await api.post('/api/tasks', { title: newTask.trim() })
    if (data) { setTasks([data, ...tasks]); setNewTask('') }
  }

  const toggleTask = async (task) => {
    const completed = !task.completed
    const completed_at = completed ? new Date().toISOString() : null
    await api.put(`/api/tasks/${task.id}`, { completed })
    setTasks(tasks.map(t => t.id === task.id ? { ...t, completed, completed_at } : t))
  }

  const deleteTask = async (id) => {
    await api.del(`/api/tasks/${id}`)
    setTasks(tasks.filter(t => t.id !== id))
  }

  const active = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  return (
    <div className="card p-4">
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a task..." className="input-field text-sm" />
        <button type="submit" className="btn-primary text-sm whitespace-nowrap">Add</button>
      </form>

      <div className="space-y-1">
        {active.map(task => (
          <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-700 group transition-colors">
            <button onClick={() => toggleTask(task)} className="w-4 h-4 rounded border border-dark-600 hover:border-neon-cyan flex-shrink-0 transition-colors" />
            <span className="text-sm flex-1">{task.title}</span>
            <button onClick={() => deleteTask(task.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs">✕</button>
          </div>
        ))}
        {active.length === 0 && <p className="text-gray-600 text-sm text-center py-4">No active tasks</p>}
      </div>

      {completed.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-600">
          <button onClick={() => setShowCompleted(!showCompleted)} className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1">
            <span className="transform transition-transform" style={{ display: 'inline-block', transform: showCompleted ? 'rotate(90deg)' : '' }}>▶</span>
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="space-y-1 mt-2">
              {completed.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-3 py-2 rounded-lg group">
                  <button onClick={() => toggleTask(task)} className="w-4 h-4 rounded bg-neon-green/20 border border-neon-green/40 flex-shrink-0 flex items-center justify-center">
                    <span className="text-neon-green text-[10px]">✓</span>
                  </button>
                  <span className="text-sm text-gray-500 line-through flex-1">{task.title}</span>
                  <button onClick={() => deleteTask(task.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
