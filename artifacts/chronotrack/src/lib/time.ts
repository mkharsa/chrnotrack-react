export function formatTime(ms: number): string {
  if (ms == null || isNaN(ms)) return "00:00.00";
  const date = new Date(ms);
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const centiseconds = Math.floor(date.getMilliseconds() / 10).toString().padStart(2, "0");
  return `${minutes}:${seconds}.${centiseconds}`;
}

export function parseDistance(name: string): string | null {
  const match = name.match(/\b\d+m\b/i) || name.match(/(?:x|X)\s*(\d+)/);
  if (match) {
    return match[1] || match[0].replace(/m/i, "");
  }
  return null;
}
