import { formatCurrency } from "../utils";

export function CreditsTab({ credits }) {
  return (
    <div className="workspace-tab-content">
      <div className="workspace-billing-grid">
        <div className="workspace-card">
          <div className="workspace-card-header">
            <h3 className="workspace-card-title">Credits balance</h3>
          </div>
          <div className="workspace-card-body">
            <div className="workspace-credit-balance">{formatCurrency(credits.balance)}</div>
            <p className="workspace-plan-hint">Available credits to spend on compute and storage.</p>
          </div>
        </div>
        <div className="workspace-card">
          <div className="workspace-card-header">
            <h3 className="workspace-card-title">Credits applied</h3>
          </div>
          <div className="workspace-card-body">
            <div className="workspace-credit-balance">{formatCurrency(credits.applied)}</div>
            <p className="workspace-plan-hint">Credits applied to the current billing period.</p>
          </div>
        </div>
      </div>

      <div className="workspace-card">
        <div className="workspace-card-header">
          <h3 className="workspace-card-title">Credit transactions</h3>
        </div>
        <div className="workspace-card-body">
          <table className="workspace-invoices-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(!credits.transactions || credits.transactions.length === 0) && (
                <tr>
                  <td colSpan={3} className="workspace-placeholder-row">No credit transactions yet.</td>
                </tr>
              )}
              {credits.transactions?.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.description}</td>
                  <td>{formatCurrency(tx.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
