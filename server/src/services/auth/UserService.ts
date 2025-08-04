import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { databaseService } from '../database'

interface User {
  id: number
  email: string
  name: string
  created_at: string
  updated_at: string
}

interface CreateUserData {
  email: string
  password: string
  name: string
}

interface LoginData {
  email: string
  password: string
}

export class UserService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret'
  private readonly SALT_ROUNDS = 10

  async createUser(userData: CreateUserData): Promise<User> {
    const db = await databaseService.getDatabase()
    
    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ?',
      [userData.email]
    )
    
    if (existingUser) {
      throw new Error('User already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.SALT_ROUNDS)

    // Create user
    const result = await db.run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [userData.email, passwordHash, userData.name]
    )

    if (!result.lastID) {
      throw new Error('Failed to create user')
    }

    // Return user without password
    return await this.getUserById(result.lastID)
  }

  async authenticateUser(loginData: LoginData): Promise<{ user: User; token: string }> {
    const db = await databaseService.getDatabase()
    
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [loginData.email]
    )
    
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginData.password, user.password_hash)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Return user without password
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      updated_at: user.updated_at
    }

    return { user: userWithoutPassword, token }
  }

  async getUserById(id: number): Promise<User> {
    const db = await databaseService.getDatabase()
    
    const user = await db.get(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?',
      [id]
    )
    
    if (!user) {
      throw new Error('User not found')
    }

    return user
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await databaseService.getDatabase()
    
    const user = await db.get(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE email = ?',
      [email]
    )
    
    return user || null
  }

  verifyToken(token: string): { userId: number; email: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any
      return { userId: decoded.userId, email: decoded.email }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }
}

export const userService = new UserService()