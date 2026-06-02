import { createPublicKey } from 'node:crypto';

/**
 * Decrypt an Elden Ring `.bhd` archive header.
 *
 * From's `.bhd` headers are encrypted as raw textbook-RSA blocks (no padding
 * scheme) using a per-archive PUBLIC key with a large public exponent. Matching
 * SoulsFormats/UXM (BouncyCastle `RsaEngine` decrypt): each `keyBytes`-sized
 * input block becomes `keyBytes-1` output bytes — `m = c^e mod n`, big-endian,
 * left-padded into the output slot.
 */

function b64urlToBig(b64url: string): bigint {
  const bytes = Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  let v = 0n;
  for (const byte of bytes) v = (v << 8n) | BigInt(byte);
  return v;
}

function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

/** Recover `(n, e)` from a PKCS#1 "RSA PUBLIC KEY" PEM. */
function parsePublicKey(pem: string): { n: bigint; e: bigint; bits: number } {
  const jwk = createPublicKey({ key: pem, format: 'pem' }).export({
    format: 'jwk',
  }) as { n: string; e: string };
  const n = b64urlToBig(jwk.n);
  return { n, e: b64urlToBig(jwk.e), bits: n.toString(2).length };
}

/**
 * Decrypt a full encrypted `.bhd` buffer with the given PKCS#1 PEM public key.
 * Returns the decrypted header bytes (starts with the `BHD5` magic).
 */
export function decryptBhdHeader(encrypted: Uint8Array, pem: string): Uint8Array {
  const { n, e, bits } = parsePublicKey(pem);
  const inBlock = Math.ceil(bits / 8); // modulus byte size (256 for 2048-bit)
  const outBlock = inBlock - 1; // BouncyCastle RSA decrypt output block size
  if (encrypted.length % inBlock !== 0) {
    throw new Error(
      `encrypted .bhd length ${encrypted.length} is not a multiple of key block ${inBlock}`,
    );
  }
  const blocks = encrypted.length / inBlock;
  const out = new Uint8Array(blocks * outBlock);
  for (let i = 0; i < blocks; i++) {
    let c = 0n;
    const base = i * inBlock;
    for (let j = 0; j < inBlock; j++) c = (c << 8n) | BigInt(encrypted[base + j]!);
    let m = modpow(c, e, n);
    for (let j = outBlock - 1; j >= 0; j--) {
      out[i * outBlock + j] = Number(m & 0xffn);
      m >>= 8n;
    }
  }
  return out;
}
