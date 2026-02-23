import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool, { initDB } from './db.js'
import { generateToken, authMiddleware } from './auth.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain','text/markdown','text/csv','application/json']
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('image/'))
  }
})

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
      FROM roadmaps r ORDER BY r.created_at DESC
    `)
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
    const { rows } = await pool.query('SELECT * FROM roadmaps WHERE id = $1', [req.params.id])
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
      'UPDATE roadmaps SET title = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [title, req.params.id]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/roadmaps/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM roadmaps WHERE id = $1', [req.params.id])
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
      `SELECT m.* FROM milestones m WHERE m.roadmap_id = $1 ORDER BY m.position`,
      [roadmap_id]
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
      `SELECT t.*, COALESCE(
        json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color)) 
        FILTER (WHERE tg.id IS NOT NULL), '[]'
      ) as tags
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      GROUP BY t.id
      ORDER BY t.created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { title, description, milestone_id, column_name, position, tag_ids } = req.body
    const { rows } = await pool.query(
      'INSERT INTO tasks (user_id, title, description, milestone_id, column_name, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, title, description || null, milestone_id || null, column_name || 'ideas', position || 0]
    )
    const task = rows[0]
    // Attach tags
    if (tag_ids?.length) {
      for (const tagId of tag_ids) {
        await pool.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [task.id, tagId])
      }
    }
    // Re-fetch with tags
    const { rows: full } = await pool.query(
      `SELECT t.*, COALESCE(
        json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color))
        FILTER (WHERE tg.id IS NOT NULL), '[]'
      ) as tags
      FROM tasks t
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE t.id = $1
      GROUP BY t.id`,
      [task.id]
    )
    res.json(full[0] || task)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { completed, title, description } = req.body
    const completed_at = completed ? new Date().toISOString() : null
    const { rows } = await pool.query(
      `UPDATE tasks SET completed = COALESCE($1, completed), completed_at = $2, title = COALESCE($3, title), description = COALESCE($4, description)
       WHERE id = $5 RETURNING *`,
      [completed, completed_at, title, description, req.params.id]
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Tags ──

app.get('/api/tags', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tags ORDER BY name')
    res.json(rows)
  } catch { res.status(500).json({ error: 'Server error' }) }
})

app.post('/api/tags', authMiddleware, async (req, res) => {
  try {
    const { name, color } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
    const { rows } = await pool.query(
      'INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET color = $3 RETURNING *',
      [req.user.id, name.trim().toLowerCase(), color || '#3b82f6']
    )
    res.json(rows[0])
  } catch { res.status(500).json({ error: 'Server error' }) }
})

app.delete('/api/tags/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM tags WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Server error' }) }
})

// ── Task Tags ──

app.post('/api/tasks/:id/tags', authMiddleware, async (req, res) => {
  try {
    const { tag_id } = req.body
    await pool.query('INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.params.id, tag_id])
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Server error' }) }
})

app.delete('/api/tasks/:id/tags/:tagId', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2', [req.params.id, req.params.tagId])
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Server error' }) }
})

// ── Task Move ──

app.put('/api/tasks/:id/move', authMiddleware, async (req, res) => {
  try {
    const { column_name, position } = req.body
    const { rows } = await pool.query(
      'UPDATE tasks SET column_name = $1, position = COALESCE($2, position) WHERE id = $3 RETURNING *',
      [column_name, position, req.params.id]
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
  try {
    await pool.query(
      'INSERT INTO wip_signals (task_id, user_id, title) VALUES ($1, $2, $3)',
      [task_id, req.user.id, title]
    )
  } catch (e) { console.error('Failed to store WIP signal:', e.message) }
  res.json({ ok: true, message: 'WIP signal received' })
})

// Move task to done
app.put('/api/tasks/:id/done', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "UPDATE tasks SET column_name = 'done', completed = TRUE, completed_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get pending (unacknowledged) WIP signals
app.get('/api/webhooks/wip-pending', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM wip_signals WHERE acknowledged = FALSE ORDER BY created_at ASC'
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// Acknowledge a WIP signal (mark as processed)
app.put('/api/webhooks/wip-pending/:id/ack', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE wip_signals SET acknowledged = TRUE WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Task Attachments ──

app.get('/api/tasks/:id/attachments', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, task_id, filename, original_name, mime_type, size, created_at FROM task_attachments WHERE task_id = $1 ORDER BY created_at',
      [req.params.id]
    )
    res.json(rows)
  } catch { res.status(500).json({ error: 'Server error' }) }
})

app.post('/api/tasks/:id/attachments', authMiddleware, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files provided' })
    // Check existing count
    const { rows: existing } = await pool.query('SELECT COUNT(*) as cnt FROM task_attachments WHERE task_id = $1', [req.params.id])
    if (parseInt(existing[0].cnt) + req.files.length > 10) {
      return res.status(400).json({ error: 'Max 10 attachments per task' })
    }
    const results = []
    for (const file of req.files) {
      const { rows } = await pool.query(
        'INSERT INTO task_attachments (task_id, filename, original_name, mime_type, size, data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, task_id, filename, original_name, mime_type, size, created_at',
        [req.params.id, file.originalname, file.originalname, file.mimetype, file.size, file.buffer]
      )
      results.push(rows[0])
    }
    res.json(results)
  } catch (e) { console.error(e); res.status(500).json({ error: 'Upload failed' }) }
})

app.get('/api/attachments/:id/download', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM task_attachments WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    const att = rows[0]
    res.set({
      'Content-Type': att.mime_type,
      'Content-Disposition': `inline; filename="${att.original_name}"`,
      'Content-Length': att.size
    })
    res.send(att.data)
  } catch { res.status(500).json({ error: 'Server error' }) }
})

app.delete('/api/attachments/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM task_attachments WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Server error' }) }
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
