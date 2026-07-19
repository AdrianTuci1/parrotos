import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import { ArrowRight } from "lucide-react";
import { WorkspaceSettingsHeader } from "@/components/shell/workspace-settings/WorkspaceSettingsHeader";
import { WorkspaceTabs } from "@/components/shell/workspace-settings/WorkspaceTabs";
import { UsageOverviewTab } from "@/components/shell/workspace-settings/billing-tabs/UsageOverviewTab";
import { UsageDetailsTab } from "@/components/shell/workspace-settings/billing-tabs/UsageDetailsTab";
import { CreditsTab } from "@/components/shell/workspace-settings/billing-tabs/CreditsTab";
import { PlansTab } from "@/components/shell/workspace-settings/billing-tabs/PlansTab";

const billingTabs = [
  { id: "overview", label: "Overview" },
  { id: "usage", label: "Usage" },
  { id: "credits", label: "Credits" },
  { id: "plans", label: "Plans" },
];

const defaultPlans = [
  { key: "starter", name: "Starter", price: 0 },
  { key: "team", name: "Team", price: 250 },
  { key: "enterprise", name: "Enterprise", price: "Custom" },
];

function useBillingData(currentOrganization) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { fetchUsageBilling } = useAppStore();

  useEffect(() => {
    if (currentOrganization?.id) {
      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const d = await fetchUsageBilling(currentOrganization.id);
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      };
      load();
      return () => { cancelled = true; };
    }
  }, [currentOrganization?.id, fetchUsageBilling]);

  return { data, loading };
}

export function WorkspaceUsageBillingView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [budget, setBudget] = useState("");
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [error, setError] = useState("");

  const {
    currentOrganization,
    checkoutPlan,
    manageBilling,
    setWorkspaceBudget,
  } = useAppStore();

  const { data, loading } = useBillingData(currentOrganization);

  const currentPlan = useMemo(() => {
    const planKey = data?.subscription?.plan || currentOrganization?.plan || "starter";
    return data?.plans?.find((p) => p.key === planKey || p.name?.toLowerCase() === planKey) || defaultPlans.find((p) => p.key === planKey) || defaultPlans[0];
  }, [data, currentOrganization?.plan]);

  const usage = data?.usage || { totalSpend: 0, usageBreakdown: 0, items: [] };
  const credits = data?.credits || { balance: 0, applied: 0, transactions: [] };
  const invoices = data?.invoices || [];
  const plans = data?.plans?.length ? data.plans : defaultPlans;

  const includedCredits = useMemo(() => {
    if (currentPlan.key === "team" || currentPlan.name === "Team") return 100;
    if (currentPlan.key === "enterprise" || currentPlan.name === "Enterprise") return 0;
    return 30;
  }, [currentPlan]);

  const usageLimit = 100;
  const planKey = currentPlan.key || currentPlan.name?.toLowerCase() || "starter";

  const handleUpgrade = async (key) => {
    if (!currentOrganization?.id) return;
    try {
      await checkoutPlan(currentOrganization.id, key);
    } catch (err) {
      setError(err.message || "Checkout failed.");
    }
  };

  const handleManagePayment = async () => {
    if (!currentOrganization?.id) return;
    try {
      await manageBilling(currentOrganization.id);
    } catch (err) {
      setError(err.message || "Failed to open billing portal.");
    }
  };

  const handleSetBudget = async () => {
    if (!currentOrganization?.id) return;
    const value = parseFloat(budget);
    if (Number.isNaN(value)) return;
    try {
      await setWorkspaceBudget(currentOrganization.id, value);
      setBudgetSaved(true);
      setTimeout(() => setBudgetSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Failed to set budget.");
    }
  };

  const headerActions = (
    <>
      <button
        type="button"
        className="workspace-page-header-btn"
        onClick={() => setActiveTab("usage")}
      >
        View invoices
        <ArrowRight size={14} />
      </button>
      <button
        type="button"
        className="workspace-page-header-btn"
        onClick={handleManagePayment}
      >
        Manage payment details
        <ArrowRight size={14} />
      </button>
    </>
  );

  return (
    <div className="workspace-page">
      <WorkspaceSettingsHeader
        title="Usage & Billing"
        currentOrganization={currentOrganization}
        docsHref="https://docs.sentrydata.com/billing"
        actions={headerActions}
      />

      <WorkspaceTabs
        tabs={billingTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {error && <div className="workspace-error-banner">{error}</div>}
      {loading && <div className="workspace-placeholder">Loading billing data...</div>}

      {!loading && activeTab === "overview" && (
        <UsageOverviewTab
          usage={usage}
          credits={credits}
          currentPlan={currentPlan}
          includedCredits={includedCredits}
          usageLimit={usageLimit}
          budget={budget}
          setBudget={setBudget}
          onSetBudget={handleSetBudget}
          budgetSaved={budgetSaved}
          onViewDetails={() => setActiveTab("usage")}
          onManagePlan={() => setActiveTab("plans")}
          onViewCredits={() => setActiveTab("credits")}
        />
      )}

      {!loading && activeTab === "usage" && (
        <UsageDetailsTab usage={usage} invoices={invoices} />
      )}

      {!loading && activeTab === "credits" && (
        <CreditsTab credits={credits} />
      )}

      {!loading && activeTab === "plans" && (
        <PlansTab
          plans={plans}
          currentPlanKey={planKey}
          onUpgrade={handleUpgrade}
          onContact={() => window.open("https://sentrydata.com/contact", "_blank")}
        />
      )}
    </div>
  );
}
