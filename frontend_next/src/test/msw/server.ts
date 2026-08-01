import { setupServer } from "msw/node";

import { handlers } from "./handlers";

export const server = setupServer(...handlers);

export type LoggedRequest = {
  pathname: string;
  searchParams: URLSearchParams;
};

// Populated via server.events, not by instrumenting individual handlers, so
// every request is counted regardless of which handler (default or a
// per-test override) actually served it.
export const requestLog: LoggedRequest[] = [];

server.events.on("request:start", ({ request }) => {
  const url = new URL(request.url);
  requestLog.push({ pathname: url.pathname, searchParams: url.searchParams });
});

export function resetRequestLog() {
  requestLog.length = 0;
}

export function countRequestsTo(pathname: string): number {
  return requestLog.filter((entry) => entry.pathname === pathname).length;
}

export function findRequestTo(pathname: string): LoggedRequest | undefined {
  return requestLog.find((entry) => entry.pathname === pathname);
}
