import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisStagesTrendChart,
  getBucketLabel,
  getStageTrendDifferenceDescription,
  StageTrendTooltipContent,
} from "./analysis-stages-trend-chart";

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
    AreaChart: Container,
    CartesianGrid: Element,
    XAxis: Element,
    YAxis: Element,
    Area: Element,
    Tooltip: Element,
    Legend: Element,
  };
});

const trend = {
  bucketSize: "day" as const,
  points: [
    {
      bucketStart: "2026-07-01T00:00:00.000Z",
      cycleCount: 1234,
      averageCycleTime: 30.125,
      stages: {
        MENGAC: 2.551,
        ENJTIME: 3.715,
        MALTIME: 4.2,
        SOGZAMAN: 10.552,
        MENGKAP: 3.982,
      },
      averageStageSum: 25,
      stageSumDifference: -5.125,
    },
  ],
};

const tooltipRows = trend.points.map((point) => ({
  ...point,
  timestamp: Date.parse(point.bucketStart),
}));

describe("AnalysisStagesTrendChart explanatory UX", () => {
  it("labels the dynamic backend-selected time grouping", () => {
    render(<AnalysisStagesTrendChart data={trend} />);

    expect(screen.getByText("Zaman gruplaması:")).toBeVisible();
    expect(screen.getByText("Günlük görünüm")).toBeVisible();
    expect(getBucketLabel("hour")).toBe("Saatlik görünüm");
    expect(getBucketLabel("week")).toBe("Haftalık görünüm");
  });

  it("uses shared stage tokens for readable average-only tooltip rows", () => {
    render(
      <StageTrendTooltipContent
        active
        timestamp={tooltipRows[0].timestamp}
        bucketSize="day"
        rows={tooltipRows}
      />,
    );

    const expectedRows = [
      ["MENGAC", "Mengene Açma", "var(--chart-1)", "2,551 sn"],
      ["ENJTIME", "Enjeksiyon", "var(--chart-2)", "3,715 sn"],
      ["MALTIME", "Mal Alma", "var(--chart-3)", "4,2 sn"],
      ["SOGZAMAN", "Soğutma", "var(--chart-4)", "10,552 sn"],
      ["MENGKAP", "Mengene Kapama", "var(--chart-5)", "3,982 sn"],
    ] as const;

    for (const [key, label, color, value] of expectedRows) {
      const row = screen.getByTestId(`${key}-trend-tooltip-row`);
      expect(row).toHaveStyle({ color });
      expect(within(row).getByText(`${label} ortalaması`)).toBeVisible();
      expect(row).toHaveTextContent(value);
      expect(screen.getByTestId(`${key}-trend-tooltip-marker`)).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }

    expect(screen.getByText("1 Temmuz 2026")).toHaveClass("text-popover-foreground");
  });

  it("shows neutral bucket context and uses the backend difference directly", () => {
    render(
      <StageTrendTooltipContent
        active
        timestamp={tooltipRows[0].timestamp}
        bucketSize="day"
        rows={tooltipRows}
      />,
    );

    expect(screen.getByTestId("cycleCount-trend-tooltip-row")).toHaveTextContent(
      "Çevrim sayısı1.234",
    );
    expect(
      screen.getByTestId("averageCycleTime-trend-tooltip-row"),
    ).toHaveStyle({ color: "var(--foreground)" });
    expect(screen.getByTestId("averageCycleTime-trend-tooltip-row")).toHaveTextContent(
      "30,125 sn",
    );
    expect(screen.getByTestId("averageStageSum-trend-tooltip-row")).toHaveTextContent(
      "25 sn",
    );
    expect(screen.getByTestId("stageSumDifference-trend-tooltip-row")).toHaveTextContent(
      "-5,125 sn",
    );
    expect(
      screen.getByText("Toplam çevrim, kayıtlı aşama toplamından daha uzundur."),
    ).toBeInTheDocument();

    expect(getStageTrendDifferenceDescription(2.5)).toBe(
      "Kayıtlı aşama toplamı, toplam çevrimden daha uzundur.",
    );
    expect(getStageTrendDifferenceDescription(0.0004)).toBe(
      "Değerler birbirine yakındır.",
    );
  });

  it("keeps concise guidance collapsed until the native trigger is activated", () => {
    render(<AnalysisStagesTrendChart data={trend} />);

    const title = screen.getByText("Bu grafik nasıl okunur?");
    const trigger = title.closest("summary");
    const details = title.closest("details");
    const chevron = trigger?.querySelector("svg");

    expect(title).toBeVisible();
    expect(trigger?.tagName).toBe("SUMMARY");
    expect(details).not.toHaveAttribute("open");
    expect(chevron).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(chevron!);

    expect(details).toHaveAttribute("open");
    expect(screen.getByText(/Her renkli çizgi, ilgili aşamanın/)).toBeVisible();
    expect(screen.getByText(/Tek bir çizginin yükselmesi/)).toBeVisible();
    expect(screen.getByText(/Az sayıda çevrim içeren noktalar/)).toBeVisible();
    expect(screen.getByText(/Ürün, kalıp ve makine Tümü seçildiğinde/)).toBeVisible();

    fireEvent.click(trigger!);

    expect(details).not.toHaveAttribute("open");
  });

  it("uses a native summary so the disclosure remains keyboard focusable", () => {
    render(<AnalysisStagesTrendChart data={trend} />);

    const trigger = screen.getByText("Bu grafik nasıl okunur?").closest("summary");
    trigger?.focus();

    expect(trigger).toHaveFocus();
    expect(trigger?.tagName).toBe("SUMMARY");
  });
});
