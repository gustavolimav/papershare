// Splits the allow-list textarea (one email per line, commas also accepted)
// into a clean, deduplicated array — case-insensitive dedup since the
// backend matches emails case-insensitively too.
export function parseAllowedEmails(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of raw.split(/[\n,]/)) {
    const email = candidate.trim();

    if (!email) {
      continue;
    }

    const key = email.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(email);
  }

  return result;
}
