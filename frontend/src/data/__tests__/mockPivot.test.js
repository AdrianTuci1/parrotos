import { describe, expect, it } from "vitest";
import { buildMockPivotData } from "@/data/mockPivot";

// Mirrors the mock adapter's per-dimension margins (see frontend/src/data/mockAdapter.js).
const CHANNEL_ROWS = [
  { channel: "Online", total_revenue: 68240, order_count: 1180, aov: 57.83 },
  { channel: "Retail", total_revenue: 27950, order_count: 324, aov: 86.27 },
  { channel: "Partner", total_revenue: 15140, order_count: 210, aov: 72.1 },
];
const COUNTRY_ROWS = [
  { country: "US", total_revenue: 62440, order_count: 1041, aov: 59.98 },
  { country: "DE", total_revenue: 24810, order_count: 412, aov: 60.22 },
  { country: "GB", total_revenue: 17320, order_count: 287, aov: 60.35 },
  { country: "FR", total_revenue: 9760, order_count: 181, aov: 53.92 },
];

const MEASURES = [
  { name: "total_revenue", displayName: "Total Revenue" },
  { name: "order_count", displayName: "Order Count" },
];

function getRows(dimension) {
  return dimension === "country" ? COUNTRY_ROWS : CHANNEL_ROWS;
}

describe("buildMockPivotData", () => {
  it("uses measures as columns and rows as the row dimension", () => {
    const { columns, rows } = buildMockPivotData(
      getRows,
      "channel",
      null,
      MEASURES,
    );

    expect(columns.map((c) => c.value)).toEqual([
      "total_revenue",
      "order_count",
    ]);
    expect(rows.map((r) => r.label)).toEqual(["Online", "Retail", "Partner"]);
    expect(rows[0].cells[0]).toBe(68240);
    expect(rows[0].cells[1]).toBe(1180);
  });

  it("cross-tabulates a column dimension while preserving each row's margin", () => {
    const { columns, rows } = buildMockPivotData(
      getRows,
      "channel",
      "country",
      [MEASURES[0]],
    );

    // One column per country dimension value × the single measure.
    expect(columns.map((c) => c.col)).toEqual(["US", "DE", "GB", "FR"]);

    const online = rows.find((r) => r.label === "Online");
    // The cross-tab must distribute the row's own margin across columns.
    expect(online.cells.reduce((sum, v) => sum + v, 0)).toBeCloseTo(68240, 1);
  });
});
