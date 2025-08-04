import { Router, Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { userService } from '../services/auth/UserService'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      })
    }

    logger.info('User registration attempt', { email })
    
    const user = await userService.createUser({ email, password, name })
    
    res.status(201).json({
      success: true,
      data: { user },
      message: 'User registered successfully'
    })
  } catch (error) {
    logger.error('Registration failed', { error: error instanceof Error ? error.message : error })
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      })
    }

    logger.info('User login attempt', { email })
    
    const { user, token } = await userService.authenticateUser({ email, password })
    
    res.json({
      success: true,
      data: { user, token },
      message: 'Login successful'
    })
  } catch (error) {
    logger.error('Login failed', { error: error instanceof Error ? error.message : error })
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('User logout')
    
    // TODO: Implement user logout logic
    res.json({
      message: 'User logout endpoint - not implemented yet'
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement current user retrieval logic
    res.json({
      message: 'Current user endpoint - not implemented yet'
    })
  } catch (error) {
    next(error)
  }
})

export default router