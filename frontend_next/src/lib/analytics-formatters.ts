import type { TrendBucketSize } from "@/types/analytics";

const integerFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 0,
});

const cycleTimeFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 3,
});

const signedCycleTimeFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 3,
  signDisplay: "exceptZero",
});

const axisNumberFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const hourlyAxisDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const dateAxisFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const hourlyTooltipDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const tooltipDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const cycleTimestampFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatFiniteNumber(
  value: number,
  formatter: Intl.NumberFormat,
): string | null {
  return Number.isFinite(value) ? formatter.format(value) : null;
}

export function formatTurkishInteger(value: number): string | null {
  return formatFiniteNumber(value, integerFormatter);
}

export function formatTurkishCycleTime(value: number): string | null {
  return formatFiniteNumber(value, cycleTimeFormatter);
}

export function formatTurkishSignedCycleTime(value: number): string | null {
  return formatFiniteNumber(value, signedCycleTimeFormatter);
}

export function formatTurkishAxisNumber(value: number): string {
  return formatFiniteNumber(value, axisNumberFormatter) ?? "";
}

export function formatTurkishPercentage(value: number): string | null {
  return formatFiniteNumber(value, percentageFormatter);
}

function toValidDate(value: string | number): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatTrendAxisDate(
  value: string | number,
  bucketSize: Exclude<TrendBucketSize, null>,
): string {
  const date = toValidDate(value);

  if (!date) {
    return "";
  }

  return bucketSize === "hour"
    ? hourlyAxisDateFormatter.format(date)
    : dateAxisFormatter.format(date);
}

export function formatTrendTooltipDate(
  value: string | number,
  bucketSize: Exclude<TrendBucketSize, null>,
): string | null {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  return bucketSize === "hour"
    ? hourlyTooltipDateFormatter.format(date)
    : tooltipDateFormatter.format(date);
}

// Second-precision timestamp for individual cycle points (analysis/cycles,
// analysis/outliers) — none of the bucket-aware formatters above have
// second-level precision since they're built for aggregated buckets.
export function formatCycleTimestamp(value: string | number): string | null {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  return cycleTimestampFormatter.format(date);
}

const shortDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// Plain day-month-year, no time — for referencing a dataset's date bounds
// in empty-state copy (lib/empty-reason.ts), independent of any bucket.
export function formatShortDate(value: string | number): string | null {
  const date = toValidDate(value);

  if (!date) {
    return null;
  }

  return shortDateFormatter.format(date);
}

const HOUR_AXIS_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

// Raw (unbucketed) point series — analysis/cycles, analysis/outliers —
// have no server-provided bucketSize the way analysis/trend does. With a
// bounded limit, the actual returned span can be much narrower than the
// applied date range (e.g. the latest N of a much larger population may
// only cover a few hours), so day-level axis ticks can repeat the same
// label. Pick hour-level ticks whenever the returned points span 3 days
// or less.
export function selectAxisBucketSize(
  minTimestamp: number,
  maxTimestamp: number,
): "hour" | "day" {
  return maxTimestamp - minTimestamp <= HOUR_AXIS_THRESHOLD_MS
    ? "hour"
    : "day";
}
