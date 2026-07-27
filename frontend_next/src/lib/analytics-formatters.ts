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
