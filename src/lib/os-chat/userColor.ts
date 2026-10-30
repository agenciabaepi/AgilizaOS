const CHAT_USER_COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#eab308',
  '#a855f7',
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function osChatUserColor(userKey: string | null | undefined): string {
  const key = String(userKey || '').trim();
  if (!key) return CHAT_USER_COLORS[0];
  return CHAT_USER_COLORS[hashString(key) % CHAT_USER_COLORS.length];
}
