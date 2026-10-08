import { describe, it, expect } from "vitest";
import {
  ALERT_STATUS,
  createMockAlert,
  deleteMockAlert,
  describeThreshold,
  emptyCriteria,
  formatLastRun,
  getMockAlert,
  listMockAlerts,
  updateMockAlert,
} from "../mockAlerts";

describe("mockAlerts", () => {
  it("lists a non-empty set of default alerts with the expected shape", () => {
    const alerts = listMockAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]).toHaveProperty("id");
    expect(alerts[0]).toHaveProperty("name");
    expect(alerts[0]).toHaveProperty("measure");
    expect(alerts[0]).toHaveProperty("criteria");
    expect(alerts[0]).toHaveProperty("status");
  });

  it("describes a single-value threshold human-readably", () => {
    const alert = {
      criteriaOperation: "OPERATION_AND",
      criteria: [
        { measure: "total_revenue", operation: "OPERATION_GTE", type: "Value", value1: "15000" },
      ],
    };
    expect(describeThreshold(alert)).toBe("Total Revenue >= 15000");
  });

  it("joins multiple criteria with the chosen group operation", () => {
    const alert = {
      criteriaOperation: "OPERATION_OR",
      criteria: [
        { measure: "order_count", operation: "OPERATION_LT", type: "Value", value1: "100" },
        { measure: "order_count", operation: "OPERATION_GT", type: "AbsoluteChange", value1: "50" },
      ],
    };
    expect(describeThreshold(alert)).toContain("OR");
    expect(describeThreshold(alert)).toContain("order_count < 100");
  });

  it("appends a percent suffix for percent-change criteria", () => {
    const alert = {
      criteriaOperation: "OPERATION_AND",
      criteria: [{ measure: "total_revenue", operation: "OPERATION_LT", type: "PercentChange", value1: "-20" }],
    };
    expect(describeThreshold(alert)).toBe("Total Revenue < -20%");
  });

  it("formats last-run timestamps", () => {
    expect(formatLastRun("")).toBe("Not run yet");
    expect(formatLastRun("2026-09-06T09:14:00Z")).not.toBe("Not run yet");
  });

  it("creates an alert, prepending it to the list as pending", () => {
    const created = createMockAlert({ name: "Created alert", measure: "total_revenue", criteria: [] });
    expect(created.name).toBe("Created alert");
    expect(created.id).toBeTruthy();
    expect(created.status).toBe(ALERT_STATUS.PENDING);
    expect(listMockAlerts()[0].id).toBe(created.id);
  });

  it("updates an existing alert", () => {
    const first = listMockAlerts()[0];
    const updated = updateMockAlert(first.id, { name: "Renamed alert" });
    expect(updated.name).toBe("Renamed alert");
    expect(getMockAlert(first.id)?.name).toBe("Renamed alert");
  });

  it("deletes an alert", () => {
    const created = createMockAlert({ name: "To delete", measure: "total_revenue", criteria: [] });
    const before = listMockAlerts().length;
    deleteMockAlert(created.id);
    expect(listMockAlerts().length).toBe(before - 1);
    expect(getMockAlert(created.id)).toBeUndefined();
  });

  it("builds a blank criteria row from a measure", () => {
    const c = emptyCriteria("aov");
    expect(c.measure).toBe("aov");
    expect(c.operation).toBe("OPERATION_GTE");
    expect(c.type).toBe("Value");
  });
});
