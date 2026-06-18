/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import benchRoutes from './routes/benchRoutes.js'
import reservationRoutes from './routes/reservationRoutes.js'
import approvalRoutes from './routes/approvalRoutes.js'
import cron from 'node-cron'
import { runTimeoutCheck } from './services/ApprovalService.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api', benchRoutes)
app.use('/api', reservationRoutes)
app.use('/api', approvalRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

cron.schedule('*/5 * * * *', () => {
  console.log('[Cron] Running timeout check at', new Date().toISOString())
  try {
    const result = runTimeoutCheck()
    if (result.newReminders.length > 0 || result.escalatedReservations.length > 0) {
      console.log('[Cron] Timeout check results:', {
        reminders: result.newReminders.length,
        escalations: result.escalatedReservations.length,
        autoDecisions: result.autoDecided.length,
      })
    }
  } catch (e) {
    console.error('[Cron] Timeout check failed:', e)
  }
})

export default app
