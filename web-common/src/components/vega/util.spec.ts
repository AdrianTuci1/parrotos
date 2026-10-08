import { describe, expect, it } from "vitest";
import { parseExpression } from "vega-expression";
import { sanitizeFieldName } from "./util";

describe("sanitizeFieldName", () => {
  it("keeps simple field names readable", () => {
    expect(sanitizeFieldName("total_sales")).toBe("statsparrot_total_sales");
  });

  it("returns a valid Vega expression function name for measure names with operators", () => {
    const measureNames: [string, string][] = [
      ["Total Sample Revenue", "statsparrot_Total_u20_Sample_u20_Revenue"],
      ["Sample Rate* Lift", "statsparrot_Sample_u20_Rate_u2a__u20_Lift"],
      [
        "Share(%) | Variant A",
        "statsparrot_Share_u28__u25__u29__u20__u7c__u20_Variant_u20_A",
      ],
      [
        "Share(%) | Baseline",
        "statsparrot_Share_u28__u25__u29__u20__u7c__u20_Baseline",
      ],
      [
        "Avg Sample Value | Variant A",
        "statsparrot_Avg_u20_Sample_u20_Value_u20__u7c__u20_Variant_u20_A",
      ],
      [
        "Avg Sample Value | Baseline",
        "statsparrot_Avg_u20_Sample_u20_Value_u20__u7c__u20_Baseline",
      ],
      [
        "Success Rate | Variant A",
        "statsparrot_Success_u20_Rate_u20__u7c__u20_Variant_u20_A",
      ],
      [
        "Success Rate | Baseline",
        "statsparrot_Success_u20_Rate_u20__u7c__u20_Baseline",
      ],
      ["Success Rate | Delta", "statsparrot_Success_u20_Rate_u20__u7c__u20_Delta"],
    ];

    for (const [measureName, expectedFormatType] of measureNames) {
      const formatType = sanitizeFieldName(measureName);

      expect(formatType).toBe(expectedFormatType);
      expect(() => parseExpression(`${formatType}(datum.value)`)).not.toThrow();
    }
  });
});
