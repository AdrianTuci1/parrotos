import { WorkspacePlanComparisonTable } from "../WorkspacePlanComparisonTable";

export function PlansTab({ plans, currentPlanKey, onUpgrade, onContact }) {
  return (
    <div className="workspace-tab-content">
      <WorkspacePlanComparisonTable
        plans={plans}
        currentPlanKey={currentPlanKey}
        onUpgrade={onUpgrade}
        onContact={onContact}
      />
    </div>
  );
}
