import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'

interface QueryPerformanceMetrics {
  query: string
  executionTime: number
  rowsScanned: number
  rowsReturned: number
  indexesUsed: string[]
  hasFullTableScan: boolean
  memoryUsage: number
  optimizationSuggestions: string[]
}

interface DatabaseIndexInfo {
  tableName: string
  indexName: string
  columns: string[]
  isUnique: boolean
  isPartial: boolean
  creationSql: string
}

interface PerformanceAnalysis {
  currentIndexes: DatabaseIndexInfo[]
  slowQueries: QueryPerformanceMetrics[]
  recommendedIndexes: RecommendedIndex[]
  tableStats: TableStatistics[]
  optimizationSummary: OptimizationSummary
}

interface RecommendedIndex {
  tableName: string
  columns: string[]
  indexName: string
  benefit: 'high' | 'medium' | 'low'
  estimatedSpeedup: number
  creationSql: string
  reasoning: string
}

interface TableStatistics {
  tableName: string
  rowCount: number
  averageRowSize: number
  totalSizeBytes: number
  mostQueriedColumns: string[]
  queryFrequency: number
}

interface OptimizationSummary {
  totalQueries: number
  slowQueries: number
  averageQueryTime: number
  recommendedIndexCount: number
  estimatedPerformanceGain: string
  criticalOptimizations: string[]
}

export class MessagesPerformanceOptimizer {
  private dbPath: string
  private performanceLog: QueryPerformanceMetrics[] = []

  constructor() {
    // Always use secure development database copy
    this.dbPath = path.join(process.cwd(), '..', 'data', 'messages', 'databases', 'chat-dev-copy.db')
  }

  async analyzePerformance(): Promise<PerformanceAnalysis> {
    console.log('[Performance] Starting comprehensive performance analysis')
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    })

    try {
      // Get current indexes
      const currentIndexes = await this.getCurrentIndexes(db)
      
      // Analyze table statistics
      const tableStats = await this.getTableStatistics(db)
      
      // Run performance benchmarks on common queries
      const queryMetrics = await this.benchmarkCommonQueries(db)
      
      // Generate index recommendations
      const recommendedIndexes = await this.generateIndexRecommendations(db, queryMetrics, tableStats)
      
      // Create optimization summary
      const optimizationSummary = this.generateOptimizationSummary(queryMetrics, recommendedIndexes)

      await db.close()

      return {
        currentIndexes,
        slowQueries: queryMetrics.filter(q => q.executionTime > 100), // Queries taking >100ms
        recommendedIndexes,
        tableStats,
        optimizationSummary
      }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  private async getCurrentIndexes(db: any): Promise<DatabaseIndexInfo[]> {
    console.log('[Performance] Analyzing current database indexes')

    const indexes = await db.all(`
      SELECT 
        name as indexName,
        tbl_name as tableName,
        sql as creationSql
      FROM sqlite_master 
      WHERE type = 'index' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `)

    const indexInfos: DatabaseIndexInfo[] = []

    for (const index of indexes) {
      // Get columns for each index
      const indexColumns = await db.all(`PRAGMA index_info(${index.indexName})`)
      
      // Determine if unique by checking SQL
      const isUnique = index.creationSql ? index.creationSql.toUpperCase().includes('UNIQUE') : false
      const isPartial = index.creationSql ? index.creationSql.toUpperCase().includes('WHERE') : false
      
      indexInfos.push({
        tableName: index.tableName,
        indexName: index.indexName,
        columns: indexColumns.map((col: any) => col.name),
        isUnique,
        isPartial,
        creationSql: index.creationSql || `-- Auto-generated index`
      })
    }

    return indexInfos
  }

  private async getTableStatistics(db: any): Promise<TableStatistics[]> {
    console.log('[Performance] Gathering table statistics')

    const tables = ['message', 'chat', 'handle', 'attachment', 'chat_message_join', 'chat_handle_join', 'message_attachment_join']
    const tableStats: TableStatistics[] = []

    for (const tableName of tables) {
      try {
        // Get row count
        const countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`)
        const rowCount = countResult?.count || 0

        // Get approximate table size (simplified approach)
        const sizeInfo = await db.get(`PRAGMA page_count`)
        const pageSize = await db.get(`PRAGMA page_size`)
        const approximateSize = (sizeInfo?.page_count || 0) * (pageSize?.page_size || 4096)
        
        const totalSize = approximateSize
        const averageRowSize = rowCount > 0 ? Math.round(totalSize / rowCount) : 0

        tableStats.push({
          tableName,
          rowCount,
          averageRowSize,
          totalSizeBytes: totalSize,
          mostQueriedColumns: await this.getMostQueriedColumns(db, tableName),
          queryFrequency: this.getTableQueryFrequency(tableName)
        })

      } catch (error) {
        console.log(`[Performance] Warning: Could not analyze table ${tableName}:`, error)
      }
    }

    return tableStats
  }

  private async getMostQueriedColumns(db: any, tableName: string): Promise<string[]> {
    // This would ideally analyze query logs, but we'll use schema analysis
    const columns = await db.all(`PRAGMA table_info(${tableName})`)
    
    // Return commonly filtered/joined columns based on table type
    switch (tableName) {
      case 'message':
        return ['ROWID', 'date', 'handle_id', 'is_from_me', 'text']
      case 'chat':
        return ['ROWID', 'display_name', 'service_name']
      case 'handle':
        return ['ROWID', 'id', 'service']
      case 'chat_message_join':
        return ['chat_id', 'message_id']
      case 'chat_handle_join':
        return ['chat_id', 'handle_id']
      default:
        return columns.slice(0, 3).map((col: any) => col.name)
    }
  }

  private getTableQueryFrequency(tableName: string): number {
    // Estimate based on typical usage patterns
    const frequencyMap: { [key: string]: number } = {
      'message': 10, // Most queried
      'chat_message_join': 8,
      'handle': 6,
      'chat': 5,
      'chat_handle_join': 4,
      'attachment': 3,
      'message_attachment_join': 2
    }

    return frequencyMap[tableName] || 1
  }

  private async benchmarkCommonQueries(db: any): Promise<QueryPerformanceMetrics[]> {
    console.log('[Performance] Benchmarking common query patterns')

    const testQueries = [
      {
        name: 'Recent Messages',
        query: `
          SELECT m.ROWID, m.text, m.date, m.is_from_me 
          FROM message m 
          ORDER BY m.date DESC 
          LIMIT 100
        `
      },
      {
        name: 'Chat Messages',
        query: `
          SELECT m.ROWID, m.text, m.date 
          FROM message m
          JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
          WHERE cmj.chat_id = 1
          ORDER BY m.date ASC
          LIMIT 100
        `
      },
      {
        name: 'Contact Message Count',
        query: `
          SELECT h.id, COUNT(DISTINCT cmj.message_id) as message_count
          FROM handle h
          LEFT JOIN chat_handle_join chj ON h.ROWID = chj.handle_id
          LEFT JOIN chat_message_join cmj ON chj.chat_id = cmj.chat_id
          GROUP BY h.ROWID
          ORDER BY message_count DESC
          LIMIT 20
        `
      },
      {
        name: 'Messages with Attachments',
        query: `
          SELECT m.ROWID, m.text, COUNT(a.ROWID) as attachment_count
          FROM message m
          JOIN message_attachment_join maj ON m.ROWID = maj.message_id
          JOIN attachment a ON maj.attachment_id = a.ROWID
          WHERE m.cache_has_attachments = 1
          GROUP BY m.ROWID
          LIMIT 50
        `
      },
      {
        name: 'Search Messages by Text',
        query: `
          SELECT m.ROWID, m.text, m.date
          FROM message m
          WHERE m.text LIKE '%important%'
          ORDER BY m.date DESC
          LIMIT 50
        `
      },
      {
        name: 'Chat Participants',
        query: `
          SELECT c.ROWID, c.display_name, COUNT(DISTINCT chj.handle_id) as participant_count
          FROM chat c
          LEFT JOIN chat_handle_join chj ON c.ROWID = chj.chat_id
          GROUP BY c.ROWID
          HAVING participant_count > 1
          ORDER BY participant_count DESC
        `
      }
    ]

    const metrics: QueryPerformanceMetrics[] = []

    for (const testQuery of testQueries) {
      const metric = await this.benchmarkQuery(db, testQuery.name, testQuery.query)
      metrics.push(metric)
    }

    return metrics
  }

  private async benchmarkQuery(db: any, queryName: string, query: string): Promise<QueryPerformanceMetrics> {
    console.log(`[Performance] Benchmarking: ${queryName}`)

    // Enable query planning
    await db.run('PRAGMA stats = ON')
    
    const startTime = Date.now()
    const startMemory = process.memoryUsage().heapUsed

    try {
      // Run the query
      const results = await db.all(query)
      
      const endTime = Date.now()
      const endMemory = process.memoryUsage().heapUsed

      // Get query plan
      const queryPlan = await db.all(`EXPLAIN QUERY PLAN ${query}`)
      
      // Analyze plan for optimization insights
      const planAnalysis = this.analyzeQueryPlan(queryPlan)

      return {
        query: `${queryName}: ${query.trim()}`,
        executionTime: endTime - startTime,
        rowsScanned: planAnalysis.estimatedRowsScanned,
        rowsReturned: results.length,
        indexesUsed: planAnalysis.indexesUsed,
        hasFullTableScan: planAnalysis.hasFullTableScan,
        memoryUsage: endMemory - startMemory,
        optimizationSuggestions: planAnalysis.suggestions
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        query: `${queryName}: ${query.trim()}`,
        executionTime: -1,
        rowsScanned: -1,
        rowsReturned: -1,
        indexesUsed: [],
        hasFullTableScan: true,
        memoryUsage: -1,
        optimizationSuggestions: [`Query failed: ${errorMessage}`]
      }
    }
  }

  private analyzeQueryPlan(queryPlan: any[]): {
    estimatedRowsScanned: number
    indexesUsed: string[]
    hasFullTableScan: boolean
    suggestions: string[]
  } {
    let estimatedRowsScanned = 0
    const indexesUsed: string[] = []
    let hasFullTableScan = false
    const suggestions: string[] = []

    queryPlan.forEach(step => {
      const detail = step.detail?.toLowerCase() || ''
      
      // Check for table scans
      if (detail.includes('scan table')) {
        hasFullTableScan = true
        suggestions.push('Consider adding an index to avoid full table scan')
      }

      // Extract index usage
      if (detail.includes('using index')) {
        const indexMatch = detail.match(/using index (\w+)/)
        if (indexMatch) {
          indexesUsed.push(indexMatch[1])
        }
      }

      // Estimate rows scanned (very rough approximation)
      if (detail.includes('message')) estimatedRowsScanned += 530000
      else if (detail.includes('chat')) estimatedRowsScanned += 10000
      else if (detail.includes('handle')) estimatedRowsScanned += 3000
      else estimatedRowsScanned += 1000
    })

    return {
      estimatedRowsScanned,
      indexesUsed,
      hasFullTableScan,
      suggestions
    }
  }

  private async generateIndexRecommendations(
    db: any, 
    queryMetrics: QueryPerformanceMetrics[], 
    tableStats: TableStatistics[]
  ): Promise<RecommendedIndex[]> {
    console.log('[Performance] Generating index recommendations')

    const recommendations: RecommendedIndex[] = []

    // High-priority indexes for Messages database
    const criticalIndexes = [
      {
        tableName: 'message',
        columns: ['date'],
        benefit: 'high' as const,
        reasoning: 'Critical for chronological message queries and recent message fetching'
      },
      {
        tableName: 'message',
        columns: ['handle_id', 'date'],
        benefit: 'high' as const,
        reasoning: 'Optimizes contact-specific message queries with date ordering'
      },
      {
        tableName: 'message',
        columns: ['is_from_me', 'date'],
        benefit: 'medium' as const,
        reasoning: 'Useful for filtering sent vs received messages chronologically'
      },
      {
        tableName: 'chat_message_join',
        columns: ['chat_id', 'message_id'],
        benefit: 'high' as const,
        reasoning: 'Essential composite index for chat-message relationship queries'
      },
      {
        tableName: 'chat_handle_join',
        columns: ['chat_id', 'handle_id'],
        benefit: 'high' as const,
        reasoning: 'Essential composite index for chat-participant relationship queries'
      },
      {
        tableName: 'handle',
        columns: ['service', 'id'],
        benefit: 'medium' as const,
        reasoning: 'Optimizes contact lookup by service and identifier'
      },
      {
        tableName: 'message',
        columns: ['text'],
        benefit: 'medium' as const,
        reasoning: 'Enables fast text search capabilities (consider FTS for full-text search)'
      },
      {
        tableName: 'message',
        columns: ['cache_has_attachments'],
        benefit: 'low' as const,
        reasoning: 'Speeds up queries filtering for messages with attachments'
      }
    ]

    // Check which indexes already exist
    const currentIndexes = await this.getCurrentIndexes(db)
    const existingIndexColumns = new Set(
      currentIndexes.map(idx => `${idx.tableName}:${idx.columns.join(',')}`)
    )

    for (const rec of criticalIndexes) {
      const indexKey = `${rec.tableName}:${rec.columns.join(',')}`
      
      if (!existingIndexColumns.has(indexKey)) {
        const indexName = `idx_${rec.tableName}_${rec.columns.join('_')}`
        
        recommendations.push({
          tableName: rec.tableName,
          columns: rec.columns,
          indexName,
          benefit: rec.benefit,
          estimatedSpeedup: this.estimateSpeedupBenefit(rec.benefit, rec.tableName, tableStats),
          creationSql: `CREATE INDEX ${indexName} ON ${rec.tableName} (${rec.columns.join(', ')})`,
          reasoning: rec.reasoning
        })
      }
    }

    // Add FTS recommendation for text search
    const hasFtsIndex = currentIndexes.some(idx => idx.indexName.includes('fts'))
    if (!hasFtsIndex) {
      recommendations.push({
        tableName: 'message',
        columns: ['text'],
        indexName: 'message_fts',
        benefit: 'high',
        estimatedSpeedup: 50,
        creationSql: `CREATE VIRTUAL TABLE message_fts USING fts5(text, content='message', content_rowid='ROWID')`,
        reasoning: 'Full-text search index for fast text queries across all messages'
      })
    }

    return recommendations
  }

  private estimateSpeedupBenefit(benefit: 'high' | 'medium' | 'low', tableName: string, tableStats: TableStatistics[]): number {
    const tableInfo = tableStats.find(ts => ts.tableName === tableName)
    const rowCount = tableInfo?.rowCount || 1000

    const baseSpeedup = {
      high: Math.min(Math.log10(rowCount) * 10, 100), // Up to 100x speedup for large tables
      medium: Math.min(Math.log10(rowCount) * 5, 20),   // Up to 20x speedup
      low: Math.min(Math.log10(rowCount) * 2, 5)        // Up to 5x speedup
    }

    return Math.round(baseSpeedup[benefit])
  }

  private generateOptimizationSummary(
    queryMetrics: QueryPerformanceMetrics[], 
    recommendations: RecommendedIndex[]
  ): OptimizationSummary {
    const totalQueries = queryMetrics.length
    const slowQueries = queryMetrics.filter(q => q.executionTime > 100).length
    const averageQueryTime = Math.round(
      queryMetrics.reduce((sum, q) => sum + (q.executionTime > 0 ? q.executionTime : 0), 0) / Math.max(totalQueries, 1)
    )

    const highPriorityRecs = recommendations.filter(r => r.benefit === 'high')
    const criticalOptimizations = [
      ...queryMetrics.filter(q => q.executionTime > 1000).map(q => `Slow query: ${q.query.split(':')[0]} (${q.executionTime}ms)`),
      ...highPriorityRecs.map(r => `Missing critical index: ${r.indexName} on ${r.tableName}`)
    ]

    return {
      totalQueries,
      slowQueries,
      averageQueryTime,
      recommendedIndexCount: recommendations.length,
      estimatedPerformanceGain: this.calculateOverallPerformanceGain(recommendations),
      criticalOptimizations: criticalOptimizations.slice(0, 5) // Top 5 critical items
    }
  }

  private calculateOverallPerformanceGain(recommendations: RecommendedIndex[]): string {
    const totalSpeedup = recommendations.reduce((sum, rec) => {
      const weight = { high: 3, medium: 2, low: 1 }[rec.benefit]
      return sum + (rec.estimatedSpeedup * weight)
    }, 0)

    const averageSpeedup = Math.round(totalSpeedup / Math.max(recommendations.length, 1))

    if (averageSpeedup > 50) return 'Significant (50-100x faster)'
    if (averageSpeedup > 20) return 'High (20-50x faster)'
    if (averageSpeedup > 5) return 'Moderate (5-20x faster)'
    return 'Low (2-5x faster)'
  }

  async createRecommendedIndexes(recommendations: RecommendedIndex[]): Promise<{
    created: string[]
    failed: Array<{ indexName: string, error: string }>
  }> {
    console.log(`[Performance] Creating ${recommendations.length} recommended indexes`)
    
    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READWRITE
    })

    const created: string[] = []
    const failed: Array<{ indexName: string, error: string }> = []

    try {
      for (const rec of recommendations) {
        try {
          console.log(`[Performance] Creating index: ${rec.indexName}`)
          await db.run(rec.creationSql)
          created.push(rec.indexName)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.log(`[Performance] Failed to create index ${rec.indexName}:`, errorMessage)
          failed.push({ indexName: rec.indexName, error: errorMessage })
        }
      }

      await db.close()
      return { created, failed }

    } catch (error) {
      await db.close()
      throw error
    }
  }

  async generatePerformanceReport(): Promise<string> {
    console.log('[Performance] Generating comprehensive performance report')

    const analysis = await this.analyzePerformance()
    
    let report = '# Messages Database Performance Analysis\n\n'
    report += `**Analysis Date:** ${new Date().toISOString()}\n`
    report += `**Database:** ${this.dbPath}\n\n`

    // Summary
    report += '## Executive Summary\n\n'
    report += `- **Total Queries Analyzed:** ${analysis.optimizationSummary.totalQueries}\n`
    report += `- **Slow Queries:** ${analysis.optimizationSummary.slowQueries}\n`
    report += `- **Average Query Time:** ${analysis.optimizationSummary.averageQueryTime}ms\n`
    report += `- **Recommended Indexes:** ${analysis.optimizationSummary.recommendedIndexCount}\n`
    report += `- **Estimated Performance Gain:** ${analysis.optimizationSummary.estimatedPerformanceGain}\n\n`

    // Table Statistics
    report += '## Table Statistics\n\n'
    analysis.tableStats.forEach(table => {
      report += `### ${table.tableName}\n`
      report += `- **Rows:** ${table.rowCount.toLocaleString()}\n`
      report += `- **Size:** ${(table.totalSizeBytes / 1024 / 1024).toFixed(1)} MB\n`
      report += `- **Avg Row Size:** ${table.averageRowSize} bytes\n`
      report += `- **Query Frequency:** ${table.queryFrequency}/10\n\n`
    })

    // Current Indexes
    report += '## Current Indexes\n\n'
    analysis.currentIndexes.forEach(idx => {
      report += `- **${idx.indexName}** on \`${idx.tableName}\` (${idx.columns.join(', ')})\n`
    })
    report += '\n'

    // Recommendations
    report += '## Index Recommendations\n\n'
    analysis.recommendedIndexes.forEach(rec => {
      report += `### ${rec.indexName} (${rec.benefit.toUpperCase()} Priority)\n`
      report += `- **Table:** ${rec.tableName}\n`
      report += `- **Columns:** ${rec.columns.join(', ')}\n`
      report += `- **Estimated Speedup:** ${rec.estimatedSpeedup}x\n`
      report += `- **Reasoning:** ${rec.reasoning}\n`
      report += `- **SQL:** \`${rec.creationSql}\`\n\n`
    })

    // Slow Queries
    if (analysis.slowQueries.length > 0) {
      report += '## Slow Query Analysis\n\n'
      analysis.slowQueries.forEach(query => {
        report += `### Query: ${query.query.split(':')[0]}\n`
        report += `- **Execution Time:** ${query.executionTime}ms\n`
        report += `- **Rows Scanned:** ${query.rowsScanned.toLocaleString()}\n`
        report += `- **Rows Returned:** ${query.rowsReturned.toLocaleString()}\n`
        report += `- **Has Table Scan:** ${query.hasFullTableScan ? 'Yes' : 'No'}\n`
        if (query.optimizationSuggestions.length > 0) {
          report += `- **Suggestions:** ${query.optimizationSuggestions.join('; ')}\n`
        }
        report += '\n'
      })
    }

    // Critical Optimizations
    report += '## Critical Action Items\n\n'
    analysis.optimizationSummary.criticalOptimizations.forEach((item, index) => {
      report += `${index + 1}. ${item}\n`
    })

    return report
  }
}