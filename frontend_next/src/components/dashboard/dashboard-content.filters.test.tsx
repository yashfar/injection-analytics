import type { PropsWithChildren, ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultAnalyticsFilters } from "@/lib/analytics-filters";
import { analysisKeys } from "@/lib/query-keys";
import { renderWithClient } from "@/test/render-with-client";
import { API_BASE_URL, mockResponses, resetMockResponses } from "@/test/msw/handlers";
import {
  countRequestsTo,
  findRequestTo,
  requestLog,
  resetRequestLog,
  server,
} from "@/test/msw/server";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000";

let DashboardContent: typeof import("@/components/dashboard/dashboard-content").DashboardContent;

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
    BarChart: Container,
    AreaChart: Container,
    ScatterChart: Container,
    CartesianGrid: Element,
    XAxis: Element,
    YAxis: Element,
    Line: Element,
    Bar: Element,
    Area: Element,
    Scatter: Element,
    Cell: Element,
    ReferenceLine: Element,
    Tooltip: Element,
    Legend: Element,
  };
});

const ANALYSIS_ENDPOINTS = [
  "/analytics/analysis/summary",
  "/analytics/analysis/trend",
  "/analytics/analysis/histogram",
  "/analytics/analysis/stages/summary",
  "/analytics/analysis/stages/trend",
  "/analytics/analysis/cycles",
  "/analytics/analysis/outliers",
];

function getApplyButton(): HTMLElement {
  return screen.getByRole("button", {
    name: /Filtreleri Uygula|Değişiklikleri Uygula/,
  });
}

function selectOption(labelText: string, optionName: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = screen.getByRole("option", { name: optionName });
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}

async function waitForInitialAnalysis() {
  await screen.findByText("Ürün: Tümü");
  await waitFor(() => {
    for (const endpoint of ANALYSIS_ENDPOINTS) {
      expect(countRequestsTo(endpoint)).toBe(1);
    }
  });
}

function renderWithInspectableClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

function setJsdomPolyfills() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn().mockReturnValue(false),
  });
  Object.defineProperty(Element.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(Element.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
}

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "error" });
  ({ DashboardContent } = await import(
    "@/components/dashboard/dashboard-content"
  ));
});

beforeEach(() => {
  setJsdomPolyfills();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetRequestLog();
  resetMockResponses();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

describe("createDefaultAnalyticsFilters", () => {
  it("creates unrestricted, date-only filters without selecting an identifier", () => {
    expect(
      createDefaultAnalyticsFilters(
        [],
        "2026-06-24T10:15:21.000Z",
        "2026-07-24T10:01:16.000Z",
      ),
    ).toEqual({
      productCode: undefined,
      castCode: undefined,
      machine: undefined,
      startDate: "2026-06-24",
      endDate: "2026-07-24",
    });
  });
});

describe("DashboardContent initial unrestricted bootstrap", () => {
  it("keeps analytics disabled until filter boundaries resolve", async () => {
    server.use(
      http.get(`${API_BASE_URL}/analytics/filters`, async () => {
        await delay(50);
        return HttpResponse.json(mockResponses.filters);
      }),
    );

    renderWithClient(<DashboardContent />);

    expect(requestLog.filter((entry) => entry.pathname.startsWith("/analytics/analysis/"))).toHaveLength(0);

    await waitForInitialAnalysis();
  });

  it("shows Tümü for each unrestricted selector and automatically requests every analysis", async () => {
    renderWithClient(<DashboardContent />);

    await waitForInitialAnalysis();

    expect(screen.getByLabelText("Ürün")).toHaveTextContent("Tümü");
    expect(screen.getByLabelText("Kalıp")).toHaveTextContent("Tümü");
    expect(screen.getByLabelText("Makine")).toHaveTextContent("Tümü");
    expect(screen.getByText("Ürün: Tümü")).toBeInTheDocument();
    expect(screen.getByText("Kalıp: Tümü")).toBeInTheDocument();
    expect(screen.getByText("Makine: Tümü")).toBeInTheDocument();
    expect(getApplyButton()).toBeDisabled();

    for (const endpoint of ANALYSIS_ENDPOINTS) {
      const request = findRequestTo(endpoint);
      expect(request?.searchParams.get("from")).toBe("2026-06-24");
      expect(request?.searchParams.get("to")).toBe("2026-07-24");
      expect(request?.searchParams.has("productCode")).toBe(false);
      expect(request?.searchParams.has("castCode")).toBe(false);
      expect(request?.searchParams.has("machine")).toBe(false);
    }

    expect(
      findRequestTo("/analytics/analysis/histogram")?.searchParams.get("binSize"),
    ).toBe("5");
    expect(
      findRequestTo("/analytics/analysis/histogram")?.searchParams.get("maxValue"),
    ).toBe("60");
    expect(findRequestTo("/analytics/analysis/cycles")?.searchParams.get("limit")).toBe("1000");
    expect(findRequestTo("/analytics/analysis/outliers")?.searchParams.get("limit")).toBe("100");
  });

  it("does not bootstrap when the filters response has no usable date range", async () => {
    mockResponses.filters = {
      ...mockResponses.filters,
      startDate: null,
      endDate: null,
    };

    renderWithClient(<DashboardContent />);

    await screen.findByText("Analiz tarih aralığı mevcut değil.");
    expect(screen.getByLabelText("Ürün")).toHaveTextContent("Tümü");
    expect(screen.getByLabelText("Kalıp")).toHaveTextContent("Tümü");
    expect(screen.getByLabelText("Makine")).toHaveTextContent("Tümü");
    expect(getApplyButton()).toBeDisabled();
    expect(requestLog.filter((entry) => entry.pathname.startsWith("/analytics/analysis/"))).toHaveLength(0);
  });

  it("does not allow overview failure to block filters or initial analysis", async () => {
    server.use(
      http.get(`${API_BASE_URL}/analytics/overview`, () =>
        HttpResponse.json({ message: "overview unavailable" }, { status: 500 }),
      ),
    );

    renderWithClient(<DashboardContent />);

    await waitForInitialAnalysis();
    expect(screen.getByText("Üretim özeti yüklenemedi")).toBeInTheDocument();
  });
});

describe("DashboardContent manual filters after bootstrap", () => {
  it("keeps draft edits local until Apply, then sends the newly selected identifier", async () => {
    renderWithClient(<DashboardContent />);
    await waitForInitialAnalysis();
    resetRequestLog();

    selectOption("Ürün", "URUN-A");

    expect(getApplyButton()).toBeEnabled();
    expect(requestLog.filter((entry) => entry.pathname.startsWith("/analytics/analysis/"))).toHaveLength(0);
    expect(screen.getByText("Ürün: Tümü")).toBeInTheDocument();

    fireEvent.click(getApplyButton());
    await waitFor(() => {
      for (const endpoint of ANALYSIS_ENDPOINTS) {
        expect(countRequestsTo(endpoint)).toBe(1);
      }
    });
    expect(findRequestTo("/analytics/analysis/summary")?.searchParams.get("productCode")).toBe("URUN-A");
  });

  it("Reset restores only the unrestricted draft and leaves applied requests untouched", async () => {
    renderWithClient(<DashboardContent />);
    await waitForInitialAnalysis();
    resetRequestLog();

    selectOption("Ürün", "URUN-A");
    expect(getApplyButton()).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Sıfırla" }));

    expect(screen.getByLabelText("Ürün")).toHaveTextContent("Tümü");
    expect(screen.getByLabelText("Kalıp")).toHaveTextContent("Tümü");
    expect(screen.getByLabelText("Makine")).toHaveTextContent("Tümü");
    expect(screen.getByText("Ürün: Tümü")).toBeInTheDocument();
    expect(getApplyButton()).toBeDisabled();
    expect(requestLog.filter((entry) => entry.pathname.startsWith("/analytics/analysis/"))).toHaveLength(0);
  });

  it("a filters refetch preserves draft and applied snapshots without another analysis burst", async () => {
    const { queryClient } = renderWithInspectableClient(<DashboardContent />);
    await waitForInitialAnalysis();
    resetRequestLog();

    selectOption("Ürün", "URUN-A");
    await queryClient.invalidateQueries({ queryKey: analysisKeys.filters() });

    await waitFor(() => expect(countRequestsTo("/analytics/filters")).toBe(1));
    expect(screen.getByLabelText("Ürün")).toHaveTextContent("URUN-A");
    expect(screen.getByText("Ürün: Tümü")).toBeInTheDocument();
    expect(requestLog.filter((entry) => entry.pathname.startsWith("/analytics/analysis/"))).toHaveLength(0);
  });
});
