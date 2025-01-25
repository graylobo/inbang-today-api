export function formatDateString(dateStr: string): string {
  // 숫자로만 이루어진 경우 (예: "20240101")
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}
