import { Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { formatCurrency, getBillingCycleLabel } from "../utils";

export function UsageOverviewTab({
  usage,
  credits,
  currentPlan,
  includedCredits,
  usageLimit,
  budget,
  setBudget,
  onSetBudget,
  budgetSaved,
  onViewDetails,
  onManagePlan,
  onViewCredits,
}) {
  const totalSpend = usage.totalSpend ?? 0;
  const usageBreakdown = usage.usageBreakdown ?? 0;
  const usagePct = usageLimit > 0 ? Math.min(100, (usageBreakdown / usageLimit) * 100) : 0;
  const items = usage.items?.length
    ? usage.items
    : [
        { name: "Connectors", value: usageBreakdown * 0.6, color: "#86efac" },
        { name: "Queries", value: usageBreakdown * 0.4, color: "#f87171" },
      ];

  return (
    <div className="workspace-tab-content">
      <div className="workspace-card workspace-cost-summary">
        <div className="workspace-cost-summary-header">
          <h3 className="workspace-card-title">Cost Summary</h3>
          <div className="workspace-cycle-selector">
            <button type="button" className="workspace-cycle-arrow"><ArrowLeft size={14} /></button>
            <Calendar size={14} />
            <span>Billing Cycle: {getBillingCycleLabel()}</span>
            <button type="button" className="workspace-cycle-arrow"><ArrowRight size={14} /></button>
          </div>
        </div>
        <div className="workspace-cost-summary-body">
          <div className="workspace-cost-left">
            <div className="workspace-cost-row">
              <span className="workspace-cost-label">Total Spend:</span>
              <span className="workspace-cost-value">{formatCurrency(totalSpend)}</span>
            </div>
            <div className="workspace-cost-detail-row">
              <span>Total Usage</span>
              <span>{formatCurrency(usageBreakdown)}</span>
            </div>
            <div className="workspace-cost-detail-row">
              <span>Credits Applied</span>
              <span>{formatCurrency(credits.applied)}</span>
            </div>
          </div>
          <div className="workspace-cost-right">
            <div className="workspace-cost-right-header">
              <span className="workspace-cost-label">Usage Breakdown:</span>
              <span className="workspace-cost-value">{formatCurrency(usageBreakdown)}</span>
              <button type="button" className="workspace-link-btn" onClick={onViewDetails}>
                View details
              </button>
            </div>
            <div className="workspace-cost-bar-bg">
              <div className="workspace-cost-bar-fill" style={{ width: `${usagePct}%` }} />
            </div>
            <div className="workspace-cost-legend">
              {items.map((item) => (
                <div key={item.name} className="workspace-cost-legend-item">
                  <span className="workspace-cost-dot" style={{ backgroundColor: item.color }} />
                  <span className="workspace-cost-legend-name">{item.name}</span>
                  <span className="workspace-cost-legend-value">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="workspace-billing-grid">
        <div className="workspace-card">
          <div className="workspace-card-header">
            <h3 className="workspace-card-title">Current Plan</h3>
          </div>
          <div className="workspace-card-body">
            <p className="workspace-plan-text">
              You are currently on the <strong>{currentPlan.name}</strong> plan with {formatCurrency(includedCredits)} included compute credits per month.
            </p>
            <p className="workspace-plan-hint">If you recently changed your plan, please refresh.</p>
            <div className="workspace-plan-actions">
              <button type="button" className="workspace-page-header-btn" onClick={onManagePlan}>
                Manage plan
                <ArrowRight size={14} />
              </button>
              <button type="button" className="workspace-page-header-btn" onClick={onViewCredits}>
                View credits
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">
            <h3 className="workspace-card-title">Usage Limit</h3>
          </div>
          <div className="workspace-card-body">
            <p className="workspace-plan-text">
              This workspace can use up to <strong>{formatCurrency(usageLimit)}</strong> per billing period. Running apps will stop when usage reaches this limit.
            </p>
            <ul className="workspace-limit-list">
              <li>When usage reaches {formatCurrency(usageLimit / 2)}, you&apos;ll be charged {formatCurrency(20)}. After payment, your usage limit will increase automatically.</li>
              <li>To cap usage below this limit, set a budget.</li>
            </ul>
            <div className="workspace-budget-section">
              <h4 className="workspace-budget-title">Your workspace budget</h4>
              <p className="workspace-budget-hint">You can set a budget up to {formatCurrency(usageLimit)}.</p>
              <div className="workspace-budget-row">
                <input
                  className="settings-input"
                  type="number"
                  min={0}
                  placeholder={String(usageLimit)}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
                <button className="settings-btn-primary" onClick={onSetBudget}>
                  {budgetSaved ? "Saved" : "Set a budget"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
