import { cn } from "@/lib/utils";
import { formatCurrency } from "../utils";

export function UsageDetailsTab({ usage, invoices }) {
  const usageBreakdown = usage.usageBreakdown ?? 0;
  const rows = usage.items?.length
    ? usage.items
    : [
        { name: "Connectors", value: usageBreakdown * 0.6, color: "#86efac" },
        { name: "Queries", value: usageBreakdown * 0.4, color: "#f87171" },
      ];

  return (
    <div className="workspace-tab-content">
      <div className="workspace-card">
        <div className="workspace-card-header">
          <h3 className="workspace-card-title">Usage by resource</h3>
          <p className="workspace-card-subtitle">Breakdown for the current billing period.</p>
        </div>
        <div className="workspace-card-body">
          <table className="workspace-usage-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Usage</th>
                <th>Cost</th>
                <th>% of total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.name}>
                  <td>
                    <div className="workspace-usage-resource">
                      <span className="workspace-cost-dot" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </div>
                  </td>
                  <td>{formatCurrency(item.value)}</td>
                  <td>{formatCurrency(item.value)}</td>
                  <td>{usageBreakdown > 0 ? `${((item.value / usageBreakdown) * 100).toFixed(0)}%` : "0%"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="workspace-card">
        <div className="workspace-card-header">
          <h3 className="workspace-card-title">Invoices</h3>
        </div>
        <div className="workspace-card-body">
          <table className="workspace-invoices-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="workspace-placeholder-row">No invoices yet.</td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.date}</td>
                  <td>{inv.amount}</td>
                  <td>
                    <span className={cn("workspace-invoice-status", inv.status?.toLowerCase())}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
