import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisCyclesChart,
  CycleTooltipContent,
} from "./analysis-cycles-chart";
import { transformAnalysisCycles } from "@/lib/analysis-cycles-chart";

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

const response = {
  totalCycleCount: 1234,
  returnedCycleCount: 100,
  limit: 100,
  isTruncated: true,
  points: [
    {
      cycleId: "cycle-2",
      machine: "Makine-01",
      workOrderNumber: "WO-42",
      productCode: "URUN-A",
      castCode: "KALIP-B",
      machineDate: "2026-07-01T12:34:56.000Z",
      cycleCounter: 9876,
      cycleTime: 36.91,
      stages: {
        MENGAC: 2.551,
        ENJTIME: 3.715,
        MALTIME: null,
        SOGZAMAN: 10.552,
        MENGKAP: null,
      },
    },
  ],
};

const tooltipRows = transformAnalysisCycles(response);

describe("AnalysisCyclesChart explanatory UX", () => {
  it("uses the cycle-time series token and complete per-cycle tooltip context", () => {
    render(
      <CycleTooltipContent
        active
        timestamp={tooltipRows[0].timestamp}
        rows={tooltipRows}
      />,
    );

    const cycleTimeRow = screen.getByTestId("cycleTime-cycle-tooltip-row");
    expect(cycleTimeRow).toHaveStyle({ color: "var(--color-cycleTime)" });
    expect(within(cycleTimeRow).getByText("Çevrim süresi")).toBeVisible();
    expect(cycleTimeRow).toHaveTextContent("36,91 sn");
    expect(screen.getByTestId("cycleTime-cycle-tooltip-marker")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("Tarih ve saat")).toBeVisible();
    expect(screen.getByText(/1 Temmuz 2026/)).toHaveClass("text-popover-foreground");
    expect(screen.getByText("Çevrim sayacı")).toBeVisible();
    expect(screen.getByText("9.876")).toBeVisible();
    expect(screen.getByText("Makine")).toBeVisible();
    expect(screen.getByText("Makine-01")).toBeVisible();
    expect(screen.getByText("Ürün")).toBeVisible();
    expect(screen.getByText("URUN-A")).toBeVisible();
    expect(screen.getByText("Kalıp")).toBeVisible();
    expect(screen.getByText("KALIP-B")).toBeVisible();
    expect(screen.getByText("İş emri")).toBeVisible();
    expect(screen.getByText("WO-42")).toBeVisible();
  });

  it("uses shared stage colors and omits null stages instead of rendering zero", () => {
    render(
      <CycleTooltipContent
        active
        timestamp={tooltipRows[0].timestamp}
        rows={tooltipRows}
      />,
    );

    const expectedRows = [
      ["MENGAC", "Mengene Açma", "var(--chart-1)", "2,551 sn"],
      ["ENJTIME", "Enjeksiyon", "var(--chart-2)", "3,715 sn"],
      ["SOGZAMAN", "Soğutma", "var(--chart-4)", "10,552 sn"],
    ] as const;

    for (const [key, label, color, value] of expectedRows) {
      const row = screen.getByTestId(`${key}-cycle-tooltip-row`);
      expect(row).toHaveStyle({ color });
      expect(within(row).getByText(label)).toBeVisible();
      expect(row).toHaveTextContent(value);
      expect(screen.getByTestId(`${key}-cycle-tooltip-marker`)).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }

    expect(screen.queryByTestId("MALTIME-cycle-tooltip-row")).toBeNull();
    expect(screen.queryByTestId("MENGKAP-cycle-tooltip-row")).toBeNull();
    expect(screen.queryByText("0 sn")).not.toBeInTheDocument();
  });

  it("uses API metadata for truthful truncation disclosure", () => {
    const { rerender } = render(<AnalysisCyclesChart data={response} />);

    expect(
      screen.getByText("Toplam 1.234 çevrimden en son 100 çevrim gösteriliyor."),
    ).toBeVisible();

    rerender(
      <AnalysisCyclesChart
        data={{
          ...response,
          totalCycleCount: 100,
          returnedCycleCount: 100,
          isTruncated: false,
        }}
      />,
    );

    expect(screen.getByText("Toplam 100 çevrimin tamamı gösteriliyor.")).toBeVisible();
  });

  it("keeps returned points in chronological order rather than ordering by duration", () => {
    const rows = transformAnalysisCycles({
      ...response,
      points: [
        { ...response.points[0], cycleId: "later", cycleTime: 10, machineDate: "2026-07-02T00:00:00.000Z" },
        { ...response.points[0], cycleId: "earlier", cycleTime: 100, machineDate: "2026-07-01T00:00:00.000Z" },
      ],
    });

    expect(rows.map((row) => row.cycleId)).toEqual(["earlier", "later"]);
    expect(rows.map((row) => row.cycleTime)).toEqual([100, 10]);
  });

  it("keeps concise cycle guidance collapsed until its title row or chevron is activated", () => {
    render(<AnalysisCyclesChart data={response} />);

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
    expect(screen.getByText(/Her nokta, seçili filtrelere uyan gerçek/)).toBeVisible();
    expect(screen.getByText(/Çizgideki ani yükselişler/)).toBeVisible();
    expect(screen.getByText(/Gösterim sınırı varsa/)).toBeVisible();
    expect(screen.getByText(/tek başına arıza anlamına gelmez/)).toBeVisible();

    fireEvent.click(trigger!);

    expect(details).not.toHaveAttribute("open");
  });

  it("uses a native summary so the disclosure remains keyboard focusable", () => {
    render(<AnalysisCyclesChart data={response} />);

    const trigger = screen.getByText("Bu grafik nasıl okunur?").closest("summary");
    trigger?.focus();

    expect(trigger).toHaveFocus();
    expect(trigger?.tagName).toBe("SUMMARY");
  });
});
