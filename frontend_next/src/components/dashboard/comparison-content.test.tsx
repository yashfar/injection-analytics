import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ComparisonContent } from "@/components/dashboard/comparison-content";
import { MACHINE_FILTER_TRIGGER_ID } from "@/lib/dashboard-element-ids";

// ComparisonContent renders the real legacy chart components (unlike Phase
// 1, there's no shared shell to mock around), so only recharts itself needs
// mocking to keep this a fast, jsdom-safe test.
vi.mock("recharts", () => {
  function Container({ children }: { children?: React.ReactNode }) {
    return <div>{children}</div>;
  }
  function Element() {
    return <div />;
  }
  return {
    ResponsiveContainer: Container,
    BarChart: Container,
    LineChart: Container,
    ComposedChart: Container,
    Bar: Container,
    Line: Element,
    Scatter: Element,
    Cell: Element,
    CartesianGrid: Element,
    XAxis: Element,
    YAxis: Element,
    Tooltip: Element,
    Legend: Element,
    LabelList: Element,
    Rectangle: Element,
  };
});

vi.mock("@/queries/analytics.queries", () => {
  const queryResult = (data: unknown) => ({
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
  });

  return {
    useAnalyticsOverviewQuery: () =>
      queryResult({
        totalCycles: 100,
        machineCount: 1,
        productCount: 1,
        moldCount: 1,
        startDate: "2026-07-01T00:00:00.000Z",
        endDate: "2026-07-24T23:59:59.999Z",
      }),
    useComparablePairsQuery: () =>
      queryResult([
        {
          productCode: "P1",
          castCode: "C1",
          machineCount: 1,
          cycleCount: 100,
          machines: ["M1"],
        },
      ]),
    useMachineComparisonQuery: () => queryResult([]),
    useTrendQuery: () => queryResult(undefined),
    useHistogramQuery: () => queryResult(undefined),
    useBoxPlotQuery: () => queryResult(undefined),
    useStageBreakdownQuery: () => queryResult(undefined),
  };
});

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

beforeEach(() => {
  setReducedMotion(false);
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("Comparison histogram machine-filter navigation", () => {
  it("scrolls and focuses the actual machine trigger without changing its value", () => {
    vi.useFakeTimers();
    render(<ComparisonContent />);

    const trigger = document.getElementById(MACHINE_FILTER_TRIGGER_ID);
    const initialTriggerText = trigger?.textContent;

    expect(trigger).toBeInstanceOf(HTMLButtonElement);

    fireEvent.click(screen.getByRole("button", { name: "Makine Seç" }));

    expect(trigger?.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveTextContent(initialTriggerText ?? "");
    expect(trigger).toHaveAttribute("data-attention", "true");

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(trigger).toHaveAttribute("data-attention", "false");
  });

  it("uses automatic scrolling when reduced motion is requested", () => {
    setReducedMotion(true);
    render(<ComparisonContent />);

    const trigger = document.getElementById(MACHINE_FILTER_TRIGGER_ID);

    fireEvent.click(screen.getByRole("button", { name: "Makine Seç" }));

    expect(trigger?.scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
      inline: "nearest",
    });
    expect(document.activeElement).toBe(trigger);
  });
});
