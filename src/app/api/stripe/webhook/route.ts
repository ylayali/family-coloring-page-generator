import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent, SUBSCRIPTION_PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    const event = constructWebhookEvent(body, signature)

    console.log('Stripe webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)
  
  if (!session.customer || !session.subscription) {
    console.error('Missing customer or subscription in checkout session')
    return
  }

  // The subscription will be handled by the subscription.created event
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)

  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  // Find the plan based on price ID
  const plan = Object.entries(SUBSCRIPTION_PLANS).find(
    ([_, planData]) => planData.priceId === priceId
  )

  if (!plan) {
    console.error('Unknown price ID:', priceId)
    return
  }

  const [planKey, planData] = plan

  // Find user by Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!user) {
    console.error('User not found for customer:', customerId)
    return
  }

  // Update user with subscription details
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId: subscription.id,
      subscriptionPlan: planKey,
      subscriptionStatus: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      creditsRemaining: planData.credits, // Set credits for the plan
      isTrialActive: subscription.status === 'trialing',
    }
  })

  console.log(`Updated user ${user.id} with ${planKey} subscription`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)

  const user = await prisma.user.findUnique({
    where: { subscriptionId: subscription.id }
  })

  if (!user) {
    console.error('User not found for subscription:', subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const plan = Object.entries(SUBSCRIPTION_PLANS).find(
    ([_, planData]) => planData.priceId === priceId
  )

  if (!plan) {
    console.error('Unknown price ID:', priceId)
    return
  }

  const [planKey, planData] = plan

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionPlan: planKey,
      subscriptionStatus: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      isTrialActive: subscription.status === 'trialing',
    }
  })

  console.log(`Updated subscription for user ${user.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  const user = await prisma.user.findUnique({
    where: { subscriptionId: subscription.id }
  })

  if (!user) {
    console.error('User not found for subscription:', subscription.id)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionId: null,
      subscriptionPlan: null,
      subscriptionStatus: 'cancelled',
      creditsRemaining: 0, // No more credits when subscription is cancelled
      isTrialActive: false,
    }
  })

  console.log(`Cancelled subscription for user ${user.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded:', invoice.id)

  if (!invoice.subscription) {
    return // Not a subscription payment
  }

  const user = await prisma.user.findUnique({
    where: { subscriptionId: invoice.subscription as string }
  })

  if (!user) {
    console.error('User not found for subscription:', invoice.subscription)
    return
  }

  // Reset credits for the new billing period
  const plan = SUBSCRIPTION_PLANS[user.subscriptionPlan as keyof typeof SUBSCRIPTION_PLANS]
  if (plan) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        creditsRemaining: plan.credits,
        subscriptionStatus: 'active',
        lastCreditReset: new Date(),
      }
    })

    console.log(`Reset credits to ${plan.credits} for user ${user.id}`)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed:', invoice.id)

  if (!invoice.subscription) {
    return // Not a subscription payment
  }

  const user = await prisma.user.findUnique({
    where: { subscriptionId: invoice.subscription as string }
  })

  if (!user) {
    console.error('User not found for subscription:', invoice.subscription)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'past_due',
    }
  })

  console.log(`Marked subscription as past_due for user ${user.id}`)
}
