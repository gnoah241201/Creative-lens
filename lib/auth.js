const STANDARD = new Set([
  'accept', 'accept-encoding', 'accept-language', 'cache-control', 'connection', 'content-length',
  'content-type', 'cookie', 'host', 'origin', 'pragma', 'priority', 'referer', 'user-agent',
]);

// Keeps every non-standard header the page sends: that is where insightrackr puts its auth,
// and the header names have changed before (Authorization → Email + ECF07FD99F7847C0).
export function pickAuthHeaders(requestHeaders) {
  const out = {};
  for (const { name, value } of requestHeaders ?? []) {
    const n = name.toLowerCase();
    if (value == null || STANDARD.has(n) || n.startsWith('sec-')) continue;
    out[name] = value;
  }
  const meaningful = Object.keys(out).some((k) => k.toLowerCase() !== 'language');
  return meaningful ? out : {};
}
