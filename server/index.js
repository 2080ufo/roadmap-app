import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3004

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Serve static in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')))
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../dist/index.html')))
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
