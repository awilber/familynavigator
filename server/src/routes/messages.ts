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
    console.log('[Messages] Getting development database info')
    
    // Use development database copy instead of live system database
    // SECURITY: Never access live Messages database directly
    const devDbPath = path.join(process.cwd(), 'data', 'messages', 'databases', 'chat-dev-copy.db')
    
    console.log(`[Messages] Checking for development database at: ${devDbPath}`)
    
    if (!existsSync(devDbPath)) {
      console.log('[Messages] Development database not found')
      return res.json({
        success: true,
        data: null
      })
    }

    // Get file stats
    const stats = await fs.stat(devDbPath)
    
    // Development database is always accessible and not in use
    const isAccessible = true
    const isInUse = false

    const databaseInfo: DatabaseFileInfo = {
      path: devDbPath,
      filename: 'chat-dev-copy.db',
      size: stats.size,
      lastModified: stats.mtime,
      isSystemFile: false, // This is now a development copy
      isValid: false, // Will be validated separately
      validationErrors: [],
      isAccessible,
      isInUse
    }

    console.log('[Messages] Development database found:', {
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

// Security function to prevent access to system Messages database
function isSystemMessagesPath(filePath: string): boolean {
  const normalizedPath = path.resolve(filePath)
  const forbiddenPaths = [
    path.join(os.homedir(), 'Library', 'Messages'),
    '/Library/Messages',
    'Library/Messages'
  ]
  
  return forbiddenPaths.some(forbidden => 
    normalizedPath.includes(forbidden) || 
    normalizedPath.includes('chat.db') && !normalizedPath.includes('chat-dev-copy.db')
  )
}

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
      // Path validation for security
      const requestedPath = req.body.path
      
      // SECURITY CHECK: Prevent access to live system Messages database
      if (isSystemMessagesPath(requestedPath)) {
        console.log('[Messages] SECURITY: Blocked attempt to access system Messages database:', requestedPath)
        return res.status(403).json({
          success: false,
          error: 'Access to system Messages database is not allowed. Please use the development copy or upload a file.'
        })
      }
      
      dbPath = requestedPath
      console.log('[Messages] Validating provided database:', dbPath)
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

// Secure copy endpoint - creates a safe development copy from system database
router.post('/copy-system-database', async (req, res) => {
  try {
    console.log('[Messages] Creating secure development copy of system database')
    
    // Source: System Messages database
    const homeDir = os.homedir()
    const systemDbPath = path.join(homeDir, 'Library', 'Messages', 'chat.db')
    
    // Destination: Development copy in project directory
    const devDbDir = path.join(process.cwd(), 'data', 'messages', 'databases')
    const devDbPath = path.join(devDbDir, 'chat-dev-copy.db')
    
    // Ensure development directory exists
    if (!existsSync(devDbDir)) {
      await fs.mkdir(devDbDir, { recursive: true })
    }
    
    // Check if system database exists
    if (!existsSync(systemDbPath)) {
      return res.status(404).json({
        success: false,
        error: 'System Messages database not found'
      })
    }
    
    // Get source file size for progress tracking
    const sourceStats = await fs.stat(systemDbPath)
    console.log(`[Messages] Copying ${(sourceStats.size / (1024 * 1024)).toFixed(1)} MB database`)
    
    // Create secure copy
    await fs.copyFile(systemDbPath, devDbPath)
    
    // Verify the copy was successful
    const copyStats = await fs.stat(devDbPath)
    if (copyStats.size !== sourceStats.size) {
      throw new Error('Copy verification failed - file sizes do not match')
    }
    
    console.log('[Messages] Secure development copy created successfully')
    
    // Return information about the new development copy
    const databaseInfo: DatabaseFileInfo = {
      path: devDbPath,
      filename: 'chat-dev-copy.db',
      size: copyStats.size,
      lastModified: copyStats.mtime,
      isSystemFile: false,
      isValid: false, // Will need validation
      validationErrors: [],
      isAccessible: true,
      isInUse: false
    }
    
    res.json({
      success: true,
      data: {
        message: 'Development copy created successfully',
        database: databaseInfo,
        sourceSize: sourceStats.size,
        copySize: copyStats.size
      }
    })
  } catch (error) {
    console.error('[Messages] Error creating development copy:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create development copy: ' + (error instanceof Error ? error.message : String(error))
    })
  }
})

export default router