import type { ComponentProps, PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CycleTimeHistogramChart } from "@/components/dashboard/charts/cycle-time-histogram-chart";

vi.mock("recharts", () => {
  function Container({ children }: PropsWithChildren) {
    return <div>{children}</div>;
  }

  function Element() {
    return <div />;
  }

  return {
    Bar: Container,
    BarChart: Container,
    CartesianGrid: Element,
    Cell: Element,
    Legend: Element,
    ResponsiveContainer: Container,
    Tooltip: Element,
    XAxis: Element,
    YAxis: Element,
  };
});

const defaultHistogramProps: ComponentProps<
  typeof CycleTimeHistogramChart
> = {
  data: undefined,
  requestedMachine: undefined,
  configuration: { binSize: 5, maxValue: 100 },
  isPending: false,
  isError: false,
  isFetching: false,
  isPlaceholderData: false,
  onConfigurationChange: vi.fn(),
  onSelectMachine: vi.fn(),
  onRetry: vi.fn(),
};

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

describe("CycleTimeHistogramChart empty and loading states", () => {
  it("shows an actionable state instead of a loading skeleton without a machine", () => {
    const { container } = render(
      <CycleTimeHistogramChart {...defaultHistogramProps} isPending />,
    );

    expect(
      screen.getByRole("heading", { name: "Önce bir makine seçin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Çevrim süresi dağılımını görüntülemek için yukarıdaki filtrelerden bir makine seçmeniz gerekir.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Makine Seç" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Çevrim süresi dağılımı yükleniyor..."),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="histogram-skeleton"]'),
    ).not.toBeInTheDocument();
  });

  it("calls the machine-selection action without selecting a machine", () => {
    const onSelectMachine = vi.fn();

    render(
      <CycleTimeHistogramChart
        {...defaultHistogramProps}
        onSelectMachine={onSelectMachine}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Makine Seç" }));

    expect(onSelectMachine).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { name: "Önce bir makine seçin" }),
    ).toBeInTheDocument();
  });

  it("shows the histogram skeleton only while a selected machine loads", () => {
    const { container } = render(
      <CycleTimeHistogramChart
        {...defaultHistogramProps}
        requestedMachine="M1"
        isPending
      />,
    );

    expect(
      screen.getByText("Çevrim süresi dağılımı yükleniyor..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Makine Seç" }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="histogram-skeleton"]'),
    ).toBeInTheDocument();
  });

  it("shows the separate empty-result state for an empty API response", () => {
    render(
      <CycleTimeHistogramChart
        {...defaultHistogramProps}
        requestedMachine="M1"
        data={{
          productCode: "P1",
          castCode: "C1",
          machine: "M1",
          binSize: 5,
          maxValue: 100,
          totalCycleCount: 0,
          minimumCycleTime: null,
          maximumCycleTime: null,
          bins: [],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Dağılım verisi bulunamadı",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Seçilen ürün, kalıp, makine ve tarih aralığı için çevrim süresi verisi bulunamadı.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Makine Seç" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the successful histogram and its controls", () => {
    render(
      <CycleTimeHistogramChart
        {...defaultHistogramProps}
        requestedMachine="M1"
        data={{
          productCode: "P1",
          castCode: "C1",
          machine: "M1",
          binSize: 5,
          maxValue: 100,
          totalCycleCount: 12,
          minimumCycleTime: 18,
          maximumCycleTime: 27,
          bins: [
            {
              lowerBound: 15,
              upperBound: 20,
              cycleCount: 12,
              isOverflow: false,
              label: "15-20",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Toplam Çevrim")).toBeInTheDocument();
    expect(screen.getByLabelText("Aralık Genişliği")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Üst Gösterim Sınırı"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Dağılım verisi bulunamadı",
      }),
    ).not.toBeInTheDocument();
  });
});
