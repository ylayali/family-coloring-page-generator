import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/middleware'
import { createCheckoutSession, createStripeCustomer, SUBSCRIPTION_PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { plan } = await request.json()

    if (!plan || !SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]
    
    if (!selectedPlan.priceId) {
      return NextResponse.json({ error: 'Plan price ID not configured' }, { status: 500 })
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(user.email, user.name)
      stripeCustomerId = customer.id

      // Update user with Stripe customer ID
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      })
    }

    // Create checkout session
    const session = await createCheckoutSession(
      stripeCustomerId,
      selectedPlan.priceId,
      `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      `${process.env.NEXTAUTH_URL}/cancel`
    )

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })

  } catch (error) {
    console.error('Checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
