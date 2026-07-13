// A stable-enough (not cryptographic) fingerprint from browser signals, used
// purely to deduplicate repeat views within the 30-minute analytics window
// (see models/linkView.ts#recordView) — not for identifying individual users.
export function getViewerFingerprint(): string {
  const signals = [
    typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "",
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.platform,
  ].join("|");

  let hash = 0;

  for (let i = 0; i < signals.length; i++) {
    hash = (hash << 5) - hash + signals.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}
