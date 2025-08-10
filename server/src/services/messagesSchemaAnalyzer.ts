import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface TableInfo {
  name: string
  type: string
  sql: string | null
  columns: ColumnInfo[]
  indexes: IndexInfo[]
  rowCount: number
}

interface ColumnInfo {
  cid: number
  name: string
  type: string
  notnull: boolean
  dflt_value: any
  pk: boolean
}

interface IndexInfo {
  name: string
  unique: boolean
  sql: string | null
}

interface SchemaInfo {
  version: string
  tables: TableInfo[]
  totalRows: number
  databaseSize: number
  analysisDate: Date
}

export class MessagesSchemaAnalyzer {
  private dbPath: string

  constructor() {
    // Always use secure development database copy
    // Server runs from server/ directory, so we need to go up one level
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async analyzeSchema(): Promise<SchemaInfo> {
    console.log('[Schema] Starting comprehensive schema analysis')
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get all tables and views
      const tables = await db.all(`
        SELECT name, type, sql 
        FROM sqlite_master 
        WHERE type IN ('table', 'view')
        ORDER BY name
      `)

      const tableInfos: TableInfo[] = []
      let totalRows = 0

      for (const table of tables) {
        console.log(`[Schema] Analyzing table: ${table.name}`)
        
        // Get column information
        const columns: ColumnInfo[] = await db.all(`PRAGMA table_info(${table.name})`)
        
        // Get indexes for this table
        const indexes: IndexInfo[] = await db.all(`
          SELECT name, "unique", sql 
          FROM sqlite_master 
          WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%'
        `, [table.name])

        // Get row count (safely handle views and tables that might not support COUNT)
        let rowCount = 0
        try {
          if (table.type === 'table') {
            const result = await db.get(`SELECT COUNT(*) as count FROM "${table.name}"`)
            rowCount = result?.count || 0
            totalRows += rowCount
          }
        } catch (error) {
          console.log(`[Schema] Could not count rows for ${table.name}:`, error)
        }

        tableInfos.push({
          name: table.name,
          type: table.type,
          sql: table.sql,
          columns,
          indexes,
          rowCount
        })
      }

      // Get database version information
      const version = await this.detectDatabaseVersion(db)
      
      // Get database file size
      const stats = await import('fs/promises').then(fs => fs.stat(this.dbPath))
      
      await db.close()

      const schemaInfo: SchemaInfo = {
        version,
        tables: tableInfos,
        totalRows,
        databaseSize: stats.size,
        analysisDate: new Date()
      }

      console.log(`[Schema] Analysis complete: ${tableInfos.length} tables, ${totalRows} total rows`)
      return schemaInfo

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private async detectDatabaseVersion(db: any): Promise<string> {
    try {
      // Try to detect version from schema characteristics
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
      const tableNames = tables.map((t: any) => t.name).sort()
      
      // Check for newer tables that indicate macOS version
      const hasRecentTables = tableNames.includes('message_attachment_join') && 
                             tableNames.includes('attachment')
      
      // Check for very recent additions
      const hasLatestTables = tableNames.includes('chat_recoverable_message_join') ||
                             tableNames.includes('message_processing_task')

      if (hasLatestTables) {
        return 'macOS 13+ (Ventura/Sonoma/Sequoia)'
      } else if (hasRecentTables) {
        return 'macOS 10.15+ (Catalina/Big Sur/Monterey)'
      } else {
        return 'macOS 10.14 or earlier (Mojave and below)'
      }
    } catch (error) {
      return 'Unknown version'
    }
  }

  async validateRequiredTables(): Promise<{ valid: boolean; missing: string[]; issues: string[] }> {
    console.log('[Schema] Validating required Messages database tables')
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      const requiredTables = [
        'message',
        'chat', 
        'handle',
        'chat_message_join',
        'chat_handle_join'
      ]

      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
      const existingTables = tables.map((t: any) => t.name)
      
      const missing = requiredTables.filter(table => !existingTables.includes(table))
      const issues: string[] = []

      // Validate key table structures
      for (const tableName of requiredTables) {
        if (existingTables.includes(tableName)) {
          try {
            const columns = await db.all(`PRAGMA table_info(${tableName})`)
            
            switch (tableName) {
              case 'message':
                if (!columns.find(c => c.name === 'ROWID')) issues.push('message table missing ROWID')
                if (!columns.find(c => c.name === 'text')) issues.push('message table missing text column')
                if (!columns.find(c => c.name === 'date')) issues.push('message table missing date column')
                break
              case 'handle':
                if (!columns.find(c => c.name === 'id')) issues.push('handle table missing id column')
                if (!columns.find(c => c.name === 'ROWID')) issues.push('handle table missing ROWID')
                break
              case 'chat':
                if (!columns.find(c => c.name === 'ROWID')) issues.push('chat table missing ROWID')
                break
            }
          } catch (error) {
            issues.push(`Cannot analyze ${tableName} structure: ${error}`)
          }
        }
      }

      await db.close()

      return {
        valid: missing.length === 0 && issues.length === 0,
        missing,
        issues
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  async getTablePreview(tableName: string, limit: number = 5): Promise<any[]> {
    console.log(`[Schema] Getting preview of table: ${tableName}`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Sanitize table name to prevent injection
      const validTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'")
      const tableExists = validTables.some((t: any) => t.name === tableName)
      
      if (!tableExists) {
        throw new Error(`Table ${tableName} does not exist`)
      }

      const rows = await db.all(`SELECT * FROM "${tableName}" LIMIT ?`, [limit])
      await db.close()
      
      return rows
    } catch (error) {
      await db.close()
      throw error
    }
  }
}