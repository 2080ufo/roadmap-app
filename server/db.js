import pg from 'pg'
const { Pool } = pg

const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/roadmap_app'
const needsSsl = dbUrl.includes('railway') || dbUrl.includes('rlwy') || process.env.NODE_ENV === 'production'

const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : false
})

export async function initDB() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS roadmaps (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'My Roadmap',
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT CHECK (status IN ('planned', 'in_progress', 'done')) DEFAULT 'planned',
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT DEFAULT '#00d4ff',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      column_name TEXT DEFAULT 'ideas',
      position INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  // WIP signal queue
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wip_signals (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      acknowledged BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  // Tags system
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, tag_id)
    );
  `)

  // Migrate: add column_name and position if missing
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_name TEXT DEFAULT 'ideas';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `)
  console.log('Database tables initialized')
}

export default pool
