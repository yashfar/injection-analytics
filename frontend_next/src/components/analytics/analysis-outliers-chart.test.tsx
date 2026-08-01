import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisOutliersChart,
  OutlierTooltipContent,
} from "./analysis-outliers-chart";
import { transformAnalysisOutliers } from "@/lib/analysis-outliers-chart";

afterEach(cleanup);

vi.mock("recharts", () => {
  function Container({ children }: PropsWithChildren) {
    return <div>{children}</div>;
  }

  function Element() {
    return <div />;
  }

  return {
    ResponsiveContainer: Container,
    ScatterChart: Container,
    CartesianGrid: Element,
    XAxis: Element,
    YAxis: Element,
    Scatter: Container,
    Cell: Element,
    ReferenceLine: Element,
    Tooltip: Element,
    Legend: Element,
  };
});

const highOutlier = {
  cycleId: "high-cycle",
  machine: "Makine-01",
  workOrderNumber: "WO-42",
  productCode: "URUN-A",
  castCode: "KALIP-B",
  machineDate: "2026-07-01T12:34:56.000Z",
  cycleCounter: 9876,
  cycleTime: 36.91,
  stages: {
    MENGAC: 2.5,
    ENJTIME: 3.7,
    MALTIME: null,
    SOGZAMAN: 10.5,
    MENGKAP: null,
  },
  outlierDirection: "high" as const,
  distanceFromFence: 5.125,
};

const lowOutlier = {
  ...highOutlier,
  cycleId: "low-cycle",
  machineDate: "2026-07-01T11:34:56.000Z",
  cycleTime: 12.345,
  outlierDirection: "low" as const,
  distanceFromFence: 2.25,
};

const response = {
  cycleCount: 1234,
  q1: 20,
  q3: 30,
  iqr: 10,
  lowerFence: 5,
  upperFence: 35,
  outlierCount: 2,
  outlierRate: 0.162,
  returnedOutlierCount: 1,
  limit: 1,
  isTruncated: true,
  outliers: [highOutlier],
};

describe("AnalysisOutliersChart explanatory UX", () => {
  it("uses the high-outlier token for its complete tooltip context", () => {
    render(
      <OutlierTooltipContent
        active
        lowerFence={response.lowerFence}
        row={{ ...highOutlier, timestamp: Date.parse(highOutlier.machineDate) }}
        upperFence={response.upperFence}
      />,
    );

    for (const testId of [
      "cycleTime-outlier-tooltip-row",
      "direction-outlier-tooltip-row",
      "fence-outlier-tooltip-row",
      "distance-outlier-tooltip-row",
    ]) {
      expect(screen.getByTestId(testId)).toHaveStyle({ color: "var(--color-high)" });
      expect(screen.getByTestId(`${testId}-marker`)).toHaveAttribute("aria-hidden", "true");
    }

    expect(screen.getByText("Üst sınırın üzerinde")).toBeVisible();
    expect(screen.getByTestId("cycleTime-outlier-tooltip-row")).toHaveTextContent("36,91 sn");
    expect(screen.getByTestId("fence-outlier-tooltip-row")).toHaveTextContent("35 sn");
    expect(screen.getByTestId("distance-outlier-tooltip-row")).toHaveTextContent("5,125 sn");
    expect(screen.getByText("Tarih ve saat")).toBeVisible();
    expect(screen.getByText(/1 Temmuz 2026/)).toHaveClass("text-popover-foreground");
    expect(screen.getByTestId("machine-outlier-tooltip-row")).toHaveStyle({
      color: "var(--foreground)",
    });
    expect(screen.getByText("Makine-01")).toBeVisible();
    expect(screen.getByText("URUN-A")).toBeVisible();
    expect(screen.getByText("KALIP-B")).toBeVisible();
    expect(screen.getByText("WO-42")).toBeVisible();
    expect(screen.getByText("9.876")).toBeVisible();
  });

  it("uses the low-outlier token and the applicable lower fence", () => {
    render(
      <OutlierTooltipContent
        active
        lowerFence={response.lowerFence}
        row={{ ...lowOutlier, timestamp: Date.parse(lowOutlier.machineDate) }}
        upperFence={response.upperFence}
      />,
    );

    const directionRow = screen.getByTestId("direction-outlier-tooltip-row");
    expect(directionRow).toHaveStyle({ color: "var(--color-low)" });
    expect(directionRow).toHaveTextContent("Alt sınırın altında");
    expect(screen.getByTestId("cycleTime-outlier-tooltip-row")).toHaveTextContent("12,345 sn");
    expect(screen.getByTestId("fence-outlier-tooltip-row")).toHaveTextContent("5 sn");
    expect(screen.getByTestId("distance-outlier-tooltip-row")).toHaveTextContent("2,25 sn");
  });

  it("shows all IQR summary values and truthful bounded-result metadata", () => {
    const { rerender } = render(<AnalysisOutliersChart data={response} />);

    expect(screen.getByText("İncelenen çevrim")).toBeVisible();
    expect(screen.getByText("Aykırı Değer Sayısı")).toBeVisible();
    expect(screen.getByText("Q1")).toBeVisible();
    expect(screen.getByText("Q3")).toBeVisible();
    expect(screen.getByText("10 sn")).toBeVisible();
    expect(screen.getByText("5 sn")).toBeVisible();
    expect(screen.getByText("35 sn")).toBeVisible();
    expect(
      screen.getByText("Toplam 2 aykırı çevrimden sınırdan en fazla sapan 1 kayıt gösteriliyor."),
    ).toBeVisible();

    rerender(
      <AnalysisOutliersChart
        data={{ ...response, returnedOutlierCount: 2, isTruncated: false }}
      />,
    );

    expect(screen.getByText("Tespit edilen 2 aykırı çevrimin tamamı gösteriliyor.")).toBeVisible();
  });

  it("preserves the backend severity ordering", () => {
    const rows = transformAnalysisOutliers({
      ...response,
      outliers: [highOutlier, lowOutlier],
    });

    expect(rows.map((row) => row.cycleId)).toEqual(["high-cycle", "low-cycle"]);
  });

  it("distinguishes a valid zero-outlier result from no population", () => {
    render(
      <AnalysisOutliersChart
        data={{
          ...response,
          outlierCount: 0,
          returnedOutlierCount: 0,
          outliers: [],
        }}
      />,
    );

    expect(
      screen.getByText("Bu filtrelerde IQR sınırlarının dışında çevrim bulunamadı."),
    ).toHaveAttribute("role", "status");
  });

  it("keeps concise IQR guidance collapsed until its title row or chevron is activated", () => {
    render(<AnalysisOutliersChart data={response} />);

    const title = screen.getByText("Bu grafik nasıl okunur?");
    const trigger = title.closest("summary");
    const details = title.closest("details");
    const chevron = trigger?.querySelector("svg");

    expect(title).toBeVisible();
    expect(details).not.toHaveAttribute("open");
    expect(trigger?.tagName).toBe("SUMMARY");
    expect(chevron).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(chevron!);

    expect(details).toHaveAttribute("open");
    expect(screen.getByText(/Aykırı değerler, Q1 ve Q3/)).toBeVisible();
    expect(screen.getByText(/Üst sınırın üzerindeki noktalar/)).toBeVisible();
    expect(screen.getByText(/Sınırdan sapma değeri büyüdükçe/)).toBeVisible();
    expect(screen.getByText(/tek başına arıza anlamına gelmez/)).toBeVisible();
    expect(screen.getByText("IQR = Q3 − Q1")).toBeVisible();

    fireEvent.click(trigger!);

    expect(details).not.toHaveAttribute("open");
  });

  it("uses a native summary so the disclosure remains keyboard focusable", () => {
    render(<AnalysisOutliersChart data={response} />);

    const trigger = screen.getByText("Bu grafik nasıl okunur?").closest("summary");
    trigger?.focus();

    expect(trigger).toHaveFocus();
    expect(trigger?.tagName).toBe("SUMMARY");
  });
});
