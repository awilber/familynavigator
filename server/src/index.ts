import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import authRoutes from './routes/auth'
import communicationsRoutes from './routes/communications'
import contactsRoutes from './routes/contacts'
import documentsRoutes from './routes/documents'
import incidentsRoutes from './routes/incidents'
import gmailRoutes from './routes/gmail'
import { databaseService } from './services/database'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const app = express()
const PORT = parseInt(process.env.PORT || '6000')

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/communications', communicationsRoutes)
app.use('/api/contacts', contactsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/incidents', incidentsRoutes)
app.use('/api/gmail', gmailRoutes)

app.use(errorHandler)

// Initialize database before starting server
async function startServer() {
  try {
    await databaseService.initialize()
    logger.info('Database initialized successfully')
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${PORT}`)
    })
  } catch (error) {
    logger.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

startServer()