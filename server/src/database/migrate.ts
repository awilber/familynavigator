import { readFileSync } from 'fs'
import { join } from 'path'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    console.log('Running database migrations...')
    
    const schemaPath = join(__dirname, '../../../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    
    await pool.query(schema)
    
    console.log('Database migrations completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  migrate()
}