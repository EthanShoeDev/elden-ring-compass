import LZString from 'lz-string';
import type { ShareableProgression } from './types';

/**
 * Compress and encode shareable data for URL query param.
 */
export function encodeToUrl(data: ShareableProgression): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}
