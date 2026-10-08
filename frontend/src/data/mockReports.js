/**
 * Mock Scheduled Reports adapter.
 *
 * Parrot's Scheduled Reports feature is a project-level resource: a report runs a
 * query (or renders a canvas) on a schedule and delivers the result as an export
 * (CSV / XLSX / Parquet) or PDF to email / Slack recipients. Without a live Parrot
 * runtime the Reports view renders from this in-memory adapter so the listing +
 * create/edit form are demonstrable end-to-end.
 *
 * The available measures / dimensions mirror the mock metrics-view schema the
 * dashboard and explore views use (see `./mockAdapter`'s ORDERS_METRICS_VIEW), so
 * the form's field pickers offer the same measures (total_revenue / order_count /
 * aov) and dimensions (channel / country / customer / time). They're declared
 * inline (rather than imported) so this mock-only module never pulls the
 * runtime-client graph, keeping it trivially loadable in unit tests.
 */

/** Report type: an aggregation/query export, or a rendered PDF. */
export const REPORT_TYPE_OPTIONS = [
  { value: "query", label: "Query export", description: "Run a query and email the result as a file" },
  { value: "pdf", label: "PDF", description: "Render a snapshot as a PDF" },
];

/** File formats for a query report (mirrors Parrot's V1ExportFormat). */
export const REPORT_FORMAT_OPTIONS = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "XLSX" },
  { value: "parquet", label: "Parquet" },
];

/** Run frequency options, mirroring Parrot's ScheduleForm. */
export const REPORT_FREQUENCY_OPTIONS = [
  { value: "Daily", label: "Daily" },
  { value: "Weekdays", label: "Weekdays" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
];

export const REPORT_DAY_OPTIONS = [
  { value: "Monday", label: "Monday" },
  { value: "Tuesday", label: "Tuesday" },
  { value: "Wednesday", label: "Wednesday" },
  { value: "Thursday", label: "Thursday" },
  { value: "Friday", label: "Friday" },
  { value: "Saturday", label: "Saturday" },
  { value: "Sunday", label: "Sunday" },
];

/** Time zones offered in the schedule form (Local + UTC are prepended in the view). */
export const REPORT_TIME_ZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "ET (America/New_York)" },
  { value: "Europe/London", label: "GMT (Europe/London)" },
  { value: "Asia/Kolkata", label: "IST (Asia/Kolkata)" },
];

/** Measures available to a report (mirrors the mock `orders_metrics` view). */
export const MOCK_REPORT_MEASURES = [
  { name: "total_revenue", displayName: "Total Revenue" },
  { name: "order_count", displayName: "Order Count" },
  { name: "aov", displayName: "Avg Order Value" },
];

/** Dimensions available to a report (time included, as in Parrot). */
export const MOCK_REPORT_DIMENSIONS = [
  { name: "channel", displayName: "Channel" },
  { name: "country", displayName: "Country" },
  { name: "customer", displayName: "Customer" },
  { name: "time", displayName: "Time" },
];

/** Categorical dimensions we can build mock filters for (time excluded). */
export const MOCK_FILTERABLE_DIMENSIONS = [
  { name: "channel", displayName: "Channel" },
  { name: "country", displayName: "Country" },
  { name: "customer", displayName: "Customer" },
];

/** Sample values per dimension, parallel to Parrot's sample orders project. */
export const MOCK_DIMENSION_VALUES = {
  channel: ["Online", "Retail", "Partner"],
  country: ["US", "DE", "GB", "FR"],
  customer: ["Acme", "Globex", "Initech", "Umbrella"],
};

/** Report run status, mirroring Parrot's report state (created at run time). */
export const REPORT_STATUS = {
  OK: "ok",
  ERROR: "error",
  PENDING: "pending",
};

/** Fields a report can aggregate over, split into rows (dimensions) and
 *  columns (dimensions + measures), matching Parrot's RowsAndColumnsForm. */
export function getReportFieldOptions() {
  const measures = MOCK_REPORT_MEASURES.map((m) => ({
    value: m.name,
    label: m.displayName || m.name,
    type: "measure",
  }));
  const dimensions = MOCK_REPORT_DIMENSIONS.map((d) => ({
    value: d.name,
    label: d.displayName || d.name,
    type: "dimension",
  }));
  return { measures, dimensions };
}

function defaultColumns() {
  return MOCK_REPORT_MEASURES.map((m) => m.name).slice(0, 1);
}

/** A blank report form for a new report of the given type. */
export function blankForm(type = "query") {
  return {
    name: "",
    type,
    format: type === "pdf" ? "pdf" : "csv",
    frequency: "Weekly",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    timeOfDay: "08:00",
    timeZone: "UTC",
    rows: [],
    columns: type === "query" ? defaultColumns() : [],
    filters: [],
    enableEmail: true,
    emailRecipients: [""],
    enableSlack: false,
    slackChannels: [""],
    slackUsers: [""],
  };
}

/** Map an existing report back into the editable form shape. */
export function formFromReport(report) {
  return {
    name: report.name || "",
    type: report.type || "query",
    format: report.format || "csv",
    frequency: report.frequency || "Weekly",
    dayOfWeek: report.dayOfWeek || "Monday",
    dayOfMonth: report.dayOfMonth || 1,
    timeOfDay: report.timeOfDay || "08:00",
    timeZone: report.timeZone || "UTC",
    rows: report.rows?.length ? [...report.rows] : [],
    columns: report.columns?.length ? [...report.columns] : [],
    filters: (report.filters || []).map((f) => ({ ...f })),
    enableEmail: report.enableEmail ?? true,
    emailRecipients: report.emailRecipients?.length ? [...report.emailRecipients] : [""],
    enableSlack: report.enableSlack ?? false,
    slackChannels: report.slackChannels?.length ? [...report.slackChannels] : [""],
    slackUsers: report.slackUsers?.length ? [...report.slackUsers] : [""],
  };
}

const DEFAULT_REPORTS = [
  {
    id: "report-weekly-revenue",
    name: "Weekly revenue summary",
    type: "query",
    format: "csv",
    frequency: "Weekly",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    timeOfDay: "08:00",
    timeZone: "UTC",
    cron: "0 8 * * 1",
    rows: ["channel"],
    columns: ["total_revenue", "order_count", "aov"],
    filters: [],
    enableEmail: true,
    emailRecipients: ["revops@example.com"],
    enableSlack: false,
    slackChannels: [],
    slackUsers: [],
    lastRun: "2026-09-07T08:00:00Z",
    status: REPORT_STATUS.OK,
    owner: "you@example.com",
  },
  {
    id: "report-monthly-orders",
    name: "Monthly orders to finance",
    type: "query",
    format: "xlsx",
    frequency: "Monthly",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    timeOfDay: "09:30",
    timeZone: "Europe/London",
    cron: "30 9 1 * *",
    rows: ["country"],
    columns: ["order_count", "aov"],
    filters: [{ dimension: "country", values: ["US", "DE"], mode: "include" }],
    enableEmail: true,
    emailRecipients: ["finance@example.com", "audit@example.com"],
    enableSlack: true,
    slackChannels: ["#finance"],
    slackUsers: [],
    lastRun: "2026-09-01T09:30:00Z",
    status: REPORT_STATUS.OK,
    owner: "you@example.com",
  },
  {
    id: "report-daily-export",
    name: "Daily raw export",
    type: "query",
    format: "parquet",
    frequency: "Daily",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    timeOfDay: "23:00",
    timeZone: "UTC",
    cron: "0 23 * * *",
    rows: [],
    columns: ["total_revenue", "order_count"],
    filters: [],
    enableEmail: true,
    emailRecipients: ["data-eng@example.com"],
    enableSlack: true,
    slackChannels: ["#data"],
    slackUsers: ["glen@example.com"],
    lastRun: "2026-09-06T23:00:00Z",
    status: REPORT_STATUS.OK,
    owner: "you@example.com",
  },
  {
    id: "report-board-pdf",
    name: "Exec board PDF",
    type: "pdf",
    format: "pdf",
    frequency: "Weekdays",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    timeOfDay: "06:15",
    timeZone: "America/New_York",
    cron: "15 6 * * 1-5",
    rows: ["channel"],
    columns: ["total_revenue"],
    filters: [],
    enableEmail: true,
    emailRecipients: ["cep@example.com"],
    enableSlack: false,
    slackChannels: [],
    slackUsers: [],
    lastRun: "2026-09-07T06:15:00Z",
    status: REPORT_STATUS.ERROR,
    owner: "you@example.com",
  },
  {
    id: "report-never-run",
    name: "Next quarter forecast",
    type: "query",
    format: "csv",
    frequency: "Monthly",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    timeOfDay: "15:00",
    timeZone: "UTC",
    cron: "0 15 1 * *",
    rows: ["customer"],
    columns: ["total_revenue", "aov"],
    filters: [],
    enableEmail: true,
    emailRecipients: ["planning@example.com"],
    enableSlack: false,
    slackChannels: [],
    slackUsers: [],
    lastRun: "",
    status: REPORT_STATUS.PENDING,
    owner: "you@example.com",
  },
];

// Module-level in-memory store so create/edit/delete persist for the session.
let reports = DEFAULT_REPORTS.map((r) => ({ ...r }));
let idCounter = DEFAULT_REPORTS.length + 1;

/** Return a shallow copy of all reports (safe to mutate from the caller). */
export function listMockReports() {
  return reports.map((r) => ({ ...r }));
}

/** Return a single report by id (or undefined), as a copy. */
export function getMockReport(id) {
  const found = reports.find((r) => r.id === id);
  return found ? { ...found } : undefined;
}

/**
 * Create a new report from a form payload and prepend it to the list. The
 * created report starts `pending` (not yet run) with no last-run timestamp.
 */
export function createMockReport(data = {}) {
  const report = {
    id: `report-${Date.now().toString(36)}-${idCounter++}`,
    name: data.name || "Untitled report",
    type: data.type || "query",
    format: data.format || (data.type === "pdf" ? "pdf" : "csv"),
    frequency: data.frequency || "Weekly",
    dayOfWeek: data.dayOfWeek || "Monday",
    dayOfMonth: data.dayOfMonth || 1,
    timeOfDay: data.timeOfDay || "08:00",
    timeZone: data.timeZone || "UTC",
    cron: convertFormValuesToCron(
      data.frequency || "Weekly",
      data.dayOfWeek || "Monday",
      data.timeOfDay || "08:00",
      data.dayOfMonth || 1,
    ),
    rows: (data.rows || []).filter(Boolean),
    columns: (data.columns || []).filter(Boolean),
    filters: (data.filters || []).map((f) => ({ ...f })),
    enableEmail: data.enableEmail ?? true,
    emailRecipients: (data.emailRecipients || []).filter(Boolean),
    enableSlack: data.enableSlack ?? false,
    slackChannels: (data.slackChannels || []).filter(Boolean),
    slackUsers: (data.slackUsers || []).filter(Boolean),
    lastRun: "",
    status: REPORT_STATUS.PENDING,
    owner: data.owner || "you@example.com",
  };
  reports = [report, ...reports];
  return { ...report };
}

/** Patch an existing report with the editable form fields, preserving id/run/status. */
export function updateMockReport(id, data = {}) {
  reports = reports.map((r) => {
    if (r.id !== id) return r;
    const frequency = data.frequency ?? r.frequency;
    const dayOfWeek = data.dayOfWeek ?? r.dayOfWeek;
    const timeOfDay = data.timeOfDay ?? r.timeOfDay;
    const dayOfMonth = data.dayOfMonth ?? r.dayOfMonth;
    return {
      ...r,
      name: data.name ?? r.name,
      type: data.type ?? r.type,
      format: data.format ?? r.format,
      frequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay,
      timeZone: data.timeZone ?? r.timeZone,
      cron: convertFormValuesToCron(frequency, dayOfWeek, timeOfDay, dayOfMonth),
      rows: (data.rows || r.rows).filter(Boolean),
      columns: (data.columns || r.columns).filter(Boolean),
      filters: (data.filters || r.filters).map((f) => ({ ...f })),
      enableEmail: data.enableEmail ?? r.enableEmail,
      emailRecipients: (data.emailRecipients || r.emailRecipients).filter(Boolean),
      enableSlack: data.enableSlack ?? r.enableSlack,
      slackChannels: (data.slackChannels || r.slackChannels).filter(Boolean),
      slackUsers: (data.slackUsers || r.slackUsers).filter(Boolean),
      owner: data.owner ?? r.owner,
    };
  });
  return getMockReport(id);
}

/** Remove a report by id. */
export function deleteMockReport(id) {
  reports = reports.filter((r) => r.id !== id);
}

// ─── Schedule / presentation helpers ─────────────────────────────────────────

const weekDayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Build a cron expression from the schedule form values (mirrors Parrot's
 * `convertFormValuesToCronExpression`).
 */
export function convertFormValuesToCron(frequency, dayOfWeek, timeOfDay, dayOfMonth) {
  const [hour = 0, minute = 0] = timeOfDay.split(":").map(Number);
  let cron = `${minute || 0} ${hour || 0} `;

  switch (frequency) {
    case "Daily":
      cron += "* * *";
      break;
    case "Weekdays":
      cron += "* * 1-5";
      break;
    case "Weekly":
      cron += `* * ${weekDayMap[dayOfWeek] ?? 1}`;
      break;
    case "Monthly":
      cron += `${dayOfMonth || 1} * *`;
      break;
    default:
      cron += "* * *";
  }
  return cron;
}

function dayLabel(dayOfWeek) {
  return dayOfWeek ? dayOfWeek.slice(0, 3) : "";
}

/**
 * Human-readable schedule summary for the listing, e.g. "Weekly · Mon · 08:00".
 */
export function describeSchedule(report) {
  const time = report.timeOfDay || "08:00";
  switch (report.frequency) {
    case "Weekdays":
      return `Weekdays · ${time} UTC`;
    case "Weekly":
      return `Weekly · ${dayLabel(report.dayOfWeek)} · ${time}`;
    case "Monthly":
      return `Monthly · day ${report.dayOfMonth || 1} · ${time}`;
    case "Daily":
    default:
      return `Daily · ${time}`;
  }
}

export function describeFormat(report) {
  return (report.format || "csv").toUpperCase();
}

/** The recipient summary shown in the listing, e.g. "revops@example.com, +2". */
export function describeRecipients(report) {
  const emails = report.emailRecipients || [];
  const slack = [...(report.slackChannels || []), ...(report.slackUsers || [])];
  const parts = [...emails, ...slack];
  if (!parts.length) return "No recipients";
  if (parts.length <= 3) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;
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
