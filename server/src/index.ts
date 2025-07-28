import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'
import authRoutes from './routes/auth'
import communicationsRoutes from './routes/communications'
import documentsRoutes from './routes/documents'
import incidentsRoutes from './routes/incidents'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 6000

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/communications', communicationsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/incidents', incidentsRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
})