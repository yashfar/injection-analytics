import { delay, http, HttpResponse } from "msw";

import * as fixtures from "./fixtures";

export const API_BASE_URL = "http://localhost:3000";

// Mutable per-test response/status/delay state. Tests mutate these objects
// directly instead of layering server.use() overrides for every scenario;
// resetMockResponses() restores the defaults between tests.
export const mockResponses = {
  filters: fixtures.FILTERS_FIXTURE,
  overview: fixtures.OVERVIEW_FIXTURE,
  summary: fixtures.EMPTY_SUMMARY_FIXTURE,
  trend: fixtures.EMPTY_TREND_FIXTURE,
  histogram: fixtures.EMPTY_HISTOGRAM_FIXTURE,
  stagesSummary: fixtures.EMPTY_STAGES_SUMMARY_FIXTURE,
  stagesTrend: fixtures.EMPTY_STAGES_TREND_FIXTURE,
  cycles: fixtures.EMPTY_CYCLES_FIXTURE,
  outliers: fixtures.EMPTY_OUTLIERS_FIXTURE,
};

export const mockStatus = {
  summary: 200,
  trend: 200,
};

export const mockDelayMs = {
  summary: 0,
  trend: 0,
};

export function resetMockResponses() {
  mockResponses.filters = fixtures.FILTERS_FIXTURE;
  mockResponses.overview = fixtures.OVERVIEW_FIXTURE;
  mockResponses.summary = fixtures.EMPTY_SUMMARY_FIXTURE;
  mockResponses.trend = fixtures.EMPTY_TREND_FIXTURE;
  mockResponses.histogram = fixtures.EMPTY_HISTOGRAM_FIXTURE;
  mockResponses.stagesSummary = fixtures.EMPTY_STAGES_SUMMARY_FIXTURE;
  mockResponses.stagesTrend = fixtures.EMPTY_STAGES_TREND_FIXTURE;
  mockResponses.cycles = fixtures.EMPTY_CYCLES_FIXTURE;
  mockResponses.outliers = fixtures.EMPTY_OUTLIERS_FIXTURE;
  mockStatus.summary = 200;
  mockStatus.trend = 200;
  mockDelayMs.summary = 0;
  mockDelayMs.trend = 0;
}

export const handlers = [
  http.get(`${API_BASE_URL}/analytics/filters`, () =>
    HttpResponse.json(mockResponses.filters),
  ),
  // Not one of the 7 analysis endpoints, but DashboardContent's overview
  // query gates everything else and has to resolve for any of them to fire.
  http.get(`${API_BASE_URL}/analytics/overview`, () =>
    HttpResponse.json(mockResponses.overview),
  ),
  http.get(`${API_BASE_URL}/analytics/analysis/summary`, async () => {
    if (mockDelayMs.summary > 0) {
      await delay(mockDelayMs.summary);
    }

    if (mockStatus.summary !== 200) {
      return HttpResponse.json(
        { message: "Sunucu hatası" },
        { status: mockStatus.summary },
      );
    }

    return HttpResponse.json(mockResponses.summary);
  }),
  http.get(`${API_BASE_URL}/analytics/analysis/trend`, async () => {
    if (mockDelayMs.trend > 0) {
      await delay(mockDelayMs.trend);
    }

    if (mockStatus.trend !== 200) {
      return HttpResponse.json(
        { message: "Sunucu hatası" },
        { status: mockStatus.trend },
      );
    }

    return HttpResponse.json(mockResponses.trend);
  }),
  http.get(`${API_BASE_URL}/analytics/analysis/histogram`, () =>
    HttpResponse.json(mockResponses.histogram),
  ),
  http.get(`${API_BASE_URL}/analytics/analysis/stages/summary`, () =>
    HttpResponse.json(mockResponses.stagesSummary),
  ),
  http.get(`${API_BASE_URL}/analytics/analysis/stages/trend`, () =>
    HttpResponse.json(mockResponses.stagesTrend),
  ),
  http.get(`${API_BASE_URL}/analytics/analysis/cycles`, () =>
    HttpResponse.json(mockResponses.cycles),
  ),
  http.get(`${API_BASE_URL}/analytics/analysis/outliers`, () =>
    HttpResponse.json(mockResponses.outliers),
  ),
];
