import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import os from 'os'

const router = express.Router()

// Configure multer for database file uploads
const upload = multer({
  dest: 'data/messages/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept SQLite database files
    const allowedExtensions = ['.db', '.sqlite', '.sqlite3']
    const ext = path.extname(file.originalname).toLowerCase()
    
    if (allowedExtensions.includes(ext) || file.originalname.toLowerCase().includes('chat')) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Please upload a SQLite database file.'))
    }
  }
})

interface DatabaseFileInfo {
  path: string
  filename: string
  size: number
  lastModified: Date
  isSystemFile: boolean
  isValid: boolean
  messageCount?: number
  validationErrors: string[]
  isAccessible: boolean
  isInUse: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  fileInfo: {
    size: number
    lastModified: Date
    messageCount?: number
    contactCount?: number
    dateRange?: { start: Date, end: Date }
  }
}

// Get system Messages database information
router.get('/system-db-info', async (req, res) => {
  try {
    console.log('[Messages] Getting system database info')
    
    // Detect system Messages database path
    const homeDir = os.homedir()
    const messagesDbPath = path.join(homeDir, 'Library', 'Messages', 'chat.db')
    
    console.log(`[Messages] Checking for database at: ${messagesDbPath}`)
    
    if (!existsSync(messagesDbPath)) {
      console.log('[Messages] System database not found')
      return res.json({
        success: true,
        data: null
      })
    }

    // Get file stats
    const stats = await fs.stat(messagesDbPath)
    
    // Check if file is accessible (not always guaranteed on macOS)
    let isAccessible = true
    let isInUse = false
    
    try {
      await fs.access(messagesDbPath, fs.constants.R_OK)
    } catch (error) {
      console.log('[Messages] Database file not accessible:', error)
      isAccessible = false
    }

    // Basic check if Messages app might be using the file
    // This is a simple heuristic - in practice, macOS allows read access even when Messages is running
    try {
      const processes = await import('child_process')
      const { exec } = processes
      
      exec('pgrep -f Messages', (error, stdout) => {
        if (stdout.trim()) {
          isInUse = true
        }
      })
    } catch (error) {
      // Ignore process check errors
    }

    const databaseInfo: DatabaseFileInfo = {
      path: messagesDbPath,
      filename: 'chat.db',
      size: stats.size,
      lastModified: stats.mtime,
      isSystemFile: true,
      isValid: false, // Will be validated separately
      validationErrors: [],
      isAccessible,
      isInUse
    }

    console.log('[Messages] System database found:', {
      size: stats.size,
      lastModified: stats.mtime,
      isAccessible
    })

    res.json({
      success: true,
      data: databaseInfo
    })
  } catch (error) {
    console.error('[Messages] Error getting system database info:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to detect system database'
    })
  }
})

// Validate database file
router.post('/validate-db', upload.single('database'), async (req, res) => {
  let dbPath: string
  let shouldCleanup = false

  try {
    // Determine database path
    if (req.file) {
      // Uploaded file
      dbPath = req.file.path
      shouldCleanup = true
      console.log('[Messages] Validating uploaded database:', req.file.originalname)
    } else if (req.body.path) {
      // System file path
      dbPath = req.body.path
      console.log('[Messages] Validating system database:', dbPath)
    } else {
      return res.status(400).json({
        success: false,
        error: 'No database file or path provided'
      })
    }

    const validationResult = await validateDatabaseFile(dbPath)

    // Cleanup uploaded file if it was invalid
    if (shouldCleanup && !validationResult.isValid) {
      try {
        await fs.unlink(dbPath)
      } catch (error) {
        console.error('[Messages] Error cleaning up invalid uploaded file:', error)
      }
    }

    res.json({
      success: true,
      data: validationResult
    })
  } catch (error) {
    console.error('[Messages] Error validating database:', error)
    
    // Cleanup uploaded file on error
    if (shouldCleanup && req.file) {
      try {
        await fs.unlink(req.file.path)
      } catch (cleanupError) {
        console.error('[Messages] Error cleaning up uploaded file:', cleanupError)
      }
    }

    res.status(500).json({
      success: false,
      error: 'Database validation failed'
    })
  }
})

// Get list of stored databases
router.get('/stored-databases', async (req, res) => {
  try {
    const databasesDir = 'data/messages/databases'
    
    // Create directory if it doesn't exist
    try {
      await fs.access(databasesDir)
    } catch {
      await fs.mkdir(databasesDir, { recursive: true })
      return res.json({ success: true, data: [] })
    }

    const files = await fs.readdir(databasesDir)
    const databases: DatabaseFileInfo[] = []

    for (const filename of files) {
      if (filename.endsWith('.sqlite') || filename.endsWith('.db')) {
        const filePath = path.join(databasesDir, filename)
        const stats = await fs.stat(filePath)
        
        databases.push({
          path: filePath,
          filename,
          size: stats.size,
          lastModified: stats.mtime,
          isSystemFile: false,
          isValid: true, // Assume stored databases are valid
          validationErrors: [],
          isAccessible: true,
          isInUse: false
        })
      }
    }

    res.json({
      success: true,
      data: databases
    })
  } catch (error) {
    console.error('[Messages] Error getting stored databases:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get stored databases'
    })
  }
})

async function validateDatabaseFile(dbPath: string): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let messageCount: number | undefined
  let contactCount: number | undefined
  let dateRange: { start: Date, end: Date } | undefined

  try {
    // Check if file exists and is readable
    const stats = await fs.stat(dbPath)
    
    if (stats.size === 0) {
      errors.push('Database file is empty')
      return {
        isValid: false,
        errors,
        warnings,
        fileInfo: {
          size: stats.size,
          lastModified: stats.mtime
        }
      }
    }

    if (stats.size > 20 * 1024 * 1024 * 1024) { // 20GB warning
      warnings.push('Database file is very large (>20GB) - processing may take significant time')
    }

    // Open database connection (read-only)
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Check if it's a valid SQLite database
      await db.get('SELECT sqlite_version()')

      // Check database integrity
      const integrityResult = await db.get('PRAGMA integrity_check')
      if (integrityResult?.integrity_check !== 'ok') {
        errors.push('Database integrity check failed - file may be corrupted')
      }

      // Check if it looks like a Messages database by looking for expected tables
      const tables = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `)

      const tableNames = tables.map(t => t.name)
      const requiredTables = ['message', 'chat', 'handle']
      const missingTables = requiredTables.filter(table => !tableNames.includes(table))

      if (missingTables.length > 0) {
        errors.push(`Missing required tables: ${missingTables.join(', ')}. This may not be a Messages database.`)
      } else {
        // Get message count
        try {
          const messageResult = await db.get('SELECT COUNT(*) as count FROM message')
          messageCount = messageResult?.count || 0

          if (messageCount === 0) {
            warnings.push('Database contains no messages')
          }
        } catch (error) {
          warnings.push('Unable to count messages in database')
        }

        // Get contact count
        try {
          const handleResult = await db.get('SELECT COUNT(*) as count FROM handle')
          contactCount = handleResult?.count || 0
        } catch (error) {
          warnings.push('Unable to count contacts in database')
        }

        // Get date range
        try {
          const dateResult = await db.get(`
            SELECT 
              MIN(date) as earliest,
              MAX(date) as latest
            FROM message 
            WHERE date IS NOT NULL AND date > 0
          `)

          if (dateResult?.earliest && dateResult?.latest) {
            // Convert Apple timestamps (seconds since 2001-01-01) to JavaScript dates
            const appleEpochOffset = 978307200 // seconds between Unix and Apple epochs
            dateRange = {
              start: new Date((dateResult.earliest + appleEpochOffset) * 1000),
              end: new Date((dateResult.latest + appleEpochOffset) * 1000)
            }
          }
        } catch (error) {
          warnings.push('Unable to determine message date range')
        }
      }

      // Check for WAL mode (common with active databases)
      try {
        const journalMode = await db.get('PRAGMA journal_mode')
        if (journalMode?.journal_mode === 'wal') {
          warnings.push('Database is in WAL mode - ensure associated .wal file is also copied if needed')
        }
      } catch (error) {
        // Ignore pragma errors
      }

    } finally {
      await db.close()
    }

    console.log('[Messages] Database validation completed:', {
      path: dbPath,
      isValid: errors.length === 0,
      messageCount,
      contactCount,
      errors: errors.length,
      warnings: warnings.length
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        size: stats.size,
        lastModified: stats.mtime,
        messageCount,
        contactCount,
        dateRange
      }
    }

  } catch (error) {
    console.error('[Messages] Database validation error:', error)
    errors.push(`Database validation failed: ${error instanceof Error ? error.message : String(error)}`)
    
    return {
      isValid: false,
      errors,
      warnings,
      fileInfo: {
        size: 0,
        lastModified: new Date()
      }
    }
  }
}

export default router