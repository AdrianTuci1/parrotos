import { useState, useEffect, Fragment } from 'react';
import {
  Check,
  Minus,
  Download,
  X,
  Sparkles,
  Receipt,
  PieChart,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ViewFrame } from '@/components/shell/ViewFrame';
import '@/styles/billing.css';

function Wrapper({ children, embedded }) {
  if (embedded) return <Fragment>{children}</Fragment>;
  return (
    <ViewFrame
      title="Billings & Subscription"
      description="Upgrade to enable unlimited tracking, enhanced security controls, and additional features."
      maxWidthClassName="full-width"
    >
      {children}
    </ViewFrame>
  );
}

// SVG Icons for Pricing Cards matching the screenshot's premium aesthetic
const FreeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="url(#freeGrad)" />
    <path d="M12 7L16 11L12 15L8 11L12 7Z" fill="white" opacity="0.9" />
    <defs>
      <linearGradient id="freeGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6B7280" />
        <stop offset="1" stopColor="#374151" />
      </linearGradient>
    </defs>
  </svg>
);

const LaunchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="url(#orangeGrad)" />
    <path d="M12 7.5L15.5 11L12 14.5L8.5 11L12 7.5Z" fill="white" />
    <defs>
      <linearGradient id="orangeGrad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B" />
        <stop offset="1" stopColor="#D97706" />
      </linearGradient>
    </defs>
  </svg>
);

const ScaleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 10L12 4L18 10L12 16L6 10Z" fill="url(#blueGrad)" opacity="0.8" />
    <path d="M6 14L12 8L18 14L12 20L6 14Z" fill="url(#blueGrad)" />
    <defs>
      <linearGradient id="blueGrad" x1="0" y1="4" x2="24" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3B82F6" />
        <stop offset="1" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
  </svg>
);

const EnterpriseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="url(#purpleGrad)" />
    <circle cx="12" cy="12" r="6.5" fill="url(#purpleGradInner)" />
    <defs>
      <linearGradient id="purpleGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8B5CF6" />
        <stop offset="1" stopColor="#4C1D95" />
      </linearGradient>
      <linearGradient id="purpleGradInner" x1="5" y1="5" x2="19" y2="19" gradientUnits="userSpaceOnUse">
        <stop stopColor="#C084FC" stopOpacity="0.85" />
        <stop offset="1" stopColor="#6D28D9" />
      </linearGradient>
    </defs>
  </svg>
);

function parseUsageNumber(value = '') {
  const normalized = String(value).trim().toUpperCase();
  const amount = parseFloat(normalized.replace(/[^0-9.]/g, ''));

  if (Number.isNaN(amount)) {
    return 0;
  }

  if (normalized.includes('TB')) {
    return amount * 1024;
  }

  if (normalized.includes('M')) {
    return amount * 1000000;
  }

  if (normalized.includes('K')) {
    return amount * 1000;
  }

  return amount;
}

function formatStorage(totalGb) {
  if (totalGb >= 1024) {
    return `${(totalGb / 1024).toFixed(1)} TB`;
  }

  return `${Math.round(totalGb)} GB`;
}

const fallbackPlanLimits = {
  free: { maxProjects: 1, maxStorage: 21474836480, maxQueries: 1000 },
  launch: { maxProjects: 5, maxStorage: 161061273600, maxQueries: 10000 },
  scale: { maxProjects: 20, maxStorage: 536870912000, maxQueries: 50000 },
  enterprise: { maxProjects: -1, maxStorage: -1, maxQueries: -1 },
};

function getUsageLimits(rawLimits, planKey) {
  const limits = rawLimits || fallbackPlanLimits[planKey] || fallbackPlanLimits.free;
  const maxProjects = limits.maxProjects ?? fallbackPlanLimits.free.maxProjects;
  const maxStorageBytes = limits.maxStorage ?? fallbackPlanLimits.free.maxStorage;

  return {
    projects: maxProjects === -1 ? Number.POSITIVE_INFINITY : maxProjects,
    projectsLabel: maxProjects === -1 ? 'Unlimited' : String(maxProjects),
    storageGb: maxStorageBytes === -1 ? Number.POSITIVE_INFINITY : Math.round(maxStorageBytes / (1024 ** 3)),
    storageLabel: maxStorageBytes === -1
      ? 'Unlimited'
      : formatStorage(maxStorageBytes / (1024 ** 3)),
  };
}

function getUsagePercent(used, limit) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.min(100, (used / limit) * 100);
}

export function OrganizationBillingView({ embedded = false }) {
  const {
    organizations,
    workspaces,
    currentOrganization,
    subscription,
    fetchSubscription,
    checkoutPlan,
    manageBilling,
  } = useAppStore();

  const totalProjects = workspaces.length;
  const totalOrganizations = organizations.length;
  const totalStorageGb = workspaces.reduce(
    (sum, workspace) => sum + parseUsageNumber(workspace.dataConsumption),
    0
  );

  // Tabs state: Plans or Invoices/Usage
  const [activeTab, setActiveTab] = useState('plans'); // 'plans', 'billings'
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchSubscription(currentOrganization.id).catch(() => {});
    }
  }, [currentOrganization?.id, fetchSubscription]);

  const activePlanKey = subscription?.plan || currentOrganization?.plan || 'free';
  const currentPlanLimits = getUsageLimits(
    subscription?.limits || currentOrganization?.limits,
    activePlanKey
  );
  const projectUsagePercent = getUsagePercent(totalProjects, currentPlanLimits.projects);
  const storageUsagePercent = getUsagePercent(totalStorageGb, currentPlanLimits.storageGb);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const pricingPlans = [
    {
      key: 'free',
      name: 'Free',
      price: 0,
      description: 'Ideal for testing the product features.',
      icon: <FreeIcon />,
      features: [
        { text: '1 project workspace', dotted: false },
        { text: '20 GB pooled storage', dotted: false },
        { text: '1h refresh cadence', dotted: true },
        { text: '1 workspace', dotted: false }
      ]
    },
    {
      key: 'launch',
      name: 'Launch',
      price: 50,
      description: 'Perfect for growing startups.',
      icon: <LaunchIcon />,
      features: [
        { text: 'Up to 5 projects', dotted: false },
        { text: '150 GB pooled storage', dotted: false },
        { text: '10 min refresh cadence', dotted: true },
        { text: 'Shared project links', dotted: true }
      ]
    },
    {
      key: 'scale',
      name: 'Scale',
      price: 150,
      description: 'For scaling businesses.',
      icon: <ScaleIcon />,
      featured: true, // highlighted border
      features: [
        { text: 'Up to 20 projects', dotted: false },
        { text: '500 GB pooled storage', dotted: false },
        { text: '10 min refresh cadence', dotted: true },
        { text: 'Shared project links', dotted: true }
      ]
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      description: 'Custom security and scaling terms.',
      icon: <EnterpriseIcon />,
      badge: 'Advance users',
      features: [
        { text: 'Custom project cap', dotted: false },
        { text: 'Dedicated storage pools', dotted: false },
        { text: 'Live refresh cadence', dotted: true },
        { text: 'Dedicated SLA & support', dotted: true }
      ]
    }
  ];

  // Mock Invoice List
  const invoices = [
    { id: 'INV-2026-006', date: 'June 12, 2026', amount: '$0.00', status: 'Paid' },
    { id: 'INV-2026-005', date: 'May 12, 2026', amount: '$0.00', status: 'Paid' },
    { id: 'INV-2026-004', date: 'April 12, 2026', amount: '$0.00', status: 'Paid' },
    { id: 'INV-2026-003', date: 'March 12, 2026', amount: '$0.00', status: 'Paid' },
    { id: 'INV-2026-002', date: 'February 12, 2026', amount: '$0.00', status: 'Paid' }
  ];

  const handleCheckoutStripe = async (planKey) => {
    if (!currentOrganization?.id) {
      triggerNotification('No workspace selected.', 'error');
      return;
    }
    try {
      triggerNotification(`Redirecting to Stripe secure checkout...`, 'success');
      await checkoutPlan(currentOrganization.id, planKey);
    } catch (err) {
      triggerNotification('Checkout failed: ' + err.message, 'error');
    }
  };

  const handleManageStripe = async () => {
    if (!currentOrganization?.id) {
      triggerNotification('No workspace selected.', 'error');
      return;
    }
    try {
      triggerNotification('Redirecting to Stripe billing portal...', 'success');
      await manageBilling(currentOrganization.id);
    } catch (err) {
      triggerNotification('Portal failed: ' + err.message, 'error');
    }
  };

  const handleCancelSubscriptionStripe = async () => {
    if (!currentOrganization?.id) {
      triggerNotification('No workspace selected.', 'error');
      return;
    }
    try {
      triggerNotification('Redirecting to Stripe customer portal...', 'success');
      await manageBilling(currentOrganization.id);
    } catch (err) {
      triggerNotification('Portal failed: ' + err.message, 'error');
    }
  };

  const downloadInvoice = (invoiceId) => {
    triggerNotification(`Downloading invoice ${invoiceId}.pdf...`, 'success');
  };

  return (
    <Wrapper embedded={embedded}>
      {/* Toast notifications */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          zIndex: 1001,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12.5px',
          fontWeight: '600'
        }}>
          <Check size={16} />
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', marginLeft: '4px' }}>
            <X size={12} />
          </button>
        </div>
      )}

      <div className="billing-view-container">
        {/* Navigation Tabs (Only 2 submenus) */}
        <div className="billing-nav">
          <button
            onClick={() => setActiveTab('plans')}
            className={`billing-nav-btn ${activeTab === 'plans' ? 'is-active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Sparkles size={13} />
            Plans
          </button>
          <button
            onClick={() => setActiveTab('billings')}
            className={`billing-nav-btn ${activeTab === 'billings' ? 'is-active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Receipt size={13} />
            Invoices & Usage
          </button>
        </div>

        {/* PLANS TAB */}
        {activeTab === 'plans' && (
          <>
            <div className="pricing-grid-4">
              {pricingPlans.map((plan) => {
                const isSelected = plan.key === activePlanKey;
                
                const cardContent = (
                  <div className="pricing-card-static">
                    <div>
                      {plan.badge && <span className="pricing-card-badge-small">{plan.badge}</span>}
                      <div className="pricing-card-icon-small">{plan.icon}</div>
                      <h3 className="pricing-card-title-small">{plan.name}</h3>
                      <p className="pricing-card-desc-small">{plan.description}</p>
                      
                      <div className="pricing-card-price-row-small">
                        {typeof plan.price === 'number' ? (
                          <>
                            <span className="pricing-card-dollar-small">$</span>
                            <span className="pricing-card-amount-small">{plan.price}</span>
                          </>
                        ) : (
                          <span className="pricing-card-amount-small" style={{ fontSize: '28px' }}>{plan.price}</span>
                        )}
                        <span className="pricing-card-period-small">per user per month</span>
                      </div>

                      {isSelected ? (
                        <button
                          type="button"
                          className="pricing-card-btn-small is-current"
                          disabled
                        >
                          Current plan
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pricing-card-btn-small is-upgrade"
                          onClick={() => handleCheckoutStripe(plan.key)}
                        >
                          {plan.key === 'enterprise' ? 'Contact sales' : 'Upgrade plan'}
                        </button>
                      )}
                    </div>

                    <ul className="pricing-card-features-small">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="pricing-card-feature-item-small">
                          <Check size={14} className="pricing-card-feature-icon-small" />
                          <span className="pricing-card-feature-text-small">
                            {feature.dotted ? (
                              <span className="dotted-under" title="Cadence rate for database update synchronization">
                                {feature.text}
                              </span>
                            ) : feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );

                if (plan.featured) {
                  return (
                    <div key={plan.key} className="pricing-card-gradient-wrapper-static">
                      {cardContent}
                    </div>
                  );
                }

                return (
                  <div key={plan.key}>
                    {cardContent}
                  </div>
                );
              })}
            </div>

            {/* Compare features table (re-added and borderless) */}
            <div className="compare-section">
              <h3 className="compare-title">Compare features by plan</h3>
              <p className="compare-desc">Easily compare features across all available plans.</p>
              
              <div className="compare-table-wrapper">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Feature</th>
                      <th style={{ width: '18%' }}>Free</th>
                      <th style={{ width: '18%' }}>Launch</th>
                      <th style={{ width: '18%' }}>Scale</th>
                      <th style={{ width: '18%' }}>Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="compare-feature-label">Update</td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>1h</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>10 min</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>10 min</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Live</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">AI Sentiment</td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">Service Accounts</td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>2 service accounts</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>5 service accounts</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Unlimited</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">Mentions Volume</td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Up to 100</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Up to 500</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Unlimited</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">Engagement tracking</td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Likes, Comments</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Likes, Comments</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Likes, Comments</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">Influencer Analysis</td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">Presence Score</td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>1 account</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>5 accounts</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Unlimited</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="compare-feature-label">Integrations (Slack)</td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <Minus size={14} className="compare-minus-icon" />
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                      <td>
                        <div className="compare-cell-content">
                          <Check size={14} className="compare-check-icon" />
                          <span>Yes</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* INVOICES & USAGE TAB */}
        {activeTab === 'billings' && (
          <div className="invoices-usage-layout-vertical">
            {/* Top Row: Side-by-side Resource Usage */}
            <div className="usage-card-borderless">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 className="invoice-section-title-clean" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  <PieChart size={18} style={{ color: '#3b82f6' }} />
                  Resource Usage
                </h3>
                <button
                  type="button"
                  className="cancel-top-btn"
                  onClick={handleCancelSubscriptionStripe}
                >
                  <AlertTriangle size={12} />
                  Cancel Subscription
                </button>
              </div>
              
              <div className="usage-top-row">
                {/* Projects usage tracker */}
                <div className="usage-stat-inner">
                  <div className="usage-stat-header">
                    <span className="usage-stat-title">Project workspaces</span>
                  </div>
                  <div className="usage-stat-body">
                    <div className="usage-stat-val-large">
                      {totalProjects} <span style={{ fontSize: '13px', color: '#8e918f', fontWeight: '400' }}>/ {currentPlanLimits.projectsLabel}</span>
                    </div>
                    <div className="usage-bar-bg">
                      <div
                        className="usage-bar-fill"
                        style={{
                          width: `${projectUsagePercent}%`
                        }}
                      />
                    </div>
                    <div className="usage-stat-meta">
                      <span>Active Projects</span>
                      <span>{projectUsagePercent.toFixed(0)}%</span>
                    </div>
                    <div className="usage-stat-meta">
                      <span>Organizations on account</span>
                      <span>{totalOrganizations}</span>
                    </div>
                  </div>
                </div>

                {/* Storage usage tracker */}
                <div className="usage-stat-inner">
                  <div className="usage-stat-header">
                    <span className="usage-stat-title">Warehouse Storage</span>
                  </div>
                  <div className="usage-stat-body">
                    <div className="usage-stat-val-large">
                      {formatStorage(totalStorageGb)} <span style={{ fontSize: '13px', color: '#8e918f', fontWeight: '400' }}>/ {currentPlanLimits.storageLabel}</span>
                    </div>
                    <div className="usage-bar-bg">
                      <div
                        className="usage-bar-fill purple"
                        style={{
                          width: `${storageUsagePercent}%`
                        }}
                      />
                    </div>
                    <div className="usage-stat-meta">
                      <span>Aggregated Ingestion</span>
                      <span>{storageUsagePercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Billing History Invoices List */}
            <div className="invoice-bottom-area">
              <div className="invoice-section-borderless">
                <h3 className="invoice-section-title-clean">Billing History</h3>
                <p className="invoice-section-desc-clean">View invoices, receipts and details about your past payments.</p>
                
                <div className="invoice-table-wrapper-borderless">
                  <table className="invoice-table-clean">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: '600' }}>{inv.id}</td>
                          <td>{inv.date}</td>
                          <td>{inv.amount}</td>
                          <td>
                            <span className="invoice-status-dot">
                              <span className="invoice-status-dot-indicator" />
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="invoice-download-link" onClick={() => downloadInvoice(inv.id)}>
                              <Download size={13} />
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stripe quick action portal bar at the bottom */}
              <div className="stripe-portal-bar">
                <div className="stripe-portal-text">
                  <strong>Looking to modify payment details?</strong><br />
                  Manage payment cards or download official tax receipts securely through Stripe Customer Portal.
                </div>
                <button
                  type="button"
                  className="stripe-portal-btn"
                  onClick={handleManageStripe}
                >
                  Manage on Stripe
                  <ExternalLink size={13} style={{ marginLeft: '4px' }} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Wrapper>
  );
}
