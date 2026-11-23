/**
 * From's dvdbnd path hash (Elden Ring 64-bit variant). Mirrors
 * SoulsFormats `SFUtil.FromPathHash` / UXM `ArchiveDictionary.ComputeHash`:
 * normalize to a `/`-prefixed lowercase forward-slash path, then fold bytes
 * with `hash = hash * 0x85 + c` in wrapping u64 arithmetic.
 */
import { pipe, String as Str } from 'effect';

const U64 = (1n << 64n) - 1n;
const PRIME64 = 0x85n;

export function erPathHash(path: string): bigint {
  const norm = pipe(path, Str.trim, Str.replaceAll('\\', '/'), Str.toLowerCase);
  const h = Str.startsWith('/')(norm) ? norm : `/${norm}`;
  let acc = 0n;
  for (let i = 0; i < h.length; i++) {
    // oxlint-disable-next-line unicorn/prefer-code-point, effecttsgo/prefer-effect-string -- the hash is over UTF-16 code units, not code points; per char of ~200k dictionary paths, an Option per Str.charCodeAt costs ~45%
    acc = (acc * PRIME64 + BigInt(h.charCodeAt(i))) & U64;
  }
  return acc;
}
