/**
 * Utility for robust parsing of Excel dates, serial numbers, and strings
 */

export function parseExcelDate(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;

  // 1. If it's an Excel numeric serial number (e.g. 45424)
  if (typeof value === "number" || (!isNaN(Number(value)) && !String(value).includes("-") && !String(value).includes("/") && !String(value).includes("."))) {
    const num = Number(value);
    if (num > 20000 && num < 70000) {
      // Excel epoch begins Dec 30, 1899 due to 1900 leap year bug
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const d = String(date.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
  }

  const str = String(value).trim();
  if (!str) return null;

  // 2. Already YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyyMatch) {
    const d = ddmmyyyyMatch[1].padStart(2, "0");
    const m = ddmmyyyyMatch[2].padStart(2, "0");
    const y = ddmmyyyyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 4. Try native Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    if (y > 1990 && y < 2050) {
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

export function parseFinancialAmount(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : Math.round(value);

  const clean = String(value)
    .replace(/[^\d.-]/g, "") // remove EGP, ج.م, commas, currency symbols
    .trim();

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

export const ARABIC_MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatMonthKey(dateStr: string): string {
  // expects YYYY-MM-DD or YYYY-MM
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return dateStr;
}

export function getArabicMonthLabel(yearMonthKey: string): string {
  // expects "2026-05" -> "مايو 2026"
  if (!yearMonthKey) return "";
  const parts = yearMonthKey.split("-");
  if (parts.length >= 2) {
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    if (m >= 1 && m <= 12) {
      return `${ARABIC_MONTH_NAMES[m - 1]} ${y}`;
    }
  }
  return yearMonthKey;
}
