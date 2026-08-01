import { Button } from "@/components/ui/button";
import type { EmptyReason, EmptyReasonFilterKey } from "@/lib/empty-reason";

type EmptyReasonPanelProps = {
  reason: EmptyReason;
  onClearFilter: (filterKey: EmptyReasonFilterKey) => void;
  onWidenDateRange: (startDate: string, endDate: string) => void;
};

// Presentational rendering for lib/empty-reason.ts's output — used both at
// the page level (dashboard-content.tsx) and inside each chart's
// AnalysisChartShell renderEmpty, so every empty state looks and behaves
// the same way.
export function EmptyReasonPanel({
  reason,
  onClearFilter,
  onWidenDateRange,
}: EmptyReasonPanelProps) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3">
      <p className="text-sm text-foreground">{reason.message}</p>
      {reason.actions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {reason.actions.map((action) => (
            <Button
              key={action.kind === "clearFilter" ? action.filterKey : action.kind}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                action.kind === "clearFilter"
                  ? onClearFilter(action.filterKey)
                  : onWidenDateRange(action.startDate, action.endDate)
              }
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
