/**
 * Mock Alerts adapter.
 *
 * Parrot's Alerts feature is a project-level resource: an alert watches a measure
 * on a metrics view, evaluates a set of criteria thresholds, and delivers a
 * notification (email / Slack) on a schedule or on data refresh. Without a live
 * Parrot runtime the Alerts view renders from this in-memory adapter so the
 * listing + create/edit form are demonstrable end-to-end.
 *
 * The alert measures / dimensions mirror the mock metrics-view schema the
 * dashboard and explore views use (see `./mockAdapter`'s ORDERS_METRICS_VIEW), so
 * the form's data tab offers the same measures (total_revenue / order_count / aov)
 * and dimensions (channel / country / customer). They're declared inline (rather
 * than imported) so this mock-only module never pulls the runtime-client graph,
 * keeping it trivially loadable in unit tests.
 */

/** Alert evaluation status, mirroring Parrot's alert state. */
export const ALERT_STATUS = {
  OK: "ok",
  FIRING: "firing",
  PENDING: "pending",
};

/**
 * Criteria operations (proto operation names, matching Parrot's
 * `criteria-tab/operations.ts`). The label is used for the operator menu.
 */
export const ALERT_OPERATION_OPTIONS = [
  { value: "OPERATION_GTE", label: ">=" },
  { value: "OPERATION_GT", label: ">" },
  { value: "OPERATION_LTE", label: "<=" },
  { value: "OPERATION_LT", label: "<" },
  { value: "OPERATION_EQ", label: "=" },
  { value: "OPERATION_NEQ", label: "!=" },
];

/**
 * Criteria types (compare a raw value, an absolute or percent change, or a
 * percent-of-total), mirroring Parrot's `measure-filter-options.ts`.
 */
export const ALERT_TYPE_OPTIONS = [
  { value: "Value", label: "Value" },
  { value: "AbsoluteChange", label: "Absolute change" },
  { value: "PercentChange", label: "Percent change" },
  { value: "PercentOfTotal", label: "Percent of total" },
];

/** How criteria rows are combined: every condition must hold (AND) or any (OR). */
export const ALERT_CRITERIA_OPERATION_OPTIONS = [
  { value: "OPERATION_AND", label: "and" },
  { value: "OPERATION_OR", label: "or" },
];

/**
 * Measures available to an alert. Mirrors the mock `orders_metrics` view's
 * measures (see `./mockAdapter`); the derived time-comparison measure is excluded
 * as in Parrot.
 */
export const MOCK_ALERT_MEASURES = [
  { name: "total_revenue", displayName: "Total Revenue", expression: "sum(revenue)" },
  { name: "order_count", displayName: "", expression: "count(*)" },
  { name: "aov", displayName: "Avg Order Value", expression: "sum(revenue) / count(*)" },
];

/** Dimensions available to split an alert by (time excluded, as in Parrot). */
export const MOCK_ALERT_DIMENSIONS = [
  { name: "channel", displayName: "Channel" },
  { name: "country", displayName: "Country" },
  { name: "customer", displayName: "Customer" },
];

/** A blank criteria row used when starting a new alert. */
export function emptyCriteria(measure = "") {
  return { measure, operation: "OPERATION_GTE", type: "Value", value1: "" };
}

const DEFAULT_ALERTS = [
  {
    id: "alert-high-value-orders",
    name: "High-value orders",
    measure: "total_revenue",
    splitByDimension: "channel",
    criteriaOperation: "OPERATION_AND",
    criteria: [
      { measure: "total_revenue", operation: "OPERATION_GTE", type: "Value", value1: "15000" },
    ],
    status: ALERT_STATUS.OK,
    lastRun: "2026-09-06T09:14:00Z",
    enableEmail: true,
    emailRecipients: ["revops@example.com"],
    enableSlack: false,
    slackChannels: [],
  },
  {
    id: "alert-revenue-drop",
    name: "Daily revenue drop",
    measure: "total_revenue",
    splitByDimension: "",
    criteriaOperation: "OPERATION_AND",
    criteria: [
      { measure: "total_revenue", operation: "OPERATION_LT", type: "PercentChange", value1: "-20" },
    ],
    status: ALERT_STATUS.FIRING,
    lastRun: "2026-09-07T06:30:00Z",
    enableEmail: true,
    emailRecipients: ["analytics@example.com", "ops@example.com"],
    enableSlack: true,
    slackChannels: ["#bi-alerts"],
  },
  {
    id: "alert-order-count",
    name: "Order count anomaly",
    measure: "order_count",
    splitByDimension: "country",
    criteriaOperation: "OPERATION_OR",
    criteria: [
      { measure: "order_count", operation: "OPERATION_LT", type: "Value", value1: "100" },
      { measure: "order_count", operation: "OPERATION_GT", type: "AbsoluteChange", value1: "50" },
    ],
    status: ALERT_STATUS.OK,
    lastRun: "2026-09-06T23:00:00Z",
    enableEmail: false,
    emailRecipients: [],
    enableSlack: true,
    slackChannels: ["#orders"],
  },
  {
    id: "alert-aov",
    name: "Avg order value watch",
    measure: "aov",
    splitByDimension: "",
    criteriaOperation: "OPERATION_AND",
    criteria: [{ measure: "aov", operation: "OPERATION_LTE", type: "Value", value1: "55" }],
    status: ALERT_STATUS.PENDING,
    lastRun: "",
    enableEmail: true,
    emailRecipients: ["finance@example.com"],
    enableSlack: false,
    slackChannels: [],
  },
];

// Module-level in-memory store so create/edit/delete persist for the session.
let alerts = DEFAULT_ALERTS.map((a) => ({ ...a }));
let idCounter = DEFAULT_ALERTS.length + 1;

/** Return a shallow copy of all alerts (safe to mutate from the caller). */
export function listMockAlerts() {
  return alerts.map((a) => ({ ...a }));
}

/** Return a single alert by id (or undefined), as a copy. */
export function getMockAlert(id) {
  const found = alerts.find((a) => a.id === id);
  return found ? { ...found } : undefined;
}

/**
 * Create a new alert from a form payload and prepend it to the list. The created
 * alert starts `pending` (not yet evaluated) with no last-run timestamp.
 */
export function createMockAlert(data = {}) {
  const alert = {
    id: `alert-${Date.now().toString(36)}-${idCounter++}`,
    name: data.name || "Untitled alert",
    measure: data.measure || MOCK_ALERT_MEASURES[0]?.name || "",
    splitByDimension: data.splitByDimension || "",
    criteriaOperation: data.criteriaOperation || "OPERATION_AND",
    criteria:
      data.criteria && data.criteria.length
        ? data.criteria
        : [emptyCriteria(data.measure || "")],
    status: ALERT_STATUS.PENDING,
    lastRun: "",
    enableEmail: data.enableEmail ?? true,
    emailRecipients: (data.emailRecipients || []).filter(Boolean),
    enableSlack: data.enableSlack ?? false,
    slackChannels: (data.slackChannels || []).filter(Boolean),
  };
  alerts = [alert, ...alerts];
  return { ...alert };
}

/** Patch an existing alert with the editable form fields, preserving id/status/run. */
export function updateMockAlert(id, data = {}) {
  alerts = alerts.map((a) => {
    if (a.id !== id) return a;
    return {
      ...a,
      name: data.name ?? a.name,
      measure: data.measure ?? a.measure,
      splitByDimension: data.splitByDimension ?? a.splitByDimension,
      criteriaOperation: data.criteriaOperation ?? a.criteriaOperation,
      criteria: data.criteria ?? a.criteria,
      enableEmail: data.enableEmail ?? a.enableEmail,
      emailRecipients: (data.emailRecipients || []).filter(Boolean),
      enableSlack: data.enableSlack ?? a.enableSlack,
      slackChannels: (data.slackChannels || []).filter(Boolean),
    };
  });
  return getMockAlert(id);
}

/** Remove an alert by id. */
export function deleteMockAlert(id) {
  alerts = alerts.filter((a) => a.id !== id);
}

// ─── Presentation helpers ────────────────────────────────────────────────────

function measureLabel(name) {
  const m = MOCK_ALERT_MEASURES.find((x) => x.name === name);
  return m?.displayName || m?.name || m?.expression || name;
}

function operationLabel(op) {
  return ALERT_OPERATION_OPTIONS.find((o) => o.value === op)?.label || op;
}

function typeSuffix(type) {
  return type === "PercentChange" ? "%" : "";
}

/**
 * Human-readable threshold summary for the listing table, e.g.
 * "Total Revenue >= 15000" for a single criteria or
 * "Order Count < 100 OR Order Count +50" for a joined group.
 */
export function describeThreshold(alert) {
  const parts = (alert.criteria || []).map((c) => {
    const op = operationLabel(c.operation);
    const suffix = typeSuffix(c.type);
    const value = c.value1 ?? "";
    return `${measureLabel(c.measure)} ${op} ${value}${suffix}`;
  });
  if (!parts.length) return "—";
  if (parts.length === 1) return parts[0];
  const joiner = alert.criteriaOperation === "OPERATION_OR" ? " OR " : " AND ";
  return parts.join(joiner);
}

/** Format a last-run ISO timestamp for the listing table. */
export function formatLastRun(iso) {
  if (!iso) return "Not run yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not run yet";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
