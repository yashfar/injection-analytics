import type { PropsWithChildren } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisTrendChart,
  getBucketLabel,
  TrendTooltipContent,
} from "./analysis-trend-chart";

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
    LineChart: Container,
    CartesianGrid: Element,
    XAxis: Element,
    YAxis: Element,
    Line: Element,
    Tooltip: Element,
    Legend: Element,
  };
});

const trend = {
  bucketSize: "day" as const,
  points: [
    {
      bucketStart: "2026-07-01T00:00:00.000Z",
      cycleCount: 42,
      averageCycleTime: 31.456,
      medianCycleTime: 29.74,
      minimumCycleTime: 28.1,
      maximumCycleTime: 35.2,
    },
  ],
};

describe("AnalysisTrendChart explanatory UX", () => {
  it("labels the backend-selected time grouping", () => {
    render(<AnalysisTrendChart data={trend} />);

    expect(screen.getByText("Zaman gruplamas\u0131:")).toBeInTheDocument();
    expect(screen.getByText("G\u00fcnl\u00fck g\u00f6r\u00fcn\u00fcm")).toBeInTheDocument();
    expect(getBucketLabel("hour")).toBe("Saatlik g\u00f6r\u00fcn\u00fcm");
    expect(getBucketLabel("week")).toBe("Haftal\u0131k g\u00f6r\u00fcn\u00fcm");
  });

  it("renders an accessible custom legend and interpretation guidance", () => {
    render(<AnalysisTrendChart data={trend} />);

    expect(screen.getByText("Mavi \u00e7izgi:")).toBeInTheDocument();
    expect(screen.getByText("Ye\u015fil \u00e7izgi:")).toBeInTheDocument();
    expect(screen.getByText("Ortalama \u00e7evrim s\u00fcresi")).toBeInTheDocument();
    expect(screen.getByText("Medyan \u00e7evrim s\u00fcresi")).toBeInTheDocument();
    expect(screen.getByText(/\u00c7izgiler birbirine yak\u0131nsa/)).toBeInTheDocument();
    expect(screen.getByText(/Bu grafik sorunun nedenini tek ba\u015f\u0131na/)).toBeInTheDocument();
    const legend = screen.getByLabelText("Trend serileri");
    expect(legend.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    expect(screen.getAllByText("Ortalama \u00e7evrim s\u00fcresi")[0]).toBeVisible();
  });

  it("uses the exact series tokens for colored tooltip rows and preserves values", () => {
    render(
      <TrendTooltipContent
        active
        timestamp={Date.parse(trend.points[0].bucketStart)}
        bucketSize="day"
        rows={[
          {
            ...trend.points[0],
            timestamp: Date.parse(trend.points[0].bucketStart),
          },
        ]}
      />,
    );

    const averageRow = screen.getByTestId("averageCycleTime-tooltip-row");
    const medianRow = screen.getByTestId("medianCycleTime-tooltip-row");
    expect(averageRow).toHaveStyle({ color: "var(--color-averageCycleTime)" });
    expect(medianRow).toHaveStyle({ color: "var(--color-medianCycleTime)" });
    expect(within(averageRow).getByText("Ortalama çevrim süresi")).toBeVisible();
    expect(within(medianRow).getByText("Medyan çevrim süresi")).toBeVisible();
    expect(screen.getByTestId("averageCycleTime-tooltip-marker")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("medianCycleTime-tooltip-marker")).toHaveAttribute("aria-hidden", "true");
    expect(averageRow).toHaveTextContent("31,456 sn");
    expect(medianRow).toHaveTextContent("29,74 sn");
    expect(screen.getByText("1 Temmuz 2026")).toHaveClass("text-popover-foreground");
  });
});
