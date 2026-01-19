import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export const getStripe = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    })
  }
  return stripeInstance
}

export const PRICE_AMOUNT = 2900 // £29.00 in pence
export const PRICE_CURRENCY = 'gbp'
