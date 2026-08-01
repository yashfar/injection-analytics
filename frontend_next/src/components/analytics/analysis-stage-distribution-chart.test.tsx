import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AnalysisStageDistributionChart,
  getLongestAverageStage,
  getRecordedStageShare,
  getStageSumDifferenceExplanation,
  StageTooltipContent,
} from "./analysis-stage-distribution-chart";

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
    BarChart: Container,
    CartesianGrid: Element,
    XAxis: Element,
    YAxis: Element,
    Bar: Element,
    Tooltip: Element,
    Legend: Element,
  };
});

const summary = {
  cycleCount: 42,
  averageCycleTime: 30.125,
  medianCycleTime: 29.74,
  stages: {
    MENGAC: { average: 2.551, median: 2.32 },
    ENJTIME: { average: 3.715, median: 3.34 },
    MALTIME: { average: 4.2, median: 4.1 },
    SOGZAMAN: { average: 10.552, median: 10.2 },
    MENGKAP: { average: 3.982, median: 3.75 },
  },
  averageStageSum: 25,
  stageSumDifference: -5.125,
};

describe("AnalysisStageDistributionChart explanatory UX", () => {
  it("uses the shared stage metadata for readable, colored tooltip rows", () => {
    render(<StageTooltipContent active data={summary} />);

    const expectedRows = [
      ["MENGAC", "Mengene Açma", "var(--chart-1)", "2,551 sn", "2,32 sn"],
      ["ENJTIME", "Enjeksiyon", "var(--chart-2)", "3,715 sn", "3,34 sn"],
      ["MALTIME", "Mal Alma", "var(--chart-3)", "4,2 sn", "4,1 sn"],
      ["SOGZAMAN", "Soğutma", "var(--chart-4)", "10,552 sn", "10,2 sn"],
      ["MENGKAP", "Mengene Kapama", "var(--chart-5)", "3,982 sn", "3,75 sn"],
    ] as const;

    for (const [key, label, color, average, median] of expectedRows) {
      const row = screen.getByTestId(`${key}-tooltip-row`);
      expect(row).toHaveStyle({ color });
      expect(within(row).getByText(`${label} (${key})`)).toBeVisible();
      expect(row).toHaveTextContent(`Ortalama: ${average}`);
      expect(row).toHaveTextContent(`Medyan: ${median}`);
      expect(screen.getByTestId(`${key}-tooltip-marker`)).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    }
  });

  it("derives the longest stage and its recorded-stage share from the response", () => {
    const longestStage = getLongestAverageStage(summary);

    expect(longestStage).toMatchObject({
      stage: { key: "SOGZAMAN", label: "Soğutma" },
      average: 10.552,
    });
    expect(getRecordedStageShare(longestStage?.average ?? 0, 25)).toBeCloseTo(
      0.42208,
    );
    expect(getRecordedStageShare(10, null)).toBeNull();
    expect(getRecordedStageShare(10, 0)).toBeNull();

    render(<AnalysisStageDistributionChart data={summary} />);

    expect(screen.getByText("En uzun ortalama aşama")).toBeInTheDocument();
    expect(screen.getByText(/Soğutma — 10,552 sn/)).toBeInTheDocument();
    expect(screen.getByText("Kayıtlı aşamalar içindeki payı")).toBeInTheDocument();
    expect(screen.getByText("%42,21")).toBeInTheDocument();
    expect(screen.getByText("25 sn")).toBeInTheDocument();
    expect(screen.getByText("30,125 sn")).toBeInTheDocument();
    expect(screen.getByText("-5,125 sn")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ortalama toplam çevrim süresi, kayıtlı aşama toplamından 5,125 sn daha uzundur.",
      ),
    ).toBeInTheDocument();
  });

  it("uses the signed backend difference and treats a display-zero difference as near", () => {
    expect(getStageSumDifferenceExplanation(-2.5)).toBe(
      "Ortalama toplam çevrim süresi, kayıtlı aşama toplamından 2,5 sn daha uzundur.",
    );
    expect(getStageSumDifferenceExplanation(2.5)).toBe(
      "Kayıtlı aşama toplamı, ortalama toplam çevrim süresinden 2,5 sn daha uzundur.",
    );
    expect(getStageSumDifferenceExplanation(0.0004)).toBe(
      "Kayıtlı aşama toplamı ile ortalama toplam çevrim süresi birbirine yakındır.",
    );
    expect(getStageSumDifferenceExplanation(null)).toBe(
      "Aşama-toplam farkı için karşılaştırılabilir bir değer mevcut değil.",
    );
  });

  it("does not render an invalid share when the recorded-stage sum is unavailable", () => {
    render(
      <AnalysisStageDistributionChart
        data={{ ...summary, averageStageSum: 0 }}
      />,
    );

    expect(screen.getByText("Kayıtlı aşamalar içindeki payı")).toBeInTheDocument();
    expect(screen.getByText("Mevcut değil")).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });

  it("keeps the reading guidance collapsed until its title row or chevron is activated", () => {
    render(<AnalysisStageDistributionChart data={summary} />);

    const title = screen.getByText("Bu grafik nasıl okunur?");
    const trigger = title.closest("summary");
    const details = title.closest("details");
    const chevron = trigger?.querySelector("svg");

    expect(title).toBeVisible();
    expect(trigger?.tagName).toBe("SUMMARY");
    expect(details).not.toHaveAttribute("open");
    expect(chevron).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText(/Soğutma — 10,552 sn/)).toBeVisible();
    expect(screen.getByText("%42,21")).toBeVisible();
    expect(screen.getByText("25 sn")).toBeVisible();
    expect(screen.getByText("30,125 sn")).toBeVisible();
    expect(screen.getByText("-5,125 sn")).toBeVisible();

    fireEvent.click(chevron!);

    expect(details).toHaveAttribute("open");
    expect(screen.getByText(/Renkli bölümler, seçili filtrelere uyan/)).toBeVisible();
    expect(screen.getByText(/TIMERCEVRIM ortalamasını/)).toBeVisible();
    expect(screen.getByText(/Tek başına arıza anlamına gelmez/)).toBeVisible();
    expect(screen.getByText(/Ürün, kalıp ve makine Tümü seçildiğinde/)).toBeVisible();
    expect(screen.getByText(/Medyan, sıralanmış aşama sürelerinin/)).toBeVisible();
    expect(
      screen.getByText(
        "Ortalama toplam çevrim süresi, kayıtlı aşama toplamından 5,125 sn daha uzundur.",
      ),
    ).toBeVisible();

    fireEvent.click(trigger!);

    expect(details).not.toHaveAttribute("open");
  });

  it("uses the native summary control for keyboard-accessible disclosure", () => {
    render(<AnalysisStageDistributionChart data={summary} />);

    const trigger = screen.getByText("Bu grafik nasıl okunur?").closest("summary");
    expect(trigger).toBeTruthy();

    trigger?.focus();
    expect(trigger).toHaveFocus();
    expect(trigger?.tagName).toBe("SUMMARY");
  });
});
