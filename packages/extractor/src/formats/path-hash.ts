/**
 * From's dvdbnd path hash (Elden Ring 64-bit variant). Mirrors
 * SoulsFormats `SFUtil.FromPathHash` / UXM `ArchiveDictionary.ComputeHash`:
 * normalize to a `/`-prefixed lowercase forward-slash path, then fold bytes
 * with `hash = hash * 0x85 + c` in wrapping u64 arithmetic.
 */
const U64 = (1n << 64n) - 1n;
const PRIME64 = 0x85n;

export function erPathHash(path: string): bigint {
  let h = path.trim().replace(/\\/g, '/').toLowerCase();
  if (!h.startsWith('/')) h = '/' + h;
  let acc = 0n;
  for (let i = 0; i < h.length; i++) {
    acc = (acc * PRIME64 + BigInt(h.charCodeAt(i))) & U64;
  }
  return acc;
}
