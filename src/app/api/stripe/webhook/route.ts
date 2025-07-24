import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
    }

    // TODO: Implement Stripe webhook handling once Prisma schema is updated with Stripe fields
    console.log('Stripe webhook received but not processed yet')

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
