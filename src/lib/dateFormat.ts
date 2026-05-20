/**
 * Date formatting helpers — single source of truth.
 *
 * Babak directive (20 May 2026): render dates as **DD-MM-YYYY** everywhere
 * in user-visible UI. We expose `fmtDate` for safe formatting and
 * `fmtDateMonth` for month-level views (DD-MM-YYYY → MM-YYYY).
 *
 * Always pass through these helpers instead of slicing ISO strings
 * directly, so the format stays consistent if we ever change it again.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * DD-MM-YYYY for any ISO-ish date input. Returns the empty string for
 * unparseable input so the UI doesn't show "Invalid Date".
 */
export function fmtDate(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return '';
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

/**
 * MM-YYYY — same DD-MM-YYYY shape but without the day. Used in chart
 * x-axes and "last seen on this month" labels.
 */
export function fmtMonth(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return '';
  return `${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

/**
 * Pass-through for a YYYY-MM string (e.g. "2026-05") → "05-2026". Used
 * by chart X-axes that already have month-bucketed data.
 */
export function fmtMonthString(yyyyMm: string | null | undefined): string {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-');
  if (!y || !m) return yyyyMm;
  return `${m}-${y}`;
}
