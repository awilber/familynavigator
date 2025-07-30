import path from 'path'
import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'
import fs from 'fs/promises'

interface DatabaseConfig {
  path: string
  encryption: {
    enabled: boolean
    algorithm: string
    keyDerivation: {
      iterations: number
      saltLength: number
    }
  }
}

class DatabaseService {
  private db: Database | null = null
  private config: DatabaseConfig
  private encryptionKey: Buffer | null = null
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm'

  constructor(config: DatabaseConfig) {
    this.config = config
  }

  async initialize(masterPassword?: string): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.path)
      await fs.mkdir(dbDir, { recursive: true })

      // Initialize encryption if enabled
      if (this.config.encryption.enabled && masterPassword) {
        await this.initializeEncryption(masterPassword)
      }

      // Open database connection
      this.db = await open({
        filename: this.config.path,
        driver: sqlite3.Database
      })

      // Enable foreign key constraints
      await this.db.exec('PRAGMA foreign_keys = ON')

      // Load schema if database is empty
      await this.initializeSchema()

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  private async initializeEncryption(masterPassword: string): Promise<void> {
    const saltPath = `${this.config.path}.salt`
    let salt: Buffer

    try {
      // Try to load existing salt
      const saltData = await fs.readFile(saltPath)
      salt = Buffer.from(saltData)
    } catch (error) {
      // Generate new salt if file doesn't exist
      salt = randomBytes(this.config.encryption.keyDerivation.saltLength)
      await fs.writeFile(saltPath, salt)
    }

    // Derive encryption key from master password
    this.encryptionKey = pbkdf2Sync(
      masterPassword,
      salt,
      this.config.encryption.keyDerivation.iterations,
      32,
      'sha512'
    )
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Check if schema exists
    const tables = await this.db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    )

    if (tables.length === 0) {
      // Load and execute schema
      const schemaPath = path.join(__dirname, '../../../../database/communications-schema.sql')
      const schema = await fs.readFile(schemaPath, 'utf-8')
      await this.db.exec(schema)
      console.log('Database schema created')
    }
  }

  encrypt(data: string): { encrypted: string; iv: string; authTag: string } | null {
    if (!this.config.encryption.enabled || !this.encryptionKey) {
      return null
    }

    try {
      const iv = randomBytes(16)
      const cipher = createCipheriv(this.ENCRYPTION_ALGORITHM, this.encryptionKey, iv)
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      return null
    }
  }

  decrypt(encryptedData: string, iv: string, authTag: string): string | null {
    if (!this.config.encryption.enabled || !this.encryptionKey) {
      return null
    }

    try {
      const decipher = createDecipheriv(
        this.ENCRYPTION_ALGORITHM,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      )
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'))
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  }

  async getDatabase(): Promise<Database> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.db) {
        return { status: 'unhealthy', details: { error: 'Database not initialized' } }
      }

      // Test basic query
      const result = await this.db.get('SELECT 1 as test')
      if (result?.test !== 1) {
        return { status: 'unhealthy', details: { error: 'Query test failed' } }
      }

      // Check schema version
      const config = await this.db.get(
        'SELECT value FROM app_config WHERE key = ?',
        ['schema_version']
      )

      return {
        status: 'healthy',
        details: {
          schemaVersion: config?.value || 'unknown',
          encryptionEnabled: this.config.encryption.enabled,
          hasEncryptionKey: !!this.encryptionKey
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Create singleton instance
const defaultConfig: DatabaseConfig = {
  path: path.join(process.cwd(), 'data', 'communications.db'),
  encryption: {
    enabled: process.env.NODE_ENV === 'production',
    algorithm: 'aes-256-gcm',
    keyDerivation: {
      iterations: 100000,
      saltLength: 32
    }
  }
}

export const databaseService = new DatabaseService(defaultConfig)
export { DatabaseService, DatabaseConfig }