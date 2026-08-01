import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultAnalyticsFilters } from "@/lib/analytics-filters";
import { renderWithClient } from "@/test/render-with-client";
import {
  createSummaryFixture,
  createTrendFixture,
} from "@/test/msw/fixtures";
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

// lib/api.ts throws at module-evaluation time if this isn't set, so
// DashboardContent (which transitively imports it) has to be loaded
// dynamically after the env var is in place — a static top-level import
// would run before this line has any effect.
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

function getChartCard(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const card = heading.closest('[data-slot="card"]');

  if (!card) {
    throw new Error(`"${title}" başlıklı kart bulunamadı.`);
  }

  return card as HTMLElement;
}

function getApplyButton(): HTMLElement {
  return screen.getByRole("button", {
    name: /Filtreleri Uygula|Değişiklikleri Uygula/,
  });
}

// Radix Select commits a selection on pointerup, not on a plain click event
// — fireEvent.click alone never reaches its handler in jsdom.
function selectOption(labelText: string, optionName: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  const option = screen.getByRole("option", { name: optionName });
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}

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

function setJsdomPolyfills() {
  setReducedMotion(false);
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

describe("createDefaultAnalyticsFilters (Phase 1)", () => {
  it("sadece tarih aralığı döndürür; ürün, kalıp ve makine seçmez", () => {
    const result = createDefaultAnalyticsFilters(
      [],
      "2026-06-24T10:15:21.000Z",
      "2026-07-24T10:01:16.000Z",
    );

    expect(result).toEqual({
      productCode: undefined,
      castCode: undefined,
      machine: undefined,
      startDate: "2026-06-24",
      endDate: "2026-07-24",
    });
  });
});

describe("DashboardContent filtre state", () => {
  it("mount'ta ürün, kalıp ve makine seçimleri 'Tümü'dedir; hiçbiri otomatik dolmaz", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    expect(screen.getAllByText("Tümü")).toHaveLength(3);
  });

  it("ürün seçmek kalıp ve makine seçeneklerinin listesini değiştirmez (bağımsız filtreler)", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    const moldTrigger = screen.getByLabelText("Kalıp");
    fireEvent.click(moldTrigger);
    const moldOptionsBefore = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    fireEvent.click(moldTrigger);

    const machineTrigger = screen.getByLabelText("Makine");
    fireEvent.click(machineTrigger);
    const machineOptionsBefore = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    fireEvent.click(machineTrigger);

    selectOption("Ürün", "URUN-A");

    fireEvent.click(moldTrigger);
    const moldOptionsAfter = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    fireEvent.click(moldTrigger);

    fireEvent.click(machineTrigger);
    const machineOptionsAfter = screen
      .getAllByRole("option")
      .map((option) => option.textContent);

    expect(moldOptionsAfter).toEqual(moldOptionsBefore);
    expect(machineOptionsAfter).toEqual(machineOptionsBefore);
  });

  it("bir filtreyi seçip tekrar 'Tümü'ye dönmek isteği o parametre olmadan gönderir (boş string değil)", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    selectOption("Ürün", "URUN-A");
    selectOption("Ürün", "Tümü");

    fireEvent.click(getApplyButton());

    await waitFor(() =>
      expect(countRequestsTo("/analytics/analysis/summary")).toBe(1),
    );

    const summaryRequest = findRequestTo("/analytics/analysis/summary");
    expect(summaryRequest?.searchParams.has("productCode")).toBe(false);
  });
});

describe("DashboardContent apply davranışı", () => {
  it("mount'tan sonra hiçbir /analytics/analysis/* isteği gitmez", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    expect(
      requestLog.filter((entry) =>
        entry.pathname.startsWith("/analytics/analysis/"),
      ),
    ).toHaveLength(0);
  });

  it("filtre değiştirmek (apply'a basmadan) istek göndermez", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    selectOption("Ürün", "URUN-A");
    selectOption("Kalıp", "KALIP-A");
    selectOption("Makine", "MAKINE-A");

    expect(
      requestLog.filter((entry) =>
        entry.pathname.startsWith("/analytics/analysis/"),
      ),
    ).toHaveLength(0);
  });

  it("apply'a basınca yedi analiz endpoint'inin her birine tam olarak bir istek gider", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    await waitFor(() => {
      for (const endpoint of ANALYSIS_ENDPOINTS) {
        expect(countRequestsTo(endpoint)).toBe(1);
      }
    });
  });

  it("geçersiz tarih aralığında (bitiş < başlangıç) Apply butonu devre dışı kalır", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.change(screen.getByLabelText("Başlangıç Tarihi"), {
      target: { value: "2026-07-20" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş Tarihi"), {
      target: { value: "2026-07-01" },
    });

    expect(getApplyButton()).toBeDisabled();
  });

  it("draft, uygulanmış filtrelerle aynıyken Apply butonu devre dışı kalır", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());
    await waitFor(() =>
      expect(countRequestsTo("/analytics/analysis/summary")).toBe(1),
    );

    expect(getApplyButton()).toBeDisabled();
  });

  it("filtreyi değiştirip tekrar apply'a basmak her endpoint'e ikinci bir istek gönderir", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());
    await waitFor(() =>
      expect(countRequestsTo("/analytics/analysis/summary")).toBe(1),
    );

    selectOption("Ürün", "URUN-A");
    fireEvent.click(getApplyButton());

    await waitFor(() => {
      for (const endpoint of ANALYSIS_ENDPOINTS) {
        expect(countRequestsTo(endpoint)).toBe(2);
      }
    });
  });

  it("boş bırakılan (Tümü) filtreler istek URL'sinde hiç yer almaz", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());
    await waitFor(() =>
      expect(countRequestsTo("/analytics/analysis/summary")).toBe(1),
    );

    const summaryRequest = findRequestTo("/analytics/analysis/summary");
    expect(summaryRequest?.searchParams.has("productCode")).toBe(false);
    expect(summaryRequest?.searchParams.has("castCode")).toBe(false);
    expect(summaryRequest?.searchParams.has("machine")).toBe(false);
    expect(summaryRequest?.searchParams.has("from")).toBe(true);
    expect(summaryRequest?.searchParams.has("to")).toBe(true);
  });
});

describe("DashboardContent grafik durumları (Analiz Özeti + Çevrim Süresi Trendi)", () => {
  it("apply'dan önce sadece rehber metni görünür, veri render edilmez", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    const summaryCard = getChartCard("Analiz Özeti");
    const trendCard = getChartCard("Çevrim Süresi Trendi");

    expect(
      within(summaryCard).getByText(/Filtreleri Uygula/),
    ).toBeInTheDocument();
    expect(
      within(trendCard).getByText(/Filtreleri Uygula/),
    ).toBeInTheDocument();
    expect(within(summaryCard).queryByText("Toplam Çevrim")).not.toBeInTheDocument();
  });

  it("apply sonrası istek tamamlanmadan önce iskelet görünür", async () => {
    mockDelayMs.summary = 50;
    mockDelayMs.trend = 50;

    const { container } = renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    expect(
      within(getChartCard("Analiz Özeti")).getByText("Analiz Özeti yükleniyor..."),
    ).toBeInTheDocument();
    expect(
      within(getChartCard("Çevrim Süresi Trendi")).getByText(
        "Çevrim Süresi Trendi yükleniyor...",
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);

    await waitFor(() =>
      expect(countRequestsTo("/analytics/analysis/summary")).toBe(1),
    );
  });

  it("başarılı yanıt sonrası özet kartında sayılar, trend kartında grafik render edilir", async () => {
    mockResponses.summary = createSummaryFixture(5012);
    mockResponses.trend = createTrendFixture();

    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    const summaryCard = getChartCard("Analiz Özeti");
    await within(summaryCard).findByText("Toplam Çevrim");
    expect(within(summaryCard).getByText("5.012")).toBeInTheDocument();

    const trendCard = getChartCard("Çevrim Süresi Trendi");
    await within(trendCard).findByText("Günlük görünüm");
  });

  it("özet sıfır çevrim döndürünce tek bir sayfa seviyesi açıklama gösterir, grafik grid'i hiç render edilmez", async () => {
    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    const summaryCard = getChartCard("Analiz Özeti");
    await within(summaryCard).findByText(
      /Bu tarih aralığında hiç üretim kaydı yok\./,
    );
    expect(
      screen.queryByRole("heading", { name: "Çevrim Süresi Trendi" }),
    ).not.toBeInTheDocument();
  });

  it("trend verisi dolu obje ama boş dizi (points: []) döndüğünde sadece trend kartı kendi açıklamasını gösterir, özet etkilenmez", async () => {
    mockResponses.summary = createSummaryFixture(120);
    mockResponses.trend = { bucketSize: "day", points: [] };

    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    const summaryCard = getChartCard("Analiz Özeti");
    await within(summaryCard).findByText("Toplam Çevrim");

    const trendCard = getChartCard("Çevrim Süresi Trendi");
    expect(
      within(trendCard).getByText(/Bu tarih aralığında hiç üretim kaydı yok\./),
    ).toBeInTheDocument();
    expect(within(trendCard).queryByText("Günlük görünüm")).not.toBeInTheDocument();
  });

  it("sunucu 500 döndürdüğünde hata mesajı ve 'Tekrar dene' butonu gösterir; butona basınca yeni istek gider", async () => {
    mockStatus.summary = 500;

    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    const summaryCard = getChartCard("Analiz Özeti");
    // useAnalysisSummaryQuery retries once (ANALYSIS_QUERY_DEFAULTS.retry:
    // 1) before settling into isError, with React Query's default ~1s
    // backoff between attempts — the default findByText timeout is too
    // short to reliably span that.
    await within(summaryCard).findByText(
      "Analiz Özeti yüklenemedi. Lütfen tekrar deneyin.",
      undefined,
      { timeout: 3000 },
    );
    const retryButton = within(summaryCard).getByRole("button", {
      name: "Tekrar dene",
    });
    // The failed attempt plus its one automatic retry (ANALYSIS_QUERY_
    // DEFAULTS.retry: 1) are both real logged requests already.
    const requestCountBeforeRetryClick = countRequestsTo(
      "/analytics/analysis/summary",
    );

    mockStatus.summary = 200;
    fireEvent.click(retryButton);

    await waitFor(() =>
      expect(countRequestsTo("/analytics/analysis/summary")).toBeGreaterThan(
        requestCountBeforeRetryClick,
      ),
    );
  });

  it("ikinci apply sırasında eski veri unmount olmadan ekranda kalır ve 'Güncelleniyor...' rozeti görünür", async () => {
    mockResponses.summary = createSummaryFixture(100);

    renderWithClient(<DashboardContent />);
    await screen.findByLabelText("Ürün");

    fireEvent.click(getApplyButton());

    const summaryCard = getChartCard("Analiz Özeti");
    await within(summaryCard).findByText("100");

    mockResponses.summary = createSummaryFixture(200);
    mockDelayMs.summary = 50;

    selectOption("Ürün", "URUN-A");
    fireEvent.click(getApplyButton());

    expect(within(summaryCard).getByText("100")).toBeInTheDocument();
    expect(within(summaryCard).getByText("Güncelleniyor...")).toBeInTheDocument();
    // Same Card DOM node still in the tree — proves this was an in-place
    // update, not an unmount+remount around the refetch.
    expect(getChartCard("Analiz Özeti")).toBe(summaryCard);

    await within(summaryCard).findByText("200");
  });
});
