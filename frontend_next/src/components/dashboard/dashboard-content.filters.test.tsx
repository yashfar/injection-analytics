import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { analysisKeys } from "@/lib/query-keys";
import { renderWithClient } from "@/test/render-with-client";
import { createSummaryFixture } from "@/test/msw/fixtures";
import {
  mockDelayMs,
  mockResponses,
  mockStatus,
  resetMockResponses,
} from "@/test/msw/handlers";
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
  return screen.getByRole("button", { name: /Filtreleri Uygula|Değişiklikleri Uygula/ });
}

function getResetButton(): HTMLElement {
  return screen.getByRole("button", { name: "Sıfırla" });
}

function selectOption(labelText: string, optionName: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = screen.getByRole("option", { name: optionName });
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}

function installDomPolyfills() {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
}

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "error" });
  ({ DashboardContent } = await import("@/components/dashboard/dashboard-content"));
});

beforeEach(() => installDomPolyfills());

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetRequestLog();
  resetMockResponses();
  vi.clearAllMocks();
});

afterAll(() => server.close());

describe("automatic all-data analysis bootstrap", () => {
  it("does not request analysis before independent filters resolve", async () => {
    mockDelayMs.filters = 50;
    renderWithClient(<DashboardContent />);

    expect(requestLog.filter((entry) => entry.pathname.startsWith("/analytics/analysis/"))).toHaveLength(0);
    await waitFor(() => expect(countRequestsTo("/analytics/filters")).toBe(1));
  });

  it("bootstraps one unrestricted all-data snapshot and requests all endpoints", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("\u00dcr\u00fcn");

    await waitFor(() => {
      for (const endpoint of ANALYSIS_ENDPOINTS) {
        expect(countRequestsTo(endpoint)).toBe(1);
      }
    });

    expect(screen.getByLabelText("\u00dcr\u00fcn")).toHaveTextContent("T\u00fcm\u00fc");
    expect(screen.getByLabelText("Kal\u0131p")).toHaveTextContent("T\u00fcm\u00fc");
    expect(screen.getByLabelText("Makine")).toHaveTextContent("T\u00fcm\u00fc");
    expect(screen.getByText("\u00dcr\u00fcn: T\u00fcm\u00fc")).toBeInTheDocument();
    expect(screen.getByText("Kal\u0131p: T\u00fcm\u00fc")).toBeInTheDocument();
    expect(screen.getByText("Makine: T\u00fcm\u00fc")).toBeInTheDocument();
    expect(getApplyButton()).toBeDisabled();
  });

  it("sends only date bounds plus explicit endpoint defaults for the initial scope", async () => {
    renderWithClient(<DashboardContent />);
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(1));

    const summary = findRequestTo("/analytics/analysis/summary");
    expect(summary?.searchParams.get("from")).toBe("2026-06-24");
    expect(summary?.searchParams.get("to")).toBe("2026-07-24");
    expect(summary?.searchParams.has("productCode")).toBe(false);
    expect(summary?.searchParams.has("castCode")).toBe(false);
    expect(summary?.searchParams.has("machine")).toBe(false);
    expect(findRequestTo("/analytics/analysis/histogram")?.searchParams.get("binSize")).toBe("5");
    expect(findRequestTo("/analytics/analysis/histogram")?.searchParams.get("maxValue")).toBe("60");
    expect(findRequestTo("/analytics/analysis/cycles")?.searchParams.get("limit")).toBe("1000");
    expect(findRequestTo("/analytics/analysis/outliers")?.searchParams.get("limit")).toBe("100");
  });

  it("keeps draft edits local until explicit Apply", async () => {
    renderWithClient(<DashboardContent />);
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(1));

    selectOption("\u00dcr\u00fcn", "URUN-A");
    expect(getApplyButton()).toBeEnabled();
    expect(screen.getByText("\u00dcr\u00fcn: T\u00fcm\u00fc")).toBeInTheDocument();
    expect(countRequestsTo("/analytics/analysis/summary")).toBe(1);

    fireEvent.click(getApplyButton());
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(2));
    expect(requestLog.filter((entry) => entry.pathname === "/analytics/analysis/summary")[1].searchParams.get("productCode")).toBe("URUN-A");
  });

  it("does not reinitialize draft or applied filters after a filters refetch", async () => {
    const { queryClient } = renderWithClient(<DashboardContent />);
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(1));
    selectOption("\u00dcr\u00fcn", "URUN-A");

    mockResponses.filters = {
      ...mockResponses.filters,
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-31T00:00:00.000Z",
    };
    void queryClient.invalidateQueries({ queryKey: analysisKeys.filters() });

    await waitFor(() => expect(countRequestsTo("/analytics/filters")).toBe(2));
    expect(screen.getByLabelText("\u00dcr\u00fcn")).toHaveTextContent("URUN-A");
    expect(screen.getByText("\u00dcr\u00fcn: T\u00fcm\u00fc")).toBeInTheDocument();
    expect(countRequestsTo("/analytics/analysis/summary")).toBe(1);
  });

  it("keeps analysis disabled when filter boundaries are null or reversed", async () => {
    mockResponses.filters = { ...mockResponses.filters, startDate: null, endDate: null };
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("\u00dcr\u00fcn");

    expect(screen.getByLabelText("Ba\u015flang\u0131\u00e7 Tarihi")).toHaveValue("");
    expect(screen.getByLabelText("Biti\u015f Tarihi")).toHaveValue("");
    expect(getApplyButton()).toBeDisabled();
    expect(countRequestsTo("/analytics/analysis/summary")).toBe(0);
  });

  it("reset changes only the draft and requires Apply to restore all-data results", async () => {
    renderWithClient(<DashboardContent />);
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(1));
    selectOption("\u00dcr\u00fcn", "URUN-A");
    fireEvent.click(getApplyButton());
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(2));

    fireEvent.click(getResetButton());
    expect(screen.getByLabelText("\u00dcr\u00fcn")).toHaveTextContent("T\u00fcm\u00fc");
    expect(screen.getByText("\u00dcr\u00fcn: URUN-A")).toBeInTheDocument();
    expect(countRequestsTo("/analytics/analysis/summary")).toBe(2);
    expect(getApplyButton()).toBeEnabled();
  });

  it("bootstraps analysis even when the legacy overview request fails", async () => {
    mockStatus.overview = 500;
    renderWithClient(<DashboardContent />);

    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(1));
    expect(screen.getByText("\u00dcretim \u00f6zeti y\u00fcklenemedi. L\u00fctfen tekrar deneyin.")).toBeInTheDocument();
  });

  it("does not auto-apply invalid reversed boundaries", async () => {
    mockResponses.filters = {
      ...mockResponses.filters,
      startDate: "2026-07-24T00:00:00.000Z",
      endDate: "2026-06-24T00:00:00.000Z",
    };
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("\u00dcr\u00fcn");

    expect(getApplyButton()).toBeDisabled();
    expect(countRequestsTo("/analytics/analysis/summary")).toBe(0);
  });

  it("keeps overview loading independent from the filters bootstrap", async () => {
    mockDelayMs.overview = 50;
    renderWithClient(<DashboardContent />);

    await waitFor(() => expect(countRequestsTo("/analytics/analysis/summary")).toBe(1));
  });

  it("changes histogram configuration without refetching the other analysis endpoints", async () => {
    mockResponses.summary = createSummaryFixture(1);
    renderWithClient(<DashboardContent />);
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/histogram")).toBe(1));

    selectOption("Aral\u0131k Geni\u015fli\u011fi", "10 sn");
    await waitFor(() => expect(countRequestsTo("/analytics/analysis/histogram")).toBe(2));
    expect(countRequestsTo("/analytics/analysis/summary")).toBe(1);
    expect(countRequestsTo("/analytics/analysis/trend")).toBe(1);
  });
});
