import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

// Fresh QueryClient per test: no retries (so error states resolve
// immediately) and no garbage collection between renders/interactions
// within a single test.
export function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const renderResult = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );

  return { ...renderResult, queryClient };
}
