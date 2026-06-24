import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountCents: number, currency = "INR", locale = "en-IN") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

const IST_TZ = "Asia/Kolkata";

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: IST_TZ,
    ...opts,
  }).format(date);
}

/** "06 May 2026, 14:32 IST" style for messages, logs, anywhere an exact stamp helps. */
export function formatDateTimeIST(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const stamp = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST_TZ,
  }).format(date);
  return `${stamp} IST`;
}

/** Short "HH:mm" in IST for chat bubbles. */
export function formatTimeIST(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST_TZ,
  }).format(date);
}

export function relativeTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = date.getTime() - Date.now();
  const absMin = Math.abs(diff) / 60_000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (absMin < 1) return "just now";
  if (absMin < 60) return rtf.format(Math.round(diff / 60_000), "minute");
  if (absMin < 60 * 24) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

export function classifyBmi(bmi: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (bmi < 18.5) return { label: "Underweight", tone: "warn" };
  if (bmi < 25) return { label: "Healthy", tone: "good" };
  if (bmi < 30) return { label: "Overweight", tone: "warn" };
  return { label: "Obese", tone: "bad" };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function weekStart(d = new Date()) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function safeJson<T = unknown>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function initials(name?: string | null): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
