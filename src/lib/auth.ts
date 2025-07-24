import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

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

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password)
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      trialStartDate: new Date(),
      isTrialActive: true,
      creditsRemaining: parseInt(process.env.FREE_TRIAL_CREDITS || '3'),
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    creditsRemaining: user.creditsRemaining,
    isTrialActive: user.isTrialActive,
    trialStartDate: user.trialStartDate || undefined,
    subscriptionPlan: user.subscriptionPlan || undefined,
    subscriptionStatus: user.subscriptionStatus || undefined,
    stripeCustomerId: user.stripeCustomerId || undefined,
    subscriptionId: user.subscriptionId || undefined,
    currentPeriodEnd: user.currentPeriodEnd || undefined,
    currentPeriodStart: user.currentPeriodStart || undefined,
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !(await verifyPassword(password, user.password))) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    creditsRemaining: user.creditsRemaining,
    isTrialActive: user.isTrialActive,
    trialStartDate: user.trialStartDate || undefined,
    subscriptionPlan: user.subscriptionPlan || undefined,
    subscriptionStatus: user.subscriptionStatus || undefined,
    stripeCustomerId: user.stripeCustomerId || undefined,
    subscriptionId: user.subscriptionId || undefined,
    currentPeriodEnd: user.currentPeriodEnd || undefined,
    currentPeriodStart: user.currentPeriodStart || undefined,
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    creditsRemaining: user.creditsRemaining,
    isTrialActive: user.isTrialActive,
    trialStartDate: user.trialStartDate || undefined,
    subscriptionPlan: user.subscriptionPlan || undefined,
    subscriptionStatus: user.subscriptionStatus || undefined,
    stripeCustomerId: user.stripeCustomerId || undefined,
    subscriptionId: user.subscriptionId || undefined,
    currentPeriodEnd: user.currentPeriodEnd || undefined,
    currentPeriodStart: user.currentPeriodStart || undefined,
  }
}

export async function useCredit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || user.creditsRemaining <= 0) {
    return false
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      creditsRemaining: user.creditsRemaining - 1,
      totalCreditsUsed: user.totalCreditsUsed + 1,
      trialCreditsUsed: user.isTrialActive ? user.trialCreditsUsed + 1 : user.trialCreditsUsed,
    },
  })

  return true
}

export async function checkTrialExpiry(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.isTrialActive || !user.trialStartDate) return

  const trialDays = parseInt(process.env.TRIAL_DAYS || '7')
  const trialEndDate = new Date(user.trialStartDate)
  trialEndDate.setDate(trialEndDate.getDate() + trialDays)

  if (new Date() > trialEndDate) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isTrialActive: false,
        creditsRemaining: 0, // Trial expired, no more credits
      },
    })
  }
}
