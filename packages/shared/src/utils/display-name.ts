export function getDisplayName(metadata: Record<string, unknown> | null | undefined): string | null {
  const raw = metadata?.full_name ?? metadata?.name;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function welcomeBackMessage(name: string | null | undefined): string {
  if (name?.trim()) return `Welcome back, ${name.trim()}`;
  return 'Welcome back';
}
