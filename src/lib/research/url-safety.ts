/**
 * SSRF guard for the live research path. Before opening ANY URL in headless
 * Chrome — whether user-supplied (competitor URLs) or scraped from search
 * results — it must be a public http(s) target. We reject localhost, loopback,
 * private/RFC1918, carrier-grade NAT, link-local (incl. the cloud metadata IP),
 * multicast/reserved ranges, and obvious internal hostnames.
 *
 * Note: this is hostname/literal-IP based and does not perform DNS resolution,
 * so a public name that resolves to a private IP (DNS rebinding) is out of scope.
 * Set IDEACLYST_RESEARCH_ALLOW_PRIVATE=1 to disable the guard for local dev.
 */

function ipv4IsPrivate(host: string): boolean | null {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null; // not an IPv4 literal
  const [a, b] = m.slice(1).map(Number);
  if (m.slice(1).map(Number).some((o) => o > 255)) return true; // malformed → unsafe
  if (a === 0 || a === 10 || a === 127) return true; // this-net, private, loopback
  if (a === 169 && b === 254) return true; // link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6IsPrivate(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(":")) return false;
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (/^f[cd]/.test(h)) return true; // unique-local fc00::/7
  if (h.startsWith("fe80")) return true; // link-local
  const mapped = h.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4-mapped
  if (mapped) return ipv4IsPrivate(mapped[1]) === true;
  return false;
}

export function isSafePublicUrl(raw: string): boolean {
  if (process.env.IDEACLYST_RESEARCH_ALLOW_PRIVATE === "1") return true;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  const host = u.hostname.toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (/\.(local|internal|lan|home|corp|intranet)$/.test(host)) return false;

  const v4 = ipv4IsPrivate(host);
  if (v4 === true) return false;
  if (ipv6IsPrivate(host)) return false;

  // Bare single-label hostnames (no dot, not a literal IP) are almost always
  // internal — reject to be safe. Public targets always have a dotted name.
  if (v4 === null && !host.includes(":") && !host.includes(".")) return false;

  return true;
}
