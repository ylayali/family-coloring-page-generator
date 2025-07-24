import { NextRequest } from 'next/server'
import { verifyToken, getUserById } from './auth'

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return null
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    // Get user data
    const user = await getUserById(payload.userId)
    return user
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, user: { id: string; email: string; creditsRemaining: number }) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthenticatedUser(request)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return handler(request, user)
  }
}
