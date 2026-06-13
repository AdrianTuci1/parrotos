import { Router } from 'express';
import express from 'express';
import { config } from '../config/index.js';
import { billingService } from '../services/BillingService.js';
import { success } from '../utils/response.js';

const router = Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const stripe = await import('stripe');
    const stripeClient = stripe.default(config.stripeSecretKey);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripeClient.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const orgId = event.data?.object?.metadata?.orgId;
    const plan = event.data?.object?.metadata?.plan;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = session.subscription;
        await billingService.createSubscription(orgId, session.customer, subscriptionId, plan);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await billingService.updateFromStripe(orgId, { status: 'active' });
        break;
      }
      case 'invoice.payment_failed': {
        await billingService.updateFromStripe(orgId, { status: 'past_due' });
        break;
      }
      case 'customer.subscription.deleted': {
        await billingService.updateFromStripe(orgId, { status: 'canceled', plan: 'free' });
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await billingService.updateFromStripe(orgId, {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }
    }

    success(res, { received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
