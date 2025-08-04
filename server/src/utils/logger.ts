import * as fs from 'fs'
import * as path from 'path'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface Logger {
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
  gmail: {
    info: (message: string, ...args: any[]) => void
    warn: (message: string, ...args: any[]) => void
    error: (message: string, ...args: any[]) => void
    debug: (message: string, ...args: any[]) => void
  }
}

const formatTimestamp = (): string => {
  return new Date().toISOString()
}

const formatFileTimestamp = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

const ensureLogDirectory = (): void => {
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
}

// Cache to store the current session's timestamped filenames
const sessionFilenames = new Map<string, string>()

const getTimestampedFilename = (baseFilename: string): string => {
  if (!sessionFilenames.has(baseFilename)) {
    const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '')
    const ext = path.extname(baseFilename) || '.log'
    const timestamp = formatFileTimestamp()
    const timestampedFilename = `${nameWithoutExt}-${timestamp}${ext}`
    sessionFilenames.set(baseFilename, timestampedFilename)
  }
  return sessionFilenames.get(baseFilename)!
}

const writeToLogFile = (filename: string, level: LogLevel, message: string, ...args: any[]): void => {
  try {
    ensureLogDirectory()
    const timestamp = formatTimestamp()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      args: args.length > 0 ? args : undefined,
      pid: process.pid,
      service: 'familynavigator-server',
      session: process.env.LOG_SESSION_ID || 'default'
    }
    
    const logLine = JSON.stringify(logEntry) + '\n'
    const timestampedFilename = getTimestampedFilename(filename)
    const logPath = path.join(process.cwd(), 'logs', timestampedFilename)
    
    fs.appendFileSync(logPath, logLine)
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
}

const log = (level: LogLevel, message: string, logFile: string = 'app.log', ...args: any[]): void => {
  const timestamp = formatTimestamp()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  
  // Console logging
  switch (level) {
    case 'error':
      console.error(prefix, message, ...args)
      break
    case 'warn':
      console.warn(prefix, message, ...args)
      break
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(prefix, message, ...args)
      }
      break
    default:
      console.log(prefix, message, ...args)
  }
  
  // File logging
  writeToLogFile(logFile, level, message, ...args)
}

export const logger: Logger = {
  info: (message: string, ...args: any[]) => log('info', message, 'app.log', ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, 'app.log', ...args),
  error: (message: string, ...args: any[]) => log('error', message, 'app.log', ...args),
  debug: (message: string, ...args: any[]) => log('debug', message, 'app.log', ...args),
  gmail: {
    info: (message: string, ...args: any[]) => log('info', message, 'gmail-sync.log', ...args),
    warn: (message: string, ...args: any[]) => log('warn', message, 'gmail-sync.log', ...args),
    error: (message: string, ...args: any[]) => log('error', message, 'gmail-sync.log', ...args),
    debug: (message: string, ...args: any[]) => log('debug', message, 'gmail-sync.log', ...args)
  }
}