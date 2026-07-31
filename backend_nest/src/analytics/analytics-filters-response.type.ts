export type AnalyticsFiltersResponse = {
  machines: string[];
  products: string[];
  molds: string[];
  workOrders: string[];
  startDate: Date | null;
  endDate: Date | null;
};
