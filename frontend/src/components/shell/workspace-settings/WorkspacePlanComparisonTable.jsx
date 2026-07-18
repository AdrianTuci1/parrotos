import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const planSections = [
  {
    title: "Workspace",
    rows: [
      { feature: "Number of seats", starter: "Up to 3", team: "Unlimited", enterprise: "Unlimited" },
      { feature: "Project workspaces", starter: "1", team: "20", enterprise: "Unlimited" },
    ],
  },
  {
    title: "Credits and variable costs",
    rows: [
      { feature: "Included compute", starter: "$30 / month", team: "$100 / month", enterprise: "Custom" },
      { feature: "Additional compute", starter: "$0.10 / credit", team: "$0.08 / credit", enterprise: "Custom" },
      { feature: "Storage overage", starter: "$0.50 / GB", team: "$0.30 / GB", enterprise: "Custom" },
    ],
  },
  {
    title: "Features",
    rows: [
      { feature: "Connectors", starter: "10", team: "50", enterprise: "Custom" },
      { feature: "Queries / month", starter: "1,000", team: "50,000", enterprise: "Custom" },
      { feature: "Data ingestion", starter: "5/s + 150 burst", team: "25/s + 1K burst", enterprise: "Custom" },
      { feature: "Service accounts", starter: "1", team: "5", enterprise: "Unlimited" },
      { feature: "Support", starter: "Community", team: "Priority", enterprise: "Dedicated" },
    ],
  },
];

function PlanPriceCell({ plan }) {
  if (typeof plan.price === "number") {
    return (
      <>
        <span className="workspace-plan-amount">${plan.price}</span>
        <span className="workspace-plan-period">+ compute / month</span>
      </>
    );
  }
  return <span className="workspace-plan-amount">Custom compute</span>;
}

function PlanActionCell({ plan, isCurrent, onUpgrade, onContact }) {
  if (isCurrent) {
    return (
      <button type="button" className="workspace-plan-btn-current" disabled>
        Current Plan
      </button>
    );
  }
  if (plan.key === "enterprise") {
    return (
      <button type="button" className="workspace-plan-btn outline" onClick={onContact}>
        Get in touch
        <ArrowRight size={14} />
      </button>
    );
  }
  return (
    <button type="button" className="workspace-plan-btn" onClick={() => onUpgrade(plan.key)}>
      Upgrade Now
      <ArrowRight size={14} />
    </button>
  );
}

export function WorkspacePlanComparisonTable({ plans, currentPlanKey, onUpgrade, onContact }) {
  const getCurrent = (plan) => plan.key === currentPlanKey || plan.name?.toLowerCase() === currentPlanKey;

  return (
    <div className="workspace-plan-comparison">
      <table className="workspace-plans-table">
        <thead>
          <tr>
            <th className="workspace-plan-feature-header" />
            {plans.map((plan) => (
              <th key={plan.key} className={cn("workspace-plan-name-header", getCurrent(plan) && "current")}>
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="workspace-plan-row-label">Price</td>
            {plans.map((plan) => (
              <td key={plan.key} className="workspace-plan-price-cell">
                <PlanPriceCell plan={plan} />
              </td>
            ))}
          </tr>
          <tr>
            <td className="workspace-plan-row-label" />
            {plans.map((plan) => (
              <td key={plan.key} className="workspace-plan-action-cell">
                <PlanActionCell
                  plan={plan}
                  isCurrent={getCurrent(plan)}
                  onUpgrade={onUpgrade}
                  onContact={onContact}
                />
              </td>
            ))}
          </tr>
          {planSections.map((section) => (
            <>
              <tr key={section.title} className="workspace-plan-section-row">
                <td colSpan={plans.length + 1} className="workspace-plan-section-title">
                  {section.title}
                </td>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.feature}>
                  <td className="workspace-plan-feature-label">{row.feature}</td>
                  <td className="workspace-plan-value">{row.starter}</td>
                  <td className="workspace-plan-value">{row.team}</td>
                  <td className="workspace-plan-value">{row.enterprise}</td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
