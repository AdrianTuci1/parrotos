import { Router } from 'express';
import { billingService } from '../services/BillingService.js';
import { Organization } from '../models/Organization.js';
import { authenticate, requireOrgAccess, requireOrganizationOwner } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { config } from '../config/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireOrgAccess);

// GET routes are accessible to all org members
router.get('/subscription', async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const [sub, orgDoc] = await Promise.all([
      billingService.findByOrg(orgId),
      billingService.orgsCollection.doc(orgId).get(),
    ]);

    const orgData = orgDoc.exists ? orgDoc.data() : {};
    const plan = sub?.plan || orgData?.plan || 'free';
    const limits = orgData?.limits || Organization.getDefaultLimits(plan);

    success(res, sub
      ? { ...sub, plan, limits }
      : { plan, status: 'active', limits });
  } catch (err) {
    next(err);
  }
});

router.post('/checkout-session', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { plan, successUrl, cancelUrl } = req.body;

    if (!plan || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'plan, successUrl, cancelUrl required' });
    }

    const stripe = await import('stripe');
    const stripeClient = stripe.default(config.stripeSecretKey);

    const org = await billingService.orgsCollection.doc(orgId).get();
    const orgData = org.data();

    let customerId = orgData?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        name: orgData?.name || orgId,
        metadata: { orgId },
      });
      customerId = customer.id;
      await billingService.orgsCollection.doc(orgId).update({ stripeCustomerId: customerId });
    }

    const priceMap = {
      launch: process.env.STRIPE_PRICE_LAUNCH,
      scale: process.env.STRIPE_PRICE_SCALE,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or price not configured' });
    }

    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId, plan },
    });

    success(res, { sessionId: session.id, url: session.url });
  } catch (err) {
    next(err);
  }
});

router.post('/portal-session', requireOrganizationOwner, async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { returnUrl } = req.body;

    const org = await billingService.orgsCollection.doc(orgId).get();
    const orgData = org.data();
    const customerId = orgData?.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const stripe = await import('stripe');
    const stripeClient = stripe.default(config.stripeSecretKey);

    const session = await stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    success(res, { url: session.url });
  } catch (err) {
    next(err);
  }
});

export default router;
