import { describe, expect, it } from "vitest";

import { analysisKeys, analyticsKeys } from "./query-keys";

const filters = {
  startDate: "2026-06-24",
  endDate: "2026-07-24",
  productCode: "PRODUCT-A",
  moldCode: "MOLD-A",
  machineCode: "MACHINE-A",
};

describe("analysisKeys", () => {
  it("normalizes omitted histogram settings to backend defaults", () => {
    expect(analysisKeys.histogram(filters)).toEqual(
      analysisKeys.histogram({ ...filters, binSize: 5, maxValue: 60 }),
    );
  });

  it("normalizes omitted cycle and outlier limits to backend defaults", () => {
    expect(analysisKeys.cycles(filters)).toEqual(
      analysisKeys.cycles({ ...filters, limit: 1000 }),
    );
    expect(analysisKeys.outliers(filters)).toEqual(
      analysisKeys.outliers({ ...filters, limit: 100 }),
    );
  });

  it("keeps custom histogram and bounded-request settings distinct", () => {
    expect(analysisKeys.histogram(filters)).not.toEqual(
      analysisKeys.histogram({ ...filters, binSize: 10, maxValue: 100 }),
    );
    expect(analysisKeys.cycles(filters)).not.toEqual(
      analysisKeys.cycles({ ...filters, limit: 500 }),
    );
    expect(analysisKeys.outliers(filters)).not.toEqual(
      analysisKeys.outliers({ ...filters, limit: 50 }),
    );
  });

  it("keeps differing filters distinct", () => {
    expect(analysisKeys.summary(filters)).not.toEqual(
      analysisKeys.summary({ ...filters, machineCode: "MACHINE-B" }),
    );
  });

  it("preserves the analysis and legacy analytics key hierarchies", () => {
    expect(analysisKeys.all).toEqual(["analysis"]);
    expect(analyticsKeys.all).toEqual(["analytics"]);
    expect(analyticsKeys.comparablePairs()).toEqual([
      "analytics",
      "comparable-pairs",
    ]);
  });
});
