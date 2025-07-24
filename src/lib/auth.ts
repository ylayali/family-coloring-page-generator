import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'

export interface User {
  id: string
  email: string
  name?: string
  creditsRemaining: number
  isTrialActive: boolean
  trialStartDate?: Date
  subscriptionPlan?: string
  subscriptionStatus?: string
  stripeCustomerId?: string
  subscriptionId?: string
  currentPeriodEnd?: Date
  currentPeriodStart?: Date
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// Temporary mock functions for deployment - replace with Prisma once database is set up
export async function createUser(email: string, password: string, name?: string): Promise<User> {
  const hashedPassword = await hashPassword(password)
  
  // Mock user creation - in production this would use Prisma
  const mockUser: User = {
    id: 'temp-' + Date.now(),
    email,
    name: name || undefined,
    creditsRemaining: parseInt(process.env.FREE_TRIAL_CREDITS || '3'),
    isTrialActive: true,
    trialStartDate: new Date(),
    subscriptionPlan: undefined,
    subscriptionStatus: undefined,
  }

  return mockUser
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  // Mock authentication - in production this would use Prisma
  // For now, return null to indicate authentication is not available
  return null
}

export async function getUserById(id: string): Promise<User | null> {
  // Mock user retrieval - in production this would use Prisma
  // For now, return null to indicate user lookup is not available
  return null
}

export async function deductCredit(userId: string): Promise<boolean> {
  // Mock credit deduction - in production this would use Prisma
  // For now, return true to allow image generation
  return true
}

export async function checkTrialExpiry(userId: string): Promise<void> {
  // Mock trial expiry check - in production this would use Prisma
  // For now, do nothing
  return
}
