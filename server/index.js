import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool, { initDB } from './db.js'
import { generateToken, authMiddleware } from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3004

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// ── Auth ──

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const hash = await bcrypt.hash(password, 10)
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), hash]
    )
    const user = rows[0]
    res.json({ token: generateToken(user), user })
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email already registered' })
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' })
    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    const user = { id: rows[0].id, email: rows[0].email, created_at: rows[0].created_at }
    res.json({ token: generateToken(user), user })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.user.id])
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Roadmaps ──

app.get('/api/roadmaps', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, (SELECT COUNT(*) FROM milestones WHERE roadmap_id = r.id) as milestone_count
      FROM roadmaps r WHERE r.user_id = $1 ORDER BY r.created_at DESC
    `, [req.user.id])
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/roadmaps', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body
    const { rows } = await pool.query(
      'INSERT INTO roadmaps (user_id, title) VALUES ($1, $2) RETURNING *',
      [req.user.id, title || 'New Roadmap']
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM roadmaps WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body
    const { rows } = await pool.query(
      'UPDATE roadmaps SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [title, req.params.id, req.user.id]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM roadmaps WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Milestones ──

app.get('/api/milestones', authMiddleware, async (req, res) => {
  try {
    const { roadmap_id } = req.query
    const { rows } = await pool.query(
      `SELECT m.* FROM milestones m JOIN roadmaps r ON m.roadmap_id = r.id 
       WHERE m.roadmap_id = $1 AND r.user_id = $2 ORDER BY m.position`,
      [roadmap_id, req.user.id]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/milestones', authMiddleware, async (req, res) => {
  try {
    const { roadmap_id, title, position, status, color } = req.body
    const { rows } = await pool.query(
      'INSERT INTO milestones (roadmap_id, title, position, status, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [roadmap_id, title || 'New Milestone', position || 0, status || 'planned', color || '#00d4ff']
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/milestones/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, status, position, color } = req.body
    const { rows } = await pool.query(
      `UPDATE milestones SET 
        title = COALESCE($1, title), description = COALESCE($2, description),
        status = COALESCE($3, status), position = COALESCE($4, position), color = COALESCE($5, color)
       WHERE id = $6 RETURNING *`,
      [title, description, status, position, color, req.params.id]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/milestones/reorder', authMiddleware, async (req, res) => {
  try {
    const { milestones } = req.body // [{id, position}, ...]
    for (const ms of milestones) {
      await pool.query('UPDATE milestones SET position = $1 WHERE id = $2', [ms.position, ms.id])
    }
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/milestones/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM milestones WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Tasks ──

app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, milestone_id, column_name, position } = req.body
    const { rows } = await pool.query(
      'INSERT INTO tasks (user_id, title, milestone_id, column_name, position) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, title, milestone_id || null, column_name || 'ideas', position || 0]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { completed, title } = req.body
    const completed_at = completed ? new Date().toISOString() : null
    const { rows } = await pool.query(
      `UPDATE tasks SET completed = COALESCE($1, completed), completed_at = $2, title = COALESCE($3, title)
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [completed, completed_at, title, req.params.id, req.user.id]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Task Move ──

app.put('/api/tasks/:id/move', authMiddleware, async (req, res) => {
  try {
    const { column_name, position } = req.body
    const { rows } = await pool.query(
      'UPDATE tasks SET column_name = $1, position = COALESCE($2, position) WHERE id = $3 AND user_id = $4 RETURNING *',
      [column_name, position, req.params.id, req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── WIP Signal Webhook ──

app.post('/api/webhooks/wip-signal', authMiddleware, async (req, res) => {
  const { task_id, title } = req.body
  console.log(`[WIP SIGNAL] Task "${title}" (${task_id}) moved to WIP - ready for implementation`)
  res.json({ ok: true, message: 'WIP signal received' })
})

// Serve static in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')))
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../dist/index.html')))
}

// Start
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
}).catch(err => {
  console.error('DB init failed:', err.message, err.code)
  // Start anyway so health check works - tables might already exist
  app.listen(PORT, () => console.log(`Server running on port ${PORT} (DB init failed)`))
})
